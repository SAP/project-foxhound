/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef vm_Caches_h
#define vm_Caches_h

#include "mozilla/Array.h"
#include "mozilla/Maybe.h"
#include "mozilla/MruCache.h"

#include "frontend/ScopeBindingCache.h"
#include "gc/Tracer.h"
#include "js/RootingAPI.h"
#include "js/TypeDecls.h"
#include "vm/JSScript.h"
#include "vm/StencilCache.h"  // js::StencilCache
#include "vm/StringType.h"

namespace js {

class SrcNote;

/*
 * GetSrcNote cache to avoid O(n^2) growth in finding a source note for a
 * given pc in a script. We use the script->code pointer to tag the cache,
 * instead of the script address itself, so that source notes are always found
 * by offset from the bytecode with which they were generated.
 */
struct GSNCache {
  typedef HashMap<jsbytecode*, const SrcNote*, PointerHasher<jsbytecode*>,
                  SystemAllocPolicy>
      Map;

  jsbytecode* code;
  Map map;

  GSNCache() : code(nullptr) {}

  void purge();
};

struct EvalCacheEntry {
  JSLinearString* str;
  JSScript* script;
  JSScript* callerScript;
  jsbytecode* pc;

  // We sweep this cache after a nursery collection to update entries with
  // string keys that have been tenured.
  //
  // The entire cache is purged on a major GC, so we don't need to sweep it
  // then.
  bool traceWeak(JSTracer* trc) {
    MOZ_ASSERT(trc->kind() == JS::TracerKind::MinorSweeping);
    return TraceManuallyBarrieredWeakEdge(trc, &str, "EvalCacheEntry::str");
  }
};

struct EvalCacheLookup {
  explicit EvalCacheLookup(JSContext* cx) : str(cx), callerScript(cx) {}
  Rooted<JSLinearString*> str;
  RootedScript callerScript;
  MOZ_INIT_OUTSIDE_CTOR jsbytecode* pc;
};

struct EvalCacheHashPolicy {
  using Lookup = EvalCacheLookup;

  static HashNumber hash(const Lookup& l);
  static bool match(const EvalCacheEntry& entry, const EvalCacheLookup& l);
};

using EvalCache =
    GCHashSet<EvalCacheEntry, EvalCacheHashPolicy, SystemAllocPolicy>;

// [SMDOC] Megamorphic Property Lookup Cache (MegamorphicCache)
//
// MegamorphicCache is a data structure used to speed up megamorphic property
// lookups from JIT code. The same cache is currently used for both GetProp and
// HasProp (in, hasOwnProperty) operations.
//
// This is implemented as a fixed-size array of entries. Lookups are performed
// based on the receiver object's Shape + PropertyKey. If found in the cache,
// the result of a lookup represents either:
//
// * A data property on the receiver or on its proto chain (stored as number of
//   'hops' up the proto chain + the slot of the data property).
//
// * A missing property on the receiver or its proto chain.
//
// * A missing property on the receiver, but it might exist on the proto chain.
//   This lets us optimize hasOwnProperty better.
//
// Collisions are handled by simply overwriting the previous entry stored in the
// slot. This is sufficient to achieve a high hit rate on typical web workloads
// while ensuring cache lookups are always fast and simple.
//
// Lookups always check the receiver object's shape (ensuring the properties and
// prototype are unchanged). Because the cache also caches lookups on the proto
// chain, Watchtower is used to invalidate the cache when prototype objects are
// mutated. This is done by incrementing the cache's generation counter to
// invalidate all entries.
//
// The cache is also invalidated on each major GC.
class MegamorphicCache {
 public:
  static constexpr size_t NumEntries = 1024;
  // log2(alignof(Shape))
  static constexpr uint8_t ShapeHashShift1 = 3;
  // ShapeHashShift1 + log2(NumEntries)
  static constexpr uint8_t ShapeHashShift2 = ShapeHashShift1 + 10;

  class Entry {
    // Receiver object's shape.
    Shape* shape_ = nullptr;

    // The atom or symbol property being accessed.
    PropertyKey key_;

    // This entry is valid iff the generation matches the cache's generation.
    uint16_t generation_ = 0;

    // Slot number of the data property.
    static constexpr size_t MaxSlotNumber = UINT16_MAX;
    uint16_t slot_ = 0;

    // Number of hops on the proto chain to get to the holder object. If this is
    // zero, the property exists on the receiver object. It can also be one of
    // the sentinel values indicating a missing property lookup.
    uint8_t numHops_ = 0;

    friend class MegamorphicCache;

   public:
    static constexpr uint8_t MaxHopsForDataProperty = UINT8_MAX - 2;
    static constexpr uint8_t NumHopsForMissingProperty = UINT8_MAX - 1;
    static constexpr uint8_t NumHopsForMissingOwnProperty = UINT8_MAX;

    void init(Shape* shape, PropertyKey key, uint16_t generation,
              uint8_t numHops, uint16_t slot) {
      shape_ = shape;
      key_ = key;
      generation_ = generation;
      slot_ = slot;
      numHops_ = numHops;
      MOZ_ASSERT(slot_ == slot, "slot must fit in slot_");
      MOZ_ASSERT(numHops_ == numHops, "numHops must fit in numHops_");
    }
    bool isMissingProperty() const {
      return numHops_ == NumHopsForMissingProperty;
    }
    bool isMissingOwnProperty() const {
      return numHops_ == NumHopsForMissingOwnProperty;
    }
    bool isDataProperty() const { return numHops_ <= MaxHopsForDataProperty; }
    uint16_t numHops() const {
      MOZ_ASSERT(isDataProperty());
      return numHops_;
    }
    uint16_t slot() const {
      MOZ_ASSERT(isDataProperty());
      return slot_;
    }

    static constexpr size_t offsetOfShape() { return offsetof(Entry, shape_); }

    static constexpr size_t offsetOfKey() { return offsetof(Entry, key_); }

    static constexpr size_t offsetOfGeneration() {
      return offsetof(Entry, generation_);
    }

    static constexpr size_t offsetOfSlot() { return offsetof(Entry, slot_); }

    static constexpr size_t offsetOfNumHops() {
      return offsetof(Entry, numHops_);
    }
  };

 private:
  mozilla::Array<Entry, NumEntries> entries_;

  // Generation counter used to invalidate all entries.
  uint16_t generation_ = 0;

  // NOTE: this logic is mirrored in MacroAssembler::emitMegamorphicCacheLookup
  Entry& getEntry(Shape* shape, PropertyKey key) {
    static_assert(mozilla::IsPowerOfTwo(NumEntries),
                  "NumEntries must be a power-of-two for fast modulo");
    uintptr_t hash = uintptr_t(shape) >> ShapeHashShift1;
    hash ^= uintptr_t(shape) >> ShapeHashShift2;
    hash += HashAtomOrSymbolPropertyKey(key);
    return entries_[hash % NumEntries];
  }

 public:
  void bumpGeneration() {
    generation_++;
    if (generation_ == 0) {
      // Generation overflowed. Invalidate the whole cache.
      for (size_t i = 0; i < NumEntries; i++) {
        entries_[i].shape_ = nullptr;
      }
    }
  }
  bool lookup(Shape* shape, PropertyKey key, Entry** entryp) {
    Entry& entry = getEntry(shape, key);
    *entryp = &entry;
    return (entry.shape_ == shape && entry.key_ == key &&
            entry.generation_ == generation_);
  }
  void initEntryForMissingProperty(Entry* entry, Shape* shape,
                                   PropertyKey key) {
    entry->init(shape, key, generation_, Entry::NumHopsForMissingProperty, 0);
  }
  void initEntryForMissingOwnProperty(Entry* entry, Shape* shape,
                                      PropertyKey key) {
    entry->init(shape, key, generation_, Entry::NumHopsForMissingOwnProperty,
                0);
  }
  void initEntryForDataProperty(Entry* entry, Shape* shape, PropertyKey key,
                                size_t numHops, uint32_t slot) {
    if (slot > Entry::MaxSlotNumber ||
        numHops > Entry::MaxHopsForDataProperty) {
      return;
    }
    entry->init(shape, key, generation_, numHops, slot);
  }

  static constexpr size_t offsetOfEntries() {
    return offsetof(MegamorphicCache, entries_);
  }

  static constexpr size_t offsetOfGeneration() {
    return offsetof(MegamorphicCache, generation_);
  }
};

class MegamorphicSetPropCache {
 public:
  // We can get more hits if we increase this, but this seems to be around
  // the sweet spot where we are getting most of the hits we would get with
  // an infinitely sized cache
  static constexpr size_t NumEntries = 256;
  // log2(alignof(Shape))
  static constexpr uint8_t ShapeHashShift1 = 3;
  // ShapeHashShift1 + log2(NumEntries)
  static constexpr uint8_t ShapeHashShift2 = ShapeHashShift1 + 8;

  class Entry {
    Shape* beforeShape_ = nullptr;
    Shape* afterShape_ = nullptr;

    // The atom or symbol property being accessed.
    PropertyKey key_;

    // This entry is valid iff the generation matches the cache's generation.
    uint16_t generation_ = 0;

    // Slot number of the data property.
    static constexpr size_t MaxSlotNumber = UINT16_MAX;
    uint16_t slot_ = 0;

    friend class MegamorphicSetPropCache;

   public:
    void init(Shape* beforeShape, Shape* afterShape, PropertyKey key,
              uint16_t generation, uint16_t slot) {
      beforeShape_ = beforeShape;
      afterShape_ = afterShape;
      key_ = key;
      generation_ = generation;
      slot_ = slot;
      MOZ_ASSERT(slot_ == slot, "slot must fit in slot_");
    }
    uint16_t slot() const { return slot_; }
    Shape* afterShape() const { return afterShape_; }

    static constexpr size_t offsetOfShape() {
      return offsetof(Entry, beforeShape_);
    }
    static constexpr size_t offsetOfAfterShape() {
      return offsetof(Entry, afterShape_);
    }

    static constexpr size_t offsetOfKey() { return offsetof(Entry, key_); }

    static constexpr size_t offsetOfGeneration() {
      return offsetof(Entry, generation_);
    }

    static constexpr size_t offsetOfSlot() { return offsetof(Entry, slot_); }
  };

 private:
  mozilla::Array<Entry, NumEntries> entries_;

  // Generation counter used to invalidate all entries.
  uint16_t generation_ = 0;

  Entry& getEntry(Shape* beforeShape, PropertyKey key) {
    static_assert(mozilla::IsPowerOfTwo(NumEntries),
                  "NumEntries must be a power-of-two for fast modulo");
    uintptr_t hash = uintptr_t(beforeShape) >> ShapeHashShift1;
    hash ^= uintptr_t(beforeShape) >> ShapeHashShift2;
    hash += HashAtomOrSymbolPropertyKey(key);
    return entries_[hash % NumEntries];
  }

 public:
  void bumpGeneration() {
    generation_++;
    if (generation_ == 0) {
      // Generation overflowed. Invalidate the whole cache.
      for (size_t i = 0; i < NumEntries; i++) {
        entries_[i].beforeShape_ = nullptr;
      }
    }
  }
  void set(Shape* beforeShape, Shape* afterShape, PropertyKey key,
           uint32_t slot) {
    if (slot > Entry::MaxSlotNumber) {
      return;
    }
    Entry& entry = getEntry(beforeShape, key);
    entry.init(beforeShape, afterShape, key, generation_, slot);
  }

#ifdef DEBUG
  bool lookup(Shape* beforeShape, PropertyKey key, Entry** entryp) {
    Entry& entry = getEntry(beforeShape, key);
    *entryp = &entry;
    return (entry.beforeShape_ == beforeShape && entry.key_ == key &&
            entry.generation_ == generation_);
  }
#endif

  static constexpr size_t offsetOfEntries() {
    return offsetof(MegamorphicSetPropCache, entries_);
  }

  static constexpr size_t offsetOfGeneration() {
    return offsetof(MegamorphicSetPropCache, generation_);
  }
};

// Cache for AtomizeString, mapping JSString* or JS::Latin1Char* to the
// corresponding JSAtom*. The cache has three different optimizations:
//
// * The two most recent lookups are cached. This has a hit rate of 30-65% on
//   typical web workloads.
//
// * MruCache is used for short JS::Latin1Char strings.
//
// * For longer strings, there's also a JSLinearString* => JSAtom* HashMap,
//   because hashing the string characters repeatedly can be slow.
//   This map is also used by nursery GC to de-duplicate strings to atoms.
//
// This cache is purged on minor and major GC.
class StringToAtomCache {
 public:
  struct LastLookup {
    JSString* string = nullptr;
    JSAtom* atom = nullptr;

    static constexpr size_t offsetOfString() {
      return offsetof(LastLookup, string);
    }

    static constexpr size_t offsetOfAtom() {
      return offsetof(LastLookup, atom);
    }
  };
  static constexpr size_t NumLastLookups = 2;

  struct AtomTableKey {
    explicit AtomTableKey(const JS::Latin1Char* str, size_t len)
        : string_(str), length_(len) {
      hash_ = mozilla::HashString(string_, length_);
    }

    const JS::Latin1Char* string_;
    size_t length_;
    uint32_t hash_;
  };

 private:
  struct RopeAtomCache
      : public mozilla::MruCache<AtomTableKey, JSAtom*, RopeAtomCache> {
    static HashNumber Hash(const AtomTableKey& key) { return key.hash_; }
    static bool Match(const AtomTableKey& key, const JSAtom* val) {
      JS::AutoCheckCannotGC nogc;
      return val->length() == key.length_ &&
             EqualChars(key.string_, val->latin1Chars(nogc), key.length_);
    }
  };
  using Map =
      HashMap<JSString*, JSAtom*, PointerHasher<JSString*>, SystemAllocPolicy>;
  Map map_;
  mozilla::Array<LastLookup, NumLastLookups> lastLookups_;
  RopeAtomCache ropeCharCache_;

 public:
  // Don't use the cache for short strings. Hashing them is less expensive.
  // But the length needs to long enough to cover common identifiers in React.
  // Taintfox: need to increase this due to additional taint pointer
  static constexpr size_t MinStringLength = 39;

  JSAtom* lookupInMap(JSString* s) const {
    MOZ_ASSERT(s->inStringToAtomCache());
    MOZ_ASSERT(s->length() >= MinStringLength);

    auto p = map_.lookup(s);
    JSAtom* atom = p ? p->value() : nullptr;
    return atom;
  }

  MOZ_ALWAYS_INLINE JSAtom* lookup(JSString* s) const {
    MOZ_ASSERT(!s->isAtom());
    for (const LastLookup& entry : lastLookups_) {
      if (entry.string == s) {
        return entry.atom;
      }
    }

    if (!s->inStringToAtomCache()) {
      MOZ_ASSERT(!map_.lookup(s));
      return nullptr;
    }

    return lookupInMap(s);
  }

  MOZ_ALWAYS_INLINE JSAtom* lookupWithRopeChars(
      const JS::Latin1Char* str, size_t len,
      mozilla::Maybe<AtomTableKey>& key) {
    MOZ_ASSERT(len < MinStringLength);
    key.emplace(str, len);
    if (auto p = ropeCharCache_.Lookup(key.value())) {
      return p.Data();
    }
    return nullptr;
  }

  static constexpr size_t offsetOfLastLookups() {
    return offsetof(StringToAtomCache, lastLookups_);
  }

  void maybePut(JSString* s, JSAtom* atom, mozilla::Maybe<AtomTableKey>& key) {
    if (key.isSome()) {
      ropeCharCache_.Put(key.value(), atom);
    }

    for (size_t i = NumLastLookups - 1; i > 0; i--) {
      lastLookups_[i] = lastLookups_[i - 1];
    }
    lastLookups_[0].string = s;
    lastLookups_[0].atom = atom;

    if (s->length() < MinStringLength) {
      return;
    }
    if (!map_.putNew(s, atom)) {
      return;
    }
    s->setInStringToAtomCache();
  }

  void purge() {
    map_.clearAndCompact();
    for (LastLookup& entry : lastLookups_) {
      entry.string = nullptr;
      entry.atom = nullptr;
    }

    ropeCharCache_.Clear();
  }
};

class RuntimeCaches {
 public:
  MegamorphicCache megamorphicCache;
  MegamorphicSetPropCache megamorphicSetPropCache;
  GSNCache gsnCache;
  UncompressedSourceCache uncompressedSourceCache;
  EvalCache evalCache;
  StringToAtomCache stringToAtomCache;

  // Delazification: Cache binding for runtime objects which are used during
  // delazification to quickly resolve NameLocation of bindings without linearly
  // iterating over the list of bindings.
  frontend::RuntimeScopeBindingCache scopeCache;

  // This cache is used to store the result of delazification compilations which
  // might be happening off-thread. The main-thread will concurrently read the
  // content of this cache to avoid delazification, or fallback on running the
  // delazification on the main-thread.
  //
  // Main-thread results are not stored in the StencilCache as there is no other
  // consumer.
  StencilCache delazificationCache;

  void sweepAfterMinorGC(JSTracer* trc) { evalCache.traceWeak(trc); }
#ifdef JSGC_HASH_TABLE_CHECKS
  void checkEvalCacheAfterMinorGC();
#endif

  void purgeForCompaction() {
    evalCache.clear();
    stringToAtomCache.purge();
    megamorphicCache.bumpGeneration();
    megamorphicSetPropCache.bumpGeneration();
    scopeCache.purge();
  }

  void purgeStencils() { delazificationCache.clearAndDisable(); }

  void purge() {
    purgeForCompaction();
    gsnCache.purge();
    uncompressedSourceCache.purge();
    purgeStencils();
  }
};

}  // namespace js

#endif /* vm_Caches_h */

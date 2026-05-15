/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gc/WeakMap-inl.h"

#include "gc/PublicIterators.h"
#include "vm/JSObject.h"

#include "gc/Marking-inl.h"
#include "gc/StoreBuffer-inl.h"

using namespace js;
using namespace js::gc;

WeakMapBase::WeakMapBase(JSObject* memOf, Zone* zone)
    : memberOf(memOf), zone_(zone) {
  MOZ_ASSERT_IF(memberOf, memberOf->compartment()->zone() == zone);
  MOZ_ASSERT(!IsMarked(mapColor()));

  if (isSystem()) {
    zone->gcSystemWeakMaps().insertFront(this);
  } else {
    zone->gcUserWeakMaps().insertFront(this);
  }

  if (zone->isGCMarking()) {
    setMapColor(CellColor::Black);
  }
}

void WeakMapBase::unmarkZone(JS::Zone* zone) {
  zone->gcEphemeronEdges().clearAndCompact();
  ForAllWeakMapsInZone(
      zone, [](WeakMapBase* map) { map->setMapColor(CellColor::White); });
}

#ifdef DEBUG
void WeakMapBase::checkZoneUnmarked(JS::Zone* zone) {
  MOZ_ASSERT(zone->gcEphemeronEdges().empty());
  ForAllWeakMapsInZone(zone, [](WeakMapBase* map) {
    MOZ_ASSERT(map->mapColor() == CellColor::White);
  });
}
#endif

void Zone::traceWeakMaps(JSTracer* trc) {
  MOZ_ASSERT(trc->weakMapAction() != JS::WeakMapTraceAction::Skip);
  ForAllWeakMapsInZone(this, [trc](WeakMapBase* map) {
    map->trace(trc);
    TraceNullableEdge(trc, &map->memberOf, "memberOf");
  });
}

bool WeakMapBase::markMap(MarkColor markColor) {
  // We may be marking in parallel here so use a compare exchange loop to handle
  // concurrent updates to the map color.
  //
  // The color increases monotonically; we don't downgrade from black to gray.
  //
  // We can attempt to mark gray after marking black when a barrier pushes the
  // map object onto the black mark stack when it's already present on the
  // gray mark stack, since this is marked later.

  uint32_t targetColor = uint32_t(markColor);

  for (;;) {
    uint32_t currentColor = mapColor_;

    if (currentColor >= targetColor) {
      return false;
    }

    if (mapColor_.compareExchange(currentColor, targetColor)) {
      return true;
    }
  }
}

bool WeakMapBase::addEphemeronEdgesForEntry(MarkColor mapColor,
                                            TenuredCell* key, Cell* delegate,
                                            TenuredCell* value) {
  if (delegate) {
    if (!delegate->isTenured()) {
      MOZ_ASSERT(false);
      // This case is probably not possible, or wasn't at the time of this
      // writing. It requires a tenured wrapper with a nursery wrappee delegate,
      // which is tough to create given that the wrapper has to be created after
      // its target, and in fact appears impossible because the delegate has to
      // be created after the GC begins to avoid being tenured at the beginning
      // of the GC, and adding the key to the weakmap will mark the key via a
      // pre-barrier. But still, handling this case is straightforward:

      // The delegate is already being kept alive in a minor GC since it has an
      // edge from a tenured cell (the key). Make sure the key stays alive too.
      delegate->storeBuffer()->putWholeCell(key);
    } else if (!addEphemeronEdge(mapColor, &delegate->asTenured(), key)) {
      return false;
    }
  }

  if (value && !addEphemeronEdge(mapColor, key, value)) {
    return false;
  }

  return true;
}

bool WeakMapBase::addEphemeronEdge(MarkColor color, gc::TenuredCell* src,
                                   gc::TenuredCell* dst) {
  // Add an implicit edge from |src| to |dst|.

  auto& edgeTable = src->zone()->gcEphemeronEdges();
  auto p = edgeTable.lookupForAdd(src);
  if (!p) {
    if (!edgeTable.add(p, src, EphemeronEdgeVector())) {
      return false;
    }
  }
  return p->value().emplaceBack(color, dst);
}

#if defined(JS_GC_ZEAL) || defined(DEBUG)
bool WeakMapBase::checkMarkingForZone(JS::Zone* zone) {
  // This is called at the end of marking.
  MOZ_ASSERT(zone->isGCMarking());

  bool ok = true;
  ForAllWeakMapsInZone(zone, [&ok](WeakMapBase* map) {
    if (IsMarked(map->mapColor()) && !map->checkMarking()) {
      ok = false;
    }
  });

  return ok;
}
#endif

#ifdef JSGC_HASH_TABLE_CHECKS
/* static */
void WeakMapBase::checkWeakMapsAfterMovingGC(JS::Zone* zone) {
  ForAllWeakMapsInZone(zone,
                       [](WeakMapBase* map) { map->checkAfterMovingGC(); });
}
#endif

bool WeakMapBase::markZoneIteratively(JS::Zone* zone, GCMarker* marker) {
  MOZ_ASSERT(zone->isGCMarking());

  bool markedAny = false;
  ForAllWeakMapsInZone(zone, [&](WeakMapBase* map) {
    if (IsMarked(map->mapColor()) && map->markEntries(marker)) {
      markedAny = true;
    }
  });
  return markedAny;
}

bool WeakMapBase::findSweepGroupEdgesForZone(JS::Zone* atomsZone,
                                             JS::Zone* mapZone) {
#ifdef DEBUG
  ForAllWeakMapsInZone(mapZone,
                       [](WeakMapBase* map) { map->checkCachedFlags(); });
#endif

  // Because this might involve iterating over all weakmap edges in the zone we
  // cache some information on the zone to allow us to avoid it if possible.
  //
  //  - mapZone->gcWeakMapsMayHaveSymbolKeys() is set if any weakmap may have
  //    symbol keys
  //
  //  - mapZone->gcUserWeakMapsMayHaveKeyDelegates() is set if any user weakmap
  //    may have key delegates
  //
  //  It's assumed that system weakmaps may have key delegates so these are
  //  always scanned. There are a limited number of these.

  if (mapZone->gcWeakMapsMayHaveSymbolKeys()) {
    MOZ_ASSERT(JS::Prefs::experimental_symbols_as_weakmap_keys());
    if (atomsZone->isGCMarking()) {
      if (!atomsZone->addSweepGroupEdgeTo(mapZone)) {
        return false;
      }
    }
  }

  for (WeakMapBase* map : mapZone->gcSystemWeakMaps()) {
    if (!map->findSweepGroupEdges(atomsZone)) {
      return false;
    }
  }

  if (mapZone->gcUserWeakMapsMayHaveKeyDelegates()) {
    for (WeakMapBase* map : mapZone->gcUserWeakMaps()) {
      if (!map->findSweepGroupEdges(atomsZone)) {
        return false;
      }
    }
  }

  return true;
}

void Zone::sweepWeakMaps(JSTracer* trc) {
  MOZ_ASSERT(isGCSweeping());

  // These flags will be recalculated during sweeping.
  clearGCCachedWeakMapKeyData();

  for (auto* list : {&gcSystemWeakMaps(), &gcUserWeakMaps()}) {
    for (WeakMapBase* m = list->getFirst(); m;) {
      WeakMapBase* next = m->getNext();
      if (IsMarked(m->mapColor())) {
        // Sweep live map to remove dead entries.
        m->traceWeakEdgesDuringSweeping(trc);
        // Unmark swept weak map.
        m->setMapColor(CellColor::White);
      } else {
        if (m->memberOf) {
          // Table will be cleaned up when owning object is finalized.
          MOZ_ASSERT(!m->memberOf->isMarkedAny());
        } else if (!m->empty()) {
          // Clean up internal weak maps now. This may remove store buffer
          // entries.
          AutoLockSweepingLock lock(trc->runtime());
          m->clearAndCompact();
        }
        m->removeFrom(*list);
      }
      m = next;
    }
  }

#ifdef DEBUG
  ForAllWeakMapsInZone(
      this, [](WeakMapBase* map) { MOZ_ASSERT(!IsMarked(map->mapColor())); });
#endif
}

void WeakMapBase::traceAllMappings(WeakMapTracer* tracer) {
  JSRuntime* rt = tracer->runtime;
  for (ZonesIter zone(rt, SkipAtoms); !zone.done(); zone.next()) {
    ForAllWeakMapsInZone(zone, [tracer](WeakMapBase* map) {
      // The WeakMapTracer callback is not allowed to GC.
      JS::AutoSuppressGCAnalysis nogc;
      map->traceMappings(tracer);
    });
  }
}

#if defined(JS_GC_ZEAL)

bool WeakMapBase::saveZoneMarkedWeakMaps(JS::Zone* zone,
                                         WeakMapColors& markedWeakMaps) {
  bool ok = true;
  ForAllWeakMapsInZone(zone, [&](WeakMapBase* map) {
    if (IsMarked(map->mapColor()) &&
        !markedWeakMaps.put(map, map->mapColor())) {
      ok = false;
    }
  });
  return ok;
}

void WeakMapBase::restoreMarkedWeakMaps(WeakMapColors& markedWeakMaps) {
  for (WeakMapColors::Range r = markedWeakMaps.all(); !r.empty();
       r.popFront()) {
    WeakMapBase* map = r.front().key();
    MOZ_ASSERT(map->zone()->isGCMarking());
    MOZ_ASSERT(!IsMarked(map->mapColor()));
    map->setMapColor(r.front().value());
  }
}

#endif  // JS_GC_ZEAL

void WeakMapBase::setHasNurseryEntries() {
  MOZ_ASSERT(!hasNurseryEntries);

  AutoEnterOOMUnsafeRegion oomUnsafe;

  GCRuntime* gc = &zone()->runtimeFromMainThread()->gc;
  if (!gc->nursery().addWeakMapWithNurseryEntries(this)) {
    oomUnsafe.crash("WeakMapBase::setHasNurseryEntries");
  }

  hasNurseryEntries = true;
}

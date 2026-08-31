/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_CachedInheritingStyles_h
#define mozilla_CachedInheritingStyles_h

#include "nsAtom.h"
#include "nsCOMPtr.h"
#include "nsTArray.h"

class nsWindowSizes;

namespace mozilla {

struct PseudoStyleRequest;
enum class PseudoStyleType : uint8_t;
class ComputedStyle;

// Entry in the cached inheriting styles cache. Stores the style and, for
// functional pseudo-elements like ::highlight(name), the functional parameter.
// mStyle may be null for entries that record a lazy pseudo probe that returned
// no matching rules.
struct CachedStyleEntry {
  RefPtr<ComputedStyle> mStyle;
  RefPtr<nsAtom> mFunctionalPseudoParameter;
  PseudoStyleType mPseudoType;
};

// Cache of anonymous box and lazy pseudo styles that inherit from a given
// style.
//
// To minimize memory footprint, the cache is word-sized with a tagged pointer.
// mBits encoding (low two bits are tags):
//   mBits == 0:           empty
//   mBits & 1 == 1:       indirect (pointer to IndirectCache with bit 0 set)
//   mBits & 3 == 2:       null-direct — a single cached null probe result,
//                         with PseudoStyleType stored in bits [2..N]
//   mBits & 3 == 0, != 0: direct — pointer to a single ComputedStyle
//
// See bug 1429126 comment 0 and comment 1 for the measurements and
// rationale that influenced the design.
class CachedInheritingStyles {
 public:
  // aStyle may be null to record a "null entry" for a lazy pseudo probe that
  // returned no matching rules.
  void Insert(ComputedStyle* aStyle, PseudoStyleType aType,
              nsAtom* aFunctionalPseudoParameter = nullptr);
  ComputedStyle* Lookup(const PseudoStyleRequest& aRequest) const;
  // Returns true if any entry (null or non-null) exists for the given request.
  bool HasEntry(const PseudoStyleRequest& aRequest) const;

  // Appends all cached styles to the given array.
  // Skips null entries.
  void AppendTo(nsTArray<const ComputedStyle*>& aArray) const;

  // Calls aFunc(ComputedStyle*, nsAtom*, PseudoStyleType) for each
  // lazily-cascaded pseudo element entry (null or non-null). Anon box entries
  // are skipped. The ComputedStyle* and nsAtom* are non-owning.
  template <typename Func>
  void ForEachLazyPseudoEntry(Func&& aFunc) const;

  CachedInheritingStyles() : mBits(0) {}
  ~CachedInheritingStyles() {
    if (IsIndirect()) {
      delete AsIndirect();
    } else if (!IsEmpty() && !IsNullDirect()) {
      RefPtr<ComputedStyle> ref = dont_AddRef(AsDirect());
    }
  }

  void AddSizeOfIncludingThis(nsWindowSizes& aSizes, size_t* aCVsSize) const;

 private:
  // See bug 1429126 comment 1 for the choice of four here.
  using IndirectCache = AutoTArray<CachedStyleEntry, 4>;

  bool IsEmpty() const { return !mBits; }
  bool IsIndirect() const { return (mBits & 1); }
  bool IsNullDirect() const { return (mBits & 3) == 2; }

  ComputedStyle* AsDirect() const {
    MOZ_ASSERT(!IsIndirect() && !IsNullDirect());
    return reinterpret_cast<ComputedStyle*>(mBits);
  }

  PseudoStyleType NullDirectType() const {
    MOZ_ASSERT(IsNullDirect());
    return static_cast<PseudoStyleType>(mBits >> 2);
  }

  IndirectCache* AsIndirect() const {
    MOZ_ASSERT(IsIndirect());
    return reinterpret_cast<IndirectCache*>(mBits & ~uintptr_t(1));
  }

  uintptr_t mBits;
};

}  // namespace mozilla

#endif  // mozilla_CachedInheritingStyles_h

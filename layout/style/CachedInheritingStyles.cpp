/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/CachedInheritingStyles.h"

#include "mozilla/ComputedStyle.h"
#include "mozilla/PseudoStyleType.h"
#include "nsCOMPtr.h"
#include "nsWindowSizes.h"

namespace mozilla {

void CachedInheritingStyles::Insert(ComputedStyle* aStyle,
                                    PseudoStyleType aType,
                                    nsAtom* aFunctionalPseudoParameter) {
  MOZ_ASSERT_IF(aStyle, aStyle->IsInheritingAnonBox() ||
                            aStyle->IsLazilyCascadedPseudoElement());
  MOZ_ASSERT_IF(aStyle, aStyle->GetPseudoType() == aType);

  // Direct mode stores a single ComputedStyle* without a functional parameter.
  // Null-direct mode stores a single probed-null result without a functional
  // parameter (PseudoStyleType encoded in the upper bits of mBits).
  // Functional parameters always require indirect storage.
  const bool needsIndirect = aFunctionalPseudoParameter != nullptr;

  if (IsEmpty() && !needsIndirect) {
    if (aStyle) {
      RefPtr<ComputedStyle> s = aStyle;
      mBits = reinterpret_cast<uintptr_t>(s.forget().take());
      MOZ_ASSERT(!IsEmpty() && !IsIndirect() && !IsNullDirect());
    } else {
      mBits = (static_cast<uintptr_t>(aType) << 2) | 2;
      MOZ_ASSERT(IsNullDirect());
    }
  } else if (IsIndirect()) {
    AsIndirect()->AppendElement(
        CachedStyleEntry{aStyle, aFunctionalPseudoParameter, aType});
  } else {
    IndirectCache* cache = new IndirectCache();
    if (!IsEmpty()) {
      if (IsNullDirect()) {
        cache->AppendElement(
            CachedStyleEntry{nullptr, nullptr, NullDirectType()});
      } else {
        auto* direct = AsDirect();
        cache->AppendElement(CachedStyleEntry{dont_AddRef(direct), nullptr,
                                              direct->GetPseudoType()});
      }
    }
    cache->AppendElement(
        CachedStyleEntry{aStyle, aFunctionalPseudoParameter, aType});
    mBits = reinterpret_cast<uintptr_t>(cache) | 1;
    MOZ_ASSERT(IsIndirect());
  }
}

ComputedStyle* CachedInheritingStyles::Lookup(
    const PseudoStyleRequest& aRequest) const {
  MOZ_ASSERT(PseudoStyle::IsPseudoElement(aRequest.mType) ||
             PseudoStyle::IsInheritingAnonBox(aRequest.mType));
  if (IsIndirect()) {
    for (const auto& entry : *AsIndirect()) {
      if (!entry.mStyle) {
        continue;
      }
      if (entry.mPseudoType == aRequest.mType &&
          entry.mFunctionalPseudoParameter == aRequest.mIdentifier) {
        return entry.mStyle;
      }
    }

    return nullptr;
  }

  // Direct modes only store non-functional entries.
  if (aRequest.mIdentifier) {
    return nullptr;
  }

  if (IsNullDirect()) {
    return nullptr;
  }

  ComputedStyle* direct = AsDirect();
  return direct && direct->GetPseudoType() == aRequest.mType ? direct : nullptr;
}

bool CachedInheritingStyles::HasEntry(
    const PseudoStyleRequest& aRequest) const {
  if (IsIndirect()) {
    for (const auto& entry : *AsIndirect()) {
      if (entry.mPseudoType == aRequest.mType &&
          entry.mFunctionalPseudoParameter == aRequest.mIdentifier) {
        return true;
      }
    }

    return false;
  }

  if (aRequest.mIdentifier) {
    return false;
  }

  if (IsNullDirect()) {
    return NullDirectType() == aRequest.mType;
  }

  ComputedStyle* direct = AsDirect();
  return direct && direct->GetPseudoType() == aRequest.mType;
}

void CachedInheritingStyles::AppendTo(
    nsTArray<const ComputedStyle*>& aArray) const {
  if (IsEmpty() || IsNullDirect()) {
    return;
  }

  if (IsIndirect()) {
    for (const auto& entry : *AsIndirect()) {
      if (entry.mStyle) {
        aArray.AppendElement(entry.mStyle.get());
      }
    }
    return;
  }

  aArray.AppendElement(AsDirect());
}

void CachedInheritingStyles::AddSizeOfIncludingThis(nsWindowSizes& aSizes,
                                                    size_t* aCVsSize) const {
  if (IsIndirect()) {
    for (const auto& entry : *AsIndirect()) {
      if (entry.mStyle && !aSizes.mState.HaveSeenPtr(entry.mStyle)) {
        entry.mStyle->AddSizeOfIncludingThis(aSizes, aCVsSize);
      }
    }

    return;
  }

  if (IsNullDirect()) {
    return;
  }

  ComputedStyle* direct = AsDirect();
  if (direct && !aSizes.mState.HaveSeenPtr(direct)) {
    direct->AddSizeOfIncludingThis(aSizes, aCVsSize);
  }
}

}  // namespace mozilla

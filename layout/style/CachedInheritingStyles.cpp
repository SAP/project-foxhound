/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
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
                                    nsAtom* aFunctionalPseudoParameter) {
  MOZ_ASSERT(aStyle);
  MOZ_ASSERT(aStyle->IsInheritingAnonBox() ||
             aStyle->IsLazilyCascadedPseudoElement());

  // For entries with a functional parameter, we always use indirect storage
  // since direct mode only stores a ComputedStyle* without the parameter.
  const bool needsIndirect = aFunctionalPseudoParameter != nullptr;

  if (IsEmpty() && !needsIndirect) {
    RefPtr<ComputedStyle> s = aStyle;
    mBits = reinterpret_cast<uintptr_t>(s.forget().take());
    MOZ_ASSERT(!IsEmpty() && !IsIndirect());
  } else if (IsIndirect()) {
    AsIndirect()->AppendElement(
        CachedStyleEntry{aStyle, aFunctionalPseudoParameter});
  } else {
    IndirectCache* cache = new IndirectCache();
    if (!IsEmpty()) {
      cache->AppendElement(CachedStyleEntry{dont_AddRef(AsDirect()), nullptr});
    }
    cache->AppendElement(CachedStyleEntry{aStyle, aFunctionalPseudoParameter});
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
      if (entry.mStyle->GetPseudoType() == aRequest.mType &&
          entry.mFunctionalPseudoParameter == aRequest.mIdentifier) {
        return entry.mStyle;
      }
    }

    return nullptr;
  }

  // Direct mode only stores non-functional entries.
  if (aRequest.mIdentifier) {
    return nullptr;
  }

  ComputedStyle* direct = AsDirect();
  return direct && direct->GetPseudoType() == aRequest.mType ? direct : nullptr;
}

void CachedInheritingStyles::AppendTo(
    nsTArray<const ComputedStyle*>& aArray) const {
  if (IsEmpty()) {
    return;
  }

  if (IsIndirect()) {
    for (const auto& entry : *AsIndirect()) {
      aArray.AppendElement(entry.mStyle.get());
    }
    return;
  }

  aArray.AppendElement(AsDirect());
}

void CachedInheritingStyles::AddSizeOfIncludingThis(nsWindowSizes& aSizes,
                                                    size_t* aCVsSize) const {
  if (IsIndirect()) {
    for (const auto& entry : *AsIndirect()) {
      if (!aSizes.mState.HaveSeenPtr(entry.mStyle)) {
        entry.mStyle->AddSizeOfIncludingThis(aSizes, aCVsSize);
      }
    }

    return;
  }

  ComputedStyle* direct = AsDirect();
  if (direct && !aSizes.mState.HaveSeenPtr(direct)) {
    direct->AddSizeOfIncludingThis(aSizes, aCVsSize);
  }
}

}  // namespace mozilla

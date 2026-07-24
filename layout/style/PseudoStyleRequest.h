/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_PseudoStyleRequest_h
#define mozilla_PseudoStyleRequest_h

#include "PLDHashTable.h"
#include "mozilla/PseudoStyleType.h"
#include "mozilla/RefPtr.h"
#include "nsAtom.h"

namespace mozilla {

/*
 * The pseudo style request is used to get the pseudo style of an element. This
 * include a pseudo style type and an identifier which is used for functional
 * pseudo style.
 */
struct PseudoStyleRequest {
  PseudoStyleRequest() = default;
  PseudoStyleRequest(PseudoStyleRequest&&) = default;
  PseudoStyleRequest(const PseudoStyleRequest&) = default;
  PseudoStyleRequest& operator=(PseudoStyleRequest&&) = default;
  PseudoStyleRequest& operator=(const PseudoStyleRequest&) = default;

  explicit PseudoStyleRequest(PseudoStyleType aType) : mType(aType) {}
  PseudoStyleRequest(PseudoStyleType aType, nsAtom* aIdentifier)
      : mType(aType), mIdentifier(aIdentifier) {}

  bool operator==(const PseudoStyleRequest&) const = default;

  bool IsNotPseudo() const { return mType == PseudoStyleType::NotPseudo; }
  bool IsPseudoElementOrNotPseudo() const {
    return IsNotPseudo() || PseudoStyle::IsPseudoElement(mType);
  }
  bool IsViewTransition() const {
    return PseudoStyle::IsViewTransitionPseudoElement(mType);
  }

  static PseudoStyleRequest NotPseudo() { return PseudoStyleRequest(); }
  static PseudoStyleRequest Before() {
    return PseudoStyleRequest(PseudoStyleType::Before);
  }
  static PseudoStyleRequest After() {
    return PseudoStyleRequest(PseudoStyleType::After);
  }
  static PseudoStyleRequest Marker() {
    return PseudoStyleRequest(PseudoStyleType::Marker);
  }
  static PseudoStyleRequest Backdrop() {
    return PseudoStyleRequest(PseudoStyleType::Backdrop);
  }

  PseudoStyleType mType = PseudoStyleType::NotPseudo;
  RefPtr<nsAtom> mIdentifier;

  void ToString(nsAString&) const;

  // Returns an empty Request for a syntactically invalid pseudo-element, and
  // NotPseudo for the empty / null string.
  static mozilla::Maybe<PseudoStyleRequest> Parse(
      const nsAString& aPseudoElement, bool aIgnoreEnabledState = false);
};

class PseudoStyleRequestHashKey : public PLDHashEntryHdr {
 public:
  using KeyType = PseudoStyleRequest;
  using KeyTypePointer = const PseudoStyleRequest*;

  explicit PseudoStyleRequestHashKey(KeyTypePointer aKey) : mRequest(*aKey) {}
  PseudoStyleRequestHashKey(PseudoStyleRequestHashKey&& aOther) = default;
  ~PseudoStyleRequestHashKey() = default;

  KeyType GetKey() const { return mRequest; }
  bool KeyEquals(KeyTypePointer aKey) const { return *aKey == mRequest; }

  static KeyTypePointer KeyToPointer(KeyType& aKey) { return &aKey; }
  static PLDHashNumber HashKey(KeyTypePointer aKey) {
    return mozilla::HashGeneric(
        static_cast<uint8_t>(aKey->mType),
        aKey->mIdentifier ? aKey->mIdentifier->hash() : 0);
  }
  enum { ALLOW_MEMMOVE = true };

 private:
  PseudoStyleRequest mRequest;
};

}  // namespace mozilla

#endif

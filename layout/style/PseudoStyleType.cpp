/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PseudoStyleType.h"

#include <ostream>

#include "PseudoStyleRequest.h"
#include "mozilla/ServoBindings.h"
#include "nsDOMString.h"

namespace mozilla {

std::ostream& operator<<(std::ostream& aStream, PseudoStyleType aType) {
  switch (aType) {
#define CSS_PSEUDO_STYLE_TYPE(_name, _flags) \
  case PseudoStyleType::_name:               \
    aStream << #_name;                       \
    break;
#include "mozilla/PseudoStyleTypeList.h"
#undef CSS_PSEUDO_STYLE_TYPE
    case PseudoStyleType::NotPseudo:
    default:
      // Output nothing.
      break;
  }

  return aStream;
}

/* static */
Maybe<PseudoStyleRequest> PseudoStyleRequest::Parse(
    const nsAString& aPseudoElement, bool aIgnoreEnabledState) {
  PseudoStyleRequest result;

  // Not a pseudo-element, use default PseudoStyleReqeust.
  if (DOMStringIsNull(aPseudoElement) || aPseudoElement.IsEmpty()) {
    return Some(result);
  }

  // Parse the pseudo-element string.
  if (!Servo_ParsePseudoElement(&aPseudoElement, aIgnoreEnabledState,
                                &result)) {
    return Nothing();
  }

  // Servo_ParsePseudoElement() doesn't do enabled check, so it may return all
  // possible PseudoElements, including tree pseudo-elements and anoymous boxes,
  // so we have to filter out the pseudo-elements not defined in
  MOZ_ASSERT(aIgnoreEnabledState || PseudoStyle::IsPseudoElement(result.mType),
             "Anon boxes should not be enabled everywhere");
  return Some(result);
}

void PseudoStyleRequest::ToString(nsAString& aResult) const {
  aResult = [&]() -> nsString {
    switch (mType) {
      case PseudoStyleType::Before:
        return u"::before"_ns;
      case PseudoStyleType::After:
        return u"::after"_ns;
      case PseudoStyleType::Backdrop:
        return u"::backdrop"_ns;
      case PseudoStyleType::Marker:
        return u"::marker"_ns;
      case PseudoStyleType::ViewTransition:
        return u"::view-transition"_ns;
      case PseudoStyleType::ViewTransitionGroup:
        return u"::view-transition-group("_ns + nsAtomString(mIdentifier) +
               u")"_ns;
      case PseudoStyleType::ViewTransitionImagePair:
        return u"::view-transition-image-pair("_ns + nsAtomString(mIdentifier) +
               u")"_ns;
      case PseudoStyleType::ViewTransitionOld:
        return u"::view-transition-old("_ns + nsAtomString(mIdentifier) +
               u")"_ns;
      case PseudoStyleType::ViewTransitionNew:
        return u"::view-transition-new("_ns + nsAtomString(mIdentifier) +
               u")"_ns;
      default:
        MOZ_ASSERT(IsNotPseudo(), "Unexpected pseudo type");
        return u""_ns;
    }
  }();
}

/* static */ const PseudoStyleTypeFlags PseudoStyle::kFlags[] = {
#define CSS_PSEUDO_STYLE_TYPE(name_, flags_) flags_,
#include "mozilla/PseudoStyleTypeList.h"
#undef CSS_PSEUDO_STYLE_TYPE
    PseudoStyleTypeFlags(0),
};

/* static */ const nsStaticAtom* PseudoStyle::kAtoms[] = {
#define CSS_PSEUDO_STYLE_TYPE(name_, flags_) nsGkAtoms::PseudoStyle_##name_,
#include "mozilla/PseudoStyleTypeList.h"
#undef CSS_PSEUDO_STYLE_TYPE
};

};  // namespace mozilla

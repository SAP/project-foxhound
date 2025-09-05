/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_AnimationUtils_h
#define mozilla_dom_AnimationUtils_h

#include "mozilla/PseudoStyleType.h"
#include "mozilla/TimeStamp.h"
#include "mozilla/dom/Nullable.h"
#include "nsRFPService.h"
#include "nsStringFwd.h"

class nsIContent;
class nsIFrame;
struct JSContext;

namespace mozilla {

class EffectSet;

namespace dom {
class Document;
class Element;
}  // namespace dom

class AnimationUtils {
 public:
  using Document = dom::Document;

  static dom::Nullable<double> TimeDurationToDouble(
      const dom::Nullable<TimeDuration>& aTime, RTPCallerType aRTPCallerType) {
    dom::Nullable<double> result;

    if (!aTime.IsNull()) {
      // 0 is an inappropriate mixin for this this area; however CSS Animations
      // needs to have it's Time Reduction Logic refactored, so it's currently
      // only clamping for RFP mode. RFP mode gives a much lower time precision,
      // so we accept the security leak here for now
      result.SetValue(nsRFPService::ReduceTimePrecisionAsMSecsRFPOnly(
          aTime.Value().ToMilliseconds(), 0, aRTPCallerType));
    }

    return result;
  }

  static dom::Nullable<TimeDuration> DoubleToTimeDuration(
      const dom::Nullable<double>& aTime) {
    dom::Nullable<TimeDuration> result;

    if (!aTime.IsNull()) {
      result.SetValue(TimeDuration::FromMilliseconds(aTime.Value()));
    }

    return result;
  }

  static void LogAsyncAnimationFailure(nsCString& aMessage,
                                       const nsIContent* aContent = nullptr);

  /**
   * Get the document from the JS context to use when parsing CSS properties.
   */
  static Document* GetCurrentRealmDocument(JSContext* aCx);

  /**
   * Get the document from the global object, or nullptr if the document has
   * no window, to use when constructing DOM object without entering the
   * target window's compartment (see KeyframeEffect constructor).
   */
  static Document* GetDocumentFromGlobal(JSObject* aGlobalObject);

  /**
   * Returns true if the given frame has an animated scale.
   */
  static bool FrameHasAnimatedScale(const nsIFrame* aFrame);

  /**
   * Returns true if the given (pseudo-)element has any transitions that are
   * current (playing or waiting to play) or in effect (e.g. filling forwards).
   */
  static bool HasCurrentTransitions(const dom::Element* aElement,
                                    const PseudoStyleRequest& aPseudoRequest =
                                        PseudoStyleRequest::NotPseudo());

  /**
   * Returns true if this pseudo style type is supported by animations.
   * Note: This doesn't include PseudoStyleType::NotPseudo.
   */
  static bool IsSupportedPseudoForAnimations(PseudoStyleType aType) {
    // FIXME: Bug 1615469: Support first-line and first-letter for Animation.
    return PseudoStyle::IsViewTransitionPseudoElement(aType) ||
           aType == PseudoStyleType::before ||
           aType == PseudoStyleType::after || aType == PseudoStyleType::marker;
  }
  static bool IsSupportedPseudoForAnimations(
      const PseudoStyleRequest& aRequest) {
    return IsSupportedPseudoForAnimations(aRequest.mType);
  }

  /**
   * Returns true if the difference between |aFirst| and |aSecond| is within
   * the animation time tolerance (i.e. 1 microsecond).
   */
  static bool IsWithinAnimationTimeTolerance(const TimeDuration& aFirst,
                                             const TimeDuration& aSecond) {
    if (aFirst == TimeDuration::Forever() ||
        aSecond == TimeDuration::Forever()) {
      return aFirst == aSecond;
    }

    TimeDuration diff = aFirst >= aSecond ? aFirst - aSecond : aSecond - aFirst;
    return diff <= TimeDuration::FromMicroseconds(1);
  }

  // Returns the pair of |Element, PseudoStyleRequest| from an element which
  // could be an element or a pseudo element (i.e. an element used for restyling
  // and DOM tree.).
  //
  // Animation module usually uses a pair of (Element*, PseudoStyleRequest) to
  // represent the animation target.
  // Note that we sepatate the originating element and PseudoStyleRequest in
  // Animation code, but store the animations on "::before", "::after", and
  // "::marker" in the originating element. For view-transition pseudo-elements
  // and others, we store their KeyframeEffect, timelines, animations, and
  // transitions in the pseudo-element themself. So use this function carefully.
  static std::pair<const dom::Element*, PseudoStyleRequest>
  GetElementPseudoPair(const dom::Element* aElementOrPseudo);
};

}  // namespace mozilla

#endif

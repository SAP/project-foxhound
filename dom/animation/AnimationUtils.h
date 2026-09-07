/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_AnimationUtils_h
#define mozilla_dom_AnimationUtils_h

#include "mozilla/PseudoStyleRequest.h"
#include "mozilla/TimeStamp.h"
#include "mozilla/dom/CSSNumericValueBindingFwd.h"
#include "mozilla/dom/Nullable.h"
#include "nsRFPService.h"
#include "nsStringFwd.h"

class nsIContent;
class nsIFrame;
class nsIGlobalObject;
struct JSContext;

namespace mozilla {

class EffectSet;
class ErrorResult;

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

  // The spec's "validate a CSSNumberish time" procedure.
  // https://drafts.csswg.org/web-animations-2/#validating-a-cssnumberish-time
  // aProgressBased is true when typed-OM is enabled and the animation is
  // associated with a progress-based timeline. Returns false, having thrown a
  // TypeError on aRv, if aValue is not valid for the timeline type.
  static bool ValidateCSSNumberishTime(const dom::CSSNumberish& aValue,
                                       bool aProgressBased, ErrorResult& aRv);

  // Fills a non-nullable CSSNumberish dictionary field from a millisecond
  // value, converting to percent (0..100) when |aProgressBased| is true
  // (i.e. the effect is on a progress-based timeline and Typed-OM is exposed).
  static void DoubleToCSSNumberish(double aMs, bool aProgressBased,
                                   nsIGlobalObject* aGlobal,
                                   dom::OwningCSSNumberish& aRetVal);

  // Convert an internal TimeDuration to the CSSNumberish exposed via the
  // currentTime/startTime IDL attributes: a percent CSSUnitValue when
  // aProgressBased is true (i.e. typed-OM is enabled and the animation is
  // associated with a progress-based timeline), else a plain double in
  // milliseconds. aGlobal is used to construct the CSSUnitValue.
  static void DurationToCSSNumberish(
      const dom::Nullable<TimeDuration>& aTime, bool aProgressBased,
      RTPCallerType aRTPCallerType, nsIGlobalObject* aGlobal,
      dom::Nullable<dom::OwningCSSNumberish>& aRetVal);

  // Convert a CSSNumberish time to the internal TimeDuration. aValue must
  // already have been accepted by ValidateCSSNumberishTime, with the same
  // aProgressBased value.
  static dom::Nullable<TimeDuration> CSSNumberishToDuration(
      const dom::CSSNumberish& aValue, bool aProgressBased);

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

  static bool StoresAnimationsInParent(PseudoStyleType aType) {
    return aType == PseudoStyleType::Before ||
           aType == PseudoStyleType::After ||
           aType == PseudoStyleType::Marker ||
           aType == PseudoStyleType::Backdrop;
  }

  /**
   * Returns true if this pseudo style type is supported by animations.
   * Note: This doesn't include PseudoStyleType::NotPseudo.
   */
  static bool IsSupportedPseudoForAnimations(PseudoStyleType aType) {
    // FIXME: Bug 1615469: Support first-line and first-letter for Animation.
    return PseudoStyle::IsViewTransitionPseudoElement(aType) ||
           StoresAnimationsInParent(aType);
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

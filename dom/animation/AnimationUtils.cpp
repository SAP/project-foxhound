/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AnimationUtils.h"

#include "mozilla/EffectSet.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/StaticPrefs_layout.h"
#include "mozilla/dom/Animation.h"
#include "mozilla/dom/CSSNumericValueBinding.h"
#include "mozilla/dom/CSSUnitValue.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/KeyframeEffect.h"
#include "mozilla/dom/ScrollTimeline.h"  // For PROGRESS_TIMELINE_DURATION_MILLISEC
#include "nsAtom.h"
#include "nsDebug.h"
#include "nsGlobalWindowInner.h"
#include "nsIContent.h"
#include "nsLayoutUtils.h"
#include "nsString.h"
#include "xpcpublic.h"  // For xpc::NativeGlobal

using namespace mozilla::dom;

namespace mozilla {

/* static */
void AnimationUtils::LogAsyncAnimationFailure(nsCString& aMessage,
                                              const nsIContent* aContent) {
  if (aContent) {
    aMessage.AppendLiteral(" [");
    aMessage.Append(nsAtomCString(aContent->NodeInfo()->NameAtom()));

    nsAtom* id = aContent->GetID();
    if (id) {
      aMessage.AppendLiteral(" with id '");
      aMessage.Append(nsAtomCString(aContent->GetID()));
      aMessage.Append('\'');
    }
    aMessage.Append(']');
  }
  aMessage.Append('\n');
  printf_stderr("%s", aMessage.get());
}

/* static */
Document* AnimationUtils::GetCurrentRealmDocument(JSContext* aCx) {
  nsGlobalWindowInner* win = xpc::CurrentWindowOrNull(aCx);
  if (!win) {
    return nullptr;
  }
  return win->GetDoc();
}

/* static */
Document* AnimationUtils::GetDocumentFromGlobal(JSObject* aGlobalObject) {
  nsGlobalWindowInner* win = xpc::WindowOrNull(aGlobalObject);
  if (!win) {
    return nullptr;
  }
  return win->GetDoc();
}

/* static */
bool AnimationUtils::FrameHasAnimatedScale(const nsIFrame* aFrame) {
  EffectSet* effectSet = EffectSet::GetForFrame(
      aFrame, nsCSSPropertyIDSet::TransformLikeProperties());
  if (!effectSet) {
    return false;
  }

  for (const dom::KeyframeEffect* effect : *effectSet) {
    if (effect->ContainsAnimatedScale(aFrame)) {
      return true;
    }
  }

  return false;
}

/* static */
bool AnimationUtils::HasCurrentTransitions(
    const Element* aElement, const PseudoStyleRequest& aPseudoRequest) {
  MOZ_ASSERT(aElement);

  EffectSet* effectSet = EffectSet::Get(aElement, aPseudoRequest);
  if (!effectSet) {
    return false;
  }

  for (const dom::KeyframeEffect* effect : *effectSet) {
    // If |effect| is current, it must have an associated Animation
    // so we don't need to null-check the result of GetAnimation().
    if (effect->IsCurrent() && effect->GetAnimation()->AsCSSTransition()) {
      return true;
    }
  }

  return false;
}

/*static*/
std::pair<const Element*, PseudoStyleRequest>
AnimationUtils::GetElementPseudoPair(const Element* aElementOrPseudo) {
  MOZ_ASSERT(aElementOrPseudo);

  if (aElementOrPseudo->IsGeneratedContentContainerForBefore()) {
    return {aElementOrPseudo->GetParent()->AsElement(),
            PseudoStyleRequest::Before()};
  }

  if (aElementOrPseudo->IsGeneratedContentContainerForAfter()) {
    return {aElementOrPseudo->GetParent()->AsElement(),
            PseudoStyleRequest::After()};
  }

  if (aElementOrPseudo->IsGeneratedContentContainerForMarker()) {
    return {aElementOrPseudo->GetParent()->AsElement(),
            PseudoStyleRequest::Marker()};
  }

  if (aElementOrPseudo->IsGeneratedContentContainerForBackdrop()) {
    return {aElementOrPseudo->GetParent()->AsElement(),
            PseudoStyleRequest::Backdrop()};
  }

  const PseudoStyleType type = aElementOrPseudo->GetPseudoElementType();
  if (PseudoStyle::IsViewTransitionPseudoElement(type)) {
    // Note: ::view-transition doesn't have a name, so we check if it has a name
    // first.
    nsAtom* name =
        aElementOrPseudo->HasName()
            ? aElementOrPseudo->GetParsedAttr(nsGkAtoms::name)->GetAtomValue()
            : nullptr;
    return {aElementOrPseudo->GetOwnerDocument()->GetRootElement(),
            PseudoStyleRequest(type, name)};
  }

  return {aElementOrPseudo, PseudoStyleRequest::NotPseudo()};
}

// https://www.w3.org/TR/css-values-4/#time-value
static bool IsDurationUnits(const CSSNumericValue& aValue) {
  if (RefPtr<CSSUnitValue> asMs = aValue.To("ms"_ns, IgnoreErrors())) {
    return true;
  }
  if (RefPtr<CSSUnitValue> asSeconds = aValue.To("s"_ns, IgnoreErrors())) {
    return true;
  }
  return false;
}

// https://drafts.csswg.org/web-animations-2/#validate-a-cssnumberish-time
/* static */
bool AnimationUtils::ValidateCSSNumberishTime(const CSSNumberish& aValue,
                                              bool aProgressBased,
                                              ErrorResult& aRv) {
  const bool isCSSNumericValue = aValue.IsCSSNumericValue();

  // A CSSNumericValue was passed. This shouldn't be reachable from JS while
  // typed-OM is disabled (the interface is pref-gated), but reject defensively.
  if (isCSSNumericValue && !StaticPrefs::layout_css_typed_om_enabled()) {
    aRv.ThrowTypeError("CSSNumericValue is not supported.");
    return false;
  }

  if (aProgressBased && !isCSSNumericValue) {
    aRv.ThrowTypeError(
        "Setting time using absolute time values is not supported for "
        "progress-based animations.");
    return false;
  }

  if (!aProgressBased && isCSSNumericValue) {
    CSSNumericValue& numeric = aValue.GetAsCSSNumericValue();
    if (!IsDurationUnits(numeric)) {
      aRv.ThrowTypeError(
          "CSSNumericValue must be a <time> for non-progress-based "
          "animations.");
      return false;
    }
  }

  return true;
}

/* static */
void AnimationUtils::DoubleToCSSNumberish(double aMs, bool aProgressBased,
                                          nsIGlobalObject* aGlobal,
                                          OwningCSSNumberish& aRetVal) {
  if (aProgressBased) {
    const double progress =
        aMs / static_cast<double>(PROGRESS_TIMELINE_DURATION_MILLISEC) * 100.0;
    aRetVal.SetAsCSSNumericValue() =
        MakeRefPtr<CSSUnitValue>(aGlobal, progress, "percent"_ns);
    return;
  }
  aRetVal.SetAsDouble() = aMs;
}

/* static */
void AnimationUtils::DurationToCSSNumberish(
    const Nullable<TimeDuration>& aTime, bool aProgressBased,
    RTPCallerType aRTPCallerType, nsIGlobalObject* aGlobal,
    Nullable<OwningCSSNumberish>& aRetVal) {
  if (aTime.IsNull()) {
    aRetVal.SetNull();
    return;
  }
  const double ms = TimeDurationToDouble(aTime, aRTPCallerType).Value();
  DoubleToCSSNumberish(ms, aProgressBased, aGlobal, aRetVal.SetValue());
}

/* static */
Nullable<TimeDuration> AnimationUtils::CSSNumberishToDuration(
    const CSSNumberish& aValue, bool aProgressBased) {
  if (aValue.IsDouble()) {
    return Nullable<TimeDuration>(
        TimeDuration::FromMilliseconds(aValue.GetAsDouble()));
  }

  CSSNumericValue& numeric = aValue.GetAsCSSNumericValue();
  if (aProgressBased) {
    RefPtr<CSSUnitValue> asPercent = numeric.To("percent"_ns, IgnoreErrors());
    MOZ_ASSERT(asPercent, "caller should validate value");
    const double ms = asPercent->Value() / 100.0 *
                      static_cast<double>(PROGRESS_TIMELINE_DURATION_MILLISEC);
    return Nullable<TimeDuration>(TimeDuration::FromMilliseconds(ms));
  }

  if (RefPtr<CSSUnitValue> asMs = numeric.To("ms"_ns, IgnoreErrors())) {
    return Nullable<TimeDuration>(
        TimeDuration::FromMilliseconds(asMs->Value()));
  }
  RefPtr<CSSUnitValue> asSeconds = numeric.To("s"_ns, IgnoreErrors());
  MOZ_ASSERT(asSeconds, "caller should validate value");
  return Nullable<TimeDuration>(TimeDuration::FromSeconds(asSeconds->Value()));
}

}  // namespace mozilla

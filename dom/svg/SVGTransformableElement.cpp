/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGTransformableElement.h"

#include "DOMSVGAnimatedTransformList.h"
#include "mozilla/dom/MutationEventBinding.h"
#include "nsContentUtils.h"
#include "nsIFrame.h"

using namespace mozilla::gfx;

namespace mozilla::dom {

already_AddRefed<DOMSVGAnimatedTransformList>
SVGTransformableElement::Transform() {
  // We're creating a DOM wrapper, so we must tell GetAnimatedTransformList
  // to allocate the DOMSVGAnimatedTransformList if it hasn't already done so:
  return DOMSVGAnimatedTransformList::GetDOMWrapper(
      GetAnimatedTransformList(DO_ALLOCATE), this);
}

//----------------------------------------------------------------------
// nsIContent methods

bool SVGTransformableElement::IsAttributeMapped(
    const nsAtom* aAttribute) const {
  return aAttribute == nsGkAtoms::transform ||
         SVGElement::IsAttributeMapped(aAttribute);
}

bool SVGTransformableElement::IsEventAttributeNameInternal(nsAtom* aName) {
  return nsContentUtils::IsEventAttributeName(aName, EventNameType_SVGGraphic);
}

//----------------------------------------------------------------------
// SVGElement overrides

const gfx::Matrix* SVGTransformableElement::GetAnimateMotionTransform() const {
  return mAnimateMotionTransform.get();
}

void SVGTransformableElement::SetAnimateMotionTransform(
    const gfx::Matrix* aMatrix) {
  if ((!aMatrix && !mAnimateMotionTransform) ||
      (aMatrix && mAnimateMotionTransform &&
       aMatrix->FuzzyEquals(*mAnimateMotionTransform))) {
    return;
  }
  bool transformSet = mTransforms && mTransforms->IsExplicitlySet();
  bool prevSet = mAnimateMotionTransform || transformSet;
  mAnimateMotionTransform =
      aMatrix ? MakeUnique<gfx::Matrix>(*aMatrix) : nullptr;
  bool nowSet = mAnimateMotionTransform || transformSet;
  int32_t modType;
  if (prevSet && !nowSet) {
    modType = MutationEvent_Binding::REMOVAL;
  } else if (!prevSet && nowSet) {
    modType = MutationEvent_Binding::ADDITION;
  } else {
    modType = MutationEvent_Binding::MODIFICATION;
  }
  DidAnimateTransformList(modType);
  nsIFrame* frame = GetPrimaryFrame();
  if (frame) {
    // If the result of this transform and any other transforms on this frame
    // is the identity matrix, then DoApplyRenderingChangeToTree won't handle
    // our nsChangeHint_UpdateTransformLayer hint since aFrame->IsTransformed()
    // will return false. That's fine, but we still need to schedule a repaint,
    // and that won't otherwise happen. Since it's cheap to call SchedulePaint,
    // we don't bother to check IsTransformed().
    frame->SchedulePaint();
  }
}

SVGAnimatedTransformList* SVGTransformableElement::GetAnimatedTransformList(
    uint32_t aFlags) {
  if (!mTransforms && (aFlags & DO_ALLOCATE)) {
    mTransforms = MakeUnique<SVGAnimatedTransformList>();
  }
  return mTransforms.get();
}

}  // namespace mozilla::dom

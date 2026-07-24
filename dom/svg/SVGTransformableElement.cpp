/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGTransformableElement.h"

#include "DOMSVGAnimatedTransformList.h"
#include "nsContentUtils.h"
#include "nsIFrame.h"

using namespace mozilla::gfx;

namespace mozilla::dom {

already_AddRefed<DOMSVGAnimatedTransformList>
SVGTransformableElement::Transform() {
  return DOMSVGAnimatedTransformList::GetDOMWrapper(
      GetOrCreateAnimatedTransformList(), this);
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

void SVGTransformableElement::SetAnimateMotionTransform(
    const gfx::Matrix* aMatrix) {
  if ((!aMatrix && !mAnimateMotionTransform) ||
      (aMatrix && mAnimateMotionTransform &&
       aMatrix->FuzzyEquals(*mAnimateMotionTransform))) {
    return;
  }
  mAnimateMotionTransform =
      aMatrix ? std::make_unique<gfx::Matrix>(*aMatrix) : nullptr;
  DidAnimateTransformList();
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

SVGAnimatedTransformList*
SVGTransformableElement::GetOrCreateAnimatedTransformList() {
  if (!mTransforms) {
    mTransforms = std::make_unique<SVGAnimatedTransformList>();
  }
  return mTransforms.get();
}

}  // namespace mozilla::dom

/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/SVGTextPositioningElement.h"

#include "DOMSVGAnimatedLengthList.h"
#include "DOMSVGAnimatedNumberList.h"
#include "SVGAnimatedLengthList.h"
#include "SVGLength.h"

namespace mozilla::dom {

SVGElement::LengthListInfo SVGTextPositioningElement::sLengthListInfo[4] = {
    {nsGkAtoms::x, SVGLength::Axis::X, false},
    {nsGkAtoms::y, SVGLength::Axis::Y, false},
    {nsGkAtoms::dx, SVGLength::Axis::X, true},
    {nsGkAtoms::dy, SVGLength::Axis::Y, true}};

SVGElement::LengthListAttributesInfo
SVGTextPositioningElement::GetLengthListInfo() {
  return LengthListAttributesInfo(mLengthListAttributes, sLengthListInfo,
                                  std::size(sLengthListInfo));
}

SVGElement::NumberListInfo SVGTextPositioningElement::sNumberListInfo[1] = {
    {nsGkAtoms::rotate}};

SVGElement::NumberListAttributesInfo
SVGTextPositioningElement::GetNumberListInfo() {
  return NumberListAttributesInfo(mNumberListAttributes, sNumberListInfo,
                                  std::size(sNumberListInfo));
}

//----------------------------------------------------------------------

already_AddRefed<DOMSVGAnimatedLengthList> SVGTextPositioningElement::X() {
  return DOMSVGAnimatedLengthList::GetDOMWrapper(
      &mLengthListAttributes[ATTR_X], this, ATTR_X, SVGLength::Axis::X);
}

already_AddRefed<DOMSVGAnimatedLengthList> SVGTextPositioningElement::Y() {
  return DOMSVGAnimatedLengthList::GetDOMWrapper(
      &mLengthListAttributes[ATTR_Y], this, ATTR_Y, SVGLength::Axis::Y);
}

already_AddRefed<DOMSVGAnimatedLengthList> SVGTextPositioningElement::Dx() {
  return DOMSVGAnimatedLengthList::GetDOMWrapper(
      &mLengthListAttributes[ATTR_DX], this, ATTR_DX, SVGLength::Axis::X);
}

already_AddRefed<DOMSVGAnimatedLengthList> SVGTextPositioningElement::Dy() {
  return DOMSVGAnimatedLengthList::GetDOMWrapper(
      &mLengthListAttributes[ATTR_DY], this, ATTR_DY, SVGLength::Axis::Y);
}

already_AddRefed<DOMSVGAnimatedNumberList> SVGTextPositioningElement::Rotate() {
  return DOMSVGAnimatedNumberList::GetDOMWrapper(&mNumberListAttributes[ROTATE],
                                                 this, ROTATE);
}

}  // namespace mozilla::dom

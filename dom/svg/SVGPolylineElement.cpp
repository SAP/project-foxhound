/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/SVGPolylineElement.h"

#include "mozilla/dom/SVGAnimatedLength.h"
#include "mozilla/dom/SVGPolylineElementBinding.h"
#include "mozilla/gfx/2D.h"

using namespace mozilla::gfx;

NS_IMPL_NS_NEW_SVG_ELEMENT(Polyline)

namespace mozilla::dom {

JSObject* SVGPolylineElement::WrapNode(JSContext* aCx,
                                       JS::Handle<JSObject*> aGivenProto) {
  return SVGPolylineElement_Binding::Wrap(aCx, this, aGivenProto);
}

//----------------------------------------------------------------------
// Implementation

SVGPolylineElement::SVGPolylineElement(
    already_AddRefed<mozilla::dom::NodeInfo>&& aNodeInfo)
    : SVGPolylineElementBase(std::move(aNodeInfo)) {}

//----------------------------------------------------------------------
// nsINode methods

NS_IMPL_ELEMENT_CLONE_WITH_INIT(SVGPolylineElement)

//----------------------------------------------------------------------
// SVGGeometryElement methods

already_AddRefed<Path> SVGPolylineElement::BuildPath(PathBuilder* aBuilder) {
  const SVGPointList& points = mPoints.GetAnimValue();

  if (points.IsEmpty()) {
    return nullptr;
  }

  float zoom = UserSpaceMetrics::GetZoom(this);

  Point zoomedPoint = Point(points[0]) * zoom;
  if (!zoomedPoint.IsFinite()) {
    return nullptr;
  }
  aBuilder->MoveTo(zoomedPoint);
  for (uint32_t i = 1; i < points.Length(); ++i) {
    zoomedPoint = Point(points[i]) * zoom;
    if (!zoomedPoint.IsFinite()) {
      return nullptr;
    }
    aBuilder->LineTo(zoomedPoint);
  }

  return aBuilder->Finish();
}

}  // namespace mozilla::dom

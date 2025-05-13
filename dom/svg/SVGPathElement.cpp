/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/SVGPathElement.h"

#include <algorithm>

#include "SVGGeometryProperty.h"
#include "gfx2DGlue.h"
#include "gfxPlatform.h"
#include "nsGkAtoms.h"
#include "nsIFrame.h"
#include "nsStyleConsts.h"
#include "nsStyleStruct.h"
#include "nsWindowSizes.h"
#include "mozilla/dom/SVGPathElementBinding.h"
#include "mozilla/gfx/2D.h"
#include "mozilla/RefPtr.h"
#include "SVGPathSegUtils.h"
#include "mozilla/SVGContentUtils.h"

NS_IMPL_NS_NEW_SVG_ELEMENT(Path)

using namespace mozilla::gfx;

namespace mozilla::dom {

JSObject* SVGPathElement::WrapNode(JSContext* aCx,
                                   JS::Handle<JSObject*> aGivenProto) {
  return SVGPathElement_Binding::Wrap(aCx, this, aGivenProto);
}

//----------------------------------------------------------------------
// Implementation

SVGPathElement::SVGPathElement(
    already_AddRefed<mozilla::dom::NodeInfo>&& aNodeInfo)
    : SVGPathElementBase(std::move(aNodeInfo)) {}

//----------------------------------------------------------------------
// memory reporting methods

void SVGPathElement::AddSizeOfExcludingThis(nsWindowSizes& aSizes,
                                            size_t* aNodeSize) const {
  SVGPathElementBase::AddSizeOfExcludingThis(aSizes, aNodeSize);
  *aNodeSize += mD.SizeOfExcludingThis(aSizes.mState.mMallocSizeOf);
}

//----------------------------------------------------------------------
// nsINode methods

NS_IMPL_ELEMENT_CLONE_WITH_INIT(SVGPathElement)

//----------------------------------------------------------------------
// SVGElement methods

/* virtual */
bool SVGPathElement::HasValidDimensions() const {
  bool hasPath = false;
  auto callback = [&](const ComputedStyle* s) {
    const nsStyleSVGReset* styleSVGReset = s->StyleSVGReset();
    hasPath =
        styleSVGReset->mD.IsPath() && !styleSVGReset->mD.AsPath()._0.IsEmpty();
  };

  SVGGeometryProperty::DoForComputedStyle(this, callback);
  // If hasPath is false, we may disable the pref of d property, so we fallback
  // to check mD.
  return hasPath || !mD.GetAnimValue().IsEmpty();
}

//----------------------------------------------------------------------
// nsIContent methods

NS_IMETHODIMP_(bool)
SVGPathElement::IsAttributeMapped(const nsAtom* name) const {
  return name == nsGkAtoms::d || SVGPathElementBase::IsAttributeMapped(name);
}

already_AddRefed<Path> SVGPathElement::GetOrBuildPathForMeasuring() {
  RefPtr<Path> path;
  bool success = SVGGeometryProperty::DoForComputedStyle(
      this, [&path](const ComputedStyle* s) {
        const auto& d = s->StyleSVGReset()->mD;
        if (d.IsNone()) {
          return;
        }
        path = SVGPathData::BuildPathForMeasuring(d.AsPath()._0.AsSpan(),
                                                  s->EffectiveZoom().ToFloat());
      });
  return success ? path.forget()
                 : mD.GetAnimValue().BuildPathForMeasuring(1.0f);
}

//----------------------------------------------------------------------
// SVGGeometryElement methods

bool SVGPathElement::AttributeDefinesGeometry(const nsAtom* aName) {
  return aName == nsGkAtoms::d || aName == nsGkAtoms::pathLength;
}

bool SVGPathElement::IsMarkable() { return true; }

void SVGPathElement::GetMarkPoints(nsTArray<SVGMark>* aMarks) {
  auto callback = [aMarks](const ComputedStyle* s) {
    const nsStyleSVGReset* styleSVGReset = s->StyleSVGReset();
    if (styleSVGReset->mD.IsPath()) {
      Span<const StylePathCommand> path =
          styleSVGReset->mD.AsPath()._0.AsSpan();
      SVGPathData::GetMarkerPositioningData(path, s->EffectiveZoom().ToFloat(),
                                            aMarks);
    }
  };

  if (SVGGeometryProperty::DoForComputedStyle(this, callback)) {
    return;
  }

  mD.GetAnimValue().GetMarkerPositioningData(1.0f, aMarks);
}

void SVGPathElement::GetAsSimplePath(SimplePath* aSimplePath) {
  aSimplePath->Reset();
  auto callback = [&](const ComputedStyle* s) {
    const nsStyleSVGReset* styleSVGReset = s->StyleSVGReset();
    if (styleSVGReset->mD.IsPath()) {
      auto pathData = styleSVGReset->mD.AsPath()._0.AsSpan();
      auto maybeRect = SVGPathToAxisAlignedRect(pathData);
      if (maybeRect.isSome()) {
        const Rect& r = *maybeRect;
        float zoom = s->EffectiveZoom().ToFloat();
        aSimplePath->SetRect(r.x * zoom, r.y * zoom, r.width * zoom,
                             r.height * zoom);
      }
    }
  };

  SVGGeometryProperty::DoForComputedStyle(this, callback);
}

already_AddRefed<Path> SVGPathElement::BuildPath(PathBuilder* aBuilder) {
  // The Moz2D PathBuilder that our SVGPathData will be using only cares about
  // the fill rule. However, in order to fulfill the requirements of the SVG
  // spec regarding zero length sub-paths when square line caps are in use,
  // SVGPathData needs to know our stroke-linecap style and, if "square", then
  // also our stroke width. See the comment for
  // ApproximateZeroLengthSubpathSquareCaps for more info.

  auto strokeLineCap = StyleStrokeLinecap::Butt;
  Float strokeWidth = 0;
  RefPtr<Path> path;

  auto callback = [&](const ComputedStyle* s) {
    const nsStyleSVG* styleSVG = s->StyleSVG();
    // Note: the path that we return may be used for hit-testing, and SVG
    // exposes hit-testing of strokes that are not actually painted. For that
    // reason we do not check for eStyleSVGPaintType_None or check the stroke
    // opacity here.
    if (styleSVG->mStrokeLinecap != StyleStrokeLinecap::Butt) {
      strokeLineCap = styleSVG->mStrokeLinecap;
      strokeWidth = SVGContentUtils::GetStrokeWidth(this, s, nullptr);
    }

    const auto& d = s->StyleSVGReset()->mD;
    if (d.IsPath()) {
      path = SVGPathData::BuildPath(d.AsPath()._0.AsSpan(), aBuilder,
                                    strokeLineCap, strokeWidth, {}, {},
                                    s->EffectiveZoom().ToFloat());
    }
  };

  bool success = SVGGeometryProperty::DoForComputedStyle(this, callback);
  if (success) {
    return path.forget();
  }

  // Fallback to use the d attribute if it exists.
  return mD.GetAnimValue().BuildPath(aBuilder, strokeLineCap, strokeWidth,
                                     1.0f);
}

bool SVGPathElement::GetDistancesFromOriginToEndsOfVisibleSegments(
    FallibleTArray<double>* aOutput) {
  bool ret = false;
  auto callback = [&ret, aOutput](const ComputedStyle* s) {
    const auto& d = s->StyleSVGReset()->mD;
    ret = d.IsNone() ||
          SVGPathData::GetDistancesFromOriginToEndsOfVisibleSegments(
              d.AsPath()._0.AsSpan(), aOutput);
  };

  if (SVGGeometryProperty::DoForComputedStyle(this, callback)) {
    return ret;
  }

  return mD.GetAnimValue().GetDistancesFromOriginToEndsOfVisibleSegments(
      aOutput);
}

static bool PathIsClosed(Span<const StylePathCommand> aPath) {
  return !aPath.IsEmpty() && aPath.rbegin()->IsClose();
}

// Offset paths (including references to SVG Paths) are closed loops only if the
// final command in the path list is a closepath command ("z" or "Z"), otherwise
// they are unclosed intervals.
// https://drafts.fxtf.org/motion/#path-distance
bool SVGPathElement::IsClosedLoop() const {
  bool isClosed = false;

  auto callback = [&](const ComputedStyle* s) {
    const nsStyleSVGReset* styleSVGReset = s->StyleSVGReset();
    if (styleSVGReset->mD.IsPath()) {
      isClosed = PathIsClosed(styleSVGReset->mD.AsPath()._0.AsSpan());
    }
  };

  if (SVGGeometryProperty::DoForComputedStyle(this, callback)) {
    return isClosed;
  }

  return PathIsClosed(mD.GetAnimValue().AsSpan());
}

/* static */
bool SVGPathElement::IsDPropertyChangedViaCSS(const ComputedStyle& aNewStyle,
                                              const ComputedStyle& aOldStyle) {
  return aNewStyle.StyleSVGReset()->mD != aOldStyle.StyleSVGReset()->mD;
}

}  // namespace mozilla::dom

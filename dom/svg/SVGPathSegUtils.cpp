/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGPathSegUtils.h"

#include "mozilla/ArrayUtils.h"        // MOZ_ARRAY_LENGTH
#include "mozilla/ServoStyleConsts.h"  // StylePathCommand
#include "gfx2DGlue.h"
#include "SVGPathDataParser.h"
#include "nsMathUtils.h"
#include "nsTextFormatter.h"

using namespace mozilla::gfx;

namespace mozilla {

static const float PATH_SEG_LENGTH_TOLERANCE = 0.0000001f;
static const uint32_t MAX_RECURSION = 10;

static float CalcDistanceBetweenPoints(const Point& aP1, const Point& aP2) {
  return NS_hypot(aP2.x - aP1.x, aP2.y - aP1.y);
}

static void SplitQuadraticBezier(const Point* aCurve, Point* aLeft,
                                 Point* aRight) {
  aLeft[0].x = aCurve[0].x;
  aLeft[0].y = aCurve[0].y;
  aRight[2].x = aCurve[2].x;
  aRight[2].y = aCurve[2].y;
  aLeft[1].x = (aCurve[0].x + aCurve[1].x) / 2;
  aLeft[1].y = (aCurve[0].y + aCurve[1].y) / 2;
  aRight[1].x = (aCurve[1].x + aCurve[2].x) / 2;
  aRight[1].y = (aCurve[1].y + aCurve[2].y) / 2;
  aLeft[2].x = aRight[0].x = (aLeft[1].x + aRight[1].x) / 2;
  aLeft[2].y = aRight[0].y = (aLeft[1].y + aRight[1].y) / 2;
}

static void SplitCubicBezier(const Point* aCurve, Point* aLeft, Point* aRight) {
  Point tmp;
  tmp.x = (aCurve[1].x + aCurve[2].x) / 4;
  tmp.y = (aCurve[1].y + aCurve[2].y) / 4;
  aLeft[0].x = aCurve[0].x;
  aLeft[0].y = aCurve[0].y;
  aRight[3].x = aCurve[3].x;
  aRight[3].y = aCurve[3].y;
  aLeft[1].x = (aCurve[0].x + aCurve[1].x) / 2;
  aLeft[1].y = (aCurve[0].y + aCurve[1].y) / 2;
  aRight[2].x = (aCurve[2].x + aCurve[3].x) / 2;
  aRight[2].y = (aCurve[2].y + aCurve[3].y) / 2;
  aLeft[2].x = aLeft[1].x / 2 + tmp.x;
  aLeft[2].y = aLeft[1].y / 2 + tmp.y;
  aRight[1].x = aRight[2].x / 2 + tmp.x;
  aRight[1].y = aRight[2].y / 2 + tmp.y;
  aLeft[3].x = aRight[0].x = (aLeft[2].x + aRight[1].x) / 2;
  aLeft[3].y = aRight[0].y = (aLeft[2].y + aRight[1].y) / 2;
}

static float CalcBezLengthHelper(const Point* aCurve, uint32_t aNumPts,
                                 uint32_t aRecursionCount,
                                 void (*aSplit)(const Point*, Point*, Point*)) {
  Point left[4];
  Point right[4];
  float length = 0, dist;
  for (uint32_t i = 0; i < aNumPts - 1; i++) {
    length += CalcDistanceBetweenPoints(aCurve[i], aCurve[i + 1]);
  }
  dist = CalcDistanceBetweenPoints(aCurve[0], aCurve[aNumPts - 1]);
  if (length - dist > PATH_SEG_LENGTH_TOLERANCE &&
      aRecursionCount < MAX_RECURSION) {
    aSplit(aCurve, left, right);
    ++aRecursionCount;
    return CalcBezLengthHelper(left, aNumPts, aRecursionCount, aSplit) +
           CalcBezLengthHelper(right, aNumPts, aRecursionCount, aSplit);
  }
  return length;
}

static inline float CalcLengthOfCubicBezier(const Point& aPos,
                                            const Point& aCP1,
                                            const Point& aCP2,
                                            const Point& aTo) {
  Point curve[4] = {aPos, aCP1, aCP2, aTo};
  return CalcBezLengthHelper(curve, 4, 0, SplitCubicBezier);
}

static inline float CalcLengthOfQuadraticBezier(const Point& aPos,
                                                const Point& aCP,
                                                const Point& aTo) {
  Point curve[3] = {aPos, aCP, aTo};
  return CalcBezLengthHelper(curve, 3, 0, SplitQuadraticBezier);
}

// Basically, this is just a variant version of the above TraverseXXX functions.
// We just put those function inside this and use StylePathCommand instead.
// This function and the above ones should be dropped by Bug 1388931.
/* static */
void SVGPathSegUtils::TraversePathSegment(const StylePathCommand& aCommand,
                                          SVGPathTraversalState& aState) {
  switch (aCommand.tag) {
    case StylePathCommand::Tag::Close:
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        aState.length += CalcDistanceBetweenPoints(aState.pos, aState.start);
        aState.cp1 = aState.cp2 = aState.start;
      }
      aState.pos = aState.start;
      break;
    case StylePathCommand::Tag::Move: {
      const Point& p = aCommand.move.point.ToGfxPoint();
      aState.start = aState.pos =
          aCommand.move.by_to == StyleByTo::To ? p : aState.pos + p;
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        // aState.length is unchanged, since move commands don't affect path=
        // length.
        aState.cp1 = aState.cp2 = aState.start;
      }
      break;
    }
    case StylePathCommand::Tag::Line: {
      Point to = aCommand.line.by_to == StyleByTo::To
                     ? aCommand.line.point.ToGfxPoint()
                     : aState.pos + aCommand.line.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        aState.length += CalcDistanceBetweenPoints(aState.pos, to);
        aState.cp1 = aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::CubicCurve: {
      const bool isRelative = aCommand.cubic_curve.by_to == StyleByTo::By;
      Point to = isRelative
                     ? aState.pos + aCommand.cubic_curve.point.ToGfxPoint()
                     : aCommand.cubic_curve.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        Point cp1 = aCommand.cubic_curve.control1.ToGfxPoint();
        Point cp2 = aCommand.cubic_curve.control2.ToGfxPoint();
        if (isRelative) {
          cp1 += aState.pos;
          cp2 += aState.pos;
        }
        aState.length +=
            (float)CalcLengthOfCubicBezier(aState.pos, cp1, cp2, to);
        aState.cp2 = cp2;
        aState.cp1 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::QuadCurve: {
      const bool isRelative = aCommand.quad_curve.by_to == StyleByTo::By;
      Point to = isRelative
                     ? aState.pos + aCommand.quad_curve.point.ToGfxPoint()
                     : aCommand.quad_curve.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        Point cp = isRelative
                       ? aState.pos + aCommand.quad_curve.control1.ToGfxPoint()
                       : aCommand.quad_curve.control1.ToGfxPoint();
        aState.length += (float)CalcLengthOfQuadraticBezier(aState.pos, cp, to);
        aState.cp1 = cp;
        aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::Arc: {
      const auto& arc = aCommand.arc;
      Point to = arc.by_to == StyleByTo::To
                     ? arc.point.ToGfxPoint()
                     : aState.pos + arc.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        float dist = 0;
        Point radii = arc.radii.ToGfxPoint();
        if (radii.x == 0.0f || radii.y == 0.0f) {
          dist = CalcDistanceBetweenPoints(aState.pos, to);
        } else {
          Point bez[4] = {aState.pos, Point(0, 0), Point(0, 0), Point(0, 0)};
          const bool largeArcFlag = arc.arc_size == StyleArcSize::Large;
          const bool sweepFlag = arc.arc_sweep == StyleArcSweep::Cw;
          SVGArcConverter converter(aState.pos, to, radii, arc.rotate,
                                    largeArcFlag, sweepFlag);
          while (converter.GetNextSegment(&bez[1], &bez[2], &bez[3])) {
            dist += CalcBezLengthHelper(bez, 4, 0, SplitCubicBezier);
            bez[0] = bez[3];
          }
        }
        aState.length += dist;
        aState.cp1 = aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::HLine: {
      Point to(aCommand.h_line.by_to == StyleByTo::To
                   ? aCommand.h_line.x
                   : aState.pos.x + aCommand.h_line.x,
               aState.pos.y);
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        aState.length += std::fabs(to.x - aState.pos.x);
        aState.cp1 = aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::VLine: {
      Point to(aState.pos.x, aCommand.v_line.by_to == StyleByTo::To
                                 ? aCommand.v_line.y
                                 : aState.pos.y + aCommand.v_line.y);
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        aState.length += std::fabs(to.y - aState.pos.y);
        aState.cp1 = aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::SmoothCubic: {
      const bool isRelative = aCommand.smooth_cubic.by_to == StyleByTo::By;
      Point to = isRelative
                     ? aState.pos + aCommand.smooth_cubic.point.ToGfxPoint()
                     : aCommand.smooth_cubic.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        Point cp1 = aState.pos - (aState.cp2 - aState.pos);
        Point cp2 = isRelative ? aState.pos +
                                     aCommand.smooth_cubic.control2.ToGfxPoint()
                               : aCommand.smooth_cubic.control2.ToGfxPoint();
        aState.length +=
            (float)CalcLengthOfCubicBezier(aState.pos, cp1, cp2, to);
        aState.cp2 = cp2;
        aState.cp1 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::SmoothQuad: {
      Point to = aCommand.smooth_quad.by_to == StyleByTo::To
                     ? aCommand.smooth_quad.point.ToGfxPoint()
                     : aState.pos + aCommand.smooth_quad.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        Point cp = aState.pos - (aState.cp1 - aState.pos);
        aState.length += (float)CalcLengthOfQuadraticBezier(aState.pos, cp, to);
        aState.cp1 = cp;
        aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
  }
}

// Possible directions of an edge that doesn't immediately disqualify the path
// as a rectangle.
enum class EdgeDir {
  LEFT,
  RIGHT,
  UP,
  DOWN,
  // NONE represents (almost) zero-length edges, they should be ignored.
  NONE,
};

Maybe<EdgeDir> GetDirection(Point v) {
  if (!std::isfinite(v.x.value) || !std::isfinite(v.y.value)) {
    return Nothing();
  }

  bool x = fabs(v.x) > 0.001;
  bool y = fabs(v.y) > 0.001;
  if (x && y) {
    return Nothing();
  }

  if (!x && !y) {
    return Some(EdgeDir::NONE);
  }

  if (x) {
    return Some(v.x > 0.0 ? EdgeDir::RIGHT : EdgeDir::LEFT);
  }

  return Some(v.y > 0.0 ? EdgeDir::DOWN : EdgeDir::UP);
}

EdgeDir OppositeDirection(EdgeDir dir) {
  switch (dir) {
    case EdgeDir::LEFT:
      return EdgeDir::RIGHT;
    case EdgeDir::RIGHT:
      return EdgeDir::LEFT;
    case EdgeDir::UP:
      return EdgeDir::DOWN;
    case EdgeDir::DOWN:
      return EdgeDir::UP;
    default:
      return EdgeDir::NONE;
  }
}

struct IsRectHelper {
  Point min;
  Point max;
  EdgeDir currentDir;
  // Index of the next corner.
  uint32_t idx;
  EdgeDir dirs[4];

  bool Edge(Point from, Point to) {
    auto edge = to - from;

    auto maybeDir = GetDirection(edge);
    if (maybeDir.isNothing()) {
      return false;
    }

    EdgeDir dir = maybeDir.value();

    if (dir == EdgeDir::NONE) {
      // zero-length edges aren't an issue.
      return true;
    }

    if (dir != currentDir) {
      // The edge forms a corner with the previous edge.
      if (idx >= 4) {
        // We are at the 5th corner, can't be a rectangle.
        return false;
      }

      if (dir == OppositeDirection(currentDir)) {
        // Can turn left or right but not a full 180 degrees.
        return false;
      }

      dirs[idx] = dir;
      idx += 1;
      currentDir = dir;
    }

    min.x = fmin(min.x, to.x);
    min.y = fmin(min.y, to.y);
    max.x = fmax(max.x, to.x);
    max.y = fmax(max.y, to.y);

    return true;
  }

  bool EndSubpath() {
    if (idx != 4) {
      return false;
    }

    if (dirs[0] != OppositeDirection(dirs[2]) ||
        dirs[1] != OppositeDirection(dirs[3])) {
      return false;
    }

    return true;
  }
};

bool ApproxEqual(gfx::Point a, gfx::Point b) {
  auto v = b - a;
  return fabs(v.x) < 0.001 && fabs(v.y) < 0.001;
}

Maybe<gfx::Rect> SVGPathToAxisAlignedRect(Span<const StylePathCommand> aPath) {
  Point pathStart(0.0, 0.0);
  Point segStart(0.0, 0.0);
  IsRectHelper helper = {
      Point(0.0, 0.0),
      Point(0.0, 0.0),
      EdgeDir::NONE,
      0,
      {EdgeDir::NONE, EdgeDir::NONE, EdgeDir::NONE, EdgeDir::NONE},
  };

  for (const StylePathCommand& cmd : aPath) {
    switch (cmd.tag) {
      case StylePathCommand::Tag::Move: {
        Point to = cmd.move.point.ToGfxPoint();
        if (helper.idx != 0) {
          // This is overly strict since empty moveto sequences such as "M 10 12
          // M 3 2 M 0 0" render nothing, but I expect it won't make us miss a
          // lot of rect-shaped paths in practice and lets us avoidhandling
          // special caps for empty sub-paths like "M 0 0 L 0 0" and "M 1 2 Z".
          return Nothing();
        }

        if (!ApproxEqual(pathStart, segStart)) {
          // If we were only interested in filling we could auto-close here
          // by calling helper.Edge like in the ClosePath case and detect some
          // unclosed paths as rectangles.
          //
          // For example:
          //  - "M 1 0 L 0 0 L 0 1 L 1 1 L 1 0" are both rects for filling and
          //  stroking.
          //  - "M 1 0 L 0 0 L 0 1 L 1 1" fills a rect but the stroke is shaped
          //  like a C.
          return Nothing();
        }

        if (helper.idx != 0 && !helper.EndSubpath()) {
          return Nothing();
        }

        if (cmd.move.by_to == StyleByTo::By) {
          to = segStart + to;
        }

        pathStart = to;
        segStart = to;
        if (helper.idx == 0) {
          helper.min = to;
          helper.max = to;
        }

        break;
      }
      case StylePathCommand::Tag::Close: {
        if (!helper.Edge(segStart, pathStart)) {
          return Nothing();
        }
        if (!helper.EndSubpath()) {
          return Nothing();
        }
        pathStart = segStart;
        break;
      }
      case StylePathCommand::Tag::Line: {
        Point to = cmd.line.point.ToGfxPoint();
        if (cmd.line.by_to == StyleByTo::By) {
          to = segStart + to;
        }

        if (!helper.Edge(segStart, to)) {
          return Nothing();
        }
        segStart = to;
        break;
      }
      case StylePathCommand::Tag::HLine: {
        Point to = gfx::Point(cmd.h_line.x, segStart.y);
        if (cmd.h_line.by_to == StyleByTo::By) {
          to.x += segStart.x;
        }

        if (!helper.Edge(segStart, to)) {
          return Nothing();
        }
        segStart = to;
        break;
      }
      case StylePathCommand::Tag::VLine: {
        Point to = gfx::Point(segStart.x, cmd.v_line.y);
        if (cmd.h_line.by_to == StyleByTo::By) {
          to.y += segStart.y;
        }

        if (!helper.Edge(segStart, to)) {
          return Nothing();
        }
        segStart = to;
        break;
      }
      default:
        return Nothing();
    }
  }

  if (!ApproxEqual(pathStart, segStart)) {
    // Same situation as with moveto regarding stroking not fullly closed path
    // even though the fill is a rectangle.
    return Nothing();
  }

  if (!helper.EndSubpath()) {
    return Nothing();
  }

  auto size = (helper.max - helper.min);
  return Some(Rect(helper.min, Size(size.x, size.y)));
}

}  // namespace mozilla

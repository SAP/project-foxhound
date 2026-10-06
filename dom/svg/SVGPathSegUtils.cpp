/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGPathSegUtils.h"

#include "SVGArcConverter.h"
#include "gfx2DGlue.h"
#include "mozilla/ServoStyleConsts.h"  // StylePathCommand
#include "nsMathUtils.h"
#include "nsTextFormatter.h"

using namespace mozilla::gfx;

namespace mozilla {

static constexpr double PATH_SEG_LENGTH_TOLERANCE = 0.0000001;
static constexpr uint32_t MAX_RECURSION = 10;

static double CalcDistanceBetweenPoints(const Point& aP1, const Point& aP2) {
  return NS_hypot(aP2.x - aP1.x, aP2.y - aP1.y);
}

template <std::size_t N>
using PointArray = std::array<Point, N>;

using QuadraticBezierArray = PointArray<3>;

static void SplitQuadraticBezier(const QuadraticBezierArray& aCurve,
                                 QuadraticBezierArray& aLeft,
                                 QuadraticBezierArray& aRight) {
  aLeft[0] = aCurve[0];
  aRight[2] = aCurve[2];
  aLeft[1] = (aCurve[0] + aCurve[1]) / 2;
  aRight[1] = (aCurve[1] + aCurve[2]) / 2;
  aLeft[2] = aRight[0] = (aLeft[1] + aRight[1]) / 2;
}

using CubicBezierArray = PointArray<4>;

static void SplitCubicBezier(const CubicBezierArray& aCurve,
                             CubicBezierArray& aLeft,
                             CubicBezierArray& aRight) {
  const Point tmp = (aCurve[1] + aCurve[2]) / 4;
  aLeft[0] = aCurve[0];
  aRight[3] = aCurve[3];
  aLeft[1] = (aCurve[0] + aCurve[1]) / 2;
  aRight[2] = (aCurve[2] + aCurve[3]) / 2;
  aLeft[2] = aLeft[1] / 2 + tmp;
  aRight[1] = aRight[2] / 2 + tmp;
  aLeft[3] = aRight[0] = (aLeft[2] + aRight[1]) / 2;
}

template <std::size_t N>
static double CalcBezLengthHelper(
    PointArray<N>& aCurve, uint32_t aRecursionCount,
    void (*aSplit)(const PointArray<N>&, PointArray<N>&, PointArray<N>&)) {
  PointArray<N> left, right;
  double length = 0.0;
  for (size_t i = 0; i < N - 1; i++) {
    length += CalcDistanceBetweenPoints(aCurve[i], aCurve[i + 1]);
  }
  double dist = CalcDistanceBetweenPoints(aCurve[0], aCurve[N - 1]);
  if (length - dist > PATH_SEG_LENGTH_TOLERANCE &&
      aRecursionCount < MAX_RECURSION) {
    aSplit(aCurve, left, right);
    ++aRecursionCount;
    return CalcBezLengthHelper(left, aRecursionCount, aSplit) +
           CalcBezLengthHelper(right, aRecursionCount, aSplit);
  }
  return length;
}

static inline double CalcLengthOfCubicBezier(const Point& aPos,
                                             const Point& aCP1,
                                             const Point& aCP2,
                                             const Point& aTo) {
  CubicBezierArray curve = {aPos, aCP1, aCP2, aTo};
  return CalcBezLengthHelper(curve, 0, SplitCubicBezier);
}

static inline double CalcLengthOfQuadraticBezier(const Point& aPos,
                                                 const Point& aCP,
                                                 const Point& aTo) {
  QuadraticBezierArray curve = {aPos, aCP, aTo};
  return CalcBezLengthHelper(curve, 0, SplitQuadraticBezier);
}

/* static */
void SVGPathSegUtils::TraversePathSegment(const StylePathCommand& aCommand,
                                          SVGPathTraversalState& aState) {
  switch (aCommand.tag) {
    case StylePathCommand::Tag::Close:
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        aState.length +=
            (float)CalcDistanceBetweenPoints(aState.pos, aState.start);
        aState.cp1 = aState.cp2 = aState.start;
      }
      aState.pos = aState.start;
      break;
    case StylePathCommand::Tag::Move: {
      const Point& p = aCommand.move.point.ToGfxPoint();
      aState.start = aState.pos =
          aCommand.move.point.IsToPosition() ? p : aState.pos + p;
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        // aState.length is unchanged, since move commands don't affect path=
        // length.
        aState.cp1 = aState.cp2 = aState.start;
      }
      break;
    }
    case StylePathCommand::Tag::Line: {
      Point to = aCommand.line.point.IsToPosition()
                     ? aCommand.line.point.ToGfxPoint()
                     : aState.pos + aCommand.line.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        aState.length += (float)CalcDistanceBetweenPoints(aState.pos, to);
        aState.cp1 = aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::CubicCurve: {
      Point to = aCommand.cubic_curve.point.IsByCoordinate()
                     ? aState.pos + aCommand.cubic_curve.point.ToGfxPoint()
                     : aCommand.cubic_curve.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        Point cp1 = aCommand.cubic_curve.control1.ToGfxPoint(aState.pos, to);
        Point cp2 = aCommand.cubic_curve.control2.ToGfxPoint(aState.pos, to);
        aState.length +=
            (float)CalcLengthOfCubicBezier(aState.pos, cp1, cp2, to);
        aState.cp2 = cp2;
        aState.cp1 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::QuadCurve: {
      Point to = aCommand.quad_curve.point.IsByCoordinate()
                     ? aState.pos + aCommand.quad_curve.point.ToGfxPoint()
                     : aCommand.quad_curve.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        Point cp = aCommand.quad_curve.control1.ToGfxPoint(aState.pos, to);
        aState.length += (float)CalcLengthOfQuadraticBezier(aState.pos, cp, to);
        aState.cp1 = cp;
        aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::Arc: {
      const auto& arc = aCommand.arc;
      Point to = arc.point.IsToPosition() ? arc.point.ToGfxPoint()
                                          : aState.pos + arc.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        float dist = 0.0f;
        Point radii = arc.radii.ToGfxPoint();
        if (radii.x == 0.0f || radii.y == 0.0f) {
          dist = CalcDistanceBetweenPoints(aState.pos, to);
        } else {
          CubicBezierArray bez = {aState.pos, Point(), Point(), Point()};
          const bool largeArcFlag = arc.arc_size == StyleArcSize::Large;
          const bool sweepFlag = arc.arc_sweep == StyleArcSweep::Cw;
          SVGArcConverter converter(aState.pos, to, radii, arc.rotate,
                                    largeArcFlag, sweepFlag);
          while (converter.GetNextSegment(&bez[1], &bez[2], &bez[3])) {
            dist += (float)CalcBezLengthHelper(bez, 0, SplitCubicBezier);
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
      const auto x = aCommand.h_line.x.ToGfxCoord();
      Point to(aCommand.h_line.x.IsToPosition() ? x : aState.pos.x + x,
               aState.pos.y);
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        aState.length += std::abs(to.x - aState.pos.x);
        aState.cp1 = aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::VLine: {
      const auto y = aCommand.v_line.y.ToGfxCoord();
      Point to(aState.pos.x,
               aCommand.v_line.y.IsToPosition() ? y : aState.pos.y + y);
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        aState.length += std::abs(to.y - aState.pos.y);
        aState.cp1 = aState.cp2 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::SmoothCubic: {
      Point to = aCommand.smooth_cubic.point.IsByCoordinate()
                     ? aState.pos + aCommand.smooth_cubic.point.ToGfxPoint()
                     : aCommand.smooth_cubic.point.ToGfxPoint();
      if (aState.ShouldUpdateLengthAndControlPoints()) {
        Point cp1 = aState.pos - (aState.cp2 - aState.pos);
        Point cp2 = aCommand.smooth_cubic.control2.ToGfxPoint(aState.pos, to);
        aState.length +=
            (float)CalcLengthOfCubicBezier(aState.pos, cp1, cp2, to);
        aState.cp2 = cp2;
        aState.cp1 = to;
      }
      aState.pos = to;
      break;
    }
    case StylePathCommand::Tag::SmoothQuad: {
      Point to = aCommand.smooth_quad.point.IsToPosition()
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

static Maybe<EdgeDir> GetDirection(const Point& v) {
  if (!v.IsFinite()) {
    return Nothing();
  }

  // We may be dealing with very small rects scaled up so make
  // adjust the threshold based on the magnitude of the sides.
  float threshold = std::min((std::abs(v.x) + std::abs(v.y)) * 0.00001, 0.001);

  bool x = std::abs(v.x) > threshold;
  bool y = std::abs(v.y) > threshold;
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

static EdgeDir OppositeDirection(EdgeDir dir) {
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
  EdgeDir currentDir = EdgeDir::NONE;
  // Index of the next corner.
  uint32_t idx = 0;
  std::array<EdgeDir, 4> dirs;

  IsRectHelper() { dirs.fill(EdgeDir::NONE); }

  bool Edge(const Point& from, const Point& to) {
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
      if (idx >= dirs.size()) {
        // We are at the 5th corner, can't be a rectangle.
        return false;
      }

      if (dir == OppositeDirection(currentDir)) {
        // Can turn left or right but not a full 180 degrees.
        return false;
      }

      dirs[idx++] = dir;
      currentDir = dir;
    }

    min.x = std::min(min.x, to.x);
    min.y = std::min(min.y, to.y);
    max.x = std::max(max.x, to.x);
    max.y = std::max(max.y, to.y);

    return true;
  }

  bool EndSubpath() const {
    if (idx != dirs.size()) {
      return false;
    }

    if (dirs[0] != OppositeDirection(dirs[2]) ||
        dirs[1] != OppositeDirection(dirs[3])) {
      return false;
    }

    return true;
  }
};

Maybe<gfx::Rect> SVGPathSegUtils::SVGPathToAxisAlignedRect(
    Span<const StylePathCommand> aPath) {
  Point pathStart;
  Point segStart;
  IsRectHelper helper;
  static constexpr float kEpsilon = 0.001f;

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

        if (!pathStart.WithinEpsilonOf(segStart, kEpsilon)) {
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

        if (cmd.move.point.IsByCoordinate()) {
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
        if (cmd.line.point.IsByCoordinate()) {
          to = segStart + to;
        }

        if (!helper.Edge(segStart, to)) {
          return Nothing();
        }
        segStart = to;
        break;
      }
      case StylePathCommand::Tag::HLine: {
        Point to = gfx::Point(cmd.h_line.x.ToGfxCoord(), segStart.y);
        if (cmd.h_line.x.IsByCoordinate()) {
          to.x += segStart.x;
        }

        if (!helper.Edge(segStart, to)) {
          return Nothing();
        }
        segStart = to;
        break;
      }
      case StylePathCommand::Tag::VLine: {
        Point to = gfx::Point(segStart.x, cmd.v_line.y.ToGfxCoord());
        if (cmd.v_line.y.IsByCoordinate()) {
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

  if (!pathStart.WithinEpsilonOf(segStart, kEpsilon)) {
    // Same situation as with moveto regarding stroking not fully closed path
    // even though the fill is a rectangle.
    return Nothing();
  }

  if (!helper.EndSubpath()) {
    return Nothing();
  }

  auto size = helper.max - helper.min;
  return Some(Rect(helper.min, Size(size.x, size.y)));
}

}  // namespace mozilla

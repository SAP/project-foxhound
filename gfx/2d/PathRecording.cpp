/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PathRecording.h"
#include "DrawEventRecorder.h"
#include "RecordedEventImpl.h"

namespace mozilla {
namespace gfx {

inline Maybe<float> PathOps::ArcParams::GetRadius() const {
  // Do a quick check for a uniform scale and/or translation transform. In the
  // worst case scenario, failing just causes a fallback to ArcToBezier.
  if (transform._11 == transform._22 && transform._12 == 0.0f &&
      transform._21 == 0.0f && transform._11 > 0.0f) {
    return Some(transform._11);
  }
  return Nothing();
}

inline void PathOps::ArcParams::ToSink(PathSink& aPathSink,
                                       bool aAntiClockwise) const {
  if (Maybe<float> radius = GetRadius()) {
    aPathSink.Arc(GetOrigin(), *radius, startAngle, endAngle, aAntiClockwise);
  } else {
    ArcToBezier(&aPathSink, Point(), Size(1.0f, 1.0f), startAngle, endAngle,
                aAntiClockwise, 0.0f, transform);
  }
}

#define NEXT_PARAMS(_type)                                        \
  const _type params = *reinterpret_cast<const _type*>(nextByte); \
  nextByte += sizeof(_type);

bool PathOps::StreamToSink(PathSink& aPathSink) const {
  if (mPathData.empty()) {
    return true;
  }

  const uint8_t* nextByte = mPathData.data();
  const uint8_t* end = nextByte + mPathData.size();
  while (nextByte < end) {
    const OpType opType = *reinterpret_cast<const OpType*>(nextByte);
    nextByte += sizeof(OpType);
    switch (opType) {
      case OpType::OP_MOVETO: {
        NEXT_PARAMS(Point)
        aPathSink.MoveTo(params);
        break;
      }
      case OpType::OP_LINETO: {
        NEXT_PARAMS(Point)
        aPathSink.LineTo(params);
        break;
      }
      case OpType::OP_BEZIERTO: {
        NEXT_PARAMS(ThreePoints)
        aPathSink.BezierTo(params.p1, params.p2, params.p3);
        break;
      }
      case OpType::OP_QUADRATICBEZIERTO: {
        NEXT_PARAMS(TwoPoints)
        aPathSink.QuadraticBezierTo(params.p1, params.p2);
        break;
      }
      case OpType::OP_ARC_CW:
      case OpType::OP_ARC_CCW: {
        NEXT_PARAMS(ArcParams)
        params.ToSink(aPathSink, opType == OpType::OP_ARC_CCW);
        break;
      }
      case OpType::OP_CLOSE:
        aPathSink.Close();
        break;
      default:
        return false;
    }
  }

  return true;
}

#define CHECKED_NEXT_PARAMS(_type)      \
  if (nextByte + sizeof(_type) > end) { \
    return false;                       \
  }                                     \
  NEXT_PARAMS(_type)

bool PathOps::CheckedStreamToSink(PathSink& aPathSink) const {
  if (mPathData.empty()) {
    return true;
  }

  const uint8_t* nextByte = mPathData.data();
  const uint8_t* end = nextByte + mPathData.size();
  while (true) {
    if (nextByte == end) {
      break;
    }

    if (nextByte + sizeof(OpType) > end) {
      return false;
    }

    const OpType opType = *reinterpret_cast<const OpType*>(nextByte);
    nextByte += sizeof(OpType);
    switch (opType) {
      case OpType::OP_MOVETO: {
        CHECKED_NEXT_PARAMS(Point)
        aPathSink.MoveTo(params);
        break;
      }
      case OpType::OP_LINETO: {
        CHECKED_NEXT_PARAMS(Point)
        aPathSink.LineTo(params);
        break;
      }
      case OpType::OP_BEZIERTO: {
        CHECKED_NEXT_PARAMS(ThreePoints)
        aPathSink.BezierTo(params.p1, params.p2, params.p3);
        break;
      }
      case OpType::OP_QUADRATICBEZIERTO: {
        CHECKED_NEXT_PARAMS(TwoPoints)
        aPathSink.QuadraticBezierTo(params.p1, params.p2);
        break;
      }
      case OpType::OP_ARC_CW:
      case OpType::OP_ARC_CCW: {
        CHECKED_NEXT_PARAMS(ArcParams)
        params.ToSink(aPathSink, opType == OpType::OP_ARC_CCW);
        break;
      }
      case OpType::OP_CLOSE:
        aPathSink.Close();
        break;
      default:
        return false;
    }
  }

  return true;
}
#undef CHECKED_NEXT_PARAMS

PathOps PathOps::TransformedCopy(const Matrix& aTransform) const {
  PathOps newPathOps;
  newPathOps.mPathData.reserve(mPathData.size());
  const uint8_t* nextByte = mPathData.data();
  const uint8_t* end = nextByte + mPathData.size();
  while (nextByte < end) {
    const OpType opType = *reinterpret_cast<const OpType*>(nextByte);
    nextByte += sizeof(OpType);
    switch (opType) {
      case OpType::OP_MOVETO: {
        NEXT_PARAMS(Point)
        newPathOps.MoveTo(aTransform.TransformPoint(params));
        break;
      }
      case OpType::OP_LINETO: {
        NEXT_PARAMS(Point)
        newPathOps.LineTo(aTransform.TransformPoint(params));
        break;
      }
      case OpType::OP_BEZIERTO: {
        NEXT_PARAMS(ThreePoints)
        newPathOps.BezierTo(aTransform.TransformPoint(params.p1),
                            aTransform.TransformPoint(params.p2),
                            aTransform.TransformPoint(params.p3));
        break;
      }
      case OpType::OP_QUADRATICBEZIERTO: {
        NEXT_PARAMS(TwoPoints)
        newPathOps.QuadraticBezierTo(aTransform.TransformPoint(params.p1),
                                     aTransform.TransformPoint(params.p2));
        break;
      }
      case OpType::OP_ARC_CW:
      case OpType::OP_ARC_CCW: {
        NEXT_PARAMS(ArcParams)
        newPathOps.Arc(params.transform * aTransform, params.startAngle,
                       params.endAngle, opType == OpType::OP_ARC_CCW);
        break;
      }
      case OpType::OP_CLOSE:
        newPathOps.Close();
        break;
      default:
        MOZ_CRASH("We control mOpTypes, so this should never happen.");
    }
  }

  return newPathOps;
}

#define MODIFY_NEXT_PARAMS(_type)                      \
  _type& params = *reinterpret_cast<_type*>(nextByte); \
  nextByte += sizeof(_type);

void PathOps::TransformInPlace(const Matrix& aTransform) {
  uint8_t* nextByte = mPathData.data();
  uint8_t* end = nextByte + mPathData.size();
  while (nextByte < end) {
    const OpType opType = *reinterpret_cast<const OpType*>(nextByte);
    nextByte += sizeof(OpType);
    switch (opType) {
      case OpType::OP_MOVETO: {
        MODIFY_NEXT_PARAMS(Point)
        params = aTransform.TransformPoint(params);
        break;
      }
      case OpType::OP_LINETO: {
        MODIFY_NEXT_PARAMS(Point)
        params = aTransform.TransformPoint(params);
        break;
      }
      case OpType::OP_BEZIERTO: {
        MODIFY_NEXT_PARAMS(ThreePoints)
        params.p1 = aTransform.TransformPoint(params.p1);
        params.p2 = aTransform.TransformPoint(params.p2);
        params.p3 = aTransform.TransformPoint(params.p3);
        break;
      }
      case OpType::OP_QUADRATICBEZIERTO: {
        MODIFY_NEXT_PARAMS(TwoPoints)
        params.p1 = aTransform.TransformPoint(params.p1);
        params.p2 = aTransform.TransformPoint(params.p2);
        break;
      }
      case OpType::OP_ARC_CW:
      case OpType::OP_ARC_CCW: {
        MODIFY_NEXT_PARAMS(ArcParams)
        params.transform *= aTransform;
        break;
      }
      case OpType::OP_CLOSE:
        break;
      default:
        MOZ_CRASH("We control mOpTypes, so this should never happen.");
    }
  }
}

Maybe<Circle> PathOps::AsCircle() const {
  if (mPathData.empty()) {
    return Nothing();
  }

  const uint8_t* nextByte = mPathData.data();
  const uint8_t* end = nextByte + mPathData.size();
  const OpType opType = *reinterpret_cast<const OpType*>(nextByte);
  nextByte += sizeof(OpType);
  if (opType == OpType::OP_ARC_CW || opType == OpType::OP_ARC_CCW) {
    NEXT_PARAMS(ArcParams)
    if (fabs(fabs(params.startAngle - params.endAngle) - 2 * M_PI) < 1e-6) {
      if (Maybe<float> radius = params.GetRadius()) {
        // we have a full circle
        if (nextByte < end) {
          const OpType nextOpType = *reinterpret_cast<const OpType*>(nextByte);
          nextByte += sizeof(OpType);
          if (nextOpType == OpType::OP_CLOSE) {
            if (nextByte == end) {
              return Some(Circle{params.GetOrigin(), *radius, true});
            }
          }
        } else {
          // the circle wasn't closed
          return Some(Circle{params.GetOrigin(), *radius, false});
        }
      }
    }
  }

  return Nothing();
}

Maybe<Line> PathOps::AsLine() const {
  if (mPathData.empty()) {
    return Nothing();
  }

  Line retval;

  const uint8_t* nextByte = mPathData.data();
  const uint8_t* end = nextByte + mPathData.size();
  OpType opType = *reinterpret_cast<const OpType*>(nextByte);
  nextByte += sizeof(OpType);

  if (opType == OpType::OP_MOVETO) {
    MOZ_ASSERT(nextByte != end);

    NEXT_PARAMS(Point)
    retval.origin = params;
  } else {
    return Nothing();
  }

  if (nextByte >= end) {
    return Nothing();
  }

  opType = *reinterpret_cast<const OpType*>(nextByte);
  nextByte += sizeof(OpType);

  if (opType == OpType::OP_LINETO) {
    MOZ_ASSERT(nextByte != end);

    NEXT_PARAMS(Point)

    if (nextByte == end) {
      retval.destination = params;
      return Some(retval);
    }
  }

  return Nothing();
}
#undef NEXT_PARAMS

size_t PathOps::NumberOfOps() const {
  size_t size = 0;
  const uint8_t* nextByte = mPathData.data();
  const uint8_t* end = nextByte + mPathData.size();
  while (nextByte < end) {
    size++;
    const OpType opType = *reinterpret_cast<const OpType*>(nextByte);
    nextByte += sizeof(OpType);
    switch (opType) {
      case OpType::OP_MOVETO:
        nextByte += sizeof(Point);
        break;
      case OpType::OP_LINETO:
        nextByte += sizeof(Point);
        break;
      case OpType::OP_BEZIERTO:
        nextByte += sizeof(ThreePoints);
        break;
      case OpType::OP_QUADRATICBEZIERTO:
        nextByte += sizeof(TwoPoints);
        break;
      case OpType::OP_ARC_CW:
      case OpType::OP_ARC_CCW:
        nextByte += sizeof(ArcParams);
        break;
      case OpType::OP_CLOSE:
        break;
      default:
        MOZ_CRASH("We control mOpTypes, so this should never happen.");
    }
  }

  return size;
}

bool PathOps::IsEmpty() const {
  const uint8_t* nextByte = mPathData.data();
  const uint8_t* end = nextByte + mPathData.size();
  while (nextByte < end) {
    const OpType opType = *reinterpret_cast<const OpType*>(nextByte);
    nextByte += sizeof(OpType);
    switch (opType) {
      case OpType::OP_MOVETO:
        nextByte += sizeof(Point);
        break;
      case OpType::OP_CLOSE:
        break;
      default:
        return false;
    }
  }
  return true;
}

void PathBuilderRecording::MoveTo(const Point& aPoint) {
  mPathOps.MoveTo(aPoint);
  mBeginPoint = aPoint;
  mCurrentPoint = aPoint;
}

void PathBuilderRecording::LineTo(const Point& aPoint) {
  mPathOps.LineTo(aPoint);
  mCurrentPoint = aPoint;
}

void PathBuilderRecording::BezierTo(const Point& aCP1, const Point& aCP2,
                                    const Point& aCP3) {
  mPathOps.BezierTo(aCP1, aCP2, aCP3);
  mCurrentPoint = aCP3;
}

void PathBuilderRecording::QuadraticBezierTo(const Point& aCP1,
                                             const Point& aCP2) {
  mPathOps.QuadraticBezierTo(aCP1, aCP2);
  mCurrentPoint = aCP2;
}

void PathBuilderRecording::Close() {
  mPathOps.Close();
  mCurrentPoint = mBeginPoint;
}

void PathBuilderRecording::Arc(const Point& aOrigin, float aRadius,
                               float aStartAngle, float aEndAngle,
                               bool aAntiClockwise) {
  mPathOps.Arc(aOrigin, aRadius, aStartAngle, aEndAngle, aAntiClockwise);

  mCurrentPoint = aOrigin + Point(cosf(aEndAngle), sinf(aEndAngle)) * aRadius;
}

already_AddRefed<Path> PathBuilderRecording::Finish() {
  return MakeAndAddRef<PathRecording>(mBackendType, std::move(mPathOps),
                                      mFillRule, mCurrentPoint, mBeginPoint);
}

PathRecording::PathRecording(BackendType aBackend, PathOps&& aOps,
                             FillRule aFillRule, const Point& aCurrentPoint,
                             const Point& aBeginPoint)
    : mBackendType(aBackend),
      mPathOps(std::move(aOps)),
      mFillRule(aFillRule),
      mCurrentPoint(aCurrentPoint),
      mBeginPoint(aBeginPoint) {}

PathRecording::~PathRecording() {
  for (size_t i = 0; i < mStoredRecorders.size(); i++) {
    mStoredRecorders[i]->RemoveStoredObject(this);
    mStoredRecorders[i]->RecordEvent(RecordedPathDestruction(this));
  }
}

void PathRecording::EnsurePath() const {
  if (mPath) {
    return;
  }
  if (RefPtr<PathBuilder> pathBuilder =
          Factory::CreatePathBuilder(mBackendType, mFillRule)) {
    if (!mPathOps.StreamToSink(*pathBuilder)) {
      MOZ_ASSERT(false, "Failed to stream PathOps to PathBuilder");
    } else {
      mPath = pathBuilder->Finish();
      MOZ_ASSERT(!!mPath, "Failed finishing Path from PathBuilder");
    }
  } else {
    MOZ_ASSERT(false, "Failed to create PathBuilder for PathRecording");
  }
}

already_AddRefed<PathBuilder> PathRecording::CopyToBuilder(
    FillRule aFillRule) const {
  RefPtr<PathBuilderRecording> recording =
      new PathBuilderRecording(mBackendType, PathOps(mPathOps), aFillRule);
  recording->SetCurrentPoint(mCurrentPoint);
  recording->SetBeginPoint(mBeginPoint);
  return recording.forget();
}

already_AddRefed<PathBuilder> PathRecording::TransformedCopyToBuilder(
    const Matrix& aTransform, FillRule aFillRule) const {
  RefPtr<PathBuilderRecording> recording = new PathBuilderRecording(
      mBackendType, mPathOps.TransformedCopy(aTransform), aFillRule);
  recording->SetCurrentPoint(aTransform.TransformPoint(mCurrentPoint));
  recording->SetBeginPoint(aTransform.TransformPoint(mBeginPoint));
  return recording.forget();
}

already_AddRefed<PathBuilder> PathRecording::MoveToBuilder(FillRule aFillRule) {
  RefPtr<PathBuilderRecording> recording =
      new PathBuilderRecording(mBackendType, std::move(mPathOps), aFillRule);
  recording->SetCurrentPoint(mCurrentPoint);
  recording->SetBeginPoint(mBeginPoint);
  return recording.forget();
}

already_AddRefed<PathBuilder> PathRecording::TransformedMoveToBuilder(
    const Matrix& aTransform, FillRule aFillRule) {
  mPathOps.TransformInPlace(aTransform);
  RefPtr<PathBuilderRecording> recording =
      new PathBuilderRecording(mBackendType, std::move(mPathOps), aFillRule);
  recording->SetCurrentPoint(aTransform.TransformPoint(mCurrentPoint));
  recording->SetBeginPoint(aTransform.TransformPoint(mBeginPoint));
  return recording.forget();
}

}  // namespace gfx
}  // namespace mozilla

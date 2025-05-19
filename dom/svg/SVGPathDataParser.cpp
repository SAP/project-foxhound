/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGPathDataParser.h"

using namespace mozilla::gfx;

namespace mozilla {

//-----------------------------------------------------------------------

static double CalcVectorAngle(double ux, double uy, double vx, double vy) {
  double ta = atan2(uy, ux);
  double tb = atan2(vy, vx);
  if (tb >= ta) return tb - ta;
  return 2 * M_PI - (ta - tb);
}

SVGArcConverter::SVGArcConverter(const Point& from, const Point& to,
                                 const Point& radii, double angle,
                                 bool largeArcFlag, bool sweepFlag) {
  MOZ_ASSERT(radii.x != 0.0f && radii.y != 0.0f, "Bad radii");

  const double radPerDeg = M_PI / 180.0;
  mSegIndex = 0;

  if (from == to) {
    mNumSegs = 0;
    return;
  }

  // Convert to center parameterization as shown in
  // http://www.w3.org/TR/SVG/implnote.html
  mRx = fabs(radii.x);
  mRy = fabs(radii.y);

  mSinPhi = sin(angle * radPerDeg);
  mCosPhi = cos(angle * radPerDeg);

  double x1dash =
      mCosPhi * (from.x - to.x) / 2.0 + mSinPhi * (from.y - to.y) / 2.0;
  double y1dash =
      -mSinPhi * (from.x - to.x) / 2.0 + mCosPhi * (from.y - to.y) / 2.0;

  double root;
  double numerator = mRx * mRx * mRy * mRy - mRx * mRx * y1dash * y1dash -
                     mRy * mRy * x1dash * x1dash;

  if (numerator < 0.0) {
    //  If mRx , mRy and are such that there is no solution (basically,
    //  the ellipse is not big enough to reach from 'from' to 'to'
    //  then the ellipse is scaled up uniformly until there is
    //  exactly one solution (until the ellipse is just big enough).

    // -> find factor s, such that numerator' with mRx'=s*mRx and
    //    mRy'=s*mRy becomes 0 :
    double s = sqrt(1.0 - numerator / (mRx * mRx * mRy * mRy));

    mRx *= s;
    mRy *= s;
    root = 0.0;

  } else {
    root = (largeArcFlag == sweepFlag ? -1.0 : 1.0) *
           sqrt(numerator /
                (mRx * mRx * y1dash * y1dash + mRy * mRy * x1dash * x1dash));
  }

  double cxdash = root * mRx * y1dash / mRy;
  double cydash = -root * mRy * x1dash / mRx;

  mC.x = mCosPhi * cxdash - mSinPhi * cydash + (from.x + to.x) / 2.0;
  mC.y = mSinPhi * cxdash + mCosPhi * cydash + (from.y + to.y) / 2.0;
  mTheta = CalcVectorAngle(1.0, 0.0, (x1dash - cxdash) / mRx,
                           (y1dash - cydash) / mRy);
  double dtheta =
      CalcVectorAngle((x1dash - cxdash) / mRx, (y1dash - cydash) / mRy,
                      (-x1dash - cxdash) / mRx, (-y1dash - cydash) / mRy);
  if (!sweepFlag && dtheta > 0)
    dtheta -= 2.0 * M_PI;
  else if (sweepFlag && dtheta < 0)
    dtheta += 2.0 * M_PI;

  // Convert into cubic bezier segments <= 90deg
  mNumSegs = static_cast<int>(ceil(fabs(dtheta / (M_PI / 2.0))));
  mDelta = dtheta / mNumSegs;
  mT = 8.0 / 3.0 * sin(mDelta / 4.0) * sin(mDelta / 4.0) / sin(mDelta / 2.0);

  mFrom = from;
}

bool SVGArcConverter::GetNextSegment(Point* cp1, Point* cp2, Point* to) {
  if (mSegIndex == mNumSegs) {
    return false;
  }

  double cosTheta1 = cos(mTheta);
  double sinTheta1 = sin(mTheta);
  double theta2 = mTheta + mDelta;
  double cosTheta2 = cos(theta2);
  double sinTheta2 = sin(theta2);

  // a) calculate endpoint of the segment:
  to->x = mCosPhi * mRx * cosTheta2 - mSinPhi * mRy * sinTheta2 + mC.x;
  to->y = mSinPhi * mRx * cosTheta2 + mCosPhi * mRy * sinTheta2 + mC.y;

  // b) calculate gradients at start/end points of segment:
  cp1->x =
      mFrom.x + mT * (-mCosPhi * mRx * sinTheta1 - mSinPhi * mRy * cosTheta1);
  cp1->y =
      mFrom.y + mT * (-mSinPhi * mRx * sinTheta1 + mCosPhi * mRy * cosTheta1);

  cp2->x = to->x + mT * (mCosPhi * mRx * sinTheta2 + mSinPhi * mRy * cosTheta2);
  cp2->y = to->y + mT * (mSinPhi * mRx * sinTheta2 - mCosPhi * mRy * cosTheta2);

  // do next segment
  mTheta = theta2;
  mFrom = *to;
  ++mSegIndex;

  return true;
}

}  // namespace mozilla

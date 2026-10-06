/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * http://www.w3.org/TR/SVG2/
 *
 * Copyright © 2012 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

// Unlike the other SVGAnimated* interfaces, this is a mixin (used by
// SVGPolylineElement and SVGPolygonElement), and the spec names its
// attributes "points" / "animatedPoints" rather than "baseVal" / "animVal"
// for historical reasons predating the SVGAnimated* convention.
interface mixin SVGAnimatedPoints {
  [Constant]
  readonly attribute SVGPointList points;
  [Constant]
  readonly attribute SVGPointList animatedPoints;
};

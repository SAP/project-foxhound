/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://svgwg.org/svg2-draft/types.html#InterfaceSVGAnimatedEnumeration
 *
 * Copyright © 2013 W3C® (MIT, ERCIM, Keio, Beihang), All Rights Reserved.
 * W3C liability, trademark and document use rules apply.
 */

[Exposed=Window]
interface SVGAnimatedEnumeration {
  // Unlike the other SVGAnimated* primitive interfaces, the spec requires
  // baseVal's setter to throw TypeError when assigned a value outside the
  // enumeration's defined range, hence [SetterThrows].
  [SetterThrows]
           attribute unsigned short baseVal;
  readonly attribute unsigned short animVal;
};

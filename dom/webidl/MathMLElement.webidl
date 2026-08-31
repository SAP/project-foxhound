/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://mathml-refresh.github.io/mathml-core/
 *
 * Copyright © 2019 W3C® (MIT, ERCIM, Keio, Beihang). W3C liability, trademark
 * and permissive document license rules apply.
 */

[Exposed=Window]
interface MathMLElement : Element {
  attribute DOMString nonce;
};
MathMLElement includes GlobalEventHandlers;
MathMLElement includes HTMLOrSVGOrMathMLElement;
MathMLElement includes ElementCSSInlineStyle;
MathMLElement includes TouchEventHandlers;
MathMLElement includes OnErrorEventHandlerForNodes;

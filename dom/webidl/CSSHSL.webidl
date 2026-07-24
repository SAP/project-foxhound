/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#colorvalue-objects
 */

// https://drafts.css-houdini.org/css-typed-om-1/#csshsl
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker, PaintWorklet), Pref="layout.css.typed-om.enabled"]
interface CSSHSL : CSSColorValue {
  [Throws] constructor(CSSColorAngle h, CSSColorPercent s, CSSColorPercent l, optional CSSColorPercent alpha = 1);
  [SetterThrows] attribute CSSColorAngle h;
  [SetterThrows] attribute CSSColorPercent s;
  [SetterThrows] attribute CSSColorPercent l;
  [SetterThrows] attribute CSSColorPercent alpha;
};

/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#colorvalue-objects
 */

// https://drafts.css-houdini.org/css-typed-om-1/#cssrgb
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker, PaintWorklet), Pref="layout.css.typed-om.enabled"]
interface CSSRGB : CSSColorValue {
  [Throws] constructor(CSSColorRGBComp r, CSSColorRGBComp g, CSSColorRGBComp b, optional CSSColorPercent alpha = 1);
  [SetterThrows] attribute CSSColorRGBComp r;
  [SetterThrows] attribute CSSColorRGBComp g;
  [SetterThrows] attribute CSSColorRGBComp b;
  [SetterThrows] attribute CSSColorPercent alpha;
};

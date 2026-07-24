/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#complex-numeric
 */

// https://drafts.css-houdini.org/css-typed-om-1/#cssmathmin
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker, PaintWorklet), Pref="layout.css.typed-om.enabled"]
interface CSSMathMin : CSSMathValue {
  [Throws] constructor(CSSNumberish... args);
  // TODO: Remove [Throws] once the values attribute is fully implemented
  [Throws] readonly attribute CSSNumericArray values;
};

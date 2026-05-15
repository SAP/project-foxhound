/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#complex-numeric
 */

// https://drafts.css-houdini.org/css-typed-om-1/#cssmathclamp
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker, PaintWorklet), Pref="layout.css.typed-om.enabled"]
interface CSSMathClamp : CSSMathValue {
  [Throws] constructor(CSSNumberish lower, CSSNumberish value, CSSNumberish upper);
  // TODO: Remove [Throws] once the lower attribute is fully implemented
  [Throws] readonly attribute CSSNumericValue lower;
  // TODO: Remove [Throws] once the value attribute is fully implemented
  [Throws] readonly attribute CSSNumericValue value;
  // TODO: Remove [Throws] once the upper attribute is fully implemented
  [Throws] readonly attribute CSSNumericValue upper;
};

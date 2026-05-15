/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#colorvalue-objects
 */

// https://drafts.css-houdini.org/css-typed-om-1/#csscolorvalue
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker, PaintWorklet), Pref="layout.css.typed-om.enabled"]
interface CSSColorValue : CSSStyleValue {
  [Exposed=Window, NewObject, Throws] static (CSSColorValue or CSSStyleValue) parse(UTF8String cssText);
};

// https://drafts.css-houdini.org/css-typed-om-1/#typedefdef-csscolorrgbcomp
typedef (CSSNumberish or CSSKeywordish) CSSColorRGBComp;

// https://drafts.css-houdini.org/css-typed-om-1/#typedefdef-csscolorpercent
typedef (CSSNumberish or CSSKeywordish) CSSColorPercent;

// https://drafts.css-houdini.org/css-typed-om-1/#typedefdef-csscolornumber
typedef (CSSNumberish or CSSKeywordish) CSSColorNumber;

// https://drafts.css-houdini.org/css-typed-om-1/#typedefdef-csscolorangle
typedef (CSSNumberish or CSSKeywordish) CSSColorAngle;

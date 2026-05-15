/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#numeric-objects
 */

// https://drafts.css-houdini.org/css-typed-om-1/#typedefdef-cssnumberish
typedef (double or CSSNumericValue) CSSNumberish;

// https://drafts.css-houdini.org/css-typed-om-1/#enumdef-cssnumericbasetype
enum CSSNumericBaseType {
  "length",
  "angle",
  "time",
  "frequency",
  "resolution",
  "flex",
  "percent",
};

// https://drafts.css-houdini.org/css-typed-om-1/#dictdef-cssnumerictype
dictionary CSSNumericType {
  long length;
  long angle;
  long time;
  long frequency;
  long resolution;
  long flex;
  long percent;
  CSSNumericBaseType percentHint;
};

// https://drafts.css-houdini.org/css-typed-om-1/#cssnumericvalue
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker, PaintWorklet), Pref="layout.css.typed-om.enabled"]
interface CSSNumericValue : CSSStyleValue {
  [NewObject, Throws] CSSNumericValue add(CSSNumberish... values);
  [NewObject, Throws] CSSNumericValue sub(CSSNumberish... values);
  [NewObject, Throws] CSSNumericValue mul(CSSNumberish... values);
  [NewObject, Throws] CSSNumericValue div(CSSNumberish... values);
  [NewObject, Throws] CSSNumericValue min(CSSNumberish... values);
  [NewObject, Throws] CSSNumericValue max(CSSNumberish... values);

  boolean equals(CSSNumberish... value);

  [NewObject, Throws] CSSUnitValue to(UTF8String unit);
  [NewObject, Throws] CSSMathSum toSum(UTF8String... units);
  CSSNumericType type();

  [Exposed=Window, NewObject, Throws] static CSSNumericValue parse(UTF8String cssText);
};

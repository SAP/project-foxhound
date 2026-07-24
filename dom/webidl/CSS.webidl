/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * http://dev.w3.org/csswg/css3-conditional/
 * http://dev.w3.org/csswg/cssom/#the-css.escape%28%29-method
 * https://www.w3.org/TR/css-highlight-api-1/#registration
 *
 * Copyright © 2012 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

[Exposed=Window]
namespace CSS {
  boolean supports(UTF8String property, UTF8String value);
  boolean supports(UTF8String conditionText);
};

// http://dev.w3.org/csswg/cssom/#the-css.escape%28%29-method
partial namespace CSS {
  DOMString escape(DOMString ident);
};

// https://www.w3.org/TR/css-highlight-api-1/#registration
partial namespace CSS {
  [GetterThrows]
  readonly attribute HighlightRegistry highlights;
};

// https://drafts.css-houdini.org/css-properties-values-api-1/#registering-custom-properties
// See https://github.com/w3c/css-houdini-drafts/pull/1100 for DOMString vs. UTF8String
dictionary PropertyDefinition {
  required UTF8String name;
           UTF8String syntax       = "*";
  required boolean    inherits;
           UTF8String initialValue;
};
partial namespace CSS {
  [Pref="layout.css.properties-and-values.enabled", Throws]
  undefined registerProperty(PropertyDefinition definition);
};

// https://drafts.css-houdini.org/css-typed-om-1/#numeric-factory
// TODO: Ideally, only a single Pref annotation would be needed here, but
// partial namespaces can't currently be gated by a pref as a whole.
// See bug 1980157.
partial namespace CSS {
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue number(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue percent(double value);

  // <length>
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue cap(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue ch(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue em(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue ex(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue ic(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue lh(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue rcap(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue rch(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue rem(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue rex(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue ric(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue rlh(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue vw(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue vh(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue vi(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue vb(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue vmin(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue vmax(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue svw(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue svh(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue svi(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue svb(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue svmin(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue svmax(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue lvw(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue lvh(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue lvi(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue lvb(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue lvmin(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue lvmax(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue dvw(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue dvh(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue dvi(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue dvb(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue dvmin(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue dvmax(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue cqw(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue cqh(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue cqi(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue cqb(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue cqmin(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue cqmax(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue cm(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue mm(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue Q(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue in(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue pt(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue pc(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue px(double value);

  // <angle>
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue deg(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue grad(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue rad(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue turn(double value);

  // <time>
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue s(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue ms(double value);

  // <frequency>
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue Hz(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue kHz(double value);

  // <resolution>
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue dpi(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue dpcm(double value);
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue dppx(double value);

  // <flex>
  [NewObject, Pref="layout.css.typed-om.enabled"] CSSUnitValue fr(double value);
};

/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#stylevalue-objects
 */

// https://drafts.css-houdini.org/css-typed-om-1/#cssstylevalue
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker, PaintWorklet), Pref="layout.css.typed-om.enabled"]
interface CSSStyleValue {
  stringifier UTF8String();
  [Exposed=Window, Throws] static CSSStyleValue parse(UTF8String property, UTF8String cssText);
  [Exposed=Window, Throws] static sequence<CSSStyleValue> parseAll(UTF8String property, UTF8String cssText);
};

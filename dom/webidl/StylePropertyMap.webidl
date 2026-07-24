/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#the-stylepropertymap
 */

// https://drafts.css-houdini.org/css-typed-om-1/#stylepropertymap
[Exposed=Window, Pref="layout.css.typed-om.enabled"]
interface StylePropertyMap : StylePropertyMapReadOnly {
  [Throws] undefined set(UTF8String property, (CSSStyleValue or UTF8String)... values);
  [Throws] undefined append(UTF8String property, (CSSStyleValue or UTF8String)... values);
  [Throws] undefined delete(UTF8String property);
  undefined clear();
};

/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/cssom/#the-cssmediarule-interface
 * https://drafts.csswg.org/css-conditional/#the-cssmediarule-interface
 */

typedef (MediaList or boolean) CustomMediaQuery;

// https://drafts.csswg.org/mediaqueries-5/#csscustommediarule
[Exposed=Window, Pref="layout.css.custom-media.enabled"]
interface CSSCustomMediaRule : CSSRule {
  readonly attribute UTF8String name;
  readonly attribute CustomMediaQuery query;
};

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/scroll-animations-1/#viewtimeline-interface
 *
 * Copyright © 2015 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

dictionary ViewTimelineOptions {
  Element subject;
  ScrollAxis axis = "block";
  // The spec expects to use CSSKeywordValue. However, per the spec issue, Blink
  // and WebKit would like to support the string in the sequence as well, so we
  // follow the proposal in the spec issue to use CSSKeywordish instead of
  // CSSKeywordValue. Also, we use CSSOMString instead of DOMString to avoid the
  // extra conversion from UTF-16 to UTF-8.
  // https://github.com/w3c/csswg-drafts/issues/11477
  (UTF8String or sequence<(CSSKeywordish or CSSNumericValue)>) inset = "auto";
};

[Exposed=Window, Pref="layout.css.scroll-driven-animations.enabled"]
interface ViewTimeline : ScrollTimeline {
  [Throws]
  constructor(optional ViewTimelineOptions options = {});
  // FIXME: The spec expects that this is not nullable, but ViewTimelineOptions
  // may not provide a subject, and both Blink and WebKit make this attribute
  // nullable, so we follow others for now.
  // https://github.com/w3c/csswg-drafts/issues/9584
  readonly attribute Element? subject;
  [GetterThrows]
  readonly attribute CSSNumericValue? startOffset;
  [GetterThrows]
  readonly attribute CSSNumericValue? endOffset;
};

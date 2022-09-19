/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is:
 * https://wicg.github.io/visual-viewport/#the-visualviewport-interface
 */

[Pref="dom.visualviewport.enabled",
 Exposed=Window]
interface VisualViewport : EventTarget {
  [TaintSource]
  readonly attribute double offsetLeft;
  [TaintSource]
  readonly attribute double offsetTop;

  [TaintSource]
  readonly attribute double pageLeft;
  [TaintSource]
  readonly attribute double pageTop;

  [TaintSource]
  readonly attribute double width;
  [TaintSource]
  readonly attribute double height;

  [TaintSource]
  readonly attribute double scale;

  attribute EventHandler onresize;
  attribute EventHandler onscroll;
};

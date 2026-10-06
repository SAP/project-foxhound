/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/picture-in-picture/#interface-picture-in-picture-window
 *
 * Copyright © 2018 W3C® (MIT, ERCIM, Keio), All Rights Reserved.
 * W3C liability, trademark and document use rules apply.
 */

[Pref="dom.media-pip.enabled", Exposed=Window]
interface PictureInPictureWindow : EventTarget {
  readonly attribute long width;
  readonly attribute long height;
  attribute EventHandler onresize;

  [ChromeOnly]
  undefined notifyDimensionsChanged(long aWidth, long aHeight);
};

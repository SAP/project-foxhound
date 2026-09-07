/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/web-animations-2/#the-animationplaybackevent-interface
 *
 * Copyright © 2015 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

[Exposed=Window]
interface AnimationPlaybackEvent : Event {
  constructor(DOMString type,
              optional AnimationPlaybackEventInit eventInitDict = {});

  readonly attribute CSSNumberish? currentTime;
  readonly attribute double? timelineTime;
};

dictionary AnimationPlaybackEventInit : EventInit {
  CSSNumberish? currentTime = null;
  double? timelineTime = null;
};

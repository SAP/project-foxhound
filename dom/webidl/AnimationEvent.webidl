/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/css-animations-1/#interface-animationevent
 *
 * Copyright © 2012 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

[Exposed=Window]
interface AnimationEvent : Event {
  constructor(DOMString type, optional AnimationEventInit eventInitDict = {});

  readonly attribute DOMString animationName;
  readonly attribute float     elapsedTime;
  readonly attribute DOMString pseudoElement;
  readonly attribute CSSAnimation? animation;
};

dictionary AnimationEventInit : EventInit {
  DOMString animationName = "";
  float elapsedTime = 0;
  DOMString pseudoElement = "";
  CSSAnimation? animation = null;
};

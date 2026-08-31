/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Transition events are defined in:
 * https://drafts.csswg.org/css-transitions-1/#transition-events
 *
 * Copyright © 2012 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

[Exposed=Window]
interface TransitionEvent : Event {
  constructor(DOMString type, optional TransitionEventInit eventInitDict = {});

  readonly attribute DOMString propertyName;
  readonly attribute float     elapsedTime;
  readonly attribute DOMString pseudoElement;
  readonly attribute CSSTransition? animation;
};

dictionary TransitionEventInit : EventInit {
  DOMString propertyName = "";
  float elapsedTime = 0;
  DOMString pseudoElement = "";
  CSSTransition? animation = null;
};

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

/**
 * Prevent event default behaviour and stop its propagation.
 *
 * @param  {object} event
 *         Event or react synthetic event.
 */
exports.preventDefaultAndStopPropagation = function (event) {
  event.preventDefault();
  event.stopPropagation();
  if (event.nativeEvent) {
    if (event.nativeEvent.preventDefault) {
      event.nativeEvent.preventDefault();
    }
    if (event.nativeEvent.stopPropagation) {
      event.nativeEvent.stopPropagation();
    }
  }
};

/**
 * Returns true if the pointer event can perform drag.
 *
 * We want to handle a drag during a button is pressed.  So, we can ignore
 * pointer events which are caused by other devices.
 *
 * @param {PointerEvent} event
 * @returns {boolean}
 */
exports.canPointerEventDrag = function (event) {
  return event.pointerType == "mouse" || event.pointerType == "pen";
};

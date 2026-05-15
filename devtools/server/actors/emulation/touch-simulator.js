/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

loader.lazyRequireGetter(
  this,
  "PICKER_TYPES",
  "resource://devtools/shared/picker-constants.js"
);

var isClickHoldEnabled = Services.prefs.getBoolPref(
  "ui.click_hold_context_menus"
);
var clickHoldDelay = Services.prefs.getIntPref(
  "ui.click_hold_context_menus.delay",
  500
);

const EVENTS_TO_HANDLE = [
  "mousedown",
  "mousemove",
  "mouseup",
  "mouseenter",
  "mouseover",
  "mouseout",
  "mouseleave",
];

const kStateHover = 0x00000004; // ElementState::HOVER

/**
 * Simulate touch events for platforms where they aren't generally available.
 */
class TouchSimulator {
  /**
   * @param {WindowGlobalTargetActor} windowTarget: The window object we'll use
   *                                  to listen for click and touch events to handle.
   */
  constructor(windowTarget) {
    this.windowTarget = windowTarget;
    this.simulatorTarget = windowTarget.chromeEventHandler;
    this._currentPickerMap = new Map();
    this.previousScreenY = 0;
  }

  enabled = false;

  start() {
    if (this.enabled) {
      // Simulator is already started
      return;
    }

    EVENTS_TO_HANDLE.forEach(evt => {
      // Only listen trusted events to prevent messing with
      // event dispatched manually within content documents
      this.simulatorTarget.addEventListener(evt, this, true, false);
    });

    this.enabled = true;
  }

  stop() {
    if (!this.enabled) {
      // Simulator isn't running
      return;
    }
    EVENTS_TO_HANDLE.forEach(evt => {
      this.simulatorTarget.removeEventListener(evt, this, true);
    });
    this.enabled = false;
  }

  _isPicking() {
    const types = Object.values(PICKER_TYPES);
    return types.some(type => this._currentPickerMap.get(type));
  }

  /**
   * Set the state value for one of DevTools pickers (either eyedropper or
   * element picker).
   * If any content picker is currently active, we should not be emulating
   * touch events. Otherwise it is ok to emulate touch events.
   * In theory only one picker can ever be active at a time, but tracking the
   * different pickers independantly avoids race issues in the client code.
   *
   * @param {boolean} state
   *        True if the picker is currently active, false otherwise.
   * @param {string} pickerType
   *        One of PICKER_TYPES.
   */
  setElementPickerState(state, pickerType) {
    if (!Object.values(PICKER_TYPES).includes(pickerType)) {
      throw new Error(
        "Unsupported type in setElementPickerState: " + pickerType
      );
    }
    this._currentPickerMap.set(pickerType, state);
  }

  // eslint-disable-next-line complexity
  handleEvent(evt) {
    // Bail out if devtools is in pick mode in the same tab.
    if (this._isPicking()) {
      return;
    }

    const content = this.getContent(evt.target);
    if (!content) {
      return;
    }

    // Ignore all but real mouse event coming from physical mouse
    // (especially ignore mouse event being dispatched from a touch event)
    if (
      evt.button ||
      evt.inputSource != evt.MOZ_SOURCE_MOUSE ||
      evt.isSynthesized
    ) {
      return;
    }

    const eventTarget = this.target;
    let type = "";
    switch (evt.type) {
      case "mouseenter":
      case "mouseover":
      case "mouseout":
      case "mouseleave":
        // Don't propagate events which are not related to touch events
        evt.stopPropagation();
        evt.preventDefault();

        // We don't want to trigger any visual changes to elements whose content can
        // be modified via hover states. We can avoid this by removing the element's
        // content state.
        InspectorUtils.removeContentState(evt.target, kStateHover);
        break;

      case "mousedown":
        this.target = evt.target;

        // If the click-hold feature is enabled, start a timeout to convert long clicks
        // into contextmenu events.
        // Just don't do it if the event occurred on a scrollbar.
        if (isClickHoldEnabled && !evt.originalTarget.closest("scrollbar")) {
          this._contextMenuTimeout = this.sendContextMenu(evt);
        }

        this.previousScreenY = evt.screenY;

        type = "touchstart";
        break;

      case "mousemove": {
        if (!eventTarget) {
          // Don't propagate mousemove event when touchstart event isn't fired
          evt.stopPropagation();
          return;
        }

        type = "touchmove";
        const deltaY = evt.screenY - this.previousScreenY;
        this.previousScreenY = evt.screenY;
        this.windowTarget.emit("contentScrolled", deltaY);
        break;
      }

      case "mouseup":
        if (!eventTarget) {
          return;
        }
        this.target = null;

        content.clearTimeout(this._contextMenuTimeout);
        type = "touchend";

        // Only register click listener after mouseup to ensure
        // catching only real user click. (Especially ignore click
        // being dispatched on form submit)
        if (evt.detail == 1) {
          this.simulatorTarget.addEventListener("click", this, {
            capture: true,
            once: true,
          });
        }
        break;
    }

    const target = eventTarget || this.target;
    if (target && type) {
      this.sendTouchEvent(content, evt.clientX, evt.clientY, type);
    }

    evt.preventDefault();
    evt.stopImmediatePropagation();
  }

  sendContextMenu({ target, clientX, clientY, screenX, screenY }) {
    const view = target.ownerGlobal;
    const evt = new view.PointerEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view,
      screenX,
      screenY,
      clientX,
      clientY,
    });
    const content = this.getContent(target);
    const timeout = content.setTimeout(() => {
      target.dispatchEvent(evt);
    }, clickHoldDelay);

    return timeout;
  }

  /**
   * Sends a touch action on a given target element.
   *
   * @param {Window} win
   *        The target window.
   * @param {number} clientX
   *        The `x` screen coordinate relative to the viewport origin.
   * @param {number} clientY
   *        The `y` screen coordinate relative to the viewport origin.
   * @param {string} type
   *        The type of the touch event.
   */
  sendTouchEvent(win, clientX, clientY, type) {
    win.synthesizeTouchEvent(
      type,
      [
        {
          identifier: 0,
          offsetX: clientX,
          offsetY: clientY,
          radiiX: 0,
          radiiY: 0,
        },
      ],
      0,
      { isAsyncEnabled: true }
    );
    return true;
  }

  getContent(target) {
    const win = target?.ownerDocument ? target.ownerGlobal : null;
    return win;
  }
}

exports.TouchSimulator = TouchSimulator;

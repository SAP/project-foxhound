/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { KeyCodes } = require("resource://devtools/client/shared/keycodes.js");

const PANE_APPEARANCE_DELAY = 50;

var namedTimeoutsStore = new Map();

/**
 * Helper for draining a rapid succession of events and invoking a callback
 * once everything settles down.
 *
 * @param string id
 *        A string identifier for the named timeout.
 * @param number wait
 *        The amount of milliseconds to wait after no more events are fired.
 * @param function callback
 *        Invoked when no more events are fired after the specified time.
 */
const setNamedTimeout = function setNamedTimeout(id, wait, callback) {
  clearNamedTimeout(id);

  namedTimeoutsStore.set(
    id,
    setTimeout(() => namedTimeoutsStore.delete(id) && callback(), wait)
  );
};
exports.setNamedTimeout = setNamedTimeout;

/**
 * Clears a named timeout.
 *
 * @see setNamedTimeout
 *
 * @param string id
 *        A string identifier for the named timeout.
 */
const clearNamedTimeout = function clearNamedTimeout(id) {
  if (!namedTimeoutsStore) {
    return;
  }
  clearTimeout(namedTimeoutsStore.get(id));
  namedTimeoutsStore.delete(id);
};
exports.clearNamedTimeout = clearNamedTimeout;

/**
 * Helpers for creating and messaging between UI components.
 */
exports.ViewHelpers = {
  /**
   * Convenience method, dispatching a custom event.
   *
   * @param Node target
   *        A custom target element to dispatch the event from.
   * @param string type
   *        The name of the event.
   * @param any detail
   *        The data passed when initializing the event.
   * @return boolean
   *         True if the event was cancelled or a registered handler
   *         called preventDefault.
   */
  dispatchEvent(target, type, detail) {
    if (!(target instanceof Node)) {
      // Event cancelled.
      return true;
    }
    const document = target.ownerDocument || target;
    const dispatcher = target.ownerDocument ? target : document.documentElement;

    const event = document.createEvent("CustomEvent");
    event.initCustomEvent(type, true, true, detail);
    return dispatcher.dispatchEvent(event);
  },

  /**
   * Helper delegating some of the DOM attribute methods of a node to a widget.
   *
   * @param object widget
   *        The widget to assign the methods to.
   * @param Node node
   *        A node to delegate the methods to.
   */
  delegateWidgetAttributeMethods(widget, node) {
    widget.getAttribute = widget.getAttribute || node.getAttribute.bind(node);
    widget.setAttribute = widget.setAttribute || node.setAttribute.bind(node);
    widget.removeAttribute =
      widget.removeAttribute || node.removeAttribute.bind(node);
  },

  /**
   * Helper delegating some of the DOM event methods of a node to a widget.
   *
   * @param object widget
   *        The widget to assign the methods to.
   * @param Node node
   *        A node to delegate the methods to.
   */
  delegateWidgetEventMethods(widget, node) {
    widget.addEventListener =
      widget.addEventListener || node.addEventListener.bind(node);
    widget.removeEventListener =
      widget.removeEventListener || node.removeEventListener.bind(node);
  },

  /**
   * Checks if the specified object looks like it's been decorated by an
   * event emitter.
   *
   * @return boolean
   *         True if it looks, walks and quacks like an event emitter.
   */
  isEventEmitter(object) {
    return object?.on && object?.off && object?.once && object?.emit;
  },

  /**
   * Checks if the specified object is an instance of a DOM node.
   *
   * @return boolean
   *         True if it's a node, false otherwise.
   */
  isNode(object) {
    return (
      object instanceof Node ||
      object instanceof Element ||
      Cu.getClassName(object) == "DocumentFragment"
    );
  },

  /**
   * Prevents event propagation when navigation keys are pressed.
   *
   * @param Event e
   *        The event to be prevented.
   */
  preventScrolling(e) {
    switch (e.keyCode) {
      case KeyCodes.DOM_VK_UP:
      case KeyCodes.DOM_VK_DOWN:
      case KeyCodes.DOM_VK_LEFT:
      case KeyCodes.DOM_VK_RIGHT:
      case KeyCodes.DOM_VK_PAGE_UP:
      case KeyCodes.DOM_VK_PAGE_DOWN:
      case KeyCodes.DOM_VK_HOME:
      case KeyCodes.DOM_VK_END:
        e.preventDefault();
        e.stopPropagation();
    }
  },

  /**
   * Check if the enter key or space was pressed
   *
   * @param event event
   *        The event triggered by a keydown or keypress on an element
   */
  isSpaceOrReturn(event) {
    return (
      event.keyCode === KeyCodes.DOM_VK_SPACE ||
      event.keyCode === KeyCodes.DOM_VK_RETURN
    );
  },

  /**
   * Sets a toggled pane hidden or visible. The pane can either be displayed on
   * the side (right or left depending on the locale) or at the bottom.
   *
   * @param object flags
   *        An object containing some of the following properties:
   *        - visible: true if the pane should be shown, false to hide
   *        - animated: true to display an animation on toggle
   *        - delayed: true to wait a few cycles before toggle
   *        - callback: a function to invoke when the toggle finishes
   * @param Node pane
   *        The element representing the pane to toggle.
   */
  togglePane(flags, pane) {
    // Make sure a pane is actually available first.
    if (!pane) {
      return;
    }

    // Hiding is always handled via margins, not the hidden attribute.
    pane.removeAttribute("hidden");

    // Add a class to the pane to handle min-widths, margins and animations.
    pane.classList.add("generic-toggled-pane");

    // Avoid toggles in the middle of animation.
    if (pane.hasAttribute("animated")) {
      return;
    }

    // Avoid useless toggles.
    if (flags.visible == !pane.classList.contains("pane-collapsed")) {
      if (flags.callback) {
        flags.callback();
      }
      return;
    }

    // The "animated" attributes enables animated toggles (slide in-out).
    if (flags.animated) {
      pane.setAttribute("animated", "");
    } else {
      pane.removeAttribute("animated");
    }

    // Computes and sets the pane margins in order to hide or show it.
    const doToggle = () => {
      // Negative margins are applied to "right" and "left" to support RTL and
      // LTR directions, as well as to "bottom" to support vertical layouts.
      // Unnecessary negative margins are forced to 0 via CSS in widgets.css.
      if (flags.visible) {
        pane.style.marginLeft = "0";
        pane.style.marginRight = "0";
        pane.style.marginBottom = "0";
        pane.classList.remove("pane-collapsed");
      } else {
        const width = Math.floor(pane.getAttribute("width")) + 1;
        const height = Math.floor(pane.getAttribute("height")) + 1;
        pane.style.marginLeft = -width + "px";
        pane.style.marginRight = -width + "px";
        pane.style.marginBottom = -height + "px";
      }

      // Wait for the animation to end before calling afterToggle()
      if (flags.animated) {
        const options = {
          useCapture: false,
          once: true,
        };

        pane.addEventListener(
          "transitionend",
          () => {
            // Prevent unwanted transitions: if the panel is hidden and the layout
            // changes margins will be updated and the panel will pop out.
            pane.removeAttribute("animated");

            if (!flags.visible) {
              pane.classList.add("pane-collapsed");
            }
            if (flags.callback) {
              flags.callback();
            }
          },
          options
        );
      } else {
        if (!flags.visible) {
          pane.classList.add("pane-collapsed");
        }

        // Invoke the callback immediately since there's no transition.
        if (flags.callback) {
          flags.callback();
        }
      }
    };

    // Sometimes it's useful delaying the toggle a few ticks to ensure
    // a smoother slide in-out animation.
    if (flags.delayed) {
      pane.ownerDocument.defaultView.setTimeout(
        doToggle,
        PANE_APPEARANCE_DELAY
      );
    } else {
      doToggle();
    }
  },
};

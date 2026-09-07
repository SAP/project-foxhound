/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "PlatformKeys", function () {
  return Services.strings.createBundle(
    "chrome://global-platform/locale/platformKeys.properties"
  );
});

ChromeUtils.defineLazyGetter(lazy, "Keys", function () {
  return Services.strings.createBundle(
    "chrome://global/locale/keys.properties"
  );
});

export var ShortcutUtils = {
  IS_VALID: "valid",
  INVALID_KEY: "invalid_key",
  INVALID_KEY_IN_EXTENSION_MANIFEST: "invalid_key_in_extension_manifest",
  INVALID_MODIFIER: "invalid_modifier",
  INVALID_COMBINATION: "invalid_combination",
  DUPLICATE_MODIFIER: "duplicate_modifier",
  MODIFIER_REQUIRED: "modifier_required",

  CLOSE_TAB: "CLOSE_TAB",
  CYCLE_TABS: "CYCLE_TABS",
  TOGGLE_CARET_BROWSING: "TOGGLE_CARET_BROWSING",
  MOVE_TAB_BACKWARD: "MOVE_TAB_BACKWARD",
  MOVE_TAB_FORWARD: "MOVE_TAB_FORWARD",
  NEXT_TAB: "NEXT_TAB",
  PREVIOUS_TAB: "PREVIOUS_TAB",

  /**
   * Prettifies the modifier keys for an element.
   *
   * @param {Element} aElemKey
   *   The key element to get the modifiers from.
   * @return {string}
   *   A prettified and properly separated modifier keys string. If the data
   *   on `aElemKey` is missing or incomplete, the return value is `""`.
   * @example
   *   // example1 (macOS): <key modifiers="ctrl" key="T"/>
   *   prettifyShortcut(example1) => "⌃T"
   *   // example1 (other): <key modifiers="ctrl" key="T"/>
   *   prettifyShortcut(example1) => "Ctrl+T"
   *   // example2 (macOS): <key modifiers="ctrl,shift" key="i"/>
   *   prettifyShortcut(example2) => "⇧⌃I"
   *   // example2 (other): <key modifiers="ctrl,shift" key="i"/>
   *   prettifyShortcut(example2) => "Shift+Ctrl+I"
   *   // example3: <key/>
   *   prettifyShortcut(example3) => ""
   */
  prettifyShortcut(aElemKey) {
    let elemString = this.getModifierString(aElemKey.getAttribute("modifiers"));
    let key = this.getKeyString(
      aElemKey.getAttribute("keycode"),
      aElemKey.getAttribute("key")
    );
    if (!key) {
      console.warn(
        "Key element",
        aElemKey,
        'is missing "key" and "keycode" attributes necessary to define a shortcut'
      );
      return "";
    }
    return elemString + key;
  },

  metaKeyIsCommandKey() {
    return AppConstants.platform == "macosx";
  },

  /**
   * @param {string|null} elemMod
   *   Value of the `"modifiers"` attribute for a XUL <key> element.
   *   Comma-separated list of key modifiers for a keyboard shortcut.
   * @returns {string}
   *   Pretty string representation of the set of modifiers that must be used
   *   with another key in order to invoke a keyboard shortcut.
   * @example getModifierString("shift,meta") => "⇧⌘"
   * @example getModifierString("ctrl,alt") => "⌥⌃"
   * @see KeyEventHandler
   */
  getModifierString(elemMod) {
    if (!elemMod) {
      return "";
    }

    let elemString = "";
    let haveCloverLeaf = false;
    if (elemMod.match("accel")) {
      if (Services.appinfo.OS == "Darwin") {
        haveCloverLeaf = true;
      } else {
        elemString +=
          lazy.PlatformKeys.GetStringFromName("VK_CONTROL") +
          lazy.PlatformKeys.GetStringFromName("MODIFIER_SEPARATOR");
      }
    }
    if (elemMod.match("access")) {
      if (Services.appinfo.OS == "Darwin") {
        elemString +=
          lazy.PlatformKeys.GetStringFromName("VK_CONTROL") +
          lazy.PlatformKeys.GetStringFromName("MODIFIER_SEPARATOR");
      } else {
        elemString +=
          lazy.PlatformKeys.GetStringFromName("VK_ALT") +
          lazy.PlatformKeys.GetStringFromName("MODIFIER_SEPARATOR");
      }
    }
    if (elemMod.match("meta") && !this.metaKeyIsCommandKey()) {
      elemString +=
        lazy.PlatformKeys.GetStringFromName("VK_COMMAND_OR_WIN") +
        lazy.PlatformKeys.GetStringFromName("MODIFIER_SEPARATOR");
    }
    if (elemMod.match("shift")) {
      elemString +=
        lazy.PlatformKeys.GetStringFromName("VK_SHIFT") +
        lazy.PlatformKeys.GetStringFromName("MODIFIER_SEPARATOR");
    }
    if (elemMod.match("alt")) {
      elemString +=
        lazy.PlatformKeys.GetStringFromName("VK_ALT") +
        lazy.PlatformKeys.GetStringFromName("MODIFIER_SEPARATOR");
    }
    if (elemMod.match("ctrl") || elemMod.match("control")) {
      elemString +=
        lazy.PlatformKeys.GetStringFromName("VK_CONTROL") +
        lazy.PlatformKeys.GetStringFromName("MODIFIER_SEPARATOR");
    }
    if (elemMod.match("meta") && this.metaKeyIsCommandKey()) {
      elemString +=
        lazy.PlatformKeys.GetStringFromName("VK_COMMAND_OR_WIN") +
        lazy.PlatformKeys.GetStringFromName("MODIFIER_SEPARATOR");
    }

    if (haveCloverLeaf) {
      elemString +=
        lazy.PlatformKeys.GetStringFromName("VK_COMMAND_OR_WIN") +
        lazy.PlatformKeys.GetStringFromName("MODIFIER_SEPARATOR");
    }

    return elemString;
  },

  /**
   * @param {string|null} keyCode
   *   Value of the `"keycode"` attribute of a XUL <key> element
   * @param {string|null} keyAttribute
   *   Value of the `"key"` attribute of a XUL <key> element
   * @returns {string}
   *   Pretty string representing a primary key that must be pressed to
   *   engage a keyboard shortcut. Returns `""` if neither `keyCode` nor
   *   `keyAttribute` are usable.
   */
  getKeyString(keyCode, keyAttribute) {
    let key = "";
    if (keyCode) {
      keyCode = keyCode.toUpperCase();
      if (AppConstants.platform == "macosx") {
        // Return fancy Unicode symbols for some keys.
        switch (keyCode) {
          case "VK_LEFT":
            return "\u2190"; // U+2190 LEFTWARDS ARROW
          case "VK_RIGHT":
            return "\u2192"; // U+2192 RIGHTWARDS ARROW
        }
      }
      try {
        let bundle = keyCode == "VK_RETURN" ? lazy.PlatformKeys : lazy.Keys;
        // Some keys might not exist in the locale file, which will throw.
        key = bundle.GetStringFromName(keyCode);
      } catch (ex) {
        console.error("Error finding ", keyCode, ": ", ex);
        key = keyCode.replace(/^VK_/, "");
      }
    } else if (keyAttribute) {
      key = keyAttribute.toUpperCase();
    }

    return key;
  },

  getKeyAttribute(chromeKey) {
    if (/^[A-Z]$/.test(chromeKey)) {
      // We use the key attribute for single characters.
      return ["key", chromeKey];
    }
    return ["keycode", this.getKeycodeAttribute(chromeKey)];
  },

  /**
   * Determines the corresponding XUL keycode from the given chrome key.
   *
   * For example:
   *
   *    input     |  output
   *    ---------------------------------------
   *    "PageUp"  |  "VK_PAGE_UP"
   *    "Delete"  |  "VK_DELETE"
   *
   * @param {string} chromeKey The chrome key (e.g. "PageUp", "Space", ...)
   * @returns {string} The constructed value for the Key's 'keycode' attribute.
   */
  getKeycodeAttribute(chromeKey) {
    if (/^[0-9]/.test(chromeKey)) {
      return `VK_${chromeKey}`;
    }
    return `VK${chromeKey.replace(/([A-Z])/g, "_$&").toUpperCase()}`;
  },

  findShortcut(aElemCommand) {
    let document = aElemCommand.ownerDocument;
    return document.querySelector(
      'key[command="' + aElemCommand.getAttribute("id") + '"]'
    );
  },

  chromeModifierKeyMap: {
    Alt: "alt",
    Command: "accel",
    Ctrl: "accel",
    MacCtrl: "control",
    Shift: "shift",
  },

  /**
   * Determines the corresponding XUL modifiers from the chrome modifiers.
   *
   * For example:
   *
   *    input             |   output
   *    ---------------------------------------
   *    ["Ctrl", "Shift"] |   "accel,shift"
   *    ["MacCtrl"]       |   "control"
   *
   * @param {Array} chromeModifiers The array of chrome modifiers.
   * @returns {string} The constructed value for the Key's 'modifiers' attribute.
   */
  getModifiersAttribute(chromeModifiers) {
    return Array.from(chromeModifiers, modifier => {
      return ShortcutUtils.chromeModifierKeyMap[modifier];
    })
      .sort()
      .join(",");
  },

  /**
   * Validate if a shortcut string is valid and return an error code if it
   * isn't valid.
   *
   * For example:
   *
   *    input            |   output
   *    ---------------------------------------
   *    "Ctrl+Shift+A"   |   IS_VALID
   *    "Shift+F"        |   MODIFIER_REQUIRED
   *    "Command+>"      |   INVALID_KEY
   *
   * @param {string} string The shortcut string.
   * @returns {string} The code for the validation result.
   */
  validate(string, { extensionManifest = false } = {}) {
    // A valid shortcut key for a webextension manifest
    const MEDIA_KEYS =
      /^(MediaNextTrack|MediaPlayPause|MediaPrevTrack|MediaStop)$/;
    const BASIC_KEYS =
      /^([A-Z0-9]|Comma|Period|Home|End|PageUp|PageDown|Space|Insert|Delete|Up|Down|Left|Right)$/;
    // NOTE: only allow F1-F12 keys when validating shortcuts defined in extension manifests,
    // but allow F13-19 to be assigned to user-customized shortcut keys (assigned by users
    // through the about:addons "Manage Shortcuts" view).
    const FUNCTION_KEYS_BASIC = /^(F[1-9]|F1[0-2])$/;
    const FUNCTION_KEYS_EXTENDED = /^(F[1-9]|F1[0-9])$/;
    const FUNCTION_KEYS = extensionManifest
      ? FUNCTION_KEYS_BASIC
      : FUNCTION_KEYS_EXTENDED;

    if (MEDIA_KEYS.test(string.trim())) {
      return this.IS_VALID;
    }

    let modifiers = string.split("+").map(s => s.trim());
    let key = modifiers.pop();

    let chromeModifiers = modifiers.map(
      m => ShortcutUtils.chromeModifierKeyMap[m]
    );
    // If the modifier wasn't found it will be undefined.
    if (chromeModifiers.some(modifier => !modifier)) {
      return this.INVALID_MODIFIER;
    }

    if (
      FUNCTION_KEYS === FUNCTION_KEYS_BASIC &&
      !FUNCTION_KEYS_BASIC.test(key) &&
      FUNCTION_KEYS_EXTENDED.test(key)
    ) {
      return this.INVALID_KEY_IN_EXTENSION_MANIFEST;
    }

    switch (modifiers.length) {
      case 0:
        // A lack of modifiers is only allowed with function keys.
        if (!FUNCTION_KEYS.test(key)) {
          return this.MODIFIER_REQUIRED;
        }
        break;
      case 1:
        // Shift is only allowed on its own with function keys.
        if (chromeModifiers[0] == "shift" && !FUNCTION_KEYS.test(key)) {
          return this.MODIFIER_REQUIRED;
        }
        break;
      case 2:
        if (chromeModifiers[0] == chromeModifiers[1]) {
          return this.DUPLICATE_MODIFIER;
        }
        break;
      default:
        return this.INVALID_COMBINATION;
    }

    if (!BASIC_KEYS.test(key) && !FUNCTION_KEYS.test(key)) {
      return this.INVALID_KEY;
    }

    return this.IS_VALID;
  },

  /**
   * Attempt to find a key for a given shortcut string, such as
   * "Ctrl+Shift+A" and determine if it is a system shortcut.
   *
   * @param {object} win The window to look for key elements in.
   * @param {string} value The shortcut string.
   * @returns {boolean} Whether a system shortcut was found or not.
   */
  isSystem(win, value) {
    let modifiers = value.split("+");
    let chromeKey = modifiers.pop();
    let modifiersString = this.getModifiersAttribute(modifiers);
    let keycode = this.getKeycodeAttribute(chromeKey);

    let baseSelector = "key";
    if (modifiers.length) {
      baseSelector += `[modifiers="${modifiersString}"]`;
    }

    let keyEl = win.document.querySelector(
      [
        `${baseSelector}[key="${chromeKey}"]`,
        `${baseSelector}[key="${chromeKey.toLowerCase()}"]`,
        `${baseSelector}[keycode="${keycode}"]`,
      ].join(",")
    );
    return keyEl && !keyEl.closest("keyset").id.startsWith("ext-keyset-id");
  },

  /**
   * Determine what action a KeyboardEvent should perform, if any.
   *
   * @param {KeyboardEvent} event The event to check for a related system action.
   * @returns {string} A string identifying the action, or null if no action is found.
   */
  getSystemActionForEvent(event, { rtl } = {}) {
    // On Windows, Win key state is not strictly checked so that we can ignore
    // Win key state to check the other modifier state.
    const meaningfulMetaKey = event.metaKey && AppConstants.platform != "win";
    const ctrlOnly =
      event.ctrlKey && !event.shiftKey && !event.altKey && !meaningfulMetaKey;
    const ctrlShift =
      event.ctrlKey && event.shiftKey && !event.altKey && !meaningfulMetaKey;

    // If Meta is accel on this platform, allow meta+alt combination:
    const metaAltAccel =
      event.metaKey &&
      this.metaKeyIsCommandKey() &&
      event.altKey &&
      !event.shiftKey &&
      !event.ctrlKey;

    switch (event.keyCode) {
      case event.DOM_VK_TAB:
        if (event.ctrlKey && !event.altKey && !meaningfulMetaKey) {
          return ShortcutUtils.CYCLE_TABS;
        }
        break;
      case event.DOM_VK_F7:
        // shift + F7 is the default DevTools shortcut for the Style Editor.
        if (!event.shiftKey) {
          return ShortcutUtils.TOGGLE_CARET_BROWSING;
        }
        break;
      case event.DOM_VK_PAGE_UP:
        if (ctrlOnly) {
          return ShortcutUtils.PREVIOUS_TAB;
        }
        if (ctrlShift) {
          return ShortcutUtils.MOVE_TAB_BACKWARD;
        }
        break;
      case event.DOM_VK_PAGE_DOWN:
        if (ctrlOnly) {
          return ShortcutUtils.NEXT_TAB;
        }
        if (ctrlShift) {
          return ShortcutUtils.MOVE_TAB_FORWARD;
        }
        break;
      case event.DOM_VK_UP: // fall through
      case event.DOM_VK_LEFT:
        if (metaAltAccel) {
          return ShortcutUtils.PREVIOUS_TAB;
        }
        break;
      case event.DOM_VK_DOWN: // fall through
      case event.DOM_VK_RIGHT:
        if (metaAltAccel) {
          return ShortcutUtils.NEXT_TAB;
        }
        break;
    }

    if (AppConstants.platform == "macosx") {
      if (!event.altKey && event.metaKey) {
        switch (event.charCode) {
          case "}".charCodeAt(0):
            if (rtl) {
              return ShortcutUtils.PREVIOUS_TAB;
            }
            return ShortcutUtils.NEXT_TAB;
          case "{".charCodeAt(0):
            if (rtl) {
              return ShortcutUtils.NEXT_TAB;
            }
            return ShortcutUtils.PREVIOUS_TAB;
        }
      }
    }
    // Not on Mac from now on.
    if (AppConstants.platform != "macosx") {
      if (ctrlOnly && event.keyCode == KeyEvent.DOM_VK_F4) {
        return ShortcutUtils.CLOSE_TAB;
      }
    }

    return null;
  },
};

Object.freeze(ShortcutUtils);

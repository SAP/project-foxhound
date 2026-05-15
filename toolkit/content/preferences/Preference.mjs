/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Preferences } from "chrome://global/content/preferences/Preferences.mjs";

const { EventEmitter } = ChromeUtils.importESModule(
  "resource://gre/modules/EventEmitter.sys.mjs"
);

/**
 * @typedef {string | boolean | number | nsIFile | void} PreferenceValue
 */

/**
 * @typedef {object} PreferenceConfig
 * @property {string} id
 * @property {string} type
 * @property {boolean} [inverted]
 */

/**
 * @param {string} name
 * @param {string} value
 * @returns {NodeListOf<HTMLInputElement>}
 */
function getElementsByAttribute(name, value) {
  // If we needed to defend against arbitrary values, we would escape
  // double quotes (") and escape characters (\) in them, i.e.:
  //   ${value.replace(/["\\]/g, '\\$&')}
  return document.querySelectorAll(`[${name}="${value}"]`);
}

export class Preference extends EventEmitter {
  /**
   * @type {PreferenceValue}
   */
  _value;

  /**
   * @param {PreferenceConfig} configInfo
   */
  constructor({ id, type, inverted }) {
    super();
    this.on("change", this.onChange.bind(this));

    this._value = null;
    this.readonly = false;
    this._useDefault = false;
    this.batching = false;

    this.id = id;
    this.type = type;
    this.inverted = !!inverted;

    // In non-instant apply mode, we must try and use the last saved state
    // from any previous opens of a child dialog instead of the value from
    // preferences, to pick up any edits a user may have made.

    if (
      Preferences.type == "child" &&
      window.opener &&
      window.opener.Preferences &&
      window.opener.document.nodePrincipal.isSystemPrincipal
    ) {
      // Try to find the preference in the parent window.
      const preference = window.opener.Preferences.get(this.id);

      // Don't use the value setter here, we don't want updateElements to be
      // prematurely fired.
      this._value = preference ? preference.value : this.valueFromPreferences;
    } else {
      this._value = this.valueFromPreferences;
    }
  }

  reset() {
    // defer reset until preference update
    this.value = undefined;
  }

  _reportUnknownType() {
    const msg = `Preference with id=${this.id} has unknown type ${this.type}.`;
    Services.console.logStringMessage(msg);
  }

  /**
   * @param {HTMLInputElement} aElement
   */
  setElementValue(aElement) {
    if (this.locked) {
      aElement.disabled = true;
    }
    if (aElement.labels?.length) {
      for (let label of aElement.labels) {
        /** @type {Element} */ (label).toggleAttribute("disabled", this.locked);
      }
    }

    if (!this.isElementEditable(aElement)) {
      return;
    }

    let rv = undefined;

    if (Preferences._syncFromPrefListeners.has(aElement)) {
      rv = Preferences._syncFromPrefListeners.get(aElement)(aElement);
    }
    let val = rv;
    if (val === undefined) {
      val = Preferences.instantApply ? this.valueFromPreferences : this.value;
    }
    // if the preference is marked for reset, show default value in UI
    if (val === undefined) {
      val = this.defaultValue;
    }

    /**
     * Initialize a UI element property with a value. Handles the case
     * where an element has not yet had a XBL binding attached for it and
     * the property setter does not yet exist by setting the same attribute
     * on the XUL element using DOM apis and assuming the element's
     * constructor or property getters appropriately handle this state.
     *
     * @param {Element} element
     * @param {string} attribute
     * @param {string} value
     */
    function setValue(element, attribute, value) {
      if (attribute in element) {
        // @ts-expect-error The property might not be writable...
        element[attribute] = value;
      } else if (attribute === "checked" || attribute === "pressed") {
        // The "checked" attribute can't simply be set to the specified value;
        // it has to be set if the value is true and removed if the value
        // is false in order to be interpreted correctly by the element.
        if (value) {
          // In theory we can set it to anything; however xbl implementation
          // of `checkbox` only works with "true".
          element.setAttribute(attribute, "true");
        } else {
          element.removeAttribute(attribute);
        }
      } else {
        element.setAttribute(attribute, value);
      }
    }
    if (
      aElement.localName == "checkbox" ||
      aElement.localName == "moz-checkbox" ||
      (aElement.localName == "input" && aElement.type == "checkbox")
    ) {
      setValue(aElement, "checked", val);
    } else if (aElement.localName == "moz-toggle") {
      setValue(aElement, "pressed", val);
    } else {
      setValue(aElement, "value", val);
    }
  }

  /**
   * @param {HTMLElement} aElement
   * @returns {PreferenceValue}
   */
  getElementValue(aElement) {
    if (Preferences._syncToPrefListeners.has(aElement)) {
      try {
        const rv = Preferences._syncToPrefListeners.get(aElement)(aElement);
        if (rv !== undefined) {
          return rv;
        }
      } catch (e) {
        console.error(e);
      }
    }

    /**
     * Read the value of an attribute from an element, assuming the
     * attribute is a property on the element's node API. If the property
     * is not present in the API, then assume its value is contained in
     * an attribute, as is the case before a binding has been attached.
     *
     * @param {Element} element
     * @param {string} attribute
     * @returns {any}
     */
    function getValue(element, attribute) {
      if (attribute in element) {
        return element[/** @type {keyof typeof element} */ (attribute)];
      }
      return element.getAttribute(attribute);
    }
    let value;
    if (
      aElement.localName == "checkbox" ||
      aElement.localName == "moz-checkbox" ||
      (aElement.localName == "input" &&
        /** @type {HTMLInputElement} */ (aElement).type == "checkbox")
    ) {
      value = getValue(aElement, "checked");
    } else if (aElement.localName == "moz-toggle") {
      value = getValue(aElement, "pressed");
    } else {
      value = getValue(aElement, "value");
    }

    switch (this.type) {
      case "int":
        return parseInt(value, 10) || 0;
      case "bool":
        return typeof value == "boolean" ? value : value == "true";
    }
    return value;
  }

  /**
   * @param {HTMLElement} aElement
   */
  isElementEditable(aElement) {
    switch (aElement.localName) {
      case "checkbox":
      case "input":
      case "radiogroup":
      case "textarea":
      case "menulist":
      case "moz-toggle":
      case "moz-checkbox":
        return true;
    }
    return false;
  }

  updateElements() {
    let startTime = ChromeUtils.now();

    if (!this.id) {
      return;
    }

    const elements = getElementsByAttribute("preference", this.id);
    for (const element of elements) {
      this.setElementValue(element);
    }

    ChromeUtils.addProfilerMarker(
      "Preferences",
      { startTime, captureStack: true },
      `updateElements for ${this.id}`
    );
  }

  onChange() {
    this.updateElements();
  }

  /**
   * @type {PreferenceValue}
   */
  get value() {
    return this._value;
  }

  /**
   * @param {PreferenceValue} val
   */
  set value(val) {
    if (this.value !== val) {
      this._value = val;
      if (Preferences.instantApply) {
        this.valueFromPreferences = val;
      }
      this.emit("change");
    }
  }

  /**
   * @type {boolean}
   */
  get locked() {
    return Services.prefs.prefIsLocked(this.id);
  }

  /**
   * @param {boolean | string} val
   * @returns {void}
   */
  updateControlDisabledState(val) {
    if (!this.id) {
      return;
    }

    val = val || this.locked;

    const elements = getElementsByAttribute("preference", this.id);
    for (const element of elements) {
      element.disabled = val;

      const labels = getElementsByAttribute("control", element.id);
      for (const label of labels) {
        label.disabled = val;
      }
    }
  }

  get hasUserValue() {
    return Services.prefs.prefHasUserValue(this.id) && this.value !== undefined;
  }

  /** @returns {PreferenceValue} */
  get defaultValue() {
    this._useDefault = true;
    const val = this.valueFromPreferences;
    this._useDefault = false;
    return val;
  }

  get _branch() {
    return this._useDefault ? Preferences.defaultBranch : Services.prefs;
  }

  /**
   * @type {PreferenceValue}
   */
  get valueFromPreferences() {
    try {
      // Force a resync of value with preferences.
      switch (this.type) {
        case "int":
          return this._branch.getIntPref(this.id);
        case "bool": {
          const val = this._branch.getBoolPref(this.id);
          return this.inverted ? !val : val;
        }
        case "wstring":
          return this._branch.getComplexValue(
            this.id,
            Ci.nsIPrefLocalizedString
          ).data;
        case "string":
        case "unichar":
          return this._branch.getStringPref(this.id);
        case "fontname": {
          const family = this._branch.getStringPref(this.id);
          if (!family) {
            return family;
          }
          const fontEnumerator = Cc[
            "@mozilla.org/gfx/fontenumerator;1"
          ].createInstance(Ci.nsIFontEnumerator);
          return fontEnumerator.getStandardFamilyName(family);
        }
        case "file": {
          const f = this._branch.getComplexValue(this.id, Ci.nsIFile);
          return f;
        }
        default:
          this._reportUnknownType();
      }
    } catch (e) {}
    return null;
  }

  /**
   * @param {PreferenceValue} val
   */
  set valueFromPreferences(val) {
    // Exit early if nothing to do.
    if (this.readonly || this.valueFromPreferences == val) {
      return;
    }

    // The special value undefined means 'reset preference to default'.
    if (val === undefined) {
      Services.prefs.clearUserPref(this.id);
      return;
    }

    // Force a resync of preferences with value.
    switch (this.type) {
      case "int":
        Services.prefs.setIntPref(this.id, /** @type {number} */ (val));
        break;
      case "bool":
        Services.prefs.setBoolPref(this.id, this.inverted ? !val : !!val);
        break;
      case "wstring": {
        const pls = Cc["@mozilla.org/pref-localizedstring;1"].createInstance(
          Ci.nsIPrefLocalizedString
        );
        pls.data = /** @type {string} */ (val);
        Services.prefs.setComplexValue(this.id, Ci.nsIPrefLocalizedString, pls);
        break;
      }
      case "string":
      case "unichar":
      case "fontname":
        Services.prefs.setStringPref(this.id, /** @type {string} */ (val));
        break;
      case "file": {
        let lf;
        if (typeof val == "string") {
          lf = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
          lf.persistentDescriptor = val;
          if (!lf.exists()) {
            lf.initWithPath(val);
          }
        } else {
          lf = /** @type {nsIFile} */ (val).QueryInterface(Ci.nsIFile);
        }
        Services.prefs.setComplexValue(this.id, Ci.nsIFile, lf);
        break;
      }
      default:
        this._reportUnknownType();
    }
    if (!this.batching) {
      Services.prefs.savePrefFile(null);
    }
  }
}

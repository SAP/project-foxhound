/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  Directive,
  noChange,
  nothing,
  directive,
} from "chrome://global/content/vendor/lit.all.mjs";

import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = XPCOMUtils.declareLazy({
  srdEnabled: { pref: "browser.settings-redesign.enabled" },
});

/**
 * Convert "friendly" pane names to internal names (home -> paneHome).
 *
 * @param {string} category
 */
function expandPaneName(category) {
  return category
    ? `pane${category[0].toUpperCase()}${category.slice(1)}`
    : undefined;
}

/** @import { AttributePart } from "chrome://global/content/vendor/lit.all.mjs" */

/**
 * @typedef {object} SettingElementConfig
 * @property {string} [id] - The ID for the Setting, this should match the layout id
 * @property {string} [l10nId] - The Fluent l10n ID for the setting
 * @property {Record<string, string>} [l10nArgs] - An object containing l10n IDs and their values that will be translated with Fluent
 * @property {Record<string, any>} [controlAttrs] - An object of additional attributes to be set on the control. These can be used to further customize the control for example a message bar of the warning type, or what dialog a button should open
 * @property {string} [iconSrc] - A path to the icon for the control (if the control supports one)
 * @property {string} [slot] - The named slot for the control
 * @property {string} [supportPage] - The SUMO support page slug for the setting
 * @property {string} [subcategory] - The sub-category slug used for direct linking to a setting from SUMO
 * @property {string} [loadPane]
 *   Friendly pane name loaded by this element, searches matching that pane will
 *   highlight this element.
 */

/**
 * A Lit directive that applies all properties of an object to a DOM element.
 *
 * This directive interprets keys in the provided props object as follows:
 * - Keys starting with `?` set or remove boolean attributes using `toggleAttribute`.
 * - Keys starting with `.` set properties directly on the element.
 * - Keys starting with `@` are currently not supported and will throw an error.
 * - All other keys are applied as regular attributes using `setAttribute`.
 *
 * It avoids reapplying values that have not changed, but does not currently
 * remove properties that were previously set and are no longer present in the new input.
 *
 * This directive is useful to "spread" an object of attributes/properties declaratively onto an
 * element in a Lit template.
 */
class SpreadDirective extends Directive {
  /**
   * A record of previously applied properties to avoid redundant updates.
   *
   * @type {Record<string, unknown>}
   */
  #prevProps = {};

  /**
   * Render nothing by default as all changes are made in update using DOM APIs
   * on the element directly.
   *
   * @param {Record<string, unknown>} props The props to apply to this element.
   */
  // eslint-disable-next-line no-unused-vars
  render(props) {
    return nothing;
  }

  /**
   * Apply props to the element using DOM APIs, updating only changed values.
   *
   * @param {AttributePart} part - The part of the template this directive is bound to.
   * @param {[Record<string, unknown>]} propsArray - An array with a single object containing props to apply.
   * @returns {typeof noChange} - Indicates to Lit that no re-render is needed.
   */
  update(part, [props]) {
    // TODO: This doesn't clear any values that were set in previous calls if
    // they are no longer present.
    // It isn't entirely clear to me (mstriemer) what we should do if a prop is
    // removed, or if the prop has changed from say ?foo to foo. By not
    // implementing the auto-clearing hopefully the consumer will do something
    // that fits their use case.

    let el = part.element;

    for (let [key, value] of Object.entries(props)) {
      // Skip if the value hasn't changed since the last update.
      if (value === this.#prevProps[key]) {
        continue;
      }

      // Update the element based on the property key matching Lit's templates:
      //   ?key -> el.toggleAttribute(key, value)
      //   .key -> el.key = value
      //   key -> el.setAttribute(key, value)
      if (key.startsWith("?")) {
        el.toggleAttribute(key.slice(1), Boolean(value));
      } else if (key.startsWith(".")) {
        // @ts-ignore
        el[key.slice(1)] = value;
      } else if (key.startsWith("@")) {
        throw new Error(
          `Event listeners are not yet supported with spread (${key})`
        );
      } else {
        el.setAttribute(key, String(value));
      }
    }

    // Save current props for comparison in the next update.
    this.#prevProps = props;

    return noChange;
  }
}

export const spread = directive(SpreadDirective);

/**
 * controlAttrs keys that carry a heading level destined for moz-fieldset
 * (or another widget that exposes a `headingLevel` Lit property). Both
 * the lowercase HTML attribute form and the Lit property-binding form
 * are recognized; setAttribute folds case so `headingLevel` works too.
 */
const HEADING_LEVEL_KEYS = ["headinglevel", "headingLevel", ".headingLevel"];

/**
 * Translate a config-supplied heading level into the level we should
 * actually render at. With SRD on, the pane title (moz-page-header)
 * sits at h2 instead of legacy XUL's h1, so headings nested inside the
 * pane shift one level deeper. Top-level section headings (h1) jump
 * to h3 so they sit immediately below the new pane title rather than
 * colliding with it.
 *
 * @param {number | undefined} level
 * @param {boolean} srdEnabled
 * @returns {number | undefined}
 */
export function bumpHeadingLevelForSrd(level, srdEnabled) {
  if (!srdEnabled || typeof level !== "number") {
    return level;
  }
  // Floor at 3 so legacy `headinglevel: 1` (the pre-SRD "section heading"
  // tier) doesn't become h2 and collide with the moz-page-header pane title.
  return Math.max(level + 1, 3);
}

export class SettingElement extends MozLitElement {
  /**
   * The default properties that the setting element accepts.
   *
   * @param {SettingElementConfig} config
   */
  getCommonPropertyMapping(config) {
    let controlAttrs = { ...(config.controlAttrs ?? {}) };
    if (lazy.srdEnabled) {
      for (let key of HEADING_LEVEL_KEYS) {
        if (typeof controlAttrs[key] === "number") {
          controlAttrs[key] = bumpHeadingLevelForSrd(
            controlAttrs[key],
            lazy.srdEnabled
          );
        }
      }
    }
    return {
      id: config.id,
      "data-l10n-id": config.l10nId ? config.l10nId : undefined,
      "data-l10n-args": config.l10nArgs
        ? JSON.stringify(config.l10nArgs)
        : undefined,
      ".iconSrc": config.iconSrc,
      "data-load-pane": expandPaneName(config.loadPane),
      ".supportPage":
        config.supportPage != undefined ? config.supportPage : undefined,
      slot: config.slot,
      ...controlAttrs,
    };
  }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Base class for AI features in Firefox.
 * Each feature manages its own preferences and artifacts.
 *
 * State Hierarchy:
 * - isAllowed: Can the feature work in this environment? (locale, region, platform checks)
 * - isBlocked: Is the feature blocked? (environmental or policy restrictions)
 * - isEnabled: Is the feature currently active? (user prefs)
 * - available: !isEnabled && !isBlocked (feature can be turned on)
 *
 * @interface
 */
export class AIFeature {
  /**
   * Feature identifier (e.g., "linkpreview", "translations").
   *
   * @returns {string} The feature identifier.
   */
  static get id() {
    throw new Error("AIFeature subclass must implement static get id()");
  }

  /**
   * Enable the feature by setting its preference,
   * which typically triggers observers that handle:
   * - Setting up event listeners
   * - Downloading required models/artifacts
   * - Updating telemetry
   *
   * @returns {Promise<void>} Resolves when enable process completes
   */
  static async enable() {
    throw new Error("AIFeature subclass must implement static enable()");
  }

  /**
   * Disable the feature by clearing its preference,
   * which typically triggers observers that handle:
   * - Removing event listeners
   * - Deleting downloaded models/artifacts
   * - Updating telemetry
   *
   * @returns {Promise<void>} Resolves when disable process (including cleanup) completes
   */
  static async disable() {
    throw new Error("AIFeature subclass must implement static disable()");
  }

  /**
   * Reset the feature to its default state.
   * - Sets feature pref to DEFAULT value (not explicitly disabled)
   * - Uninstalls any downloaded models/artifacts
   * - Resets all related prefs (opt-in, UI visibility, etc.) to defaults
   *
   * This differs from disable() in that it restores factory defaults rather than
   * explicitly disabling. The default state may be enabled or disabled depending
   * on rollout status and default pref values.
   *
   * @returns {Promise<void>} Resolves when reset is complete
   */
  static async reset() {
    throw new Error("AIFeature subclass must implement static reset()");
  }

  /**
   * Check if the feature is enabled.
   *
   * @returns {boolean} True if enabled, false otherwise.
   */
  static get isEnabled() {
    throw new Error("AIFeature subclass must implement static get isEnabled()");
  }

  /**
   * Check if the feature is allowed to be enabled.
   * This determines whether a feature could ever be enabled based on
   * environmental factors like locale, platform, or other prerequisites.
   * This differs from isEnabled - isAllowed checks if enabling is possible,
   * while isEnabled checks if it's currently enabled.
   *
   * Use this to conditionally show/hide feature sections in Settings UI
   * when the feature cannot be used regardless of user preference.
   *
   * @returns {boolean} True if the feature can be enabled, false otherwise.
   */
  static get isAllowed() {
    throw new Error("AIFeature subclass must implement static get isAllowed()");
  }

  /**
   * Check if the feature is blocked from being enabled.
   * Returns true if the feature cannot be used due to environmental
   * factors (region, locale) or policy restrictions.
   *
   * Relationship to other states:
   * - isAllowed = false: Feature CAN'T work (locale/region/platform)
   * - isBlocked = true: Feature WON'T work (policy or environmental block)
   * - available = !isEnabled && !isBlocked: Feature can be enabled
   *
   * @returns {boolean} True if blocked, false otherwise.
   */
  static get isBlocked() {
    throw new Error("AIFeature subclass must implement static get isBlocked()");
  }

  /**
   * Check if the enabled state of the feature is already managed by a policy
   * and cannot be changed by the user in the settings. A policy may force the
   * feature to be enabled or disabled. Either way, the user cannot change this.
   *
   * See https://support.mozilla.org/kb/customizing-firefox-using-policiesjson
   *
   * @returns {boolean} True if the feature is managed by a policy, otherwise false.
   */
  static get isManagedByPolicy() {
    throw new Error(
      "AIFeature subclass must implement static get isManagedByPolicy()"
    );
  }
}

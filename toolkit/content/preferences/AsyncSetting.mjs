/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { EventEmitter } = ChromeUtils.importESModule(
  "resource://gre/modules/EventEmitter.sys.mjs"
);

/** @import { SettingControlConfig } from "chrome://browser/content/preferences/widgets/setting-control.mjs" */
/** @import { SettingConfig, SettingValue } from "./Setting.mjs" */

/**
 * This is the interface for the async setting classes to implement.
 *
 * For the actual implementation see AsyncSettingMixin.
 */
export class AsyncSetting extends EventEmitter {
  static id = "";

  /** @type {SettingConfig['controllingExtensionInfo']} */
  static controllingExtensionInfo;

  /** @type {SettingValue} */
  defaultValue = "";
  defaultDisabled = false;
  defaultVisible = true;
  /** @type {Partial<SettingControlConfig>} */
  defaultGetControlConfig = {};

  /**
   * Emit a change event to notify listeners that the setting's data has
   * changed and should be updated.
   */
  emitChange = () => {
    this.emit("change");
  };

  /**
   * Setup any external listeners that are required for managing this
   * setting's state. When the state needs to update the Setting.emitChange method should be called.
   *
   * @returns {ReturnType<SettingConfig['setup']>} Teardown function to clean up external listeners.
   */
  setup() {}

  /**
   * Called before the setting values will be cached. You can start any shared
   * work here if you need the same value in multiple callbacks.
   *
   * @example
   * class Attendees extends AsyncSetting {
   *   beforeRefresh() {
   *     this.attendees = MeetingDb.getAttendees();
   *   }
   *   get() {
   *     return this.attendees;
   *   }
   *   async visible() {
   *     return (await this.attendees).length;
   *   }
   * }
   */
  beforeRefresh() {}

  /**
   * Get the value of this setting.
   *
   * @abstract
   * @returns {Promise<SettingValue>}
   */
  async get() {}

  /**
   * Set the value of this setting.
   *
   * @abstract
   * @param {SettingValue} value The value from the input that triggered the update.
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async set(value) {}

  /**
   * Whether the control should be disabled.
   *
   * @returns {Promise<boolean>}
   */
  async disabled() {
    return false;
  }

  /**
   * Whether the control should be visible.
   *
   * @returns {Promise<boolean>}
   */
  async visible() {
    return true;
  }

  /**
   * Override the initial control config. This will be spread into the
   * initial config, with this object taking precedence.
   *
   * @returns {Promise<Partial<SettingControlConfig>>}
   */
  async getControlConfig() {
    return {};
  }

  /**
   * Callback fired after a user has changed the setting's value. Useful for
   * recording telemetry.
   *
   * @param {SettingValue} value
   */
  // eslint-disable-next-line no-unused-vars
  onUserChange(value) {}

  /**
   * Callback fired after a user has clicked a setting's control.
   *
   * @param {MouseEvent} event
   */
  // eslint-disable-next-line no-unused-vars
  onUserClick(event) {}

  /**
   * Callback fired after a user has dismissed a message bar.
   *
   * @param {CustomEvent} event
   */
  //eslint-disable-next-line no-unused-vars
  onMessageBarDismiss(event) {}

  /**
   * Callback fired after items in a reorderable list have been reordered.
   * This should be used to update the underlying data when the user
   * reorders items, such as updating preference values.
   *
   * @param {CustomEvent} event - reorder event with detail containing draggedElement, targetElement, position, draggedIndex, targetIndex
   */
  //eslint-disable-next-line no-unused-vars
  onUserReorder(event) {}
}

/**
 * Wraps an AsyncSetting and adds caching of values to provide a synchronous
 * API to the Setting class.
 *
 * @implements {SettingConfig}
 */
export class AsyncSettingHandler {
  /** @type {AsyncSetting} */
  asyncSetting;

  /** @type {Function} */
  #emitChange;

  /** @type {string} */
  pref;

  /**
   * Dependencies are not supported on AsyncSettings, but we include an empty
   * array for consistency with {@link SettingConfig}.
   *
   * @type {string[]}
   */
  deps = [];

  /** @type {SettingConfig['controllingExtensionInfo']} */
  controllingExtensionInfo;

  /**
   * @param {string} id
   * @param {typeof AsyncSetting} AsyncSettingClass
   */
  constructor(id, AsyncSettingClass) {
    this.asyncSetting = new AsyncSettingClass();
    this.id = id;
    this.controllingExtensionInfo = AsyncSettingClass.controllingExtensionInfo;
    this.#emitChange = () => {};

    // Initialize cached values with defaults
    this.cachedValue = this.asyncSetting.defaultValue;
    this.cachedDisabled = this.asyncSetting.defaultDisabled;
    this.cachedVisible = this.asyncSetting.defaultVisible;
    this.cachedGetControlConfig = this.asyncSetting.defaultGetControlConfig;

    // Listen for change events from the async setting
    this.asyncSetting.on("change", () => this.refresh());
  }

  /**
   * @param {() => any} emitChange
   * @returns {ReturnType<SettingConfig['setup']>}
   */
  setup(emitChange) {
    let teardown = this.asyncSetting.setup();

    this.#emitChange = emitChange;

    this.refresh();
    return teardown;
  }

  /**
   * Called to trigger async tasks and re-cache values.
   */
  async refresh() {
    this.asyncSetting.beforeRefresh();
    [
      this.cachedValue,
      this.cachedDisabled,
      this.cachedVisible,
      this.cachedGetControlConfig,
    ] = await Promise.all([
      this.asyncSetting.get(),
      this.asyncSetting.disabled(),
      this.asyncSetting.visible(),
      this.asyncSetting.getControlConfig(),
    ]);
    this.#emitChange();
  }

  /**
   * @returns {SettingValue}
   */
  get() {
    return this.cachedValue;
  }

  /**
   * @param {any} value
   * @returns {Promise<void>}
   */
  set(value) {
    return this.asyncSetting.set(value);
  }

  /**
   * @returns {boolean}
   */
  disabled() {
    return this.cachedDisabled;
  }

  /**
   * @returns {boolean}
   */
  visible() {
    return this.cachedVisible;
  }

  /**
   * @param {SettingControlConfig} config
   * @returns {SettingControlConfig}
   */
  getControlConfig(config) {
    return {
      ...config,
      ...this.cachedGetControlConfig,
    };
  }

  /**
   * @param {SettingValue} value
   */
  onUserChange(value) {
    return this.asyncSetting.onUserChange(value);
  }

  /**
   * @param {MouseEvent} event
   */
  onUserClick(event) {
    this.asyncSetting.onUserClick(event);
  }

  /**
   * @param {CustomEvent} event
   */
  onMessageBarDismiss(event) {
    this.asyncSetting.onMessageBarDismiss(event);
  }

  /**
   * @param {CustomEvent} event
   */
  onUserReorder(event) {
    this.asyncSetting.onUserReorder(event);
  }
}

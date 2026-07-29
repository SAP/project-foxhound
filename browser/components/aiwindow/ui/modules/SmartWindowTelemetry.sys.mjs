/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* This singleton is for telemetry events that benefit from shared state management.
 * Simple events to be handled with inline Glean calls */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const ONE_HOUR_MS = 60 * 60 * 1000;
const PREF_MODEL_CHOICE = "browser.smartwindow.firstrun.modelChoice";
const PREF_MEMORIES_FROM_CONVERSATION =
  "browser.smartwindow.memories.generateFromConversation";
const PREF_MEMORIES_FROM_HISTORY =
  "browser.smartwindow.memories.generateFromHistory";
const PREF_IS_DEFAULT_WINDOW = "browser.smartwindow.isDefaultWindow";
const lazy = {};

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "modelChoice",
  PREF_MODEL_CHOICE,
  "",
  () => SmartWindowTelemetry.updateModelMetric()
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "memoriesFromConversation",
  PREF_MEMORIES_FROM_CONVERSATION,
  false,
  () => SmartWindowTelemetry.updateMemoriesFromConversationMetric()
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "memoriesFromHistory",
  PREF_MEMORIES_FROM_HISTORY,
  false,
  () => SmartWindowTelemetry.updateMemoriesFromHistoryMetric()
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "isDefaultWindow",
  PREF_IS_DEFAULT_WINDOW,
  false,
  () => SmartWindowTelemetry.updateSetDefaultOptinMetric()
);

ChromeUtils.defineESModuleGetters(lazy, {
  getModelForChoice:
    "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs",
});

export const SmartWindowTelemetry = {
  _initialized: false,
  lastUriLoadTimestamp: 0,

  init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;

    this.updateModelMetric().catch(console.error);
    this.updateMemoriesFromConversationMetric();
    this.updateMemoriesFromHistoryMetric();
    this.updateSetDefaultOptinMetric();
  },

  updateMemoriesFromConversationMetric() {
    const memoriesFromConversation = lazy.memoriesFromConversation;
    Glean.smartWindow.memoriesOptin.generate_from_conversation.set(
      memoriesFromConversation
    );
  },

  updateMemoriesFromHistoryMetric() {
    const memoriesFromHistory = lazy.memoriesFromHistory;
    Glean.smartWindow.memoriesOptin.generate_from_history.set(
      memoriesFromHistory
    );
  },

  updateSetDefaultOptinMetric() {
    Glean.smartWindow.setDefaultOptin.set(lazy.isDefaultWindow);
  },

  async updateModelMetric() {
    const modelInfo = await lazy.getModelForChoice(lazy.modelChoice);
    Glean.smartWindow.model.set(modelInfo?.model ?? "unset");
  },

  async recordUriLoad() {
    const now = Date.now();

    // Throttle to once per hour to capture activity at event time rather than
    // relying on daily metric submission, while avoiding duplicate events.
    if (now - this.lastUriLoadTimestamp < ONE_HOUR_MS) {
      return false;
    }

    this.lastUriLoadTimestamp = now;

    const modelInfo = await lazy.getModelForChoice(lazy.modelChoice);
    Glean.smartWindow.uriLoad.record({
      model: modelInfo?.model ?? "unset",
    });

    return true;
  },
};

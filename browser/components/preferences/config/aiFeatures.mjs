/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import { Preferences } from "chrome://global/content/preferences/Preferences.mjs";
import { SettingGroupManager } from "chrome://browser/content/preferences/config/SettingGroupManager.mjs";
import { OnDeviceModelManager } from "chrome://browser/content/preferences/OnDeviceModelManager.mjs";

/**
 * @import { OnDeviceModelFeaturesEnum } from "chrome://browser/content/preferences/OnDeviceModelManager.mjs"
 * @typedef {typeof AiControlGlobalStates[keyof typeof AiControlGlobalStates]} AiControlGlobalStatesEnum
 */

const { CommonDialog } = ChromeUtils.importESModule(
  "resource://gre/modules/CommonDialog.sys.mjs"
);

const XPCOMUtils = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
).XPCOMUtils;
const lazy = XPCOMUtils.declareLazy({
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  GenAI: "resource:///modules/GenAI.sys.mjs",
  MemoryStore:
    "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs",
});

Preferences.addAll([
  // browser.ai.control.* prefs defined in main.js
  { id: "browser.ml.chat.provider", type: "string" },
  { id: "browser.smartwindow.apiKey", type: "string" },
  { id: "browser.smartwindow.enabled", type: "bool" },
  { id: "browser.smartwindow.endpoint", type: "string" },
  { id: "browser.smartwindow.firstrun.modelChoice", type: "string" },
  { id: "browser.smartwindow.memories", type: "bool" },
  { id: "browser.smartwindow.model", type: "string" },
  { id: "browser.smartwindow.preferences.endpoint", type: "string" },
  { id: "browser.smartwindow.tos.consentTime", type: "int" },
  { id: "browser.preferences.aiControls.showUnavailable", type: "bool" },
]);

Preferences.addSetting({
  id: "aiControlsShowUnavailable",
  pref: "browser.preferences.aiControls.showUnavailable",
});

Preferences.addSetting({ id: "aiControlsDescription" });
Preferences.addSetting({ id: "blockAiGroup" });
Preferences.addSetting({ id: "blockAiDescription" });
Preferences.addSetting({ id: "onDeviceFieldset" });
Preferences.addSetting({
  id: "onDeviceGroup",
  deps: [
    "aiControlTranslationsSelect",
    "aiControlPdfjsAltTextSelect",
    "aiControlSmartTabGroupsSelect",
    "aiControlLinkPreviewKeyPointsSelect",
  ],
  getControlConfig(config, deps) {
    for (let option of config.options) {
      let control = option.items[0];
      if (control.id in deps) {
        option.controlAttrs = option.controlAttrs || {};
        option.controlAttrs.class = deps[control.id].visible
          ? ""
          : "setting-hidden";
      }
    }
    return config;
  },
});
Preferences.addSetting({ id: "aiStatesDescription" });
Preferences.addSetting({ id: "sidebarChatbotFieldset" });
Preferences.addSetting({
  id: "aiBlockedMessage",
  deps: ["aiControlDefaultToggle"],
  visible: deps => deps.aiControlDefaultToggle.value,
});

const AiControlStates = Object.freeze({
  default: "default",
  enabled: "enabled",
  blocked: "blocked",
  available: "available",
});

const AiControlGlobalStates = Object.freeze({
  available: "available",
  blocked: "blocked",
});

/**
 * @param {AiControlGlobalStatesEnum} state
 */
function updateAiControlDefault(state) {
  let isBlocked = state == AiControlGlobalStates.blocked;
  for (let feature of Object.values(OnDeviceModelManager.features)) {
    if (isBlocked) {
      // Reset to default (blocked) state unless it was already blocked.
      OnDeviceModelManager.disable(feature);
    } else if (!isBlocked && !OnDeviceModelManager.isEnabled(feature)) {
      // Reset to default (available) state unless it was manually enabled.
      OnDeviceModelManager.reset(feature);
    }
  }
  if (isBlocked) {
    Services.prefs.setStringPref(
      "browser.ai.control.default",
      AiControlGlobalStates.blocked
    );
  }
  // There's no feature-specific dropdown for extensions since it's still a
  // trial feature, so just turn it off/on based on the global switch.
  Services.prefs.setBoolPref("extensions.ml.enabled", !isBlocked);
  Glean.browser.globalAiControlToggled.record({ blocked: isBlocked });
}

class BlockAiConfirmationDialog extends MozLitElement {
  get dialog() {
    return this.renderRoot.querySelector("dialog");
  }

  get confirmButton() {
    return this.renderRoot.querySelector('moz-button[type="primary"]');
  }

  get cancelButton() {
    return this.renderRoot.querySelector('moz-button:not([type="primary"])');
  }

  async showModal() {
    await this.updateComplete;
    this.dialog.showModal();
  }

  handleCancel() {
    this.dialog.close();
  }

  handleConfirm() {
    this.dialog.close();
    updateAiControlDefault(AiControlGlobalStates.blocked);
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://global/skin/in-content/common.css"
      />
      <link
        rel="stylesheet"
        href="chrome://browser/skin/preferences/preferences.css"
      />
      <link
        rel="stylesheet"
        href="chrome://browser/content/preferences/config/block-ai-confirmation-dialog.css"
      />
      <dialog aria-labelledby="heading" aria-describedby="content">
        <div class="dialog-header">
          <img
            class="dialog-header-icon"
            src="chrome://global/skin/icons/block.svg"
            alt=""
          />
          <h2
            id="heading"
            class="text-box-trim-start"
            data-l10n-id="preferences-ai-controls-block-confirmation-heading"
          ></h2>
        </div>
        <div id="content" class="dialog-body">
          <p
            data-l10n-id="preferences-ai-controls-block-confirmation-description"
          ></p>
          <p
            class="ul-prefix-p"
            data-l10n-id="preferences-ai-controls-block-confirmation-features-start"
          ></p>
          <ul>
            <li
              data-l10n-id="preferences-ai-controls-block-confirmation-translations"
            ></li>
            <li
              data-l10n-id="preferences-ai-controls-block-confirmation-pdfjs"
            ></li>
            <li
              data-l10n-id="preferences-ai-controls-block-confirmation-tab-group-suggestions"
            ></li>
            <li
              data-l10n-id="preferences-ai-controls-block-confirmation-key-points"
            ></li>
            <li
              data-l10n-id="preferences-ai-controls-block-confirmation-sidebar-chatbot"
            ></li>
          </ul>
          <p
            data-l10n-id="preferences-ai-controls-block-confirmation-features-after"
          ></p>
          <a is="moz-support-link" support-page="firefox-ai-controls"></a>
        </div>
        <moz-button-group>
          <moz-button
            data-l10n-id="preferences-ai-controls-block-confirmation-cancel"
            @click=${this.handleCancel}
          ></moz-button>
          <moz-button
            autofocus
            type="primary"
            data-l10n-id="preferences-ai-controls-block-confirmation-confirm"
            @click=${this.handleConfirm}
          ></moz-button>
        </moz-button-group>
      </dialog>
    `;
  }
}
customElements.define(
  "block-ai-confirmation-dialog",
  BlockAiConfirmationDialog
);

const AI_CONTROL_OPTIONS = [
  {
    value: AiControlStates.available,
    l10nId: "preferences-ai-controls-state-available",
  },
  {
    value: AiControlStates.enabled,
    l10nId: "preferences-ai-controls-state-enabled",
  },
  {
    value: AiControlStates.blocked,
    l10nId: "preferences-ai-controls-state-blocked",
  },
];

/**
 * Validates that a URL is trustworthy (HTTPS or localhost).
 *
 * @param {string} url - The URL to validate.
 * @returns {boolean} True if URL is HTTPS or localhost, otherwise false.
 */
function validateEndpointUrl(url) {
  if (!url) {
    return false;
  }
  try {
    const uri = Services.io.newURI(url);
    const principal = Services.scriptSecurityManager.createContentPrincipal(
      uri,
      {}
    );
    return principal.isOriginPotentiallyTrustworthy;
  } catch {
    return false;
  }
}

Preferences.addSetting({
  id: "aiControlDefaultToggle",
  pref: "browser.ai.control.default",
  setup() {
    document.body.append(
      document.createElement("block-ai-confirmation-dialog")
    );
  },
  get: prefVal =>
    prefVal in AiControlGlobalStates
      ? prefVal == AiControlGlobalStates.blocked
      : AiControlGlobalStates.available,
  set(inputVal, _, setting) {
    if (inputVal) {
      // Restore the toggle to not pressed, we're opening a dialog
      setting.onChange();
      let dialog = /** @type {BlockAiConfirmationDialog} */ (
        document.querySelector("block-ai-confirmation-dialog")
      );
      dialog.showModal();
    } else {
      updateAiControlDefault(AiControlGlobalStates.available);
    }
    return AiControlGlobalStates.available;
  },
});

/**
 * @param {object} options
 * @param {string} options.id Setting id to create
 * @param {string} options.pref Pref id for the state
 * @param {OnDeviceModelFeaturesEnum} options.feature Feature id for removing models
 * @param {boolean} [options.supportsEnabled] If the feature supports the "enabled" state
 * @param {SettingConfig['getControlConfig']} [options.getControlConfig] A getControlConfig implementation.
 */
function makeAiControlSetting({
  id,
  pref,
  feature,
  supportsEnabled = true,
  getControlConfig,
}) {
  Preferences.addSetting({
    id,
    pref,
    deps: ["aiControlDefault", "aiControlsShowUnavailable"],
    setup(emitChange) {
      /**
       * @param {nsISupports} _
       * @param {string} __
       * @param {string} changedFeature
       */
      const featureChange = (_, __, changedFeature) => {
        if (changedFeature == feature) {
          emitChange();
        }
      };
      Services.obs.addObserver(featureChange, "OnDeviceModelManagerChange");
      return () =>
        Services.obs.removeObserver(
          featureChange,
          "OnDeviceModelManagerChange"
        );
    },
    get(prefVal, deps) {
      if (
        prefVal == AiControlStates.blocked ||
        (prefVal == AiControlStates.default &&
          deps.aiControlDefault.value == AiControlGlobalStates.blocked) ||
        OnDeviceModelManager.isBlocked(feature)
      ) {
        return AiControlStates.blocked;
      }
      if (
        supportsEnabled &&
        (prefVal == AiControlStates.enabled ||
          OnDeviceModelManager.isEnabled(feature))
      ) {
        return AiControlStates.enabled;
      }
      return AiControlStates.available;
    },
    set(prefVal) {
      if (prefVal == AiControlStates.available) {
        OnDeviceModelManager.reset(feature);
      } else if (prefVal == AiControlStates.enabled) {
        OnDeviceModelManager.enable(feature);
      } else if (prefVal == AiControlStates.blocked) {
        OnDeviceModelManager.disable(feature);
      }
      return prefVal;
    },
    disabled() {
      return OnDeviceModelManager.isManagedByPolicy(feature);
    },
    visible(deps) {
      return (
        OnDeviceModelManager.isAllowed(feature) ||
        deps.aiControlsShowUnavailable.value
      );
    },
    onUserChange(selection) {
      Glean.browser.aiControlChanged.record({ feature, selection });
    },
    getControlConfig,
  });
}
makeAiControlSetting({
  id: "aiControlTranslationsSelect",
  pref: "browser.ai.control.translations",
  feature: OnDeviceModelManager.features.Translations,
  supportsEnabled: false,
  getControlConfig(config, _, setting) {
    let isBlocked = setting.value == AiControlStates.blocked;
    let moreSettingsLink = config.options.at(-1);
    moreSettingsLink.hidden = isBlocked;
    config.supportPage = isBlocked ? "website-translation" : null;
    return config;
  },
});
makeAiControlSetting({
  id: "aiControlPdfjsAltTextSelect",
  pref: "browser.ai.control.pdfjsAltText",
  feature: OnDeviceModelManager.features.PdfAltText,
});
makeAiControlSetting({
  id: "aiControlSmartTabGroupsSelect",
  pref: "browser.ai.control.smartTabGroups",
  feature: OnDeviceModelManager.features.TabGroups,
});
makeAiControlSetting({
  id: "aiControlLinkPreviewKeyPointsSelect",
  pref: "browser.ai.control.linkPreviewKeyPoints",
  feature: OnDeviceModelManager.features.KeyPoints,
});

// sidebar chatbot
Preferences.addSetting({ id: "chatbotProviderItem" });
Preferences.addSetting({
  id: "chatbotProvider",
  pref: "browser.ml.chat.provider",
});
Preferences.addSetting(
  /** @type {{ feature: OnDeviceModelFeaturesEnum } & SettingConfig } */ ({
    id: "aiControlSidebarChatbotSelect",
    pref: "browser.ai.control.sidebarChatbot",
    deps: ["aiControlDefault", "chatbotProvider", "aiControlsShowUnavailable"],
    feature: OnDeviceModelManager.features.SidebarChatbot,
    setup(emitChange) {
      lazy.GenAI.init();
      /**
       * @param {nsISupports} _
       * @param {string} __
       * @param {string} changedFeature
       */
      const featureChange = (_, __, changedFeature) => {
        if (changedFeature == this.feature) {
          emitChange();
        }
      };
      Services.obs.addObserver(featureChange, "OnDeviceModelManagerChange");
      return () =>
        Services.obs.removeObserver(
          featureChange,
          "OnDeviceModelManagerChange"
        );
    },
    get(prefVal, deps) {
      if (
        prefVal == AiControlStates.blocked ||
        (prefVal == AiControlStates.default &&
          deps.aiControlDefault.value == AiControlGlobalStates.blocked) ||
        OnDeviceModelManager.isBlocked(this.feature)
      ) {
        return AiControlStates.blocked;
      }
      return deps.chatbotProvider.value || AiControlStates.available;
    },
    set(inputVal, deps) {
      if (inputVal == AiControlStates.blocked) {
        OnDeviceModelManager.disable(this.feature);
        return inputVal;
      }
      if (inputVal == AiControlStates.available) {
        OnDeviceModelManager.reset(this.feature);
        return inputVal;
      }
      if (inputVal) {
        // Enable the chatbot sidebar so it can be used with this provider.
        OnDeviceModelManager.enable(this.feature);
        deps.chatbotProvider.value = inputVal;
      }
      return AiControlStates.enabled;
    },
    disabled() {
      return OnDeviceModelManager.isManagedByPolicy(this.feature);
    },
    visible(deps) {
      return (
        OnDeviceModelManager.isAllowed(this.feature) ||
        deps.aiControlsShowUnavailable.value
      );
    },
    onUserChange(selection) {
      Glean.browser.aiControlChanged.record({
        feature: OnDeviceModelManager.features.SidebarChatbot,
        selection:
          String(selection) in AiControlStates
            ? selection
            : AiControlStates.enabled,
      });
    },
    getControlConfig(config, _, setting) {
      let providerUrl = setting.value;
      let options = config.options.slice(0, 3);
      lazy.GenAI.chatProviders.forEach((provider, url) => {
        let isSelected = url == providerUrl;
        // @ts-expect-error provider.hidden isn't in the typing
        if (!isSelected && provider.hidden) {
          return;
        }
        options.push({
          value: url,
          controlAttrs: { label: provider.name },
        });
      });
      if (!options.some(opt => opt.value == providerUrl)) {
        options.push({
          value: providerUrl,
          controlAttrs: { label: providerUrl },
        });
      }
      return {
        ...config,
        options,
      };
    },
  })
);

Preferences.addSetting({
  id: "smartWindowEnabled",
  pref: "browser.smartwindow.enabled",
});

Preferences.addSetting({
  id: "smartWindowFieldset",
  deps: ["smartWindowEnabled"],
  visible: deps => {
    return deps.smartWindowEnabled.value;
  },
});

Preferences.addSetting({
  id: "aiFeaturesSmartWindowGroup",
});

Preferences.addSetting({
  id: "smartWindowToConsentTime",
  pref: "browser.smartwindow.tos.consentTime",
});

Preferences.addSetting({
  id: "activateSmartWindowLink",
  deps: ["smartWindowEnabled", "smartWindowToConsentTime"],
  visible: deps => {
    return (
      deps.smartWindowEnabled.value && !deps.smartWindowToConsentTime.value
    );
  },
  onUserClick(e) {
    e.preventDefault();
    const browser = window.browsingContext.embedderElement;
    lazy.AIWindow.launchWindow(browser, true);
  },
});

Preferences.addSetting({
  id: "personalizeSmartWindowButton",
  deps: ["smartWindowEnabled", "smartWindowToConsentTime"],
  visible: deps => {
    return deps.smartWindowEnabled.value && deps.smartWindowToConsentTime.value;
  },
  onUserClick(e) {
    e.preventDefault();
    window.gotoPref("panePersonalizeSmartWindow");
  },
});

Preferences.addSetting({
  id: "smartWindowEndpoint",
  pref: "browser.smartwindow.endpoint",
});

Preferences.addSetting({
  id: "smartWindowModel",
  pref: "browser.smartwindow.model",
});

Preferences.addSetting({
  id: "smartWindowApiKey",
  pref: "browser.smartwindow.apiKey",
});

Preferences.addSetting({
  id: "smartWindowPreferencesEndpoint",
  pref: "browser.smartwindow.preferences.endpoint",
});

Preferences.addSetting({
  id: "smartWindowFirstRunModelChoice",
  pref: "browser.smartwindow.firstrun.modelChoice",
});

Preferences.addSetting({
  id: "modelSelection",
  deps: [
    "smartWindowModel",
    "smartWindowFirstRunModelChoice",
    "smartWindowEndpoint",
    "smartWindowPreferencesEndpoint",
  ],
  get(_, deps) {
    const modelChoice = deps.smartWindowFirstRunModelChoice.value;
    if (modelChoice) {
      return modelChoice;
    }

    // Fall back to no selection
    return null;
  },
  set(value, deps) {
    // Save model selection
    // Preset models save pref immediately, "Custom" waits for clicking the Save button
    if (value !== "0") {
      // Switching to preset
      const endpointEl = document.getElementById("customModelEndpoint");
      const currentEndpoint = endpointEl?.value?.trim();
      if (currentEndpoint) {
        deps.smartWindowPreferencesEndpoint.value = currentEndpoint;
      }

      Services.prefs.clearUserPref("browser.smartwindow.endpoint");
    }

    // Write index to firstrun.modelChoice
    deps.smartWindowFirstRunModelChoice.value = value;
  },
});

Preferences.addSetting({
  id: "customModelName",
  deps: [
    "smartWindowFirstRunModelChoice",
    "smartWindowModel",
    "smartWindowEndpoint",
    "smartWindowPreferencesEndpoint",
  ],
  visible: deps => deps.smartWindowFirstRunModelChoice.value === "0",
  get(_, deps) {
    return deps.smartWindowModel.value || "";
  },
});

Preferences.addSetting({
  id: "customModelEndpoint",
  deps: [
    "smartWindowFirstRunModelChoice",
    "smartWindowEndpoint",
    "smartWindowPreferencesEndpoint",
  ],
  visible: deps => deps.smartWindowFirstRunModelChoice.value === "0",
  get(_, deps) {
    const defaultEndpoint = Services.prefs
      .getDefaultBranch("")
      .getStringPref("browser.smartwindow.endpoint", "");

    // Show saved endpoint if user has set a custom value if its different from default
    if (
      deps.smartWindowEndpoint.value &&
      deps.smartWindowEndpoint.value !== defaultEndpoint
    ) {
      return deps.smartWindowEndpoint.value;
    }

    // Show backup endpoint when switching back to custom
    if (deps.smartWindowPreferencesEndpoint.value) {
      return deps.smartWindowPreferencesEndpoint.value;
    }
    return "";
  },
  onUserChange(value) {
    const saveButton = document.getElementById("customModelSaveButton");
    if (saveButton) {
      saveButton.disabled = !validateEndpointUrl(value?.trim());
    }
  },
});

Preferences.addSetting({
  id: "customModelAuthToken",
  deps: ["smartWindowFirstRunModelChoice", "smartWindowApiKey"],
  visible: deps => deps.smartWindowFirstRunModelChoice.value === "0",
  get(_, deps) {
    if (deps.smartWindowApiKey.value) {
      return deps.smartWindowApiKey.value;
    }
    return "";
  },
});

Preferences.addSetting({
  id: "customModelHelpLink",
  deps: ["smartWindowFirstRunModelChoice"],
  visible: deps => deps.smartWindowFirstRunModelChoice.value === "0",
});

Preferences.addSetting({
  id: "customModelSaveButton",
  deps: [
    "smartWindowFirstRunModelChoice",
    "smartWindowModel",
    "smartWindowEndpoint",
    "smartWindowApiKey",
    "smartWindowPreferencesEndpoint",
  ],
  visible: deps => deps.smartWindowFirstRunModelChoice.value === "0",
  disabled() {
    // Read from input element since setting only updates on Save button
    const endpoint = document
      .getElementById("customModelEndpoint")
      ?.value?.trim();
    return !validateEndpointUrl(endpoint);
  },
  onUserClick(e, deps) {
    const doc = e.target.ownerDocument;
    // TODO: (bug 2014287) Utilize ways of handling the input changes instead of using document.getElementById()
    const modelName =
      doc.getElementById("customModelName")?.value?.trim() || "";
    const modelEndpoint =
      doc.getElementById("customModelEndpoint")?.value?.trim() || "";
    const modelAuthToken =
      doc.getElementById("customModelAuthToken")?.value?.trim() || "";

    if (!validateEndpointUrl(modelEndpoint)) {
      console.warn("For custom setting URL must be HTTPS or localhost");
      e.target.disabled = true;
      return;
    }

    // custom uses .model pref
    deps.smartWindowModel.value = modelName;
    deps.smartWindowEndpoint.value = modelEndpoint;
    deps.smartWindowApiKey.value = modelAuthToken;
    // Update backup custom endpoint when saving
    deps.smartWindowPreferencesEndpoint.value = modelEndpoint;
  },
});

Preferences.addSetting({ id: "learnFromActivityWrapper" });
Preferences.addSetting({
  id: "learnFromActivity",
  pref: "browser.smartwindow.memories",
});

Preferences.addSetting({
  id: "manageMemoriesButton",
  onUserClick(e) {
    e.preventDefault();
    window.gotoPref("manageMemories");
  },
});

Preferences.addSetting({ id: "memories" });

Preferences.addSetting({
  id: "memory-item",
  onUserClick(e) {
    const action = e.target.getAttribute("action");
    const memoryId = e.target.getAttribute("memoryId");
    if (action === "delete") {
      lazy.MemoryStore.hardDeleteMemory(memoryId);
    }
  },
});

Preferences.addSetting({
  id: "deleteAllMemoriesButton",
  async onUserClick() {
    const memories = await lazy.MemoryStore.getMemories();
    if (!memories.length) {
      return;
    }

    const [title, message, deleteButton, cancelButton] =
      await document.l10n.formatValues([
        { id: "ai-window-delete-all-memories-title" },
        { id: "ai-window-delete-all-memories-message" },
        { id: "ai-window-delete-all-memories-confirm" },
        { id: "ai-window-delete-all-memories-cancel" },
      ]);

    const buttonFlags =
      Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING +
      Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_IS_STRING +
      Services.prompt.BUTTON_POS_0_DEFAULT;

    const result = await Services.prompt.asyncConfirmEx(
      window.browsingContext,
      Services.prompt.MODAL_TYPE_CONTENT,
      title,
      message,
      buttonFlags,
      deleteButton,
      cancelButton,
      null,
      null,
      false,
      {
        useTitle: true,
        headerIconCSSValue: CommonDialog.DEFAULT_APP_ICON_CSS,
      }
    );

    if (result.get("buttonNumClicked") === 0) {
      for (const memory of memories) {
        try {
          await lazy.MemoryStore.hardDeleteMemory(memory.id);
        } catch (err) {
          console.error("Failed to delete memory:", memory.id, err);
        }
      }
    }
  },
});

Preferences.addSetting({ id: "no-memories-stored" });
Preferences.addSetting({ id: "memories-list-header" });

Preferences.addSetting(
  class extends Preferences.AsyncSetting {
    static id = "memoriesList";

    setup() {
      Services.obs.addObserver(this.emitChange, "memory-store-changed");
      Services.prefs.addObserver(
        "browser.smartwindow.memories",
        this.emitChange
      );
      return () => {
        Services.obs.removeObserver(this.emitChange, "memory-store-changed");
        Services.prefs.removeObserver(
          "browser.smartwindow.memories",
          this.emitChange
        );
      };
    }

    async getMemories() {
      return lazy.MemoryStore.getMemories();
    }

    async getControlConfig() {
      const memories = await this.getMemories();
      const isLearningEnabled = Services.prefs.getBoolPref(
        "browser.smartwindow.memories",
        false
      );

      if (!memories.length) {
        return {
          items: [
            {
              id: "no-memories-stored",
              l10nId: isLearningEnabled
                ? "ai-window-no-memories"
                : "ai-window-no-memories-learning-off",
              control: "placeholder-message",
            },
          ],
        };
      }

      return {
        items: [
          {
            id: "memories-list-header",
            control: "moz-box-item",
            items: [
              {
                id: "deleteAllMemoriesButton",
                control: "moz-button",
                l10nId: "ai-window-delete-all-memories-button",
                iconSrc: "chrome://global/skin/icons/delete.svg",
              },
            ],
          },
          ...memories.map((memory, index) => ({
            id: `memory-item`,
            key: `memory-${index}`,
            control: "moz-box-item",
            controlAttrs: {
              ".label": memory.memory_summary,
            },
            options: [
              {
                control: "moz-button",
                iconSrc: "chrome://global/skin/icons/delete.svg",
                l10nId: "ai-window-memory-delete-button",
                l10nArgs: { label: memory.memory_summary },
                controlAttrs: {
                  slot: "actions-start",
                  action: "delete",
                  memoryId: memory.id,
                },
              },
            ],
          })),
        ],
      };
    }
  }
);

SettingGroupManager.registerGroups({
  aiControlsDescription: {
    card: "never",
    items: [
      {
        id: "aiControlsDescription",
        control: "moz-card",
        controlAttrs: {
          class: "ai-controls-description",
        },
        options: [
          {
            control: "p",
            options: [
              {
                control: "span",
                l10nId: "preferences-ai-controls-description",
              },
              {
                control: "span",
                controlAttrs: {
                  ".textContent": " ",
                },
              },
              {
                control: "a",
                controlAttrs: {
                  is: "moz-support-link",
                  "support-page": "firefox-ai-controls",
                },
              },
            ],
          },
          {
            control: "img",
            controlAttrs: {
              src: "chrome://browser/skin/preferences/fox-ai.svg",
            },
          },
        ],
      },
    ],
  },
  aiStatesDescription: {
    card: "never",
    items: [
      {
        id: "aiStatesDescription",
        control: "footer",
        controlAttrs: {
          class: "text-deemphasized",
        },
        options: [
          {
            control: "span",
            l10nId: "preferences-ai-controls-state-description-before",
          },
          {
            control: "ul",
            options: [
              {
                control: "li",
                l10nId: "preferences-ai-controls-state-description-available",
              },
              {
                control: "li",
                l10nId: "preferences-ai-controls-state-description-enabled",
              },
              {
                control: "li",
                l10nId: "preferences-ai-controls-state-description-blocked",
              },
            ],
          },
        ],
      },
    ],
  },
  aiFeatures: {
    card: "always",
    items: [
      {
        id: "blockAiGroup",
        control: "moz-box-item",
        items: [
          {
            id: "aiControlDefaultToggle",
            l10nId: "preferences-ai-controls-block-ai",
            control: "moz-toggle",
            controlAttrs: {
              headinglevel: 2,
              inputlayout: "inline-end",
            },
            options: [
              {
                l10nId: "preferences-ai-controls-block-ai-description",
                control: "span",
                slot: "description",
                options: [
                  {
                    control: "a",
                    controlAttrs: {
                      "data-l10n-name": "link",
                      "support-page": "firefox-ai-controls",
                      is: "moz-support-link",
                    },
                  },
                ],
              },
            ],
          },
          {
            id: "aiBlockedMessage",
            control: "moz-message-bar",
            l10nId: "preferences-ai-controls-blocked-message",
          },
        ],
      },
      {
        id: "onDeviceFieldset",
        l10nId: "preferences-ai-controls-on-device-group",
        supportPage: "on-device-models",
        control: "moz-fieldset",
        controlAttrs: {
          headinglevel: 2,
          iconsrc: "chrome://browser/skin/device-desktop.svg",
        },
        items: [
          {
            id: "onDeviceGroup",
            control: "moz-box-group",
            options: [
              {
                control: "moz-box-item",
                items: [
                  {
                    id: "aiControlTranslationsSelect",
                    l10nId: "preferences-ai-controls-translations-control",
                    control: "moz-select",
                    controlAttrs: {
                      inputlayout: "inline-end",
                    },
                    options: [
                      ...AI_CONTROL_OPTIONS.filter(
                        opt => opt.value != AiControlStates.enabled
                      ),
                      {
                        control: "a",
                        l10nId:
                          "preferences-ai-controls-translations-more-link",
                        slot: "support-link",
                        controlAttrs: {
                          href: "#general-translations",
                        },
                      },
                    ],
                  },
                ],
              },
              {
                control: "moz-box-item",
                items: [
                  {
                    id: "aiControlPdfjsAltTextSelect",
                    l10nId: "preferences-ai-controls-pdfjs-control",
                    control: "moz-select",
                    controlAttrs: {
                      inputlayout: "inline-end",
                    },
                    supportPage: "pdf-alt-text",
                    options: [...AI_CONTROL_OPTIONS],
                  },
                ],
              },
              {
                control: "moz-box-item",
                items: [
                  {
                    id: "aiControlSmartTabGroupsSelect",
                    l10nId:
                      "preferences-ai-controls-tab-group-suggestions-control",
                    control: "moz-select",
                    controlAttrs: {
                      inputlayout: "inline-end",
                    },
                    supportPage: "how-use-ai-enhanced-tab-groups",
                    options: [...AI_CONTROL_OPTIONS],
                  },
                ],
              },
              {
                control: "moz-box-item",
                items: [
                  {
                    id: "aiControlLinkPreviewKeyPointsSelect",
                    l10nId: "preferences-ai-controls-key-points-control",
                    control: "moz-select",
                    controlAttrs: {
                      inputlayout: "inline-end",
                    },
                    supportPage: "use-link-previews-firefox",
                    options: [...AI_CONTROL_OPTIONS],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "smartWindowFieldset",
        l10nId: "ai-window-features-group",
        control: "moz-fieldset",
        controlAttrs: {
          headinglevel: 2,
        },
        items: [
          {
            id: "aiFeaturesSmartWindowGroup",
            control: "moz-box-group",
            items: [
              {
                id: "activateSmartWindowLink",
                l10nId: "ai-window-activate-link",
                control: "moz-box-link",
              },
              {
                id: "personalizeSmartWindowButton",
                l10nId: "ai-window-personalize-button",
                control: "moz-box-button",
              },
            ],
          },
        ],
      },
      {
        id: "sidebarChatbotFieldset",
        control: "moz-fieldset",
        l10nId: "preferences-ai-controls-sidebar-chatbot-group",
        supportPage: "ai-chatbot",
        controlAttrs: {
          headinglevel: 2,
          iconsrc: "chrome://browser/skin/sidebars.svg",
        },
        items: [
          {
            id: "chatbotProviderItem",
            control: "moz-box-item",
            items: [
              {
                id: "aiControlSidebarChatbotSelect",
                l10nId: "preferences-ai-controls-sidebar-chatbot-control",
                control: "moz-select",
                controlAttrs: {
                  inputlayout: "inline-end",
                },
                options: [
                  {
                    l10nId: "preferences-ai-controls-state-available",
                    value: AiControlStates.available,
                  },
                  {
                    l10nId: "preferences-ai-controls-state-blocked",
                    value: AiControlStates.blocked,
                  },
                  { control: "hr" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  assistantModelGroup: {
    l10nId: "smart-window-model-section",
    headingLevel: 2,
    supportPage: "smart-window-model",
    items: [
      {
        id: "modelSelection",
        control: "moz-radio-group",
        options: [
          {
            value: "1",
            l10nId: "smart-window-model-fast",
            l10nArgs: { modelName: "gemini-flash-lite" },
          },
          {
            value: "2",
            l10nId: "smart-window-model-flexible",
            l10nArgs: { modelName: "Qwen3-235B-A22B-throughput" },
          },
          {
            value: "3",
            l10nId: "smart-window-model-personal",
            l10nArgs: { modelName: "gpt-oss-120b" },
          },
          {
            value: "0",
            l10nId: "smart-window-model-custom",
            items: [
              {
                id: "customModelName",
                l10nId: "smart-window-model-custom-name",
                control: "moz-input-text",
              },
              {
                id: "customModelEndpoint",
                l10nId: "smart-window-model-custom-url",
                control: "moz-input-url",
              },
              {
                id: "customModelAuthToken",
                l10nId: "smart-window-model-custom-token",
                control: "moz-input-password",
              },
              {
                id: "customModelHelpLink",
                control: "moz-message-bar",
                l10nId: "smart-window-model-custom-help",
                controlAttrs: {
                  type: "info",
                },
                options: [
                  {
                    control: "a",
                    l10nId: "smart-window-model-custom-more-link",
                    slot: "support-link",
                    controlAttrs: {
                      href: "",
                    },
                  },
                ],
              },
              {
                id: "customModelSaveButton",
                control: "moz-button",
                l10nId: "smart-window-model-custom-save",
                controlAttrs: {
                  type: "primary",
                },
              },
            ],
          },
        ],
      },
    ],
  },
  memoriesGroup: {
    l10nId: "ai-window-memories-section",
    headingLevel: 2,
    // TODO: Finalize SUMO support page slug (GENAI-3016)
    supportPage: "smart-window-memories",
    items: [
      {
        id: "memories",
        control: "moz-box-group",
        items: [
          {
            id: "learnFromActivityWrapper",
            control: "moz-box-item",
            items: [
              {
                id: "learnFromActivity",
                l10nId: "ai-window-learn-from-activity",
                control: "moz-checkbox",
              },
            ],
          },
          {
            id: "manageMemoriesButton",
            l10nId: "ai-window-manage-memories-button",
            control: "moz-box-button",
          },
        ],
      },
    ],
  },
  manageMemories: {
    items: [
      {
        id: "memoriesList",
        control: "moz-box-group",
        controlAttrs: {
          type: "list",
        },
      },
    ],
  },
});

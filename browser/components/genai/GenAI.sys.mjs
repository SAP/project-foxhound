/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  ASRouterTargeting: "resource:///modules/asrouter/ASRouterTargeting.sys.mjs",
  EveryWindow: "resource:///modules/EveryWindow.sys.mjs",
  ExperimentAPI: "resource://nimbus/ExperimentAPI.sys.mjs",
  NimbusFeatures: "resource://nimbus/ExperimentAPI.sys.mjs",
  PrefUtils: "resource://normandy/lib/PrefUtils.sys.mjs",
});
ChromeUtils.defineLazyGetter(
  lazy,
  "l10n",
  () => new Localization(["browser/genai.ftl"])
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatEnabled",
  "browser.ml.chat.enabled",
  null,
  (_pref, _old, val) => onChatEnabledChange(val)
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatHideFromLabs",
  "browser.ml.chat.hideFromLabs",
  false
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatHideLabsShortcuts",
  "browser.ml.chat.hideLabsShortcuts",
  false
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatHideLocalhost",
  "browser.ml.chat.hideLocalhost",
  null,
  reorderChatProviders
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatNimbus",
  "browser.ml.chat.nimbus"
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatOpenSidebarOnProviderChange",
  "browser.ml.chat.openSidebarOnProviderChange",
  true
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatPromptPrefix",
  "browser.ml.chat.prompt.prefix"
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatProvider",
  "browser.ml.chat.provider",
  null,
  (_pref, _old, val) => onChatProviderChange(val)
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatProviders",
  "browser.ml.chat.providers",
  "claude,chatgpt,gemini,huggingchat,lechat",
  reorderChatProviders
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatShortcuts",
  "browser.ml.chat.shortcuts",
  null,
  (_pref, _old, val) => onChatShortcutsChange(val)
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatShortcutsCustom",
  "browser.ml.chat.shortcuts.custom"
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "chatSidebar",
  "browser.ml.chat.sidebar"
);

export const GenAI = {
  // Cache of potentially localized prompt
  chatPromptPrefix: "",

  // Any chat provider can be used and those that match the URLs in this object
  // will allow for additional UI shown such as populating dropdown with a name,
  // showing links, and other special behaviors needed for individual providers.
  chatProviders: new Map([
    // Until bug 1903900 to better handle max length issues, track in comments
    // ~14k max length uri before 431
    [
      "https://claude.ai/new",
      {
        id: "claude",
        link1:
          "https://www.anthropic.com/legal/archive/6370fb23-12ed-41d9-a4a2-28866dee3105",
        link2:
          "https://www.anthropic.com/legal/archive/7197103a-5e27-4ee4-93b1-f2d4c39ba1e7",
        link3:
          "https://www.anthropic.com/legal/archive/628feec9-7df9-4d38-bc69-fbf104df47b0",
        linksId: "genai-settings-chat-claude-links",
        name: "Anthropic Claude",
      },
    ],
    // ~14k max length uri before 431
    [
      "https://chatgpt.com",
      {
        id: "chatgpt",
        link1: "https://openai.com/terms",
        link2: "https://openai.com/privacy",
        linksId: "genai-settings-chat-chatgpt-links",
        name: "ChatGPT",
      },
    ],
    // ~4k max length uri before 400
    [
      "https://www.bing.com/chat?sendquery=1",
      {
        id: "copilot",
        link1: "https://www.bing.com/new/termsofuse",
        link2: "https://go.microsoft.com/fwlink/?LinkId=521839",
        linksId: "genai-settings-chat-copilot-links",
        name: "Copilot",
      },
    ],
    // ~20k max length uri before 400
    // ~55k max header (no ?q=) before 413
    [
      "https://gemini.google.com",
      {
        header: "X-Firefox-Gemini",
        id: "gemini",
        link1: "https://policies.google.com/terms",
        link2: "https://policies.google.com/terms/generative-ai/use-policy",
        link3: "https://support.google.com/gemini?p=privacy_notice",
        linksId: "genai-settings-chat-gemini-links",
        name: "Google Gemini",
      },
    ],
    // ~8k max length uri before 413
    [
      "https://huggingface.co/chat",
      {
        id: "huggingchat",
        link1: "https://huggingface.co/chat/privacy",
        link2: "https://huggingface.co/privacy",
        linksId: "genai-settings-chat-huggingchat-links",
        name: "HuggingChat",
      },
    ],
    // ~4k max length uri before 502
    [
      "https://chat.mistral.ai/chat",
      {
        id: "lechat",
        link1: "https://mistral.ai/terms/#terms-of-service-le-chat",
        link2: "https://mistral.ai/terms/#privacy-policy",
        linksId: "genai-settings-chat-lechat-links",
        name: "Le Chat Mistral",
      },
    ],
    // 8k max length uri before 414
    [
      "http://localhost:8080",
      {
        id: "localhost",
        link1: "https://llamafile.ai",
        linksId: "genai-settings-chat-localhost-links",
        name: "localhost",
      },
    ],
  ]),

  /**
   * Handle startup tasks like telemetry, adding listeners.
   */
  init() {
    // Access getters for side effects of observing pref changes
    lazy.chatEnabled;
    lazy.chatHideLocalhost;
    lazy.chatProvider;
    lazy.chatProviders;
    lazy.chatShortcuts;

    // Apply initial ordering of providers
    reorderChatProviders();

    // Handle nimbus feature pref setting
    const featureId = "chatbot";
    lazy.NimbusFeatures[featureId].onUpdate(() => {
      const feature = { featureId };
      const enrollment =
        lazy.ExperimentAPI.getRolloutMetaData(feature) ??
        lazy.ExperimentAPI.getExperimentMetaData(feature);
      if (!enrollment?.slug) {
        return;
      }

      // Set prefs on any branch if we have a new enrollment slug, otherwise
      // only set default branch as those only last for the session
      const anyBranch = enrollment.slug != lazy.chatNimbus;
      const setPref = ([pref, { branch = "user", value = null }]) => {
        if (anyBranch || branch == "default") {
          lazy.PrefUtils.setPref("browser.ml.chat." + pref, value, { branch });
        }
      };
      setPref(["nimbus", { value: enrollment.slug }]);
      Object.entries(
        lazy.NimbusFeatures[featureId].getVariable("prefs")
      ).forEach(setPref);
    });

    // Detect about:preferences to add controls
    Services.obs.addObserver(this, "experimental-pane-loaded");
    // Check existing windows that might have preferences before init
    lazy.EveryWindow.readyWindows.forEach(window => {
      const content = window.gBrowser.selectedBrowser.contentWindow;
      if (content?.location.href.startsWith("about:preferences")) {
        this.buildPreferences(content);
      }
    });

    // Record glean metrics after applying nimbus prefs
    Glean.genaiChatbot.enabled.set(lazy.chatEnabled);
    Glean.genaiChatbot.provider.set(this.getProviderId());
    Glean.genaiChatbot.shortcuts.set(lazy.chatShortcuts);
    Glean.genaiChatbot.shortcutsCustom.set(lazy.chatShortcutsCustom);
    Glean.genaiChatbot.sidebar.set(lazy.chatSidebar);
  },

  uninit() {
    Services.obs.removeObserver(this, "experimental-pane-loaded");
  },

  /**
   * Convert provider to id.
   *
   * @param {string} provider url defaulting to current pref
   * @returns {string} id or custom or none
   */
  getProviderId(provider = lazy.chatProvider) {
    const { id } = this.chatProviders.get(provider) ?? {};
    return id ?? (provider ? "custom" : "none");
  },

  /**
   * Add chat items to menu or popup.
   *
   * @param {MozBrowser} browser providing context
   * @param {string} selection text
   * @param {Function} itemAdder creates and returns the item
   * @param {string} entry name
   * @param {Function} cleanup optional on item activation
   * @returns {object} context used for selecting prompts
   */
  async addAskChatItems(browser, selection, itemAdder, entry, cleanup) {
    // Prepare context used for both targeting and handling prompts
    const window = browser.ownerGlobal;
    const tab = window.gBrowser.getTabForBrowser(browser);
    const uri = browser.currentURI;
    const context = {
      entry,
      provider: lazy.chatProvider,
      selection,
      tabTitle: (tab._labelIsContentTitle && tab.label) || "",
      url: uri.asciiHost + uri.filePath,
      window,
    };

    // Add items that pass along context for handling
    (await this.getContextualPrompts(context)).forEach(promptObj =>
      itemAdder(promptObj).addEventListener("command", () => {
        this.handleAskChat(promptObj, context);
        cleanup?.();
      })
    );
    return context;
  },

  /**
   * Handle messages from content to show or hide shortcuts.
   *
   * @param {string} name of message
   * @param {object} data for the message
   * @param {MozBrowser} browser that provided the message
   */
  handleShortcutsMessage(name, data, browser) {
    if (!lazy.chatEnabled || !lazy.chatShortcuts || lazy.chatProvider == "") {
      return;
    }
    const stack = browser.closest(".browserStack");
    if (!stack) {
      return;
    }

    let shortcuts = stack.querySelector(".content-shortcuts");
    const window = browser.ownerGlobal;
    const { document } = window;
    const popup = document.getElementById("ask-chat-shortcuts");
    const hide = () => {
      if (shortcuts) {
        shortcuts.removeAttribute("shown");
      }
      popup.hidePopup();
    };

    switch (name) {
      case "GenAI:HideShortcuts":
        hide();
        break;
      case "GenAI:ShowShortcuts": {
        // Add shortcuts to the current tab's brower stack if it doesn't exist
        if (!shortcuts) {
          shortcuts = stack.appendChild(document.createElement("div"));
          shortcuts.className = "content-shortcuts";

          // Detect hover to build and open the popup
          shortcuts.addEventListener("mouseover", async () => {
            if (!shortcuts.hasAttribute("active")) {
              shortcuts.toggleAttribute("active");
              const vbox = popup.querySelector("vbox");
              vbox.innerHTML = "";
              const context = await this.addAskChatItems(
                browser,
                shortcuts.selection,
                promptObj => {
                  const button = vbox.appendChild(
                    document.createXULElement("toolbarbutton")
                  );
                  button.className = "subviewbutton";
                  button.setAttribute("tabindex", "0");
                  button.textContent = promptObj.label;
                  return button;
                },
                "shortcuts",
                hide
              );

              // Add custom input box if configured
              if (lazy.chatShortcutsCustom) {
                vbox.appendChild(document.createXULElement("toolbarseparator"));
                const input = vbox.appendChild(document.createElement("input"));
                const provider = this.chatProviders.get(
                  lazy.chatProvider
                )?.name;
                document.l10n.setAttributes(
                  input,
                  provider
                    ? "genai-input-ask-provider"
                    : "genai-input-ask-generic",
                  { provider }
                );
                input.style.margin = "var(--arrowpanel-menuitem-margin)";
                input.addEventListener("mouseover", () => input.focus());
                input.addEventListener("change", () => {
                  this.handleAskChat({ value: input.value }, context);
                  hide();
                });
              }

              popup.openPopup(shortcuts);
              popup.addEventListener(
                "popuphidden",
                () => shortcuts.removeAttribute("active"),
                { once: true }
              );
              Glean.genaiChatbot.shortcutsExpanded.record({
                selection: shortcuts.selection.length,
              });
            }
          });
        }

        // Save the latest selection so it can be used by popup
        shortcuts.selection = data.selection;
        if (shortcuts.hasAttribute("shown")) {
          return;
        }

        shortcuts.toggleAttribute("shown");
        Glean.genaiChatbot.shortcutsDisplayed.record({
          delay: data.delay,
          selection: data.selection.length,
        });

        // Position the shortcuts relative to the browser's top-left corner
        const rect = browser.getBoundingClientRect();
        shortcuts.style.setProperty(
          "--shortcuts-x",
          data.x - window.screenX - rect.x + "px"
        );
        shortcuts.style.setProperty(
          "--shortcuts-y",
          data.y - window.screenY - rect.y + "px"
        );
        break;
      }
    }
  },

  /**
   * Build prompts menu to ask chat for context menu.
   *
   * @param {MozMenu} menu element to update
   * @param {nsContextMenu} nsContextMenu helpers for context menu
   */
  async buildAskChatMenu(menu, nsContextMenu) {
    nsContextMenu.showItem(menu, false);
    if (!lazy.chatEnabled || lazy.chatProvider == "") {
      return;
    }
    const provider = this.chatProviders.get(lazy.chatProvider)?.name;
    menu.ownerDocument.l10n.setAttributes(
      menu,
      provider ? "genai-menu-ask-provider" : "genai-menu-ask-generic",
      { provider }
    );
    menu.menupopup?.remove();
    await this.addAskChatItems(
      nsContextMenu.browser,
      nsContextMenu.selectionInfo.fullText ?? "",
      promptObj => menu.appendItem(promptObj.label),
      "menu"
    );
    nsContextMenu.showItem(menu, menu.itemCount > 0);
  },

  /**
   * Get prompts from prefs evaluated with context
   *
   * @param {object} context data used for targeting
   * @returns {promise} array of matching prompt objects
   */
  async getContextualPrompts(context) {
    // Treat prompt objects as messages to reuse targeting capabilities
    const messages = [];
    const toFormat = [];
    Services.prefs.getChildList("browser.ml.chat.prompts.").forEach(pref => {
      try {
        const promptObj = {
          label: Services.prefs.getStringPref(pref),
          targeting: "true",
          value: "",
        };
        try {
          // Prompts can be JSON with label, value, targeting and other keys
          Object.assign(promptObj, JSON.parse(promptObj.label));

          // Ignore provided id (if any) for modified prefs
          if (Services.prefs.prefHasUserValue(pref)) {
            promptObj.id = null;
          }
        } catch (ex) {}
        messages.push(promptObj);
        if (promptObj.l10nId) {
          toFormat.push(promptObj);
        }
      } catch (ex) {
        console.error("Failed to get prompt pref " + pref, ex);
      }
    });

    // Apply localized attributes for prompts
    (await lazy.l10n.formatMessages(toFormat.map(obj => obj.l10nId))).forEach(
      (msg, idx) =>
        msg?.attributes.forEach(attr => (toFormat[idx][attr.name] = attr.value))
    );

    return lazy.ASRouterTargeting.findMatchingMessage({
      messages,
      returnAll: true,
      trigger: { context },
    });
  },

  /**
   * Updates chat prompt prefix.
   */
  async prepareChatPromptPrefix() {
    if (
      !this.chatPromptPrefix ||
      this.chatLastPrefix != lazy.chatPromptPrefix
    ) {
      try {
        // Check json for localized prefix
        const prefixObj = JSON.parse(lazy.chatPromptPrefix);
        this.chatPromptPrefix = (
          await lazy.l10n.formatMessages([
            {
              id: prefixObj.l10nId,
              args: { tabTitle: "%tabTitle%", selection: "%selection|12000%" },
            },
          ])
        )[0].value;
      } catch (ex) {
        // Treat as plain text prefix
        this.chatPromptPrefix = lazy.chatPromptPrefix;
      }
      if (this.chatPromptPrefix) {
        this.chatPromptPrefix += "\n\n";
      }
      this.chatLastPrefix = lazy.chatPromptPrefix;
    }
  },

  /**
   * Build a prompt with context.
   *
   * @param {MozMenuItem} item Use value falling back to label
   * @param {object} context Placeholder keys with values to replace
   * @returns {string} Prompt with placeholders replaced
   */
  buildChatPrompt(item, context = {}) {
    // Combine prompt prefix with the item then replace placeholders from the
    // original prompt (and not from context)
    return (this.chatPromptPrefix + (item.value || item.label)).replace(
      // Handle %placeholder% as key|options
      /\%(\w+)(?:\|([^%]+))?\%/g,
      (placeholder, key, options) =>
        // Currently only supporting numeric options for slice with `undefined`
        // resulting in whole string
        context[key]?.slice(0, options) ?? placeholder
    );
  },

  /**
   * Handle selected prompt by opening tab or sidebar.
   *
   * @param {object} promptObj to convert to string
   * @param {object} context of how the prompt should be handled
   */
  async handleAskChat(promptObj, context) {
    Glean.genaiChatbot[
      context.entry == "menu"
        ? "contextmenuPromptClick"
        : "shortcutsPromptClick"
    ].record({
      prompt: promptObj.id ?? "custom",
      provider: this.getProviderId(),
      selection: context.selection?.length ?? 0,
    });

    await this.prepareChatPromptPrefix();
    const prompt = this.buildChatPrompt(promptObj, context);

    // Pass the prompt via GET url ?q= param or request header
    const { header } = this.chatProviders.get(lazy.chatProvider) ?? {};
    const url = new URL(lazy.chatProvider);
    const options = {
      inBackground: false,
      relatedToCurrent: true,
      triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal(
        {}
      ),
    };
    if (header) {
      options.headers = Cc[
        "@mozilla.org/io/string-input-stream;1"
      ].createInstance(Ci.nsIStringInputStream);
      options.headers.data = `${header}: ${encodeURIComponent(prompt)}\r\n`;
    } else {
      url.searchParams.set("q", prompt);
    }

    // Get the desired browser to handle the prompt url request
    let browser;
    if (lazy.chatSidebar) {
      const { SidebarController } = context.window;
      await SidebarController.show("viewGenaiChatSidebar");
      browser = await SidebarController.browser.contentWindow.browserPromise;
    } else {
      browser = context.window.gBrowser.addTab("", options).linkedBrowser;
    }
    browser.fixupAndLoadURIString(url, options);
  },

  /**
   * Build preferences for chat such as handling providers.
   *
   * @param {Window} window for about:preferences
   */
  buildPreferences({ document, Preferences }) {
    // Section can be hidden by featuregate targeting
    const providerEl = document.getElementById("genai-chat-provider");
    if (!providerEl) {
      return;
    }

    // Some experiments might want to hide shortcuts
    const shortcutsEl = document.getElementById("genai-chat-shortcuts");
    if (lazy.chatHideLabsShortcuts || lazy.chatHideFromLabs) {
      shortcutsEl.remove();
    }

    // Page can load (restore at startup) just before default prefs apply
    if (lazy.chatHideFromLabs) {
      providerEl.parentNode.remove();
      document.getElementById("genai-chat").remove();
      return;
    }

    const enabled = Preferences.get("browser.ml.chat.enabled");
    const onEnabledChange = () => {
      providerEl.disabled = !enabled.value;
      shortcutsEl.disabled = !enabled.value;

      // Update enabled telemetry
      Glean.genaiChatbot.enabled.set(enabled.value);
      if (onEnabledChange.canChange) {
        Glean.genaiChatbot.experimentCheckboxClick.record({
          enabled: enabled.value,
        });
      }
      onEnabledChange.canChange = true;
    };
    onEnabledChange();
    enabled.on("change", onEnabledChange);

    // Populate providers and hide from list if necessary
    this.chatProviders.forEach((data, url) => {
      providerEl.appendItem(data.name, url).hidden = data.hidden ?? false;
    });
    const provider = Preferences.add({
      id: "browser.ml.chat.provider",
      type: "string",
    });
    let customItem;
    const onProviderChange = () => {
      // Add/update the Custom entry if it's not a default provider entry
      if (provider.value && !this.chatProviders.has(provider.value)) {
        if (!customItem) {
          customItem = providerEl.appendItem();
        }
        customItem.label = `Custom (${provider.value})`;
        customItem.value = provider.value;

        // Select the item if the preference changed not via menu
        providerEl.selectedItem = customItem;
      }

      // Update potentially multiple links for the provider
      const links = document.getElementById("genai-chat-links");
      const providerData = this.chatProviders.get(provider.value);
      for (let i = 1; i <= 3; i++) {
        const name = `link${i}`;
        let link = links.querySelector(`[data-l10n-name=${name}]`);
        const href = providerData?.[name];
        if (href) {
          if (!link) {
            link = links.appendChild(document.createElement("a"));
            link.dataset.l10nName = name;
            link.target = "_blank";
          }
          link.href = href;
        } else {
          link?.remove();
        }
      }
      document.l10n.setAttributes(
        links,
        providerData?.linksId ?? "genai-settings-chat-links"
      );

      // Update provider telemetry
      const providerId = this.getProviderId(provider.value);
      Glean.genaiChatbot.provider.set(providerId);
      if (onProviderChange.lastId && document.hasFocus()) {
        Glean.genaiChatbot.providerChange.record({
          current: providerId,
          previous: onProviderChange.lastId,
          surface: "settings",
        });
      }
      onProviderChange.lastId = providerId;
    };
    onProviderChange();
    provider.on("change", onProviderChange);

    const shortcuts = Preferences.add({
      id: "browser.ml.chat.shortcuts",
      type: "bool",
    });
    const onShortcutsChange = () => {
      // Update shortcuts telemetry
      Glean.genaiChatbot.shortcuts.set(shortcuts.value);
      if (onShortcutsChange.canChange) {
        Glean.genaiChatbot.shortcutsCheckboxClick.record({
          enabled: shortcuts.value,
        });
      }
      onShortcutsChange.canChange = true;
    };
    onShortcutsChange();
    shortcuts.on("change", onShortcutsChange);
  },

  // nsIObserver
  observe(window) {
    this.buildPreferences(window);
  },
};

/**
 * Ensure the chat sidebar get closed.
 *
 * @param {bool} value New pref value
 */
function onChatEnabledChange(value) {
  if (!value) {
    lazy.EveryWindow.readyWindows.forEach(({ SidebarController }) => {
      if (
        SidebarController.isOpen &&
        SidebarController.currentID == "viewGenaiChatSidebar"
      ) {
        SidebarController.hide();
      }
    });
  }
}

/**
 * Ensure the chat sidebar is shown to reflect changed provider.
 *
 * @param {string} value New pref value
 */
function onChatProviderChange(value) {
  if (value && lazy.chatEnabled && lazy.chatOpenSidebarOnProviderChange) {
    Services.wm
      .getMostRecentWindow("navigator:browser")
      ?.SidebarController.show("viewGenaiChatSidebar");
  }
}

/**
 * Ensure the chat shortcuts get hidden.
 *
 * @param {bool} value New pref value
 */
function onChatShortcutsChange(value) {
  if (!value) {
    lazy.EveryWindow.readyWindows.forEach(window =>
      window.document
        .querySelectorAll(".content-shortcuts")
        .forEach(shortcuts => shortcuts.removeAttribute("shown"))
    );
  }
}

/**
 * Update the ordering of chat providers Map.
 */
function reorderChatProviders() {
  // Figure out which providers to include in order
  const ordered = lazy.chatProviders.split(",");
  if (!lazy.chatHideLocalhost) {
    ordered.push("localhost");
  }

  // Convert the url keys to lookup by id
  const idToKey = new Map([...GenAI.chatProviders].map(([k, v]) => [v.id, k]));

  // Remove providers in the desired order and make them shown
  const toSet = [];
  ordered.forEach(id => {
    const key = idToKey.get(id);
    const val = GenAI.chatProviders.get(key);
    if (val) {
      val.hidden = false;
      toSet.push([key, val]);
      GenAI.chatProviders.delete(key);
    }
  });

  // Hide unremoved providers before re-adding visible ones in order
  GenAI.chatProviders.forEach(val => (val.hidden = true));
  toSet.forEach(args => GenAI.chatProviders.set(...args));
}

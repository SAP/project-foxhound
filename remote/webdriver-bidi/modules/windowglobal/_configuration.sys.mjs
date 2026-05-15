/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { WindowGlobalBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/WindowGlobalBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ContextDescriptorType:
    "chrome://remote/content/shared/messagehandler/MessageHandler.sys.mjs",
  RootMessageHandler:
    "chrome://remote/content/shared/messagehandler/RootMessageHandler.sys.mjs",
  WindowGlobalMessageHandler:
    "chrome://remote/content/shared/messagehandler/WindowGlobalMessageHandler.sys.mjs",
});

/**
 * Internal module to set the configuration on the newly created navigables.
 */
class _ConfigurationModule extends WindowGlobalBiDiModule {
  #geolocationConfiguration;
  #preloadScripts;
  #resolveBlockerPromise;

  constructor(messageHandler) {
    super(messageHandler);

    this.#geolocationConfiguration = undefined;
    this.#preloadScripts = new Set();

    Services.obs.addObserver(this, "content-document-global-created");
  }

  destroy() {
    // Unblock the document parsing.
    if (this.#resolveBlockerPromise) {
      this.#resolveBlockerPromise();
    }

    Services.obs.removeObserver(this, "content-document-global-created");

    this.#preloadScripts = null;
    this.#geolocationConfiguration = undefined;
  }

  async observe(subject, topic) {
    if (topic === "content-document-global-created") {
      const window = subject;
      // Ignore events without a window.
      if (window !== this.messageHandler.window) {
        return;
      }

      // Do nothing if there is no configuration to apply.
      if (
        this.#preloadScripts.size === 0 &&
        this.#geolocationConfiguration === undefined
      ) {
        this.#onConfigurationComplete(window);
        return;
      }

      // Block document parsing.
      const blockerPromise = new Promise(resolve => {
        this.#resolveBlockerPromise = resolve;
      });
      window.document.blockParsing(blockerPromise);

      if (this.#geolocationConfiguration !== undefined) {
        await this.messageHandler.handleCommand({
          moduleName: "emulation",
          commandName: "_setGeolocationOverride",
          destination: {
            type: lazy.WindowGlobalMessageHandler.type,
            id: this.messageHandler.context.id,
          },
          params: {
            coordinates: this.#geolocationConfiguration,
          },
        });
      }

      if (this.#preloadScripts.size !== 0) {
        await this.messageHandler.handleCommand({
          moduleName: "script",
          commandName: "_evaluatePreloadScripts",
          destination: {
            type: lazy.WindowGlobalMessageHandler.type,
            id: this.messageHandler.context.id,
          },
          params: {
            scripts: this.#preloadScripts,
          },
        });
      }

      // Continue script parsing.
      this.#resolveBlockerPromise();
      this.#onConfigurationComplete(window);
    }
  }

  async #onConfigurationComplete(window) {
    // parser blocking doesn't work for initial about:blank, so ensure
    // browsing_context.create waits for configuration to complete
    if (window.document.isInitialDocument) {
      await this.messageHandler.forwardCommand({
        moduleName: "browsingContext",
        commandName: "_onConfigurationComplete",
        destination: {
          type: lazy.RootMessageHandler.type,
        },
        params: {
          navigable: this.messageHandler.context,
        },
      });
    }
  }

  #updatePreloadScripts(sessionData) {
    this.#preloadScripts.clear();

    for (const { contextDescriptor, value } of sessionData) {
      if (!this.messageHandler.matchesContext(contextDescriptor)) {
        continue;
      }

      this.#preloadScripts.add(value);
    }
  }

  /**
   * Internal commands
   */

  _applySessionData(params) {
    const { category, sessionData } = params;

    if (category === "preload-script") {
      this.#updatePreloadScripts(sessionData);
    }

    // The geolocation override applies only to top-level traversables.
    if (
      category === "geolocation-override" &&
      !this.messageHandler.context.parent
    ) {
      let geolocationOverridePerContext = null;
      let geolocationOverridePerUserContext = null;

      for (const { contextDescriptor, value } of sessionData) {
        if (!this.messageHandler.matchesContext(contextDescriptor)) {
          continue;
        }

        switch (contextDescriptor.type) {
          case lazy.ContextDescriptorType.TopBrowsingContext: {
            geolocationOverridePerContext = value;
            break;
          }
          case lazy.ContextDescriptorType.UserContext: {
            geolocationOverridePerUserContext = value;
            break;
          }
        }
      }

      // For the geolocation emulations on the previous step, we found session items
      // that would apply an override for a browsing context,a user context, and in some cases globally.
      // Now from these items we have to choose the one that would take precedence.
      // The order is the user context item overrides the global one, and the browsing context overrides the user context item.
      if (
        typeof geolocationOverridePerContext === "object" &&
        geolocationOverridePerContext !== null
      ) {
        this.#geolocationConfiguration = geolocationOverridePerContext;
      } else if (
        typeof geolocationOverridePerUserContext === "object" &&
        geolocationOverridePerUserContext !== null
      ) {
        this.#geolocationConfiguration = geolocationOverridePerUserContext;
      }
    }
  }
}

export const _configuration = _ConfigurationModule;

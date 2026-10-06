/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  EventPromise: "chrome://remote/content/shared/Sync.sys.mjs",
  PromptListener:
    "chrome://remote/content/shared/listeners/PromptListener.sys.mjs",
  TabManager: "chrome://remote/content/shared/TabManager.sys.mjs",
  UserPromptType:
    "chrome://remote/content/webdriver-bidi/modules/root/browsingContext.sys.mjs",
});

export class UserPromptHandlerManager {
  #handler;
  #promptListener;

  constructor(handler) {
    this.#handler = handler;

    this.#promptListener = new lazy.PromptListener();
    this.#promptListener.on("opened", this.#onPromptOpened);
    this.#promptListener.startListening();
  }

  destroy() {
    this.#promptListener.stopListening();

    this.#promptListener.off("opened", this.#onPromptOpened);
    this.#promptListener.destroy();

    this.#handler = null;
  }

  #onPromptOpened = async (eventName, data) => {
    const { browsingContext, prompt } = data;
    const { promptType } = prompt;
    const type = promptType === "beforeunload" ? "beforeUnload" : promptType;

    const handlerConfig = this.#handler.getPromptHandler(type);
    const { handler } = handlerConfig;

    if (promptType in lazy.UserPromptType && handler !== "ignore") {
      const tab = lazy.TabManager.getTabForBrowsingContext(browsingContext);
      const window = lazy.TabManager.getWindowForTab(tab);

      const closePrompt = async callback => {
        const dialogClosed = new lazy.EventPromise(
          window,
          "DOMModalDialogClosed"
        );
        callback();
        await dialogClosed;
      };

      if (type === "alert" || handler === "accept") {
        await closePrompt(() => prompt.accept());
      } else {
        await closePrompt(() => prompt.dismiss());
      }
    }
  };
}

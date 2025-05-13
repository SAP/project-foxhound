/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AppInfo: "chrome://remote/content/shared/AppInfo.sys.mjs",
  Log: "chrome://remote/content/shared/Log.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () => lazy.Log.get());

const COMMON_DIALOG = "chrome://global/content/commonDialog.xhtml";

/** @namespace */
export const modal = {
  ACTION_CLOSED: "closed",
  ACTION_OPENED: "opened",
};

/**
 * Check for already existing modal or tab modal dialogs and
 * return the first one.
 *
 * @param {browser.Context} context
 *     Reference to the browser context to check for existent dialogs.
 *
 * @returns {modal.Dialog}
 *     Returns instance of the Dialog class, or `null` if no modal dialog
 *     is present.
 */
modal.findPrompt = function (context) {
  // First check if there is a modal dialog already present for the
  // current browser window.
  for (let win of Services.wm.getEnumerator(null)) {
    // TODO: Use BrowserWindowTracker.getTopWindow for modal dialogs without
    // an opener.
    if (
      win.document.documentURI === COMMON_DIALOG &&
      win.opener &&
      win.opener === context.window
    ) {
      lazy.logger.trace("Found open window modal prompt");
      return new modal.Dialog(win);
    }
  }

  if (lazy.AppInfo.isAndroid) {
    const geckoViewPrompts = context.window.prompts();
    if (geckoViewPrompts.length) {
      lazy.logger.trace("Found open GeckoView prompt");
      const prompt = geckoViewPrompts[0];
      return new modal.Dialog(prompt);
    }
  }

  const contentBrowser = context.contentBrowser;

  // If no modal dialog has been found yet, also check for tab and content modal
  // dialogs for the current tab.
  //
  // TODO: Find an adequate implementation for Firefox on Android (bug 1708105)
  if (contentBrowser?.tabDialogBox) {
    let dialogs = contentBrowser.tabDialogBox.getTabDialogManager().dialogs;
    if (dialogs.length) {
      lazy.logger.trace("Found open tab modal prompt");
      return new modal.Dialog(dialogs[0].frameContentWindow);
    }

    dialogs = contentBrowser.tabDialogBox.getContentDialogManager().dialogs;

    // Even with the dialog manager handing back a dialog, the `Dialog` property
    // gets lazily added. If it's not set yet, ignore the dialog for now.
    if (dialogs.length && dialogs[0].frameContentWindow.Dialog) {
      lazy.logger.trace("Found open content prompt");
      return new modal.Dialog(dialogs[0].frameContentWindow);
    }
  }
  return null;
};

/**
 * Represents a modal dialog.
 *
 * @param {DOMWindow} dialog
 *     DOMWindow of the dialog.
 */
modal.Dialog = class {
  #win;

  constructor(dialog) {
    this.#win = Cu.getWeakReference(dialog);
  }

  get args() {
    if (lazy.AppInfo.isAndroid) {
      return this.window.args;
    }
    let tm = this.tabModal;
    return tm ? tm.args : null;
  }

  get isOpen() {
    if (lazy.AppInfo.isAndroid) {
      return this.window !== null;
    }
    if (!this.ui) {
      return false;
    }
    return true;
  }

  get isWindowModal() {
    return [
      Services.prompt.MODAL_TYPE_WINDOW,
      Services.prompt.MODAL_TYPE_INTERNAL_WINDOW,
    ].includes(this.args.modalType);
  }

  get tabModal() {
    return this.window?.Dialog;
  }

  get promptType() {
    return this.args.inPermitUnload ? "beforeunload" : this.args.promptType;
  }

  get ui() {
    let tm = this.tabModal;
    return tm ? tm.ui : null;
  }

  /**
   * For Android, this returns a GeckoViewPrompter, which can be used to control prompts.
   * Otherwise, this returns the ChromeWindow associated with an open dialog window if
   * it is currently attached to the DOM.
   */
  get window() {
    if (this.#win) {
      let win = this.#win.get();
      if (win && (lazy.AppInfo.isAndroid || win.parent)) {
        return win;
      }
    }
    return null;
  }

  set text(inputText) {
    if (lazy.AppInfo.isAndroid) {
      this.window.setInputText(inputText);
    } else {
      // see toolkit/components/prompts/content/commonDialog.js
      let { loginTextbox } = this.ui;
      loginTextbox.value = inputText;
    }
  }

  accept() {
    if (lazy.AppInfo.isAndroid) {
      // GeckoView does not have a UI, so the methods are called directly
      this.window.acceptPrompt();
    } else {
      const { button0 } = this.ui;
      button0.click();
    }
  }

  dismiss() {
    if (lazy.AppInfo.isAndroid) {
      // GeckoView does not have a UI, so the methods are called directly
      this.window.dismissPrompt();
    } else {
      const { button0, button1 } = this.ui;
      (button1 ? button1 : button0).click();
    }
  }

  /**
   * Returns text of the prompt.
   *
   * @returns {string | Promise}
   *     Returns string on desktop and Promise on Android.
   */
  async getText() {
    if (lazy.AppInfo.isAndroid) {
      const textPromise = await this.window.getPromptText();
      return textPromise;
    }
    return this.ui.infoBody.textContent;
  }

  /**
   * Returns text of the prompt input.
   *
   * @returns {string}
   *     Returns string on desktop and Promise on Android.
   */
  async getInputText() {
    if (lazy.AppInfo.isAndroid) {
      const textPromise = await this.window.getInputText();
      return textPromise;
    }
    return this.ui.loginTextbox.value;
  }
};

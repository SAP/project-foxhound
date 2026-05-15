/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This singleton class controls the Unexpected Script Load Dialog.
 */
var UnexpectedScriptLoadPanel = new (class {
  /** @type {Console?} */
  #console;

  /**
   * The URL of the script being handled by the panel.
   *
   * @type {string}
   */
  #scriptName = "";

  get console() {
    if (!this.#console) {
      this.#console = console.createInstance({
        maxLogLevelPref: "browser.unexpectedScriptLoad.logLevel",
        prefix: "UnexpectedScriptLoad",
      });
    }
    return this.#console;
  }

  /**
   * Where the lazy elements are stored.
   *
   * @type {Record<string, Element>?}
   */
  #lazyElements;

  /**
   * Lazily creates the dom elements, and lazily selects them.
   *
   * @returns {Record<string, Element>}
   */
  get elements() {
    if (!this.#lazyElements) {
      this.#lazyElements = {
        dialogCloseButton: document.querySelector(".dialogClose"),
        reportCheckbox: document.querySelector("#reportCheckbox"),
        emailCheckbox: document.querySelector("#emailCheckbox"),
        emailInput: document.querySelector("#emailInput"),
        allowButton: document.querySelector("#allow-button"),
        blockButton: document.querySelector("#block-button"),
        scriptUrl: document.querySelector(".scriptUrl"),
        unexpectedScriptLoadDetail1: document.querySelector(
          "#unexpected-script-load-detail-1"
        ),
        moreInfoLink: document.querySelector("#more-info-link"),
        learnMoreLink: document.querySelector("#learn-more-link"),
        telemetryDisabledMessage: document.querySelector(
          "#telemetry-disabled-message"
        ),
      };
    }

    return this.#lazyElements;
  }

  /**
   * Initializes the panel when the script loads.
   */
  init() {
    this.console?.log("UnexpectedScriptLoadPanel initialized");

    let args = window.arguments[0];
    let action = args.action;
    this.#scriptName = args.scriptName;
    this.elements.scriptUrl.textContent = this.#scriptName;

    let uploadEnabled = Services.prefs.getBoolPref(
      "datareporting.healthreport.uploadEnabled",
      false
    );

    if (action === "allow") {
      this.setupAllowLayout();
      Glean.unexpectedScriptLoad.scriptAllowedOpened.record();
    } else if (action === "block") {
      Glean.unexpectedScriptLoad.scriptBlockedOpened.record();
      this.setupBlockLayout(uploadEnabled);
    }
    this.setupEventHandlers();

    if (uploadEnabled) {
      this.elements.telemetryDisabledMessage.setAttribute("hidden", "true");
    } else {
      this.elements.telemetryDisabledMessage.removeAttribute("hidden");
    }
    this.elements.reportCheckbox.disabled = !uploadEnabled;
    this.elements.emailCheckbox.disabled = !uploadEnabled;
    this.elements.emailInput.disabled = !uploadEnabled;
    this.elements.emailInput.readOnly = !uploadEnabled;
  }

  setupEventHandlers() {
    this.elements.dialogCloseButton.addEventListener("click", () => {
      this.close(true);
    });
    // This is needed because a simple <a> element on the page run afoul
    // of the "Content windows may never have chrome windows as their openers"
    // error, so we use openTrustedLinkIn instead."
    this.elements.moreInfoLink.addEventListener("click", () => {
      this.onLearnMoreLink();
    });
    this.elements.learnMoreLink.addEventListener("click", () => {
      this.onLearnMoreLink();
    });
    this.elements.allowButton.addEventListener("click", () => {
      this.onAllow();
    });
    this.elements.blockButton.addEventListener("click", () => {
      this.onBlock();
    });
    // If the user has filled in their email, but not checked the report checkbox,
    // we automatically check both report checkboxes when the email input loses focus.
    this.elements.emailInput.addEventListener("change", e => {
      const hasEmail = this.elements.emailInput.value.trim() !== "";
      if (!hasEmail) {
        return;
      }

      // If the user has typed in the email field, and clicks the (unchecked)
      // email checkbox, on blur we would set the email checkbox to checked,
      // then the click event would toggle it back to unchecked. So we need to
      // defer the check to the next event loop tick.
      setTimeout(() => {
        this.console?.warn(`Rechecking checkboxes`);
        if (this.elements.emailInput.value.trim()) {
          this.elements.emailCheckbox.checked = true;
          this.elements.reportCheckbox.checked = true;
        }
      }, 0);

      // The email input field is _inside_ the email checkbox, so we need to
      // stop the click event from propagating to the checkbox
      e.stopPropagation();
    });
    // If the user unchecks the report email checkbox, clear the email field
    // This is a little complicated because
    this.elements.emailCheckbox.addEventListener("change", () => {
      if (!this.elements.emailCheckbox.checked) {
        this.elements.emailInput.value = "";
      }
    });
    // If the user unchecks the report checkbox, clear the email field
    this.elements.reportCheckbox.addEventListener("change", () => {
      if (!this.elements.reportCheckbox.checked) {
        this.elements.emailCheckbox.checked = false;
        this.elements.emailInput.value = "";
      }
    });
  }

  setupAllowLayout() {
    this.elements.unexpectedScriptLoadDetail1.setAttribute(
      "data-l10n-id",
      "unexpected-script-load-detail-1-allow"
    );
    this.elements.allowButton.setAttribute("type", "primary");
    this.elements.blockButton.setAttribute("type", "");
  }

  setupBlockLayout(uploadEnabled) {
    this.elements.unexpectedScriptLoadDetail1.setAttribute(
      "data-l10n-id",
      "unexpected-script-load-detail-1-block"
    );
    this.elements.reportCheckbox.checked = uploadEnabled;
    this.elements.allowButton.setAttribute("type", "");
    this.elements.blockButton.setAttribute("type", "primary");
  }

  /**
   * Hide the pop up (for event handlers).
   *
   * @param {boolean} userDismissed
   */
  close(userDismissed) {
    this.console?.log("UnexpectedScriptLoadPanel is closing");
    if (userDismissed) {
      Glean.unexpectedScriptLoad.dialogDismissed.record();
    }
    window.close();
    GleanPings.unexpectedScriptLoad.submit();
  }

  /*
   * Handler for clicking the learn more link from linked text
   * within the translations panel.
   */
  onLearnMoreLink() {
    Glean.unexpectedScriptLoad.moreInfoOpened.record();
    this.close(false);

    // This is an ugly hack.
    // If a modal is open, we will not focus the tab we are opening, even if we ask to
    //  ref: https://searchfox.org/mozilla-central/rev/fcb776c1d580000af961677f6df3aeef67168a6f/browser/components/tabbrowser/content/tabbrowser.js#438
    // However we do not remove the window-modal-open until _after_ the dialog is closed
    // which is after we open the tab.
    //  ref: https://searchfox.org/mozilla-central/rev/fcb776c1d580000af961677f6df3aeef67168a6f/browser/base/content/browser.js#5180
    window.top.document.documentElement.removeAttribute("window-modal-open");

    window.browsingContext.top.window.openTrustedLinkIn(
      "https://support.mozilla.org/kb/unexpected-script-load",
      "tab"
    );
  }

  maybeReport() {
    if (this.elements.reportCheckbox.checked) {
      let extra = {
        script_url: this.#scriptName,
      };

      if (this.elements.emailCheckbox.checked) {
        extra.user_email = this.elements.emailInput.value.trim();
      }

      Glean.unexpectedScriptLoad.scriptReported.record(extra);
    }
  }

  onBlock() {
    this.console?.log("UnexpectedScriptLoadPanel.onBlock() called");
    Glean.unexpectedScriptLoad.scriptBlocked.record();
    this.maybeReport();

    Services.prefs.setBoolPref(
      "security.block_parent_unrestricted_js_loads.temporary",
      true
    );

    window.browsingContext.top.window.gNotificationBox
      .getNotificationWithValue("unexpected-script-notification")
      ?.close();

    Services.obs.notifyObservers(
      null,
      "UnexpectedJavaScriptLoad-UserTookAction"
    );

    this.close(false);
  }

  onAllow() {
    this.console?.log("UnexpectedScriptLoadPanel.onAllow() called");
    Glean.unexpectedScriptLoad.scriptAllowed.record();
    this.maybeReport();

    Services.prefs.setBoolPref(
      "security.allow_parent_unrestricted_js_loads",
      true
    );

    window.browsingContext.top.window.gNotificationBox
      .getNotificationWithValue("unexpected-script-notification")
      ?.close();

    Services.obs.notifyObservers(
      null,
      "UnexpectedJavaScriptLoad-UserTookAction"
    );

    this.close(false);
  }
})();

// Call the init method when the script loads
UnexpectedScriptLoadPanel.init();

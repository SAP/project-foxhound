/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const DEFAULT_NEW_REPORT_ENDPOINT = "https://webcompat.com/issues/new";

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ClientEnvironment: "resource://normandy/lib/ClientEnvironment.sys.mjs",
});

const gDescriptionCheckRE = /\S/;

export class ViewState {
  #doc;
  #mainView;
  #previewView;
  #reportSentView;
  #formElement;
  #reasonOptions;
  #randomizeReasons = false;

  currentTabURI;
  currentTabWebcompatDetailsPromise;

  constructor(doc) {
    this.#doc = doc;
    this.#mainView = doc.ownerGlobal.PanelMultiView.getViewNode(
      this.#doc,
      "report-broken-site-popup-mainView"
    );
    this.#previewView = doc.ownerGlobal.PanelMultiView.getViewNode(
      this.#doc,
      "report-broken-site-popup-previewView"
    );
    this.#reportSentView = doc.ownerGlobal.PanelMultiView.getViewNode(
      this.#doc,
      "report-broken-site-popup-reportSentView"
    );
    this.#formElement = doc.ownerGlobal.PanelMultiView.getViewNode(
      this.#doc,
      "report-broken-site-panel-form"
    );
    ViewState.#cache.set(doc, this);

    this.#reasonOptions = Array.from(
      // Skip the first option ("choose reason"), since it always stays at the top
      this.reasonInput.querySelectorAll(`option:not(:first-of-type)`)
    );
  }

  static #cache = new WeakMap();
  static get(doc) {
    return ViewState.#cache.get(doc) ?? new ViewState(doc);
  }

  get mainPanelview() {
    return this.#mainView;
  }

  get previewPanelview() {
    return this.#mainView;
  }

  get reportSentPanelview() {
    return this.#reportSentView;
  }

  get urlInput() {
    return this.#mainView.querySelector("#report-broken-site-popup-url");
  }

  get url() {
    return this.urlInput.value;
  }

  set url(spec) {
    this.urlInput.value = spec;
  }

  resetURLToCurrentTab() {
    const { currentURI } = this.#doc.ownerGlobal.gBrowser.selectedBrowser;
    this.currentTabURI = currentURI;
    this.urlInput.value = currentURI.spec;
  }

  get descriptionInput() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-description"
    );
  }

  get description() {
    return this.descriptionInput.value;
  }

  set description(value) {
    this.descriptionInput.value = value;
  }

  static REASON_CHOICES_ID_PREFIX = "report-broken-site-popup-reason-";

  get blockedTrackersCheckbox() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-blocked-trackers-checkbox"
    );
  }

  get reasonInput() {
    return this.#mainView.querySelector("#report-broken-site-popup-reason");
  }

  get reason() {
    const reason = this.reasonInput.selectedOptions[0].id.replace(
      ViewState.REASON_CHOICES_ID_PREFIX,
      ""
    );
    return reason == "choose" ? undefined : reason;
  }

  get reasonText() {
    const { reasonInput } = this;
    if (!reasonInput.selectedIndex) {
      return "";
    }
    return reasonInput.selectedOptions[0]?.label;
  }

  set reason(value) {
    this.reasonInput.selectedIndex = this.#mainView.querySelector(
      `#${ViewState.REASON_CHOICES_ID_PREFIX}${value}`
    ).index;
  }

  #randomizeReasonsOrdering() {
    // As with QuickActionsLoaderDefault, we use the Normandy
    // randomizationId as our PRNG seed to ensure that the same
    // user should always get the same sequence.
    const seed = [...lazy.ClientEnvironment.randomizationId]
      .map(x => x.charCodeAt(0))
      .reduce((sum, a) => sum + a, 0);

    const items = [...this.#reasonOptions];
    this.#shuffleArray(items, seed);
    items[0].parentNode.append(...items);
  }

  #shuffleArray(array, seed) {
    // We use SplitMix as it is reputed to have a strong distribution of values.
    const prng = this.#getSplitMix32PRNG(seed);
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // SplitMix32 is a splittable pseudorandom number generator (PRNG).
  // License: MIT (https://github.com/attilabuti/SimplexNoise)
  #getSplitMix32PRNG(a) {
    return () => {
      a |= 0;
      a = (a + 0x9e3779b9) | 0;
      var t = a ^ (a >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
    };
  }

  #restoreReasonsOrdering() {
    this.#reasonOptions[0].parentNode.append(...this.#reasonOptions);
  }

  get form() {
    return this.#formElement;
  }

  reset() {
    this.currentTabWebcompatDetailsPromise = undefined;
    this.form.reset();
    this.blockedTrackersCheckbox.checked = false;
    delete this.cachedPreviewData;

    this.resetURLToCurrentTab();
  }

  ensureReasonOrderingMatchesPref() {
    const { randomizeReasons } = ReportBrokenSite;
    if (randomizeReasons != this.#randomizeReasons) {
      if (randomizeReasons) {
        this.#randomizeReasonsOrdering();
      } else {
        this.#restoreReasonsOrdering();
      }
      this.#randomizeReasons = randomizeReasons;
    }
  }

  get isURLValid() {
    return this.urlInput.checkValidity();
  }

  get isReasonValid() {
    const { reasonEnabled, reasonIsOptional } = ReportBrokenSite;
    return (
      !reasonEnabled || reasonIsOptional || this.reasonInput.checkValidity()
    );
  }

  get isDescriptionValid() {
    return (
      ReportBrokenSite.descriptionIsOptional ||
      gDescriptionCheckRE.test(this.descriptionInput.value)
    );
  }

  createElement(name) {
    return this.#doc.createElement(name);
  }

  #focusMainViewElement(toFocus) {
    const panelview = this.#doc.ownerGlobal.PanelView.forNode(this.#mainView);
    panelview.selectedElement = toFocus;
    panelview.focusSelectedElement();
  }

  focusFirstInvalidElement() {
    if (!this.isURLValid) {
      this.#focusMainViewElement(this.urlInput);
    } else if (!this.isReasonValid) {
      this.#focusMainViewElement(this.reasonInput);
      this.reasonInput.showPicker();
    } else if (!this.isDescriptionValid) {
      this.#focusMainViewElement(this.descriptionInput);
    }
  }

  get learnMoreLink() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-learn-more-link"
    );
  }

  get sendMoreInfoLink() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-send-more-info-link"
    );
  }

  get reasonLabelRequired() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-reason-label"
    );
  }

  get reasonLabelOptional() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-reason-optional-label"
    );
  }

  get descriptionLabelRequired() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-description-label"
    );
  }

  get descriptionLabelOptional() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-description-optional-label"
    );
  }

  get sendButton() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-send-button"
    );
  }

  get cancelButton() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-cancel-button"
    );
  }

  get mainView() {
    return this.#mainView;
  }

  get reportSentView() {
    return this.#reportSentView;
  }

  get okayButton() {
    return this.#reportSentView.querySelector(
      "#report-broken-site-popup-okay-button"
    );
  }

  get previewCancelButton() {
    return this.#previewView.querySelector(
      "#report-broken-site-popup-preview-cancel-button"
    );
  }

  get previewSendButton() {
    return this.#previewView.querySelector(
      "#report-broken-site-popup-preview-send-button"
    );
  }

  get previewBox() {
    return this.#previewView.querySelector(
      "#report-broken-site-panel-preview-items"
    );
  }

  get previewButton() {
    return this.#mainView.querySelector(
      "#report-broken-site-popup-preview-button"
    );
  }
}

export var ReportBrokenSite = new (class ReportBrokenSite {
  #newReportEndpoint = undefined;

  get sendMoreInfoEndpoint() {
    return this.#newReportEndpoint || DEFAULT_NEW_REPORT_ENDPOINT;
  }

  static WEBCOMPAT_REPORTER_CONFIG = {
    src: "desktop-reporter",
    utm_campaign: "report-broken-site",
    utm_source: "desktop-reporter",
  };

  static DATAREPORTING_PREF = "datareporting.healthreport.uploadEnabled";
  static REPORTER_ENABLED_PREF = "ui.new-webcompat-reporter.enabled";

  static REASON_PREF = "ui.new-webcompat-reporter.reason-dropdown";
  static REASON_PREF_VALUES = {
    0: "disabled",
    1: "optional",
    2: "required",
  };
  static REASON_RANDOMIZED_PREF =
    "ui.new-webcompat-reporter.reason-dropdown.randomized";
  static SEND_MORE_INFO_PREF = "ui.new-webcompat-reporter.send-more-info-link";
  static NEW_REPORT_ENDPOINT_PREF =
    "ui.new-webcompat-reporter.new-report-endpoint";

  static MAIN_PANELVIEW_ID = "report-broken-site-popup-mainView";
  static SENT_PANELVIEW_ID = "report-broken-site-popup-reportSentView";
  static PREVIEW_PANELVIEW_ID = "report-broken-site-popup-previewView";

  #_enabled = false;
  get enabled() {
    return this.#_enabled;
  }

  #reasonEnabled = false;
  #reasonIsOptional = true;
  #randomizeReasons = false;
  #descriptionIsOptional = true;
  #sendMoreInfoEnabled = true;

  get reasonEnabled() {
    return this.#reasonEnabled;
  }

  get reasonIsOptional() {
    return this.#reasonIsOptional;
  }

  get randomizeReasons() {
    return this.#randomizeReasons;
  }

  get descriptionIsOptional() {
    return this.#descriptionIsOptional;
  }

  constructor() {
    for (const [name, [pref, dflt]] of Object.entries({
      dataReportingPref: [ReportBrokenSite.DATAREPORTING_PREF, false],
      reasonPref: [ReportBrokenSite.REASON_PREF, 0],
      reasonRandomizedPref: [ReportBrokenSite.REASON_RANDOMIZED_PREF, false],
      sendMoreInfoPref: [ReportBrokenSite.SEND_MORE_INFO_PREF, false],
      newReportEndpointPref: [
        ReportBrokenSite.NEW_REPORT_ENDPOINT_PREF,
        DEFAULT_NEW_REPORT_ENDPOINT,
      ],
      enabledPref: [ReportBrokenSite.REPORTER_ENABLED_PREF, true],
    })) {
      XPCOMUtils.defineLazyPreferenceGetter(
        this,
        name,
        pref,
        dflt,
        this.#checkPrefs.bind(this)
      );
    }
    this.#checkPrefs();
  }

  canReportURI(uri) {
    return uri && (uri.schemeIs("http") || uri.schemeIs("https"));
  }

  #recordGleanEvent(name, extra) {
    Glean.webcompatreporting[name].record(extra);
  }

  updateParentMenu(event) {
    // We need to make sure that the Report Broken Site menu item
    // is disabled if the tab's location changes to a non-reportable
    // one while the menu is open.
    const tabbrowser = event.target.ownerGlobal.gBrowser;
    this.enableOrDisableMenuitems(tabbrowser.selectedBrowser);

    tabbrowser.addTabsProgressListener(this);
    event.target.addEventListener(
      "popuphidden",
      () => {
        tabbrowser.removeTabsProgressListener(this);
      },
      { once: true }
    );
  }

  init(win) {
    // Called in browser-init.js via the category manager registration
    // in BrowserComponents.manifest
    const { document } = win;

    const state = ViewState.get(document);

    this.#initMainView(state);
    this.#initPreviewView(state);
    this.#initReportSentView(state);

    for (const id of ["menu_HelpPopup", "appMenu-popup"]) {
      document
        .getElementById(id)
        .addEventListener("popupshown", this.updateParentMenu.bind(this));
    }

    state.mainPanelview.addEventListener("ViewShowing", ({ target }) => {
      const { selectedBrowser } = target.ownerGlobal.gBrowser;
      let source = "helpMenu";
      switch (target.closest("panelmultiview")?.id) {
        case "appMenu-multiView":
          source = "hamburgerMenu";
          break;
        case "protections-popup-multiView":
          source = "ETPShieldIconMenu";
          break;
      }
      this.#onMainViewShown(source, selectedBrowser);
    });

    // Make sure the URL input is focused when the main view pops up.
    state.mainPanelview.addEventListener("ViewShown", () => {
      const panelview = win.PanelView.forNode(state.mainPanelview);
      panelview.selectedElement = state.urlInput;
      panelview.focusSelectedElement();
      Services.focus
        .getFocusedElementForWindow(win, true, {})
        ?.setSelectionRange(0, 0);
    });

    // Make sure the Okay button is focused when the report sent view pops up.
    state.reportSentPanelview.addEventListener("ViewShown", () => {
      const panelview = win.PanelView.forNode(state.reportSentPanelview);
      panelview.selectedElement = state.okayButton;
      panelview.focusSelectedElement();
    });

    win.document
      .getElementById("cmd_reportBrokenSite")
      .addEventListener("command", e => {
        if (this.enabled) {
          this.open(e);
        } else {
          const tabbrowser = e.target.ownerGlobal.gBrowser;
          state.resetURLToCurrentTab();
          this.promiseWebCompatInfo(state, tabbrowser.selectedBrowser);
          this.#openWebCompatTab(tabbrowser)
            .catch(err => {
              console.error("Report Broken Site: unexpected error", err);
            })
            .finally(() => {
              state.reset();
            });
        }
      });
  }

  enableOrDisableMenuitems(selectedbrowser) {
    // Ensures that the various Report Broken Site menu items and
    // toolbar buttons are enabled/hidden when appropriate.

    const canReportUrl = this.canReportURI(selectedbrowser.currentURI);

    const { document } = selectedbrowser.ownerGlobal;

    // Altering the disabled attribute on the command does not propagate
    // the change to the related menuitems (see bug 805653), so we change them all.
    const cmd = document.getElementById("cmd_reportBrokenSite");
    const allowedByPolicy = Services.policies.isAllowed(
      "DisableFeedbackCommands"
    );
    cmd.toggleAttribute("hidden", !allowedByPolicy);
    const app = document.ownerGlobal.PanelMultiView.getViewNode(
      document,
      "appMenu-report-broken-site-button"
    );
    // Note that this element does not exist until the protections popup is actually opened.
    const prot = document.getElementById(
      "protections-popup-report-broken-site-button"
    );
    if (canReportUrl) {
      cmd.removeAttribute("disabled");
      app.removeAttribute("disabled");
      prot?.removeAttribute("disabled");
    } else {
      cmd.setAttribute("disabled", "true");
      app.setAttribute("disabled", "true");
      prot?.setAttribute("disabled", "true");
    }

    // Changes to the "hidden" and "disabled" state of the command aren't reliably
    // reflected on the main menu unless we open it twice, or do it manually.
    // (See bug 1864953).
    const mainmenuItem = document.getElementById("help_reportBrokenSite");
    if (mainmenuItem) {
      mainmenuItem.hidden = !allowedByPolicy;
      mainmenuItem.disabled = !canReportUrl;
    }
  }

  #checkPrefs(whichChanged) {
    // No breakage reports can be sent by Glean if it's disabled, so we also
    // disable the broken site reporter. We also have our own pref.
    this.#_enabled =
      Services.policies.isAllowed("feedbackCommands") &&
      this.dataReportingPref &&
      this.enabledPref;

    this.#reasonEnabled = this.reasonPref == 1 || this.reasonPref == 2;
    this.#reasonIsOptional = this.reasonPref == 1;
    if (!whichChanged || whichChanged == ReportBrokenSite.REASON_PREF) {
      const setting = ReportBrokenSite.REASON_PREF_VALUES[this.reasonPref];
      this.#recordGleanEvent("reasonDropdown", { setting });
    }

    this.#sendMoreInfoEnabled = this.sendMoreInfoPref;
    this.#newReportEndpoint = this.newReportEndpointPref;

    this.#randomizeReasons = this.reasonRandomizedPref;
  }

  #initMainView(state) {
    state.sendButton.addEventListener("command", () => {
      state.form.requestSubmit();
    });

    state.form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!state.form.checkValidity()) {
        state.focusFirstInvalidElement();
        return;
      }
      const multiview = event.target.closest("panelmultiview");
      this.#recordGleanEvent("send", {
        sent_with_blocked_trackers: !!state.blockedTrackersCheckbox.checked,
      });
      await this.#sendReportAsGleanPing(state);
      multiview.showSubView("report-broken-site-popup-reportSentView");
      state.reset();
    });

    state.cancelButton.addEventListener("command", ({ target }) => {
      target.ownerGlobal.CustomizableUI.hidePanelForNode(target);
      state.reset();
    });

    state.sendMoreInfoLink.addEventListener("click", async event => {
      event.preventDefault();
      const tabbrowser = event.target.ownerGlobal.gBrowser;
      this.#recordGleanEvent("sendMoreInfo");
      event.target.ownerGlobal.CustomizableUI.hidePanelForNode(event.target);
      await this.#openWebCompatTab(tabbrowser);
      state.reset();
    });

    state.learnMoreLink.addEventListener("click", async event => {
      this.#recordGleanEvent("learnMore");
      event.target.ownerGlobal.requestAnimationFrame(() => {
        event.target.ownerGlobal.CustomizableUI.hidePanelForNode(event.target);
      });
    });

    state.previewButton.addEventListener("click", event => {
      state.currentTabWebcompatDetailsPromise
        ?.catch(_ => {})
        .then(info => {
          this.generatePreviewMarkup(state, info);

          // Update the live data on the preview which the user can edit in the reporter.
          const { description, previewBox, reasonText } = state;
          if (state.cachedPreviewData) {
            state.cachedPreviewData.basic.description = description;
            state.cachedPreviewData.basic.reason = reasonText;
          }
          previewBox.querySelector(
            ".preview_description"
          ).nextSibling.innerText = JSON.stringify(description);
          previewBox.querySelector(".preview_reason").nextSibling.innerText =
            JSON.stringify(reasonText ?? "");

          const multiview = event.target.closest("panelmultiview");
          multiview.showSubView(
            ReportBrokenSite.PREVIEW_PANELVIEW_ID,
            event.target
          );
          this.#recordGleanEvent("previewed");
        });
    });
  }

  #initPreviewView(state) {
    state.previewSendButton.addEventListener("command", event => {
      // If the user has not entered a reason yet, then the form's validity
      // check will bring up the reason dropdown, despite it being out of view
      // (since we're looking at the preview panel, not the main one). This is
      // confusing, so we instead go back to the main view first if there is a
      // validity check failure (we also have to be careful to avoid possibly
      // racing with the user if they close the popup during this sequence, so
      // we don't leak any event listeners and world with them).
      if (!state.form.checkValidity()) {
        const view = event.target.closest("panelview").panelMultiView;
        const { document } = event.target.ownerGlobal;
        const listener = event => {
          document.removeEventListener("popuphiding", listener);
          view.removeEventListener("ViewShown", listener);
          if (event.type == "ViewShown") {
            state.form.requestSubmit();
          }
        };
        document.addEventListener("popuphiding", listener);
        view.addEventListener("ViewShown", listener);
        view.goBack();
      } else {
        state.form.requestSubmit();
      }
    });

    state.previewCancelButton.addEventListener("command", ({ target }) => {
      target.ownerGlobal.CustomizableUI.hidePanelForNode(target);
      state.reset();
    });
  }

  #initReportSentView(state) {
    state.okayButton.addEventListener("command", ({ target }) => {
      target.ownerGlobal.CustomizableUI.hidePanelForNode(target);
    });
  }

  async #onMainViewShown(source, selectedBrowser) {
    const { document } = selectedBrowser.ownerGlobal;

    let didReset = false;
    const state = ViewState.get(document);
    const uri = selectedBrowser.currentURI;
    if (!state.isURLValid && !state.isDescriptionValid) {
      state.reset();
      didReset = true;
    } else if (!state.currentTabURI || !uri.equals(state.currentTabURI)) {
      state.reset();
      didReset = true;
    } else if (!state.url) {
      state.resetURLToCurrentTab();
    }

    const { sendMoreInfoLink } = state;
    const { sendMoreInfoEndpoint } = this;
    if (sendMoreInfoLink.href !== sendMoreInfoEndpoint) {
      sendMoreInfoLink.href = sendMoreInfoEndpoint;
    }
    sendMoreInfoLink.hidden = !this.#sendMoreInfoEnabled;

    state.reasonInput.hidden = !this.#reasonEnabled;
    state.reasonInput.required = this.#reasonEnabled && !this.#reasonIsOptional;

    state.ensureReasonOrderingMatchesPref();

    state.reasonLabelRequired.hidden =
      !this.#reasonEnabled || this.#reasonIsOptional;
    state.reasonLabelOptional.hidden =
      !this.#reasonEnabled || !this.#reasonIsOptional;

    state.descriptionLabelRequired.hidden = this.#descriptionIsOptional;
    state.descriptionLabelOptional.hidden = !this.#descriptionIsOptional;

    this.#recordGleanEvent("opened", { source });

    if (didReset || !state.currentTabWebcompatDetailsPromise) {
      this.promiseWebCompatInfo(state, selectedBrowser);
    }
  }

  promiseWebCompatInfo(state, selectedBrowser) {
    state.currentTabWebcompatDetailsPromise = this.#queryActor(
      "GetBrokenSiteReport",
      undefined,
      selectedBrowser
    ).catch(err => {
      console.error("Report Broken Site: unexpected error", err);
      state.currentTabWebcompatDetailsPromise = undefined;
    });
  }

  cachePreviewData(state, brokenSiteReportData) {
    const { blockedTrackersCheckbox, description, reasonText, url } = state;

    const previewData = Object.assign({
      basic: {
        description,
        reason: reasonText,
        url,
      },
    });

    if (brokenSiteReportData) {
      for (const [category, values] of Object.entries(brokenSiteReportData)) {
        previewData[category] = Object.fromEntries(
          Object.entries(values)
            .filter(([_, { do_not_preview }]) => !do_not_preview)
            .map(([name, { value }]) => [name, value])
        );
      }
    }

    if (!blockedTrackersCheckbox.checked && previewData.antitracking) {
      delete previewData.antitracking.blockedOrigins;
    }

    state.cachedPreviewData = previewData;
    return previewData;
  }

  generatePreviewMarkup(state, reportData) {
    // If we have already cached preview data, we have already generated the markup as well.
    if (this.cachedPreviewData) {
      return;
    }
    const previewData = this.cachePreviewData(state, reportData);
    const preview = state.previewBox;
    preview.innerHTML = "";
    for (const [name, value] of Object.entries(previewData)) {
      const details = state.createElement("details");

      const summary = state.createElement("summary");
      summary.innerText = name;
      summary.dataset.capturesFocus = "true";
      details.appendChild(summary);

      const info = state.createElement("div");
      info.className = "data";
      for (const [k, v] of Object.entries(value)) {
        const div = state.createElement("div");
        div.className = "entry";
        const span_name = state.createElement("span");
        const span_value = state.createElement("span");
        span_name.className = `preview_${k}`;
        span_name.innerText = `${k}:`;
        // Add some extra word-wrapping opportunities to the data by adding spaces,
        // so users don't have to horizontally scroll as much.
        span_value.innerText = JSON.stringify(v)?.replace(/[,:]/g, "$& ") ?? "";
        div.append(span_name, span_value);
        info.appendChild(div);
      }
      details.appendChild(info);

      preview.appendChild(details);
    }
    const first = preview.querySelector("details");
    if (first) {
      first.setAttribute("open", "");
    }
  }

  async #queryActor(msg, params, browser) {
    const actor =
      browser.browsingContext.currentWindowGlobal.getActor("ReportBrokenSite");
    return actor.sendQuery(msg, params);
  }

  async #loadTab(tabbrowser, url, triggeringPrincipal) {
    const tab = tabbrowser.addTab(url, {
      inBackground: false,
      triggeringPrincipal,
    });
    const expectedBrowser = tabbrowser.getBrowserForTab(tab);
    return new Promise(resolve => {
      const listener = {
        onLocationChange(browser, webProgress, request, uri) {
          if (
            browser == expectedBrowser &&
            uri.spec == url &&
            webProgress.isTopLevel
          ) {
            resolve(tab);
            tabbrowser.removeTabsProgressListener(listener);
          }
        },
      };
      tabbrowser.addTabsProgressListener(listener);
    });
  }

  async #openWebCompatTab(tabbrowser) {
    const endpointUrl = this.sendMoreInfoEndpoint;
    const principal = Services.scriptSecurityManager.createNullPrincipal({});
    const tab = await this.#loadTab(tabbrowser, endpointUrl, principal);
    const { document } = tabbrowser.selectedBrowser.ownerGlobal;
    const { description, reason, url, currentTabWebcompatDetailsPromise } =
      ViewState.get(document);

    return this.#queryActor(
      "SendDataToWebcompatCom",
      {
        reason,
        description,
        endpointUrl,
        reportUrl: url,
        reporterConfig: ReportBrokenSite.WEBCOMPAT_REPORTER_CONFIG,
        webcompatInfo: await currentTabWebcompatDetailsPromise,
      },
      tab.linkedBrowser
    ).catch(err => {
      console.error("Report Broken Site: unexpected error", err);
    });
  }

  async #sendReportAsGleanPing({
    blockedTrackersCheckbox,
    currentTabWebcompatDetailsPromise,
    description,
    reason,
    url,
  }) {
    const gBase = Glean.brokenSiteReport;

    if (reason) {
      gBase.breakageCategory.set(reason);
    }

    gBase.description.set(description);
    gBase.url.set(url);

    const details = await currentTabWebcompatDetailsPromise;

    if (!details) {
      GleanPings.brokenSiteReport.submit();
      return;
    }

    if (!blockedTrackersCheckbox.checked) {
      delete details.antitracking.blockedOrigins;
    }

    for (const categoryItems of Object.values(details)) {
      for (let [name, { glean, json, value }] of Object.entries(
        categoryItems
      )) {
        if (!glean) {
          continue;
        }
        // Transform glean=xx.yy.zz to brokenSiteReportXxYyZz.
        glean =
          "brokenSiteReport" +
          glean
            .split(".")
            .map(v => `${v[0].toUpperCase()}${v.substr(1)}`)
            .join("");
        if (json) {
          name = `${name}Json`;
          value = JSON.stringify(value);
        }
        Glean[glean][name].set(value);
      }
    }

    GleanPings.brokenSiteReport.submit();
  }

  open(event) {
    const { target } = event.sourceEvent;
    const { selectedBrowser } = target.ownerGlobal.gBrowser;
    const { ownerGlobal } = selectedBrowser;
    const { document } = ownerGlobal;

    switch (target.id) {
      case "appMenu-report-broken-site-button":
        ownerGlobal.PanelUI.showSubView(
          ReportBrokenSite.MAIN_PANELVIEW_ID,
          target
        );
        break;
      case "protections-popup-report-broken-site-button":
        document
          .getElementById("protections-popup-multiView")
          .showSubView(ReportBrokenSite.MAIN_PANELVIEW_ID);
        break;
      case "help_reportBrokenSite": {
        // hide the hamburger menu first, as we overlap with it.
        const appMenuPopup = document.getElementById("appMenu-popup");
        appMenuPopup?.hidePopup();

        ownerGlobal.PanelUI.showSubView(
          ReportBrokenSite.MAIN_PANELVIEW_ID,
          ownerGlobal.PanelUI.menuButton
        );
        break;
      }
    }
  }
})();

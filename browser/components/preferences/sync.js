/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from preferences.js */

const { SCOPE_APP_SYNC } = ChromeUtils.importESModule(
  "resource://gre/modules/FxAccountsCommon.sys.mjs"
);

const FXA_PAGE_LOGGED_OUT = 0;
const FXA_PAGE_LOGGED_IN = 1;

// Indexes into the "login status" deck.
// We are in a successful verified state - everything should work!
const FXA_LOGIN_VERIFIED = 0;
// We have logged in to an unverified account.
const FXA_LOGIN_UNVERIFIED = 1;
// We are logged in locally, but the server rejected our credentials.
const FXA_LOGIN_FAILED = 2;

// Indexes into the "sync status" deck.
const SYNC_DISCONNECTED = 0;
const SYNC_CONNECTED = 1;

const BACKUP_ARCHIVE_ENABLED_PREF_NAME = "browser.backup.archive.enabled";
const BACKUP_RESTORE_ENABLED_PREF_NAME = "browser.backup.restore.enabled";

ChromeUtils.defineESModuleGetters(lazy, {
  BackupService: "resource:///modules/backup/BackupService.sys.mjs",
});

Preferences.addAll([
  // sync
  { id: "services.sync.engine.bookmarks", type: "bool" },
  { id: "services.sync.engine.history", type: "bool" },
  { id: "services.sync.engine.tabs", type: "bool" },
  { id: "services.sync.engine.passwords", type: "bool" },
  { id: "services.sync.engine.addresses", type: "bool" },
  { id: "services.sync.engine.creditcards", type: "bool" },
  { id: "services.sync.engine.addons", type: "bool" },
  { id: "services.sync.engine.prefs", type: "bool" },
]);

/**
 * A helper class for managing sync related UI behavior.
 */
var SyncHelpers = new (class SyncHelpers {
  /**
   * href for Connect another device link.
   *
   * @type {string}
   */
  connectAnotherDeviceHref = "";

  /**
   * Returns the current global UIState.
   *
   * @type {object}
   * @readonly
   */
  get uiState() {
    let state = UIState.get();
    return state;
  }

  /**
   * Retrieves the current UI state status from the global UIState.
   *
   * @type {string}
   * @readonly
   */
  get uiStateStatus() {
    return this.uiState.status;
  }

  /**
   * Whether Sync is currently enabled in the UIState.
   *
   * @type {boolean}
   * @readonly
   */
  get isSyncEnabled() {
    return this.uiState.syncEnabled;
  }

  /**
   * Extracts and sanitizes the `entrypoint` parameter from the current document URL.
   *
   * @returns {string} The sanitized entry point name.
   */
  getEntryPoint() {
    let params = URL.fromURI(document.documentURIObject).searchParams;
    let entryPoint = params.get("entrypoint") || "preferences";
    entryPoint = entryPoint.replace(/[^-.\w]/g, "");
    return entryPoint;
  }

  /**
   * Replace the current tab with the specified URL.
   *
   * @param {string} url
   */
  replaceTabWithUrl(url) {
    // Get the <browser> element hosting us.
    let browser = window.docShell.chromeEventHandler;
    // And tell it to load our URL.
    browser.loadURI(Services.io.newURI(url), {
      triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal(
        {}
      ),
    });
  }

  /**
   * Opens the "Choose What to Sync" dialog and handles user interaction.
   *
   * @param {boolean} isSyncConfigured
   *        Whether Sync is already configured for this profile.
   * @param {string|null} [why=null]
   *        Optional reason or event name indicating why the dialog was opened.
   * @returns {Promise<void>}
   *          Resolves when the dialog flow and any post-actions have completed.
   */
  async _chooseWhatToSync(isSyncConfigured, why = null) {
    // Record the user opening the choose what to sync menu.
    fxAccounts.telemetry.recordOpenCWTSMenu(why).catch(err => {
      console.error("Failed to record open CWTS menu event", err);
    });

    // Assuming another device is syncing and we're not,
    // we update the engines selection so the correct
    // checkboxes are pre-filed.
    if (!isSyncConfigured) {
      try {
        await Weave.Service.updateLocalEnginesState();
      } catch (err) {
        console.error("Error updating the local engines state", err);
      }
    }
    let params = {};
    if (isSyncConfigured) {
      // If we are already syncing then we also offer to disconnect.
      params.disconnectFun = () => this.disconnectSync();
    }
    gSubDialog.open(
      "chrome://browser/content/preferences/dialogs/syncChooseWhatToSync.xhtml",
      {
        closingCallback: event => {
          if (event.detail.button == "accept") {
            // Sync wasn't previously configured, but the user has accepted
            // so we want to now start syncing!
            if (!isSyncConfigured) {
              fxAccounts.telemetry
                .recordConnection(["sync"], "ui")
                .then(() => {
                  return Weave.Service.configure();
                })
                .catch(err => {
                  console.error("Failed to enable sync", err);
                });
            } else {
              // User is already configured and have possibly changed the engines they want to
              // sync, so we should let the server know immediately
              // if the user is currently syncing, we queue another sync after
              // to ensure we caught their updates
              Services.tm.dispatchToMainThread(() => {
                Weave.Service.queueSync("cwts");
              });
            }
          }
          // When the modal closes we want to remove any query params
          // so it doesn't open on subsequent visits (and will reload)
          const browser = window.docShell.chromeEventHandler;
          browser.loadURI(Services.io.newURI("about:preferences#sync"), {
            triggeringPrincipal:
              Services.scriptSecurityManager.getSystemPrincipal(),
          });
        },
      },
      params /* aParams */
    );
  }

  // Disconnect sync, leaving the account connected.
  disconnectSync() {
    return window.browsingContext.topChromeWindow.gSync.disconnect({
      confirm: true,
      disconnectAccount: false,
    });
  }

  async setupSync() {
    try {
      const hasKeys = await fxAccounts.keys.hasKeysForScope(SCOPE_APP_SYNC);
      if (hasKeys) {
        // User has keys - open the choose what to sync dialog
        this._chooseWhatToSync(false, "setupSync");
      } else {
        // User signed in via third-party auth without sync keys.
        // Redirect to FxA to create a password and generate sync keys.
        // canConnectAccount() checks if the Primary Password is locked and
        // prompts the user to unlock it. Returns false if the user cancels.
        if (!(await FxAccounts.canConnectAccount())) {
          return;
        }
        const url = await FxAccounts.config.promiseConnectAccountURI(
          this.getEntryPoint()
        );
        this.replaceTabWithUrl(url);
      }
    } catch (err) {
      console.error("Failed to check for sync keys", err);
      // Fallback to opening CWTS dialog
      this._chooseWhatToSync(false, "setupSync");
    }
  }

  async signIn() {
    if (!(await FxAccounts.canConnectAccount())) {
      return;
    }
    const url = await FxAccounts.config.promiseConnectAccountURI(
      this.getEntryPoint()
    );
    this.replaceTabWithUrl(url);
  }

  /**
   * Attempts to take the user through the sign in flow by opening the web content
   * with the given entrypoint as a query parameter
   *
   * @param {string} entrypoint
   *        An string appended to the query parameters, used in telemetry to differentiate
   *        different entrypoints to accounts
   */
  async reSignIn(entrypoint) {
    const url = await FxAccounts.config.promiseConnectAccountURI(entrypoint);
    this.replaceTabWithUrl(url);
  }

  async verifyFirefoxAccount() {
    return this.reSignIn("preferences-reverify");
  }

  /**
   * Disconnect the account, including everything linked.
   *
   * @param {boolean} confirm
   *        Whether to show a confirmation dialog before disconnecting
   */
  unlinkFirefoxAccount(confirm) {
    window.browsingContext.topChromeWindow.gSync.disconnect({
      confirm,
    });
  }
})();

Preferences.addSetting({
  id: "uiStateUpdate",
  setup(emitChange) {
    Weave.Svc.Obs.add(UIState.ON_UPDATE, emitChange);
    return () => Weave.Svc.Obs.remove(UIState.ON_UPDATE, emitChange);
  },
});

// Mozilla accounts section

// Logged out of Mozilla account
Preferences.addSetting({
  id: "noFxaAccountGroup",
  deps: ["uiStateUpdate"],
  visible() {
    return SyncHelpers.uiStateStatus == UIState.STATUS_NOT_CONFIGURED;
  },
});
Preferences.addSetting({
  id: "noFxaAccount",
});
Preferences.addSetting({
  id: "noFxaSignIn",
  onUserClick: () => {
    SyncHelpers.signIn();
  },
});

// Logged in and verified and all is good
Preferences.addSetting({
  id: "fxaSignedInGroup",
  deps: ["uiStateUpdate"],
  visible() {
    return SyncHelpers.uiStateStatus == UIState.STATUS_SIGNED_IN;
  },
});
Preferences.addSetting({
  id: "fxaLoginVerified",
  deps: ["uiStateUpdate"],
  _failedAvatarURLs: new Set(),
  getControlConfig(config, _, setting) {
    let state = SyncHelpers.uiState;

    if (state.displayName) {
      config.l10nId = "sync-account-signed-in-display-name";
      config.l10nArgs = {
        name: state.displayName,
        email: state.email || "",
      };
    } else {
      config.l10nId = "sync-account-signed-in";
      config.l10nArgs = {
        email: state.email || "",
      };
    }

    // Reset the image to default avatar if we encounter an error.
    if (this._failedAvatarURLs.has(state.avatarURL)) {
      config.iconSrc = "chrome://browser/skin/fxa/avatar-color.svg";
      return config;
    }

    if (state.avatarURL && !state.avatarIsDefault) {
      config.iconSrc = state.avatarURL;
      let img = new Image();
      img.onerror = () => {
        this._failedAvatarURLs.add(state.avatarURL);
        setting.onChange();
      };
      img.src = state.avatarURL;
    }
    return config;
  },
});
Preferences.addSetting(
  class extends Preferences.AsyncSetting {
    static id = "verifiedManage";

    setup() {
      Weave.Svc.Obs.add(UIState.ON_UPDATE, this.emitChange);
      return () => Weave.Svc.Obs.remove(UIState.ON_UPDATE, this.emitChange);
    }

    // The "manage account" link embeds the uid, so we need to update this
    // if the account state changes.
    async getControlConfig() {
      let href = await FxAccounts.config.promiseManageURI(
        SyncHelpers.getEntryPoint()
      );
      return {
        controlAttrs: {
          href: href ?? "https://accounts.firefox.com/settings",
        },
      };
    }
  }
);

Preferences.addSetting({
  id: "fxaUnlinkButton",
  onUserClick: () => {
    SyncHelpers.unlinkFirefoxAccount(true);
  },
});

// Logged in to an unverified account
Preferences.addSetting({
  id: "fxaUnverifiedGroup",
  deps: ["uiStateUpdate"],
  visible() {
    return SyncHelpers.uiStateStatus == UIState.STATUS_NOT_VERIFIED;
  },
});
Preferences.addSetting({
  id: "fxaLoginUnverified",
  deps: ["uiStateUpdate"],
  getControlConfig(config) {
    let state = SyncHelpers.uiState;
    config.l10nArgs = {
      email: state.email || "",
    };
    return config;
  },
});
Preferences.addSetting({
  id: "verifyFxaAccount",
  onUserClick: () => {
    SyncHelpers.verifyFirefoxAccount();
  },
});
Preferences.addSetting({
  id: "unverifiedUnlinkFxaAccount",
  onUserClick: () => {
    /* no warning as account can't have previously synced */
    SyncHelpers.unlinkFirefoxAccount(false);
  },
});

// Logged in locally but server rejected credentials
Preferences.addSetting({
  id: "fxaLoginRejectedGroup",
  deps: ["uiStateUpdate"],
  visible() {
    return SyncHelpers.uiStateStatus == UIState.STATUS_LOGIN_FAILED;
  },
});
Preferences.addSetting({
  id: "fxaLoginRejected",
  deps: ["uiStateUpdate"],
  getControlConfig(config) {
    let state = SyncHelpers.uiState;
    config.l10nArgs = {
      email: state.email || "",
    };
    return config;
  },
});
Preferences.addSetting({
  id: "rejectReSignIn",
  onUserClick: () => {
    SyncHelpers.reSignIn(SyncHelpers.getEntryPoint());
  },
});
Preferences.addSetting({
  id: "rejectUnlinkFxaAccount",
  onUserClick: () => {
    SyncHelpers.unlinkFirefoxAccount(true);
  },
});

//Sync section

//Sync section - no Firefox account
Preferences.addSetting({
  id: "syncNoFxaSignIn",
  deps: ["uiStateUpdate"],
  visible() {
    return SyncHelpers.uiStateStatus === UIState.STATUS_NOT_CONFIGURED;
  },
  onUserClick: () => {
    SyncHelpers.signIn();
  },
});

// Sync section - Syncing is OFF
Preferences.addSetting({
  id: "syncNotConfigured",
  deps: ["uiStateUpdate"],
  visible() {
    return (
      SyncHelpers.uiStateStatus === UIState.STATUS_SIGNED_IN &&
      !SyncHelpers.isSyncEnabled
    );
  },
});
Preferences.addSetting({
  id: "syncSetup",
  onUserClick: () => SyncHelpers.setupSync(),
});

// Sync section - Syncing is ON
Preferences.addSetting({
  id: "syncConfigured",
  deps: ["uiStateUpdate"],
  visible() {
    return (
      SyncHelpers.uiStateStatus === UIState.STATUS_SIGNED_IN &&
      SyncHelpers.isSyncEnabled
    );
  },
});

Preferences.addSetting({
  id: "syncStatus",
});
Preferences.addSetting({
  id: "syncNow",
  deps: ["uiStateUpdate"],
  onUserClick() {
    Weave.Service.sync({ why: "aboutprefs" });
  },
  visible: () => !SyncHelpers.uiState.syncing,
  // Bug 2004864 - add tooltip
});
Preferences.addSetting({
  id: "syncing",
  deps: ["uiStateUpdate"],
  disabled: () => SyncHelpers.uiState.syncing,
  visible: () => SyncHelpers.uiState.syncing,
});

const SYNC_ENGINE_SETTINGS = [
  {
    id: "syncBookmarks",
    pref: "services.sync.engine.bookmarks",
    type: "bookmarks",
  },
  { id: "syncHistory", pref: "services.sync.engine.history", type: "history" },
  { id: "syncTabs", pref: "services.sync.engine.tabs", type: "tabs" },
  {
    id: "syncPasswords",
    pref: "services.sync.engine.passwords",
    type: "passwords",
  },
  {
    id: "syncAddresses",
    pref: "services.sync.engine.addresses",
    type: "addresses",
  },
  {
    id: "syncPayments",
    pref: "services.sync.engine.creditcards",
    type: "payments",
  },
  { id: "syncAddons", pref: "services.sync.engine.addons", type: "addons" },
  { id: "syncSettings", pref: "services.sync.engine.prefs", type: "settings" },
];

SYNC_ENGINE_SETTINGS.forEach(({ id, pref }) => {
  Preferences.addSetting({ id, pref });
});

Preferences.addSetting({
  id: "syncEnginesList",
  deps: SYNC_ENGINE_SETTINGS.map(({ id }) => id),
  getControlConfig(config, deps) {
    const engines = SYNC_ENGINE_SETTINGS.filter(
      ({ id }) => deps[id]?.value
    ).map(({ type }) => type);

    return {
      ...config,
      controlAttrs: {
        ...config.controlAttrs,
        ".engines": engines,
      },
    };
  },
});

Preferences.addSetting({
  id: "syncChangeOptions",
  onUserClick: () => {
    SyncHelpers._chooseWhatToSync(true, "manageSyncSettings");
  },
});

// Sync section - Device name
Preferences.addSetting({
  id: "fxaDeviceNameSection",
  deps: ["uiStateUpdate"],
  visible() {
    return SyncHelpers.uiStateStatus !== UIState.STATUS_NOT_CONFIGURED;
  },
});
Preferences.addSetting({
  id: "fxaDeviceNameGroup",
});
Preferences.addSetting({
  id: "fxaDeviceName",
  deps: ["uiStateUpdate"],
  get: () => Weave.Service.clientsEngine.localName,
  set(val) {
    Weave.Service.clientsEngine.localName = val;
  },
  disabled() {
    return SyncHelpers.uiStateStatus !== UIState.STATUS_SIGNED_IN;
  },
  getControlConfig(config) {
    if (config.controlAttrs?.defaultvalue) {
      return config;
    }
    const deviceDefaultLocalName = fxAccounts?.device?.getDefaultLocalName();
    if (deviceDefaultLocalName) {
      return {
        ...config,
        controlAttrs: {
          ...config.controlAttrs,
          defaultvalue: deviceDefaultLocalName,
        },
      };
    }
    return config;
  },
});
Preferences.addSetting({
  id: "fxaConnectAnotherDevice",
  getControlConfig(config) {
    if (SyncHelpers.connectAnotherDeviceHref) {
      return {
        ...config,
        controlAttrs: {
          ...config.controlAttrs,
          href: SyncHelpers.connectAnotherDeviceHref,
        },
      };
    }
    return config;
  },
  setup(emitChange) {
    FxAccounts.config
      .promiseConnectDeviceURI(SyncHelpers.getEntryPoint())
      .then(connectURI => {
        SyncHelpers.connectAnotherDeviceHref = connectURI;
        emitChange();
      });
  },
});

var gSyncPane = {
  get page() {
    return document.getElementById("weavePrefsDeck").selectedIndex;
  },

  set page(val) {
    document.getElementById("weavePrefsDeck").selectedIndex = val;
  },

  init() {
    this._setupEventListeners();
    this.setupEnginesUI();
    this.updateSyncUI();

    document
      .getElementById("weavePrefsDeck")
      .removeAttribute("data-hidden-from-search");

    // If the Service hasn't finished initializing, wait for it.
    let xps = Cc["@mozilla.org/weave/service;1"].getService(
      Ci.nsISupports
    ).wrappedJSObject;

    if (xps.ready) {
      this._init();
      return;
    }

    // it may take some time before all the promises we care about resolve, so
    // pre-load what we can from synchronous sources.
    this._showLoadPage(xps);

    let onUnload = function () {
      window.removeEventListener("unload", onUnload);
      try {
        Services.obs.removeObserver(onReady, "weave:service:ready");
      } catch (e) {}
    };

    let onReady = () => {
      Services.obs.removeObserver(onReady, "weave:service:ready");
      window.removeEventListener("unload", onUnload);
      this._init();
    };

    Services.obs.addObserver(onReady, "weave:service:ready");
    window.addEventListener("unload", onUnload);

    xps.ensureLoaded();
  },

  /**
   * This method allows us to override any hidden states that were set
   * during preferences.js init(). Currently, this is used to hide the
   * backup section if backup is disabled.
   *
   * Take caution when trying to flip the hidden state to true since the
   * element might show up unexpectedly on different pages in about:preferences
   * since this function will run at the end of preferences.js init().
   *
   * See Bug 1999032 to remove this in favor of config-based prefs.
   */
  handlePrefControlledSection() {
    let bs = lazy.BackupService.init();

    if (!bs.archiveEnabledStatus.enabled && !bs.restoreEnabledStatus.enabled) {
      document.getElementById("backupCategory").hidden = true;
      document.getElementById("dataBackupGroup").hidden = true;
    }
  },

  _showLoadPage() {
    let maybeAcct = false;
    let username = Services.prefs.getCharPref("services.sync.username", "");
    if (username) {
      document.getElementById("fxaEmailAddress").textContent = username;
      maybeAcct = true;
    }

    let cachedComputerName = Services.prefs.getStringPref(
      "identity.fxaccounts.account.device.name",
      ""
    );
    if (cachedComputerName) {
      maybeAcct = true;
      this._populateComputerName(cachedComputerName);
    }
    this.page = maybeAcct ? FXA_PAGE_LOGGED_IN : FXA_PAGE_LOGGED_OUT;
  },

  _init() {
    initSettingGroup("defaultBrowserSync");
    initSettingGroup("sync");
    initSettingGroup("account");

    Weave.Svc.Obs.add(UIState.ON_UPDATE, this.updateWeavePrefs, this);

    window.addEventListener("unload", () => {
      Weave.Svc.Obs.remove(UIState.ON_UPDATE, this.updateWeavePrefs, this);
    });

    FxAccounts.config
      .promiseConnectDeviceURI(SyncHelpers.getEntryPoint())
      .then(connectURI => {
        document
          .getElementById("connect-another-device")
          .setAttribute("href", connectURI);
      });

    // Links for mobile devices.
    for (let platform of ["android", "ios"]) {
      let url =
        Services.prefs.getCharPref(`identity.mobilepromo.${platform}`) +
        "sync-preferences";
      for (let elt of document.querySelectorAll(
        `.fxaMobilePromo-${platform}`
      )) {
        elt.setAttribute("href", url);
      }
    }

    this.updateWeavePrefs();

    // Notify observers that the UI is now ready
    Services.obs.notifyObservers(window, "sync-pane-loaded");

    this._maybeShowSyncAction();
  },

  // Check if the user is coming from a call to action
  // and show them the correct additional panel
  _maybeShowSyncAction() {
    if (
      location.hash == "#sync" &&
      UIState.get().status == UIState.STATUS_SIGNED_IN
    ) {
      if (location.href.includes("action=pair")) {
        gSyncPane.pairAnotherDevice();
      } else if (location.href.includes("action=choose-what-to-sync")) {
        SyncHelpers._chooseWhatToSync(false, "callToAction");
      }
    }
  },

  _toggleComputerNameControls(editMode) {
    let textbox = document.getElementById("fxaSyncComputerName");
    textbox.disabled = !editMode;
    document.getElementById("fxaChangeDeviceName").hidden = editMode;
    document.getElementById("fxaCancelChangeDeviceName").hidden = !editMode;
    document.getElementById("fxaSaveChangeDeviceName").hidden = !editMode;
  },

  _focusComputerNameTextbox() {
    let textbox = document.getElementById("fxaSyncComputerName");
    let valLength = textbox.value.length;
    textbox.focus();
    textbox.setSelectionRange(valLength, valLength);
  },

  _blurComputerNameTextbox() {
    document.getElementById("fxaSyncComputerName").blur();
  },

  _focusAfterComputerNameTextbox() {
    // Focus the most appropriate element that's *not* the "computer name" box.
    Services.focus.moveFocus(
      window,
      document.getElementById("fxaSyncComputerName"),
      Services.focus.MOVEFOCUS_FORWARD,
      0
    );
  },

  _updateComputerNameValue(save) {
    if (save) {
      let textbox = document.getElementById("fxaSyncComputerName");
      Weave.Service.clientsEngine.localName = textbox.value;
    }
    this._populateComputerName(Weave.Service.clientsEngine.localName);
  },

  _setupEventListeners() {
    function setEventListener(aId, aEventType, aCallback) {
      document
        .getElementById(aId)
        .addEventListener(aEventType, aCallback.bind(gSyncPane));
    }

    setEventListener("openChangeProfileImage", "click", function (event) {
      gSyncPane.openChangeProfileImage(event);
    });
    setEventListener("openChangeProfileImage", "keypress", function (event) {
      gSyncPane.openChangeProfileImage(event);
    });
    setEventListener("fxaChangeDeviceName", "command", function () {
      this._toggleComputerNameControls(true);
      this._focusComputerNameTextbox();
    });
    setEventListener("fxaCancelChangeDeviceName", "command", function () {
      // We explicitly blur the textbox because of bug 75324, then after
      // changing the state of the buttons, force focus to whatever the focus
      // manager thinks should be next (which on the mac, depends on an OSX
      // keyboard access preference)
      this._blurComputerNameTextbox();
      this._toggleComputerNameControls(false);
      this._updateComputerNameValue(false);
      this._focusAfterComputerNameTextbox();
    });
    setEventListener("fxaSaveChangeDeviceName", "command", function () {
      // Work around bug 75324 - see above.
      this._blurComputerNameTextbox();
      this._toggleComputerNameControls(false);
      this._updateComputerNameValue(true);
      this._focusAfterComputerNameTextbox();
    });
    setEventListener("noFxaSignIn", "command", function () {
      SyncHelpers.signIn();
      return false;
    });
    setEventListener("fxaUnlinkButton", "command", function () {
      SyncHelpers.unlinkFirefoxAccount(true);
    });
    setEventListener("verifyFxaAccount", "command", () =>
      SyncHelpers.verifyFirefoxAccount()
    );
    setEventListener("unverifiedUnlinkFxaAccount", "command", function () {
      /* no warning as account can't have previously synced */
      SyncHelpers.unlinkFirefoxAccount(false);
    });
    setEventListener("rejectReSignIn", "command", function () {
      SyncHelpers.reSignIn(SyncHelpers.getEntryPoint());
    });
    setEventListener("rejectUnlinkFxaAccount", "command", function () {
      SyncHelpers.unlinkFirefoxAccount(true);
    });
    setEventListener("fxaSyncComputerName", "keypress", function (e) {
      if (e.keyCode == KeyEvent.DOM_VK_RETURN) {
        document.getElementById("fxaSaveChangeDeviceName").click();
      } else if (e.keyCode == KeyEvent.DOM_VK_ESCAPE) {
        document.getElementById("fxaCancelChangeDeviceName").click();
      }
    });
    setEventListener("syncSetup", "command", () => SyncHelpers.setupSync());
    setEventListener("syncChangeOptions", "command", function () {
      SyncHelpers._chooseWhatToSync(true, "manageSyncSettings");
    });
    setEventListener("syncNow", "command", function () {
      // syncing can take a little time to send the "started" notification, so
      // pretend we already got it.
      this._updateSyncNow(true);
      Weave.Service.sync({ why: "aboutprefs" });
    });
    setEventListener("syncNow", "mouseover", function () {
      const state = UIState.get();
      // If we are currently syncing, just set the tooltip to the same as the
      // button label (ie, "Syncing...")
      let tooltiptext = state.syncing
        ? document.getElementById("syncNow").getAttribute("label")
        : window.browsingContext.topChromeWindow.gSync.formatLastSyncDate(
            state.lastSync
          );
      document
        .getElementById("syncNow")
        .setAttribute("tooltiptext", tooltiptext);
    });
  },

  updateSyncUI() {
    let syncStatusTitle = document.getElementById("syncStatusTitle");
    let syncNowButton = document.getElementById("syncNow");
    let syncNotConfiguredEl = document.getElementById("syncNotConfigured");
    let syncConfiguredEl = document.getElementById("syncConfigured");

    if (SyncHelpers.isSyncEnabled) {
      syncStatusTitle.setAttribute("data-l10n-id", "prefs-syncing-on");
      syncNowButton.hidden = false;
      syncConfiguredEl.hidden = false;
      syncNotConfiguredEl.hidden = true;
    } else {
      syncStatusTitle.setAttribute("data-l10n-id", "prefs-syncing-off");
      syncNowButton.hidden = true;
      syncConfiguredEl.hidden = true;
      syncNotConfiguredEl.hidden = false;
    }
  },

  _updateSyncNow(syncing) {
    let butSyncNow = document.getElementById("syncNow");
    let fluentID = syncing ? "prefs-syncing-button" : "prefs-sync-now-button";
    if (document.l10n.getAttributes(butSyncNow).id != fluentID) {
      // Only one of the two strings has an accesskey, and fluent won't
      // remove it if we switch to the string that doesn't, so just force
      // removal here.
      butSyncNow.removeAttribute("accesskey");
      document.l10n.setAttributes(butSyncNow, fluentID);
    }
    butSyncNow.disabled = syncing;
  },

  updateWeavePrefs() {
    let service = Cc["@mozilla.org/weave/service;1"].getService(
      Ci.nsISupports
    ).wrappedJSObject;

    let displayNameLabel = document.getElementById("fxaDisplayName");
    let fxaEmailAddressLabels = document.querySelectorAll(
      ".l10nArgsEmailAddress"
    );
    displayNameLabel.hidden = true;

    // while we determine the fxa status pre-load what we can.
    this._showLoadPage(service);

    let state = UIState.get();
    if (state.status == UIState.STATUS_NOT_CONFIGURED) {
      this.page = FXA_PAGE_LOGGED_OUT;
      return;
    }
    this.page = FXA_PAGE_LOGGED_IN;
    // We are logged in locally, but maybe we are in a state where the
    // server rejected our credentials (eg, password changed on the server)
    let fxaLoginStatus = document.getElementById("fxaLoginStatus");
    let syncReady = false; // Is sync able to actually sync?
    // We need to check error states that need a re-authenticate to resolve
    // themselves first.
    if (state.status == UIState.STATUS_LOGIN_FAILED) {
      fxaLoginStatus.selectedIndex = FXA_LOGIN_FAILED;
    } else if (state.status == UIState.STATUS_NOT_VERIFIED) {
      fxaLoginStatus.selectedIndex = FXA_LOGIN_UNVERIFIED;
    } else {
      // We must be golden (or in an error state we expect to magically
      // resolve itself)
      fxaLoginStatus.selectedIndex = FXA_LOGIN_VERIFIED;
      syncReady = true;
    }
    fxaEmailAddressLabels.forEach(label => {
      let l10nAttrs = document.l10n.getAttributes(label);
      document.l10n.setAttributes(label, l10nAttrs.id, { email: state.email });
    });
    document.getElementById("fxaEmailAddress").textContent = state.email;

    this._populateComputerName(Weave.Service.clientsEngine.localName);
    for (let elt of document.querySelectorAll(".needs-account-ready")) {
      elt.disabled = !syncReady;
    }

    // Clear the profile image (if any) of the previously logged in account.
    document
      .querySelector("#fxaLoginVerified > .fxaProfileImage")
      .style.removeProperty("list-style-image");

    if (state.displayName) {
      fxaLoginStatus.setAttribute("hasName", true);
      displayNameLabel.hidden = false;
      document.getElementById("fxaDisplayNameHeading").textContent =
        state.displayName;
    } else {
      fxaLoginStatus.removeAttribute("hasName");
    }
    if (state.avatarURL && !state.avatarIsDefault) {
      let bgImage = 'url("' + state.avatarURL + '")';
      let profileImageElement = document.querySelector(
        "#fxaLoginVerified > .fxaProfileImage"
      );
      profileImageElement.style.listStyleImage = bgImage;

      let img = new Image();
      img.onerror = () => {
        // Clear the image if it has trouble loading. Since this callback is asynchronous
        // we check to make sure the image is still the same before we clear it.
        if (profileImageElement.style.listStyleImage === bgImage) {
          profileImageElement.style.removeProperty("list-style-image");
        }
      };
      img.src = state.avatarURL;
    }
    // The "manage account" link embeds the uid, so we need to update this
    // if the account state changes.
    FxAccounts.config
      .promiseManageURI(SyncHelpers.getEntryPoint())
      .then(accountsManageURI => {
        document
          .getElementById("verifiedManage")
          .setAttribute("href", accountsManageURI);
      });
    // and the actual sync state.
    let eltSyncStatus = document.getElementById("syncStatusContainer");
    eltSyncStatus.hidden = !syncReady;
    this._updateSyncNow(state.syncing);
    this.updateSyncUI();
  },

  openContentInBrowser(url, options) {
    let win = Services.wm.getMostRecentWindow("navigator:browser");
    if (!win) {
      openTrustedLinkIn(url, "tab");
      return;
    }
    win.switchToTabHavingURI(url, true, options);
  },

  // Replace the current tab with the specified URL.
  replaceTabWithUrl(url) {
    // Get the <browser> element hosting us.
    let browser = window.docShell.chromeEventHandler;
    // And tell it to load our URL.
    browser.loadURI(Services.io.newURI(url), {
      triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal(
        {}
      ),
    });
  },

  clickOrSpaceOrEnterPressed(event) {
    // Note: charCode is deprecated, but 'char' not yet implemented.
    // Replace charCode with char when implemented, see Bug 680830
    return (
      (event.type == "click" && event.button == 0) ||
      (event.type == "keypress" &&
        (event.charCode == KeyEvent.DOM_VK_SPACE ||
          event.keyCode == KeyEvent.DOM_VK_RETURN))
    );
  },

  openChangeProfileImage(event) {
    if (this.clickOrSpaceOrEnterPressed(event)) {
      FxAccounts.config
        .promiseChangeAvatarURI(SyncHelpers.getEntryPoint())
        .then(url => {
          this.openContentInBrowser(url, {
            replaceQueryString: true,
            triggeringPrincipal:
              Services.scriptSecurityManager.getSystemPrincipal(),
          });
        });
      // Prevent page from scrolling on the space key.
      event.preventDefault();
    }
  },

  pairAnotherDevice() {
    gSubDialog.open(
      "chrome://browser/content/preferences/fxaPairDevice.xhtml",
      { features: "resizable=no" }
    );
  },

  _populateComputerName(value) {
    let textbox = document.getElementById("fxaSyncComputerName");
    if (!textbox.hasAttribute("placeholder")) {
      textbox.setAttribute(
        "placeholder",
        fxAccounts.device.getDefaultLocalName()
      );
    }
    textbox.value = value;
  },

  // arranges to dynamically show or hide sync engine name elements based on the
  // preferences used for this engines.
  setupEnginesUI() {
    let observe = (elt, prefName) => {
      elt.hidden = !Services.prefs.getBoolPref(prefName, false);
    };

    for (let elt of document.querySelectorAll("[engine_preference]")) {
      let prefName = elt.getAttribute("engine_preference");
      let obs = observe.bind(null, elt, prefName);
      obs();
      Services.prefs.addObserver(prefName, obs);
      window.addEventListener("unload", () => {
        Services.prefs.removeObserver(prefName, obs);
      });
    }
  },
};

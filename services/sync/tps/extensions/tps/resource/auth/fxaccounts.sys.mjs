/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  clearInterval,
  clearTimeout,
  setInterval,
  setTimeout,
} from "resource://gre/modules/Timer.sys.mjs";

import { getFxAccountsSingleton } from "resource://gre/modules/FxAccounts.sys.mjs";
import { FxAccountsConfig } from "resource://gre/modules/FxAccountsConfig.sys.mjs";
import { Credentials } from "resource://gre/modules/Credentials.sys.mjs";
import { CommonUtils } from "resource://services-common/utils.sys.mjs";
import { Logger } from "resource://tps/logger.sys.mjs";

const fxAccounts = getFxAccountsSingleton();
const AUTOFILL_ACTOR_NAME = "TPSFxAAutofill";
const FXA_HOSTS = new Set([
  "accounts.firefox.com",
  "accounts.stage.mozaws.net",
  "api-accounts.stage.mozaws.net",
  "api.accounts.firefox.com",
]);
const BYPASS_TOKEN_PREF = "tps.fxa.bypassToken";
const FXA_CI_HEADER = "fxa-ci";
const OAUTH_READY_POLL_INTERVAL_MS = 1000;
const OAUTH_TIMEOUT_MS = 120000;
const RESTMAIL_POLL_INTERVAL_MS = 1000;
const RESTMAIL_MAX_ATTEMPTS = 60;

function getBypassToken() {
  return Services.prefs.getStringPref(BYPASS_TOKEN_PREF, "");
}

let gAutofillActorRegistered = false;
let gBypassHeaderObserverRegistered = false;

function isFxaHost(url) {
  try {
    return FXA_HOSTS.has(new URL(url).hostname);
  } catch (_) {
    return false;
  }
}

// Inject the WAF bypass header on all requests to get through
// the FxA stage WAF.
function ensureBypassHeaderObserverRegistered() {
  if (gBypassHeaderObserverRegistered) {
    return;
  }
  const token = getBypassToken();
  if (!token) {
    return;
  }
  const observer = {
    observe(subject, topic) {
      if (topic !== "http-on-modify-request") {
        return;
      }
      const channel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (FXA_HOSTS.has(channel.URI.host)) {
        channel.setRequestHeader(FXA_CI_HEADER, token, false);
      }
    },
  };
  Services.obs.addObserver(observer, "http-on-modify-request");
  gBypassHeaderObserverRegistered = true;
}

// Register at module load so the header is injected on every request
ensureBypassHeaderObserverRegistered();

function ensureAutofillActorRegistered() {
  if (gAutofillActorRegistered) {
    return;
  }
  try {
    ChromeUtils.registerWindowActor(AUTOFILL_ACTOR_NAME, {
      child: {
        esModuleURI: "resource://tps/actors/fxaAutofillChild.sys.mjs",
        events: {
          DOMContentLoaded: {},
        },
      },
      matches: [
        "https://accounts.firefox.com/*",
        "https://accounts.stage.mozaws.net/*",
      ],
      messageManagerGroups: ["browsers"],
    });
    gAutofillActorRegistered = true;
  } catch (error) {
    if (error.result !== Cr.NS_ERROR_DOM_NOT_SUPPORTED_ERR) {
      throw error;
    }
    gAutofillActorRegistered = true;
  }
}

export var Authentication = {
  /**
   * Check if an user has been logged in
   */
  async isLoggedIn() {
    return !!(await this.getSignedInUser());
  },

  async isReady() {
    let user = await this.getSignedInUser();
    if (!user || !user.verified) {
      return false;
    }

    // Check if we have OAuth tokens
    try {
      const token = await fxAccounts.getOAuthToken({
        scope: "https://identity.mozilla.com/apps/oldsync",
      });
      if (!token) {
        return false;
      }
    } catch (error) {
      Logger.logInfo("OAuth tokens not yet available: " + error.message);
      return false;
    }

    // Check if we have scoped keys stored
    try {
      const hasKeys = await fxAccounts.keys.hasKeysForScope(
        "https://identity.mozilla.com/apps/oldsync"
      );
      if (!hasKeys) {
        Logger.logInfo("Scoped keys not yet available");
        return false;
      }
    } catch (error) {
      Logger.logInfo("Error checking scoped keys: " + error.message);
      return false;
    }

    return true;
  },

  _getRestmailUsername(user) {
    const restmailSuffix = "@restmail.net";
    if (user.toLowerCase().endsWith(restmailSuffix)) {
      return user.slice(0, -restmailSuffix.length);
    }
    return null;
  },

  async deleteEmail(user) {
    let username = this._getRestmailUsername(user);
    if (!username) {
      Logger.logInfo("Not a restmail username, can't delete");
      return false;
    }
    Logger.logInfo("Deleting mail (from restmail) for user " + username);
    let restmailURI = `https://www.restmail.net/mail/${encodeURIComponent(
      username
    )}`;
    try {
      let deleteResult = await fetch(restmailURI, { method: "DELETE" });
      if (!deleteResult.ok) {
        Logger.logInfo(
          `Warning: Got non-success status ${deleteResult.status} when deleting emails`
        );
        return false;
      }
    } catch (error) {
      Logger.logInfo("Warning: Failed to delete old emails: " + error.message);
      return false;
    }
    return true;
  },

  /**
   * Wrapper to retrieve the currently signed in user
   *
   * @returns Information about the currently signed in user
   */
  async getSignedInUser() {
    try {
      return await fxAccounts.getSignedInUser();
    } catch (error) {
      Logger.logError(
        "getSignedInUser() failed with: " + JSON.stringify(error)
      );
      throw error;
    }
  },

  async _automateOAuthFlow(oauthUrl, email, password) {
    ensureAutofillActorRegistered();

    const win = Services.ww.openWindow(
      null,
      "chrome://browser/content/browser.xhtml",
      "_blank",
      "chrome,dialog=no,all",
      null
    );

    return new Promise((resolve, reject) => {
      let browser;
      let webProgress;
      let readyCheckInProgress = false;
      let settled = false;
      let timeoutId;
      let readyCheckId;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (readyCheckId) {
          clearInterval(readyCheckId);
        }
        if (webProgress) {
          webProgress.removeProgressListener(progressListener);
        }
      };

      const finish = (action, value) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        try {
          if (!win.closed) {
            win.close();
          }
        } catch (error) {
          Logger.logInfo("Failed to close OAuth window: " + error.message);
        }
        action(value);
      };

      const configureAutofillActor = url => {
        if (!isFxaHost(url)) {
          return;
        }
        let actor = null;
        try {
          actor =
            browser?.browsingContext?.currentWindowGlobal?.getActor(
              AUTOFILL_ACTOR_NAME
            );
        } catch (_) {
          return;
        }
        actor?.sendAsyncMessage("TPSFxAAutofill:Configure", {
          email,
          password,
        });
      };

      const progressListener = {
        onLocationChange(_aWebProgress, _aRequest, location) {
          const url = location.spec;
          configureAutofillActor(url);
        },
        onStateChange() {},
        onProgressChange() {},
        onStatusChange() {},
        onSecurityChange() {},
        onContentBlockingEvent() {},
        QueryInterface: ChromeUtils.generateQI([
          "nsIWebProgressListener",
          "nsISupportsWeakReference",
        ]),
      };

      const setupOAuthFlow = () => {
        if (!win.gBrowser) {
          setTimeout(setupOAuthFlow, 100);
          return;
        }

        Logger.logInfo("Window ready, opening OAuth URL in tab");
        const tab = win.gBrowser.addTrustedTab(oauthUrl);
        win.gBrowser.selectedTab = tab;
        browser = tab.linkedBrowser;
        webProgress = browser.webProgress;
        webProgress.addProgressListener(
          progressListener,
          Ci.nsIWebProgress.NOTIFY_LOCATION
        );
        configureAutofillActor(oauthUrl);
      };

      // Poll to wait for COMMAND_LOGIN to be processed and account data stored
      readyCheckId = setInterval(async () => {
        if (readyCheckInProgress || settled) {
          return;
        }
        readyCheckInProgress = true;
        try {
          if (win.closed) {
            finish(
              reject,
              new Error("OAuth window was closed before sign-in completed")
            );
            return;
          }
          if (await this.isReady()) {
            finish(resolve);
          }
        } catch (error) {
          Logger.logInfo("OAuth readiness check failed: " + error.message);
        } finally {
          readyCheckInProgress = false;
        }
      }, OAUTH_READY_POLL_INTERVAL_MS);

      timeoutId = setTimeout(() => {
        finish(
          reject,
          new Error(
            `OAuth flow timed out after ${OAUTH_TIMEOUT_MS / 1000} seconds`
          )
        );
      }, OAUTH_TIMEOUT_MS);

      if (
        win.document.readyState === "complete" ||
        win.document.readyState === "interactive"
      ) {
        setupOAuthFlow();
      } else {
        win.addEventListener("load", setupOAuthFlow, { once: true });
      }
    });
  },

  async _verifyViaRestmail(email, uid, fxaApiUrl) {
    const mailbox = email.split("@")[0];
    const restmailUrl = `https://restmail.net/mail/${encodeURIComponent(mailbox)}`;
    Logger.logInfo(`Waiting for verification email at ${email}...`);

    for (let attempt = 0; attempt < RESTMAIL_MAX_ATTEMPTS; attempt++) {
      await new Promise(resolve =>
        setTimeout(resolve, RESTMAIL_POLL_INTERVAL_MS)
      );
      try {
        const response = await fetch(restmailUrl);
        const emails = await response.json();
        for (const msg of emails) {
          const headers = msg.headers || {};
          const verifyCode = headers["x-verify-code"];
          const emailUid = headers["x-uid"];
          if (verifyCode && emailUid === uid) {
            Logger.logInfo("Found verification code, verifying account...");
            const verifyResponse = await fetch(
              `${fxaApiUrl}/recovery_email/verify_code`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid, code: verifyCode }),
              }
            );
            if (!verifyResponse.ok) {
              throw new Error(
                `Verification failed: HTTP ${verifyResponse.status}`
              );
            }
            Logger.logInfo("Account verified successfully");
            return;
          }
        }
      } catch (error) {
        Logger.logInfo(
          `Error checking restmail (attempt ${attempt}): ${error.message}`
        );
      }
    }
    throw new Error(
      `Verification timed out after ${RESTMAIL_MAX_ATTEMPTS} attempts`
    );
  },

  async createAndVerifyAccount(email, password, fxaApiUrl) {
    Logger.logInfo(`Creating FxA account for ${email}`);
    await FxAccountsConfig.ensureConfigured();
    const creds = await Credentials.setup(email, password);
    const authPW = CommonUtils.bytesAsHex(creds.authPW);
    const response = await fetch(`${fxaApiUrl}/account/create?keys=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, authPW }),
    });
    if (!response.ok) {
      const body = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (_) {}
      if (parsed?.errno === 101) {
        Logger.logInfo("Account already exists, proceeding with sign-in");
        return;
      }
      throw new Error(
        `Account creation failed: HTTP ${response.status} - ${body}`
      );
    }
    const data = await response.json();
    Logger.logInfo(`Account created: uid=${data.uid}`);
    await this._verifyViaRestmail(email, data.uid, fxaApiUrl);
  },

  async signIn(account) {
    Logger.AssertTrue(account.username, "Username has been found");
    Logger.AssertTrue(account.password, "Password has been found");
    Logger.logInfo("Login user: " + account.username);

    try {
      await FxAccountsConfig.ensureConfigured();

      const oauthUrl = await FxAccountsConfig.promiseConnectAccountURI("tps", {
        scope:
          "profile https://identity.mozilla.com/apps/oldsync https://identity.mozilla.com/tokens/session",
      });
      Logger.logInfo("Starting OAuth sign-in at: " + oauthUrl);

      await this._automateOAuthFlow(
        oauthUrl,
        account.username,
        account.password
      );

      // _automateOAuthFlow waits for isReady() which confirms the web channel
      // has processed COMMAND_OAUTH and stored scoped keys properly.
      Logger.logInfo("OAuth sign-in successful with sync keys!");
      return true;
    } catch (error) {
      Logger.logError("signIn() failed with: " + error.message);
      throw new Error("signIn() failed with: " + error.message);
    }
  },

  /**
   * Sign out of Firefox Accounts.
   */
  async signOut() {
    if (await Authentication.isLoggedIn()) {
      // Note: This will clean up the device ID.
      await fxAccounts.signOut();
    }
  },
};

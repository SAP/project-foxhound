/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Log } from "resource://gre/modules/Log.sys.mjs";

import { getFxAccountsSingleton } from "resource://gre/modules/FxAccounts.sys.mjs";

const fxAccounts = getFxAccountsSingleton();
import { FxAccountsClient } from "resource://gre/modules/FxAccountsClient.sys.mjs";
import { FxAccountsConfig } from "resource://gre/modules/FxAccountsConfig.sys.mjs";
import { Logger } from "resource://tps/logger.sys.mjs";

/**
 * Helper object for Firefox Accounts authentication
 */
export var Authentication = {
  /**
   * Check if an user has been logged in
   */
  async isLoggedIn() {
    return !!(await this.getSignedInUser());
  },

  async isReady() {
    let user = await this.getSignedInUser();
    return user && user.verified;
  },

  _getRestmailUsername(user) {
    const restmailSuffix = "@restmail.net";
    if (user.toLowerCase().endsWith(restmailSuffix)) {
      return user.slice(0, -restmailSuffix.length);
    }
    return null;
  },

  async _openVerificationPage(uri) {
    let mainWindow = Services.wm.getMostRecentWindow("navigator:browser");
    let newtab = mainWindow.gBrowser.addWebTab(uri);
    let win = mainWindow.gBrowser.getBrowserForTab(newtab);
    await new Promise(resolve => {
      win.addEventListener("loadend", resolve, { once: true });
    });
    Logger.logError("You are in a sad place - not waiting for verification.");
    mainWindow.gBrowser.removeTab(newtab);
    return false;
  },

  async _completeVerification(user) {
    let username = this._getRestmailUsername(user);
    if (!username) {
      Logger.logInfo(
        `Username "${user}" isn't a restmail username so can't complete verification`
      );
      return false;
    }
    Logger.logError(
      "You are in a sad place - confirmation links are no longer a thing"
    );
    return false;
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
      // Clean up after ourselves.
      let deleteResult = await fetch(restmailURI, { method: "DELETE" });
      if (!deleteResult.ok) {
        Logger.logInfo(
          `Warning: Got non-success status ${deleteResult.status} when deleting emails`
        );
        return false;
      }
    } catch (e) {
      Logger.logInfo(
        "Warning: Failed to delete old emails: " + Log.exceptionStr(e)
      );
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

  /**
   * Wrapper to synchronize the login of a user
   *
   * @param account
   *        Account information of the user to login
   * @param account.username
   *        The username for the account (utf8)
   * @param account.password
   *        The user's password
   */
  async signIn(account) {
    Logger.AssertTrue(account.username, "Username has been found");
    Logger.AssertTrue(account.password, "Password has been found");

    Logger.logInfo("Login user: " + account.username);

    try {
      // Required here since we don't go through the real login page
      await FxAccountsConfig.ensureConfigured();

      let client = new FxAccountsClient();
      let credentials = await client.signIn(
        account.username,
        account.password,
        true
      );
      await fxAccounts._internal.setSignedInUser(credentials);
      if (!credentials.verified) {
        await this._completeVerification(account.username);
      }

      return true;
    } catch (error) {
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

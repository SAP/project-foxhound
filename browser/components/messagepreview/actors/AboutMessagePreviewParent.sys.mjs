/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { ASRouter } from "resource:///modules/asrouter/ASRouter.sys.mjs";
import { JsonSchema } from "resource://gre/modules/JsonSchema.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
  BookmarksBarButton: "resource:///modules/asrouter/BookmarksBarButton.sys.mjs",
  CFRPageActions: "resource:///modules/asrouter/CFRPageActions.sys.mjs",
  CustomizableUI:
    "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
  FeatureCalloutBroker:
    "resource:///modules/asrouter/FeatureCalloutBroker.sys.mjs",
  InfoBar: "resource:///modules/asrouter/InfoBar.sys.mjs",
  SpecialMessageActions:
    "resource://messaging-system/lib/SpecialMessageActions.sys.mjs",
  Spotlight: "resource:///modules/asrouter/Spotlight.sys.mjs",

  log: () => {
    const { Logger } = ChromeUtils.importESModule(
      "resource://messaging-system/lib/Logger.sys.mjs"
    );
    return new Logger("AboutMessagePreviewParent");
  },
});

const SWITCH_THEMES = {
  DARK: "firefox-compact-dark@mozilla.org",
  LIGHT: "firefox-compact-light@mozilla.org",
};

function dispatchCFRAction({ type, data }, browser) {
  if (type === "USER_ACTION") {
    lazy.SpecialMessageActions.handleAction(data, browser);
  }
}

/**
 * A Firefox Messaging System message.
 *
 * @typedef {Record<string, any>} Message
 *
 * @property {string} template The kind of message this is, e.g., "spotlight".
 */

/**
 * A handler for a specific message template.
 *
 * @typedef {function(Message, ChromeBrowser): void} MessageHandler
 */

/**
 * A map of supported message templates to their handlers.
 *
 * @type {Record<string, MessageHandler>}
 */
const MESSAGE_HANDLERS = Object.freeze({
  infobar: (message, browser) =>
    lazy.InfoBar.showInfoBarMessage(browser, message, dispatchCFRAction),

  spotlight: (message, browser) =>
    lazy.Spotlight.showSpotlightDialog(browser, message, () => {}),

  cfr_doorhanger: (message, browser) =>
    lazy.CFRPageActions.forceRecommendation(
      browser,
      message,
      dispatchCFRAction
    ),

  feature_callout: async (message, browser) => {
    // Clear the Feature Tour prefs used by some callouts, to ensure
    // the behaviour of the message is correct
    const tourPref = message.content.tour_pref_name;
    if (tourPref) {
      Services.prefs.clearUserPref(tourPref);
    }
    // For messagePreview, force the trigger && targeting to be something we can show.
    message.trigger = { id: "nthTabClosed" };
    message.targeting = "true";
    // Check whether or not the callout is showing already, then
    // modify the anchor property of the feature callout to
    // ensure it's something we can show.
    const showing = await lazy.FeatureCalloutBroker.showFeatureCallout(
      browser,
      message
    );
    if (!showing) {
      for (const screen of message.content.screens) {
        const existingAnchors = screen.anchors;
        const fallbackAnchor = { selector: "#star-button-box" };

        if (existingAnchors[0].hasOwnProperty("arrow_position")) {
          fallbackAnchor.arrow_position = "top-center-arrow-end";
        } else {
          fallbackAnchor.panel_position = {
            anchor_attachment: "bottomcenter",
            callout_attachment: "topright",
          };
        }

        screen.anchors = [...existingAnchors, fallbackAnchor];
        lazy.log.debug("ANCHORS: ", screen.anchors);
      }
      // Try showing again
      await lazy.FeatureCalloutBroker.showFeatureCallout(browser, message);
    }
  },

  bookmarks_bar_button: (message, browser) => {
    // Ensure the bookmarks bar is open and then send the message.
    lazy.CustomizableUI.setToolbarVisibility(
      lazy.CustomizableUI.AREA_BOOKMARKS,
      true
    );
    lazy.BookmarksBarButton.showBookmarksBarButton(browser, message);
  },

  pb_newtab: (message, browser) => ASRouter.forcePBWindow(browser, message),
});

export class AboutMessagePreviewParent extends JSWindowActorParent {
  /**
   * Return the list of previewable message templates.
   *
   * This API is used by nimbus-devtools.
   *
   * @returns {string[]} The list of previewable message templates.
   */
  static getSupportedTemplates() {
    return Object.keys(MESSAGE_HANDLERS);
  }

  constructor() {
    super();

    const EXISTING_THEME = Services.prefs.getStringPref(
      "extensions.activeThemeID"
    );

    this._onUnload = () => {
      lazy.AddonManager.getAddonByID(EXISTING_THEME).then(addon =>
        addon.enable()
      );
    };
  }

  didDestroy() {
    this._onUnload();
  }

  /**
   * Chooses the appropriate messaging system function for showing
   * the message, based on the template passed in data
   *
   * @param {string} data - a string containing the message JSON
   * @param {boolean} validationEnabled - whether or not to run
   * schema validation on the message JSON. Should be false in
   * tests so that we don't have to pass real messages or call
   * the validation function.
   */
  async showMessage(data, validationEnabled = true) {
    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      lazy.log.error("Could not parse message", e);
      return;
    }

    if (validationEnabled) {
      const schema = await fetch(
        "chrome://browser/content/asrouter/schemas/MessagingExperiment.schema.json",
        { credentials: "omit" }
      ).then(rsp => rsp.json());
      const result = JsonSchema.validate(message, schema);
      if (!result.valid) {
        lazy.log.error(
          `Invalid message: ${JSON.stringify(result.errors, undefined, 2)}`
        );
      }
    }

    const browser =
      this.browsingContext.topChromeWindow.gBrowser.selectedBrowser;

    const handler = MESSAGE_HANDLERS[message.template];

    if (handler) {
      // We are intentionally *not* awaiting this value as it may cause this
      // entire function to block until the message is dismissed.
      void handler(message, browser);
    } else {
      lazy.log.error(`Unsupported message template ${message.template}`);
    }
  }

  async receiveMessage(message) {
    // validationEnabled is used for testing
    const { name, data, validationEnabled } = message;

    switch (name) {
      case "MessagePreview:SHOW_MESSAGE":
        await this.showMessage(data, validationEnabled);
        return;
      case "MessagePreview:CHANGE_THEME": {
        const theme = data.isDark ? SWITCH_THEMES.LIGHT : SWITCH_THEMES.DARK;
        await lazy.AddonManager.getAddonByID(theme).then(addon =>
          addon.enable()
        );
        return;
      }
      default:
        lazy.log.debug(`Unexpected event ${name} was not handled.`);
    }
  }
}

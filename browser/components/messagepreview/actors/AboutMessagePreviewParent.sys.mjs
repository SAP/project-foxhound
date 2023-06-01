/* vim: set ts=2 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { JsonSchema } from "resource://gre/modules/JsonSchema.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyModuleGetters(lazy, {
  InfoBar: "resource://activity-stream/lib/InfoBar.jsm",
  Spotlight: "resource://activity-stream/lib/Spotlight.jsm",
  SpecialMessageActions:
    "resource://messaging-system/lib/SpecialMessageActions.jsm",
});

function dispatchCFRAction({ type, data }, browser) {
  if (type === "USER_ACTION") {
    lazy.SpecialMessageActions.handleAction(data, browser);
  }
}

export class AboutMessagePreviewParent extends JSWindowActorParent {
  showInfoBar(message) {
    const browser = this.browsingContext.topChromeWindow.gBrowser
      .selectedBrowser;
    lazy.InfoBar.showInfoBarMessage(browser, message, dispatchCFRAction);
  }

  showSpotlight(message) {
    const browser = this.browsingContext.topChromeWindow.gBrowser
      .selectedBrowser;
    lazy.Spotlight.showSpotlightDialog(browser, message, () => {});
  }

  async showMessage(data) {
    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      console.error("Could not parse message", e);
      return;
    }

    const schema = await fetch(
      "resource://activity-stream/schemas/MessagingExperiment.schema.json",
      { credentials: "omit" }
    ).then(rsp => rsp.json());

    const result = JsonSchema.validate(message, schema);
    if (!result.valid) {
      console.error(
        `Invalid message: ${JSON.stringify(result.errors, undefined, 2)}`
      );
    }

    switch (message.template) {
      case "infobar":
        this.showInfoBar(message);
        return;
      case "spotlight":
        this.showSpotlight(message);
        return;
      default:
        console.error(`Unsupported message template ${message.template}`);
    }
  }

  receiveMessage(message) {
    const { name, data } = message;

    switch (name) {
      case "MessagePreview:SHOW_MESSAGE":
        this.showMessage(data);
        break;
      default:
        console.log(`Unexpected event ${name} was not handled.`);
    }
  }
}

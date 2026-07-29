/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  setInterval: "resource://gre/modules/Timer.sys.mjs",
  clearInterval: "resource://gre/modules/Timer.sys.mjs",
});

// Frequency at which to check for new messages
const SYSTEM_TICK_INTERVAL = 5 * 60 * 1000;
const HOMEPAGE_OVERRIDE_PREF = "browser.startup.homepage_override.once";

export class _MomentsPageHub {
  constructor() {
    this.id = "moments-page-hub";
    this.state = {};
    this.checkHomepageOverridePref = this.checkHomepageOverridePref.bind(this);
    this._initialized = false;
  }

  async init(
    waitForInitialized,
    { handleMessageRequest, addImpression, blockMessageById, sendTelemetry }
  ) {
    if (this._initialized) {
      return;
    }

    this._initialized = true;
    this._handleMessageRequest = handleMessageRequest;
    this._addImpression = addImpression;
    this._blockMessageById = blockMessageById;
    this._sendTelemetry = sendTelemetry;

    // Need to wait for ASRouter to initialize before trying to fetch messages
    await waitForInitialized;

    this.messageRequest({
      triggerId: "momentsUpdate",
      template: "update_action",
    });

    const _intervalId = lazy.setInterval(
      () => this.checkHomepageOverridePref(),
      SYSTEM_TICK_INTERVAL
    );
    this.state = { _intervalId };
  }

  _sendPing(ping) {
    this._sendTelemetry({
      type: "MOMENTS_PAGE_TELEMETRY",
      data: { action: "moments_user_event", ...ping },
    });
  }

  sendUserEventTelemetry(message) {
    this._sendPing({
      message_id: message.id,
      bucket_id: message.id,
      event: "MOMENTS_PAGE_SET",
    });
  }

  /**
   * If we don't have `expire` defined with the message it could be because
   * it depends on user dependent parameters. Since the message matched
   * targeting we calculate `expire` based on the current timestamp and the
   * `expireDelta` which defines for how long it should be available.
   *
   * @param expireDelta {number} - Offset in milliseconds from the current date
   */
  getExpirationDate(expireDelta) {
    return Date.now() + expireDelta;
  }

  executeAction(message) {
    const { _nimbusFeature: feature_id, _nimbusSlug: slug } = message;
    const { id, data } = message.content.action;
    switch (id) {
      case "moments-wnp": {
        const { url, expireDelta } = data;
        let { expire } = data;
        if (!expire) {
          expire = this.getExpirationDate(expireDelta);
        }
        Services.prefs.setStringPref(
          HOMEPAGE_OVERRIDE_PREF,
          JSON.stringify({
            message_id: message.id,
            url,
            expire,
            // These two are used in BrowserContentHandler for exposure events:
            feature_id,
            slug,
          })
        );
        // Add impression and block immediately after taking the action
        this.sendUserEventTelemetry(message);
        this._addImpression(message);
        this._blockMessageById(message.id);
        break;
      }
    }
  }

  async messageRequest({ triggerId, template }) {
    const timerId = Glean.messagingSystem.messageRequestTime.start();
    const messages = await this._handleMessageRequest({
      triggerId,
      template,
      returnAll: true,
    });
    Glean.messagingSystem.messageRequestTime.stopAndAccumulate(timerId);

    // Don't bother recording reach for moments page messages, since all they do
    // for this message type is track startup and the interval. We do get more
    // useful telemetry with exposure events in BrowserContentHandler.
    const nonReachMessages = [];
    for (const message of messages) {
      if (!message.recordReach && !message._reachId) {
        nonReachMessages.push(message);
      }
    }
    const [message] = nonReachMessages;
    if (message) {
      this.executeAction(message);
    }
  }

  /**
   * Pref is set via Remote Settings message. We want to continously
   * monitor new messages that come in to ensure the one with the
   * highest priority is set.
   */
  checkHomepageOverridePref() {
    this.messageRequest({
      triggerId: "momentsUpdate",
      template: "update_action",
    });
  }

  uninit() {
    lazy.clearInterval(this.state._intervalId);
    this.state = {};
    this._initialized = false;
  }
}

/**
 * MomentsPageHub - singleton instance of _MomentsPageHub that can initiate
 * message requests and render messages.
 */
export const MomentsPageHub = new _MomentsPageHub();

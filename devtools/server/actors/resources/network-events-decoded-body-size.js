/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const lazy = {};

ChromeUtils.defineESModuleGetters(
  lazy,
  {
    NetworkUtils:
      "resource://devtools/shared/network-observer/NetworkUtils.sys.mjs",
  },
  { global: "contextual" }
);

const OBSERVER_TOPIC_BEFORE_STOP_REQUEST = "http-on-before-stop-request";

/**
 * Watches for http-on-before-stop-request notifications in the content process
 * to retrieve the decoded body size for network requests. The decoded body size
 * is only correctly set in content processes, not in the parent process.
 */
class NetworkEventDecodedBodySizeWatcher {
  /**
   * Start watching for decoded body sizes for all network requests related to a
   * given Target Actor.
   *
   * @param TargetActor targetActor
   *        The target actor from which we should observe the decoded body sizes
   * @param Object options
   *        Dictionary object with following attributes:
   *        - onAvailable: mandatory
   *          This will be called for each resource.
   */
  async watch(targetActor, { onAvailable }) {
    this.onDecodedBodySizeAvailable = onAvailable;
    this.targetActor = targetActor;

    Services.obs.addObserver(this, OBSERVER_TOPIC_BEFORE_STOP_REQUEST);
  }

  /**
   * Stop watching for decoded body sizes related to a given Target Actor.
   */
  destroy() {
    Services.obs.removeObserver(this, OBSERVER_TOPIC_BEFORE_STOP_REQUEST);
  }

  observe(subject, topic) {
    if (topic !== OBSERVER_TOPIC_BEFORE_STOP_REQUEST) {
      return;
    }

    let channel;
    try {
      channel = subject.QueryInterface(Ci.nsIHttpChannel);
    } catch (e) {
      return;
    }

    if (!channel.decodedBodySize) {
      // decodedBodySize is only set via the compression converter stats, so it is
      // 0 for non-compressed responses. Rely on parent process data for those.
      return;
    }

    if (
      !lazy.NetworkUtils.matchRequest(channel, {
        targetActor: this.targetActor,
      })
    ) {
      return;
    }

    this.onDecodedBodySizeAvailable([
      {
        resourceId: channel.channelId,
        decodedBodySize: channel.decodedBodySize,
      },
    ]);
  }
}

module.exports = NetworkEventDecodedBodySizeWatcher;

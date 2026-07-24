/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

class CSSChangeWatcher {
  constructor() {
    this.onTrackChange = this.onTrackChange.bind(this);
  }

  #targetActor;

  /**
   * Start watching for all css changes related to a given Target Actor.
   *
   * @param TargetActor targetActor
   *        The target actor from which we should observe css changes.
   * @param Object options
   *        Dictionary object with following attributes:
   *        - onAvailable: mandatory function
   *          This will be called for each resource.
   */
  async watch(targetActor, { onAvailable }) {
    this.#targetActor = targetActor;
    this.onAvailable = onAvailable;
    this.#targetActor.on("track-css-change", this.onTrackChange);
  }

  onTrackChange(change) {
    this.onAvailable([change]);
  }

  destroy() {
    this.#targetActor.off("track-css-change", this.onTrackChange);
    this.#targetActor = null;
  }
}

module.exports = CSSChangeWatcher;

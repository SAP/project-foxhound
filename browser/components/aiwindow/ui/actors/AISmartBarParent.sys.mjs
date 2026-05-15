/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * JSWindowActor to pass a query from the Urlbar to the Smartbar.
 */
export class AISmartBarParent extends JSWindowActorParent {
  async ask(query) {
    this.sendAsyncMessage("AskFromParent", { query });
  }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Domain } from "chrome://remote/content/cdp/domains/Domain.sys.mjs";

// Note: For now this domain has only been added so that clients using CDP
// (like Selenium) don't break when trying to disable Fetch events.

export class Fetch extends Domain {
  constructor(session) {
    super(session);

    this.enabled = false;
  }

  destructor() {
    this.disable();

    super.destructor();
  }

  disable() {
    if (!this.enabled) {
      return;
    }

    this.enabled = false;
  }
}

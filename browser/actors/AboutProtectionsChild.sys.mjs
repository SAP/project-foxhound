/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RemotePageChild } from "resource://gre/actors/RemotePageChild.sys.mjs";

export class AboutProtectionsChild extends RemotePageChild {
  actorCreated() {
    super.actorCreated();

    this.exportFunctions(["RPMRecordGleanEvent"]);
  }

  RPMRecordGleanEvent(category, name, extra) {
    Glean[category]?.[name]?.record(extra);
  }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { IPProtectionService } from "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs";
import { IPPProxyManager } from "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs";
import { IPPLifecycleHelper } from "moz-src:///toolkit/components/ipprotection/IPPLifecycleHelper.sys.mjs";
import { IPPNimbusHelper } from "moz-src:///toolkit/components/ipprotection/IPPNimbusHelper.sys.mjs";
import { IPProtectionServerlist } from "moz-src:///toolkit/components/ipprotection/IPProtectionServerlist.sys.mjs";
import { IPPStartupCache } from "moz-src:///toolkit/components/ipprotection/IPPStartupCache.sys.mjs";
import { IPPSessionPrefManager } from "moz-src:///toolkit/components/ipprotection/IPPSessionPrefManager.sys.mjs";

const lazy = {};

if (AppConstants.MOZ_ENTERPRISE) {
  ChromeUtils.defineESModuleGetters(lazy, {
    IPPAlwaysOnHelpers:
      "moz-src:///toolkit/components/ipprotection/enterprise/IPPAlwaysOn.sys.mjs",
  });
} else {
  ChromeUtils.defineESModuleGetters(lazy, {
    IPPAutoRestoreHelper:
      "moz-src:///toolkit/components/ipprotection/IPPAutoRestore.sys.mjs",
    IPPAutoStartHelpers:
      "moz-src:///toolkit/components/ipprotection/IPPAutoStart.sys.mjs",
  });
}

const coreHelpers = [
  IPPStartupCache,
  IPProtectionServerlist,
  IPPProxyManager,
  IPPLifecycleHelper,
  IPPSessionPrefManager,
  ...(AppConstants.MOZ_ENTERPRISE
    ? lazy.IPPAlwaysOnHelpers
    : [lazy.IPPAutoRestoreHelper, ...lazy.IPPAutoStartHelpers]),
  IPPNimbusHelper,
];

let extraHelpers = [];

export const IPProtectionActivator = {
  addHelpers(helpers) {
    extraHelpers.push(...helpers);
  },
  removeHelpers() {
    extraHelpers = [];
  },
  setupHelpers() {
    IPProtectionService.setHelpers([...coreHelpers, ...extraHelpers]);
  },
  setAuthProvider(authProvider) {
    IPProtectionService.setAuthProvider(authProvider);
  },
  init() {
    this.setupHelpers();
    return IPProtectionService.init();
  },
  uninit() {
    return IPProtectionService.uninit();
  },
};

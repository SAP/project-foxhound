/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ActorManagerParent } from "resource://gre/modules/ActorManagerParent.sys.mjs";

let attributionActorRegister = null;
let attributionActorUnregister = null;

/**
 * Fission-compatible JSWindowActor implementations.
 * Detailed documentation of these options is in dom/docs/ipc/jsactors.rst,
 * available at https://firefox-source-docs.mozilla.org/dom/ipc/jsactors.html
 */
const JSWINDOWACTORS = {
  Attribution: {
    parent: {
      esModuleURI:
        "resource://newtab/lib/actors/NewTabAttributionParent.sys.mjs",
    },
    child: {
      esModuleURI:
        "resource://newtab/lib/actors/NewTabAttributionChild.sys.mjs",
      events: {
        FirefoxConversionNotification: { capture: true, wantUntrusted: true },
      },
    },
    allFrames: true,
    matches: ["https://*/*", "about:newtab", "about:home"],
    onAddActor(register, unregister) {
      attributionActorRegister = register;
      attributionActorUnregister = unregister;
    },
  },
};

export const NewTabActorRegistry = {
  init() {
    ActorManagerParent.addJSWindowActors(JSWINDOWACTORS);
  },

  /**
   * Registers the Attribution actor.
   * Called by NewTabAttributionFeed when attribution is enabled.
   */
  registerAttributionActor() {
    if (attributionActorRegister) {
      attributionActorRegister();
    }
  },

  /**
   * Unregisters the Attribution actor.
   * Called by NewTabAttributionFeed when attribution is disabled.
   */
  unregisterAttributionActor() {
    if (attributionActorUnregister) {
      attributionActorUnregister();
    }
  },
};

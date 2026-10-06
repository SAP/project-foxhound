/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  EventDispatcher: "resource://gre/modules/Messaging.sys.mjs",
  GeckoViewUtils: "resource://gre/modules/GeckoViewUtils.sys.mjs",
});

export async function openWindow(uri, aOpenWindowInfo) {
  const info = await lazy.EventDispatcher.instance.sendRequestForResult(
    "GeckoView:ServiceWorkerOpenWindow",
    { url: uri.spec }
  );
  if (!info) {
    throw Components.Exception("", Cr.NS_ERROR_FAILURE);
  }

  if (info.isOpen) {
    const bc = Services.ww.getWindowByName(info.sessionId)?.browser
      ?.browsingContext;
    if (bc) {
      return bc;
    }
    throw Components.Exception(
      "Unable to find GeckoView session with ID",
      Cr.NS_ERROR_NOT_AVAILABLE
    );
  }

  await lazy.GeckoViewUtils.waitAndSetupWindow(
    info.sessionId,
    aOpenWindowInfo,
    null
  );
  return null;
}

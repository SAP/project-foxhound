/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

let lazy = {};

XPCOMUtils.defineLazyServiceGetters(lazy, {
  Favicons: ["@mozilla.org/browser/favicon-service;1", Ci.nsIFaviconService],
});

// Set up Taskbar Tabs Window Chrome.
export const TaskbarTabsChrome = {
  /**
   * Modifies the window chrome for Taskbar Tabs styling (mostly hiding elements).
   *
   * @param {Window} aWindow
   */
  init(aWindow) {
    let document = aWindow.document;
    if (!document.documentElement.hasAttribute("taskbartab")) {
      return;
    }

    // Ensure tab strip is hidden
    aWindow.TabBarVisibility.update();

    // Hide bookmark star
    document.getElementById("star-button-box").style.display = "none";

    // Hide fxa in the hamburger menu
    document.documentElement.setAttribute("fxadisabled", true);

    // Create the decorative corner icon
    initCornerIcon(aWindow);

    // Add a button to control muting/unmuting
    initAudioButton(aWindow);
  },
};

function initCornerIcon(aWindow) {
  const favicon = aWindow.document.getElementById("taskbar-tabs-favicon");
  const tab = aWindow.gBrowser.tabs[0];

  function updateCornerIcon() {
    const icon = aWindow.gBrowser.getIcon(tab);
    if (icon && icon === favicon.src) {
      return;
    }

    if (icon) {
      favicon.src = icon;
    } else {
      favicon.src = lazy.Favicons.defaultFavicon.spec;
    }

    if (tab.hasAttribute("triggeringprincipal")) {
      favicon.setAttribute(
        "triggeringprincipal",
        tab.getAttribute("iconloadingprincipal")
      );
    } else {
      favicon.removeAttribute("triggeringprincipal");
    }
  }

  tab.addEventListener("TabAttrModified", e => {
    if (
      !e.detail.changed.includes("image") &&
      !e.detail.changed.includes("busy")
    ) {
      return;
    }

    // This holds the icon until the next page completely finishes loading;
    // this is a bit long, but without a throbber is probably the best that
    // can be done.
    if (tab.hasAttribute("iconpending")) {
      return;
    }

    updateCornerIcon();
  });
  updateCornerIcon();
}

function initAudioButton(aWindow) {
  const audioButton = aWindow.document.getElementById("taskbar-tabs-audio");
  const tab = aWindow.gBrowser.tabs[0];

  tab.addEventListener("TabAttrModified", _ => {
    audioButton.toggleAttribute(
      "soundplaying",
      tab.hasAttribute("soundplaying")
    );

    const muted = tab.hasAttribute("muted");
    audioButton.toggleAttribute("muted", muted);
    audioButton.toggleAttribute("checked", muted);
    audioButton.setAttribute(
      "data-l10n-id",
      muted ? "taskbar-tab-audio-unmute" : "taskbar-tab-audio-mute"
    );
  });

  audioButton.addEventListener("command", _ => {
    tab.toggleMuteAudio();
  });
}

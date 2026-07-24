/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

XPCOMUtils.defineLazyServiceGetters(this, {
  Favicons: ["@mozilla.org/browser/favicon-service;1", Ci.nsIFaviconService],
});

const gAudioPage =
  "https://example.com/browser/dom/base/test/file_audioLoop.html";

// Given a window, check if it meets all requirements
// of the taskbar tab chrome UI
function checkWindowChrome(win) {
  let document = win.document.documentElement;

  ok(
    document.hasAttribute("taskbartab"),
    "The window HTML should have a taskbartab attribute"
  );

  ok(win.gURLBar.readOnly, "The URL bar should be read-only");

  ok(
    win.document.getElementById("TabsToolbar").collapsed,
    "The tab bar should be collapsed"
  );

  is(
    document.getAttribute("chromehidden"),
    "menubar directories extrachrome ",
    "The correct chrome hidden attributes should be populated"
  );

  ok(!win.menubar.visible, "menubar barprop should not be visible");
  ok(!win.personalbar.visible, "personalbar barprop should not be visible");

  let starButton = win.document.querySelector("#star-button-box");
  is(
    win.getComputedStyle(starButton).display,
    "none",
    "Bookmark button should not be visible"
  );

  ok(
    !document.hasAttribute("fxatoolbarmenu"),
    "Firefox accounts menu should not be displayed"
  );

  ok(
    document.hasAttribute("fxadisabled"),
    "fxadisabled attribute should exist"
  );

  let sideBarElement = win.document.getElementById("sidebar-main");
  ok(BrowserTestUtils.isHidden(sideBarElement), "The sidebar should be hidden");
}

// Given a window, check if hamburger menu
// buttons that aren't relevant to taskbar tabs
// are hidden
async function checkHamburgerMenu(win) {
  win.document.getElementById("PanelUI-menu-button").click();

  // Set up a MutationObserver to await for the hamburger menu
  // DOM element and CSS to be loaded & applied.
  // The observer itself verifies that the "new tab" button is hidden
  await new Promise(resolve => {
    const observer = new MutationObserver(() => {
      const newTabButton = win.document.querySelector(
        "#appMenu-new-tab-button2"
      );
      if (
        newTabButton &&
        win.getComputedStyle(newTabButton).display == "none"
      ) {
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(win.document, { childList: true, subtree: true });
  });

  is(
    win.getComputedStyle(
      win.document.querySelector("#appMenu-new-window-button2")
    ).display,
    "none",
    "New window button in hamburger menu should not be visible"
  );

  is(
    win.getComputedStyle(
      win.document.querySelector("#appMenu-new-private-window-button2")
    ).display,
    "none",
    "New private window button in hamburger menu should not be visible"
  );

  is(
    win.getComputedStyle(
      win.document.querySelector("#appMenu-bookmarks-button")
    ).display,
    "none",
    "Bookmarks button in hamburger menu should not be visible"
  );
}

// Creates a Taskbar Tab window and verifies UI elements match expectations.
add_task(async function testOpenWindowChrome() {
  const win = await openTaskbarTabWindow();

  checkWindowChrome(win);
  await checkHamburgerMenu(win);

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function testFaviconUpdates() {
  const win = await openTaskbarTabWindow();
  const favicon = win.document.getElementById("taskbar-tabs-favicon");
  const tab = win.gBrowser.selectedTab;

  is(favicon.src, Favicons.defaultFavicon.spec, "starts with default favicon");

  let promise = Promise.all([
    waitForTabAttributeChange(tab, "image"),
    BrowserTestUtils.browserLoaded(tab.linkedBrowser),
  ]);
  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    "data:text/html,<link rel='shortcut icon' href='https://example.com/favicon.ico'>"
  );
  await promise;

  is(favicon.src, win.gBrowser.getIcon(tab), "updates favicon when changed");

  promise = Promise.all([
    waitForTabAttributeChange(tab, "busy").then(() =>
      waitForTabAttributeChange(tab, "busy")
    ),
    BrowserTestUtils.browserLoaded(tab.linkedBrowser),
  ]);
  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    "data:text/html,<meta charset='utf-8'>"
  );
  await promise;

  is(favicon.src, Favicons.defaultFavicon.spec, "ends with default favicon");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_muteAttributesMatchState() {
  const win = await openTaskbarTabWindow();
  const mute = win.document.getElementById("taskbar-tabs-audio");
  const tab = win.gBrowser.selectedTab;

  function checkAttributesMatch(when) {
    is(tab.muted, mute.hasAttribute("muted"), `${when}: 'muted' matches`);
    is(
      tab.soundPlaying,
      mute.hasAttribute("soundplaying"),
      `${when}: 'soundplaying' matches`
    );
    is(
      mute.getAttribute("data-l10n-id"),
      tab.muted ? "taskbar-tab-audio-unmute" : "taskbar-tab-audio-mute",
      `${when}: tooltip is relevant`
    );
  }

  let promise = waitForTabAttributeChange(tab, "soundplaying");
  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, gAudioPage);
  await promise;

  ok(tab.soundPlaying, "Tab is now playing sound");
  checkAttributesMatch("after starting playback");

  promise = waitForTabAttributeChange(tab, "muted");
  tab.toggleMuteAudio();
  await promise;
  ok(tab.muted, "Tab is now muted during playback");
  checkAttributesMatch("after muting during playback");

  promise = waitForTabAttributeChange(tab, "soundplaying");
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    content.document.querySelector("audio").pause();
  });
  await promise;
  ok(!tab.soundPlaying, "Tab is no longer playing sound");
  checkAttributesMatch("after playback stops");

  promise = waitForTabAttributeChange(tab, "muted");
  tab.toggleMuteAudio();
  await promise;
  ok(!tab.muted, "Tab is unmuted after stopping playback");
  checkAttributesMatch("after unmuting and stopping");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_muteTogglesTabMute() {
  const win = await openTaskbarTabWindow();
  const mute = win.document.getElementById("taskbar-tabs-audio");
  const tab = win.gBrowser.selectedTab;

  let promise = waitForTabAttributeChange(tab, "soundplaying");
  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, gAudioPage);
  await promise;
  ok(!tab.muted, "Tab is not muted to start");

  promise = waitForTabAttributeChange(tab, "muted");
  mute.dispatchEvent(new PointerEvent("click"));
  await promise;
  ok(tab.muted, "Tab is now muted");

  promise = waitForTabAttributeChange(tab, "muted");
  mute.dispatchEvent(new PointerEvent("click"));
  await promise;
  ok(!tab.muted, "Tab is now unmuted");

  await BrowserTestUtils.closeWindow(win);
});

async function waitForTabAttributeChange(aTab, aEvent) {
  return await new Promise(resolve => {
    const callback = e => {
      if (e.detail.changed.includes(aEvent)) {
        aTab.removeEventListener("TabAttrModified", callback);
        resolve();
      }
    };
    aTab.addEventListener("TabAttrModified", callback);
  });
}

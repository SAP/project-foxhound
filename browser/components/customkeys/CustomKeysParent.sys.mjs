/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { CustomKeys } from "moz-src:///browser/components/customkeys/CustomKeys.sys.mjs";
import { ShortcutUtils } from "resource://gre/modules/ShortcutUtils.sys.mjs";

const KEY_NAMES_TO_CODES = {
  ArrowDown: "VK_DOWN",
  ArrowLeft: "VK_LEFT",
  ArrowRight: "VK_RIGHT",
  ArrowUp: "VK_UP",
};

/**
 * Actor implementation for about:keyboard.
 */
export class CustomKeysParent extends JSWindowActorParent {
  getKeyData(id) {
    const keyEl =
      this.browsingContext.topChromeWindow.document.getElementById(id);
    if (!keyEl) {
      return null;
    }
    return {
      shortcut: ShortcutUtils.prettifyShortcut(keyEl),
      isCustomized: !!CustomKeys.getDefaultKey(id),
    };
  }

  // Get keyboard shortcuts in the form:
  // { <categoryTitle>: { <keyId>: { title: <title>, shortcut: <String>, isCustomized: <Boolean> } }
  // If categoryTitle or keyTitle begins with "customkeys-", it is a Fluent id.
  getKeys() {
    // Make Dev Tools populate the Browser Tools menu so we can gather those
    // shortcuts here.
    const topWin = this.browsingContext.topChromeWindow;
    Services.obs.notifyObservers(topWin, "customkeys-ui-showing");

    const add = (category, id, title) => {
      const data = this.getKeyData(id);
      if (data) {
        data.title = title;
        category[id] = data;
      }
    };

    const keys = {};
    // Gather as many keys as we can from the menu bar menus.
    const mainMenuBar = topWin.document.getElementById("main-menubar");
    for (const item of mainMenuBar.querySelectorAll("menuitem[key]")) {
      const menu = item.closest("menu");
      if (menu.id == "historyUndoMenu" || menu.id == "historyUndoWindowMenu") {
        // The reopen last tab/window commands have the label of the actual
        // tab/window they will reopen. We handle those specially later.
        continue;
      }
      if (!keys[menu.label]) {
        keys[menu.label] = {};
      }
      add(keys[menu.label], item.getAttribute("key"), item.label);
    }

    // Add some shortcuts that aren't available in menus.
    const fileCat = topWin.document.getElementById("file-menu").label;
    let cat = keys[fileCat];
    add(cat, "key_duplicateTab", "customkeys-file-duplicate-tab");
    const isMac = AppConstants.platform === "macosx";
    if (!isMac) {
      add(
        cat,
        "focusURLBar2",
        topWin.document.getElementById("menu_openLocation").label
      );
    }
    add(cat, "key_search", "customkeys-file-focus-search");
    add(cat, "key_search2", "customkeys-file-focus-search");
    const historyCat = topWin.document.getElementById("history-menu").label;
    cat = keys[historyCat];
    add(
      cat,
      "key_restoreLastClosedTabOrWindowOrSession",
      "customkeys-history-reopen-tab"
    );
    add(cat, "key_undoCloseWindow", "customkeys-history-reopen-window");
    const sidebarCat = topWin.document.getElementById(
      "viewSidebarMenuMenu"
    ).label;
    cat = keys[sidebarCat];
    add(cat, "toggleSidebarKb", "customkeys-sidebar-toggle");
    const viewCat = topWin.document.getElementById("view-menu").label;
    cat = keys[viewCat];
    add(cat, "viewBookmarksToolbarKb", "customkeys-view-bookmarks-toolbar");
    add(
      cat,
      "key_togglePictureInPicture",
      "customkeys-view-picture-in-picture"
    );
    add(cat, "key_addTabSplitView", "customkeys-view-add-split-view");
    add(cat, "key_separateTabSplitView", "customkeys-view-separate-split-view");
    const editCat = topWin.document.getElementById("edit-menu").label;
    cat = keys[editCat];
    add(
      cat,
      "key_findAgain2",
      topWin.document.getElementById("menu_findAgain").label
    );
    add(cat, "key_findPrevious", "customkeys-edit-find-previous");
    add(cat, "key_findPrevious2", "customkeys-edit-find-previous");
    const toolsCat = topWin.document.getElementById("tools-menu").label;
    cat = keys[toolsCat];
    add(cat, "key_screenshot", "customkeys-tools-screenshot");
    const browserToolsCat =
      topWin.document.getElementById("browserToolsMenu").label;
    cat = keys[browserToolsCat];
    add(cat, "key_toggleToolboxF12", "customkeys-dev-tools");
    add(cat, "key_inspector", "customkeys-dev-inspector");
    add(cat, "key_webconsole", "customkeys-dev-webconsole");
    add(cat, "key_jsdebugger", "customkeys-dev-debugger");
    add(cat, "key_netmonitor", "customkeys-dev-network");
    add(cat, "key_styleeditor", "customkeys-dev-style");
    add(cat, "key_performance", "customkeys-dev-performance");
    add(cat, "key_storage", "customkeys-dev-storage");
    add(cat, "key_dom", "customkeys-dev-dom");
    add(cat, "key_accessibility", "customkeys-dev-accessibility");
    add(cat, "key_profilerStartStop", "customkeys-dev-profiler-toggle");
    add(
      cat,
      "key_profilerStartStopAlternate",
      "customkeys-dev-profiler-toggle"
    );
    add(cat, "key_profilerCapture", "customkeys-dev-profiler-capture");
    add(cat, "key_profilerCaptureAlternate", "customkeys-dev-profiler-capture");
    cat = keys["customkeys-category-navigation"] = {};
    add(cat, "goBackKb", "customkeys-nav-back");
    add(cat, "goForwardKb", "customkeys-nav-forward");
    add(cat, "goHome", "customkeys-nav-home");
    add(cat, "key_reload", "customkeys-nav-reload");
    add(cat, "key_reload2", "customkeys-nav-reload");
    add(cat, "key_reload_skip_cache", "customkeys-nav-reload-skip-cache");
    add(cat, "key_reload_skip_cache2", "customkeys-nav-reload-skip-cache");
    add(cat, "key_stop", "customkeys-nav-stop");
    if (AppConstants.platform !== "win") {
      add(cat, "goBackKb2", "customkeys-nav-back");
      add(cat, "goForwardKb2", "customkeys-nav-forward");
    }
    if (isMac) {
      add(cat, "key_stop_mac", "customkeys-nav-stop");
    }
    for (let i = 1; i <= 8; i++) {
      add(cat, `key_selectTab${i}`, `customkeys-nav-select-tab-${i}`);
    }
    add(cat, "key_selectLastTab", "customkeys-nav-select-last-tab");
    add(cat, "key_toggleMute", "customkeys-nav-toggle-mute");

    return keys;
  }

  prettifyShortcut({ modifiers, key, keycode }) {
    // ShortcutUtils.prettifyShortcut needs a key element, but we don't have
    // that here. It simply concatenates the prettified modifiers and key
    // anyway.
    const prettyMods = ShortcutUtils.getModifierString(modifiers);
    const prettyKey = ShortcutUtils.getKeyString(keycode, key);
    return prettyMods + prettyKey;
  }

  async receiveMessage(message) {
    switch (message.name) {
      case "CustomKeys:CaptureKey": {
        if (message.data) {
          this.browsingContext.embedderElement.addEventListener(
            "keydown",
            this
          );
        } else {
          this.browsingContext.embedderElement.removeEventListener(
            "keydown",
            this
          );
        }
        return null;
      }
      case "CustomKeys:ChangeKey": {
        CustomKeys.changeKey(message.data.id, message.data);
        return this.getKeyData(message.data.id);
      }
      case "CustomKeys:ClearKey": {
        const id = message.data;
        CustomKeys.clearKey(id);
        return this.getKeyData(id);
      }
      case "CustomKeys:GetDefaultKey": {
        const data = { id: message.data };
        Object.assign(data, CustomKeys.getDefaultKey(data.id));
        data.shortcut = this.prettifyShortcut(data);
        return data;
      }
      case "CustomKeys:GetKeys": {
        return this.getKeys();
      }
      case "CustomKeys:ResetAll": {
        return CustomKeys.resetAll();
      }
      case "CustomKeys:ResetKey": {
        CustomKeys.resetKey(message.data);
        return this.getKeyData(message.data);
      }
    }
    return null;
  }

  handleEvent(event) {
    if (event.type == "keydown") {
      event.preventDefault();
      event.stopPropagation();
      const data = {};
      let modifiers = [];
      const isMac = AppConstants.platform === "macosx";
      if (event.altKey) {
        modifiers.push("alt");
      }
      if (event.ctrlKey) {
        modifiers.push(isMac ? "control" : "accel");
      }
      // We can't support the Windows key (metaKey) on Windows because
      // GlobalKeyListener ignores the Windows key state if no shortcut keys
      // match the event. See bug 1100862. Unfortunately, there are multiple
      // keysets and the absence of a match in one keyset doesn't mean there
      // won't be a match in another.
      if (event.metaKey && AppConstants.platform !== "win") {
        modifiers.push(isMac ? "accel" : "meta");
      }
      if (event.shiftKey) {
        modifiers.push("shift");
      }
      data.modifiers = modifiers.sort().join(",");
      if (
        event.key == "Alt" ||
        event.key == "Control" ||
        event.key == "Meta" ||
        event.key == "Shift"
      ) {
        data.isModifier = true;
        data.modifierString = ShortcutUtils.getModifierString(data.modifiers);
        this.sendAsyncMessage("CustomKeys:CapturedKey", data);
        return;
      }
      data.isValid = true;
      if (event.key.length == 1) {
        data.key = event.key.toUpperCase();
        if (!modifiers.length || (event.shiftKey && modifiers.length == 1)) {
          // This is a printable character; e.g. a letter, number or punctuation
          // mark. That's not a valid shortcut key.
          data.isValid = false;
        }
      } else {
        data.keycode =
          KEY_NAMES_TO_CODES[event.key] ??
          ShortcutUtils.getKeycodeAttribute(event.key);
        if (event.key == "Backspace") {
          data.isValid = false;
        }
      }
      data.shortcut = this.prettifyShortcut(data);
      this.sendAsyncMessage("CustomKeys:CapturedKey", data);
    }
  }
}

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

var Startup = Cc["@mozilla.org/devtools/startup-clh;1"].getService(
  Ci.nsISupports
).wrappedJSObject;
var { Toolbox } = require("resource://devtools/client/framework/toolbox.js");

var gToolbox,
  toolIDs,
  toolShortcuts = [],
  idIndex,
  modifiedPrefs = [];

async function test() {
  addTab("about:blank").then(async function () {
    toolIDs = [];
    for (const [id, definition] of gDevTools._tools) {
      const shortcut = Startup.KeyShortcuts.filter(s => s.toolId == id)[0];
      if (!shortcut) {
        continue;
      }
      toolIDs.push(id);
      toolShortcuts.push(shortcut);

      // Enable disabled tools
      const pref = definition.visibilityswitch;
      if (pref) {
        const prefValue = Services.prefs.getBoolPref(pref, false);
        if (!prefValue) {
          modifiedPrefs.push(pref);
          Services.prefs.setBoolPref(pref, true);
        }
      }
    }
    const tab = gBrowser.selectedTab;
    idIndex = 0;
    gDevTools
      .showToolboxForTab(tab, {
        toolId: toolIDs[0],
        hostType: Toolbox.HostType.WINDOW,
      })
      .then(testShortcuts);
  });
}

function testShortcuts(toolbox, index) {
  if (index === undefined) {
    index = 1;
  } else if (index == toolIDs.length) {
    tidyUp();
    return;
  }

  gToolbox = toolbox;
  info("Toolbox fired a `ready` event");

  gToolbox.once("select", selectCB);

  const shortcut = toolShortcuts[index];
  const key = shortcut.shortcut;
  const toolModifiers = shortcut.modifiers;
  const modifiers = {
    accelKey: toolModifiers.includes("accel"),
    altKey: toolModifiers.includes("alt"),
    shiftKey: toolModifiers.includes("shift"),
  };
  idIndex = index;
  info(
    "Testing shortcut for tool " +
      index +
      ":" +
      toolIDs[index] +
      " using key " +
      key
  );
  EventUtils.synthesizeKey(key, modifiers, gToolbox.win.parent);
}

function selectCB(id) {
  info("toolbox-select event from " + id);

  is(
    toolIDs.indexOf(id),
    idIndex,
    "Correct tool is selected on pressing the shortcut for " + id
  );

  testShortcuts(gToolbox, idIndex + 1);
}

function tidyUp() {
  gToolbox.destroy().then(function () {
    gBrowser.removeCurrentTab();

    for (const pref of modifiedPrefs) {
      Services.prefs.clearUserPref(pref);
    }
    gToolbox = toolIDs = idIndex = modifiedPrefs = Toolbox = null;
    finish();
  });
}

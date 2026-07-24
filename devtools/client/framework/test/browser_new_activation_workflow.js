/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests devtools API

var gToolbox;

function test() {
  addTab("about:blank").then(async function () {
    loadWebConsole().then(function () {
      console.log("loaded");
    });
  });
}

function loadWebConsole() {
  ok(gDevTools, "gDevTools exists");
  const tab = gBrowser.selectedTab;
  return gDevTools
    .showToolboxForTab(tab, { toolId: "webconsole" })
    .then(function (toolbox) {
      gToolbox = toolbox;
      checkToolLoading();
    });
}

function checkToolLoading() {
  is(gToolbox.currentToolId, "webconsole", "The web console is selected");
  ok(gToolbox.isReady, "toolbox is ready");

  selectAndCheckById("jsdebugger").then(function () {
    selectAndCheckById("styleeditor").then(function () {
      testToggle();
    });
  });
}

function selectAndCheckById(id) {
  return gToolbox.selectTool(id).then(function () {
    const tab = gToolbox.doc.getElementById("toolbox-tab-" + id);
    is(
      tab.classList.contains("selected"),
      true,
      "The " + id + " tab is selected"
    );
    is(
      tab.getAttribute("aria-pressed"),
      "true",
      "The " + id + " tab is pressed"
    );
  });
}

function testToggle() {
  gToolbox.once("destroyed", async () => {
    // Cannot reuse a target after it's destroyed.
    gDevTools
      .showToolboxForTab(gBrowser.selectedTab, { toolId: "styleeditor" })
      .then(function (toolbox) {
        gToolbox = toolbox;
        is(
          gToolbox.currentToolId,
          "styleeditor",
          "The style editor is selected"
        );
        finishUp();
      });
  });

  gToolbox.destroy();
}

function finishUp() {
  gToolbox.destroy().then(function () {
    gToolbox = null;
    gBrowser.removeCurrentTab();
    finish();
  });
}

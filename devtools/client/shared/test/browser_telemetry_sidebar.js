/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
/* eslint-disable mozilla/no-arbitrary-setTimeout */

"use strict";

const TEST_URI =
  "data:text/html;charset=utf-8,<p>browser_telemetry_sidebar.js</p>";

// Because we need to gather stats for the period of time that a tool has been
// opened we make use of setTimeout() to create tool active times.
const TOOL_DELAY = 200;

const DATA = [
  {
    extra: {
      oldpanel: "layoutview",
      newpanel: "animationinspector",
    },
  },
  {
    extra: {
      oldpanel: "animationinspector",
      newpanel: "fontinspector",
    },
  },
  {
    extra: {
      oldpanel: "fontinspector",
      newpanel: "layoutview",
    },
  },
  {
    extra: {
      oldpanel: "layoutview",
      newpanel: "computedview",
    },
  },
  {
    extra: {
      oldpanel: "computedview",
      newpanel: "animationinspector",
    },
  },
  {
    extra: {
      oldpanel: "animationinspector",
      newpanel: "fontinspector",
    },
  },
  {
    extra: {
      oldpanel: "fontinspector",
      newpanel: "layoutview",
    },
  },
  {
    extra: {
      oldpanel: "layoutview",
      newpanel: "computedview",
    },
  },
];

add_task(async function () {
  await addTab(TEST_URI);
  Services.fog.testResetFOG();

  const tab = gBrowser.selectedTab;
  const toolbox = await gDevTools.showToolboxForTab(tab, {
    toolId: "inspector",
  });
  info("inspector opened");

  await testSidebar(toolbox);
  checkResults();
  checkEventTelemetry();

  await toolbox.destroy();
  gBrowser.removeCurrentTab();
});

function testSidebar(toolbox) {
  info("Testing sidebar");

  const inspector = toolbox.getCurrentPanel();
  let sidebarTools = [
    "computedview",
    "layoutview",
    "fontinspector",
    "animationinspector",
  ];

  // Concatenate the array with itself so that we can open each tool twice.
  sidebarTools = [...sidebarTools, ...sidebarTools];

  return new Promise(resolve => {
    // See TOOL_DELAY for why we need setTimeout here
    setTimeout(async function selectSidebarTab() {
      const tool = sidebarTools.pop();
      if (tool) {
        await inspector.sidebar.select(tool);
        setTimeout(function () {
          setTimeout(selectSidebarTab, TOOL_DELAY);
        }, TOOL_DELAY);
      } else {
        resolve();
      }
    }, TOOL_DELAY);
  });
}

function checkResults() {
  is(1, Glean.devtools.inspectorOpenedCount.testGetValue());
  is(1, Glean.devtools.ruleviewOpenedCount.testGetValue());
  is(2, Glean.devtools.computedviewOpenedCount.testGetValue());
  is(3, Glean.devtools.layoutviewOpenedCount.testGetValue());
  is(2, Glean.devtools.fontinspectorOpenedCount.testGetValue());
  Assert.greater(Glean.devtools.computedviewTimeActive.testGetValue().sum, 0);
  Assert.greater(Glean.devtools.layoutviewTimeActive.testGetValue().sum, 0);
  Assert.greater(Glean.devtools.fontinspectorTimeActive.testGetValue().sum, 0);
}

function checkEventTelemetry() {
  const events = Glean.devtoolsMain.sidepanelChangedInspector.testGetValue();
  for (const [datum, ev] of Iterator.zip([DATA, events], { mode: "strict" })) {
    is(datum.extra.oldpanel, ev.extra.oldpanel, "oldpanel is correct");
    is(datum.extra.newpanel, ev.extra.newpanel, "newpanel is correct");
  }
}

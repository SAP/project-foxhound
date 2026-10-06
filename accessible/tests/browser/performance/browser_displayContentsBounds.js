/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// XXX: We can consolidate this once bug 1930955 lands
// eslint-disable-next-line no-unused-vars
const perfMetadata = {
  owner: "Accessibility Team",
  name: "browser_displayContentsBounds.js",
  description:
    "Audit a11y performance when computing bounds for a display:contents accessible with 10000 children.",
  options: {
    default: {
      extra_args: ["headless"],
      manifest: "perftest.toml",
      manifest_flavor: "browser-chrome",
      perfherder: true,
      perfherder_metrics: [
        // Total time for the entire run (this probe is not process specific)
        { name: "A11Y_TotalTime", unit: "ms", shouldAlert: true },

        //////////////// PARENT PROCESS

        // Timing metrics
        { name: "A11Y_DoInitialUpdate_parent", unit: "ms", shouldAlert: false },
        {
          name: "A11Y_ProcessQueuedCacheUpdate_parent",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_ContentRemovedNode_parent",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_ContentRemovedAcc_parent",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_PruneOrInsertSubtree_parent",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_ShutdownChildrenInSubtree_parent",
          unit: "ms",
          shouldAlert: false,
        },
        { name: "A11Y_ShowEvent_parent", unit: "ms", shouldAlert: false },
        { name: "A11Y_RecvCache_parent", unit: "ms", shouldAlert: false },
        {
          name: "A11Y_ProcessShowEvent_parent",
          unit: "ms",
          shouldAlert: false,
        },
        { name: "A11Y_CoalesceEvents_parent", unit: "ms", shouldAlert: false },
        {
          name: "A11Y_CoalesceMutationEvents_parent",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_ProcessHideEvent_parent",
          unit: "ms",
          shouldAlert: false,
        },
        { name: "A11Y_SendCache_parent", unit: "ms", shouldAlert: false },
        { name: "A11Y_WillRefresh_parent", unit: "ms", shouldAlert: false },
        {
          name: "A11Y_AccessibilityServiceInit_parent",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_PlatformShowHideEvent_parent",
          unit: "ms",
          shouldAlert: false,
        },
        // Occurrence metrics
        {
          name: "A11Y_DoInitialUpdate_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ProcessQueuedCacheUpdate_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ContentRemovedNode_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ContentRemovedAcc_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_PruneOrInsertSubtree_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ShutdownChildrenInSubtree_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ShowEvent_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_RecvCache_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ProcessShowEvent_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_CoalesceEvents_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_CoalesceMutationEvents_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ProcessHideEvent_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_SendCache_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_WillRefresh_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_AccessibilityServiceInit_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_PlatformShowHideEvent_Count_parent",
          unit: "iterations",
          shouldAlert: false,
        },

        //////////////// CONTENT PROCESS

        // Timing metrics
        {
          name: "A11Y_DoInitialUpdate_content",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_ProcessQueuedCacheUpdate_content",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_ContentRemovedNode_content",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_ContentRemovedAcc_content",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_PruneOrInsertSubtree_content",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_ShutdownChildrenInSubtree_content",
          unit: "ms",
          shouldAlert: false,
        },
        { name: "A11Y_ShowEvent_content", unit: "ms", shouldAlert: false },
        { name: "A11Y_RecvCache_content", unit: "ms", shouldAlert: false },
        {
          name: "A11Y_ProcessShowEvent_content",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_CoalesceEvents_content",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_CoalesceMutationEvents_content",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_ProcessHideEvent_content",
          unit: "ms",
          shouldAlert: false,
        },
        { name: "A11Y_SendCache_content", unit: "ms", shouldAlert: false },
        { name: "A11Y_WillRefresh_content", unit: "ms", shouldAlert: false },
        {
          name: "A11Y_AccessibilityServiceInit_content",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "A11Y_PlatformShowHideEvent_content",
          unit: "ms",
          shouldAlert: false,
        },
        // Occurrence metrics
        {
          name: "A11Y_DoInitialUpdate_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ProcessQueuedCacheUpdate_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ContentRemovedNode_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ContentRemovedAcc_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_PruneOrInsertSubtree_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ShutdownChildrenInSubtree_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ShowEvent_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_RecvCache_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ProcessShowEvent_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_CoalesceEvents_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_CoalesceMutationEvents_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_ProcessHideEvent_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_SendCache_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_WillRefresh_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_AccessibilityServiceInit_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
        {
          name: "A11Y_PlatformShowHideEvent_Count_content",
          unit: "iterations",
          shouldAlert: false,
        },
      ],
      try_platform: ["linux", "mac", "win"],
      verbose: true,
    },
  },
};

addAccessibleTask(
  `<div id="container" role="group" style="display:none;"></div>`,
  async function testDisplayContentsBounds(browser, accDoc) {
    info("Adding 10000 children to display:contents container");
    const containerShown = waitForEvent(EVENT_SHOW, "container");
    // We add the nodes to the container while it is hidden to
    // ensure we produce a single show event rather than 10000.
    // This makes the perf comparison more straightforward, i.e.
    // the perf cost of this test isn't drowned out by the show event cost.
    await invokeContentTask(browser, [], () => {
      const container = content.document.getElementById("container");
      for (let c = 0; c < 10000; ++c) {
        const child = content.document.createElement("div");
        child.textContent = c;
        container.append(child);
      }
      container.style.setProperty("display", "contents");
    });
    await containerShown;
    info("Container shown, starting bounds measurement");

    const container = findAccessibleChildByID(accDoc, "container");
    await timeThis(async () => {
      const x = {};
      const y = {};
      const w = {};
      const h = {};
      for (let i = 0; i < 100; i++) {
        // Query bounds on the container to exercise the child traversal
        // Do this 100 times to exacerbate the effect :)
        container.getBounds(x, y, w, h);
      }
    });
  }
);

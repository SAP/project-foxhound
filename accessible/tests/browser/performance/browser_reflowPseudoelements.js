/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// XXX: We can consolidate this once bug 1930955 lands
// eslint-disable-next-line no-unused-vars
const perfMetadata = {
  owner: "Accessibility Team",
  name: "browser_reflowPseudoelements.js",
  description:
    "Audit a11y performance when reflowing a table containing 15000 pseudoelements.",
  options: {
    default: {
      extra_args: ["headless"],
      manifest: "perftest.toml",
      manifest_flavor: "browser-chrome",
      perfherder: true,
      perfherder_metrics: [
        // Total time for the entire run (this probe is not process specific)
        {
          name: "A11Y_TotalTime",
          unit: "ms",
          alertThreshold: 5.0,
          shouldAlert: true,
        },

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
        // Occurrance metrics
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
        { name: "A11Y_CoalesceEvents_content", unit: "ms", shouldAlert: false },
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
        // Occurrance metrics
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
  `<div id="container"></div>
  <style>
    .row::before {
      content: attr(data-number);
    }
  </style>`,
  async function testRemoveManySpellingErrors(browser) {
    // populate the container with pseudoelements
    const reorder = waitForEvent(EVENT_REORDER, "container");
    await invokeContentTask(browser, [], () => {
      const container = content.document.getElementById("container");
      for (let i = 0; i < 15000; i++) {
        const newRow = content.document.createElement("div");
        newRow.setAttribute("id", "data" + i);
        newRow.setAttribute("class", "row");
        newRow.setAttribute("data-number", i);
        container.appendChild(newRow);
      }
    });
    info("Waiting for container's EVENT_REORDER.");
    await reorder;

    await timeThis(async () => {
      info("Reflowing...");
      await invokeContentTask(browser, [], () => {
        // We use the following to trigger reflow.
        content.document.body.style.display = "flex";
        content.document.offsetHeight;
      });
      await waitForContentPaint(browser);

      const show = waitForEvent(EVENT_SHOW, "lastRow");
      await invokeContentTask(browser, [], () => {
        // Add a discernable "last row" so we can use its show event as a
        // marker for "all table content is rendered".
        const container = content.document.getElementById("container");
        const lastRow = content.document.createElement("div");
        lastRow.innerText = "I am the last row";
        lastRow.setAttribute("id", "lastRow");
        container.appendChild(lastRow);
      });
      await show;
      info("Last row has been shown after reflow.");
    });
  }
);

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// XXX: We can consolidate this once bug 1930955 lands
// eslint-disable-next-line no-unused-vars
const perfMetadata = {
  owner: "Accessibility Team",
  name: "browser_removeManySpellingErrors.js",
  description:
    "Audit a11y performance when removing 500 spelling errors from content editable.",
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
  `<div id="editable" contenteditable></div>`,
  async function testRemoveManySpellingErrors(browser) {
    let changed = waitForEvent(EVENT_TEXT_ATTRIBUTE_CHANGED);
    await invokeContentTask(browser, [], () => {
      const editable = content.document.getElementById("editable");
      for (let i = 0; i < 500; ++i) {
        const p = content.document.createElement("p");
        p.textContent = "tset tset tset";
        editable.append(p);
      }
      editable.focus();
    });
    // Spell checking is async, so we need to wait for it to happen.
    info("Waiting for spell check");
    await changed;
    await timeThis(async () => {
      info("Removing all content from editable");
      let reorder = waitForEvent(EVENT_REORDER, "editable");
      await invokeContentTask(browser, [], () => {
        content.document.getElementById("editable").innerHTML = "";
      });
      info("Waiting for reorder event");
      await reorder;
    });
  }
);

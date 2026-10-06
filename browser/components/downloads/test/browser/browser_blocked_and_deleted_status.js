/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Verifies that a download with deleted=true and a blocked error shows the
 * correct "File discarded (Blocked)" status in the downloads panel, with no
 * action button.
 */
add_task(async function test_blocked_and_deleted_status_in_panel() {
  await task_resetState();
  registerCleanupFunction(task_resetState);

  await task_addDownloads([
    {
      state: DownloadsCommon.DOWNLOAD_DIRTY,
      deleted: true,
      hasBlockedData: false,
      errorObj: {
        result: Cr.NS_ERROR_FAILURE,
        message: "Download blocked.",
        becauseBlocked: true,
        becauseBlockedByContentAnalysis: false,
        becauseBlockedByReputationCheck: true,
        reputationCheckVerdict: Downloads.Error.BLOCK_VERDICT_MALWARE,
      },
    },
  ]);

  await task_openPanel();

  let listbox = document.getElementById("downloadsListBox");
  Assert.equal(listbox.itemChildren.length, 1);

  let item = listbox.itemChildren[0];
  let statusEl = item.querySelector(".downloadDetailsNormal");
  Assert.equal(
    statusEl.value,
    DownloadsCommon.strings.fileBlockedAndDeleted,
    "Download with deleted+blocked error should show the fileBlockedAndDeleted string"
  );

  let button = item.querySelector(".downloadButton");
  Assert.ok(
    button.hidden,
    "Action button should be hidden for deleted blocked downloads"
  );

  await task_resetState();
});

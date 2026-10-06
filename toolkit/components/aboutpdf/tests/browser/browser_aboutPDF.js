/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function testPageRenders() {
  const tab = await openAboutPDF();
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const doc = content.document;
    const dropzone = doc.getElementById("dropzone");
    ok(dropzone, "dropzone exists");
    ok(doc.getElementById("dropzone-hint"), "dropzone-hint exists");
    ok(doc.getElementById("browse-files"), "browse button exists");

    const fileInput = doc.getElementById("file-input");
    ok(fileInput, "file input exists");
    is(fileInput.accept, ".pdf,application/pdf", "file input accept attribute");
    ok(fileInput.hidden, "file input is hidden");

    await ContentTaskUtils.waitForCondition(
      () => dropzone.title,
      "dropzone title is localized"
    );
    ok(dropzone.title, "dropzone exposes a native title tooltip");

    const errorEl = doc.getElementById("dropzone-error");
    ok(errorEl.hidden, "error is hidden initially");
  });
  BrowserTestUtils.removeTab(tab);
});

add_task(async function testDragVisualState() {
  const tab = await openAboutPDF();
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    const dropzone = content.document.getElementById("dropzone");
    ok(!dropzone.classList.contains("drag-over"), "no drag-over initially");

    dropzone.dispatchEvent(
      new content.DragEvent("dragenter", { bubbles: true, cancelable: true })
    );
    ok(
      dropzone.classList.contains("drag-over"),
      "drag-over added on dragenter"
    );

    dropzone.dispatchEvent(
      new content.DragEvent("dragleave", {
        bubbles: true,
        cancelable: true,
        relatedTarget: content.document.body,
      })
    );
    ok(
      !dropzone.classList.contains("drag-over"),
      "drag-over removed when leaving dropzone"
    );
  });
  BrowserTestUtils.removeTab(tab);
});

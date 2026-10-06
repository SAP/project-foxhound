/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PDF_CONTENTS = `%PDF-1.4
1 0 obj<</Pages 2 0 R>>endobj
2 0 obj<</Kids[3 0 R]/Count 1>>endobj
3 0 obj<</MediaBox[0 0 1 1]>>endobj
trailer<</Root 1 0 R/Size 4>>`;

async function callOpenFile(actor, fileURL) {
  return actor.receiveMessage({
    name: "AboutPDF:OpenFile",
    data: { fileURL },
  });
}

add_task(async function testRejectsNonStringURL() {
  const tab = await openAboutPDF();
  const actor = getAboutPDFActor(tab);
  await Assert.rejects(
    callOpenFile(actor, 42),
    /Expected a file URL/,
    "non-string fileURL rejected"
  );
  await Assert.rejects(
    callOpenFile(actor, undefined),
    /Expected a file URL/,
    "undefined fileURL rejected"
  );
  BrowserTestUtils.removeTab(tab);
});

add_task(async function testRejectsNonFileScheme() {
  const tab = await openAboutPDF();
  const actor = getAboutPDFActor(tab);
  await Assert.rejects(
    callOpenFile(actor, "https://example.com/foo.pdf"),
    /Expected a file URL/,
    "https URL rejected"
  );
  BrowserTestUtils.removeTab(tab);
});

add_task(async function testRejectsNonPDFExtension() {
  const path = await createTempFile(PDF_CONTENTS, { suffix: ".txt" });
  const tab = await openAboutPDF();
  const actor = getAboutPDFActor(tab);
  await Assert.rejects(
    callOpenFile(actor, PathUtils.toFileURI(path)),
    /Expected a PDF file URL/,
    ".txt extension rejected"
  );
  BrowserTestUtils.removeTab(tab);
  await safeRemove(path);
});

add_task(async function testRejectsMissingFile() {
  const path = PathUtils.join(
    PathUtils.tempDir,
    `aboutPDF-missing-${Date.now()}.pdf`
  );
  const tab = await openAboutPDF();
  const actor = getAboutPDFActor(tab);
  await Assert.rejects(
    callOpenFile(actor, PathUtils.toFileURI(path)),
    /Expected an existing PDF file/,
    "non-existent file rejected"
  );
  BrowserTestUtils.removeTab(tab);
});

add_task(async function testRejectsBadMagicBytes() {
  const path = await createTempFile("not actually a pdf");
  const tab = await openAboutPDF();
  const actor = getAboutPDFActor(tab);
  await Assert.rejects(
    callOpenFile(actor, PathUtils.toFileURI(path)),
    /Expected PDF content/,
    "file without %PDF- header rejected"
  );
  BrowserTestUtils.removeTab(tab);
  await safeRemove(path);
});

add_task(async function testAcceptsValidPDFAndNavigates() {
  const path = await createTempFile(PDF_CONTENTS);
  const fileURL = PathUtils.toFileURI(path);

  const tab = await openAboutPDF();
  const actor = getAboutPDFActor(tab);

  const navigated = BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    false,
    url => url === fileURL
  );
  await callOpenFile(actor, fileURL);
  await navigated;

  is(
    tab.linkedBrowser.currentURI.spec,
    fileURL,
    "tab navigated to the PDF file URL"
  );

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const viewer = content.wrappedJSObject.PDFViewerApplication;
    await viewer.testingClose();
  });

  BrowserTestUtils.removeTab(tab);
  await safeRemove(path);
});

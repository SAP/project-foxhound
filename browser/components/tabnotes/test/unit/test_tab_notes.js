/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

add_setup(async () => {
  await TabNotes.init({ basePath: PathUtils.tempDir });
});

registerCleanupFunction(async () => {
  await TabNotes.reset();
  await TabNotes.deinit();
  IOUtils.remove(
    PathUtils.join(PathUtils.tempDir, TabNotes.DATABASE_FILE_NAME),
    {
      ignoreAbsent: true,
    }
  );
});

/**
 * Fake for MozTabbrowserTab.
 */
class FakeTab extends EventTarget {
  /**
   * @param {string} canonicalUrl
   */
  constructor(canonicalUrl) {
    super();
    /** @type {string} */
    this.canonicalUrl = canonicalUrl;
  }
}

add_task(async function tabNotesBasicStorageTests() {
  let tab = new FakeTab("https://example.com/abc");
  let value = "some note";
  let updatedValue = "some other note";

  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  let firstSavedNote = await TabNotes.set(tab, value);
  Assert.ok(firstSavedNote, "TabNotes.set returns the saved tab note");
  Assert.ok(await tabNoteCreated, "observers were notified of TabNote:Created");
  Assert.equal(
    firstSavedNote.canonicalUrl,
    tab.canonicalUrl,
    "TabNotes.set stores the right URL"
  );
  Assert.equal(
    firstSavedNote.text,
    value,
    "TabNotes.set stores the right note text"
  );
  Assert.ok(firstSavedNote.created, "TabNotes.set stores a creation timestamp");

  Assert.equal(
    await TabNotes.has(tab),
    true,
    "TabNotes.has indicates that the tab has a note"
  );

  Assert.deepEqual(
    await TabNotes.get(tab),
    firstSavedNote,
    "TabNotes.get returns previously set note"
  );

  let tabNoteEdited = BrowserTestUtils.waitForEvent(tab, "TabNote:Edited");
  let editedSavedNote = await TabNotes.set(tab, updatedValue);

  Assert.ok(editedSavedNote, "TabNotes.set returns the updated tab note");
  Assert.ok(await tabNoteEdited, "observers were notified of TabNote:Edited");
  Assert.equal(
    editedSavedNote.canonicalUrl,
    tab.canonicalUrl,
    "TabNotes.set should keep the same URL when updating"
  );
  Assert.equal(
    editedSavedNote.text,
    updatedValue,
    "TabNotes.set saved the new note text"
  );
  Assert.equal(
    Temporal.Instant.compare(editedSavedNote.created, firstSavedNote.created),
    0,
    "TabNotes.set should not change the creation timestamp when updating an existing note"
  );

  const tabWithoutCanonicalUrl = new FakeTab(undefined);
  let wasDeleted = await TabNotes.delete(tabWithoutCanonicalUrl);
  Assert.ok(
    !wasDeleted,
    "TabNotes.delete should return false if nothing was deleted"
  );

  let tabNoteRemoved = BrowserTestUtils.waitForEvent(tab, "TabNote:Removed");
  wasDeleted = await TabNotes.delete(tab);
  Assert.ok(await tabNoteRemoved, "listeners were notified of TabNote:Removed");
  Assert.ok(
    wasDeleted,
    "TabNotes.delete should return true if something was deleted"
  );

  Assert.equal(
    await TabNotes.has(tab),
    false,
    "TabNotes.has indicates that the deleted URL no longer has a note"
  );

  Assert.equal(
    await TabNotes.get(tab),
    undefined,
    "TabNotes.get returns undefined for URL that does not have a note"
  );

  await TabNotes.reset();
});

add_task(function tabNotesIsEligible() {
  Assert.ok(
    TabNotes.isEligible(new FakeTab("https://example.com/")),
    "tab with a valid canonical URL is eligible"
  );
  Assert.ok(
    !TabNotes.isEligible(new FakeTab(undefined)),
    "tab with no canonical URL is ineligible"
  );
  Assert.ok(
    !TabNotes.isEligible(new FakeTab("not a valid URL")),
    "tab with an unparseable canonical URL is ineligible"
  );
});

add_task(async function tabNotesCount() {
  const tab1 = new FakeTab("https://example.com/1");
  const tab2 = new FakeTab("https://example.com/2");

  Assert.equal(await TabNotes.count(), 0, "should be zero tab notes to start");
  await TabNotes.set(tab1, "Test note 1");
  Assert.equal(await TabNotes.count(), 1, "should be one tab note");
  await TabNotes.set(tab2, "Test note 2");
  Assert.equal(await TabNotes.count(), 2, "should be two tab notes");
  await TabNotes.delete(tab2);
  Assert.equal(await TabNotes.count(), 1, "should be one tab note again");
  await TabNotes.reset();
  Assert.equal(await TabNotes.count(), 0, "should be zero tab notes again");
});

add_task(async function tabNotesSanitizationTests() {
  let tab = new FakeTab("https://example.com/");
  let tooLongValue = "x".repeat(1500);
  let correctValue = "x".repeat(1000);

  const savedNote = await TabNotes.set(tab, tooLongValue);

  Assert.equal(
    savedNote.text,
    correctValue,
    "TabNotes.set truncates note length"
  );

  await TabNotes.reset();
});

add_task(async function tabNotesErrors() {
  await Assert.rejects(
    TabNotes.set(new FakeTab(undefined), "valid note text"),
    /RangeError/,
    "tabs without canonical URLs are not eligible for tab notes"
  );

  await Assert.rejects(
    TabNotes.set(new FakeTab("not a valid URL"), "valid note text"),
    /RangeError/,
    "invalid URLs should not be allowed in TabNotes.set"
  );

  await Assert.rejects(
    TabNotes.set(new FakeTab("https://example.com"), ""),
    /RangeError/,
    "empty note text should not be allowed in TabNotes.set"
  );
});

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Smoke test for the top-level Languages settings pane: its sidebar entry
// exists and the pane hosts the four migrated groups.

const LANGUAGE_GROUP_IDS = [
  "browserLanguage",
  "websiteLanguage",
  "translations",
  "spellCheck",
];

add_task(async function testLanguagesPaneHostsAllGroups() {
  let doc = await openLanguagesPrefs();

  let navButton = doc.getElementById("category-languages");
  ok(navButton, "Languages sidebar entry is rendered");
  is(
    navButton.getAttribute("view"),
    "paneLanguages",
    "Sidebar entry routes to paneLanguages"
  );

  let pane = Array.from(doc.querySelectorAll("setting-pane")).find(
    p => p.name === "paneLanguages"
  );
  ok(pane, "paneLanguages setting-pane exists");

  for (let groupId of LANGUAGE_GROUP_IDS) {
    let group = pane.querySelector(`setting-group[groupid="${groupId}"]`);
    ok(group, `paneLanguages hosts the ${groupId} group`);
  }

  // The migrated groups must not render outside paneLanguages.
  let strayGroups = Array.from(
    doc.querySelectorAll(
      LANGUAGE_GROUP_IDS.map(id => `setting-group[groupid="${id}"]`).join(",")
    )
  ).filter(el => el.closest("setting-pane")?.name !== "paneLanguages");
  Assert.deepEqual(
    strayGroups.map(el => el.getAttribute("groupid")),
    [],
    "Migrated language groups are not rendered outside paneLanguages"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

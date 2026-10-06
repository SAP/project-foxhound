/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_releaseNotesURL_domain() {
  const defaultBranch = Services.prefs.getDefaultBranch("");
  if (!defaultBranch.getCharPref("app.releaseNotesURL", "")) {
    ok(true, "app.releaseNotesURL is not set on this build, skipping");
    return;
  }
  for (const pref of [
    "app.releaseNotesURL",
    "app.releaseNotesURL.aboutDialog",
    "app.releaseNotesURL.prompt",
  ]) {
    const url = defaultBranch.getCharPref(pref, "");
    if (url) {
      ok(
        url.startsWith("https://www.firefox.com/"),
        `${pref} should point to firefox.com, got: ${url}`
      );
    }
  }
});

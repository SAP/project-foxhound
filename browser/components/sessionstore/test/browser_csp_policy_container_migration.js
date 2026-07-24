"use strict";

// We use data URL because CSP_ShouldURIInheritCSP requires the URL to be
// about:blank, abour:srcdoc, or be a blob, filesystem, data, or javascript scheme.
const URL = `data:text/html,<html><body> <span id="change_me">Original</span> <script> document.getElementById("change_me").textContent = "Modified"; </script></body></html>`;

const CSP_JSON = `{"csp-policies":[{"default-src":["'self'"],"report-only":false}]}`;

const CSP_SERIALIZED =
  "CdntGuXUQAS/4CfOuSPZrAAAAAAAAAAAwAAAAAAAAEYB3pRy0IA0EdOTmQAQS6D9QJIHOlRteE8wkTq4cYEyCMYAAAAC/////wAAAbsBAAAAKmh0dHBzOi8vYi5jb21wYXNzLWRlbW8uY29tL2NzcF9wbGF5Z3JvdW5kLwAAAAAAAAAFAAAACAAAABIAAAAI/////wAAAAj/////AAAACAAAABIAAAAaAAAAEAAAABoAAAAQAAAAGgAAABAAAAAqAAAAAAAAACr/////AAAAAP////8AAAAa/////wAAABr/////AQAAAAAAAAAAADh7IjEiOnsiMCI6Imh0dHBzOi8vYi5jb21wYXNzLWRlbW8uY29tL2NzcF9wbGF5Z3JvdW5kLyJ9fQAAAAEAAAASAGQAZQBmAGEAdQBsAHQALQBzAHIAYwAgACcAcwBlAGwAZgAnAAAA";

// Same CSP, but serialized as a policy container
const POLICY_CONTAINER_SERIALIZED =
  "ydqGXsPXSqGicQ9XHwE8MAAAAAAAAAAAwAAAAAAAAEYAAAABAQnZ7Rrl1EAEv+Anzrkj2awdYyAIbJdIrqUcFuLaoPT2Ad6UctCANBHTk5kAEEug/UCSBzpUbXhPMJE6uHGBMgjGAAAAAv////8AAAG7AQAAACpodHRwczovL2IuY29tcGFzcy1kZW1vLmNvbS9jc3BfcGxheWdyb3VuZC8AAAAAAAAABQAAAAgAAAASAAAACP////8AAAAI/////wAAAAgAAAASAAAAGgAAABAAAAAaAAAAEAAAABoAAAAQAAAAKgAAAAAAAAAq/////wAAAAD/////AAAAGv////8AAAAa/////wEAAAAAAAAAAAA4eyIxIjp7IjAiOiJodHRwczovL2IuY29tcGFzcy1kZW1vLmNvbS9jc3BfcGxheWdyb3VuZC8ifX0AAAABAAAAEgBkAGUAZgBhAHUAbAB0AC0AcwByAGMAIAAnAHMAZQBsAGYAJwAAAAFIEv8yG/9CO5f8QKVpba0iSBL/Mhv/QjuX/EClaW2tIgAAAAEAAA==";

/*
 * Tests that whether we pass a serialized CSP or policy container
 * to the session store, it gets deserialized correctly and restored
 * in the tab state.
 */
add_task(async function () {
  // Sanity check: ensure that the CSP JSON and serialized CSP match
  is(
    E10SUtils.deserializeCSP(CSP_SERIALIZED).toJSON(),
    CSP_JSON,
    "CSP should deserialize correctly from serialized CSP string"
  );

  // Sanity check
  await checkScriptRunsWithoutCSP({
    url: URL,
  });

  // Firefox 142 and earlier writes entry.csp;
  await checkCSPWithSessionHistoryEntry({ url: URL, csp: CSP_SERIALIZED });
  // Firefox 143 and later writes to policyContainer (bug 1974070).
  await checkCSPWithSessionHistoryEntry({
    url: URL,
    policyContainer: POLICY_CONTAINER_SERIALIZED,
  });
});

async function checkCSPWithSessionHistoryEntry(entry) {
  // Create session history entry with `csp` property
  const tab = await createTabWithSessionHistoryEntry(entry);

  // check that the inline script is blocked
  is(await didScriptRun(tab.linkedBrowser), false);

  is(
    tab.linkedBrowser.policyContainer.csp.toJSON(),
    CSP_JSON,
    "CSP should be restored correctly from session history entry"
  );

  // cleanup
  BrowserTestUtils.removeTab(tab);
}

async function checkScriptRunsWithoutCSP(entry) {
  // Create session history entry without `csp` property
  const tab = await createTabWithSessionHistoryEntry(entry);

  // check that the inline script runs
  is(await didScriptRun(tab.linkedBrowser), true);

  is(
    tab.linkedBrowser.policyContainer.csp.toJSON(),
    `{"csp-policies":[]}`,
    "CSP should not be restored when not present in session history entry"
  );

  // cleanup
  BrowserTestUtils.removeTab(tab);
}

async function createTabWithSessionHistoryEntry(entry) {
  const state = {
    entries: [entry],
  };

  // create a new tab
  const tab = BrowserTestUtils.addTab(gBrowser);

  // set the tab's state
  ss.setTabState(tab, JSON.stringify(state));

  // wait for the tab to be loaded
  await promiseBrowserLoaded(tab.linkedBrowser);

  return tab;
}

function didScriptRun(browser) {
  return SpecialPowers.spawn(browser, [], function () {
    return (
      content.document.getElementById("change_me").innerText === "Modified"
    );
  });
}

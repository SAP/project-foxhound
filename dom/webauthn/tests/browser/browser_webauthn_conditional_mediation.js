/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const TEST_URL = "https://example.com";

let gAuthenticatorId = add_virtual_authenticator();
let gExpectNotAllowedError = expectError("NotAllowed");
let gExpectAbortError = expectError("Abort");
let gPendingConditionalGetSubject = "webauthn:conditional-get-pending";
let gWebAuthnService = Cc["@mozilla.org/webauthn/service;1"].getService(
  Ci.nsIWebAuthnService
);

add_task(async function test_webauthn_modal_request_cancels_conditional_get() {
  // Open a new tab.
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  let browser = tab.linkedBrowser.browsingContext.embedderElement;
  let browsingContextId = browser.browsingContext.id;

  let transactionId = gWebAuthnService.hasPendingConditionalGet(
    browsingContextId,
    TEST_URL
  );
  Assert.equal(transactionId, 0, "should not have a pending conditional get");

  let requestStarted = TestUtils.topicObserved(gPendingConditionalGetSubject);

  let active = true;
  let condPromise = promiseWebAuthnGetAssertionDiscoverable(tab, "conditional")
    .then(arrivingHereIsBad)
    .catch(gExpectAbortError)
    .then(() => (active = false));

  await requestStarted;

  transactionId = gWebAuthnService.hasPendingConditionalGet(
    browsingContextId,
    TEST_URL
  );
  Assert.notEqual(transactionId, 0, "should have a pending conditional get");

  ok(active, "conditional request should still be active");

  let promptPromise = promiseNotification("webauthn-prompt-register-direct");
  let modalPromise = promiseWebAuthnMakeCredential(tab, "direct");

  await condPromise;

  ok(!active, "conditional request should not be active");

  // Proceed through the consent prompt
  await promptPromise;
  PopupNotifications.panel.firstElementChild.secondaryButton.click();
  await modalPromise;

  // Close tab.
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_webauthn_resume_conditional_get() {
  // Open a new tab.
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  let browser = tab.linkedBrowser.browsingContext.embedderElement;
  let browsingContextId = browser.browsingContext.id;

  let transactionId = gWebAuthnService.hasPendingConditionalGet(
    browsingContextId,
    TEST_URL
  );
  Assert.equal(transactionId, 0, "should not have a pending conditional get");

  let requestStarted = TestUtils.topicObserved(gPendingConditionalGetSubject);

  let active = true;
  let promise = promiseWebAuthnGetAssertionDiscoverable(tab, "conditional")
    .then(arrivingHereIsBad)
    .catch(gExpectNotAllowedError)
    .then(() => (active = false));

  await requestStarted;

  transactionId = gWebAuthnService.hasPendingConditionalGet(0, TEST_URL);
  Assert.equal(
    transactionId,
    0,
    "hasPendingConditionalGet should check the browsing context id"
  );

  transactionId = gWebAuthnService.hasPendingConditionalGet(
    browsingContextId,
    "https://example.org"
  );
  Assert.equal(
    transactionId,
    0,
    "hasPendingConditionalGet should check the origin"
  );

  transactionId = gWebAuthnService.hasPendingConditionalGet(
    browsingContextId,
    TEST_URL
  );
  Assert.notEqual(transactionId, 0, "should have a pending conditional get");

  ok(active, "request should still be active");

  gWebAuthnService.resumeConditionalGet(transactionId);
  await promise;

  ok(!active, "request should not be active");

  // Close tab.
  await BrowserTestUtils.removeTab(tab);
});

async function startConditionalGet(tab) {
  let bcId = tab.linkedBrowser.browsingContext.id;
  let requestStarted = TestUtils.topicObserved(gPendingConditionalGetSubject);
  let state = { active: true, error: null };
  let promise = promiseWebAuthnGetAssertionDiscoverable(tab, "conditional")
    .catch(err => {
      state.error = err;
    })
    .then(() => {
      state.active = false;
    });
  await requestStarted;
  let tid = gWebAuthnService.hasPendingConditionalGet(bcId, TEST_URL);
  Assert.notEqual(tid, 0, "conditional get should be pending");
  return { tab, bcId, tid, state, promise };
}

add_task(async function test_conditional_gets_in_two_tabs_coexist() {
  let a = await startConditionalGet(
    await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL)
  );
  let b = await startConditionalGet(
    await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL)
  );

  Assert.notEqual(a.tid, b.tid, "transaction ids should differ");
  Assert.equal(
    gWebAuthnService.hasPendingConditionalGet(a.bcId, TEST_URL),
    a.tid,
    "tab A's conditional get is still pending"
  );
  Assert.equal(
    gWebAuthnService.hasPendingConditionalGet(b.bcId, TEST_URL),
    b.tid,
    "tab B's conditional get is still pending"
  );

  // Cleanup: cancelling one shouldn't disturb the other.
  gWebAuthnService.cancel(a.tid);
  await a.promise;
  Assert.equal(a.state.error?.name, "NotAllowedError", "A got NotAllowedError");
  Assert.equal(
    gWebAuthnService.hasPendingConditionalGet(b.bcId, TEST_URL),
    b.tid,
    "B is unaffected by A's cancel"
  );

  gWebAuthnService.cancel(b.tid);
  await b.promise;
  Assert.equal(b.state.error?.name, "NotAllowedError", "B got NotAllowedError");

  await BrowserTestUtils.removeTab(a.tab);
  await BrowserTestUtils.removeTab(b.tab);
});

add_task(async function test_promote_one_tab_leaves_other_pending() {
  let a = await startConditionalGet(
    await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL)
  );
  let b = await startConditionalGet(
    await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL)
  );

  // Promote A. With no credentials registered, the platform flow will reject
  // A with NotAllowedError, but B should remain pending the whole time.
  gWebAuthnService.resumeConditionalGet(a.tid);
  await a.promise;
  Assert.equal(a.state.error?.name, "NotAllowedError", "A got NotAllowedError");

  Assert.equal(
    gWebAuthnService.hasPendingConditionalGet(b.bcId, TEST_URL),
    b.tid,
    "B's conditional get is still pending after A was promoted"
  );

  gWebAuthnService.cancel(b.tid);
  await b.promise;
  Assert.equal(b.state.error?.name, "NotAllowedError", "B got NotAllowedError");

  await BrowserTestUtils.removeTab(a.tab);
  await BrowserTestUtils.removeTab(b.tab);
});

// Test promoting a conditional get in tab B while tab A's modal is still
// active.
add_task(async function test_promote_then_promote_in_other_tab() {
  let cred = await addCredential(gAuthenticatorId, "example.com");

  let a = await startConditionalGet(
    await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL)
  );
  let b = await startConditionalGet(
    await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL)
  );

  // Promote A, then promote B before A's dispatch can complete. A's
  // authenticator callback runs on a background thread and races against B's
  // promotion, which resets A's active transaction on the main thread. Both
  // outcomes are correct: if B's reset wins the race, A is aborted with
  // NotAllowedError; if A's callback wins, A resolves successfully. The point
  // of this test is that the overwrite settles A's promise exactly once and
  // does not trip the MozPromiseHolder destructor assertion.
  gWebAuthnService.resumeConditionalGet(a.tid);
  gWebAuthnService.resumeConditionalGet(b.tid);

  await a.promise;
  Assert.ok(
    a.state.error === null || a.state.error?.name === "NotAllowedError",
    `A resolved or was aborted with NotAllowedError (got ${
      a.state.error?.name ?? "success"
    })`
  );

  await b.promise;
  Assert.equal(b.state.error, null, "B resolved successfully");

  gWebAuthnService.removeCredential(gAuthenticatorId, cred);
  await BrowserTestUtils.removeTab(a.tab);
  await BrowserTestUtils.removeTab(b.tab);
});

// A modal request in tab B must supersede tab A's promoted modal but must NOT
// disturb tab A's pending conditional get if A hadn't been promoted.
add_task(async function test_modal_in_other_tab_leaves_conditional_pending() {
  let a = await startConditionalGet(
    await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL)
  );
  let tabB = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  let promptPromise = promiseNotification("webauthn-prompt-register-direct");
  let modalPromise = promiseWebAuthnMakeCredential(tabB, "direct");
  await promptPromise;

  Assert.equal(
    gWebAuthnService.hasPendingConditionalGet(a.bcId, TEST_URL),
    a.tid,
    "tab A's conditional is still pending while tab B has a modal up"
  );

  PopupNotifications.panel.firstElementChild.secondaryButton.click();
  await modalPromise;

  Assert.equal(
    gWebAuthnService.hasPendingConditionalGet(a.bcId, TEST_URL),
    a.tid,
    "tab A's conditional is still pending after tab B's modal completes"
  );

  gWebAuthnService.cancel(a.tid);
  await a.promise;
  Assert.equal(a.state.error?.name, "NotAllowedError", "A got NotAllowedError");

  await BrowserTestUtils.removeTab(a.tab);
  await BrowserTestUtils.removeTab(tabB);
});

// Closing a tab that has a pending conditional get should remove it from
// the service's tracking, and must not disturb other tabs' pending
// conditional gets.
add_task(async function test_tab_close_clears_pending_conditional_get() {
  let a = await startConditionalGet(
    await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL)
  );
  let b = await startConditionalGet(
    await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL)
  );

  await BrowserTestUtils.removeTab(a.tab);
  await TestUtils.waitForCondition(
    () => gWebAuthnService.hasPendingConditionalGet(a.bcId, TEST_URL) == 0,
    "tab A's conditional get should be removed after closing tab A"
  );

  Assert.equal(
    gWebAuthnService.hasPendingConditionalGet(b.bcId, TEST_URL),
    b.tid,
    "tab B's conditional get should survive closing tab A"
  );

  await BrowserTestUtils.removeTab(b.tab);
  await TestUtils.waitForCondition(
    () => gWebAuthnService.hasPendingConditionalGet(b.bcId, TEST_URL) == 0,
    "tab B's conditional get should be removed after closing tab B"
  );
});

add_task(async function test_webauthn_select_autofill_entry() {
  // Open a new tab.
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  // Add credentials
  let cred1 = await addCredential(gAuthenticatorId, "example.com");
  let cred2 = await addCredential(gAuthenticatorId, "example.com");

  let browser = tab.linkedBrowser.browsingContext.embedderElement;
  let browsingContextId = browser.browsingContext.id;

  let transactionId = gWebAuthnService.hasPendingConditionalGet(
    browsingContextId,
    TEST_URL
  );
  Assert.equal(transactionId, 0, "should not have a pending conditional get");

  let requestStarted = TestUtils.topicObserved(gPendingConditionalGetSubject);

  let active = true;
  let promise = promiseWebAuthnGetAssertionDiscoverable(tab, "conditional")
    .catch(arrivingHereIsBad)
    .then(() => (active = false));

  await requestStarted;

  transactionId = gWebAuthnService.hasPendingConditionalGet(
    browsingContextId,
    TEST_URL
  );
  Assert.notEqual(transactionId, 0, "should have a pending conditional get");

  let autoFillEntries = await new Promise((resolve, reject) => {
    let callback = {
      QueryInterface: ChromeUtils.generateQI([
        "nsIWebAuthnAutoFillEntriesCallback",
      ]),
      resolve,
      reject,
    };
    gWebAuthnService.getAutoFillEntries(transactionId, callback);
  });
  ok(
    autoFillEntries.length == 2 &&
      autoFillEntries[0].rpId == "example.com" &&
      autoFillEntries[1].rpId == "example.com",
    "should have two autofill entries for example.com"
  );

  gWebAuthnService.selectAutoFillEntry(
    transactionId,
    autoFillEntries[0].credentialId
  );
  let result = await promise;

  ok(!active, "request should not be active");

  // Remove credentials
  gWebAuthnService.removeCredential(gAuthenticatorId, cred1);
  gWebAuthnService.removeCredential(gAuthenticatorId, cred2);

  // Close tab.
  await BrowserTestUtils.removeTab(tab);
});

/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// These tests verify that find-in-page properly reveals hidden
// content (hidden=until-found and closed <details> elements) by triggering
// the ancestor revealing algorithm and firing beforematch events.

/**
 * Request 2x longer timeout for this test.
 * The tests can take a bit longer, which can cause timeouts on debug builds.
 */
requestLongerTimeout(2);

const TEST_PAGE_URI =
  "data:text/html;charset=utf-8," +
  encodeURIComponent(`
<!DOCTYPE html>
<body>
<div id="hidden1" hidden="until-found">First hidden text</div>
<div id="hidden2" hidden="until-found">Second hidden text</div>
<details id="details1">
  <summary>First Details</summary>
  <div>First details text</div>
</details>
<details id="details2">
  <summary>Second Details</summary>
  <div>Second details text</div>
</details>
</body>
`);

// Helper function to wait for Find Again to complete
async function promiseFindAgain(findbar) {
  return new Promise(resolve => {
    let resultListener = {
      onFindResult() {
        findbar.browser.finder.removeResultListener(resultListener);
        resolve();
      },
      onCurrentSelection() {},
      onMatchesCountResult() {},
      onHighlightFinished() {},
    };
    findbar.browser.finder.addResultListener(resultListener);
    findbar.onFindAgainCommand();
  });
}

add_task(async function test_hidden_until_found_reveal_behavior() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_PAGE_URI
  );

  let findbar = await gBrowser.getFindBar();

  let matchCountPromise = new Promise(resolve => {
    let resultListener = {
      onFindResult() {},
      onCurrentSelection() {},
      onHighlightFinished() {},
      onMatchesCountResult(response) {
        if (response.total > 0) {
          findbar.browser.finder.removeResultListener(resultListener);
          resolve(response);
        }
      },
    };
    findbar.browser.finder.addResultListener(resultListener);
  });

  // Perform the first find with highlighting enabled to trigger match counting
  await promiseFindFinished(gBrowser, "hidden text", true);

  let matchCount = await matchCountPromise;
  is(matchCount.total, 2, "Should find 2 matches in hidden elements");

  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    return new Promise(resolve => content.requestAnimationFrame(resolve));
  });

  let { hidden1, hidden2 } = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => {
      return {
        hidden1: content.document.getElementById("hidden1").hidden,
        hidden2: content.document.getElementById("hidden2").hidden,
      };
    }
  );

  is(hidden1, false, "first hidden=until-found element should be revealed");
  is(
    hidden2,
    "until-found",
    "second hidden=until-found element should NOT be revealed yet"
  );

  // Set up beforematch listener for the second element
  let secondBeforematchPromise = SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => {
      return new Promise(resolve => {
        let element = content.document.getElementById("hidden2");
        element.addEventListener("beforematch", () => resolve(), {
          once: true,
        });
      });
    }
  );

  await promiseFindAgain(findbar);

  await secondBeforematchPromise;

  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    return new Promise(resolve => content.requestAnimationFrame(resolve));
  });

  let { secondFindhidden1, secondFindhidden2 } = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => {
      return {
        secondFindhidden1: content.document.getElementById("hidden1").hidden,
        secondFindhidden2: content.document.getElementById("hidden2").hidden,
      };
    }
  );
  is(
    secondFindhidden1,
    false,
    "first element should remain revealed after Find Next"
  );
  is(
    secondFindhidden2,
    false,
    "Second element should be revealed after Find Next"
  );

  gBrowser.removeTab(tab);
});

add_task(async function test_details_reveal_behavior() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_PAGE_URI
  );

  let findbar = await gBrowser.getFindBar();

  let matchCountPromise = new Promise(resolve => {
    let resultListener = {
      onFindResult() {},
      onCurrentSelection() {},
      onHighlightFinished() {},
      onMatchesCountResult(response) {
        if (response.total > 0) {
          findbar.browser.finder.removeResultListener(resultListener);
          resolve(response);
        }
      },
    };
    findbar.browser.finder.addResultListener(resultListener);
  });

  // Perform the first find with highlighting enabled to trigger match counting
  await promiseFindFinished(gBrowser, "details text", true);

  let matchCount = await matchCountPromise;
  is(matchCount.total, 2, "Should find 2 matches in details elements");

  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    return new Promise(resolve => content.requestAnimationFrame(resolve));
  });

  let { open1, open2 } = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => {
      return {
        open1: content.document.getElementById("details1").open,
        open2: content.document.getElementById("details2").open,
      };
    }
  );

  ok(open1, "first <details> element should be open");
  ok(!open2, "second <details> element should NOT be open yet");

  await promiseFindAgain(findbar);

  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    return new Promise(resolve => content.requestAnimationFrame(resolve));
  });

  let { secondFindOpen1, secondFindOpen2 } = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    () => {
      return {
        secondFindOpen1: content.document.getElementById("details1").open,
        secondFindOpen2: content.document.getElementById("details2").open,
      };
    }
  );
  ok(
    secondFindOpen1,
    "First details element should remain opened after Find Next"
  );
  ok(
    secondFindOpen2,
    "Second details element should be opened after Find Next"
  );

  gBrowser.removeTab(tab);
});

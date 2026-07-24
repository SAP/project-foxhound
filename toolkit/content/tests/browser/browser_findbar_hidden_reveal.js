/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests that find-in-page properly reveals and scrolls to content inside
 * hidden=until-found and closed <details> elements.
 */

add_task(async function test_findbar_reveal_hidden_until_found() {
  const TEST_PAGE = `data:text/html,
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; }
          .spacer { height: 200vh; }
        </style>
      </head>
      <body>
        <div class="spacer">Top content</div>
        <div hidden="until-found">
          <p id="hidden-target">SearchableHiddenText</p>
        </div>
        <div class="spacer">Bottom content</div>
      </body>
    </html>`;

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
  let browser = tab.linkedBrowser;

  // Verify initial state: element is hidden and page is not scrolled
  let initialState = await SpecialPowers.spawn(browser, [], () => {
    let hiddenDiv = content.document.querySelector('[hidden="until-found"]');
    let target = content.document.getElementById("hidden-target");
    return {
      isHidden: hiddenDiv.hidden,
      scrollY: content.scrollY,
      targetVisible: target.checkVisibility(),
    };
  });

  ok(initialState.isHidden, "Element should initially be hidden");
  is(initialState.scrollY, 0, "Page should not be scrolled initially");
  ok(!initialState.targetVisible, "Target should not be visible initially");

  // Set up event listener for the beforematch event
  let beforematchPromise = SpecialPowers.spawn(browser, [], () => {
    return new Promise(resolve => {
      let hiddenDiv = content.document.querySelector('[hidden="until-found"]');
      hiddenDiv.addEventListener("beforematch", () => resolve(), {
        once: true,
      });
    });
  });

  // Open findbar and search for text
  await promiseFindFinished(gBrowser, "SearchableHiddenText", false);

  // Wait for the reveal to complete
  await beforematchPromise;

  // Wait one more frame for scroll to complete
  await new Promise(resolve => requestAnimationFrame(resolve));

  // Verify element was revealed and page scrolled
  let finalState = await SpecialPowers.spawn(browser, [], () => {
    let target = content.document.getElementById("hidden-target");
    // After revealing, the hidden attribute is removed entirely
    let parent = target.parentElement;
    return {
      hasHiddenAttr: parent.hasAttribute("hidden"),
      scrollY: content.scrollY,
      targetVisible: target.checkVisibility(),
    };
  });

  ok(
    !finalState.hasHiddenAttr,
    "Hidden attribute should be removed after find"
  );
  Assert.greater(finalState.scrollY, 0, "Page should be scrolled after find");
  ok(finalState.targetVisible, "Target should be visible after find");

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_findbar_reveal_closed_details() {
  const TEST_PAGE = `data:text/html,
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; }
          .spacer { height: 200vh; }
        </style>
      </head>
      <body>
        <div class="spacer">Top content</div>
        <details id="details-target">
          <summary>Click to expand</summary>
          <p id="details-content">SearchableDetailsText</p>
        </details>
        <div class="spacer">Bottom content</div>
      </body>
    </html>`;

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
  let browser = tab.linkedBrowser;

  // Verify initial state: details is closed and page is not scrolled
  let initialState = await SpecialPowers.spawn(browser, [], () => {
    let details = content.document.getElementById("details-target");
    let target = content.document.getElementById("details-content");
    return {
      isOpen: details.open,
      scrollY: content.scrollY,
      targetVisible: target.checkVisibility(),
    };
  });

  ok(!initialState.isOpen, "Details should initially be closed");
  is(initialState.scrollY, 0, "Page should not be scrolled initially");
  ok(!initialState.targetVisible, "Target should not be visible initially");

  // Set up event listener for the toggle event
  let togglePromise = SpecialPowers.spawn(browser, [], () => {
    return new Promise(resolve => {
      let details = content.document.getElementById("details-target");
      details.addEventListener("toggle", () => resolve(), { once: true });
    });
  });

  // Open findbar and search for text
  await promiseFindFinished(gBrowser, "SearchableDetailsText", false);

  // Wait for the reveal to complete
  await togglePromise;

  // Wait one more frame for scroll to complete
  await new Promise(resolve => requestAnimationFrame(resolve));

  // Verify details was opened and page scrolled
  let finalState = await SpecialPowers.spawn(browser, [], () => {
    let details = content.document.getElementById("details-target");
    let target = content.document.getElementById("details-content");
    return {
      isOpen: details.open,
      scrollY: content.scrollY,
      targetVisible: target.checkVisibility(),
    };
  });

  ok(finalState.isOpen, "Details should be opened after find");
  Assert.greater(finalState.scrollY, 0, "Page should be scrolled after find");
  ok(finalState.targetVisible, "Target should be visible after find");

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_window_find_reveal_hidden_until_found() {
  const TEST_PAGE = `data:text/html,
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; }
          .spacer { height: 200vh; }
        </style>
      </head>
      <body>
        <div class="spacer">Top content</div>
        <div hidden="until-found">
          <p id="hidden-target">WindowFindHiddenText</p>
        </div>
        <div class="spacer">Bottom content</div>
      </body>
    </html>`;

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
  let browser = tab.linkedBrowser;

  // Verify initial state: element is hidden and page is not scrolled
  let initialState = await SpecialPowers.spawn(browser, [], () => {
    let hiddenDiv = content.document.querySelector('[hidden="until-found"]');
    let target = content.document.getElementById("hidden-target");
    return {
      isHidden: hiddenDiv.hidden,
      scrollY: content.scrollY,
      targetVisible: target.checkVisibility(),
    };
  });

  ok(initialState.isHidden, "Element should initially be hidden");
  is(initialState.scrollY, 0, "Page should not be scrolled initially");
  ok(!initialState.targetVisible, "Target should not be visible initially");

  // Set up event listener for the beforematch event and use window.find()
  let result = await SpecialPowers.spawn(browser, [], () => {
    return new Promise(resolve => {
      let hiddenDiv = content.document.querySelector('[hidden="until-found"]');
      hiddenDiv.addEventListener(
        "beforematch",
        () => {
          // Wait one frame for scroll to complete
          content.requestAnimationFrame(() => {
            let target = content.document.getElementById("hidden-target");
            let parent = target.parentElement;
            resolve({
              found: true,
              hasHiddenAttr: parent.hasAttribute("hidden"),
              scrollY: content.scrollY,
              targetVisible: target.checkVisibility(),
            });
          });
        },
        { once: true }
      );

      // Use window.find() to search
      content.find("WindowFindHiddenText");
    });
  });

  ok(result.found, "window.find() should find the text");
  ok(
    !result.hasHiddenAttr,
    "Hidden attribute should be removed after window.find()"
  );
  Assert.greater(
    result.scrollY,
    0,
    "Page should be scrolled after window.find()"
  );
  ok(result.targetVisible, "Target should be visible after window.find()");

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_window_find_reveal_closed_details() {
  const TEST_PAGE = `data:text/html,
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; }
          .spacer { height: 200vh; }
        </style>
      </head>
      <body>
        <div class="spacer">Top content</div>
        <details id="details-target">
          <summary>Click to expand</summary>
          <p id="details-content">WindowFindDetailsText</p>
        </details>
        <div class="spacer">Bottom content</div>
      </body>
    </html>`;

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
  let browser = tab.linkedBrowser;

  // Verify initial state: details is closed and page is not scrolled
  let initialState = await SpecialPowers.spawn(browser, [], () => {
    let details = content.document.getElementById("details-target");
    let target = content.document.getElementById("details-content");
    return {
      isOpen: details.open,
      scrollY: content.scrollY,
      targetVisible: target.checkVisibility(),
    };
  });

  ok(!initialState.isOpen, "Details should initially be closed");
  is(initialState.scrollY, 0, "Page should not be scrolled initially");
  ok(!initialState.targetVisible, "Target should not be visible initially");

  // Set up event listener for the toggle event and use window.find()
  let result = await SpecialPowers.spawn(browser, [], () => {
    return new Promise(resolve => {
      let details = content.document.getElementById("details-target");
      details.addEventListener(
        "toggle",
        () => {
          // Wait one frame for scroll to complete
          content.requestAnimationFrame(() => {
            let target = content.document.getElementById("details-content");
            resolve({
              found: true,
              isOpen: details.open,
              scrollY: content.scrollY,
              targetVisible: target.checkVisibility(),
            });
          });
        },
        { once: true }
      );

      // Use window.find() to search
      content.find("WindowFindDetailsText");
    });
  });

  ok(result.found, "window.find() should find the text");
  ok(result.isOpen, "Details should be opened after window.find()");
  Assert.greater(
    result.scrollY,
    0,
    "Page should be scrolled after window.find()"
  );
  ok(result.targetVisible, "Target should be visible after window.find()");

  await BrowserTestUtils.removeTab(tab);
});

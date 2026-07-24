/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AIWindowUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
);

add_task(async function test_aiwindowui_constants() {
  is(AIWindowUI.BOX_ID, "ai-window-box", "BOX_ID constant is correct");
  is(
    AIWindowUI.SPLITTER_ID,
    "ai-window-splitter",
    "SPLITTER_ID constant is correct"
  );
  is(
    AIWindowUI.BROWSER_ID,
    "ai-window-browser",
    "BROWSER_ID constant is correct"
  );
  is(
    AIWindowUI.STACK_CLASS,
    "ai-window-browser-stack",
    "STACK_CLASS constant is correct"
  );
});

add_task(async function test_aiwindowui_sidebar_operations() {
  const box = document.getElementById(AIWindowUI.BOX_ID);
  const splitter = document.getElementById(AIWindowUI.SPLITTER_ID);

  if (!box || !splitter) {
    todo(
      false,
      "AI Window elements not present in this window - skipping DOM tests"
    );
    return;
  }

  const initialBoxHidden = box.hidden;
  const initialSplitterHidden = splitter.hidden;

  try {
    // Test opening
    AIWindowUI.openSidebar(window);
    is(box.hidden, false, "Box should be visible after opening");
    is(splitter.hidden, false, "Splitter should be visible after opening");
    is(
      AIWindowUI.isSidebarOpen(window),
      true,
      "isSidebarOpen should return true after opening"
    );

    // Test closing
    AIWindowUI.closeSidebar(window);
    is(box.hidden, true, "Box should be hidden after closing");
    is(splitter.hidden, true, "Splitter should be hidden after closing");
    is(
      AIWindowUI.isSidebarOpen(window),
      false,
      "isSidebarOpen should return false after closing"
    );

    // Test toggling from closed to open
    const toggleResult1 = AIWindowUI.toggleSidebar(window);
    is(toggleResult1, true, "Toggle should return true when opening");
    is(box.hidden, false, "Box should be visible after toggling open");
    is(
      splitter.hidden,
      false,
      "Splitter should be visible after toggling open"
    );
    is(
      AIWindowUI.isSidebarOpen(window),
      true,
      "isSidebarOpen should return true after toggling open"
    );

    // Test toggling from open to closed
    const toggleResult2 = AIWindowUI.toggleSidebar(window);
    is(toggleResult2, false, "Toggle should return false when closing");
    is(box.hidden, true, "Box should be hidden after toggling closed");
    is(
      splitter.hidden,
      true,
      "Splitter should be hidden after toggling closed"
    );
    is(
      AIWindowUI.isSidebarOpen(window),
      false,
      "isSidebarOpen should return false after toggling closed"
    );
  } finally {
    // Restore initial state
    box.hidden = initialBoxHidden;
    splitter.hidden = initialSplitterHidden;
  }
});

add_task(async function test_aiwindowui_ensureBrowserIsAppended() {
  const box = document.getElementById(AIWindowUI.BOX_ID);

  if (!box) {
    todo(
      false,
      "AI Window box element not present - skipping browser creation test"
    );
    return;
  }

  // Remove any existing browser to start clean
  let existingBrowser = document.getElementById(AIWindowUI.BROWSER_ID);
  if (existingBrowser) {
    existingBrowser.remove();
  }

  try {
    const browser1 = AIWindowUI.ensureBrowserIsAppended(document, box);
    ok(browser1, "Should create and return a browser element");
    is(browser1.id, AIWindowUI.BROWSER_ID, "Browser should have correct ID");
    ok(browser1.isConnected, "Browser should be connected to DOM");

    // Call again - should return the same browser
    const browser2 = AIWindowUI.ensureBrowserIsAppended(document, box);
    is(
      browser1,
      browser2,
      "Should return the same browser instance when called again"
    );
  } finally {
    // Clean up the created browser
    let createdBrowser = document.getElementById(AIWindowUI.BROWSER_ID);
    if (createdBrowser) {
      createdBrowser.remove();
    }
  }
});

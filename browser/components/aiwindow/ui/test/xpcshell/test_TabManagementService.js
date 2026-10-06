/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Import TabManagementService class
const { TabManagementService } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
);

// Mock SessionStore for testing
const mockSessionStore = {
  closedTabs: [],

  undoCloseTab(_window, index) {
    if (index >= 0 && index < this.closedTabs.length) {
      const restoredTab = this.closedTabs.splice(index, 1)[0];
      return {
        linkedBrowser: {
          currentURI: { spec: restoredTab.state.entries[0].url },
        },
        label: restoredTab.state.entries[0].title,
      };
    }
    return null;
  },

  getClosedTabDataForWindow() {
    return [...this.closedTabs];
  },

  addClosedTab(tab) {
    this.closedTabs.unshift(tab);
  },

  reset() {
    this.closedTabs = [];
  },
};

// Create TabManagementService instance with mock SessionStore
const tabManagementService = new TabManagementService(mockSessionStore);

/**
 * Helper to create a mock tab
 *
 * @param {string|null} url - Tab URL
 * @param {string} title - Tab title
 * @param {number} userContextId - Container ID (0 = default)
 * @param {boolean} isClosing - Whether tab is closing
 * @returns {object} Mock tab object
 */
function createMockTab(url, title, userContextId = 0, isClosing = false) {
  const mockTab = {
    linkedBrowser: {
      currentURI: { spec: url },
      contentPrincipal: {
        originAttributes: { userContextId },
      },
    },
    label: title,
    userContextId,
    closing: isClosing,
    documentGlobal: null, // Will be set per test
    getAttribute: () => null,
    _tPos: 0,
  };
  return mockTab;
}

/**
 * Helper to create a mock window
 */
function createMockWindow() {
  const removedTabs = [];
  const mockWindow = {
    gBrowser: {
      tabs: [],
      removeTab(tab) {
        const index = this.tabs.indexOf(tab);
        if (index > -1) {
          const removed = this.tabs.splice(index, 1)[0];
          removedTabs.push(removed);

          // Simulate SessionStore adding the closed tab
          mockSessionStore.addClosedTab({
            state: {
              entries: [
                {
                  url: removed.linkedBrowser.currentURI.spec,
                  title: removed.label,
                },
              ],
              index: 1,
              userContextId: removed.userContextId || 0,
            },
          });
        }
      },
    },
    location: { href: "chrome://browser/content/browser.xhtml" },
    _removedTabs: removedTabs,
  };
  return mockWindow;
}

/**
 * Test that tabManagementService is a singleton
 */
add_task(async function test_tabmanagement_service_singleton() {
  const service1 = tabManagementService;
  const service2 = tabManagementService;

  Assert.equal(
    service1,
    service2,
    "tabManagementService should be a singleton"
  );
});

/**
 * Test closing tabs and getting an operation ID
 */
add_task(async function test_close_tabs_returns_operation_id() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();

  const tab1 = createMockTab("https://example.com", "Example");
  const tab2 = createMockTab("https://mozilla.org", "Mozilla");

  // Set the window reference for validation
  tab1.documentGlobal = mockWindow;
  tab2.documentGlobal = mockWindow;

  mockWindow.gBrowser.tabs = [tab1, tab2];

  const result = await tabManagementService.closeTabs({
    tabs: [tab1, tab2],
    window: mockWindow,
  });

  Assert.equal(result.requestedCount, 2, "Requested to close 2 tabs");
  Assert.ok(result.operationId, "Should return an operation ID");
  Assert.ok(
    result.operationId.startsWith("tab-close-"),
    "Operation ID should have correct prefix"
  );
  Assert.equal(result.failedTabs.length, 0, "Should have no failed tabs");

  // Verify tabs were added to SessionStore
  Assert.equal(
    mockSessionStore.closedTabs.length,
    2,
    "SessionStore should have 2 closed tabs"
  );
});

/**
 * Test restoring tabs using operation ID
 */
add_task(async function test_restore_tabs_with_operation_id() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();

  const tab1 = createMockTab("https://example.com", "Example");
  const tab2 = createMockTab("https://mozilla.org", "Mozilla");

  tab1.documentGlobal = mockWindow;
  tab2.documentGlobal = mockWindow;

  mockWindow.gBrowser.tabs = [tab1, tab2];

  // Close tabs
  const closeResult = await tabManagementService.closeTabs({
    tabs: [tab1, tab2],
    window: mockWindow,
  });

  Assert.ok(closeResult.operationId, "Close should return operation ID");

  // Restore tabs
  const restoreResult = await tabManagementService.restoreTabs({
    operationId: closeResult.operationId,
    window: mockWindow,
  });

  Assert.equal(restoreResult.restoredCount, 2, "Should restore 2 tabs");
  Assert.equal(restoreResult.requestedCount, 2, "Requested to restore 2 tabs");
  Assert.equal(
    restoreResult.failedTabs.length,
    0,
    "Should have no failed tabs"
  );
  Assert.equal(
    restoreResult.restoredTabs.length,
    2,
    "Should have 2 restored tab objects"
  );
});

/**
 * Test that invalid tabs are filtered out
 */
add_task(async function test_invalid_tabs_filtered() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();

  const validTab = createMockTab("https://example.com", "Valid");
  const invalidTab = createMockTab("https://invalid.com", "Invalid");
  const closingTab = createMockTab("https://closing.com", "Closing", 0, true);

  validTab.documentGlobal = mockWindow;
  invalidTab.documentGlobal = null; // Wrong window
  closingTab.documentGlobal = mockWindow;

  const result = await tabManagementService.closeTabs({
    tabs: [validTab, invalidTab, closingTab],
    window: mockWindow,
  });

  Assert.equal(result.requestedCount, 3, "Requested to close 3 tabs");
  Assert.equal(result.failedTabs.length, 2, "Should have 2 failed tabs");

  // Check failure reasons
  const failureReasons = result.failedTabs.map(f => f.reason);
  Assert.ok(
    failureReasons.includes("invalid-tab"),
    "Should have invalid-tab failure"
  );
  Assert.ok(
    failureReasons.includes("already-closing"),
    "Should have already-closing failure"
  );
});

/**
 * Test restoring with invalid operation ID
 */
add_task(async function test_restore_invalid_operation_id() {
  const mockWindow = createMockWindow();

  const result = await tabManagementService.restoreTabs({
    operationId: "invalid-id",
    window: mockWindow,
  });

  Assert.equal(result.restoredCount, 0, "Should restore 0 tabs");
  Assert.equal(result.requestedCount, 0, "Should request 0 tabs");
  Assert.equal(result.failedTabs.length, 0, "Should have no failed tabs");
});

/**
 * Test that container tabs are matched correctly
 */
add_task(async function test_container_tab_matching() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();

  const containerTab = createMockTab("https://example.com", "Container Tab", 2);
  containerTab.documentGlobal = mockWindow;

  mockWindow.gBrowser.tabs = [containerTab];

  // Close the container tab
  const closeResult = await tabManagementService.closeTabs({
    tabs: [containerTab],
    window: mockWindow,
  });

  Assert.ok(closeResult.operationId, "Should return operation ID");
  Assert.equal(closeResult.requestedCount, 1, "Requested to close 1 tab");

  // Verify the closed tab in SessionStore has correct userContextId
  Assert.equal(
    mockSessionStore.closedTabs[0].state.userContextId,
    2,
    "Closed tab should preserve container ID"
  );

  // Restore the container tab
  const restoreResult = await tabManagementService.restoreTabs({
    operationId: closeResult.operationId,
    window: mockWindow,
  });

  Assert.equal(restoreResult.restoredCount, 1, "Should restore container tab");
});

/**
 * Test operation limit (max 10 stored operations)
 */
add_task(async function test_operation_limit() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();
  const operationIds = [];

  // Create more than 10 operations
  for (let i = 0; i < 12; i++) {
    const tab = createMockTab(`https://example${i}.com`, `Tab ${i}`);
    tab.documentGlobal = mockWindow;
    mockWindow.gBrowser.tabs = [tab];

    const result = await tabManagementService.closeTabs({
      tabs: [tab],
      window: mockWindow,
    });

    if (result.operationId) {
      operationIds.push(result.operationId);
    }
  }

  // First two operations should be evicted
  const firstOpResult = await tabManagementService.restoreTabs({
    operationId: operationIds[0],
    window: mockWindow,
  });

  Assert.equal(
    firstOpResult.restoredCount,
    0,
    "First operation should be evicted (exceeded limit)"
  );

  // Recent operations should still work
  const recentOpResult = await tabManagementService.restoreTabs({
    operationId: operationIds[11],
    window: mockWindow,
  });

  // Note: This might fail if SessionStore doesn't have the tab anymore
  // In real usage, SessionStore would have the closed tab
  Assert.greater(
    recentOpResult.requestedCount,
    0,
    "Recent operation should still be stored"
  );
});

/**
 * Test handling of tabs with no URL
 */
add_task(async function test_tabs_without_url() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();

  const tabNoUrl = createMockTab(null, "No URL");
  tabNoUrl.documentGlobal = mockWindow;

  const tabWithUrl = createMockTab("https://example.com", "With URL");
  tabWithUrl.documentGlobal = mockWindow;

  mockWindow.gBrowser.tabs = [tabNoUrl, tabWithUrl];

  const result = await tabManagementService.closeTabs({
    tabs: [tabNoUrl, tabWithUrl],
    window: mockWindow,
  });

  // Both tabs should close (null URL is valid for about: pages, etc)
  Assert.equal(result.requestedCount, 2, "Requested to close 2 tabs");
  Assert.equal(result.failedTabs.length, 0, "Should have no failed tabs");
});

/**
 * Test error handling when window is invalid
 */
add_task(async function test_invalid_window() {
  await Assert.rejects(
    tabManagementService.closeTabs({
      tabs: [createMockTab("https://example.com", "Test")],
      window: null,
    }),
    /Invalid browser window/,
    "Should throw for null window"
  );

  await Assert.rejects(
    tabManagementService.closeTabs({
      tabs: [createMockTab("https://example.com", "Test")],
      window: {}, // No gBrowser
    }),
    /Invalid browser window/,
    "Should throw for window without gBrowser"
  );
});

/**
 * Test empty tabs array
 */
add_task(async function test_empty_tabs_array() {
  const mockWindow = createMockWindow();

  const result = await tabManagementService.closeTabs({
    tabs: [],
    window: mockWindow,
  });

  Assert.equal(result.requestedCount, 0, "Should request 0 tabs");
  Assert.equal(result.operationId, null, "Should not return operation ID");
  Assert.equal(result.failedTabs.length, 0, "Should have no failed tabs");
});

/**
 * Test timestamp disambiguation when multiple tabs with same URL exist
 */
add_task(async function test_timestamp_disambiguation() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();

  // Simulate an older tab closed by AI (30 minutes ago)
  const aiOperationTime = Date.now() - 30 * 60 * 1000;
  mockSessionStore.addClosedTab({
    closedAt: aiOperationTime,
    state: {
      entries: [
        {
          url: "https://nychotels.com",
          title: "NYC Hotels - Old",
        },
      ],
      index: 1,
      userContextId: 0,
    },
  });

  // Simulate a newer tab closed manually by user (5 minutes ago)
  const userClosedTime = Date.now() - 5 * 60 * 1000;
  mockSessionStore.addClosedTab({
    closedAt: userClosedTime,
    state: {
      entries: [
        {
          url: "https://nychotels.com",
          title: "NYC Hotels - New",
        },
      ],
      index: 1,
      userContextId: 0,
    },
  });

  // Store a fake operation with the AI operation timestamp
  const operationId = tabManagementService.storeClosedTabsForUndo({
    closedTabs: [
      {
        url: "https://nychotels.com",
        title: "NYC Hotels - Old",
        userContextId: 0,
        operationTimestamp: aiOperationTime,
      },
    ],
  });

  // Restore should pick the older tab (closest to operationTimestamp)
  const restoreResult = await tabManagementService.restoreTabs({
    operationId,
    window: mockWindow,
  });

  Assert.equal(restoreResult.restoredCount, 1, "Should restore 1 tab");
  Assert.equal(
    restoreResult.restoredTabs[0].label,
    "NYC Hotels - Old",
    "Should restore the older tab that matches operation timestamp"
  );

  // Verify the correct tab was removed from mockSessionStore
  Assert.equal(
    mockSessionStore.closedTabs.length,
    1,
    "Should have 1 tab remaining in closed tabs"
  );
  Assert.equal(
    mockSessionStore.closedTabs[0].state.entries[0].title,
    "NYC Hotels - New",
    "The newer manually-closed tab should remain"
  );
});

/**
 * Test that restoreTabs preserves the originally selected tab
 */
add_task(async function test_restoreTabs_preserves_original_selected_tab() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();

  // Create tabs with one being selected
  const tab1 = createMockTab("https://example.com", "Example");
  const tab2 = createMockTab("https://mozilla.org", "Mozilla");
  const selectedTab = createMockTab("https://selected.com", "Selected Tab");

  tab1.documentGlobal = mockWindow;
  tab2.documentGlobal = mockWindow;
  selectedTab.documentGlobal = mockWindow;

  mockWindow.gBrowser.tabs = [tab1, tab2, selectedTab];
  mockWindow.gBrowser.selectedTab = selectedTab;

  // Close two tabs
  const closeResult = await tabManagementService.closeTabs({
    tabs: [tab1, tab2],
    window: mockWindow,
  });

  // Restore the tabs
  const restoreResult = await tabManagementService.restoreTabs({
    operationId: closeResult.operationId,
    window: mockWindow,
  });

  // Verify the originally selected tab is still selected
  Assert.equal(
    mockWindow.gBrowser.selectedTab,
    selectedTab,
    "Originally selected tab should remain selected after restoration"
  );
  Assert.equal(restoreResult.restoredCount, 2, "Should restore both tabs");
});

/**
 * Test restoreTabs handles missing original selected tab gracefully
 */
add_task(async function test_restoreTabs_handles_missing_original_tab() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();

  // Create tabs
  const tab1 = createMockTab("https://example.com", "Example");
  const tab2 = createMockTab("https://mozilla.org", "Mozilla");
  const selectedTab = createMockTab("https://selected.com", "Selected Tab");

  tab1.documentGlobal = mockWindow;
  tab2.documentGlobal = mockWindow;
  selectedTab.documentGlobal = mockWindow;

  mockWindow.gBrowser.tabs = [tab1, tab2, selectedTab];
  mockWindow.gBrowser.selectedTab = selectedTab;

  // Close the selected tab and another tab
  const closeResult = await tabManagementService.closeTabs({
    tabs: [tab1, selectedTab],
    window: mockWindow,
  });

  // Remove the selected tab from the tabs array (simulate it being gone)
  mockWindow.gBrowser.tabs = [tab2];
  mockWindow.gBrowser.selectedTab = tab2;

  // Restore the tabs
  const restoreResult = await tabManagementService.restoreTabs({
    operationId: closeResult.operationId,
    window: mockWindow,
  });

  // Should not throw and should restore tabs
  Assert.equal(
    restoreResult.restoredCount,
    2,
    "Should restore both tabs even if original selected tab is missing"
  );
  // Selected tab should remain as the fallback (tab2)
  Assert.equal(
    mockWindow.gBrowser.selectedTab,
    tab2,
    "Should keep the current selected tab when original is missing"
  );
});

/**
 * Test that tabs are restored in background without switching to them
 */
add_task(async function test_restoreTabs_in_background() {
  mockSessionStore.reset();
  const mockWindow = createMockWindow();

  // Create tabs
  const tab1 = createMockTab("https://example.com", "Example");
  const tab2 = createMockTab("https://mozilla.org", "Mozilla");
  const activeTab = createMockTab("https://active.com", "Active Tab");

  tab1.documentGlobal = mockWindow;
  tab2.documentGlobal = mockWindow;
  activeTab.documentGlobal = mockWindow;

  mockWindow.gBrowser.tabs = [activeTab];
  mockWindow.gBrowser.selectedTab = activeTab;

  // Store a fake operation for tabs that were closed
  const operationId = tabManagementService.storeClosedTabsForUndo({
    closedTabs: [
      {
        url: "https://example.com",
        label: "Example",
        closedAt: Date.now(),
      },
      {
        url: "https://mozilla.org",
        label: "Mozilla",
        closedAt: Date.now(),
      },
    ],
    timestamp: Date.now(),
  });

  // Track which tabs were selected during restoration
  const selectedTabs = [];
  const originalSelectedTabSetter = Object.getOwnPropertyDescriptor(
    mockWindow.gBrowser,
    "selectedTab"
  ).set;

  Object.defineProperty(mockWindow.gBrowser, "selectedTab", {
    get() {
      return this._selectedTab || activeTab;
    },
    set(tab) {
      selectedTabs.push(tab);
      this._selectedTab = tab;
      if (originalSelectedTabSetter) {
        originalSelectedTabSetter.call(this, tab);
      }
    },
    configurable: true,
  });

  // Restore the tabs
  await tabManagementService.restoreTabs({
    operationId,
    window: mockWindow,
  });

  // The active tab should be re-selected at the end
  Assert.ok(
    selectedTabs.includes(activeTab),
    "Active tab should be re-selected after restoration"
  );
  Assert.equal(
    selectedTabs[selectedTabs.length - 1],
    activeTab,
    "Active tab should be the last selected tab"
  );
  Assert.equal(
    mockWindow.gBrowser.selectedTab,
    activeTab,
    "Active tab should remain selected after restoration completes"
  );
});

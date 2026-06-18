/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();

const { ToolUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ToolUI.sys.mjs"
);
const { ChatConversation } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
);

/**
 * Test that ToolUI.handleUpdate returns false when missing required data
 */
add_task(async function test_handleUpdate_missing_messageId() {
  const conversation = new ChatConversation({});

  const result = await ToolUI.handleUpdate(
    {
      toolCallId: "test-tool-123",
      updateType: "confirmation-tab-selection",
    },
    conversation,
    null
  );

  Assert.equal(result, false, "Should return false when messageId is missing");
});

add_task(async function test_handleUpdate_missing_toolCallId() {
  const conversation = new ChatConversation({});

  const result = await ToolUI.handleUpdate(
    {
      messageId: "message-123",
      updateType: "confirmation-tab-selection",
    },
    conversation,
    null
  );

  Assert.equal(result, false, "Should return false when toolCallId is missing");
});

/**
 * Test that ToolUI.handleUpdate returns false when message not found
 */
add_task(async function test_handleUpdate_message_not_found() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const result = await ToolUI.handleUpdate(
    {
      messageId: "non-existent-id",
      toolCallId: "test-tool-123",
      updateType: "confirmation-tab-selection",
    },
    conversation,
    null
  );

  Assert.equal(result, false, "Should return false when message not found");
});

/**
 * Test that ToolUI.handleUpdate returns false when toolUIData doesn't exist
 */
add_task(async function test_handleUpdate_no_toolUIData() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "confirmation-tab-selection",
    },
    conversation,
    null
  );

  Assert.equal(
    result,
    false,
    "Should return false when message has no toolUIData"
  );
});

/**
 * Test that ToolUI.handleUpdate returns false when toolCallId doesn't match
 */
add_task(async function test_handleUpdate_toolCallId_mismatch() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  // Manually add toolUIData to the message
  assistantMessage.toolUIData = {
    toolCallId: "different-tool-456",
    uiType: "website-confirmation",
    properties: {},
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "confirmation-tab-selection",
    },
    conversation,
    null
  );

  Assert.equal(
    result,
    false,
    "Should return false when toolCallId doesn't match"
  );
});

/**
 * Test that ToolUI.handleUpdate successfully updates for confirmation
 */
add_task(async function test_handleUpdate_confirmation_success() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  // Manually add toolUIData to the message
  const originalToolCallId = "test-tool-123";
  assistantMessage.toolUIData = {
    toolCallId: originalToolCallId,
    uiType: "website-confirmation",
    properties: {
      tabs: [{ id: "tab1", label: "Test Tab" }],
    },
  };

  // Mock the tabManagementService for this test
  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalCloseTabs = tabManagementService.closeTabs;
  tabManagementService.closeTabs = async function () {
    return { operationId: "mock-operation-123" };
  };

  // Create mock tabs that match what we're trying to close
  const mockTab = {
    linkedPanel: "panel-1",
    linkedBrowser: {
      currentURI: {
        spec: "https://example.com",
      },
    },
  };

  const updateData = {
    selectedTabs: [
      {
        linkedPanel: "panel-1",
        url: "https://example.com",
        title: "Test Tab",
      },
    ],
  };

  const mockWindow = {
    gBrowser: {
      tabs: [],
      selectedTab: null,
    },
  };
  mockWindow.gBrowser.tabs = [mockTab];
  mockWindow.gBrowser.tabs.find = function (predicate) {
    return this.filter(predicate)[0];
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: originalToolCallId,
      updateType: "confirmation-tab-selection",
      updateData,
    },
    conversation,
    mockWindow
  );

  // Restore the original function
  tabManagementService.closeTabs = originalCloseTabs;

  // After refactoring, conversation.updateToolUI is called which updates the message
  Assert.equal(result, true, "Should return true on successful update");
  Assert.equal(
    assistantMessage.toolUIData.uiType,
    "ai-action-result",
    "Should change uiType to ai-action-result"
  );
  const confirmedData = assistantMessage.toolUIData.properties.confirmedData;
  Assert.deepEqual(
    {
      selectedTabs: confirmedData.selectedTabs,
      operationId: confirmedData.operationId,
    },
    {
      ...updateData,
      operationId: "mock-operation-123",
    },
    "Should add confirmedData to properties with operationId"
  );
  Assert.ok(
    typeof confirmedData.actionTimestamp === "number" &&
      confirmedData.actionTimestamp > 0,
    "Should include actionTimestamp for undo time calculation"
  );
});

/**
 * Test that ToolUI.handleUpdate successfully updates for cancellation
 */
add_task(async function test_handleUpdate_cancellation_success() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  // Manually add toolUIData to the message
  const originalToolCallId = "test-tool-456";
  assistantMessage.toolUIData = {
    toolCallId: originalToolCallId,
    uiType: "website-confirmation",
    properties: {
      tabs: [{ id: "tab1", label: "Test Tab" }],
    },
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: originalToolCallId,
      updateType: "cancel-tab-selection",
    },
    conversation,
    null
  );

  Assert.equal(result, true, "Should return true on successful cancellation");
  Assert.equal(
    assistantMessage.toolUIData.uiType,
    "cancelled-component",
    "Should change uiType to cancelled-component"
  );
  Assert.ok(
    assistantMessage.toolUIData.properties.tabs,
    "Should preserve original properties"
  );
});

/**
 * Test that ToolUI.handleUpdate fails confirmation without valid window
 */
add_task(async function test_handleUpdate_confirmation_no_window() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  assistantMessage.toolUIData = {
    toolCallId: "test-tool-123",
    uiType: "website-confirmation",
    properties: {
      tabs: [{ id: "tab1", label: "Test Tab" }],
    },
  };

  const updateData = {
    selectedTabs: [
      {
        linkedPanel: "panel-1",
        url: "https://example.com",
        title: "Test Tab",
      },
    ],
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "confirmation-tab-selection",
      updateData,
    },
    conversation,
    null // No window provided
  );

  Assert.equal(
    result,
    false,
    "Should return false when no window provided for confirmation"
  );
});

/**
 * Test that ToolUI.handleUpdate successfully handles undo-tab-close
 */
add_task(async function test_handleUpdate_undo_tab_close_success() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  // Set up the message as if tabs were already closed
  assistantMessage.toolUIData = {
    toolCallId: "test-tool-123",
    uiType: "ai-action-result",
    properties: {
      confirmedData: {
        selectedTabs: [
          {
            linkedPanel: "panel-1",
            url: "https://example.com",
            title: "Test Tab",
          },
        ],
        operationId: "test-operation-123",
      },
    },
  };

  // Mock the tabManagementService for undo
  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalRestoreTabs = tabManagementService.restoreTabs;
  tabManagementService.restoreTabs = async function () {
    return {
      restoredCount: 1,
      requestedCount: 1,
    };
  };

  const mockWindow = {
    gBrowser: {
      tabs: [],
      selectedTab: null,
    },
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "undo-tab-close",
      updateData: {
        operationId: "test-operation-123",
        selectedTabs: [
          {
            linkedPanel: "panel-1",
            url: "https://example.com",
            title: "Test Tab",
          },
        ],
      },
    },
    conversation,
    mockWindow
  );

  // Restore the original function
  tabManagementService.restoreTabs = originalRestoreTabs;

  Assert.equal(result, true, "Should return true on successful undo");
  Assert.equal(
    assistantMessage.toolUIData.uiType,
    "ai-action-result",
    "Should keep uiType as ai-action-result"
  );
  Assert.equal(
    assistantMessage.toolUIData.properties.confirmedData.wasRestored,
    true,
    "Should mark as restored"
  );
});

/**
 * Test that ToolUI.handleUpdate fails undo without operationId
 */
add_task(async function test_handleUpdate_undo_tab_close_no_operation_id() {
  const conversation = new ChatConversation({});

  const mockWindow = {
    gBrowser: {
      tabs: [],
      selectedTab: null,
    },
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: "message-123",
      toolCallId: "test-tool-123",
      updateType: "undo-tab-close",
      updateData: {
        selectedTabs: [],
      },
    },
    conversation,
    mockWindow
  );

  Assert.equal(
    result,
    false,
    "Should return false when no operationId provided"
  );
});

/**
 * Test that ToolUI.handleUpdate returns false for unknown updateType
 */
add_task(async function test_handleUpdate_unknown_updateType() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  // Add toolUIData to the message
  const originalToolCallId = "test-tool-789";
  const originalUIData = {
    toolCallId: originalToolCallId,
    uiType: "website-confirmation",
    properties: {
      tabs: [{ id: "tab1", label: "Test Tab" }],
    },
  };
  assistantMessage.toolUIData = { ...originalUIData };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: originalToolCallId,
      updateType: "invalid-update-type",
    },
    conversation,
    null
  );

  Assert.equal(result, false, "Should return false for unknown updateType");
  Assert.deepEqual(
    assistantMessage.toolUIData,
    originalUIData,
    "Should preserve original toolUIData when updateType is unknown"
  );
});

/**
 * Test that tabs with mismatched URLs are not closed
 */
add_task(async function test_verifyTabMatch_url_mismatch() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  assistantMessage.toolUIData = {
    toolCallId: "test-tool-123",
    uiType: "website-confirmation",
    properties: {
      tabs: [],
    },
  };

  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalCloseTabs = tabManagementService.closeTabs;
  let closeTabsCalled = false;
  tabManagementService.closeTabs = async function () {
    closeTabsCalled = true;
    return { operationId: "mock-operation-123" };
  };

  // Mock tab with different URL than expected
  const mockTab = {
    linkedPanel: "panel-1",
    linkedBrowser: {
      currentURI: {
        spec: "https://different.com", // Different URL
      },
    },
  };

  const mockWindow = {
    gBrowser: {
      tabs: [mockTab],
      selectedTab: null,
    },
  };
  mockWindow.gBrowser.tabs.find = function (predicate) {
    return this.filter(predicate)[0];
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "confirmation-tab-selection",
      updateData: {
        selectedTabs: [
          {
            linkedPanel: "panel-1",
            url: "https://example.com", // Expected URL doesn't match
            title: "Test Tab",
          },
        ],
      },
    },
    conversation,
    mockWindow
  );

  tabManagementService.closeTabs = originalCloseTabs;

  Assert.equal(result, false, "Should return false when tab URL doesn't match");
  Assert.equal(
    closeTabsCalled,
    false,
    "closeTabs should not be called when URLs mismatch"
  );
});

/**
 * Test that tabs with mismatched linkedPanel are rejected
 */
add_task(async function test_verifyTabMatch_linkedPanel_mismatch() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  assistantMessage.toolUIData = {
    toolCallId: "test-tool-123",
    uiType: "website-confirmation",
    properties: {
      tabs: [],
    },
  };

  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalCloseTabs = tabManagementService.closeTabs;
  let closeTabsCalled = false;
  tabManagementService.closeTabs = async function () {
    closeTabsCalled = true;
    return { operationId: "mock-operation-123" };
  };

  // Mock tab with different linkedPanel
  const mockTab = {
    linkedPanel: "panel-2", // Different panel
    linkedBrowser: {
      currentURI: {
        spec: "https://example.com",
      },
    },
  };

  const mockWindow = {
    gBrowser: {
      tabs: [mockTab],
      selectedTab: null,
    },
  };
  mockWindow.gBrowser.tabs.find = function (predicate) {
    return this.filter(predicate)[0];
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "confirmation-tab-selection",
      updateData: {
        selectedTabs: [
          {
            linkedPanel: "panel-1", // Expected panel doesn't match
            url: "https://example.com",
            title: "Test Tab",
          },
        ],
      },
    },
    conversation,
    mockWindow
  );

  tabManagementService.closeTabs = originalCloseTabs;

  Assert.equal(
    result,
    false,
    "Should return false when linkedPanel doesn't match"
  );
  Assert.equal(
    closeTabsCalled,
    false,
    "closeTabs should not be called when panels mismatch"
  );
});

/**
 * Test closing tabs when only some tabs match verification
 */
add_task(async function test_closeSelectedTabs_partial_match() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  assistantMessage.toolUIData = {
    toolCallId: "test-tool-123",
    uiType: "website-confirmation",
    properties: {
      tabs: [],
    },
  };

  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalCloseTabs = tabManagementService.closeTabs;
  let closedTabs = null;
  tabManagementService.closeTabs = async function ({ tabs }) {
    closedTabs = tabs;
    return { operationId: "mock-operation-123" };
  };

  // Mock tabs - one matching, one not matching
  const mockTabs = [
    {
      linkedPanel: "panel-1",
      linkedBrowser: {
        currentURI: {
          spec: "https://example.com",
        },
      },
    },
    {
      linkedPanel: "panel-2",
      linkedBrowser: {
        currentURI: {
          spec: "https://different.com", // Wrong URL
        },
      },
    },
  ];

  const mockWindow = {
    gBrowser: {
      tabs: mockTabs,
      selectedTab: null,
    },
  };
  mockWindow.gBrowser.tabs.find = function (predicate) {
    return this.filter(predicate)[0];
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "confirmation-tab-selection",
      updateData: {
        selectedTabs: [
          {
            linkedPanel: "panel-1",
            url: "https://example.com",
            title: "Test Tab 1",
          },
          {
            linkedPanel: "panel-2",
            url: "https://mozilla.org", // Expected URL doesn't match actual
            title: "Test Tab 2",
          },
        ],
      },
    },
    conversation,
    mockWindow
  );

  tabManagementService.closeTabs = originalCloseTabs;

  Assert.equal(
    result,
    true,
    "Should return true when at least one tab matches"
  );
  Assert.equal(closedTabs.length, 1, "Should only close the matching tab");
  Assert.equal(
    closedTabs[0].linkedPanel,
    "panel-1",
    "Should close the correct tab"
  );
});

/**
 * Test when no tabs pass verification
 */
add_task(async function test_closeSelectedTabs_no_matches() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  assistantMessage.toolUIData = {
    toolCallId: "test-tool-123",
    uiType: "website-confirmation",
    properties: {
      tabs: [],
    },
  };

  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalCloseTabs = tabManagementService.closeTabs;
  let closeTabsCalled = false;
  tabManagementService.closeTabs = async function () {
    closeTabsCalled = true;
    return { operationId: "mock-operation-123" };
  };

  const mockWindow = {
    gBrowser: {
      tabs: [], // No tabs available
      selectedTab: null,
    },
  };
  mockWindow.gBrowser.tabs.find = function () {
    return undefined;
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "confirmation-tab-selection",
      updateData: {
        selectedTabs: [
          {
            linkedPanel: "panel-1",
            url: "https://example.com",
            title: "Test Tab",
          },
        ],
      },
    },
    conversation,
    mockWindow
  );

  tabManagementService.closeTabs = originalCloseTabs;

  Assert.equal(result, false, "Should return false when no tabs match");
  Assert.equal(
    closeTabsCalled,
    false,
    "closeTabs should not be called when no tabs match"
  );
});

/**
 * Test that undo fails gracefully when restoration fails
 */
add_task(async function test_undo_with_failed_restoration() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  assistantMessage.toolUIData = {
    toolCallId: "test-tool-123",
    uiType: "ai-action-result",
    properties: {
      confirmedData: {
        selectedTabs: [],
        operationId: "test-operation-123",
      },
    },
  };

  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalRestoreTabs = tabManagementService.restoreTabs;
  tabManagementService.restoreTabs = async function () {
    throw new Error("Failed to restore tabs");
  };

  const mockWindow = {
    gBrowser: {
      tabs: [],
      selectedTab: null,
    },
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "undo-tab-close",
      updateData: {
        operationId: "test-operation-123",
        selectedTabs: [],
      },
    },
    conversation,
    mockWindow
  );

  tabManagementService.restoreTabs = originalRestoreTabs;

  Assert.equal(result, false, "Should return false when restoration fails");
});

/**
 * Test ToolUI.closeSelectedTabs public method directly
 */
add_task(async function test_closeSelectedTabs_public_method() {
  // Mock the tabManagementService since closeSelectedTabs calls it internally
  // and we need to control its behavior in the test environment
  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalCloseTabs = tabManagementService.closeTabs;
  let passedTabs = null;
  // Mock closeTabs to capture what tabs are passed and return a controlled result
  tabManagementService.closeTabs = async function ({ tabs }) {
    passedTabs = tabs; // Capture tabs to verify verification logic worked correctly
    return {
      operationId: "test-operation-456",
      closedTabs: tabs,
      failedTabs: [],
    };
  };

  const mockTabs = [
    {
      linkedPanel: "panel-1",
      linkedBrowser: {
        currentURI: {
          spec: "https://example.com",
        },
      },
    },
    {
      linkedPanel: "panel-2",
      linkedBrowser: {
        currentURI: {
          spec: "https://mozilla.org",
        },
      },
    },
  ];

  const mockWindow = {
    gBrowser: {
      tabs: mockTabs,
      selectedTab: null,
    },
  };

  const selectedTabsData = [
    {
      linkedPanel: "panel-1",
      url: "https://example.com",
      title: "Example Tab",
    },
    {
      linkedPanel: "panel-2",
      url: "https://mozilla.org",
      title: "Mozilla Tab",
    },
  ];

  let result;
  try {
    result = await ToolUI.closeSelectedTabs(selectedTabsData, mockWindow);
  } finally {
    // Restore original function even if test throws
    tabManagementService.closeTabs = originalCloseTabs;
  }

  // Verify the method returns the tabManagementService result
  Assert.ok(result, "Should return a result object");
  Assert.equal(
    result.operationId,
    "test-operation-456",
    "Should return correct operationId"
  );
  // Verify that only verified tabs were passed to the service
  Assert.equal(
    passedTabs.length,
    2,
    "Should pass 2 verified tabs to tabManagementService"
  );
  Assert.equal(
    passedTabs[0].linkedPanel,
    "panel-1",
    "Should pass correct first tab"
  );
  Assert.equal(
    passedTabs[1].linkedPanel,
    "panel-2",
    "Should pass correct second tab"
  );
});

/**
 * Test ToolUI.closeSelectedTabs returns null when no window provided
 */
add_task(async function test_closeSelectedTabs_no_window() {
  const selectedTabsData = [
    {
      linkedPanel: "panel-1",
      url: "https://example.com",
      title: "Example Tab",
    },
  ];

  const result = await ToolUI.closeSelectedTabs(selectedTabsData, null);

  Assert.equal(result, null, "Should return null when no window provided");
});

/**
 * Test ToolUI.closeSelectedTabs returns null when no valid tabs to close
 */
add_task(async function test_closeSelectedTabs_no_valid_tabs() {
  const mockWindow = {
    gBrowser: {
      tabs: [],
      selectedTab: null,
    },
  };

  const selectedTabsData = [
    {
      linkedPanel: "panel-nonexistent",
      url: "https://example.com",
      title: "Example Tab",
    },
  ];

  const result = await ToolUI.closeSelectedTabs(selectedTabsData, mockWindow);

  Assert.equal(result, null, "Should return null when no valid tabs found");
});

/**
 * Test that undo updates UI correctly with restore results
 */
add_task(async function test_undo_updates_ui_correctly() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Test prompt", {});
  conversation.addAssistantMessage("text", "Test response");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  const originalSelectedTabs = [
    {
      linkedPanel: "panel-1",
      url: "https://example.com",
      title: "Example Tab",
    },
    {
      linkedPanel: "panel-2",
      url: "https://mozilla.org",
      title: "Mozilla Tab",
    },
  ];

  assistantMessage.toolUIData = {
    toolCallId: "test-tool-123",
    uiType: "ai-action-result",
    properties: {
      confirmedData: {
        selectedTabs: originalSelectedTabs,
        operationId: "test-operation-123",
      },
    },
  };

  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalRestoreTabs = tabManagementService.restoreTabs;
  tabManagementService.restoreTabs = async function () {
    return {
      restoredCount: 2,
      requestedCount: 2,
    };
  };

  const mockWindow = {
    gBrowser: {
      tabs: [],
      selectedTab: null,
    },
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "test-tool-123",
      updateType: "undo-tab-close",
      updateData: {
        operationId: "test-operation-123",
        selectedTabs: originalSelectedTabs,
      },
    },
    conversation,
    mockWindow
  );

  tabManagementService.restoreTabs = originalRestoreTabs;

  Assert.equal(result, true, "Should return true on successful undo");
  Assert.equal(
    assistantMessage.toolUIData.properties.confirmedData.wasRestored,
    true,
    "Should set wasRestored flag to true"
  );
  Assert.equal(
    assistantMessage.toolUIData.properties.confirmedData.restoredCount,
    2,
    "Should include restoredCount in update"
  );
  Assert.deepEqual(
    assistantMessage.toolUIData.properties.confirmedData.originalClosedTabs,
    originalSelectedTabs,
    "Should preserve original closed tabs data"
  );
});

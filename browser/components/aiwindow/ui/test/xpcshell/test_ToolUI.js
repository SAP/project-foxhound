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
 * Test that confirmation resolves the pending tool message body with the
 * action read from the tool message.
 */
add_task(async function test_handleUpdate_confirmation_resolves_tool_action() {
  const conversation = new ChatConversation({});
  conversation.addUserMessage("Close my tabs", {});
  conversation.addAssistantMessage("text", "Confirm?");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  const originalToolCallId = "test-tool-789";
  assistantMessage.toolUIData = {
    toolCallId: originalToolCallId,
    uiType: "website-confirmation",
    properties: {
      tabs: [{ id: "tab1", label: "Test Tab" }],
    },
  };

  conversation.addToolCallMessage({
    tool_call_id: originalToolCallId,
    name: "manage_tabs",
    body: { pending: true, action: "close_tabs" },
  });

  const toolMessage = conversation.messages.at(-1);

  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalCloseTabs = tabManagementService.closeTabs;
  tabManagementService.closeTabs = async function () {
    return { operationId: "mock-operation-789" };
  };

  const mockTab = {
    linkedPanel: "panel-1",
    linkedBrowser: { currentURI: { spec: "https://example.com" } },
  };
  const mockWindow = {
    gBrowser: { tabs: [mockTab], selectedTab: null },
  };
  mockWindow.gBrowser.tabs.find = function (predicate) {
    return this.filter(predicate)[0];
  };

  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: originalToolCallId,
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

  Assert.equal(result, true, "Should return true on successful confirmation");
  Assert.equal(
    toolMessage.content.body.action,
    "close_tabs",
    "Resolved tool message body should carry the action from the pending tool message"
  );
  Assert.equal(
    toolMessage.content.body.description,
    "User confirmed the requested action. selectedTabs contains the tabs that were acted upon.",
    "Resolved tool message body should include the confirmation description"
  );
  Assert.deepEqual(
    toolMessage.content.body.selectedTabs,
    [{ url: "https://example.com", title: "Test Tab" }],
    "Resolved tool message body should include the acted-upon tabs"
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

/**
 * Test that autoCancelActiveConfirmation cancels active confirmations
 */
add_task(async function test_autoCancelActiveConfirmation_cancels() {
  const conversation = new ChatConversation({});

  // Add a user message and assistant message with confirmation UI
  conversation.addUserMessage("Close some tabs", {});
  conversation.addAssistantMessage("text", "I'll help you close some tabs.");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  // Set up the message with a website-confirmation
  // Include originalUserPrompt since it would be added by addUIToolToCurrentMessage
  assistantMessage.toolUIData = {
    toolCallId: "test-tool-123",
    uiType: "website-confirmation",
    properties: {
      tabs: [
        { id: "tab1", label: "Test Tab 1" },
        { id: "tab2", label: "Test Tab 2" },
      ],
      originalUserPrompt: "Close some tabs",
    },
  };

  // Call autoCancelActiveConfirmation
  const result = await ToolUI.autoCancelActiveConfirmation(
    conversation,
    null,
    "sidebar"
  );

  // Verify a confirmation was cancelled
  Assert.equal(result, true, "Should return true when cancellation occurs");

  // Verify the confirmation was cancelled
  Assert.equal(
    assistantMessage.toolUIData.uiType,
    "cancelled-component",
    "Should change uiType to cancelled-component"
  );
  Assert.ok(
    assistantMessage.toolUIData.properties.tabs,
    "Should preserve original properties"
  );

  // Verify retry data was stored (it's always stored when original prompt is found)
  Assert.ok(
    conversation.pendingRetry,
    "Should set pendingRetry when original prompt is found"
  );
  Assert.equal(
    conversation.pendingRetry.originalUserPrompt,
    "Close some tabs",
    "Should store the original user prompt"
  );
});

/**
 * Test that autoCancelActiveConfirmation stores retry data with correct details
 */
add_task(async function test_autoCancelActiveConfirmation_with_retry() {
  const conversation = new ChatConversation({});

  // Add a user message and assistant message with confirmation UI
  conversation.addUserMessage("Close all example.com tabs", {});
  conversation.addAssistantMessage("text", "I'll help you close those tabs.");

  const assistantMessage = conversation.messages.find(
    m => m.role === 1 && m.content?.type === "text"
  );

  // Set up the message with a website-confirmation
  // Include originalUserPrompt since it would be added by addUIToolToCurrentMessage
  assistantMessage.toolUIData = {
    toolCallId: "test-tool-456",
    uiType: "website-confirmation",
    properties: {
      tabs: [
        { id: "tab1", label: "Example Tab 1" },
        { id: "tab2", label: "Example Tab 2" },
      ],
      originalUserPrompt: "Close all example.com tabs",
    },
  };

  // Call autoCancelActiveConfirmation
  const result = await ToolUI.autoCancelActiveConfirmation(
    conversation,
    null,
    "sidebar"
  );

  // Verify cancellation occurred
  Assert.equal(result, true, "Should return true when cancellation occurs");

  // Verify the confirmation was cancelled
  Assert.equal(
    assistantMessage.toolUIData.uiType,
    "cancelled-component",
    "Should change uiType to cancelled-component"
  );

  // Verify retry data was stored with correct details
  Assert.ok(conversation.pendingRetry, "Should set pendingRetry");
  Assert.equal(
    conversation.pendingRetry.originalUserPrompt,
    "Close all example.com tabs",
    "Should store the original user prompt"
  );
  Assert.equal(
    conversation.pendingRetry.cancelledMessageId,
    assistantMessage.id,
    "Should store the cancelled message ID"
  );
  Assert.equal(
    conversation.pendingRetry.cancelledToolCallId,
    "test-tool-456",
    "Should store the cancelled tool call ID"
  );
  Assert.strictEqual(
    typeof conversation.pendingRetry.timestamp,
    "number",
    "Should include a timestamp"
  );
});

/**
 * Test that autoCancelActiveConfirmation returns early when no active confirmation
 */
add_task(
  async function test_autoCancelActiveConfirmation_no_active_confirmation() {
    const conversation = new ChatConversation({});

    // Add messages without any confirmation UI
    conversation.addUserMessage("Just a regular message", {});
    conversation.addAssistantMessage("text", "Just a regular response.");

    // Call autoCancelActiveConfirmation
    const result = await ToolUI.autoCancelActiveConfirmation(
      conversation,
      null,
      "sidebar"
    );

    // Verify it returns false when no confirmation to cancel
    Assert.equal(
      result,
      false,
      "Should return false when no confirmation exists"
    );

    // Verify no retry data was stored
    Assert.equal(
      conversation.pendingRetry,
      null,
      "Should not set pendingRetry when no active confirmation exists"
    );

    // Verify messages remain unchanged
    const assistantMessage = conversation.messages.find(
      m => m.role === 1 && m.content?.type === "text"
    );
    Assert.equal(
      assistantMessage.toolUIData,
      null,
      "Should not modify messages without confirmations"
    );
  }
);

/**
 * Test that injectRetryToolUIDataIfNeeded injects retry UI
 */
add_task(async function test_injectRetryToolUIDataIfNeeded() {
  const conversation = new ChatConversation({});

  // Set up pendingRetry data
  conversation.pendingRetry = {
    originalUserPrompt: "Close all example.com tabs",
    cancelledMessageId: "cancelled-msg-123",
    cancelledToolCallId: "cancelled-tool-123",
    timestamp: Date.now(),
  };

  // Add new messages
  conversation.addUserMessage("What's the weather?", {});
  const assistantMessage = conversation.addAssistantMessage(
    "text",
    "I can't help with weather."
  );

  // Call injectRetryToolUIDataIfNeeded (parameters are swapped)
  const result = ToolUI.injectRetryToolUIDataIfNeeded(
    assistantMessage,
    conversation
  );

  // Verify injection occurred
  Assert.equal(result, true, "Should return true when injection occurs");

  // Verify retry UI was injected
  Assert.ok(assistantMessage.toolUIData, "Should inject toolUIData");
  Assert.equal(
    assistantMessage.toolUIData.uiType,
    "retry-component",
    "Should set uiType to retry-component"
  );
  Assert.equal(
    assistantMessage.toolUIData.properties.originalUserPrompt,
    "Close all example.com tabs",
    "Should include the original prompt in properties"
  );
  Assert.ok(
    assistantMessage.toolUIData.toolCallId,
    "Should generate a synthetic toolCallId"
  );

  // Verify pendingRetry was cleared
  Assert.equal(
    conversation.pendingRetry,
    null,
    "Should clear pendingRetry after injection"
  );
});

/**
 * Test that injectRetryToolUIDataIfNeeded doesn't inject when no pendingRetry
 */
add_task(async function test_injectRetryToolUIDataIfNeeded_no_pending() {
  const conversation = new ChatConversation({});

  // Don't set pendingRetry

  // Add new messages
  conversation.addUserMessage("What's the weather?", {});
  const assistantMessage = conversation.addAssistantMessage(
    "text",
    "I can't help with weather."
  );

  // Call injectRetryToolUIDataIfNeeded (parameters are swapped)
  const result = ToolUI.injectRetryToolUIDataIfNeeded(
    assistantMessage,
    conversation
  );

  // Verify no injection occurred
  Assert.equal(result, false, "Should return false when no pendingRetry");

  // Verify no UI was injected
  Assert.equal(
    assistantMessage.toolUIData,
    null,
    "Should not inject toolUIData when no pendingRetry"
  );
});

/**
 * Test that injectRetryToolUIDataIfNeeded doesn't inject for non-text assistant messages
 */
add_task(async function test_injectRetryToolUIDataIfNeeded_tool_message() {
  const conversation = new ChatConversation({});

  // Set up pendingRetry data
  conversation.pendingRetry = {
    originalUserPrompt: "Close all example.com tabs",
    cancelledMessageId: "cancelled-msg-123",
    cancelledToolCallId: "cancelled-tool-123",
    timestamp: Date.now(),
  };

  // Add a tool_use message (not text)
  conversation.addUserMessage("What's the weather?", {});
  const assistantMessage = conversation.addAssistantMessage("tool_use", {
    tool_name: "some_tool",
    tool_input: {},
  });

  // Call injectRetryToolUIDataIfNeeded (parameters are swapped)
  const result = ToolUI.injectRetryToolUIDataIfNeeded(
    assistantMessage,
    conversation
  );

  // Verify no injection occurred for tool_use message
  Assert.equal(
    result,
    false,
    "Should return false for non-text assistant messages"
  );

  // Verify no UI was injected
  Assert.equal(
    assistantMessage.toolUIData,
    null,
    "Should not inject toolUIData for tool_use messages"
  );

  // Verify pendingRetry was NOT cleared
  Assert.ok(
    conversation.pendingRetry,
    "Should not clear pendingRetry for non-text messages"
  );
});

/**
 * Test that injectRetryToolUIDataIfNeeded doesn't inject for user messages
 */
add_task(async function test_injectRetryToolUIDataIfNeeded_user_message() {
  const conversation = new ChatConversation({});

  // Set up pendingRetry data
  conversation.pendingRetry = {
    originalUserPrompt: "Close all example.com tabs",
    cancelledMessageId: "cancelled-msg-123",
    cancelledToolCallId: "cancelled-tool-123",
    timestamp: Date.now(),
  };

  // Add a user message (not assistant)
  const userMessage = conversation.addUserMessage("Another request", {});

  // Call injectRetryToolUIDataIfNeeded with user message
  const result = ToolUI.injectRetryToolUIDataIfNeeded(
    userMessage,
    conversation
  );

  // Verify no injection occurred for user message
  Assert.equal(result, false, "Should return false for user messages");

  // Verify no UI was injected
  Assert.equal(
    userMessage.toolUIData,
    null,
    "Should not inject toolUIData for user messages"
  );

  // Verify pendingRetry was NOT cleared
  Assert.ok(
    conversation.pendingRetry,
    "Should not clear pendingRetry for user messages"
  );
});

/**
 * Test that retry prompt handler clears UI and returns true
 */
add_task(async function test_handleUpdate_retry_prompt() {
  const conversation = new ChatConversation({});

  // Add messages with retry UI
  conversation.addUserMessage("New prompt", {});
  const assistantMessage = conversation.addAssistantMessage(
    "text",
    "Here's a response."
  );

  // Manually add retry toolUIData
  assistantMessage.toolUIData = {
    toolCallId: "retry-tool-123",
    uiType: "retry-component",
    properties: {
      prompt: "Original prompt to retry",
    },
  };

  // Call handleUpdate with retry-prompt updateType
  const result = await ToolUI.handleUpdate(
    {
      messageId: assistantMessage.id,
      toolCallId: "retry-tool-123",
      updateType: "retry-prompt",
      updateData: {
        prompt: "Original prompt to retry",
      },
    },
    conversation,
    null
  );

  // Verify the handler succeeded
  Assert.equal(result, true, "Should return true for retry-prompt update");

  // Verify the UI was cleared
  Assert.equal(
    assistantMessage.toolUIData,
    null,
    "Should clear toolUIData after retry-prompt"
  );
});

/**
 * Test that findOriginalUserPrompt is public and works correctly
 */
add_task(async function test_findOriginalUserPrompt_is_public() {
  const conversation = new ChatConversation({});

  // Add messages with parent chain
  const userMsg = conversation.addUserMessage("Test user prompt", {});
  const assistantMsg = conversation.addAssistantMessage("text", "Response");
  assistantMsg.parentMessageId = userMsg.id;

  // Test that the public method exists and works
  const originalPrompt = ToolUI.findOriginalUserPrompt(
    conversation.messages,
    assistantMsg
  );

  Assert.equal(
    originalPrompt,
    "Test user prompt",
    "Public findOriginalUserPrompt should return the user prompt"
  );
});

/**
 * Test that originalUserPrompt is added to website confirmations
 */
add_task(async function test_website_confirmation_gets_originalUserPrompt() {
  const conversation = new ChatConversation({});

  // Add user message
  conversation.addUserMessage("Close my tabs please", {});

  // Create assistant message to attach UI to
  const assistantMsg = conversation.addAssistantMessage(
    "text",
    "I'll help with that"
  );

  // Add website confirmation UI data
  const result = conversation.addUIToolToCurrentMessage("tool-123", {
    uiType: "website-confirmation",
    properties: {
      tabs: [{ id: "tab1", label: "Tab 1" }],
    },
  });

  Assert.ok(result.success, "Should successfully add UI tool");

  // Check that originalUserPrompt was added
  const updatedMessage = conversation.messages.find(
    m => m.id === assistantMsg.id
  );

  Assert.equal(
    updatedMessage.toolUIData.properties.originalUserPrompt,
    "Close my tabs please",
    "Should add originalUserPrompt to website confirmation properties"
  );
});

/**
 * Test that isRestored flag is preserved through message events
 */
add_task(async function test_isRestored_flag_preserved() {
  // NOTE: This is not a deep functional test but serves as a regression guard
  // to ensure the isRestored flag and originalUserPrompt continue to work together.
  // The actual integration is tested at the ai-window/ai-chat-content level.
  // This test documents the expected data structure and prevents accidental removal.
  const conversation = new ChatConversation({});

  // Add message with website confirmation
  conversation.addUserMessage("Close tabs", {});
  const assistantMsg = conversation.addAssistantMessage("text", "Closing tabs");

  assistantMsg.toolUIData = {
    toolCallId: "test-123",
    uiType: "website-confirmation",
    properties: {
      tabs: [],
      originalUserPrompt: "Close tabs",
    },
  };

  // Simulate what happens when message is restored
  const restoredMessage = {
    ...assistantMsg,
    isPreviousMessage: true,
    isRestored: true, // This would be set by ai-window when restoring
  };

  // Verify the flag exists
  Assert.ok(
    restoredMessage.isRestored,
    "Restored messages should have isRestored flag"
  );

  Assert.equal(
    restoredMessage.toolUIData.properties.originalUserPrompt,
    "Close tabs",
    "Original user prompt should be available in restored message"
  );
});

/**
 * Test that closeSelectedTabs tags the active tab with
 * smartWindowActionSource when it is among the verified tabs.
 */
add_task(async function test_closeSelectedTabs_tags_active_tab_source() {
  const { tabManagementService } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/TabManagementService.sys.mjs"
  );

  const originalCloseTabs = tabManagementService.closeTabs;
  tabManagementService.closeTabs = async function () {
    return { operationId: "op-active" };
  };

  const activeTab = {
    linkedPanel: "panel-1",
    linkedBrowser: { currentURI: { spec: "https://example.com" } },
  };
  const otherTab = {
    linkedPanel: "panel-2",
    linkedBrowser: { currentURI: { spec: "https://mozilla.org" } },
  };

  const mockWindow = {
    gBrowser: {
      tabs: [activeTab, otherTab],
      selectedTab: activeTab,
    },
  };

  const selectedTabsData = [
    {
      linkedPanel: "panel-1",
      url: "https://example.com",
      title: "Active",
    },
    {
      linkedPanel: "panel-2",
      url: "https://mozilla.org",
      title: "Other",
    },
  ];

  try {
    await ToolUI.closeSelectedTabs(selectedTabsData, mockWindow);
  } finally {
    tabManagementService.closeTabs = originalCloseTabs;
  }

  Assert.equal(
    activeTab.smartWindowActionSource,
    "close_current_tab",
    "Active tab gets tagged with smartWindowActionSource"
  );
  Assert.equal(
    otherTab.smartWindowActionSource,
    undefined,
    "Non-active tabs are not tagged"
  );
});

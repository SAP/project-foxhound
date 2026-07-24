/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

do_get_profile();

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const { ChatStore, ChatConversation, ChatMessage } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);

async function addBasicConvoTestData(date, title, updated = null) {
  const link = "https://www.firefox.com";
  const updatedDate = updated || date;

  return addConvoWithSpecificTestData(
    new Date(date),
    link,
    link,
    title,
    "test content",
    new Date(updatedDate)
  );
}

async function addBasicConvoWithSpecificUpdatedTestData(updatedDate, title) {
  const link = "https://www.firefox.com";
  return addConvoWithSpecificTestData(
    new Date("1/1/2023"),
    link,
    link,
    title,
    "test content",
    new Date(updatedDate)
  );
}

async function addConvoWithSpecificTestData(
  createdDate,
  mainLink,
  messageLink,
  title,
  message = "the message body",
  updatedDate = false
) {
  const conversation = new ChatConversation({
    createdDate: createdDate.getTime(),
    updatedDate: updatedDate ? updatedDate.getTime() : createdDate.getTime(),
    pageUrl: mainLink,
  });
  conversation.title = title;
  conversation.addUserMessage(message, messageLink, 0);
  await gChatStore.updateConversation(conversation);

  return conversation;
}

async function addConvoWithSpecificCustomContentTestData(
  createdDate,
  mainLink,
  messageLink,
  title,
  content,
  role
) {
  const conversation = new ChatConversation({
    createdDate: createdDate.getTime(),
    updatedDate: createdDate.getTime(),
    pageUrl: mainLink,
  });
  conversation.title = title;
  conversation.addMessage(role, content, messageLink, 0);
  await gChatStore.updateConversation(conversation);
}

/**
 * Runs a test atomically so that the clean up code
 * runs after each test intead of after the entire
 * list of tasks in the file are done.
 *
 * @todo Bug 2005408
 * Replace add_atomic_task usage when this Bug 1656557 lands
 *
 * @param {Function} func - The test function to run
 */
function add_atomic_task(func) {
  return add_task(async function () {
    await test_ChatStorage_setup();

    try {
      await func();
    } finally {
      await test_cleanUp();
    }
  });
}

let gChatStore, gSandbox;

async function cleanUpDatabase() {
  if (gChatStore) {
    await gChatStore.destroyDatabase();
    gChatStore = null;
  }
}

async function test_ChatStorage_setup() {
  Services.prefs.setBoolPref(
    "browser.smartwindow.removeDatabaseOnStartup",
    true
  );

  gChatStore = ChatStore;
  await gChatStore.destroyDatabase();

  gSandbox = lazy.sinon.createSandbox();
}

async function test_cleanUp() {
  Services.prefs.clearUserPref("browser.smartwindow.removeDatabaseOnStartup");

  await cleanUpDatabase();
  gSandbox.restore();
}

add_atomic_task(async function task_ChatStorage_constructor() {
  Assert.ok(gChatStore, "Should return a ChatStorage instance");
});

add_atomic_task(async function test_ChatStorage_updateConversation() {
  let success = true;
  let errorMessage = "";

  try {
    const conversation = new ChatConversation({});

    conversation.addUserMessage("test content", "https://www.firefox.com", 0);

    await gChatStore.updateConversation(conversation);
  } catch (e) {
    success = false;
    errorMessage = e.message;
  }

  Assert.ok(success, errorMessage);
});

add_atomic_task(async function test_ChatStorage_findRecentConversations() {
  await addBasicConvoTestData("1/1/2025", "conversation 1");
  await addBasicConvoTestData("1/2/2025", "conversation 2");
  await addBasicConvoTestData("1/3/2025", "conversation 3");

  const recentConversations = await gChatStore.findRecentConversations(2);

  Assert.withSoftAssertions(function (soft) {
    soft.equal(recentConversations[0].title, "conversation 3");
    soft.equal(recentConversations[1].title, "conversation 2");
  });
});

add_atomic_task(async function test_ChatStorage_findConversationById() {
  let conversation = new ChatConversation({});
  conversation.title = "conversation 1";
  conversation.addUserMessage("test content", "https://www.firefox.com", 0);
  await gChatStore.updateConversation(conversation);

  const conversationId = conversation.id;

  conversation = await gChatStore.findConversationById(conversationId);

  Assert.withSoftAssertions(function (soft) {
    soft.equal(conversation.id, conversationId);
    soft.equal(conversation.title, "conversation 1");
  });
});

add_atomic_task(async function test_ChatStorage_findConversationsByDate() {
  await addBasicConvoWithSpecificUpdatedTestData("1/1/2025", "conversation 1");
  await addBasicConvoWithSpecificUpdatedTestData("6/1/2025", "conversation 2");
  await addBasicConvoWithSpecificUpdatedTestData("12/1/2025", "conversation 3");

  const startDate = new Date("5/1/2025").getTime();
  const endDate = new Date("1/1/2026").getTime();
  const conversations = await gChatStore.findConversationsByDate(
    startDate,
    endDate
  );

  const errorMessage = `Incorrect message sorting: ${JSON.stringify(conversations)}`;

  Assert.withSoftAssertions(function (soft) {
    soft.equal(
      conversations.length,
      2,
      "Incorrect number of conversations received"
    );
    soft.equal(conversations[0].title, "conversation 3", errorMessage);
    soft.equal(conversations[1].title, "conversation 2", errorMessage);
  });
});

add_atomic_task(async function test_ChatStorage_findConversationsByURL() {
  async function addTestData() {
    await addConvoWithSpecificTestData(
      new Date("1/1/2025"),
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.com"),
      "conversation 1"
    );

    await addConvoWithSpecificTestData(
      new Date("1/2/2025"),
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.org"),
      "Mozilla.org conversation 1"
    );

    await addConvoWithSpecificTestData(
      new Date("1/3/2025"),
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.org"),
      "Mozilla.org conversation 2"
    );
  }

  await addTestData();

  const conversations = await gChatStore.findConversationsByURL(
    new URL("https://www.mozilla.org")
  );

  Assert.withSoftAssertions(function (soft) {
    soft.equal(conversations.length, 2, "Chat conversations not found");
    soft.equal(conversations[0].title, "Mozilla.org conversation 2");
    soft.equal(conversations[1].title, "Mozilla.org conversation 1");
  });
});

async function addTestDataForFindMessageByDate() {
  await gChatStore.updateConversation(
    new ChatConversation({
      title: "convo 1",
      description: "",
      pageUrl: new URL("https://www.firefox.com"),
      pageMeta: {},
      messages: [
        new ChatMessage({
          createdDate: new Date("1/1/2025").getTime(),
          ordinal: 0,
          role: 0,
          content: { type: "text", content: "a message" },
          pageUrl: new URL("https://www.mozilla.com"),
        }),
      ],
    })
  );

  await gChatStore.updateConversation(
    new ChatConversation({
      title: "convo 2",
      description: "",
      pageUrl: new URL("https://www.firefox.com"),
      pageMeta: {},
      messages: [
        new ChatMessage({
          createdDate: new Date("7/1/2025").getTime(),
          ordinal: 0,
          role: 0,
          content: { type: "text", content: "a message in july" },
          pageUrl: new URL("https://www.mozilla.com"),
        }),
      ],
    })
  );

  await gChatStore.updateConversation(
    new ChatConversation({
      title: "convo 3",
      description: "",
      pageUrl: new URL("https://www.firefox.com"),
      pageMeta: {},
      messages: [
        new ChatMessage({
          createdDate: new Date("8/1/2025").getTime(),
          ordinal: 0,
          role: 1,
          content: { type: "text", content: "a message in august" },
          pageUrl: new URL("https://www.mozilla.com"),
        }),
      ],
    })
  );
}

add_atomic_task(
  async function test_withoutSpecifiedRole_ChatStorage_findMessagesByDate() {
    await addTestDataForFindMessageByDate();

    const startDate = new Date("6/1/2025");
    const endDate = new Date("1/1/2026");
    const messages = await gChatStore.findMessagesByDate(startDate, endDate);

    Assert.withSoftAssertions(function (soft) {
      soft.equal(messages.length, 2, "Chat messages not found");
      soft.equal(messages?.[0]?.content?.content, "a message in august");
      soft.equal(messages?.[1]?.content?.content, "a message in july");
    });
  }
);

add_atomic_task(async function test_limit_ChatStorage_findMessagesByDate() {
  await addTestDataForFindMessageByDate();

  const startDate = new Date("6/1/2025");
  const endDate = new Date("1/1/2026");
  const messages = await gChatStore.findMessagesByDate(
    startDate,
    endDate,
    -1,
    1
  );

  Assert.withSoftAssertions(function (soft) {
    soft.equal(messages.length, 1, "Chat messages not found");
    soft.equal(messages?.[0]?.content?.content, "a message in august");
  });
});

add_atomic_task(async function test_skip_ChatStorage_findMessagesByDate() {
  await addTestDataForFindMessageByDate();

  const startDate = new Date("6/1/2025");
  const endDate = new Date("1/1/2026");
  const messages = await gChatStore.findMessagesByDate(
    startDate,
    endDate,
    -1,
    -1,
    1
  );

  Assert.withSoftAssertions(function (soft) {
    soft.equal(messages.length, 1, "Chat messages not found");
    soft.equal(messages?.[0]?.content?.content, "a message in july");
  });
});

add_atomic_task(
  async function test_withSpecifiedRole_ChatStorage_findMessagesByDate() {
    await addTestDataForFindMessageByDate();

    const startDate = new Date("6/1/2025");
    const endDate = new Date("1/1/2026");
    const messages = await gChatStore.findMessagesByDate(startDate, endDate, 0);

    Assert.withSoftAssertions(function (soft) {
      soft.equal(messages.length, 1, "Chat messages not found");
      soft.equal(messages?.[0]?.content?.content, "a message in july");
    });
  }
);

add_atomic_task(async function test_ChatStorage_searchContent() {
  await addConvoWithSpecificTestData(
    new Date("1/2/2025"),
    new URL("https://www.firefox.com"),
    new URL("https://www.mozilla.org"),
    "Mozilla.org conversation 1",
    "a random message"
  );

  await addConvoWithSpecificTestData(
    new Date("1/2/2025"),
    new URL("https://www.firefox.com"),
    new URL("https://www.mozilla.org"),
    "Mozilla.org conversation 2",
    "a random message again"
  );

  await addConvoWithSpecificTestData(
    new Date("1/2/2025"),
    new URL("https://www.firefox.com"),
    new URL("https://www.mozilla.org"),
    "Mozilla.org conversation 3",
    "the interesting message"
  );

  const conversations = await gChatStore.searchContent("body");

  Assert.equal(conversations.length, 3);
});

add_atomic_task(async function test_deepPath_ChatStorage_searchContent() {
  async function addTestData() {
    await addConvoWithSpecificCustomContentTestData(
      new Date("1/2/2025"),
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.org"),
      "Mozilla.org conversation 1",
      { type: "text", content: "a random message" },
      0 // MessageRole.USER
    );

    await addConvoWithSpecificCustomContentTestData(
      new Date("1/2/2025"),
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.org"),
      "Mozilla.org conversation 2",
      { type: "text", content: "a random message again" },
      0 // MessageRole.USER
    );

    await addConvoWithSpecificCustomContentTestData(
      new Date("1/2/2025"),
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.org"),
      "Mozilla.org conversation 3",
      {
        type: "text",
        someKey: {
          deeper: {
            keyToLookIn: "the interesting message",
          },
        },
      },
      0 // MessageRole.USER
    );
  }

  await addTestData();

  const conversations = await gChatStore.searchContent(
    "someKey.deeper.keyToLookIn"
  );

  const foundConvo = conversations[0];
  const firstMessage = foundConvo?.messages?.[0];
  const contentJson = firstMessage?.content;

  Assert.withSoftAssertions(function (soft) {
    soft.equal(conversations.length, 1);
    soft.equal(
      contentJson?.someKey?.deeper?.keyToLookIn,
      "the interesting message"
    );
  });
});

add_atomic_task(async function test_ChatStorage_search() {
  async function addTestData() {
    await addConvoWithSpecificTestData(
      new Date("1/2/2025"),
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.org"),
      "Mozilla.org conversation 1",
      "a random message"
    );

    await addConvoWithSpecificTestData(
      new Date("1/2/2025"),
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.org"),
      "Mozilla.org interesting conversation 2",
      "a random message again"
    );

    await addConvoWithSpecificTestData(
      new Date("1/2/2025"),
      new URL("https://www.firefox.com"),
      new URL("https://www.mozilla.org"),
      "Mozilla.org conversation 3",
      "some other message"
    );
  }

  await addTestData();

  const conversations = await gChatStore.search("interesting");

  Assert.withSoftAssertions(function (soft) {
    soft.equal(conversations.length, 1);
    soft.equal(
      conversations[0].title,
      "Mozilla.org interesting conversation 2"
    );

    const message = conversations[0].messages[0];
    soft.equal(message.content.body, "a random message again");
  });
});

add_atomic_task(async function test_ChatStorage_deleteConversationById() {
  await addBasicConvoTestData("1/1/2025", "a conversation");

  let conversations = await gChatStore.findRecentConversations(10);

  Assert.equal(
    conversations.length,
    1,
    "Test conversation for deleteConversationById() did not save."
  );

  const conversation = conversations[0];

  await gChatStore.deleteConversationById(conversation.id);
  conversations = await gChatStore.findRecentConversations(10);
  Assert.equal(conversations.length, 0, "Test conversation was not deleted");
});

// TODO: Disabled this test. pruneDatabase() needs some work to switch
// db file size to be checked via dbstat. Additionally, after switching
// the last line to `PRAGMA incremental_vacuum;` the disk storage is
// not immediately freed, so this test is now failing. Will need to
// revisit this test when pruneDatabase() is updated.
//
// add_atomic_task(async function test_ChatStorage_pruneDatabase() {
//   const initialDbSize = await gChatStore.getDatabaseSize();
//
//   // NOTE: Add enough conversations to increase the SQLite file
//   // by a measurable size
//   for (let i = 0; i < 1000; i++) {
//     await addBasicConvoTestData("1/1/2025", "a conversation");
//   }
//
//   const dbSizeWithTestData = await gChatStore.getDatabaseSize();
//
//   Assert.greater(
//     dbSizeWithTestData,
//     initialDbSize,
//     "Test conversations not saved for pruneDatabase() test"
//   );
//
//   await gChatStore.pruneDatabase(0.5, 100000);
//
//   const dbSizeAfterPrune = await gChatStore.getDatabaseSize();
//
//   const proximityToInitialSize = dbSizeAfterPrune - initialDbSize;
//   const proximityToTestDataSize = dbSizeWithTestData - initialDbSize;
//
//   Assert.less(
//     proximityToInitialSize,
//     proximityToTestDataSize,
//     "The pruned size is not closer to the initial db size than it is to the size with test data in it"
//   );
// });

add_atomic_task(async function test_applyMigrations_notCalledOnInitialSetup() {
  gSandbox.stub(gChatStore, "CURRENT_SCHEMA_VERSION").returns(0);
  gSandbox.spy(gChatStore, "applyMigrations");

  // Trigger connection to db so file creates and migrations applied
  await gChatStore.getDatabaseSize();

  Assert.ok(gChatStore.applyMigrations.notCalled);
});

add_atomic_task(
  async function test_applyMigrations_calledOnceIfSchemaIsGreaterThanDb() {
    gSandbox.stub(gChatStore, "CURRENT_SCHEMA_VERSION").get(() => 2);
    gSandbox.stub(gChatStore, "getDatabaseSchemaVersion").resolves(1);
    gSandbox.stub(gChatStore, "applyMigrations");
    gSandbox.stub(gChatStore, "setSchemaVersion");

    // Trigger connection to db so file creates and migrations applied
    await gChatStore.getDatabaseSize();

    Assert.withSoftAssertions(function (soft) {
      soft.ok(gChatStore.applyMigrations.calledOnce);
      soft.ok(gChatStore.setSchemaVersion.calledWith(2));
    });
  }
);

add_atomic_task(
  async function test_applyMigrations_notCalledIfCurrentSchemaIsLessThanDbSchema_dbDowngrades() {
    gSandbox.stub(gChatStore, "CURRENT_SCHEMA_VERSION").get(() => 1);
    gSandbox.stub(gChatStore, "getDatabaseSchemaVersion").resolves(2);
    gSandbox.stub(gChatStore, "applyMigrations");
    gSandbox.stub(gChatStore, "setSchemaVersion");

    // Trigger connection to db so file creates and migrations applied
    await gChatStore.getDatabaseSize();

    Assert.withSoftAssertions(function (soft) {
      soft.ok(
        gChatStore.applyMigrations.notCalled,
        "applyMigrations was called"
      );
      soft.ok(
        gChatStore.setSchemaVersion.calledWith(1),
        "setSchemaVersion was not called with 1"
      );
    });
  }
);

async function addChatHistoryTestData() {
  await addConvoWithSpecificTestData(
    new Date("1/2/2025"),
    new URL("https://www.firefox.com"),
    new URL("https://www.mozilla.org"),
    "Mozilla.org conversation 1",
    "a random message"
  );

  await addConvoWithSpecificTestData(
    new Date("1/3/2025"),
    new URL("https://www.firefox.com"),
    new URL("https://www.mozilla.org"),
    "Mozilla.org interesting conversation 2",
    "a random message again"
  );

  await addConvoWithSpecificTestData(
    new Date("1/4/2025"),
    new URL("https://www.firefox.com"),
    new URL("https://www.mozilla.org"),
    "Mozilla.org conversation 3",
    "some other message"
  );
}

add_atomic_task(async function test_chatHistoryView() {
  await addChatHistoryTestData();

  const entries = await gChatStore.chatHistoryView();

  Assert.withSoftAssertions(function (soft) {
    soft.equal(entries.length, 3);
    soft.equal(entries[0].title, "Mozilla.org conversation 3");
    soft.equal(entries[1].title, "Mozilla.org interesting conversation 2");
    soft.equal(entries[2].title, "Mozilla.org conversation 1");
  });
});

add_atomic_task(async function test_chatHistoryView_sorting_desc() {
  await addChatHistoryTestData();

  const entries = await gChatStore.chatHistoryView(1, 20, "desc");

  Assert.withSoftAssertions(function (soft) {
    soft.equal(entries.length, 3);
    soft.equal(entries[0].title, "Mozilla.org conversation 3");
    soft.equal(entries[1].title, "Mozilla.org interesting conversation 2");
    soft.equal(entries[2].title, "Mozilla.org conversation 1");
  });
});

add_atomic_task(async function test_chatHistoryView_sorting_asc() {
  await addChatHistoryTestData();

  const entries = await gChatStore.chatHistoryView(1, 20, "asc");

  Assert.withSoftAssertions(function (soft) {
    soft.equal(entries.length, 3);
    soft.equal(entries[0].title, "Mozilla.org conversation 1");
    soft.equal(entries[1].title, "Mozilla.org interesting conversation 2");
    soft.equal(entries[2].title, "Mozilla.org conversation 3");
  });
});

add_atomic_task(async function test_chatHistoryView_pageSize() {
  await addChatHistoryTestData();

  const entries = await gChatStore.chatHistoryView(1, 2, "asc");

  Assert.equal(entries.length, 2);
});

add_atomic_task(async function test_chatHistoryView_pageNumber() {
  await addChatHistoryTestData();

  const entries = await gChatStore.chatHistoryView(3, 1, "asc");

  Assert.withSoftAssertions(function (soft) {
    soft.equal(entries.length, 1);
    soft.equal(entries[0].title, "Mozilla.org conversation 3");
  });
});

async function addConversationWithMessages() {
  const conversation = await addConvoWithSpecificTestData(
    new Date("1/4/2025"),
    new URL("https://www.firefox.com"),
    new URL("https://www.mozilla.org"),
    "Mozilla.org conversation 3",
    "some other message"
  );

  conversation.addUserMessage("test message 1");
  conversation.addUserMessage("test message 2");
  conversation.addUserMessage("test message 3");

  await gChatStore.updateConversation(conversation);

  return conversation;
}

add_atomic_task(async function test_ChatStorage_deleteMessages() {
  const conversation = await addConversationWithMessages();

  const messagesToDelete = [conversation.messages[1], conversation.messages[2]];
  await gChatStore.deleteMessages(messagesToDelete);

  const updatedConversation = await gChatStore.findConversationById(
    conversation.id
  );

  Assert.withSoftAssertions(function (soft) {
    soft.equal(
      updatedConversation.messages.length,
      1,
      "Conversations were not deleted"
    );

    soft.equal(
      updatedConversation.messages[0].convId,
      conversation.messages[0].convId,
      "The wrong conversations were deleted"
    );
  });
});

add_atomic_task(
  async function test_deleteParentMessage_ChatStorage_deleteMessages() {
    const conversation = await addConversationWithMessages();

    const messagesToDelete = [conversation.messages[1]];
    await gChatStore.deleteMessages(messagesToDelete);

    const updatedConversation = await gChatStore.findConversationById(
      conversation.id
    );

    Assert.withSoftAssertions(function (soft) {
      soft.equal(
        updatedConversation.messages.length,
        1,
        "Conversations were not deleted"
      );

      soft.equal(
        updatedConversation.messages[0].convId,
        conversation.messages[0].convId,
        "The wrong conversations were deleted"
      );
    });
  }
);

add_atomic_task(
  async function test_removeAllMessagesFromConvo_ChatStorage_deleteMessages() {
    const conversation = await addConversationWithMessages();

    await gChatStore.deleteMessages([conversation.messages[0]]);

    const updatedConversation = await gChatStore.findConversationById(
      conversation.id
    );

    Assert.equal(null, updatedConversation);
  }
);

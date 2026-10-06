/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that $json.data is accessible from the console and contains
 * the parsed JSON object.
 */

/**
 * Helper function to get console messages from the content page.
 */
function getConsoleMessages() {
  const consoleStorageInner = Cc["@mozilla.org/consoleAPI-storage;1"];
  const storageInner = consoleStorageInner.getService(Ci.nsIConsoleAPIStorage);
  const events = storageInner.getEvents();

  // Find messages from the JSON viewer
  return events
    .filter(e => e.arguments && !!e.arguments.length)
    .map(e => {
      // Get the formatted message text
      return e.arguments.map(arg => String(arg)).join(" ");
    });
}

add_task(async function test_console_welcome_message() {
  // Clear any existing console messages
  const consoleStorage = Cc["@mozilla.org/consoleAPI-storage;1"];
  const storage = consoleStorage.getService(Ci.nsIConsoleAPIStorage);
  storage.clearEvents();

  await addJsonViewTab("data:application/json," + JSON.stringify({ test: 1 }));

  // Get console messages
  const messages = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    getConsoleMessages
  );

  // Check that the welcome message was logged
  const welcomeMessage = messages.find(msg =>
    msg.includes("Data available from the console")
  );
  ok(welcomeMessage, "Console welcome message was logged");

  // Verify the message documents the available fields
  ok(welcomeMessage.includes("$json.data"), "Message documents $json.data");
  ok(welcomeMessage.includes("$json.text"), "Message documents $json.text");
  ok(
    welcomeMessage.includes("$json.headers"),
    "Message documents $json.headers"
  );
});

/**
 * Load the JSON viewer for the given json string and get $json.data from it.
 */
async function getJSONViewData(json) {
  await addJsonViewTab("data:application/json," + json);

  return await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    return content.wrappedJSObject.$json?.data;
  });
}

/**
 * Helper function to test that $json.data matches the original object.
 *
 * @param {*} obj - The object to stringify, load, and verify
 * @param {string} dataDescription - Description of the data being tested
 */
async function testJSONViewData(obj, dataDescription) {
  const json = JSON.stringify(obj);
  const data = await getJSONViewData(json);

  Assert.deepEqual(data, obj, `$json.data matches ${dataDescription}`);
}

add_task(async function test_jsonview_data_object() {
  await testJSONViewData(
    {
      name: "test",
      values: [1, 2, 3],
      nested: { foo: "bar" },
    },
    "original object"
  );
});

add_task(async function test_jsonview_data_array() {
  await testJSONViewData([10, 20, 30, { key: "value" }], "original array");
});

add_task(async function test_jsonview_data_primitive() {
  await testJSONViewData(42, "original number");
});

add_task(async function test_jsonview_data_string() {
  await testJSONViewData("hello world", "original string");
});

add_task(async function test_jsonview_data_null() {
  await testJSONViewData(null, "original null");
});

add_task(async function test_jsonview_data_invalid_json() {
  const invalidJson = "{this is not valid json}";
  const data = await getJSONViewData(invalidJson);

  is(data, undefined, "$json.data is undefined for invalid JSON");
});

add_task(async function test_jsonview_data_large_array() {
  const largeArray = Array(1000)
    .fill(null)
    .map((_, i) => i * 2);

  await testJSONViewData(largeArray, "large array");
});

add_task(async function test_jsonview_text() {
  const obj = { name: "test", value: 42 };
  const json = JSON.stringify(obj);
  await addJsonViewTab("data:application/json," + json);

  const text = await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    return content.wrappedJSObject.$json?.text;
  });

  is(text, json, "$json.text matches the original JSON text");
});

add_task(async function test_jsonview_headers() {
  await addJsonViewTab(
    "data:application/json," + JSON.stringify({ foo: "bar" })
  );

  const headers = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => {
      return content.wrappedJSObject.$json?.headers;
    }
  );

  ok(headers, "$json.headers is defined");
  ok(Array.isArray(headers.response), "$json.headers.response is an array");
  ok(Array.isArray(headers.request), "$json.headers.request is an array");
});

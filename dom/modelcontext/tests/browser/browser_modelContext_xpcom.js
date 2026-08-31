/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_getToolsForWindow_and_invoke() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "reverse",
          description: "Reverses a string",
          inputSchema: {
            type: "object",
            properties: { text: { type: "string" } },
          },
          execute: (input, _client) =>
            Promise.resolve(input.text.split("").reverse().join("")),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      let tools = await Services.modelContext.getToolsForWindow(innerWindowId);
      Assert.equal(tools.length, 1, "Should have one tool registered");
      let tool = tools[0];
      Assert.equal(tool.name, "reverse", "Tool name should be 'reverse'");
      Assert.equal(
        tool.description,
        "Reverses a string",
        "Tool description should match"
      );
      Assert.equal(
        typeof tool.inputSchema,
        "object",
        "inputSchema should be an object"
      );
      Assert.equal(
        tool.inputSchema.type,
        "object",
        "inputSchema.type should be 'object'"
      );

      let result = await Services.modelContext.invokeTool(
        innerWindowId,
        "reverse",
        { text: "hello" }
      );
      Assert.equal(
        result,
        "olleh",
        "XPCOM invokeTool with args should return 'olleh'"
      );
    }
  );
});

add_task(async function test_invoke_nonexistent_tool_xpcom() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "existing",
          description: "A tool",
          inputSchema: { type: "object" },
          execute: (_input, _client) => Promise.resolve("ok"),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      await Assert.rejects(
        Services.modelContext.invokeTool(innerWindowId, "nonexistent"),
        e => e.name === "NotFoundError",
        "XPCOM invokeTool with nonexistent tool should reject"
      );
    }
  );
});

add_task(async function test_invalid_window_id_getTools() {
  await Assert.rejects(
    Services.modelContext.getToolsForWindow(0xdeadbeef),
    e => e.name === "NotFoundError",
    "getToolsForWindow with invalid window ID should reject"
  );
});

add_task(async function test_non_string_return_number() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "getNum",
          description: "Returns a number",
          inputSchema: { type: "object" },
          execute: (_input, _client) => Promise.resolve(42),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      let xpcomResult = await Services.modelContext.invokeTool(
        innerWindowId,
        "getNum"
      );
      Assert.equal(
        xpcomResult,
        42,
        "XPCOM invokeTool should return raw numeric value"
      );
      Assert.equal(
        typeof xpcomResult,
        "number",
        "XPCOM result should be typeof number"
      );
    }
  );
});

add_task(async function test_non_string_argument_types_xpcom() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "echo",
          description: "Echoes argument as JSON",
          inputSchema: { type: "object" },
          execute: (input, _client) => Promise.resolve(JSON.stringify(input)),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      let resultNum = await Services.modelContext.invokeTool(
        innerWindowId,
        "echo",
        { value: 42 }
      );
      Assert.equal(
        resultNum,
        '{"value":42}',
        "XPCOM should handle object with number value"
      );

      let resultBool = await Services.modelContext.invokeTool(
        innerWindowId,
        "echo",
        { value: true }
      );
      Assert.equal(
        resultBool,
        '{"value":true}',
        "XPCOM should handle object with boolean value"
      );

      let resultNested = await Services.modelContext.invokeTool(
        innerWindowId,
        "echo",
        { a: { b: [1, 2, 3] } }
      );
      Assert.equal(
        resultNested,
        '{"a":{"b":[1,2,3]}}',
        "XPCOM should handle nested object argument"
      );
    }
  );
});

add_task(async function test_tool_that_rejects_xpcom() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "fail",
          description: "Always fails",
          inputSchema: { type: "object" },
          execute: (_input, _client) => Promise.reject(new Error("boom")),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      await Assert.rejects(
        Services.modelContext.invokeTool(innerWindowId, "fail"),
        e => e.message === "boom",
        "XPCOM invokeTool should reject with the tool's rejection value"
      );
    }
  );
});

add_task(async function test_tool_that_throws_xpcom() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "thrower",
          description: "Throws synchronously",
          inputSchema: { type: "object" },
          execute: (_input, _client) => {
            throw new Error("sync boom");
          },
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      await Assert.rejects(
        Services.modelContext.invokeTool(innerWindowId, "thrower"),
        e => e.message === "sync boom",
        "XPCOM invokeTool should reject with the tool's thrown error"
      );
    }
  );
});

add_task(async function test_unregister_tool() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "temp",
          description: "Temporary tool",
          inputSchema: { type: "object" },
          execute: (_input, _client) => Promise.resolve("hi"),
        });

        content.navigator.modelContext.unregisterTool("temp");
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      let tools = await Services.modelContext.getToolsForWindow(innerWindowId);
      Assert.equal(
        tools.length,
        0,
        "XPCOM getToolsForWindow should return zero tools after unregister"
      );

      await Assert.rejects(
        Services.modelContext.invokeTool(innerWindowId, "temp"),
        e => e.name === "NotFoundError",
        "XPCOM invokeTool on unregistered tool should reject"
      );
    }
  );
});

add_task(async function test_multiple_tools() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "upper",
          description: "Uppercases a string",
          inputSchema: { type: "object" },
          execute: (input, _client) =>
            Promise.resolve(input.text.toUpperCase()),
        });
        content.navigator.modelContext.registerTool({
          name: "lower",
          description: "Lowercases a string",
          inputSchema: { type: "object" },
          execute: (input, _client) =>
            Promise.resolve(input.text.toLowerCase()),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      let tools = await Services.modelContext.getToolsForWindow(innerWindowId);
      Assert.equal(tools.length, 2, "Should have two tools registered");

      let names = tools.map(t => t.name).sort();
      Assert.equal(names[0], "lower", "Should have 'lower' tool");
      Assert.equal(names[1], "upper", "Should have 'upper' tool");

      let upperResult = await Services.modelContext.invokeTool(
        innerWindowId,
        "upper",
        { text: "hello" }
      );
      Assert.equal(
        upperResult,
        "HELLO",
        "XPCOM upper tool should return 'HELLO'"
      );

      let lowerResult = await Services.modelContext.invokeTool(
        innerWindowId,
        "lower",
        { text: "HELLO" }
      );
      Assert.equal(
        lowerResult,
        "hello",
        "XPCOM lower tool should return 'hello'"
      );
    }
  );
});

add_task(async function test_undefined_arguments_xpcom() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "noArgs",
          description: "Takes no arguments",
          inputSchema: { type: "object" },
          execute: (_input, _client) => Promise.resolve("done"),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      let result = await Services.modelContext.invokeTool(
        innerWindowId,
        "noArgs"
      );
      Assert.equal(result, "done", "Tool invoked with no input should work");
    }
  );
});

add_task(async function test_tool_without_inputSchema() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "noSchema",
          description: "Tool without inputSchema",
          execute: (_input, _client) => Promise.resolve("ok"),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      let tools = await Services.modelContext.getToolsForWindow(innerWindowId);
      Assert.equal(tools.length, 1, "XPCOM should have one tool");
      Assert.equal(
        tools[0].inputSchema,
        undefined,
        "inputSchema should be undefined when not provided"
      );
    }
  );
});

add_task(async function test_tool_with_annotations() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "readOnly",
          description: "A read-only tool",
          inputSchema: { type: "object" },
          annotations: { readOnlyHint: true },
          execute: (_input, _client) => Promise.resolve("ok"),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      let tools = await Services.modelContext.getToolsForWindow(innerWindowId);
      Assert.equal(tools.length, 1, "XPCOM should have one tool");
      Assert.ok(tools[0].annotations, "XPCOM annotations should be present");
      Assert.equal(
        tools[0].annotations.readOnlyHint,
        true,
        "XPCOM readOnlyHint should be true"
      );
    }
  );
});

add_task(async function test_registerTool_rejects_non_object_inputSchema() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        const cases = [
          /* eslint-disable no-new-wrappers */
          { value: new Number(0x41414141), label: "Number wrapper" },
          { value: new String("hello"), label: "String wrapper" },
          { value: new Boolean(true), label: "Boolean wrapper" },
          { value: [1, 2, 3], label: "array" },
          /* eslint-enable no-new-wrappers */
        ];

        for (const { value, label } of cases) {
          Assert.throws(
            () => {
              content.navigator.modelContext.registerTool({
                name: "poc_" + label,
                description: "poc",
                inputSchema: value,
                execute: async () => {},
              });
            },
            /inputSchema must serialize to a JSON object/,
            `registerTool with ${label} inputSchema should throw TypeError`
          );
        }

        let tools = content.navigator.modelContext.getTools();
        Assert.equal(
          tools.length,
          0,
          "content getTools should return empty after all registrations were rejected"
        );
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;
      let xpcomTools =
        await Services.modelContext.getToolsForWindow(innerWindowId);
      Assert.equal(
        xpcomTools.length,
        0,
        "XPCOM getToolsForWindow should return empty after all registrations were rejected"
      );
    }
  );
});

add_task(async function test_tool_without_annotations() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        content.navigator.modelContext.registerTool({
          name: "noAnnotations",
          description: "A tool without annotations",
          inputSchema: { type: "object" },
          execute: (_input, _client) => Promise.resolve("ok"),
        });
      });

      let innerWindowId =
        browser.browsingContext.currentWindowGlobal.innerWindowId;

      let tools = await Services.modelContext.getToolsForWindow(innerWindowId);
      Assert.equal(tools.length, 1, "XPCOM should have one tool");
      Assert.equal(
        tools[0].annotations,
        undefined,
        "annotations should be undefined when not provided"
      );
    }
  );
});

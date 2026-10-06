/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { stringifyArguments } = ChromeUtils.importESModule(
  "chrome://remote/content/webdriver-bidi/ConsoleMessageFormatter.sys.mjs"
);

add_task(function test_stringifyArguments_primitives() {
  equal(stringifyArguments({ type: "string", value: "hello" }), "hello");
  equal(stringifyArguments({ type: "string", value: "" }), "");

  equal(stringifyArguments({ type: "number", value: 42 }), "42");
  equal(stringifyArguments({ type: "number", value: 0 }), "0");
  equal(stringifyArguments({ type: "number", value: -1.5 }), "-1.5");

  equal(stringifyArguments({ type: "boolean", value: true }), "true");
  equal(stringifyArguments({ type: "boolean", value: false }), "false");

  equal(stringifyArguments({ type: "bigint", value: "12345" }), "12345");
});

add_task(function test_stringifyArguments_no_value() {
  equal(stringifyArguments({ type: "undefined" }), "undefined");
  equal(stringifyArguments({ type: "null" }), "null");
  equal(stringifyArguments({ type: "symbol" }), "symbol");
  equal(stringifyArguments({ type: "function" }), "function");
  equal(stringifyArguments({ type: "node" }), "node");
  equal(stringifyArguments({ type: "window" }), "window");
});

add_task(function test_stringifyArguments_error() {
  equal(
    stringifyArguments({ type: "error", value: "Error: test message" }),
    "Error: test message"
  );
  equal(
    stringifyArguments({ type: "error", value: "TypeError: type error" }),
    "TypeError: type error"
  );
});

add_task(function test_stringifyArguments_regexp() {
  equal(
    stringifyArguments({
      type: "regexp",
      value: { pattern: "foo", flags: "gi" },
    }),
    "/foo/gi"
  );
  equal(
    stringifyArguments({
      type: "regexp",
      value: { pattern: "bar" },
    }),
    "/bar/"
  );
  equal(
    stringifyArguments({
      type: "regexp",
      value: { pattern: "test", flags: "" },
    }),
    "/test/"
  );
});

add_task(function test_stringifyArguments_date() {
  const dateStr = "2024-01-15T10:30:00.000Z";
  equal(
    stringifyArguments({ type: "date", value: dateStr }),
    new Date(dateStr).toString()
  );
});

add_task(function test_stringifyArguments_object() {
  equal(
    stringifyArguments({
      type: "object",
      value: [
        ["a", 1],
        ["b", 2],
      ],
    }),
    "Object(2)"
  );
  equal(
    stringifyArguments({
      type: "object",
      value: [
        ["a", 1],
        [
          "b",
          {
            type: "object",
            value: [["a", 1]],
          },
        ],
      ],
    }),
    "Object(2)"
  );
  equal(stringifyArguments({ type: "object", value: [] }), "Object(0)");
  equal(stringifyArguments({ type: "object", value: null }), "Object()");
});

add_task(function test_stringifyArguments_array() {
  equal(stringifyArguments({ type: "array", value: [1, 2, 3] }), "Array(3)");
  equal(stringifyArguments({ type: "array", value: [1, 2, [3]] }), "Array(3)");
  equal(stringifyArguments({ type: "array", value: [] }), "Array(0)");
  equal(stringifyArguments({ type: "array", value: null }), "Array()");
});

add_task(function test_stringifyArguments_map() {
  equal(
    stringifyArguments({ type: "map", value: [["key", "value"]] }),
    "Map(1)"
  );
  equal(stringifyArguments({ type: "map", value: [] }), "Map(0)");
});

add_task(function test_stringifyArguments_set() {
  equal(stringifyArguments({ type: "set", value: ["a", "b"] }), "Set(2)");
  equal(stringifyArguments({ type: "set", value: [] }), "Set(0)");
});

add_task(function test_stringifyArguments_unknown_type_with_value() {
  equal(stringifyArguments({ type: "weakmap", value: {} }), "weakmap");
  equal(stringifyArguments({ type: "weakset", value: {} }), "weakset");
});

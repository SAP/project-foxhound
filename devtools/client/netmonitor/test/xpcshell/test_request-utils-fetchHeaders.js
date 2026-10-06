/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { require } = ChromeUtils.importESModule(
  "resource://devtools/shared/loader/Loader.sys.mjs"
);
const {
  fetchHeaders,
} = require("resource://devtools/client/netmonitor/src/utils/request-utils.js");

add_task(async function test_fetchHeaders_resolves_long_string_values() {
  const longCookieValue = "a=1; ".repeat(2001);

  const mockLongStringGrip = {
    type: "longString",
    initial: longCookieValue.substring(0, 1000),
    length: longCookieValue.length,
  };

  const headers = {
    headers: [
      { name: "User-Agent", value: "Mozilla/5.0" },
      { name: "Cookie", value: mockLongStringGrip },
    ],
    headersSize: 12345,
  };

  async function mockGetLongString(value) {
    if (typeof value === "object" && value.type === "longString") {
      return longCookieValue;
    }
    return value;
  }

  const result = await fetchHeaders(headers, mockGetLongString);

  equal(
    result.headers[0].value,
    "Mozilla/5.0",
    "Short string header value is preserved"
  );
  equal(
    typeof result.headers[1].value,
    "string",
    "Long string Cookie header value is resolved to a string"
  );
  equal(
    result.headers[1].value,
    longCookieValue,
    "Long string Cookie header value is correctly resolved to its full content"
  );
});

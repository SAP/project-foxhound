/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that <script> loads with JSON MIME types produce a warning.
// See Bug 1916351.
add_task(async function script_load_with_json_mime_produce_warning() {
  const TEST_URI =
    "https://example.com/browser/devtools/client/webconsole/" +
    "test/browser/" +
    "test-script-json-mime.html";
  const MIME_WARNING_MSG =
    "The script from “https://example.com/browser/devtools/client/webconsole/test/browser/test-json-mime.json” was loaded even though its MIME type (“application/json”) is not a valid JavaScript MIME type.";
  const hud = await openNewTabAndConsole(TEST_URI);
  await waitFor(() => findWarningMessage(hud, MIME_WARNING_MSG), "", 100);
  ok(true, "JSON MIME type warning displayed");
});

// Tests that <script type=module> loads with JSON MIME types produce an error.
add_task(async function script_module_load_with_json_mime_produce_error() {
  const TEST_URI =
    "https://example.com/browser/devtools/client/webconsole/" +
    "test/browser/" +
    "test-script-json-module-mime.html";
  const MIME_ERROR_MSG =
    "Loading module from “https://example.com/browser/devtools/client/webconsole/test/browser/test-json-mime.json” was blocked because of a disallowed MIME type (“application/json”)";
  const hud = await openNewTabAndConsole(TEST_URI);
  await waitFor(() => findErrorMessage(hud, MIME_ERROR_MSG), "", 100);
  ok(true, "JSON MIME type error displayed");
});

// Tests that JSON module loads with invalid MIME types produce an error.
add_task(async function json_module_import_with_invalid_mime_produce_error() {
  const TEST_URI =
    "https://example.com/browser/devtools/client/webconsole/" +
    "test/browser/" +
    "test-json-module-mime.html";
  const MIME_ERROR_MSG =
    "Loading JSON module from “https://example.com/browser/devtools/client/webconsole/test/browser/test-non-javascript-mime.mjs” was blocked because of a disallowed MIME type (“text/html”)";
  const hud = await openNewTabAndConsole(TEST_URI);
  await waitFor(() => findErrorMessage(hud, MIME_ERROR_MSG), "", 100);
  ok(true, "JSON MIME type error displayed");
});

// Tests that JSON module loads with text/javascript MIME types produce an error.
add_task(
  async function json_module_import_with_javascript_mime_produce_error() {
    const TEST_URI =
      "https://example.com/browser/devtools/client/webconsole/" +
      "test/browser/" +
      "test-js-json-module-mime.html";
    const MIME_ERROR_MSG =
      "Loading JSON module from “https://example.com/browser/devtools/client/webconsole/test/browser/test-js-mime.mjs” was blocked because of a disallowed MIME type (“text/javascript”)";
    const hud = await openNewTabAndConsole(TEST_URI);
    await waitFor(() => findErrorMessage(hud, MIME_ERROR_MSG), "", 100);
    ok(true, "JSON MIME type error displayed");
  }
);

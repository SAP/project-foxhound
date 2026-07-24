/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export async function runBackgroundTask(_commandLine) {
  // Disable logging of Console to stdout in order to focus on MOZ_LOG ones
  Services.prefs.setBoolPref("devtools.console.stdout.chrome", false);

  // Log the main thread PID so that the test can identify it easily
  const pid = Services.appinfo.processID;
  dump(`CONSOLE-PID:${pid}\n`);

  // Also disable dump to prevent nsXPConnect from logging exceptions to stderr
  Services.prefs.setBoolPref("browser.dom.window.dump.enabled", false);

  console.log("foo");
  console.debug("bar");
  console.assert(false, "assert-failure");
  const prefixed = console.createInstance({
    prefix: "my-prefix",
    // Test setting a more restrictive level from MOZ_LOG
    maxLogLevel: "Info",
  });
  prefixed.error({
    shouldLogError: prefixed.shouldLog("Error"),
    shouldLogLog: prefixed.shouldLog("Log"),
  });
  prefixed.warn("warning");
  prefixed.log("not-logged");
  prefixed.assert(false, "prefixed-assert-failure");

  const limitedLevel = console.createInstance({
    prefix: "limited-level",
    // Test setting a more permissive level from MOZ_LOG
    maxLogLevel: "Error",
  });
  limitedLevel.error("log-unless-disabled-by-mozlog");
  limitedLevel.log("may-be-logged-via-mozlog");
  limitedLevel.assert(false, "limited-assert-failure");

  const errorOnly = console.createInstance({
    prefix: "error-only",
    maxLogLevel: "Error",
  });
  errorOnly.log("error-only-log");
  errorOnly.error("error-only-error");
  errorOnly.assert(false, "error-only-assert");

  (async function () {
    throw new Error("Async exception");
  })();

  Services.console.logStringMessage("String message");

  return 0;
}

/**
 * Bug 1330890 - A test case for verifying Date() object of javascript will use
 *               Atlantic/Reykjavik timezone (GMT and "real" equivalent to UTC)
 *               after fingerprinting resistance is enabled.
 */

async function verifySpoofed() {
  ok(true, "Running on " + content.location.origin);

  SpecialPowers.Cu.getJSTestingFunctions().setTimeZone("PST8PDT");
  is(
    Intl.DateTimeFormat("en-US").resolvedOptions().timeZone,
    "PST8PDT",
    "Default time zone should have changed"
  );

  // Running in content:
  function test() {
    let date = new Date();
    const TZ_NAME = "Atlantic/Reykjavik";
    const TZ_SUFFIX = "Greenwich Mean Time";
    ok(
      date.toString().endsWith(`(${TZ_SUFFIX})`),
      `The date toString() is in ${TZ_NAME} timezone.`
    );
    ok(
      date.toTimeString().endsWith(`(${TZ_SUFFIX})`),
      `The date toTimeString() is in ${TZ_NAME} timezone.`
    );
    let dateTimeFormat = Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "full",
    });
    is(
      dateTimeFormat.resolvedOptions().timeZone,
      TZ_NAME,
      `The Intl.DateTimeFormat is in ${TZ_NAME} timezone.`
    );
    ok(
      dateTimeFormat.format(date).endsWith(TZ_SUFFIX),
      `The Intl.DateTimeFormat is formatting with the ${TZ_NAME} timezone.`
    );
    is(
      date.getFullYear(),
      date.getUTCFullYear(),
      "The full year reports in UTC timezone."
    );
    is(
      date.getMonth(),
      date.getUTCMonth(),
      "The month reports in UTC timezone."
    );
    is(date.getDate(), date.getUTCDate(), "The month reports in UTC timezone.");
    is(date.getDay(), date.getUTCDay(), "The day reports in UTC timezone.");
    is(
      date.getHours(),
      date.getUTCHours(),
      "The hours reports in UTC timezone."
    );
    is(date.getTimezoneOffset(), 0, "The difference with UTC timezone is 0.");

    let parser = new DOMParser();
    let doc = parser.parseFromString("<p></p>", "text/html");
    let lastModified = new Date(
      doc.lastModified.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$1-$2")
    );
    // Allow up to one minute of difference for the time to run the test.
    let offset = Math.floor((new Date() - lastModified) / (60 * 1000));
    is(offset, 0, "document.lastModified does not leak the timezone.");
  }

  // Run test in the context of the page.
  Cu.exportFunction(is, content, { defineAs: "is" });
  Cu.exportFunction(ok, content, { defineAs: "ok" });
  content.eval(`(${test})()`);
}

add_task(async function test_timezone() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.resistFingerprinting", true]],
  });

  // Load a page and verify the timezone.
  let tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TEST_PATH + "file_dummy.html",
    forceNewProcess: true,
  });

  await SpecialPowers.spawn(tab.linkedBrowser, [], verifySpoofed);

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.popPrefEnv();
});

// Verify that exempted domain is not spoofed.
add_task(async function test_timezone_exempt() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.resistFingerprinting.exemptedDomains", "example.net"],
      ["privacy.resistFingerprinting", true],
    ],
  });

  let tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TEST_PATH + "file_dummy.html",
    forceNewProcess: true,
  });

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    SpecialPowers.Cu.getJSTestingFunctions().setTimeZone("PST8PDT");
    is(
      Intl.DateTimeFormat("en-US").resolvedOptions().timeZone,
      "PST8PDT",
      "Default time zone should have changed"
    );

    function test() {
      let date = new Date(0);
      ok(
        date.toString().endsWith("(Pacific Standard Time)"),
        "The date toString() is in PT timezone"
      );

      is(
        Intl.DateTimeFormat("en-US").resolvedOptions().timeZone,
        "PST8PDT",
        "Content should use default time zone"
      );
    }

    // Run test in the context of the page.
    Cu.exportFunction(is, content, { defineAs: "is" });
    Cu.exportFunction(ok, content, { defineAs: "ok" });
    content.eval(`(${test})()`);
  });

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.popPrefEnv();
});

// Verify that we are still spoofing for domains not `exemptedDomains` list.
add_task(async function test_timezone_exempt_wrong_domain() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.resistFingerprinting.exemptedDomains", "example.net"],
      ["privacy.resistFingerprinting", true],
    ],
  });

  let tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening:
      TEST_PATH.replace("example.net", "example.org") + "file_dummy.html",
    forceNewProcess: true,
  });

  await SpecialPowers.spawn(tab.linkedBrowser, [], verifySpoofed);

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_timezone_exmpt_browser() {
  SpecialPowers.Cu.getJSTestingFunctions().setTimeZone("PST8PDT");
  is(
    Intl.DateTimeFormat("en-US").resolvedOptions().timeZone,
    "PST8PDT",
    "Default time zone should have changed"
  );

  await SpecialPowers.pushPrefEnv({
    set: [["privacy.resistFingerprinting", true]],
  });

  is(
    Intl.DateTimeFormat("en-US").resolvedOptions().timeZone,
    "PST8PDT",
    "Timezone in chrome should be unaffected by resistFingerprinting"
  );

  let newWindow = Services.ww.openWindow(
    null,
    AppConstants.BROWSER_CHROME_URL,
    "_blank",
    "chrome,dialog=no,all",
    null
  );

  is(
    newWindow.Intl.DateTimeFormat("en-US").resolvedOptions().timeZone,
    "PST8PDT",
    "Timezone in new chrome window should be unaffected by resistFingerprinting"
  );

  newWindow.close();

  await SpecialPowers.popPrefEnv();

  // Reset timezone
  SpecialPowers.Cu.getJSTestingFunctions().setTimeZone(undefined);
});

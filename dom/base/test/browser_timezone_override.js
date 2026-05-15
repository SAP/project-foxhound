/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const PAGE_URL = "https://example.com/chrome/dom/base/test/file_empty.html";
const timezones = [
  {
    timezoneId: "Europe/London",
    dateString: "Mon Sep 09 1974 12:25:15 GMT+0100 (British Summer Time)",
  },
  {
    timezoneId: "America/New_York",
    dateString: "Mon Sep 09 1974 07:25:15 GMT-0400 (Eastern Daylight Time)",
  },
  {
    timezoneId: "Pacific/Auckland",
    dateString: "Mon Sep 09 1974 23:25:15 GMT+1200 (New Zealand Standard Time)",
  },
];

const TEST_TIMESTAMP = 147957915498;

add_task(async function test_set_timezone_override() {
  const tab = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser = gBrowser.getBrowserForTab(tab);

  await BrowserTestUtils.browserLoaded(browser);

  info("Get default timezone");
  const defaultTimezone = await getIntlTimezone(browser);
  const defaultDateString = await getDateString(browser);

  const timezoneOverride = getTimezoneToOverride(defaultTimezone);

  info("Set timezone override");
  browser.browsingContext.timezoneOverride = timezoneOverride;

  await assertTimezoneOverridden(browser, timezoneOverride);

  const secondTimezoneOverride = getSecondTimezoneToOverride(defaultTimezone);

  info("Set another timezone override again");
  browser.browsingContext.timezoneOverride = secondTimezoneOverride;

  await assertTimezoneOverridden(browser, secondTimezoneOverride);

  info("Reset language override");
  browser.browsingContext.timezoneOverride = "";
  await assertTimezoneIsNotOverridden(
    browser,
    defaultTimezone,
    defaultDateString
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_set_timezone_override_and_navigate() {
  const tab = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser = gBrowser.getBrowserForTab(tab);

  await BrowserTestUtils.browserLoaded(browser);

  info("Get default timezone");
  const defaultTimezone = await getIntlTimezone(browser);
  const timezoneOverride = getTimezoneToOverride(defaultTimezone);

  info("Set timezone override");
  browser.browsingContext.timezoneOverride = timezoneOverride;

  await assertTimezoneOverridden(browser, timezoneOverride);

  info("Navigate browsing context");
  const url = "https://example.com/chrome/dom/base/test/dummy.html";
  const loaded = BrowserTestUtils.browserLoaded(browser, false, url, false);
  BrowserTestUtils.startLoadingURIString(browser, url);
  await loaded;
  await assertTimezoneOverridden(browser, timezoneOverride);

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_set_timezone_override_in_different_contexts() {
  const tab1 = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser1 = gBrowser.getBrowserForTab(tab1);

  await BrowserTestUtils.browserLoaded(browser1);

  const tab2 = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser2 = gBrowser.getBrowserForTab(tab2);

  await BrowserTestUtils.browserLoaded(browser2);

  info("Get default timezone in the first tab");
  const defaultTimezone = await getIntlTimezone(browser1);
  const defaultDateString = await getDateString(browser1);

  const timezoneOverride = getTimezoneToOverride(defaultTimezone);

  info("Set timezone override to the first tab");
  browser1.browsingContext.timezoneOverride = timezoneOverride;

  await assertTimezoneOverridden(browser1, timezoneOverride);

  info("Make sure that in the second tab timezone is not overridden");
  await assertTimezoneIsNotOverridden(
    browser2,
    defaultTimezone,
    defaultDateString
  );

  info("Reset timezone override");
  browser1.browsingContext.timezoneOverride = "";
  await assertTimezoneIsNotOverridden(
    browser1,
    defaultTimezone,
    defaultDateString
  );

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

add_task(async function test_set_custom_offset_as_timezone_override() {
  const tab = BrowserTestUtils.addTab(gBrowser, PAGE_URL);
  const browser = gBrowser.getBrowserForTab(tab);

  await BrowserTestUtils.browserLoaded(browser);

  info("Get default timezone");
  const defaultTimezone = await getIntlTimezone(browser);
  const defaultDateString = await getDateString(browser);

  const timezoneOverride = "GMT+05:00";

  info("Set timezone override");
  browser.browsingContext.timezoneOverride = timezoneOverride;

  const customTimezoneId = "Etc/GMT-5";
  is(
    await getDateString(browser),
    `Mon Sep 09 1974 16:25:15 GMT+0500 (${timezoneOverride})`,
    `new Date(${TEST_TIMESTAMP}).toString() is overridden`
  );
  is(
    await getIntlTimezone(browser),
    customTimezoneId,
    "new Intl.DateTimeFormat().resolvedOptions().timezone is overridden"
  );
  is(
    await getTemporalTimezoneId(browser),
    customTimezoneId,
    "Temporal.Now.timezoneId is overridden"
  );

  info("Reset language override");
  browser.browsingContext.timezoneOverride = "";
  await assertTimezoneIsNotOverridden(
    browser,
    defaultTimezone,
    defaultDateString
  );

  BrowserTestUtils.removeTab(tab);
});

async function assertTimezoneOverridden(browser, timezoneOverride) {
  const timezoneObject = findTimezoneObject(timezoneOverride);
  is(
    await getDateString(browser),
    timezoneObject.dateString,
    `new Date(${TEST_TIMESTAMP}).toString() is overridden`
  );
  is(
    await getIntlTimezone(browser),
    timezoneOverride,
    "new Intl.DateTimeFormat().resolvedOptions().timeZone is overridden"
  );
  is(
    await getTemporalTimezoneId(browser),
    timezoneOverride,
    "Temporal.Now.timezoneId is overridden"
  );
}

async function assertTimezoneIsNotOverridden(
  browser,
  defaultTimezone,
  defaultDateString
) {
  is(
    await getIntlTimezone(browser),
    defaultTimezone,
    "new Intl.DateTimeFormat().resolvedOptions().timeZone is not overridden"
  );
  is(
    await getTemporalTimezoneId(browser),
    defaultTimezone,
    "Temporal.Now.timezoneId is not overridden"
  );
  is(
    await getDateString(browser),
    defaultDateString,
    `new Date(${TEST_TIMESTAMP}).toString() is not overridden`
  );
}

async function getDateString(browser) {
  return SpecialPowers.spawn(browser, [TEST_TIMESTAMP], testTimestamp => {
    return content.eval(`new Date(${testTimestamp}).toString()`);
  });
}

async function getIntlTimezone(browser) {
  return SpecialPowers.spawn(browser, [], () => {
    return content.eval(`Intl.DateTimeFormat().resolvedOptions().timeZone`);
  });
}

async function getTemporalTimezoneId(browser) {
  return SpecialPowers.spawn(browser, [], () => {
    return content.eval(`Temporal.Now.timeZoneId()`);
  });
}

function getTimezoneToOverride(defaultTimezone) {
  const timezoneObject = timezones.find(
    timezone => timezone.timezoneId !== defaultTimezone
  );
  return timezoneObject.timezoneId;
}

function getSecondTimezoneToOverride(defaultTimezone, testTimezone) {
  const timezoneObject = timezones.find(
    timezone =>
      timezone.timezoneId !== defaultTimezone &&
      timezone.timezoneId !== testTimezone
  );
  return timezoneObject.timezoneId;
}

function findTimezoneObject(timezoneId) {
  return timezones.find(timezone => timezone.timezoneId === timezoneId);
}

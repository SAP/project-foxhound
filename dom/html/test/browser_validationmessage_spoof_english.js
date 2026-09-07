/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/*
Test for bug 2040704 - datetime input validation messages should use
                       en_US localization when English spoofing is enabled.
*/

const originalAvailableLocales = Services.locale.availableLocales;
const originalRequestedLocales = Services.locale.requestedLocales;

async function runTest(test) {
  for (let spoof of [false, true]) {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["privacy.spoof_english", spoof ? 2 : 0],
        ["privacy.resistFingerprinting", spoof],
      ],
    });
    let source = `<!DOCTYPE html>
<input type="${test.type}" min="${test.min}" value="${test.value}">`;
    let result = await BrowserTestUtils.withNewTab(
      "data:text/html," + source,
      browser => {
        return SpecialPowers.spawn(browser, [], () => {
          return content.eval(
            'document.querySelector("input").validationMessage'
          );
        });
      }
    );
    let expectIncludes = test[spoof ? "en" : "de"];
    let expectDoesNotInclude = test[spoof ? "de" : "en"];
    ok(
      result.includes(expectIncludes),
      `With spoofing ${spoof ? "enabled" : "disabled"}: expect validationMessage ` +
        `to include "${expectIncludes}": "${result}"`
    );
    ok(
      !result.includes(expectDoesNotInclude),
      `With spoofing ${spoof ? "enabled" : "disabled"}: expect validationMessage ` +
        `to not include "${expectDoesNotInclude}": "${result}"`
    );
  }
}

const tests = [
  {
    type: "date",
    min: "2000-01-01",
    value: "1999-01-01",
    en: "01/01/2000",
    de: "01.01.2000",
  },
  {
    type: "time",
    min: "16:00",
    value: "15:00",
    en: "4:00 PM",
    de: "16:00",
  },
  {
    type: "datetime-local",
    min: "2000-01-01T00:00",
    value: "1999-01-01T00:00",
    en: "01/01/2000",
    de: "01.01.2000",
  },
];

add_task(() => {
  Services.locale.availableLocales = ["de-DE"];
  Services.locale.requestedLocales = ["de-DE"];
});

for (let test of tests) {
  add_task(() => runTest(test));
}

add_task(() => {
  // restore previous locales
  Services.locale.availableLocales = originalAvailableLocales;
  Services.locale.requestedLocales = originalRequestedLocales;
});

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

addAccessibleTask(
  `tree/doc_xul.xhtml`,
  async function testXUL(browser, accDoc) {
    const htmlLabel = findAccessibleChildByID(accDoc, "html-label");
    is(htmlLabel.name, "hello", "HTML Label should have correct name");

    const xulLabel = findAccessibleChildByID(accDoc, "xul-label");
    ok(!xulLabel, "XUL label accessible should not be created");
  },
  {
    topLevel: true,
    chrome: false,
  }
);

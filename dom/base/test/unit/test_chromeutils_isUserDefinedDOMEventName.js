"use strict";

function run_test() {
  ok(!ChromeUtils.isUserDefinedDOMEventName("click"));
  ok(!ChromeUtils.isUserDefinedDOMEventName("keydown"));
  ok(ChromeUtils.isUserDefinedDOMEventName("user-defined"));
  ok(ChromeUtils.isUserDefinedDOMEventName("custom-click"));
}

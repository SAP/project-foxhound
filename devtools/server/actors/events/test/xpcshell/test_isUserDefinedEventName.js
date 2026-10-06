/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Test isUserDefinedEventName

const {
  isUserDefinedEventName,
} = require("resource://devtools/server/actors/events/events.js");

add_task(() => {
  ok(!isUserDefinedEventName("click"));
  ok(!isUserDefinedEventName("scroll"));
  ok(!isUserDefinedEventName("popupshown"));
  ok(!isUserDefinedEventName("DOMContentLoaded"));
  ok(isUserDefinedEventName("user-defined"));
});

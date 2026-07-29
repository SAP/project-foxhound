/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const COOKIE_NAME = "ipp-activator-test";

function setCookie(host, name, value) {
  Services.cookies.add(
    host,
    "/",
    name,
    value,
    false,
    false,
    true,
    Number.MAX_SAFE_INTEGER,
    {},
    Ci.nsICookie.SAMESITE_LAX,
    Ci.nsICookie.SCHEME_HTTP
  );
}

add_setup(async function () {
  registerCleanupFunction(() => {
    Services.cookies.removeAll();
    resetState();
  });
});

add_task(async function test_cookie_present() {
  setCookie(TEST_DOMAIN, COOKIE_NAME, "anything");
  await checkNotification(
    { type: "cookie", domain: TEST_DOMAIN, name: COOKIE_NAME },
    true
  );
});

add_task(async function test_cookie_missing() {
  Services.cookies.removeAll();
  await checkNotification(
    { type: "cookie", domain: TEST_DOMAIN, name: COOKIE_NAME },
    false
  );
});

add_task(async function test_cookie_value_exact_match() {
  Services.cookies.removeAll();
  setCookie(TEST_DOMAIN, COOKIE_NAME, "expected");
  await checkNotification(
    {
      type: "cookie",
      domain: TEST_DOMAIN,
      name: COOKIE_NAME,
      value: "expected",
    },
    true
  );
});

add_task(async function test_cookie_value_mismatch() {
  Services.cookies.removeAll();
  setCookie(TEST_DOMAIN, COOKIE_NAME, "actual");
  await checkNotification(
    {
      type: "cookie",
      domain: TEST_DOMAIN,
      name: COOKIE_NAME,
      value: "expected",
    },
    false
  );
});

add_task(async function test_cookie_value_contain_match() {
  Services.cookies.removeAll();
  setCookie(TEST_DOMAIN, COOKIE_NAME, "prefix-needle-suffix");
  await checkNotification(
    {
      type: "cookie",
      domain: TEST_DOMAIN,
      name: COOKIE_NAME,
      value_contain: "needle",
    },
    true
  );
});

add_task(async function test_cookie_value_contain_mismatch() {
  Services.cookies.removeAll();
  setCookie(TEST_DOMAIN, COOKIE_NAME, "no-match-here");
  await checkNotification(
    {
      type: "cookie",
      domain: TEST_DOMAIN,
      name: COOKIE_NAME,
      value_contain: "needle",
    },
    false
  );
});

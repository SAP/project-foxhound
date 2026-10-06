"use strict";

add_task(async function do_test_invalid_cookies() {
  async function backgroundScript() {
    browser.test.onMessage.addListener(async message => {
      let failure = true;
      try {
        await browser.cookies.set({
          url: "https://example.com",
          ...message.cookie,
        });
        failure = false;
      } catch (e) {
        browser.test.assertEq(
          e.message,
          message.errorString,
          `${message.title} - correct exception`
        );
      } finally {
        browser.test.assertTrue(failure, message.title);
        browser.test.sendMessage("completed");
      }
    });

    browser.test.sendMessage("ready");
  }

  const extension = ExtensionTestUtils.loadExtension({
    background: backgroundScript,
    manifest: {
      permissions: [
        "cookies",
        "https://example.com/*",
        "https://example..com/*",
      ],
    },
  });

  let readyPromise = extension.awaitMessage("ready");
  await extension.startup();
  await readyPromise;

  // the nameless cookie tests get different errors depending on the pref
  let namelessError = "Cookie “” has been rejected for invalid prefix.";
  if (Services.prefs.getBoolPref("network.cookie.valueless_cookie")) {
    namelessError =
      "Cookie “” has been rejected for invalid characters in the name.";
  }

  const tests = [
    {
      cookie: {},
      title: "Unset name and value",
      errorString:
        "Cookie with an empty name and an empty value has been rejected.",
    },
    {
      cookie: { name: "" },
      title: "Empty name and unset value",
      errorString:
        "Cookie with an empty name and an empty value has been rejected.",
    },
    {
      cookie: { value: "" },
      title: "Unset name and empty value",
      errorString:
        "Cookie with an empty name and an empty value has been rejected.",
    },
    {
      cookie: { name: "", value: "" },
      title: "Empty name and value",
      errorString:
        "Cookie with an empty name and an empty value has been rejected.",
    },
    {
      cookie: { name: "a".repeat(3000), value: "a".repeat(3000) },
      title: "Name/value oversize",
      errorString: `Cookie “${"a".repeat(3000)}” is invalid because its size is too big. Max size is 4096 B.`,
    },
    {
      cookie: { name: ";", value: "a" },
      title: "Invalid chars in the name",
      errorString:
        "Cookie “;” has been rejected for invalid characters in the name.",
    },
    {
      cookie: { name: " ", value: "a" },
      title: "Invalid chars in the name (2)",
      errorString:
        "Cookie “ ” has been rejected for invalid characters in the name.",
    },
    {
      cookie: { name: "a", value: ";" },
      title: "Invalid chars in the value",
      errorString:
        "Cookie “a” has been rejected for invalid characters in the value.",
    },
    {
      cookie: { name: "a", value: " " },
      title: "Invalid chars in the value (2)",
      errorString:
        "Cookie “a” has been rejected for invalid characters in the value.",
    },
    {
      cookie: { name: "", value: "__Secure-wow" },
      title: "Invalid prefix (__Secure)",
      errorString: namelessError,
    },
    {
      cookie: { name: "", value: "__Host-wow" },
      title: "Invalid prefix (__Host)",
      errorString: namelessError,
    },
    {
      cookie: { name: "a", value: "b", sameSite: "no_restriction" },
      title: "None requires secure",
      errorString:
        "Cookie “a” rejected because it has the “SameSite=None” attribute but is missing the “secure” attribute.",
    },
    {
      cookie: { name: "a", value: "b", path: "a".repeat(1025) },
      title: "Path oversize",
      errorString:
        "Cookie “a” has been rejected because its path attribute is too big.",
    },
    {
      cookie: {
        url: "https://example..com",
        domain: ".example.com",
        name: "test",
      },
      title: "Invalid url",
      errorString: `Invalid domain url: "https://example..com"`,
      failure: true,
    },
    {
      cookie: {
        url: "https://example..com",
        name: "test",
      },
      title: "Invalid url and no domain",
      errorString: `Invalid domain: "example..com"`,
      failure: true,
    },
  ];

  for (const test of tests) {
    extension.sendMessage(test);

    await extension.awaitMessage("completed");
  }

  await extension.unload();
});

add_task(async function test_nameless_cookie_rejected_with_valueless_pref_on() {
  Services.prefs.setBoolPref("network.cookie.valueless_cookie", true);

  async function backgroundScript() {
    await browser.test.assertRejects(
      browser.cookies.set({ value: "dummy", url: "https://example.com" }),
      /rejected for invalid characters in the name/,
      "nameless cookie is rejected when valueless_cookie pref is on"
    );
    browser.test.sendMessage("done");
  }

  const extension = ExtensionTestUtils.loadExtension({
    background: backgroundScript,
    manifest: {
      permissions: ["cookies", "https://example.com/*"],
    },
  });

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();

  Services.prefs.clearUserPref("network.cookie.valueless_cookie");
});

add_task(async function test_nameless_cookie_with_valueless_pref_off() {
  Services.prefs.setBoolPref("network.cookie.valueless_cookie", false);

  async function backgroundScript() {
    const TEST_URL = "https://example.com";
    let cookie = await browser.cookies.set({ value: "dummy", url: TEST_URL });
    browser.test.assertEq("", cookie.name, "default name set");
    browser.test.assertEq("dummy", cookie.value, "dummy value set");
    browser.test.assertEq(
      true,
      cookie.session,
      "no expiry date created session cookie"
    );

    const details = await browser.cookies.remove({ url: TEST_URL, name: "" });
    browser.test.assertEq(TEST_URL, details.url, "removed cookie url");
    browser.test.assertEq("", details.name, "removed cookie name");

    browser.test.sendMessage("done");
  }

  const extension = ExtensionTestUtils.loadExtension({
    background: backgroundScript,
    manifest: {
      permissions: ["cookies", "https://example.com/*"],
    },
  });

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();

  Services.prefs.clearUserPref("network.cookie.valueless_cookie");
});

"use strict";

AddonTestUtils.init(this);

const server = createHttpServer({ hosts: ["example.com"] });
server.registerDirectory("/data/", do_get_file("data"));

add_setup(async function setup() {
  await ExtensionTestUtils.startAddonManager();
});

add_task(async function test_storage_session() {
  await test_background_page_storage("session");
});

add_task(async function test_storage_session_onChanged_event_page() {
  await test_storage_change_event_page("session");
});

add_task(async function test_storage_session_persistance() {
  await test_storage_after_reload("session", { expectPersistency: false });
});

add_task(async function test_storage_session_empty_events() {
  await test_storage_empty_events("session");
});

add_task(async function test_storage_session_contentscript() {
  let extensionData = {
    manifest: {
      content_scripts: [
        {
          matches: ["http://example.com/data/file_sample.html"],
          js: ["content_script.js"],
        },
      ],
      permissions: ["storage"],
    },
    background() {
      let events = [];
      browser.storage.onChanged.addListener((_, area) => {
        events.push(area);
      });
      browser.test.onMessage.addListener(_msg => {
        browser.test.sendMessage("bg-events", events.join());
      });
      browser.runtime.onMessage.addListener(async _msg => {
        await browser.storage.local.set({ foo: "local" });
        await browser.storage.session.set({ foo: "session" });
        await browser.storage.sync.set({ foo: "sync" });
        browser.test.sendMessage("done");
      });
    },
    files: {
      "content_script.js"() {
        let events = [];
        browser.storage.onChanged.addListener((_, area) => {
          events.push(area);
        });
        browser.test.onMessage.addListener(_msg => {
          browser.test.sendMessage("cs-events", events.join());
        });

        browser.test.assertEq(
          typeof browser.storage.session,
          "undefined",
          "Expect storage.session to not be available in content scripts"
        );
        browser.runtime.sendMessage("ready");
      },
    },
  };

  let extension = ExtensionTestUtils.loadExtension(extensionData);
  await extension.startup();

  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/data/file_sample.html"
  );

  await extension.awaitMessage("done");
  extension.sendMessage("_getEvents");

  equal(
    "local,sync",
    await extension.awaitMessage("cs-events"),
    "Content script doesn't see storage.onChanged events from the session area."
  );
  equal(
    "local,session,sync",
    await extension.awaitMessage("bg-events"),
    "Background receives onChanged events from all storage areas."
  );

  await extension.unload();
  await contentPage.close();
});

async function test_storage_session_quota({ quotaEnforced }) {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["storage"],
    },
    async background() {
      const MB = 1_000_000;

      // Max overhead per storage item. Currently it's 16 (+ key length),
      // but that's implementation detail and might easily change.
      const SLACK = 40;

      let before = 0;
      let error = null;
      try {
        // Try to store 30Mb in session storage.
        for (let i = 0; i < 30; i++) {
          await browser.storage.session.set({
            [`key${i}`]: "x".repeat(MB),
          });

          let after = await browser.storage.session.getBytesInUse();
          let delta = after - before;
          browser.test.assertTrue(
            delta >= MB && delta <= MB + SLACK,
            `Expected storage.session.getBytesInUse() delta=${delta}`
          );
          before = after;
        }
      } catch (e) {
        error = e.message;
        browser.test.log(error);
      }

      browser.test.sendMessage("data", {
        error,
        data: await browser.storage.session.get(),
      });

      await browser.storage.session.remove(["key2", "key3"]);
      let after = await browser.storage.session.getBytesInUse();
      let delta = after - before;
      browser.test.assertTrue(
        // Note that we're expecting and comparing a negative delta here.
        -delta >= 2 * MB && -delta <= 2 * (MB + SLACK),
        `Expected getBytesInUse() after removing 2 items delta=${delta}`
      );

      error = null;
      try {
        await browser.storage.session.set({
          canary: 13,
          big: "x".repeat(5 * MB),
        });
      } catch (e) {
        error = e.message;
        browser.test.log(error);
      }
      let data = await browser.storage.session.get();

      await browser.storage.session.clear();
      let zero = await browser.storage.session.getBytesInUse();
      browser.test.assertEq(zero, 0, "Zero bytes used after clear.");

      const six = "x".repeat(6 * MB);
      await browser.storage.session.set({
        one: "x".repeat(MB),
        six: six,
      });
      before = await browser.storage.session.getBytesInUse();
      await browser.storage.session.remove("six");
      await browser.storage.session.set({ 六: six });

      after = await browser.storage.session.getBytesInUse();
      browser.test.assertEq(
        after - before,
        "六".length - "six".length,
        "Usage increased by key's length difference in js chars (not bytes)."
      );
      browser.test.assertEq("六".length, 1, "File encoding sanity check.");

      browser.test.assertEq(
        after,
        await browser.storage.session.getBytesInUse(["one", "六"]),
        "Listing all keys is equivalent to not passing any keys."
      );

      await browser.storage.session.set({ "": 13 });
      browser.test.assertEq(
        await browser.storage.session.getBytesInUse(""),
        await browser.storage.session.getBytesInUse([""]),
        `Falsy key "" is correctly interpreted.`
      );

      browser.test.sendMessage("done", { error, data });
    },
  });

  await extension.startup();

  {
    let { error, data } = await extension.awaitMessage("data");

    if (quotaEnforced) {
      ok(error.match(/QuotaExceededError/), "Expect error in Nightly builds.");
      equal(Object.keys(data).length, 10, "10Mb stored in Nightly builds.");
    } else {
      equal(error, null, "No error in release builds.");
      equal(Object.keys(data).length, 30, "30Mb stored in release builds.");
    }
  }

  {
    let { error, data } = await extension.awaitMessage("done");
    if (quotaEnforced) {
      ok(error.match(/QuotaExceededError/), "Expect error in Nightly builds.");
      ok(!data.canary, "No partial updates on error.");
    } else {
      equal(data.canary, 13, "Without quota enforcement, canary was set.");
    }
  }

  await extension.unload();
}

add_task(async function test_storage_session_quota_enforced_by_default() {
  await test_storage_session_quota({ quotaEnforced: true });
});

add_task(
  {
    pref_set: [["webextensions.storage.session.enforceQuota", false]],
  },
  async function test_storage_session_quota_pref_false() {
    await test_storage_session_quota({ quotaEnforced: false });
  }
);

add_task(
  {
    pref_set: [["webextensions.storage.session.enforceQuota", true]],
  },
  async function test_storage_session_quota_pref_true() {
    await test_storage_session_quota({ quotaEnforced: true });
  }
);

add_task(async function test_storage_session_getBytesInUse() {
  await test_get_bytes_in_use("session");
});

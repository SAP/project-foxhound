/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests L10nCache in UrlbarUtils.sys.mjs.

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  L10nCache: "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs",
});

add_task(async function comprehensive() {
  // Set up a mock localization.
  let l10n = initL10n({
    args0a: "Zero args value",
    args0b: "Another zero args value",
    args1a: "One arg value is { $arg1 }",
    args1b: "Another one arg value is { $arg1 }",
    args2a: "Two arg values are { $arg1 } and { $arg2 }",
    args2b: "More two arg values are { $arg1 } and { $arg2 }",
    args3a: "Three arg values are { $arg1 }, { $arg2 }, and { $arg3 }",
    args3b: "More three arg values are { $arg1 }, { $arg2 }, and { $arg3 }",
    attrs1: [".label = attrs1 label has zero args"],
    attrs2: [
      ".label = attrs2 label has zero args",
      ".tooltiptext = attrs2 tooltiptext arg value is { $arg1 }",
    ],
    attrs3: [
      ".label = attrs3 label has zero args",
      ".tooltiptext = attrs3 tooltiptext arg value is { $arg1 }",
      ".alt = attrs3 alt arg values are { $arg1 } and { $arg2 }",
    ],
  });

  let tests = [
    // different strings with the same number of args and also the same strings
    // with different args
    {
      obj: {
        id: "args0a",
      },
      expected: {
        value: "Zero args value",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args0b",
      },
      expected: {
        value: "Another zero args value",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args1a",
        args: { arg1: "foo1" },
      },
      expected: {
        value: "One arg value is foo1",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args1a",
        args: { arg1: "foo2" },
      },
      expected: {
        value: "One arg value is foo2",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args1b",
        args: { arg1: "foo1" },
      },
      expected: {
        value: "Another one arg value is foo1",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args1b",
        args: { arg1: "foo2" },
      },
      expected: {
        value: "Another one arg value is foo2",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args2a",
        args: { arg1: "foo1", arg2: "bar1" },
      },
      expected: {
        value: "Two arg values are foo1 and bar1",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args2a",
        args: { arg1: "foo2", arg2: "bar2" },
      },
      expected: {
        value: "Two arg values are foo2 and bar2",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args2b",
        args: { arg1: "foo1", arg2: "bar1" },
      },
      expected: {
        value: "More two arg values are foo1 and bar1",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args2b",
        args: { arg1: "foo2", arg2: "bar2" },
      },
      expected: {
        value: "More two arg values are foo2 and bar2",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args3a",
        args: { arg1: "foo1", arg2: "bar1", arg3: "baz1" },
      },
      expected: {
        value: "Three arg values are foo1, bar1, and baz1",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args3a",
        args: { arg1: "foo2", arg2: "bar2", arg3: "baz2" },
      },
      expected: {
        value: "Three arg values are foo2, bar2, and baz2",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args3b",
        args: { arg1: "foo1", arg2: "bar1", arg3: "baz1" },
      },
      expected: {
        value: "More three arg values are foo1, bar1, and baz1",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args3b",
        args: { arg1: "foo2", arg2: "bar2", arg3: "baz2" },
      },
      expected: {
        value: "More three arg values are foo2, bar2, and baz2",
        attributes: null,
      },
    },

    // two instances of the same string with their args swapped
    {
      obj: {
        id: "args2a",
        args: { arg1: "arg A", arg2: "arg B" },
      },
      expected: {
        value: "Two arg values are arg A and arg B",
        attributes: null,
      },
    },
    {
      obj: {
        id: "args2a",
        args: { arg1: "arg B", arg2: "arg A" },
      },
      expected: {
        value: "Two arg values are arg B and arg A",
        attributes: null,
      },
    },

    // strings with attributes
    {
      obj: {
        id: "attrs1",
      },
      expected: {
        value: null,
        attributes: {
          label: "attrs1 label has zero args",
        },
      },
    },
    {
      obj: {
        id: "attrs2",
        args: {
          arg1: "arg A",
        },
      },
      expected: {
        value: null,
        attributes: {
          label: "attrs2 label has zero args",
          tooltiptext: "attrs2 tooltiptext arg value is arg A",
        },
      },
    },
    {
      obj: {
        id: "attrs3",
        args: {
          arg1: "arg A",
          arg2: "arg B",
        },
      },
      expected: {
        value: null,
        attributes: {
          label: "attrs3 label has zero args",
          tooltiptext: "attrs3 tooltiptext arg value is arg A",
          alt: "attrs3 alt arg values are arg A and arg B",
        },
      },
    },
  ];

  let cache = new L10nCache(l10n);

  // Get some non-cached strings.
  Assert.ok(!cache.get({ id: "uncached1" }), "Uncached string 1");
  Assert.ok(!cache.get({ id: "uncached2", args: "foo" }), "Uncached string 2");

  // Add each test string and get it back.
  for (let { obj, expected } of tests) {
    await cache.add(obj);
    let message = cache.get(obj);
    Assert.deepEqual(
      message,
      expected,
      "Expected message for obj: " + JSON.stringify(obj)
    );
  }

  // Get each string again to make sure each add didn't somehow mess up the
  // previously added strings.
  for (let { obj, expected } of tests) {
    Assert.deepEqual(
      cache.get(obj),
      expected,
      "Expected message for obj: " + JSON.stringify(obj)
    );
  }

  // Delete some of the strings. We'll delete every other one to mix it up.
  for (let i = 0; i < tests.length; i++) {
    if (i % 2 == 0) {
      let { obj } = tests[i];
      cache.delete(obj);
      Assert.ok(!cache.get(obj), "Deleted from cache: " + JSON.stringify(obj));
    }
  }

  // Get each remaining string.
  for (let i = 0; i < tests.length; i++) {
    if (i % 2 != 0) {
      let { obj, expected } = tests[i];
      Assert.deepEqual(
        cache.get(obj),
        expected,
        "Expected message for obj: " + JSON.stringify(obj)
      );
    }
  }

  // Clear the cache.
  cache.clear();
  for (let { obj } of tests) {
    Assert.ok(!cache.get(obj), "After cache clear: " + JSON.stringify(obj));
  }

  // `ensure` each test string and get it back.
  for (let { obj, expected } of tests) {
    await cache.ensure(obj);
    let message = cache.get(obj);
    Assert.deepEqual(
      message,
      expected,
      "Expected message for obj: " + JSON.stringify(obj)
    );

    // Call `ensure` again. This time, `add` should not be called.
    let originalAdd = cache.add;
    cache.add = () => Assert.ok(false, "add erroneously called");
    await cache.ensure(obj);
    cache.add = originalAdd;
  }

  // Clear the cache again.
  cache.clear();
  for (let { obj } of tests) {
    Assert.ok(!cache.get(obj), "After cache clear: " + JSON.stringify(obj));
  }

  // `ensureAll` the test strings and get them back.
  let objects = tests.map(({ obj }) => obj);
  await cache.ensureAll(objects);
  for (let { obj, expected } of tests) {
    let message = cache.get(obj);
    Assert.deepEqual(
      message,
      expected,
      "Expected message for obj: " + JSON.stringify(obj)
    );
  }

  // Ensure the cache is cleared after the app locale changes
  Assert.greater(cache.size(), 0, "The cache has messages in it.");
  Services.obs.notifyObservers(null, "intl:app-locales-changed");
  Assert.equal(cache.size(), 0, "The cache is empty on app locale change");
});

// Tests cache eviction.
add_task(async function eviction() {
  // Set up a mock localization.
  let l10n = initL10n({
    args0: "Zero args value",
    args1: "One arg value is { $arg1 }",
    args2: "Two arg values are { $arg1 } and { $arg2 }",
    args3: "Three arg values are { $arg1 }, { $arg2 }, and { $arg3 }",

    attrs0: [".label = attrs0 label has zero args"],
    attrs1: [
      ".label = attrs1 label has zero args",
      ".tooltiptext = attrs1 tooltiptext arg value is { $arg1 }",
    ],
    attrs2: [
      ".label = attrs2 label has zero args",
      ".tooltiptext = attrs2 tooltiptext arg value is { $arg1 }",
      ".alt = attrs2 alt arg values are { $arg1 } and { $arg2 }",
    ],
  });

  let cache = new L10nCache(l10n);

  // Get the max cache entries per l10n ID.
  let maxEntriesPerId = L10nCache.MAX_ENTRIES_PER_ID;
  Assert.equal(
    typeof maxEntriesPerId,
    "number",
    "MAX_ENTRIES_PER_ID should be a number"
  );
  Assert.greater(maxEntriesPerId, 0, "MAX_ENTRIES_PER_ID should be > 0");

  // Cache enough l10n objects with the same ID but different args to fill up
  // the ID's cache entries. The args will be "aaa-0", "aaa-1", etc.
  for (let i = 0; i < maxEntriesPerId; i++) {
    let arg1 = "aaa-" + i;
    let l10nObj = {
      id: "args1",
      args: { arg1 },
    };
    await cache.add(l10nObj);

    // The message should be cached.
    Assert.deepEqual(
      cache.get(l10nObj),
      {
        value: `One arg value is ${arg1}`,
        attributes: null,
      },
      "Message should be cached: " + JSON.stringify(l10nObj)
    );

    // The cache size should be incremented.
    Assert.equal(
      cache.size(),
      i + 1,
      "Expected cache size after adding l10n obj: " + JSON.stringify(l10nObj)
    );
  }

  // Check some l10n objects we did not cache.
  for (let arg1 of [`aaa-${maxEntriesPerId}`, "some other value"]) {
    let l10nObj = {
      id: "args1",
      args: { arg1 },
    };
    Assert.ok(
      !cache.get(l10nObj),
      "Message should not be cached since it wasn't added: " +
        JSON.stringify(l10nObj)
    );
  }

  // Now cache more l10n objects with the same ID as before but with new args:
  // "bbb-0", "bbb-1", etc. Each time we cache a new object, the oldest "aaa"
  // entry should be evicted since the ID's cache entries are filled up.
  for (let i = 0; i < maxEntriesPerId; i++) {
    let arg1 = "bbb-" + i;
    let l10nObj = {
      id: "args1",
      args: { arg1 },
    };
    await cache.add(l10nObj);

    // The message should be cached.
    Assert.deepEqual(
      cache.get(l10nObj),
      {
        value: `One arg value is ${arg1}`,
        attributes: null,
      },
      "Message should be cached: " + JSON.stringify(l10nObj)
    );

    // The cache size should remain maxed out.
    Assert.equal(
      cache.size(),
      maxEntriesPerId,
      "Cache size should remain maxed out after caching l10n obj: " +
        JSON.stringify(l10nObj)
    );

    // The oldest "aaa" entry should have been evicted, and all previous oldest
    // entries in prior iterations of this loop should remain evicted.
    for (let j = 0; j < maxEntriesPerId; j++) {
      let oldArg1 = "aaa-" + j;
      let oldL10nObj = {
        id: "args1",
        args: { arg1: oldArg1 },
      };
      if (j <= i) {
        Assert.deepEqual(
          cache.get(oldL10nObj),
          null,
          "Message should be evicted for old l10n obj: " +
            JSON.stringify(oldL10nObj)
        );
      } else {
        Assert.deepEqual(
          cache.get(oldL10nObj),
          {
            value: `One arg value is ${oldArg1}`,
            attributes: null,
          },
          "Message should not yet be evicted for old l10n obj: " +
            JSON.stringify(oldL10nObj)
        );
      }
    }
  }

  // Now cache more l10n objects just like before but with a different ID. Since
  // the ID is new, we should be able to fill up its cache entries.
  for (let i = 0; i < maxEntriesPerId; i++) {
    let arg1 = "yyy-" + i;
    let arg2 = "zzz-" + i;
    let l10nObj = {
      id: "args2",
      args: { arg1, arg2 },
    };
    await cache.add(l10nObj);

    // The message should be cached.
    Assert.deepEqual(
      cache.get(l10nObj),
      {
        value: `Two arg values are ${arg1} and ${arg2}`,
        attributes: null,
      },
      "Message should be cached: " + JSON.stringify(l10nObj)
    );

    // The cache size should start increasing again since we're caching l10n
    // objects with a different ID from before.
    Assert.equal(
      cache.size(),
      maxEntriesPerId + i + 1,
      "Cache size should start increasing again: " + JSON.stringify(l10nObj)
    );

    // All the messages with the "args1" ID from above should remain cached.
    for (let j = 0; j < maxEntriesPerId; j++) {
      let prevArg1 = "bbb-" + j;
      let prevL10nObj = {
        id: "args1",
        args: { arg1: prevArg1 },
      };
      Assert.deepEqual(
        cache.get(prevL10nObj),
        {
          value: `One arg value is ${prevArg1}`,
          attributes: null,
        },
        "Previous message should remain cached: " + JSON.stringify(prevL10nObj)
      );
    }
  }

  // Now re-cache some of the previously cached "args1" messages. This should
  // reorder the "args1" cache entries so that these re-cached messages are most
  // recently used. We'll re-cache messages with even-numbered args values.
  for (let i = 0; i < maxEntriesPerId; i++) {
    if (i % 2 == 0) {
      let arg1 = "bbb-" + i;
      let l10nObj = {
        id: "args1",
        args: { arg1 },
      };
      Assert.ok(
        await cache.get(l10nObj),
        "Sanity check: Message should still be cached: " +
          JSON.stringify(l10nObj)
      );
      await cache.add(l10nObj);

      // The cache size should remain maxed out.
      Assert.equal(
        cache.size(),
        2 * maxEntriesPerId,
        "Cache size should remain maxed out after caching l10n obj: " +
          JSON.stringify(l10nObj)
      );
    }
  }

  // Build a list of args in the expected cached "args1" entries sorted from
  // least recently used to most recently used. Since we just re-cached messages
  // with even-numbered args, they should be at the end of this list, and
  // messages with odd-numbered args should be at the front.
  let expected = [];
  for (let i = 0; i < maxEntriesPerId; i++) {
    if (i % 2) {
      // odd
      expected.push("bbb-" + i);
    }
  }
  for (let i = 0; i < maxEntriesPerId; i++) {
    if (i % 2 == 0) {
      // even
      expected.push("bbb-" + i);
    }
  }

  // Now cache more l10n objects with the same "args1" ID but with new args.
  // The old "bbb" entries should be evicted in the expected order.
  for (let i = 0; i < maxEntriesPerId; i++) {
    let arg1 = "ccc-" + i;
    let l10nObj = {
      id: "args1",
      args: { arg1 },
    };
    await cache.add(l10nObj);

    // The message should be cached.
    Assert.deepEqual(
      cache.get(l10nObj),
      {
        value: `One arg value is ${arg1}`,
        attributes: null,
      },
      "Message should be cached: " + JSON.stringify(l10nObj)
    );

    // The cache size should remain maxed out.
    Assert.equal(
      cache.size(),
      2 * maxEntriesPerId,
      "Cache size should remain maxed out after caching l10n obj: " +
        JSON.stringify(l10nObj)
    );

    // The oldest entry should have been evicted, and all previous oldest
    // entries in prior iterations of this loop should remain evicted.
    for (let j = 0; j < expected.length; j++) {
      let oldArg1 = expected[j];
      let oldL10nObj = {
        id: "args1",
        args: { arg1: oldArg1 },
      };
      if (j <= i) {
        Assert.deepEqual(
          cache.get(oldL10nObj),
          null,
          "Message should be evicted for old l10n obj: " +
            JSON.stringify(oldL10nObj)
        );
      } else {
        Assert.deepEqual(
          cache.get(oldL10nObj),
          {
            value: `One arg value is ${oldArg1}`,
            attributes: null,
          },
          "Message should not yet be evicted for old l10n obj: " +
            JSON.stringify(oldL10nObj)
        );
      }
    }
  }
});

/**
 * Sets up a mock localization.
 *
 * @param {object} pairs
 *   Fluent strings as key-value pairs.
 * @returns {Localization}
 *   The mock Localization object.
 */
function initL10n(pairs) {
  let source = Object.entries(pairs)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        value = value.map(s => "  \n" + s).join("");
      }
      return `${key} = ${value}`;
    })
    .join("\n");
  let registry = new L10nRegistry();
  registry.registerSources([
    L10nFileSource.createMock(
      "test",
      "app",
      ["en-US"],
      "/localization/{locale}",
      [{ source, path: "/localization/en-US/test.ftl" }]
    ),
  ]);
  return new Localization(["/test.ftl"], true, registry, ["en-US"]);
}

// ev, unordered, and runJSCacheTests are defined in head.js

add_task(async function testDiskCache_modules() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.expose_test_interfaces", true],
      ["dom.script_loader.bytecode_cache.enabled", true],
      ["dom.script_loader.bytecode_cache.strategy", 0],
      ["dom.script_loader.experimental.navigation_cache", false],
    ],
  });

  await runJSCacheTests([
    // A small module shouldn't be saved to the disk.
    {
      title: "small module",
      module: true,
      items: [
        {
          file: "file_js_cache_small.js",
          events: [
            ev("load:source", "file_js_cache_small.js"),
            ev("evaluate:module", "file_js_cache_small.js"),
            ev("diskcache:disabled", "file_js_cache_small.js"),
          ],
        },
        {
          file: "file_js_cache_small.js",
          events: [
            ev("load:source", "file_js_cache_small.js"),
            ev("evaluate:module", "file_js_cache_small.js"),
            ev("diskcache:disabled", "file_js_cache_small.js"),
          ],
        },
        {
          file: "file_js_cache_small.js",
          events: [
            ev("load:source", "file_js_cache_small.js"),
            ev("evaluate:module", "file_js_cache_small.js"),
            ev("diskcache:disabled", "file_js_cache_small.js"),
          ],
        },
        {
          file: "file_js_cache_small.js",
          events: [
            ev("load:source", "file_js_cache_small.js"),
            ev("evaluate:module", "file_js_cache_small.js"),
            ev("diskcache:disabled", "file_js_cache_small.js"),
          ],
        },
      ],
    },

    // A large module file should be saved to the disk.
    {
      title: "large module",
      module: true,
      items: [
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:register", "file_js_cache_large.js"),
            ev("diskcache:saved", "file_js_cache_large.js", false),
          ],
        },
      ],
    },

    // All imported modules should be saved to the disk.
    {
      title: "imported modules",
      module: true,
      items: [
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_imported1.mjs", false),
              ev("load:source", "file_js_cache_imported2.mjs", false),
              ev("load:source", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            ev("diskcache:disabled", "file_js_cache_importer.mjs"),
            // non-top-level modules that don't pass the condition
            // don't emit events.
          ],
        },
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_imported1.mjs", false),
              ev("load:source", "file_js_cache_imported2.mjs", false),
              ev("load:source", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            ev("diskcache:disabled", "file_js_cache_importer.mjs"),
          ],
        },
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_imported1.mjs", false),
              ev("load:source", "file_js_cache_imported2.mjs", false),
              ev("load:source", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            ev("diskcache:disabled", "file_js_cache_importer.mjs"),
          ],
        },
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_imported1.mjs", false),
              ev("load:source", "file_js_cache_imported2.mjs", false),
              ev("load:source", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            ev("diskcache:register", "file_js_cache_importer.mjs"),
            unordered([
              ev("diskcache:register", "file_js_cache_imported1.mjs", false),
              ev("diskcache:register", "file_js_cache_imported2.mjs", false),
              ev("diskcache:register", "file_js_cache_imported3.mjs", false),
            ]),
            ev("diskcache:saved", "file_js_cache_importer.mjs", false),
            unordered([
              ev("diskcache:saved", "file_js_cache_imported1.mjs", false),
              ev("diskcache:saved", "file_js_cache_imported2.mjs", false),
              ev("diskcache:saved", "file_js_cache_imported3.mjs", false),
            ]),
          ],
        },
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:diskcache", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:diskcache", "file_js_cache_imported1.mjs", false),
              ev("load:diskcache", "file_js_cache_imported2.mjs", false),
              ev("load:diskcache", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            ev("diskcache:disabled", "file_js_cache_importer.mjs"),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

add_task(async function testMemoryCache_modules() {
  if (!AppConstants.NIGHTLY_BUILD) {
    todo(false, "navigation cache is not yet enabled on non-nightly");
    return;
  }

  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.expose_test_interfaces", true],
      ["dom.script_loader.bytecode_cache.enabled", true],
      ["dom.script_loader.bytecode_cache.strategy", 0],
      ["dom.script_loader.experimental.navigation_cache", true],
    ],
  });

  await runJSCacheTests([
    // A small module shouldn't be saved to the disk.
    {
      title: "small module",
      module: true,
      items: [
        {
          file: "file_js_cache_small.js",
          events: [
            ev("load:source", "file_js_cache_small.js"),
            ev("memorycache:saved", "file_js_cache_small.js"),
            ev("evaluate:module", "file_js_cache_small.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_small.js",
          events: [
            ev("load:memorycache", "file_js_cache_small.js"),
            ev("evaluate:module", "file_js_cache_small.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_small.js",
          events: [
            ev("load:memorycache", "file_js_cache_small.js"),
            ev("evaluate:module", "file_js_cache_small.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_small.js",
          events: [
            ev("load:memorycache", "file_js_cache_small.js"),
            ev("evaluate:module", "file_js_cache_small.js"),
            ev("diskcache:noschedule"),
          ],
        },
      ],
    },

    // A large module file should be saved to the disk.
    {
      title: "large module",
      module: true,
      items: [
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:saved", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:saved", "file_js_cache_large.js", false),
          ],
        },
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
      ],
    },

    // All imported modules should be saved to the disk.
    {
      title: "imported modules",
      module: true,
      items: [
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_importer.mjs"),
            ev("memorycache:saved", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_imported1.mjs", false),
              ev("memorycache:saved", "file_js_cache_imported1.mjs", false),
              ev("load:source", "file_js_cache_imported2.mjs", false),
              ev("memorycache:saved", "file_js_cache_imported2.mjs", false),
              ev("load:source", "file_js_cache_imported3.mjs", false),
              ev("memorycache:saved", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:memorycache", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:memorycache", "file_js_cache_imported1.mjs", false),
              ev("load:memorycache", "file_js_cache_imported2.mjs", false),
              ev("load:memorycache", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:memorycache", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:memorycache", "file_js_cache_imported1.mjs", false),
              ev("load:memorycache", "file_js_cache_imported2.mjs", false),
              ev("load:memorycache", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:memorycache", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:memorycache", "file_js_cache_imported1.mjs", false),
              ev("load:memorycache", "file_js_cache_imported2.mjs", false),
              ev("load:memorycache", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            // SharedScriptCache iterates over unordered hashmap while
            // saving.
            unordered([
              ev("diskcache:saved", "file_js_cache_importer.mjs", false),
              ev("diskcache:saved", "file_js_cache_imported1.mjs", false),
              ev("diskcache:saved", "file_js_cache_imported2.mjs", false),
              ev("diskcache:saved", "file_js_cache_imported3.mjs", false),
            ]),
          ],
        },
        {
          file: "file_js_cache_importer.mjs",
          events: [
            ev("load:memorycache", "file_js_cache_importer.mjs"),
            unordered([
              ev("load:memorycache", "file_js_cache_imported1.mjs", false),
              ev("load:memorycache", "file_js_cache_imported2.mjs", false),
              ev("load:memorycache", "file_js_cache_imported3.mjs", false),
            ]),
            ev("evaluate:module", "file_js_cache_importer.mjs"),
            ev("diskcache:noschedule"),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

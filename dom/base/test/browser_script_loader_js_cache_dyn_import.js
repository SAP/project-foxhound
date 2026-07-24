// ev, unordered, and runJSCacheTests are defined in head.js

add_task(async function testDiskCache_dynamicImport() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.expose_test_interfaces", true],
      ["dom.script_loader.bytecode_cache.enabled", true],
      ["dom.script_loader.bytecode_cache.strategy", 0],
      ["dom.script_loader.experimental.navigation_cache", false],
    ],
  });

  await runJSCacheTests([
    {
      title: "dynamically imported modules",
      module: true,
      items: [
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            ev("diskcache:disabled", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_dyn_imported1.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported1.mjs",
                false
              ),
              ev("load:source", "file_js_cache_dyn_imported2.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported2.mjs",
                false
              ),
              ev("load:source", "file_js_cache_dyn_imported3.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported3.mjs",
                false
              ),
            ]),
          ],
        },
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            ev("diskcache:disabled", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_dyn_imported1.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported1.mjs",
                false
              ),
              ev("load:source", "file_js_cache_dyn_imported2.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported2.mjs",
                false
              ),
              ev("load:source", "file_js_cache_dyn_imported3.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported3.mjs",
                false
              ),
            ]),
          ],
        },
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            ev("diskcache:disabled", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_dyn_imported1.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported1.mjs",
                false
              ),
              ev("load:source", "file_js_cache_dyn_imported2.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported2.mjs",
                false
              ),
              ev("load:source", "file_js_cache_dyn_imported3.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported3.mjs",
                false
              ),
            ]),
          ],
        },
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            ev("diskcache:register", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_dyn_imported1.mjs", false),
              ev(
                "diskcache:register",
                "file_js_cache_dyn_imported1.mjs",
                false
              ),
              ev("load:source", "file_js_cache_dyn_imported2.mjs", false),
              ev(
                "diskcache:register",
                "file_js_cache_dyn_imported2.mjs",
                false
              ),
              ev("load:source", "file_js_cache_dyn_imported3.mjs", false),
              ev(
                "diskcache:register",
                "file_js_cache_dyn_imported3.mjs",
                false
              ),
            ]),
            ev("diskcache:saved", "file_js_cache_dyn_importer.mjs", false),
            unordered([
              ev("diskcache:saved", "file_js_cache_dyn_imported1.mjs", false),
              ev("diskcache:saved", "file_js_cache_dyn_imported2.mjs", false),
              ev("diskcache:saved", "file_js_cache_dyn_imported3.mjs", false),
            ]),
          ],
        },
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:diskcache", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            ev("diskcache:disabled", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:diskcache", "file_js_cache_dyn_imported1.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported1.mjs",
                false
              ),
              ev("load:diskcache", "file_js_cache_dyn_imported2.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported2.mjs",
                false
              ),
              ev("load:diskcache", "file_js_cache_dyn_imported3.mjs", false),
              ev(
                "diskcache:disabled",
                "file_js_cache_dyn_imported3.mjs",
                false
              ),
            ]),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

add_task(async function testMemoryCache_dynamicImport() {
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
    {
      title: "dynamically imported modules",
      module: true,
      items: [
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:source", "file_js_cache_dyn_importer.mjs"),
            ev("memorycache:saved", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:source", "file_js_cache_dyn_imported1.mjs", false),
              ev("memorycache:saved", "file_js_cache_dyn_imported1.mjs", false),
              ev("load:source", "file_js_cache_dyn_imported2.mjs", false),
              ev("memorycache:saved", "file_js_cache_dyn_imported2.mjs", false),
              ev("load:source", "file_js_cache_dyn_imported3.mjs", false),
              ev("memorycache:saved", "file_js_cache_dyn_imported3.mjs", false),
            ]),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:memorycache", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:memorycache", "file_js_cache_dyn_imported1.mjs", false),
              ev("load:memorycache", "file_js_cache_dyn_imported2.mjs", false),
              ev("load:memorycache", "file_js_cache_dyn_imported3.mjs", false),
            ]),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:memorycache", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:memorycache", "file_js_cache_dyn_imported1.mjs", false),
              ev("load:memorycache", "file_js_cache_dyn_imported2.mjs", false),
              ev("load:memorycache", "file_js_cache_dyn_imported3.mjs", false),
            ]),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:memorycache", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:memorycache", "file_js_cache_dyn_imported1.mjs", false),
              ev("load:memorycache", "file_js_cache_dyn_imported2.mjs", false),
              ev("load:memorycache", "file_js_cache_dyn_imported3.mjs", false),
            ]),
            unordered([
              ev("diskcache:saved", "file_js_cache_dyn_importer.mjs", false),
              ev("diskcache:saved", "file_js_cache_dyn_imported1.mjs", false),
              ev("diskcache:saved", "file_js_cache_dyn_imported2.mjs", false),
              ev("diskcache:saved", "file_js_cache_dyn_imported3.mjs", false),
            ]),
          ],
        },
        {
          file: "file_js_cache_dyn_importer.mjs",
          events: [
            ev("load:memorycache", "file_js_cache_dyn_importer.mjs"),
            ev("evaluate:module", "file_js_cache_dyn_importer.mjs"),
            unordered([
              ev("load:memorycache", "file_js_cache_dyn_imported1.mjs", false),
              ev("load:memorycache", "file_js_cache_dyn_imported2.mjs", false),
              ev("load:memorycache", "file_js_cache_dyn_imported3.mjs", false),
            ]),
            ev("diskcache:noschedule"),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

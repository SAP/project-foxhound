// ev, unordered, and runJSCacheTests are defined in head.js

add_task(async function testMemoryCache_dirtyStateModule() {
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
      title: "dirty state revive module",
      items: [
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:saved", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          invalidateMemory: true,
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("memorycache:dirty:hit", "file_js_cache_large.js"),
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:dirty:revived", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:saved", "file_js_cache_large.js", false),
          ],
        },
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
      ],
    },
    {
      title: "dirty state evict module",
      items: [
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:saved", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          invalidateMemory: true,
          clearDisk: true,
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("memorycache:dirty:hit", "file_js_cache_large.js"),
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:dirty:evicted", "file_js_cache_large.js"),
            ev("memorycache:saved", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule", "file_js_cache_large.js", false),
          ],
        },
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:saved", "file_js_cache_large.js", false),
          ],
        },
        {
          file: "file_js_cache_large.js",
          module: true,
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
      ],
    },
    {
      title: "dirty state revive imported",
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
          invalidateMemory: true,
          file: "file_js_cache_importer.mjs",
          events: [
            ev("memorycache:dirty:hit", "file_js_cache_large.js"),
            ev("load:source", "file_js_cache_importer.mjs"),
            ev("memorycache:dirty:revived", "file_js_cache_importer.mjs"),
            unordered([
              ev("memorycache:dirty:hit", "file_js_cache_imported1.mjs", false),
              ev("load:source", "file_js_cache_imported1.mjs", false),
              ev(
                "memorycache:dirty:revived",
                "file_js_cache_imported1.mjs",
                false
              ),

              ev("memorycache:dirty:hit", "file_js_cache_imported2.mjs", false),
              ev("load:source", "file_js_cache_imported2.mjs", false),
              ev(
                "memorycache:dirty:revived",
                "file_js_cache_imported2.mjs",
                false
              ),

              ev("memorycache:dirty:hit", "file_js_cache_imported3.mjs", false),
              ev("load:source", "file_js_cache_imported3.mjs", false),
              ev(
                "memorycache:dirty:revived",
                "file_js_cache_imported3.mjs",
                false
              ),
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
    {
      title: "dirty state evict imported",
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
          invalidateMemory: true,
          clearDisk: true,
          file: "file_js_cache_importer.mjs",
          events: [
            ev("memorycache:dirty:hit", "file_js_cache_large.js"),
            ev("load:source", "file_js_cache_importer.mjs"),
            ev("memorycache:dirty:evicted", "file_js_cache_importer.mjs"),
            ev("memorycache:saved", "file_js_cache_importer.mjs"),
            unordered([
              ev("memorycache:dirty:hit", "file_js_cache_imported1.mjs", false),
              ev("load:source", "file_js_cache_imported1.mjs", false),
              ev(
                "memorycache:dirty:evicted",
                "file_js_cache_imported1.mjs",
                false
              ),
              ev("memorycache:saved", "file_js_cache_imported1.mjs", false),

              ev("memorycache:dirty:hit", "file_js_cache_imported2.mjs", false),
              ev("load:source", "file_js_cache_imported2.mjs", false),
              ev(
                "memorycache:dirty:evicted",
                "file_js_cache_imported2.mjs",
                false
              ),
              ev("memorycache:saved", "file_js_cache_imported2.mjs", false),

              ev("memorycache:dirty:hit", "file_js_cache_imported3.mjs", false),
              ev("load:source", "file_js_cache_imported3.mjs", false),
              ev(
                "memorycache:dirty:evicted",
                "file_js_cache_imported3.mjs",
                false
              ),
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

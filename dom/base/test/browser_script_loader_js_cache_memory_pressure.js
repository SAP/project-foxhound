// ev, unordered, and runJSCacheTests are defined in head.js

add_task(async function testMemoryCache_MemoryPressure() {
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
      [
        "dom.script_loader.experimental.navigation_cache.check_memory_pressure",
        true,
      ],
    ],
  });

  await runJSCacheTests([
    {
      title: "large file",
      items: [
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:saved", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            // necko's fetch count: 1
            // in-memory fetch count: 1  (copied from necko)
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            // necko's fetch count: 1
            // in-memory fetch count: 2  (incremented)
            ev("diskcache:noschedule"),
          ],
        },
        {
          memoryPressureLowMemory: true,
          file: "file_js_cache_large.js",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:memorypressure", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            // necko's fetch count: 2  (incremented)
            // in-memory fetch count: N/A  (discarded)
            ev("diskcache:noschedule"),
          ],
        },
        {
          memoryPressureStop: true,
          file: "file_js_cache_large.js",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:saved", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            // necko's fetch count: 3  (incremented)
            // in-memory fetch count: 3  (copied from necko)
            ev("diskcache:noschedule"),
          ],
        },
        {
          memoryPressureHeapMinimize: true,
          file: "file_js_cache_large.js",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:saved", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            // necko's fetch count: 4  (incremented)
            // in-memory fetch count: 4  (discarded and copied from necko)
            ev("diskcache:saved", "file_js_cache_large.js", false),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

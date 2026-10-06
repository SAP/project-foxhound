// ev, unordered, and runJSCacheTests are defined in head.js

add_task(async function testHitLimitBeforeEncode() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.expose_test_interfaces", true],
      ["dom.script_loader.bytecode_cache.enabled", true],
      ["dom.script_loader.bytecode_cache.strategy", 0],
      ["dom.script_loader.experimental.navigation_cache", false],
      // file_js_cache_too_large.js is 4517 bytes.
      // The expected size is 5 * source length.
      // Set the limit below the expected size.
      ["browser.cache.disk.max_entry_size", Math.round((5 * 4000) / 1024)],
    ],
  });

  await runJSCacheTests([
    // If the file size
    {
      title: "hit limit before encode",
      items: [
        {
          file: "file_js_cache_too_large.js",
          events: [
            ev("load:source", "file_js_cache_too_large.js"),
            ev("evaluate:classic", "file_js_cache_too_large.js"),
            ev("diskcache:disabled", "file_js_cache_too_large.js"),
          ],
        },
        {
          file: "file_js_cache_too_large.js",
          events: [
            ev("load:source", "file_js_cache_too_large.js"),
            ev("evaluate:classic", "file_js_cache_too_large.js"),
            ev("diskcache:disabled", "file_js_cache_too_large.js"),
          ],
        },
        {
          file: "file_js_cache_too_large.js",
          events: [
            ev("load:source", "file_js_cache_too_large.js"),
            ev("evaluate:classic", "file_js_cache_too_large.js"),
            ev("diskcache:disabled", "file_js_cache_too_large.js"),
          ],
        },
        {
          file: "file_js_cache_too_large.js",
          events: [
            ev("load:source", "file_js_cache_too_large.js"),
            ev("evaluate:classic", "file_js_cache_too_large.js"),
            // This testcase can fail if file_js_cache_too_large.js file is
            // somehow modified by linter etc.
            ev("diskcache:disabled", "file_js_cache_too_large.js"),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

add_task(async function testHitLimitAfterEncode() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.expose_test_interfaces", true],
      ["dom.script_loader.bytecode_cache.enabled", true],
      ["dom.script_loader.bytecode_cache.strategy", 0],
      ["dom.script_loader.experimental.navigation_cache", false],
      // file_js_cache_too_large.js is 4517 bytes, and it generates
      // 14 times larger serialized XDR.
      // Set the limit above the expected size, but below the
      // serialized XDR size.
      ["browser.cache.disk.max_entry_size", Math.round((5 * 5000) / 1024)],
    ],
  });

  await runJSCacheTests([
    // If the file size
    {
      title: "hit limit before encode",
      items: [
        {
          file: "file_js_cache_too_large.js",
          events: [
            ev("load:source", "file_js_cache_too_large.js"),
            ev("evaluate:classic", "file_js_cache_too_large.js"),
            ev("diskcache:disabled", "file_js_cache_too_large.js"),
          ],
        },
        {
          file: "file_js_cache_too_large.js",
          events: [
            ev("load:source", "file_js_cache_too_large.js"),
            ev("evaluate:classic", "file_js_cache_too_large.js"),
            ev("diskcache:disabled", "file_js_cache_too_large.js"),
          ],
        },
        {
          file: "file_js_cache_too_large.js",
          events: [
            ev("load:source", "file_js_cache_too_large.js"),
            ev("evaluate:classic", "file_js_cache_too_large.js"),
            ev("diskcache:disabled", "file_js_cache_too_large.js"),
          ],
        },
        {
          file: "file_js_cache_too_large.js",
          events: [
            ev("load:source", "file_js_cache_too_large.js"),
            ev("evaluate:classic", "file_js_cache_too_large.js"),
            ev("diskcache:register", "file_js_cache_too_large.js"),
            // This testcase can fail if the bytecode for the array spread
            // is optimized and the size is dramatically reduced.
            ev("diskcache:toolarge", "file_js_cache_too_large.js", false),
          ],
        },
        {
          file: "file_js_cache_too_large.js",
          events: [
            ev("load:source", "file_js_cache_too_large.js"),
            ev("evaluate:classic", "file_js_cache_too_large.js"),
            ev("diskcache:register", "file_js_cache_too_large.js"),
            ev("diskcache:toolarge", "file_js_cache_too_large.js", false),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

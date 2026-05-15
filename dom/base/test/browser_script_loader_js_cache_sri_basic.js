// ev, unordered, and runJSCacheTests are defined in head.js

add_task(async function testDiskCache_SRI() {
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
      title: "SRI on classic",
      items: [
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:register", "file_js_cache_large.js"),
            ev("diskcache:saved", "file_js_cache_large.js", false),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
      ],
    },

    {
      title: "SRI on module",
      module: true,
      items: [
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:register", "file_js_cache_large.js"),
            ev("diskcache:saved", "file_js_cache_large.js", false),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:disabled", "file_js_cache_large.js"),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

add_task(async function testMemoryCache_SRI() {
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
      title: "SRI on classic",
      items: [
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:saved", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:saved", "file_js_cache_large.js", false),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:classic", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
      ],
    },

    {
      title: "SRI on module",
      module: true,
      items: [
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:source", "file_js_cache_large.js"),
            ev("memorycache:saved", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:saved", "file_js_cache_large.js", false),
          ],
        },
        {
          file: "file_js_cache_large.js",
          sri: "sha384-vJ7r8qsSxGVQwKbj+5A1avW8CEb6bODkGULlUVOmqN81D6XQzaTFhspcWmO+PVSQ",
          events: [
            ev("load:memorycache", "file_js_cache_large.js"),
            ev("evaluate:module", "file_js_cache_large.js"),
            ev("diskcache:noschedule"),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

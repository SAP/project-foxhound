// ev, unordered, and runJSCacheTests are defined in head.js

add_task(async function testDiskCache_SRIMismatchAfterSave() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.expose_test_interfaces", true],
      ["dom.script_loader.bytecode_cache.enabled", true],
      ["dom.script_loader.bytecode_cache.strategy", 0],
      ["dom.script_loader.experimental.navigation_cache", false],
    ],
  });

  // If different SRI is specified after the disk cache is created, it should
  // fallback to the source, and then save again with the SRI.
  await runJSCacheTests([
    {
      title: "wrong SRI with same algorithm on classic after save",
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
          sri: "sha384-fxijQE3W3lWbCjRZx0MCS6pJpCz+dGnNujsFYBzzag9G/fz/6ZiWdM/GAsMzGlAI",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            optional_ev("load:fallback", "file_js_cache_large.js"),
            optional_ev("load:source", "file_js_cache_large.js"),
            ev("sri:corrupt", "file_js_cache_large.js"),
          ],
        },
      ],
    },

    {
      title: "wrong SRI with different algorithm on classic after save",
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
          sri: "sha512-8fAu+4y0SKpriy0fz4IuLgiXLyTCGVInfJHvIl8JOdxm+xKJVHVhX7RTfEUpExZYoOJqzpVRkK/6nfglpK7Dow==",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            optional_ev("load:fallback", "file_js_cache_large.js"),
            optional_ev("load:source", "file_js_cache_large.js"),
            ev("sri:corrupt", "file_js_cache_large.js"),
          ],
        },
      ],
    },

    {
      title: "wrong SRI with same algorithm on module after save",
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
          sri: "sha384-fxijQE3W3lWbCjRZx0MCS6pJpCz+dGnNujsFYBzzag9G/fz/6ZiWdM/GAsMzGlAI",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            optional_ev("load:fallback", "file_js_cache_large.js"),
            optional_ev("load:source", "file_js_cache_large.js"),
            ev("sri:corrupt", "file_js_cache_large.js"),
          ],
        },
      ],
    },

    {
      title: "wrong SRI with different algorithm on module after save",
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
          sri: "sha512-8fAu+4y0SKpriy0fz4IuLgiXLyTCGVInfJHvIl8JOdxm+xKJVHVhX7RTfEUpExZYoOJqzpVRkK/6nfglpK7Dow==",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            ev("load:fallback", "file_js_cache_large.js"),
            ev("load:source", "file_js_cache_large.js"),
            ev("sri:corrupt", "file_js_cache_large.js"),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

add_task(async function testMemoryCache_SRIMismatchAfterSave() {
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

  // If different SRI is specified after the disk cache is created, it should
  // fallback to the source, and then save again with the SRI.
  await runJSCacheTests([
    {
      title: "wrong SRI with same algorithm on classic after save",
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
          sri: "sha384-fxijQE3W3lWbCjRZx0MCS6pJpCz+dGnNujsFYBzzag9G/fz/6ZiWdM/GAsMzGlAI",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            optional_ev("load:fallback", "file_js_cache_large.js"),
            optional_ev("load:source", "file_js_cache_large.js"),
            ev("sri:corrupt", "file_js_cache_large.js"),
          ],
        },
      ],
    },

    {
      title: "wrong SRI with different algorithm on classic after save",
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
          sri: "sha512-8fAu+4y0SKpriy0fz4IuLgiXLyTCGVInfJHvIl8JOdxm+xKJVHVhX7RTfEUpExZYoOJqzpVRkK/6nfglpK7Dow==",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            optional_ev("load:fallback", "file_js_cache_large.js"),
            optional_ev("load:source", "file_js_cache_large.js"),
            ev("sri:corrupt", "file_js_cache_large.js"),
          ],
        },
      ],
    },

    {
      title: "wrong SRI with same algorithm on module after save",
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
          sri: "sha384-fxijQE3W3lWbCjRZx0MCS6pJpCz+dGnNujsFYBzzag9G/fz/6ZiWdM/GAsMzGlAI",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            optional_ev("load:fallback", "file_js_cache_large.js"),
            optional_ev("load:source", "file_js_cache_large.js"),
            ev("sri:corrupt", "file_js_cache_large.js"),
          ],
        },
      ],
    },

    {
      title: "wrong SRI with different algorithm on module after save",
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
          sri: "sha512-8fAu+4y0SKpriy0fz4IuLgiXLyTCGVInfJHvIl8JOdxm+xKJVHVhX7RTfEUpExZYoOJqzpVRkK/6nfglpK7Dow==",
          events: [
            ev("load:diskcache", "file_js_cache_large.js"),
            ev("load:fallback", "file_js_cache_large.js"),
            ev("load:source", "file_js_cache_large.js"),
            ev("sri:corrupt", "file_js_cache_large.js"),
          ],
        },
      ],
    },
  ]);

  await SpecialPowers.popPrefEnv();
});

// |jit-test| skip-if: wasmCustomPageSizesEnabled()

// Note the flag above: this only runs if custom page sizes are DISABLED.
wasmValidateText(`(module (memory 0 1))`);
wasmFailValidateText(`(module (memory 0 1 (pagesize 65536)))`, /custom page sizes are disabled|unexpected bits set in flags/);
wasmFailValidateText(`(module (memory 0 1 (pagesize 1)))`, /custom page sizes are disabled|unexpected bits set in flags/);

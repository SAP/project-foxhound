// |jit-test| module; --gc-zeal=7,1; skip-if: getBuildConfiguration("release_or_beta"); --enable-import-bytes

const module = await import("./bytes-module-rooting-hazard.js", {with: {type: "bytes"}});
assertEq(module.default.byteLength > 0, true);

// |jit-test| skip-if: !wasmSimdEnabled()
let buf = new ArrayBuffer(16);
let g = wasmGlobalFromArrayBuffer("v128", buf);
oomTest(() => wasmGlobalExtractLane(g, "i32x4", 0));

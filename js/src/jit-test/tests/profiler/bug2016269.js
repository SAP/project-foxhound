// |jit-test| skip-if: !wasmIsSupported()
load(libdir + "asserts.js");
enableGeckoProfilingWithSlowAssertions();

// Test that invalid wasm opcodes with b1 > UINT16_MAX don't crash when profiling.
// The module has a valid header but contains an invalid prefix opcode (0xfc) followed
// by an LEB128-encoded value that exceeds UINT16_MAX, which triggers the bug.
function loadModule() {
  new WebAssembly.Module(new Uint8Array([
    // WASM magic
    0x00, 0x61, 0x73, 0x6d,
    // version 1
    0x01, 0x00, 0x00, 0x00,
    // type section: 1 type
    0x01, 0x04, 0x01,
    // function type: () -> ()
    0x60, 0x00, 0x00,
    // function section: 1 function of type 0
    0x03, 0x02, 0x01, 0x00,
    // code section: 1 function body
    0x0a, 0x09, 0x01,
    // function body: size 7, 0 locals
    0x07, 0x00,
    // misc prefix opcode
    0xfc,
    // LEB128: 4294967295 (> UINT16_MAX, triggers bug)
    0xff, 0xff, 0xff, 0xff, 0x0f
  ]));
}

assertThrowsInstanceOf(loadModule, WebAssembly.CompileError);

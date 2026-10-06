// |jit-test| skip-if: !wasmStreamingEnabled()

// Code-section header declares size=0x0a (10) but only 3 content bytes follow
// before the stream ends. Before the fix, the helper thread was stuck in
// StreamingDecoder::waitForBytes() and the process would hang at shutdown.
var bad = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,  // preamble
  0x01, 0x04, 0x01, 0x60, 0x00, 0x00,              // type section: () -> ()
  0x03, 0x02, 0x01, 0x00,                          // function section
  0x0a, 0x0a,                                      // code section, declared size = 10
  0x01, 0x08, 0x00                                 // count=1, body0 size=8, locals=0 ... EOF
]);

var caught = false;
WebAssembly.compileStreaming(bad).then(
  m => { throw "should have rejected"; },
  e => { assertErrorMessage(() => { throw e; }, WebAssembly.CompileError, /wasm validation error.*expected function body count/); caught = true; });
drainJobQueue();
assertEq(caught, true);

// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled() || !wasmLazyTieringEnabled() || !getPrefValue("wasm_lazy_tiering_synchronous"); --setpref=wasm_lazy_tiering_level=9; --setpref=wasm_inlining_level=9

// Bug 2043040 - Crash [@ FunctionCompiler::emitInlineCall] with JSPI synchronous
// tier-up on continuation stack. GenerateRequestTierUpStub must switch to the main
// stack before calling into C++, so Ion compilation doesn't run on the small
// continuation stack.

// Build a chain of 64 small inlinable functions.
var funcs = "";
for (var i = 0; i < 64; i++) {
    if (i === 0) {
        funcs += `(func $f0 (result i32) (i32.const 1))\n`;
    } else {
        funcs += `(func $f${i} (result i32) (i32.add (call $f${i-1}) (i32.const 1)))\n`;
    }
}

var ins = wasmEvalText(`(module
  ${funcs}
  (func (export "run") (result i32)
    call $f63
  )
)`);

var run = WebAssembly.promising(ins.exports.run);
run().then(r => assertEq(r, 64));
drainJobQueue();

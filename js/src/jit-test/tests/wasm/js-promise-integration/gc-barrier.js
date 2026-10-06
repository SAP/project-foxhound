// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test GC barriers on externref locals held in Wasm frames across a JSPI call chain.

gczeal(4);

function f0(a1, a2, a3) {
    return f0;
}

const instance1 = wasmEvalText(`(module
  (import "imports" "f0" (func $f0 (param i32 i32 f64) (result externref)))
  (func (export "w0") (local $r externref)
    i32.const 1
    i32.const 1
    f64.const 1000
    call $f0
    local.set $r
  )
)`, { imports: { f0 } });

const promising = WebAssembly.promising(instance1.exports.w0);

const instance2 = wasmEvalText(`(module
  (import "imports" "promising" (func $promising (param i32) (result externref)))
  (func (export "w0") (local $r externref)
    i32.const 0
    call $promising
    local.set $r
  )
)`, { imports: { promising } });

instance2.exports.w0();

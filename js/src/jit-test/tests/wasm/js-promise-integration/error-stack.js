// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

const { assertStackTrace } = WasmHelpers;

let e;
let suspending = new WebAssembly.Suspending(() => {
    e = new Error();
    Promise.resolve()
});
let {run} = wasmEvalText(`(module
    (func $suspending (import "" "suspending"))
    (func $a
        call $suspending
    )
    (func $b
        call $a
    )
    (func $c
        call $b
    )
    (func $run (export "run")
        call $c
    )
)`, {"": {suspending}}).exports;
WebAssembly.promising(run)();

assertStackTrace(e, ["suspending<","a","b","c","run",""]);

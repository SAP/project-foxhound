// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

async function run() {
    let jsSuspendingImport = () => minorgc();
    let wrappedSuspendingImport = new WebAssembly.Suspending(jsSuspendingImport);

    let imports = {
        env: {
            suspending_import: wrappedSuspendingImport
        }
    };
    var instance = wasmEvalText(`
        (module
            (type $ref_array (array (mut externref)))
            (import "env" "suspending_import" (func $suspending_import (result externref)))

            (func $trigger (export "trigger") (param $dummy externref) (result externref)
            (local $arr (ref $ref_array))

            (local.set $arr (array.new $ref_array (local.get $dummy) (i32.const 10)))

            (call $suspending_import)
            (drop)

            (array.get $ref_array (local.get $arr) (i32.const 0))
            )
        )
        `, imports);

    const trigger = WebAssembly.promising(instance.exports.trigger);
    await trigger({dummy: "dummy"});
}

run();

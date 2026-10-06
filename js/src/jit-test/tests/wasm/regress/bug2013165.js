let { callRef } = wasmEvalText(`(module
    (type $t (func))
    (func (export "callRef") (param externref (ref $t))
      (call_ref $t local.get 1)
    )
)`).exports;
let wrappedCallRef = Function.prototype.call.bind(callRef);

// ref.func and call_ref of Function.prototype.call.bind wrapping a wasm
// function should work, even if the wrapped function has a different type.
{
    let {test} = wasmEvalText(`(module
        (type $t (func (param externref i64)))
        (func (import "" "callRef") (param externref i64))
        (func (export "test")
            ref.null extern
            i64.const 0xDEADBEEF
            ref.func 0
            call_ref $t
        )
        (elem declare func 0)
    )`, {"": {"callRef": wrappedCallRef}}).exports;
    assertErrorMessage(test, TypeError, /bad type/);
}

// table.get and call_ref of Function.prototype.call.bind wrapping a wasm
// function should work, even if the wrapped function has a different type.
{
    let {test} = wasmEvalText(`(module
        (type $t (func (param externref i64)))
        (func (import "" "callRef") (param externref i64))
        (table (ref null $t) (elem 0))
        (func (export "test")
            ref.null extern
            i64.const 0xDEADBEEF
            (table.get 0 i32.const 0)
            call_ref $t
        )
    )`, {"": {"callRef": wrappedCallRef}}).exports;
    assertErrorMessage(test, TypeError, /bad type/);
}

// See "Wasm Function.prototype.call.bind optimization" in WasmInstance.cpp
// for more information.

function wrapFunc(params, func) {
    let funcCallBind = Function.prototype.call.bind(func);

    return wasmEvalText(`(module
        (func (import "" "f") (param ${params.join(" ")}))
        (func (export "f") (param ${params.join(" ")})
            ${params.map((x, i) => `local.get ${i}`).join("\n")}
            call 0
        )
    )`, {"": {"f": funcCallBind}}).exports.f;
}

// Test passing all kinds of externref values to func through the 'this'
// parameter.
{
    let func = function (expected) {
        "use strict";
        assertEq(this, expected);
    };
    let test = wrapFunc(["externref", "externref"], func);
    for (let val of WasmExternrefValues) {
        test(val, val);
    }
}

// Same as above but with two non-this params.
{
    let func = function (a, b) {
        "use strict";
        assertEq(this, a);
        assertEq(a, b);
    };
    let test = wrapFunc(["externref", "externref", "externref"], func);
    for (let val of WasmExternrefValues) {
        test(val, val, val);
    }
}

// Test passing primitives as the 'this' value.
{
    let func = function (expected) {
        "use strict";
        assertEq(this, expected);
    };
    let vals = [0, 1, 2, 3, 4, 5];
    for (let valType of ["i32", "i64", "f32", "f64"]) {
        let test = wrapFunc([valType, valType], func);
        for (let val of vals) {
            if (valType === "i64") {
                val = BigInt(val);
            }
            test(val, val);
        }
    }
}

// Function.prototype.call on a non-strict function will coerce null/undefined
// to the global object.
{
    let func = function (expected) {
        assertEq(this, expected);
    };
    let test = wrapFunc(["externref", "externref"], func);
    test(null, globalThis);
    test(undefined, globalThis);
}

// Test binding extra JS arguments still works (this should skip the
// optimization)
{
    function func(x) {
        "use strict";
        assertEq(this, 1);
        assertEq(x, 2);
    }

    // Bind '2' to be the first normal arg to 'call', which will then become
    // the 'this' parameter always.
    let funcCallBind = Function.prototype.call.bind(func, 1);

    let {test} = wasmEvalText(`(module
        (func (import "" "f") (param i32))
        (export "test" (func 0))
    )`, {"": {"f": funcCallBind}}).exports;

    test(2);
}

// Test a missing this parameter.
{
    let test = wrapFunc([], function () {
        "use strict";
        assertEq(this, undefined);
    });
    test();
}

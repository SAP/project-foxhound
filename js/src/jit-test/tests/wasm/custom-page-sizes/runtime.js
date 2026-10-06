// |jit-test| skip-if: !wasmCustomPageSizesEnabled()

for (const addrtype of ["i32", "i64"]) {
  console.log(`Address type: ${addrtype}`);

  function addr(n) {
    return addrtype === "i64" ? BigInt(n) : n;
  }

  // Dynamic i8 accesses
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 10 10 (pagesize 1))
      (func (export "f_off0") (param ${addrtype}) (result i32)
        (i32.store8 (local.get 0) (i32.const 42))
        (i32.load8_u (local.get 0))
      )
      (func (export "f_off2") (param ${addrtype}) (result i32)
        (i32.store8 offset=2 (local.get 0) (i32.const 42))
        (i32.load8_u offset=2 (local.get 0))
      )
    )`);

    assertEq(instance.exports.f_off0(addr(0)), 42);
    assertEq(instance.exports.f_off2(addr(0)), 42);
    assertEq(instance.exports.f_off0(addr(1)), 42);
    assertEq(instance.exports.f_off2(addr(1)), 42);
    assertEq(instance.exports.f_off0(addr(7)), 42);
    assertEq(instance.exports.f_off2(addr(7)), 42);
    assertEq(instance.exports.f_off0(addr(8)), 42);
    assertErrorMessage(() => instance.exports.f_off2(addr(8)), WebAssembly.RuntimeError, "index out of bounds");
    assertEq(instance.exports.f_off0(addr(9)), 42);
    assertErrorMessage(() => instance.exports.f_off2(addr(9)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-3)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-3)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-3n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-3n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Constant i8 accesses
  {
    function f(n, name = null) {
      return `
        (func (export "f${name ?? n}_stk") (result i32)
          (i32.store8 (${addrtype}.const ${n}) (i32.const 42))
          (i32.load8_u (${addrtype}.const ${n}))
        )
        (func (export "f${name ?? n}_off") (result i32)
          (i32.store8 offset=${n} (${addrtype}.const 0) (i32.const 42))
          (i32.load8_u offset=${n} (${addrtype}.const 0))
        )
      `;
    }

    let instance = wasmEvalText(`(module
      (memory ${addrtype} 10 10 (pagesize 1))
      ${f(0)}
      ${f(1)}
      ${f(9)}
      ${f(10)}
      ${f(2**32-1, "32m1")}
      ${addrtype !== "i64" ? "" : `
        ${f(2n**64n-1n, "64m1")}
      `}
    )`);

    assertEq(instance.exports.f0_stk(), 42);
    assertEq(instance.exports.f0_off(), 42);
    assertEq(instance.exports.f1_stk(), 42);
    assertEq(instance.exports.f1_off(), 42);
    assertEq(instance.exports.f9_stk(), 42);
    assertEq(instance.exports.f9_off(), 42);
    assertErrorMessage(() => instance.exports.f10_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f10_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f64m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Dynamic i16 accesses
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 10 10 (pagesize 1))
      (func (export "f_off0") (param ${addrtype}) (result i32)
        (i32.store16 (local.get 0) (i32.const 42))
        (i32.load16_u (local.get 0))
      )
      (func (export "f_off2") (param ${addrtype}) (result i32)
        (i32.store16 offset=2 (local.get 0) (i32.const 42))
        (i32.load16_u offset=2 (local.get 0))
      )
    )`);

    assertEq(instance.exports.f_off0(addr(0)), 42);
    assertEq(instance.exports.f_off2(addr(0)), 42);
    assertEq(instance.exports.f_off0(addr(1)), 42);
    assertEq(instance.exports.f_off2(addr(1)), 42);
    assertEq(instance.exports.f_off0(addr(7)), 42);
    assertErrorMessage(() => instance.exports.f_off2(addr(7)), WebAssembly.RuntimeError, "index out of bounds");
    assertEq(instance.exports.f_off0(addr(8)), 42);
    assertErrorMessage(() => instance.exports.f_off2(addr(8)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(9)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(9)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-4)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-4)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-2)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-2)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-4n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-4n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-2n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-2n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Constant i16 accesses
  {
    function f(n, name = null) {
      return `
        (func (export "f${name ?? n}_stk") (result i32)
          (i32.store16 (${addrtype}.const ${n}) (i32.const 42))
          (i32.load16_u (${addrtype}.const ${n}))
        )
        (func (export "f${name ?? n}_off") (result i32)
          (i32.store16 offset=${n} (${addrtype}.const 0) (i32.const 42))
          (i32.load16_u offset=${n} (${addrtype}.const 0))
        )
      `;
    }

    let instance = wasmEvalText(`(module
      (memory ${addrtype} 10 10 (pagesize 1))
      ${f(0)}
      ${f(1)}
      ${f(8)}
      ${f(9)}
      ${f(10)}
      ${f(2**32-4, "32m4")}
      ${f(2**32-2, "32m2")}
      ${f(2**32-1, "32m1")}
      ${addrtype !== "i64" ? "" : `
        ${f(2n**64n-4n, "64m4")}
        ${f(2n**64n-2n, "64m2")}
        ${f(2n**64n-1n, "64m1")}
      `}
    )`);

    assertEq(instance.exports.f0_stk(), 42);
    assertEq(instance.exports.f0_off(), 42);
    assertEq(instance.exports.f1_stk(), 42);
    assertEq(instance.exports.f1_off(), 42);
    assertEq(instance.exports.f8_stk(), 42);
    assertEq(instance.exports.f8_off(), 42);
    assertErrorMessage(() => instance.exports.f9_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f9_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f10_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f10_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m4_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m4_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m2_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m2_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f64m4_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m4_off(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m2_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m2_off(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Dynamic i32 accesses
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 10 10 (pagesize 1))
      (func (export "f_off0") (param ${addrtype}) (result i32)
        (i32.store (local.get 0) (i32.const 42))
        (i32.load (local.get 0))
      )
      (func (export "f_off2") (param ${addrtype}) (result i32)
        (i32.store offset=2 (local.get 0) (i32.const 42))
        (i32.load offset=2 (local.get 0))
      )
    )`);

    assertEq(instance.exports.f_off0(addr(0)), 42);
    assertEq(instance.exports.f_off2(addr(0)), 42);
    assertEq(instance.exports.f_off0(addr(1)), 42);
    assertEq(instance.exports.f_off2(addr(1)), 42);
    assertEq(instance.exports.f_off0(addr(4)), 42);
    assertEq(instance.exports.f_off2(addr(4)), 42);
    assertEq(instance.exports.f_off0(addr(5)), 42);
    assertErrorMessage(() => instance.exports.f_off2(addr(5)), WebAssembly.RuntimeError, "index out of bounds");
    assertEq(instance.exports.f_off0(addr(6)), 42);
    assertErrorMessage(() => instance.exports.f_off2(addr(6)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(7)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(7)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(8)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(8)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(9)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(9)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-6)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-6)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-4)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-4)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-6n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-6n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-4n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-4n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Constant i32 accesses
  {
    function f(n, name = null) {
      return `
        (func (export "f${name ?? n}_stk") (result i32)
          (i32.store (${addrtype}.const ${n}) (i32.const 42))
          (i32.load (${addrtype}.const ${n}))
        )
        (func (export "f${name ?? n}_off") (result i32)
          (i32.store offset=${n} (${addrtype}.const 0) (i32.const 42))
          (i32.load offset=${n} (${addrtype}.const 0))
        )
      `;
    }

    let instance = wasmEvalText(`(module
      (memory ${addrtype} 10 10 (pagesize 1))
      ${f(0)}
      ${f(1)}
      ${f(6)}
      ${f(7)}
      ${f(8)}
      ${f(9)}
      ${f(10)}
      ${f(2**32-4, "32m4")}
      ${f(2**32-1, "32m1")}
      ${addrtype !== "i64" ? "" : `
        ${f(2n**64n-4n, "64m4")}
        ${f(2n**64n-1n, "64m1")}
      `}
    )`);

    assertEq(instance.exports.f0_stk(), 42);
    assertEq(instance.exports.f0_off(), 42);
    assertEq(instance.exports.f1_stk(), 42);
    assertEq(instance.exports.f1_off(), 42);
    assertEq(instance.exports.f6_stk(), 42);
    assertEq(instance.exports.f6_off(), 42);
    assertErrorMessage(() => instance.exports.f7_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f7_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f8_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f8_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f9_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f9_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f10_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f10_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m4_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m4_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f64m4_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m4_off(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Dynamic i64 accesses
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 10 10 (pagesize 1))
      (func (export "f_off0") (param ${addrtype}) (result i64)
        (i64.store (local.get 0) (i64.const 42))
        (i64.load (local.get 0))
      )
      (func (export "f_off2") (param ${addrtype}) (result i64)
        (i64.store offset=2 (local.get 0) (i64.const 42))
        (i64.load offset=2 (local.get 0))
      )
    )`);

    assertEq(instance.exports.f_off0(addr(0)), 42n);
    assertEq(instance.exports.f_off2(addr(0)), 42n);
    assertEq(instance.exports.f_off0(addr(1)), 42n);
    assertErrorMessage(() => instance.exports.f_off2(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertEq(instance.exports.f_off0(addr(2)), 42n);
    assertErrorMessage(() => instance.exports.f_off2(addr(2)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(3)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(3)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(6)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(6)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(7)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(7)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(8)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(8)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(9)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(9)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-10)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-8)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-8)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-10n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-10n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-8n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-8n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Constant i64 accesses
  {
    function f(n, name = null) {
      return `
        (func (export "f${name ?? n}_stk") (result i64)
          (i64.store (${addrtype}.const ${n}) (i64.const 42))
          (i64.load (${addrtype}.const ${n}))
        )
        (func (export "f${name ?? n}_off") (result i64)
          (i64.store offset=${n} (${addrtype}.const 0) (i64.const 42))
          (i64.load offset=${n} (${addrtype}.const 0))
        )
      `;
    }

    let instance = wasmEvalText(`(module
      (memory ${addrtype} 10 10 (pagesize 1))
      ${f(0)}
      ${f(1)}
      ${f(2)}
      ${f(3)}
      ${f(6)}
      ${f(7)}
      ${f(8)}
      ${f(9)}
      ${f(10)}
      ${f(2**32-10, "32m10")}
      ${f(2**32-8, "32m8")}
      ${f(2**32-1, "32m1")}
      ${addrtype !== "i64" ? "" : `
        ${f(2n**64n-10n, "64m10")}
        ${f(2n**64n-8n, "64m8")}
        ${f(2n**64n-1n, "64m1")}
      `}
    )`);

    assertEq(instance.exports.f0_stk(), 42n);
    assertEq(instance.exports.f0_off(), 42n);
    assertEq(instance.exports.f1_stk(), 42n);
    assertEq(instance.exports.f1_off(), 42n);
    assertEq(instance.exports.f2_stk(), 42n);
    assertEq(instance.exports.f2_off(), 42n);
    assertErrorMessage(() => instance.exports.f3_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f3_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f6_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f6_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f7_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f7_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f8_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f8_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f9_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f9_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f10_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f10_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m10_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m10_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m8_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m8_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f64m10_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m10_off(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m8_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m8_off(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Dynamic v128 accesses
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 20 20 (pagesize 1))

      (func $init
        (memory.fill (${addrtype}.const 0) (i32.const 0x2B) (${addrtype}.const 20))
      )
      (func (export "f_off0") (param ${addrtype}) (result i32)
        (i32x4.extract_lane 0 (v128.load (local.get 0)))
      )
      (func (export "f_off2") (param ${addrtype}) (result i32)
        (i32x4.extract_lane 0 (v128.load offset=2 (local.get 0)))
      )

      (start $init)
    )`);

    assertEq(instance.exports.f_off0(addr(0)), 0x2B2B2B2B);
    assertEq(instance.exports.f_off2(addr(0)), 0x2B2B2B2B);
    assertEq(instance.exports.f_off0(addr(1)), 0x2B2B2B2B);
    assertEq(instance.exports.f_off2(addr(1)), 0x2B2B2B2B);
    assertEq(instance.exports.f_off0(addr(2)), 0x2B2B2B2B);
    assertEq(instance.exports.f_off2(addr(2)), 0x2B2B2B2B);
    assertEq(instance.exports.f_off0(addr(3)), 0x2B2B2B2B);
    assertErrorMessage(() => instance.exports.f_off2(addr(3)), WebAssembly.RuntimeError, "index out of bounds");
    assertEq(instance.exports.f_off0(addr(4)), 0x2B2B2B2B);
    assertErrorMessage(() => instance.exports.f_off2(addr(4)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(5)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(5)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(17)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(17)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(18)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(18)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(19)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(19)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(20)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(20)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-18)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-18)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-16)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-16)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off0(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f_off2(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-18n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-18n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-16n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-16n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off0(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f_off2(2n**64n-1n), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Constant v128 accesses
  {
    function f(n, name = null) {
      return `
        (func (export "f${name ?? n}_stk") (result i32)
          (i32x4.extract_lane 0 (v128.load (${addrtype}.const ${n})))
        )
        (func (export "f${name ?? n}_off") (result i32)
          (i32x4.extract_lane 0 (v128.load offset=${n} (${addrtype}.const 0)))
        )
      `;
    }

    let instance = wasmEvalText(`(module
      (memory ${addrtype} 20 20 (pagesize 1))

      (func $init
        (memory.fill (${addrtype}.const 0) (i32.const 0x2B) (${addrtype}.const 20))
      )
      (start $init)

      ${f(0)}
      ${f(1)}
      ${f(4)}
      ${f(5)}
      ${f(17)}
      ${f(18)}
      ${f(19)}
      ${f(20)}
      ${f(2**32-18, "32m18")}
      ${f(2**32-16, "32m16")}
      ${f(2**32-1, "32m1")}
      ${addrtype !== "i64" ? "" : `
        ${f(2n**64n-18n, "64m18")}
        ${f(2n**64n-16n, "64m16")}
        ${f(2n**64n-1n, "64m1")}
      `}
    )`);

    assertEq(instance.exports.f0_stk(), 0x2B2B2B2B);
    assertEq(instance.exports.f0_off(), 0x2B2B2B2B);
    assertEq(instance.exports.f1_stk(), 0x2B2B2B2B);
    assertEq(instance.exports.f1_off(), 0x2B2B2B2B);
    assertEq(instance.exports.f4_stk(), 0x2B2B2B2B);
    assertEq(instance.exports.f4_off(), 0x2B2B2B2B);
    assertErrorMessage(() => instance.exports.f5_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f5_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f17_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f17_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f18_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f18_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f19_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f19_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f20_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f20_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m18_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m18_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m16_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m16_off(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    if (addrtype === "i64") {
      assertErrorMessage(() => instance.exports.f64m18_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m18_off(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m16_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m16_off(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m1_stk(), WebAssembly.RuntimeError, "index out of bounds");
      assertErrorMessage(() => instance.exports.f64m1_off(), WebAssembly.RuntimeError, "index out of bounds");
    }
  }

  // Tiny memories: 0
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 0 0 (pagesize 1))
      (func (export "f8") (param ${addrtype})
        (i32.store8 (local.get 0) (i32.const 42))
      )
      (func (export "f16") (param ${addrtype})
        (i32.store16 (local.get 0) (i32.const 42))
      )
      (func (export "f32") (param ${addrtype})
        (i32.store (local.get 0) (i32.const 42))
      )
      (func (export "f64") (param ${addrtype})
        (i64.store (local.get 0) (i64.const 42))
      )
      (func (export "f128") (param ${addrtype})
        (v128.store (local.get 0) (v128.const i32x4 42 42 42 42))
      )
    )`);

    assertErrorMessage(() => instance.exports.f8(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f8(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f8(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f16(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f16(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f16(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
  }

  // Tiny memories: 1
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 1 1 (pagesize 1))
      (func (export "f8") (param ${addrtype})
        (i32.store8 (local.get 0) (i32.const 42))
      )
      (func (export "f16") (param ${addrtype})
        (i32.store16 (local.get 0) (i32.const 42))
      )
      (func (export "f32") (param ${addrtype})
        (i32.store (local.get 0) (i32.const 42))
      )
      (func (export "f64") (param ${addrtype})
        (i64.store (local.get 0) (i64.const 42))
      )
      (func (export "f128") (param ${addrtype})
        (v128.store (local.get 0) (v128.const i32x4 42 42 42 42))
      )
    )`);

    instance.exports.f8(addr(0));
    assertErrorMessage(() => instance.exports.f8(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f8(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f16(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f16(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f16(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
  }

  // Tiny memories: 2
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 2 2 (pagesize 1))
      (func (export "f8") (param ${addrtype})
        (i32.store8 (local.get 0) (i32.const 42))
      )
      (func (export "f16") (param ${addrtype})
        (i32.store16 (local.get 0) (i32.const 42))
      )
      (func (export "f32") (param ${addrtype})
        (i32.store (local.get 0) (i32.const 42))
      )
      (func (export "f64") (param ${addrtype})
        (i64.store (local.get 0) (i64.const 42))
      )
      (func (export "f128") (param ${addrtype})
        (v128.store (local.get 0) (v128.const i32x4 42 42 42 42))
      )
    )`);

    instance.exports.f8(addr(0));
    instance.exports.f8(addr(1));
    assertErrorMessage(() => instance.exports.f8(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f16(addr(0));
    assertErrorMessage(() => instance.exports.f16(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f16(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
  }

  // Tiny memories: 4
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 4 4 (pagesize 1))
      (func (export "f8") (param ${addrtype})
        (i32.store8 (local.get 0) (i32.const 42))
      )
      (func (export "f16") (param ${addrtype})
        (i32.store16 (local.get 0) (i32.const 42))
      )
      (func (export "f32") (param ${addrtype})
        (i32.store (local.get 0) (i32.const 42))
      )
      (func (export "f64") (param ${addrtype})
        (i64.store (local.get 0) (i64.const 42))
      )
      (func (export "f128") (param ${addrtype})
        (v128.store (local.get 0) (v128.const i32x4 42 42 42 42))
      )
    )`);

    instance.exports.f8(addr(0));
    instance.exports.f8(addr(1));
    assertErrorMessage(() => instance.exports.f8(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f16(addr(0));
    instance.exports.f16(addr(1));
    assertErrorMessage(() => instance.exports.f16(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f32(addr(0));
    assertErrorMessage(() => instance.exports.f32(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f32(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
  }

  // Tiny memories: 8
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 8 8 (pagesize 1))
      (func (export "f8") (param ${addrtype})
        (i32.store8 (local.get 0) (i32.const 42))
      )
      (func (export "f16") (param ${addrtype})
        (i32.store16 (local.get 0) (i32.const 42))
      )
      (func (export "f32") (param ${addrtype})
        (i32.store (local.get 0) (i32.const 42))
      )
      (func (export "f64") (param ${addrtype})
        (i64.store (local.get 0) (i64.const 42))
      )
      (func (export "f128") (param ${addrtype})
        (v128.store (local.get 0) (v128.const i32x4 42 42 42 42))
      )
    )`);

    instance.exports.f8(addr(0));
    instance.exports.f8(addr(1));
    assertErrorMessage(() => instance.exports.f8(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f16(addr(0));
    instance.exports.f16(addr(1));
    assertErrorMessage(() => instance.exports.f16(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f32(addr(0));
    instance.exports.f32(addr(1));
    assertErrorMessage(() => instance.exports.f32(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f64(addr(0));
    assertErrorMessage(() => instance.exports.f64(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f64(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(0)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
  }

  // Tiny memories: 16
  {
    let instance = wasmEvalText(`(module
      (memory ${addrtype} 16 16 (pagesize 1))
      (func (export "f8") (param ${addrtype})
        (i32.store8 (local.get 0) (i32.const 42))
      )
      (func (export "f16") (param ${addrtype})
        (i32.store16 (local.get 0) (i32.const 42))
      )
      (func (export "f32") (param ${addrtype})
        (i32.store (local.get 0) (i32.const 42))
      )
      (func (export "f64") (param ${addrtype})
        (i64.store (local.get 0) (i64.const 42))
      )
      (func (export "f128") (param ${addrtype})
        (v128.store (local.get 0) (v128.const i32x4 42 42 42 42))
      )
    )`);

    instance.exports.f8(addr(0));
    instance.exports.f8(addr(1));
    assertErrorMessage(() => instance.exports.f8(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f16(addr(0));
    instance.exports.f16(addr(1));
    assertErrorMessage(() => instance.exports.f16(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f32(addr(0));
    instance.exports.f32(addr(1));
    assertErrorMessage(() => instance.exports.f32(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f64(addr(0));
    instance.exports.f64(addr(1));
    assertErrorMessage(() => instance.exports.f64(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
    instance.exports.f128(addr(0));
    assertErrorMessage(() => instance.exports.f128(addr(1)), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f128(addr(2**32-1)), WebAssembly.RuntimeError, "index out of bounds");
  }
}

// Test ARM-related cases
{
  let instance = wasmEvalText(`(module
      (memory i32 69648 69648 (pagesize 1))
      (func (export "f") (param i32)
        (i32.store8 (local.get 0) (i32.const 42))
      )
    )
  `);

  instance.exports.f(0)
  instance.exports.f(69647)
  assertErrorMessage(() => instance.exports.f(69648), WebAssembly.RuntimeError, "index out of bounds");
  assertErrorMessage(() => instance.exports.f(69649), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i64 69648 69648 (pagesize 1))
      (func (export "f") (param i64)
        (i32.store8 (local.get 0) (i32.const 42))
      )
    )
  `);

  instance.exports.f(0n)
  instance.exports.f(69647n)
  assertErrorMessage(() => instance.exports.f(69648n), WebAssembly.RuntimeError, "index out of bounds");
  assertErrorMessage(() => instance.exports.f(69649n), WebAssembly.RuntimeError, "index out of bounds");
}

// Test bounds checking under 4GB.
{
  let instance = wasmEvalText(`(module
      (memory i64 5000 10000 (pagesize 1))
      (func (export "f")
        (i32.store (i64.const 11000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i64 5000 (pagesize 1))
      (func (export "f")
        (i32.store (i64.const 11000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i64 5000 128000 (pagesize 1))
      (func (export "f")
        (i32.store (i64.const 64000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i64 5000 10000 (pagesize 1))
      (func (export "f")
        (i32.store (i64.const 6000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i32 5000 10000 (pagesize 1))
      (func (export "f")
        (i32.store (i32.const 11000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i32 5000 128000 (pagesize 1))
      (func (export "f")
        (i32.store (i32.const 64000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i32 5000 10000 (pagesize 1))
      (func (export "f")
        (i32.store (i32.const 6000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

if (getBuildConfiguration("x86")) {
  assertErrorMessage(
    () => wasmEvalText(`(module
        (memory i32 4294967295 4294967295 (pagesize 1))
        (func (export "f") (param i32)
          (i32.store8 (local.get 0) (i32.const 42))
        )
      )
    `),
    WebAssembly.RuntimeError,
    "too many memory pages"
  );
} else {
  {
    let instance = wasmEvalText(`(module
        (memory i32 4294967295 4294967295 (pagesize 1))
        (func (export "f") (param i32)
          (i32.store8 (local.get 0) (i32.const 42))
        )
      )
    `);

    instance.exports.f(1);
    instance.exports.f(3000);
    instance.exports.f(4294967292);
    instance.exports.f(4294967293);
    instance.exports.f(4294967294);
    assertErrorMessage(() => instance.exports.f(4294967295), WebAssembly.RuntimeError, "index out of bounds");
  }

  {
    let instance = wasmEvalText(`(module
        (memory i32 4294967295 4294967295 (pagesize 1))
        (func (export "f") (param i32)
          (i32.store16 (local.get 0) (i32.const 42))
        )
      )
    `);

    instance.exports.f(1);
    instance.exports.f(3000);
    instance.exports.f(4294967292);
    instance.exports.f(4294967293);
    assertErrorMessage(() => instance.exports.f(4294967294), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f(4294967295), WebAssembly.RuntimeError, "index out of bounds");
  }

  {
    let instance = wasmEvalText(`(module
        (memory i32 4294967295 (pagesize 1))
        (func (export "f") (param i32)
          (i32.store16 (local.get 0) (i32.const 42))
        )
      )
    `);

    instance.exports.f(1);
    instance.exports.f(3000);
    instance.exports.f(4294967292);
    instance.exports.f(4294967293);
    assertErrorMessage(() => instance.exports.f(4294967294), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f(4294967295), WebAssembly.RuntimeError, "index out of bounds");
  }
}

// Ensure bounds checking above 4GB works as expected.
if (getBuildConfiguration("x86")) {
  assertErrorMessage(
    () => wasmEvalText(`(module
        (memory i64 4294967299 4294967299 (pagesize 1))
        (func (export "f")
          (i32.store (i64.const 4294967300) (i32.const 42))
        )
      )
    `),
    WebAssembly.RuntimeError,
    "too many memory pages"
  );
} else {
  let instance = wasmEvalText(`(module
      (memory i64 4294967299 4294967299 (pagesize 1))
      (func (export "f")
        (i32.store (i64.const 4294967300) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

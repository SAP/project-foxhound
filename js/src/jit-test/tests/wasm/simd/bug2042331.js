// |jit-test| skip-if: !wasmSimdEnabled()

// Bug 2042331: v128.any_true on arm64 incorrectly used ADDP to reduce the two
// 64-bit halves; additive inverses (e.g. 0x80…00 + 0x80…00 ≡ 0 mod 2^64)
// could yield a false zero result. Fixed by using UMAXV instead.

let bin = wasmTextToBinary(`
  (module
    (memory (export "mem") 1 1)
    (func (export "anytrue") (result i32)
      (v128.any_true (v128.load (i32.const 0))))
    (func (export "anytrue_if") (result i32)
      (if (result i32) (v128.any_true (v128.load (i32.const 0)))
        (then (i32.const 111)) (else (i32.const 222)))))`);
let ins = new WebAssembly.Instance(new WebAssembly.Module(bin));
let mem = new Uint8Array(ins.exports.mem.buffer);

function setBytes(b) { for (let i = 0; i < 16; i++) mem[i] = b[i]; }

// i64x2 = [0x8000000000000000, 0x8000000000000000]: sum ≡ 0 mod 2^64.
setBytes([0,0,0,0,0,0,0,0x80, 0,0,0,0,0,0,0,0x80]);
assertEq(ins.exports.anytrue(),    1);
assertEq(ins.exports.anytrue_if(), 111);

// i64x2 = [1, -1]: sum ≡ 0 mod 2^64.
setBytes([1,0,0,0,0,0,0,0, 0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff]);
assertEq(ins.exports.anytrue(),    1);
assertEq(ins.exports.anytrue_if(), 111);

// Control: no cancellation.
setBytes([1,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0]);
assertEq(ins.exports.anytrue(),    1);
assertEq(ins.exports.anytrue_if(), 111);

// Zero vector: any_true must return 0.
setBytes([0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0]);
assertEq(ins.exports.anytrue(),    0);
assertEq(ins.exports.anytrue_if(), 222);

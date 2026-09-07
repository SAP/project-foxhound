// |jit-test| --setpref=wasm_wide_arithmetic=true

let t = `
(module
   (func (export "doAddI128")
     ;; (lhsLo lhsHi rhsLo rhsHi) -> (resultLo resultHi)
     (param i64 i64 i64 i64) (result i64 i64)
     local.get 0
     local.get 1
     local.get 2
     local.get 3
     i64.add128
   )
   (func (export "doSubI128")
     ;; (lhsLo lhsHi rhsLo rhsHi) -> (resultLo resultHi)
     (param i64 i64 i64 i64) (result i64 i64)
     local.get 0
     local.get 1
     local.get 2
     local.get 3
     i64.sub128
   )
   (func (export "doMulI64WideU")
     ;; (lhs rhs) -> (resultLo resultHi)
     (param i64 i64) (result i64 i64)
     local.get 0
     local.get 1
     i64.mul_wide_u
   )
   (func (export "doMulI64WideS")
     ;; (lhs rhs) -> (resultLo resultHi)
     (param i64 i64) (result i64 i64)
     local.get 0
     local.get 1
     i64.mul_wide_s
   )
)`;

let i = wasmEvalText(t);

////////////////////////////////////////////////////////////////////////
// Some simple smoke tests

// 2^63
let x80 = 0x8000000000000000n;

// "normalize" `x` so it falls into uint64_t range (a lame kludge)
function normalize(x) {
    if (x < 0n) return x + x80 + x80;
    return x;
}

function tryAddI128(a, b, c, d, expected) {
    assertEq(expected.length, 2);
    let actual = i.exports.doAddI128(a, b, c, d);
    assertEq(actual.length, 2);
    assertEq(normalize(actual[0]), normalize(expected[0]));
    assertEq(normalize(actual[1]), normalize(expected[1]));
}

function trySubI128(a, b, c, d, expected) {
    assertEq(expected.length, 2);
    let actual = i.exports.doSubI128(a, b, c, d);
    assertEq(actual.length, 2);
    assertEq(normalize(actual[0]), normalize(expected[0]));
    assertEq(normalize(actual[1]), normalize(expected[1]));
}

function tryMulI64WideU(a, b, expected) {
    assertEq(expected.length, 2);
    let actual = i.exports.doMulI64WideU(a, b);
    assertEq(actual.length, 2);
    assertEq(normalize(actual[0]), normalize(expected[0]));
    assertEq(normalize(actual[1]), normalize(expected[1]));
}

function tryMulI64WideS(a, b, expected) {
    assertEq(expected.length, 2);
    let actual = i.exports.doMulI64WideS(a, b);
    assertEq(actual.length, 2);
    assertEq(normalize(actual[0]), normalize(expected[0]));
    assertEq(normalize(actual[1]), normalize(expected[1]));
}

// Addition

// format is: --lhs--    --rhs--    result
//            lo, hi,    lo, hi,    [lo, hi]
tryAddI128(   2n, 1n,    4n, 3n,    [6n, 4n]); // no carry at midpoint
tryAddI128(   x80, 22n,  x80, 33n,  [0n, 56n]); // carry at midpoint

// carry out of neither
tryAddI128(0x02a74ec1865d36e3n, 0x30fe727e0ffbaf31n,
           0xb432733713c75e66n, 0x457b20ce3d706ea3n,
           [0xb6d9c1f89a249549n, 0x7679934c4d6c1dd4n]);

// carry out of lo
tryAddI128(0xcd0e81861923459bn, 0x30fe727e0ffbaf31n,
           0xb432733713c75e66n, 0x457b20ce3d706ea3n,
           [0x8140f4bd2ceaa401n, 0x7679934c4d6c1dd5n]);

// carry out of hi
tryAddI128(0x02a74ec1865d36e3n, 0xd74276b90c9d680bn,
           0xb432733713c75e66n, 0x457b20ce3d706ea3n,
           [0xb6d9c1f89a249549n, 0x1cbd97874a0dd6aen]);

// carry out of both
tryAddI128(0xcd0e81861923459bn, 0xd74276b90c9d680bn,
           0xb432733713c75e66n, 0x457b20ce3d706ea3n,
           [0x8140f4bd2ceaa401n, 0x1cbd97874a0dd6afn]);

// Subtraction

// format is: --lhs--    --rhs--    result
//            lo, hi,    lo, hi,    [lo, hi]
trySubI128(88n, 9999n, 66n, 4444n, [22n, 5555n]); // no borrow at midpoint
trySubI128(88n, 9999n, 99n, 4444n, [-11n, 5554n]); // borrow at midpoint

trySubI128(0x02a74ec1865d36e3n, 0x30fe727e0ffbaf31n,
           0xb432733713c75e66n, 0x457b20ce3d706ea3n,
           [5653384819931207805n, -1476246437253922675n]);

trySubI128(0xcd0e81861923459bn, 0x30fe727e0ffbaf31n,
           0xb432733713c75e66n, 0x457b20ce3d706ea3n,
           [1791322484341729077n, -1476246437253922674n]);

trySubI128(0x02a74ec1865d36e3n, 0xd74276b90c9d680bn,
           0xb432733713c75e66n, 0x457b20ce3d706ea3n,
           [5653384819931207805n, -7942284950858040985n]);

trySubI128(0xcd0e81861923459bn, 0xd74276b90c9d680bn,
           0xb432733713c75e66n, 0x457b20ce3d706ea3n,
           [1791322484341729077n, -7942284950858040984n]);

// Widening multiplies
// format is:                 -result-
//            operand operand [hi, lo]

// Signed and unsigned produce the same result.
tryMulI64WideU(123n, 456n, [56088n, 0n]);
tryMulI64WideS(123n, 456n, [56088n, 0n]);

// Signed and unsigned produce the same result; but bits[127:64] are now used
tryMulI64WideU(123999888777n, 456777666555n, [8875542349269292115n, 3070n]);
tryMulI64WideS(123999888777n, 456777666555n, [8875542349269292115n, 3070n]);

// Signed and unsigned produce different results
tryMulI64WideU(0x8123ffffeeeeddddn, 456777666555n,
               [-6687103016203617617n, 230424036496n]);
tryMulI64WideS(0x8123ffffeeeeddddn, 456777666555n,
               [11759641057505933999n, 18446743847355921557n]);

// As above pair, but with operands swapped.  Results should be the same
// as above.
tryMulI64WideU(456777666555n, 0x8123ffffeeeeddddn,
               [-6687103016203617617n, 230424036496n]);
tryMulI64WideS(456777666555n, 0x8123ffffeeeeddddn,
               [11759641057505933999n, 18446743847355921557n]);

////////////////////////////////////////////////////////////////////////
// Testcases from
// https://github.com/WebAssembly/wide-arithmetic/pull/22/commits/
//         f292896bef63408a88d1dc4e56b2ac1cb8c530ab

// simple addition
tryAddI128(0n, 0n,  0n, 0n,  [0n, 0n]);
tryAddI128(0n, 1n,  1n, 0n,  [1n, 1n]);
tryAddI128(1n, 0n,  -1n, 0n,  [0n, 1n]);
tryAddI128(1n, 1n,  -1n, -1n,  [0n, 1n]);

// simple subtraction
trySubI128(0n, 0n,  0n, 0n,  [0n, 0n]);
trySubI128(0n, 0n,  1n, 0n,  [-1n, -1n]);
trySubI128(0n, 1n,  1n, 1n,  [-1n, -1n]);
trySubI128(0n, 0n,  1n, 1n,  [-1n, -2n]);

// simple mul_wide
tryMulI64WideS(0n, 0n,  [0n, 0n]);
tryMulI64WideU(0n, 0n,  [0n, 0n]);
tryMulI64WideS(1n, 1n,  [1n, 0n]);
tryMulI64WideU(1n, 1n,  [1n, 0n]);
tryMulI64WideS(-1n, -1n,  [1n, 0n]);
tryMulI64WideS(-1n, 1n,  [-1n, -1n]);
tryMulI64WideU(-1n, 1n,  [-1n, 0n]);

// 20 randomly generated test cases for i64.add128
tryAddI128(-2418420703207364752n, -1n,
           -1n, -1n,
           [-2418420703207364753n, -1n]);
tryAddI128(0n, 0n,
           -4579433644172935106n, -1n,
           [-4579433644172935106n, -1n]);
tryAddI128(0n, 0n,
           1n, -1n,
           [1n, -1n]);
tryAddI128(1n, 0n,
           1n, 0n,
           [2n, 0n]);
tryAddI128(-1n, -1n,
           -1n, -1n,
           [-2n, -1n]);
tryAddI128(0n, -1n,
           1n, 0n,
           [1n, -1n]);
tryAddI128(0n, 0n,
           0n, -1n,
           [0n, -1n]);
tryAddI128(1n, 0n,
           -1n, -1n,
           [0n, 0n]);
tryAddI128(0n, 6184727276166606191n,
           0n, 1n,
           [0n, 6184727276166606192n]);
tryAddI128(-8434911321912688222n, -1n,
           1n, -1n,
           [-8434911321912688221n, -2n]);
tryAddI128(1n, -1n,
           0n, -1n,
           [1n, -2n]);
tryAddI128(1n, -5148941131328838092n,
           0n, 0n,
           [1n, -5148941131328838092n]);
tryAddI128(1n, 1n,
           1n, 0n,
           [2n, 1n]);
tryAddI128(-1n, -1n,
           -3636740005180858631n, -1n,
           [-3636740005180858632n, -1n]);
tryAddI128(-5529682780229988275n, -1n,
           0n, 0n,
           [-5529682780229988275n, -1n]);
tryAddI128(1n, -5381447440966559717n,
           1020031372481336745n, 1n,
           [1020031372481336746n, -5381447440966559716n]);
tryAddI128(1n, 1n,
           0n, 0n,
           [1n, 1n]);
tryAddI128(-9133888546939907356n, -1n,
           1n, 1n,
           [-9133888546939907355n, 0n]);
tryAddI128(-4612047512704241719n, -1n,
           0n, -1n,
           [-4612047512704241719n, -2n]);
tryAddI128(414720966820876428n, -1n,
           1n, 0n,
           [414720966820876429n, -1n]);

// 20 randomly generated test cases for i64.sub128
trySubI128(0n, -2459085471354756766n,
           -9151153060221070927n, -1n,
           [9151153060221070927n, -2459085471354756766n]);
trySubI128(4566502638724063423n, -4282658540409485563n,
           -6884077310018979971n, -1n,
           [-6996164124966508222n, -4282658540409485563n]);
trySubI128(1n, 3118380319444903041n,
           0n, 3283115686417695443n,
           [1n, -164735366972792402n]);
trySubI128(-7208415241680161810n, -1n,
           1n, 0n,
           [-7208415241680161811n, -1n]);
trySubI128(0n, 3944850126731328706n,
           1n, 1n,
           [-1n, 3944850126731328704n]);
trySubI128(1n, -1n,
           -1n, -1n,
           [2n, -1n]);
trySubI128(-1n, -1n,
           4855833073346115923n, -6826437637438999645n,
           [-4855833073346115924n, 6826437637438999644n]);
trySubI128(1n, 0n,
           -1n, -1n,
           [2n, 0n]);
trySubI128(1n, 0n,
           1n, 0n,
           [0n, 0n]);
trySubI128(-1n, -1n,
           0n, 0n,
           [-1n, -1n]);
trySubI128(1n, -1n,
           -6365475388498096428n, -1n,
           [6365475388498096429n, -1n]);
trySubI128(6804238617560992346n, -1n,
           0n, -1n,
           [6804238617560992346n, 0n]);
trySubI128(0n, 1n,
           1n, -7756145513466453619n,
           [-1n, 7756145513466453619n]);
trySubI128(1n, -1n,
           1n, 1n,
           [0n, -2n]);
trySubI128(0n, 1n,
           1n, 0n,
           [-1n, 0n]);
trySubI128(1n, 5602881641763648953n,
           -2110589244314239080n, -1n,
           [2110589244314239081n, 5602881641763648953n]);
trySubI128(0n, 1n,
           -1n, -1n,
           [1n, 1n]);
trySubI128(0n, -1n,
           3553816990259121806n, -2105235417856431622n,
           [-3553816990259121806n, 2105235417856431620n]);
trySubI128(1861102705894987245n, 1n,
           3713781778534059871n, 1n,
           [-1852679072639072626n, -1n]);
trySubI128(0n, -1n,
           1n, 1832524486821761762n,
           [-1n, -1832524486821761764n]);

// 20 randomly generated test cases for i64.mul_wide_s
tryMulI64WideS(1n, 1n,
               [1n, 0n]);
tryMulI64WideS(0n, 6287758211025156705n,
               [0n, 0n]);
tryMulI64WideS(-6643537319803451357n, 1n,
               [-6643537319803451357n, -1n]);
tryMulI64WideS(-2483565146858803428n, 0n,
               [0n, 0n]);
tryMulI64WideS(1n, 1n,
               [1n, 0n]);
tryMulI64WideS(-3838951433439430085n, 3471602925362676030n,
               [5186941893001237834n, -722475195264825124n]);
tryMulI64WideS(-8262495286814853129n, 7883241869666573970n,
               [-8557189786755031842n, -3530988912334554469n]);
tryMulI64WideS(4278371902407959701n, 1n,
               [4278371902407959701n, 0n]);
tryMulI64WideS(-8852706149487089182n, -1n,
               [8852706149487089182n, 0n]);
tryMulI64WideS(1n, -1n,
               [-1n, -1n]);
tryMulI64WideS(-1n, -4329244561838653387n,
               [4329244561838653387n, 0n]);
tryMulI64WideS(-1n, -1n,
               [1n, 0n]);
tryMulI64WideS(697896157315764057n, 1n,
               [697896157315764057n, 0n]);
tryMulI64WideS(1n, 1n,
               [1n, 0n]);
tryMulI64WideS(-1n, 0n,
               [0n, 0n]);
tryMulI64WideS(0n, -3769664482072947073n,
               [0n, 0n]);
tryMulI64WideS(1n, 8414291037346403854n,
               [8414291037346403854n, 0n]);
tryMulI64WideS(1n, -1n,
               [-1n, -1n]);
tryMulI64WideS(5014655679779318485n, -5080037812563681985n,
               [2842857627777395563n, -1380983027057486843n]);
tryMulI64WideS(0n, 1n,
               [0n, 0n]);

// 20 randomly generated test cases for i64.mul_wide_u
tryMulI64WideU(-4734436040338162711n, 0n,
               [0n, 0n]);
tryMulI64WideU(1n, 0n,
               [0n, 0n]);
tryMulI64WideU(3270597527173764279n, 6636648075495406358n,
               [-5430303818902260550n, 1176674035141685826n]);
tryMulI64WideU(-7771814344630108151n, 1n,
               [-7771814344630108151n, 0n]);
tryMulI64WideU(1n, 0n,
               [0n, 0n]);
tryMulI64WideU(1n, -7864138787704962081n,
               [-7864138787704962081n, 0n]);
tryMulI64WideU(1n, 518555141550256010n,
               [518555141550256010n, 0n]);
tryMulI64WideU(1n, -1n,
               [-1n, 0n]);
tryMulI64WideU(1118900477321231571n, -1n,
               [-1118900477321231571n, 1118900477321231570n]);
tryMulI64WideU(-1n, 0n,
               [0n, 0n]);
tryMulI64WideU(-5586890671027490027n, 1n,
               [-5586890671027490027n, 0n]);
tryMulI64WideU(0n, 3603850799751152505n,
               [0n, 0n]);
tryMulI64WideU(-1n, -1n,
               [1n, 18446744073709551614n]);
tryMulI64WideU(0n, 1n,
               [0n, 0n]);
tryMulI64WideU(-7344082851774441644n, 3896439839137544024n,
               [5738542512914895072n, 2345175459296971666n]);
tryMulI64WideU(0n, 0n,
               [0n, 0n]);
tryMulI64WideU(616395976148874061n, 0n,
               [0n, 0n]);
tryMulI64WideU(2810729703362889816n, -1n,
               [-2810729703362889816n, 2810729703362889815n]);
tryMulI64WideU(1n, -1n,
               [-1n, 0n]);
tryMulI64WideU(1n, 0n,
               [0n, 0n]);

// assert overlong encodings for each instruction's binary encoding are
// accepted

let wasmBytes = new Uint8Array([
  0x00,0x61,0x73,0x6d, 0x01,0x00,0x00,0x00,
  0x01,0x11,                // type section, 17 bytes
  0x02,                     // 2 count
  0x60,                     // type0 = function
  0x04,0x7e,0x7e,0x7e,0x7e, //  4 params - all i64
  0x02,0x7e,0x7e,           //  2 results - both i64
  0x60,                     // type1 = function
  0x02,0x7e,0x7e,           //  2 params - both i64
  0x02,0x7e,0x7e,           //  2 results - both i64
  0x03,0x05,                // function section, 5 byte
  0x04,                     // 4 count
  0x00,0x00,0x01,0x01,      // types of each function (0, 0, 1, 1)
  0x07,0x3d,                // export section 0x3d bytes
  0x04,                     // 4 count
  0x0a,0x69,0x36,0x34,0x5f,
  0x61,0x64,0x64,0x31,0x32,0x38,0x00,0x00,  // i64_add128 which is function 0
  0x0a,0x69,0x36,0x34,0x5f,
  0x73,0x75,0x62,0x31,0x32,0x38,0x00,0x01,  // i64_add128 which is function 1
  0x0e,0x69,0x36,0x34,0x5f,
  0x6d,0x75,0x6c,0x5f,0x77,0x69,
  0x64,0x65,0x5f,0x73,0x00,0x02, // i64_mul_wide_s which is function 2
  0x0e,0x69,0x36,0x34,0x5f,
  0x6d,0x75,0x6c,0x5f,0x77,0x69,
  0x64,0x65,0x5f,0x75,0x00,0x03, // i64_mul_wide_u which is function 3
  0x0a,0x37,                // code section + byte length
  0x04,                     // 4 count
  0x0e,                     // byte length
  0x00,                     // no locals
  0x20,0x00,                // local.get 0
  0x20,0x01,                // local.get 1
  0x20,0x02,                // local.get 2
  0x20,0x03,                // local.get 3
  0xfc,0x93,0x80,0x00,      // i64.add128 (overlong)
  0x0b,                     // end
  0x0d,                     // byte length
  0x00,                     // no locals
  0x20,0x00,                // local.get 0
  0x20,0x01,                // local.get 1
  0x20,0x02,                // local.get 2
  0x20,0x03,                // local.get 3
  0xfc,0x94,0x00,           // i64.sub128 (overlong)
  0x0b,                     // end
  0x0c,                     // byte length
  0x00,                     // no locals
  0x20,0x00,                // local.get 0
  0x20,0x01,                // local.get 1
  0xfc,0x95,0x80,0x80,0x80,0x00,  // i64.mul_wide_s (overlong)
  0x0b,                     // end
  0x0b,                     // byte length
  0x00,                     // no locals
  0x20,0x00,                // local.get 0
  0x20,0x01,                // local.get 1
  0xfc,0x96,0x80,0x80,0x00, // i64.mul_wide_u (overlong)
  0x0b                      // end
  ]);

let wasmModule = new WebAssembly.Module(wasmBytes);
let wasmInstance = new WebAssembly.Instance(wasmModule, {});

let res = wasmInstance.exports.i64_add128(1n, 2n, 3n, 4n);
assertEq(res[0], 4n);
assertEq(res[1], 6n);

res = wasmInstance.exports.i64_sub128(2n, 5n, 1n, 2n);
assertEq(res[0], 1n);
assertEq(res[1], 3n);

res = wasmInstance.exports.i64_mul_wide_s(1n, -2n);
assertEq(res[0], -2n);
assertEq(res[1], -1n);

res = wasmInstance.exports.i64_mul_wide_u(3n, 2n);
assertEq(res[0], 6n);
assertEq(res[1], 0n);

// some invalid types for these instructions

assertErrorMessage(() => wasmEvalText(`
  (module
    (func (param i64 i64 i64 i64) (result i64)
      local.get 0
      local.get 1
      local.get 2
      local.get 3
      i64.add128)
  )`), Error, /unused values not explicitly dropped by end of block/);

assertErrorMessage(() => wasmEvalText(`
  (module
    (func (param i64 i64 i64) (result i64 i64)
      local.get 0
      local.get 1
      local.get 2
      i64.add128)
  )`), Error, /popping value from empty stack/);

assertErrorMessage(() => wasmEvalText(`
  (module
    (func (param i64 i64 i64 i64) (result i64)
      local.get 0
      local.get 1
      local.get 2
      local.get 3
      i64.sub128)
  )`), Error, /unused values not explicitly dropped by end of block/);

assertErrorMessage(() => wasmEvalText(`
  (module
    (func (param i64 i64 i64) (result i64 i64)
      local.get 0
      local.get 1
      local.get 2
      i64.sub128)
  )`), Error, /popping value from empty stack/);

assertErrorMessage(() => wasmEvalText(`
  (module
    (func (param i64 i64) (result i64)
      local.get 0
      local.get 1
      i64.mul_wide_s)
  )`), Error, /unused values not explicitly dropped by end of block/);

assertErrorMessage(() => wasmEvalText(`
  (module
    (func (param i64) (result i64 i64)
      local.get 0
      i64.mul_wide_s)
  )`), Error, /popping value from empty stack/);

assertErrorMessage(() => wasmEvalText(`
  (module
    (func (param i64 i64) (result i64)
      local.get 0
      local.get 1
      i64.mul_wide_u)
  )`), Error, /unused values not explicitly dropped by end of block/);

assertErrorMessage(() => wasmEvalText(`
  (module
    (func (param i64) (result i64 i64)
      local.get 0
      i64.mul_wide_u)
  )`), Error, /popping value from empty stack/);

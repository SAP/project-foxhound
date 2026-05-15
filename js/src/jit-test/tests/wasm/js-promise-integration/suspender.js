
var ins = wasmEvalText(`
(module
  (func (export "w0") (param nullexternref)
  )
)`);
let v2 = WebAssembly.promising(ins.exports.w0);

var res = WebAssembly.promising(ins.exports.w0);
Promise.resolve().then(() => {
  res().then(i => {
    assertEq(42, i)
  }).catch(e => {
    assertEq(e instanceof TypeError, true);
  });
});

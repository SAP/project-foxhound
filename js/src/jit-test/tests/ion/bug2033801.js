// |jit-test| --no-threads; --fast-warmup; skip-if: !wasmIsSupported()

const g = newGlobal({newCompartment: true});
g.parent = this;
g.eval(`Debugger(parent).onExceptionUnwind = () => ({return: 1});`);

const bin = wasmTextToBinary(`
  (module
    (memory 1 1)
    (func (export "get") (param i32) (result f32)
    (f32.load (local.get 0))))
`);
const mod = new WebAssembly.Module(bin);
const inst = new WebAssembly.Instance(mod);

for (let offset = 65000; offset < 65800; offset++) {
  inst.exports.get(offset);
}

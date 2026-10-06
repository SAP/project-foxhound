// |jit-test| skip-if: !wasmStackSwitchingEnabled()

const bin = wasmTextToBinary(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (type $s (struct (field (ref null $ct))))
  (func $f)
  (elem declare func $f)
  (func (export "make") (result anyref)
    (struct.new $s (cont.new $ct (ref.func $f)))))`);
const { make } = new WebAssembly.Instance(new WebAssembly.Module(bin)).exports;

// A continuation is not exposable to JS, so reading the field must throw
// rather than leak the live ContObject. The exposability check in
// WasmGcObject::loadValue must run before the (ref $ct) -> eqref erasure,
// otherwise the continuation would escape masked as an eqref.
assertErrorMessage(() => wasmGcReadField(make(), 0), TypeError,
                   /cannot pass value to or from JS/);

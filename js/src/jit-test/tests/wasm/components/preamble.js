// |jit-test| skip-if: !wasmComponentsEnabled()

assertErrorMessage(() => new WebAssembly.Component(new Uint8Array([
  0,
])), WebAssembly.CompileError, /failed to match magic number/);

assertErrorMessage(() => new WebAssembly.Component(new Uint8Array([
  0, 0, 0, 0,
])), WebAssembly.CompileError, /failed to match magic number/);

assertErrorMessage(() => new WebAssembly.Component(new Uint8Array([
  0, 0x61, 0x73, 0x6D,
])), WebAssembly.CompileError, /failed to read version/);

assertErrorMessage(() => new WebAssembly.Component(new Uint8Array([
  0, 0x61, 0x73, 0x6D,
  0, 0, 0, 0,
])), WebAssembly.CompileError, /binary version .* does not match/);

// Core module version should be rejected by the Component constructor.
assertErrorMessage(() => new WebAssembly.Component(new Uint8Array([
  0, 0x61, 0x73, 0x6D,
  1, 0, 0, 0,
])), WebAssembly.CompileError, /binary version .* does not match/);

// Valid empty component.
new WebAssembly.Component(new Uint8Array([
  0, 0x61, 0x73, 0x6D,
  0x0d, 0, 1, 0,
]));

// TODO(wasm-cm): Custom sections (section ID 0) should be silently skipped,
// but they currently fail with "unexpected section ID".

// Section framing errors

// Section length extends past end of component.
assertErrorMessage(() => new WebAssembly.Component(new Uint8Array([
  0, 0x61, 0x73, 0x6D,
  0x0d, 0, 1, 0,

  0x01, 0x10, // core module section, section length too long
    0x00, 0x61, 0x73, 0x6D,
    0x01, 0x00, 0x00, 0x00,
])), WebAssembly.CompileError, /invalid section length/);

// Unknown section ID.
assertErrorMessage(() => new WebAssembly.Component(new Uint8Array([
  0, 0x61, 0x73, 0x6D,
  0x0d, 0, 1, 0,

  0xFF, 0x00, // unknown section ID 0xFF, length 0
])), WebAssembly.CompileError, /unexpected section ID/);

// Section parsing stops with bytes left over
assertErrorMessage(() => new WebAssembly.Component(new Uint8Array([
  0, 0x61, 0x73, 0x6D,
  0x0d, 0, 1, 0,

  0x07, 0x04, // type section, data shorter than section length
    0x00,
  0x00, 0x06, // custom section to pad out the component
    0x05,
    0x64, 0x75, 0x6D, 0x6D, 0x79, // "dummy", no data
])), WebAssembly.CompileError, /too many bytes in section/);

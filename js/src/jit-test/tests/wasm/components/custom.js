// |jit-test| skip-if: !wasmComponentsEnabled()

// Custom sections should be silently skipped.
wasmValidateBinary(new Uint8Array([
  0, 0x61, 0x73, 0x6D,
  0x0d, 0, 1, 0,

  0x00, 0x05, // custom section, length 5
    0x03, // name length 3
    0x66, 0x6F, 0x6F, // name: "foo"
    0x42, // one byte of custom data
]));

// Multiple custom sections should all be skipped.
wasmValidateBinary(new Uint8Array([
  0, 0x61, 0x73, 0x6D,
  0x0d, 0, 1, 0,

  0x00, 0x05, // custom section, length 5
    0x03,
    0x66, 0x6F, 0x6F, // "foo"
    0x42,
  0x00, 0x05, // another custom section, length 5
    0x03,
    0x62, 0x61, 0x72, // "bar"
    0x99,
]));

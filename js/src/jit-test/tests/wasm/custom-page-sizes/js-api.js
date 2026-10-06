// |jit-test| skip-if: !wasmCustomPageSizesEnabled()

load(libdir + "wasm-binary.js");

{
  let instance = wasmEvalText(`(module
      (memory (export "mem") 0 1 (pagesize 1))
    )
  `);

  assertErrorMessage(
    () => wasmEvalText(`(module
        (memory (import "m" "mem") 0 1 (pagesize 65536))
      )
    `, { m: { mem: instance.exports.mem } }),
    WebAssembly.LinkError,
    /imported memory with incompatible page size/
  )
}

// Test against explicit page size in the binary encoding.
{
  let instance = wasmEvalBinary(
    moduleWithSections([ {name:memoryId, body:[0x01, 0x08, 0x00, 0x10]},
                         exportSection([ {name: "mem", memIndex: 0} ]) ])
  );

  assertErrorMessage(
    () => wasmEvalText(`(module
        (memory (import "m" "mem") 0 1 (pagesize 1))
      )
    `, { m: { mem: instance.exports.mem } }),
    WebAssembly.LinkError,
    /imported memory with incompatible page size/
  )
}

// Test against default page size in the binary encoding.
{
  let instance = wasmEvalBinary(
    moduleWithSections([ {name:memoryId, body:[0x01, 0x01, 0x00, 0x01]},
                         exportSection([ {name: "mem", memIndex: 0} ]) ])
  );

  assertErrorMessage(
    () => wasmEvalText(`(module
        (memory (import "m" "mem") 0 1 (pagesize 1))
      )
    `, { m: { mem: instance.exports.mem } }),
    WebAssembly.LinkError,
    /imported memory with incompatible page size/
  )
}

// Valid cases
{
  let instance = wasmEvalText(`(module
      (memory (export "mem") 0 1 (pagesize 1))
    )
  `);

  wasmEvalText(`(module
        (memory (import "m" "mem") 0 1 (pagesize 1))
      )
    `, { m: { mem: instance.exports.mem } });
}

{
  let instance = wasmEvalText(`(module
      (memory (export "mem") 0 1)
    )
  `);

  wasmEvalText(`(module
        (memory (import "m" "mem") 0 1 (pagesize 65536))
      )
    `, { m: { mem: instance.exports.mem } });
}

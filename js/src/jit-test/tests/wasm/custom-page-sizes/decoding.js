// |jit-test| skip-if: !wasmCustomPageSizesEnabled()

load(libdir + "wasm-binary.js");

wasmValidateText(`(module
    (memory 0 1 (pagesize 1))
  )
`);

wasmValidateText(`(module
    (memory 0 1 (pagesize 65536))
  )
`);

// Missing page size.
assertErrorMessage(() => wasmEvalBinary(moduleWithSections([ {name:memoryId, body:[0x01, 0x08, 0x00]} ])), WebAssembly.CompileError, /failed to decode custom page size/);

// Too many bytes after page size.
assertErrorMessage(() => wasmEvalBinary(moduleWithSections([ {name:memoryId, body:[0x01, 0x08, 0x00, 0x10, 0x01]} ])), WebAssembly.CompileError, /byte size mismatch in memory section/);

// Tables shouldn't have page sizes.
assertErrorMessage(() => wasmEvalBinary(moduleWithSections([ {name:tableId, body:[0x01, FuncRefCode, 0x08, 0x00, 0x10]} ])), WebAssembly.CompileError, /unexpected bits set in flags: 8/);

function checkInvalidPageSize(pageSize) {
    assertErrorMessage(() => wasmValidateText(`(module
          (memory 0 1 (pagesize ${pageSize}))
        )`),
        WebAssembly.CompileError, /bad custom page size/);
}

checkInvalidPageSize(8);
checkInvalidPageSize(128);
checkInvalidPageSize(131072);

wasmValidateText(`(module
    (memory 0 65536 (pagesize 1))
  )
`);

wasmValidateText(`(module
    (memory i32 0 65536 (pagesize 65536))
  )
`);

wasmValidateText(`(module
    (memory i32 0 4_294_967_295 (pagesize 1))
  )
`);

wasmValidateText(`(module
    (memory i64 0 4_294_967_296 (pagesize 1))
  )
`);

wasmValidateText(`(module
    (memory i64 0 9_007_199_254_740_991 (pagesize 1))
  )
`);

function maxPageCount(pageSize) {
    if (pageSize === 1)
      return 0xffffffff;
    return 1 << (32 - Math.log2(pageSize));
}

function maxPageCount64(pageSize) {
    if (pageSize === 1)
      return BigInt(Number.MAX_SAFE_INTEGER);
    return (1n << (53n - BigInt(Math.log2(pageSize)))) - 1n;
}

function checkPageCount(pageSize, pageCount) {
    function check() {
        return wasmValidateText(`(module
            (memory 0 ${pageCount} (pagesize ${pageSize}))
        )`);
    }
    if (pageCount <= maxPageCount(pageSize))
        check();
    else if (pageCount > 0xffffffff) {
        // In this case, a u64 is encoded instead of a u32 and a decoding
        // error raises this exception.
        assertErrorMessage(check, WebAssembly.CompileError,
                           /expected maximum length/);
    }
    else
        assertErrorMessage(check, WebAssembly.CompileError,
                           /maximum memory size too big/);
}

function checkPageCount64(pageSize, pageCount) {
    function check() {
        return wasmValidateText(`(module
            (memory i64 0 ${pageCount} (pagesize ${pageSize}))
        )`);
    }
    if (pageCount <= maxPageCount64(pageSize))
        check();
    else {
        assertErrorMessage(check, WebAssembly.CompileError,
                           /maximum memory size too big/);
    }
}

for (pageSize of [1, 65536])
    for (pageCount of [0, 1, 42, maxPageCount(pageSize)-1,
                       maxPageCount(pageSize),
                       maxPageCount(pageSize)+1,
                       0xffffffff])
        checkPageCount(pageSize, pageCount);

for (pageSize of [1, 65536])
    for (pageCount of [0n, 1n, 42n, maxPageCount64(pageSize)-1n,
                       maxPageCount64(pageSize),
                       maxPageCount64(pageSize)+1n])
        checkPageCount64(pageSize, pageCount);

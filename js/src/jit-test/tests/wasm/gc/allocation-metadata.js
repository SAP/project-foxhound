let {createStructIL, createStructOOL, createArray, createArrayFixed} = wasmEvalText(`(module
    (type $sIL (struct))
    (type $sOOL (struct (field ${'i32 '.repeat(100)})))
    (type $a (array i32))
    (func (export "createStructIL") (result anyref)
        struct.new_default $sIL
    )
    (func (export "createStructOOL") (result anyref)
        struct.new_default $sOOL
    )
    (func (export "createArray") (param i32) (result anyref)
        i32.const 0
        local.get 0
        array.new $a
    )
    (func (export "createArrayFixed") (result anyref)
        array.new_fixed $a 0
    )
)`).exports;

let metadata;
let lastMetadataIndex;

enableShellAllocationMetadataBuilder();

metadata = getAllocationMetadata(createStructIL());
lastMetadataIndex = metadata.index;

metadata = getAllocationMetadata(createStructOOL());
assertEq(lastMetadataIndex < metadata.index, true);
lastMetadataIndex = metadata.index;

metadata = getAllocationMetadata(createArray(0));
assertEq(lastMetadataIndex < metadata.index, true);
lastMetadataIndex = metadata.index;

metadata = getAllocationMetadata(createArray(1));
assertEq(lastMetadataIndex < metadata.index, true);
lastMetadataIndex = metadata.index;

metadata = getAllocationMetadata(createArray(500));
assertEq(lastMetadataIndex < metadata.index, true);
lastMetadataIndex = metadata.index;

metadata = getAllocationMetadata(createArrayFixed());
assertEq(lastMetadataIndex < metadata.index, true);
lastMetadataIndex = metadata.index;

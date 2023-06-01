// |jit-test| skip-if: !wasmGcEnabled()

// Test the maximum depth limit
{
  const MaxDepth = 31;
  let types = `(type (struct))\n`;
  for (let depth = 1; depth <= MaxDepth + 1; depth++) {
    types += `(sub ${depth - 1} (type (struct)))\n`;
  }
  wasmFailValidateText(`(module
    ${types}
  )`, /too deep/);
}

// Test all possible casting combinations of the following graph:
//
//  A1       A2
//  |        |
//  B1       B2
//  | \      |
//  C1  C2   C3
//  | \      |
//  D1  D2   D3
//
// NOTE: this object will be mutated and needs to be ordered such that parent
// definitions come before children.
const TYPES = {
  'A1': { super: null },
  'A2': { super: null },
  'B1': { super: 'A1' },
  'B2': { super: 'A2' },
  'C1': { super: 'B1' },
  'C2': { super: 'B1' },
  'C3': { super: 'B2' },
  'D1': { super: 'C1' },
  'D2': { super: 'C1' },
  'D3': { super: 'C3' },
};

// The oracle method for testing the declared subtype relationship.
function manualIsSubtype(types, subType, superType) {
  while (subType !== superType && subType.super !== null) {
    subType = types[subType.super];
  }
  return subType === superType;
}

function testAllCasts(types) {
  let typeSection = ``;
  let funcSection = ``;
  for (let name in types) {
    let type = types[name];
    if (type.super === null) {
      typeSection += `(type \$${name} (struct))\n`;
    } else {
      typeSection += `(sub \$${type.super} (type \$${name} (struct)))\n`;
    }
    funcSection += `
      (func (export "new${name}") (result externref)
        struct.new_default \$${name}
        extern.externalize
      )
      (func (export "is${name}") (param externref) (result i32)
        local.get 0
        extern.internalize
        ref.test \$${name}
      )`;
  }
  // NOTE: we place all types in a single recursion group to prevent
  // canonicalization from 
  let moduleText = `(module
    (rec ${typeSection})
    ${funcSection}
  )`;

  // Instantiate the module and acquire the testing methods
  let exports = wasmEvalText(moduleText).exports;
  for (let name in types) {
    let type = types[name];
    type['new'] = exports[`new${name}`];
    type['is'] = exports[`is${name}`];
  }

  // Test every combination of types, comparing the oracle method against the
  // JIT'ed method.
  for (let subTypeName in types) {
    let subType = types[subTypeName];
    for (let superTypeName in types) {
      let superType = types[subTypeName];
      assertEq(
        manualIsSubtype(types, subType, superType) ? 1 : 0,
        superType['is'](subType['new']()));
    }
  }
}
testAllCasts(TYPES);

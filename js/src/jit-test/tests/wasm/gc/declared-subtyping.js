function assertCanBeSubtype(types) {
  wasmValidateText(`(module
    ${types}
  )`);
}

function assertCannotBeSubtype(types) {
  assertErrorMessage(() => {
    assertCanBeSubtype(types);
  }, WebAssembly.CompileError, /incompatible super type/);
}

assertCanBeSubtype(`(type $a (sub (array i32))) (type $b (sub $a (array i32)))`);
assertCanBeSubtype(`(type $a (sub (array (mut i32)))) (type $b (sub $a (array (mut i32))))`);
assertCannotBeSubtype(`(type $a (sub (array i32))) (type $b (sub $a (array (mut i32))))`);
assertCannotBeSubtype(`(type $a (sub (array (mut i32)))) (type $b (sub $a (array i32)))`);

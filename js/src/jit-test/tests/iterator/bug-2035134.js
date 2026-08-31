load(libdir + "asserts.js");

assertErrorMessage(
  () => [...Iterator.zip([[1, 2, 3], ['a', 'b']], { mode: 'longest', padding: '' })],
  TypeError,
  `invalid type for "padding" option: string`
);

assertErrorMessage(
  () => [...Iterator.zipKeyed({ a: [1, 2, 3], b: ['a', 'b'] }, { mode: 'longest', padding: '' })],
  TypeError,
  `invalid type for "padding" option: string`
);

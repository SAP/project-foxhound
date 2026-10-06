// |jit-test| skip-if: !wasmComponentsEnabled()

// We use imported functions as our oracle for strongly-uniqueness, as only
// functions allow the full range of plain names.
function assertAllStronglyUnique(names) {
  wasmValidateText(`(component
    ${names.map(n => `(import "${n}" (func))`).join("\n")}
  )`);
}
function assertNotStronglyUnique(okNames, badName) {
  assertAllStronglyUnique(okNames);
  wasmFailValidateText(`(component
    ${okNames.map(n => `(import "${n}" (func))`).join("\n")}
    (import "${badName}" (func))
  )`, /not strongly-unique/);
}

const specOkExamples = [
  "foo", "foo-bar",
  "[constructor]foo",
  "[method]foo.bar", "[method]foo.baz",
];
assertAllStronglyUnique(specOkExamples);

assertNotStronglyUnique(specOkExamples, "foo");
assertNotStronglyUnique(specOkExamples, "foo-BAR");
assertNotStronglyUnique(specOkExamples, "[constructor]foo-BAR");
assertNotStronglyUnique(specOkExamples, "[method]foo.foo");
assertNotStronglyUnique(specOkExamples, "[method]foo.BAR");

// |jit-test| skip-if: (getBuildConfiguration("debug") || getBuildConfiguration("android"))

// This test is quite slow so we skip it on Android and on debug builds.

const MaxMapSetEntries = 44739242;

function fill(set) {
  var i = 0;
  while (true) {
    set.add(i);
    i++;
  }
}
function test() {
  var set = new Set();
  var exc = null;
  try {
    fill(set);
  } catch (e) {
    exc = e;
  }
  assertEq(exc !== null, true);
  if (exc === "out of memory") {
    assertEq(set.size <= MaxMapSetEntries, true);
  } else {
    assertEq(set.size, MaxMapSetEntries);
  }
  return set;
}
test();

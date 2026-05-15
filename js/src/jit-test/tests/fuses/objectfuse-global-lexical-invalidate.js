// |jit-test| --fast-warmup

// Test for GetName loading a constant lexical.

let globalLexical = 3;

function changeGlobalLexical(i) {
  with (this) {} // Don't inline.
  if (i === 1900) {
    globalLexical = 5;
  }
}

function f() {
  var res = 0;
  for (var i = 0; i < 2000; i++) {
    res += globalLexical;
    changeGlobalLexical(i);
  }
  assertEq(res, 6198);
}
f();

// |jit-test| --fuzzing-safe; --ion-eager
enableGeckoProfilingWithSlowAssertions();

function f() {
  class C {
    static #c;
  }
  (function() {
    "".substring("");
    return [];
  })();
}

oomTest(f);

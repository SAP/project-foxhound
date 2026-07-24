// |jit-test| --no-threads
with ({}) {}


function foo() {
  target();
}

// A function that can be inlined
function good() {}

// A function that can't be inlined (because of the asm.js lambda)
function bad() {
  if (!bad) {
    function inner() {
      "use asm";
      function f() {}
      return f;
    }
  }
}

// Compile a version of foo that calls good without inlining it.
for (var i = 0; i < 1000; i++) {
  try { foo(); } catch {}
}
target = good;
for (var i = 0; i < 500; i++) {
  foo();
}

// Bail out of the ion-compiled version of foo.
// Attach an IC that calls bad.
target = bad;
for (var i = 0; i < 1500; i++) {
  foo();
}

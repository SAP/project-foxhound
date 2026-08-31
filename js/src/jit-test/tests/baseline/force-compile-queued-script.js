// |jit-test| --baseline-batching=on; --no-threads

function foo() {}
function bar() {}

// Put foo and bar in the compile queue
for (var i = 0; i < 100; i++) {
  foo();
  bar();
}

// Force-compile foo
baselineCompile(foo)

// Drain the compile queue
for (var i = 0; i < 500; i++) {
  bar();
}

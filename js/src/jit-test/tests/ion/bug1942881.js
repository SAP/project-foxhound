// |jit-test| --no-threads; --fast-warmup

function handler() { return true; }
setInterruptCallback(handler);

function foo(i) {
  let e = "12a".match("2*[a]");
  interruptIf(true);
  if (i >= 50) {
    return e[0];
  }
}
for (var i = 0; i < 100; i++) {
  foo(i);
}

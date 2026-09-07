// |jit-test| --baseline-batching=on; --no-threads; --baseline-queue-capacity=1

oomTest(() => {
  eval("function foo() {}");
  for (var i = 0; i < 150; i++) {
    foo();
  }
})

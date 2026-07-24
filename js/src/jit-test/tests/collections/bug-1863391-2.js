// |jit-test| --enable-symbols-as-weakmap-keys; skip-if: helperThreadCount() === 0
evalInWorker(`
  a = new WeakMap
  b = Symbol.hasInstance;
  a.set(b, 2);
`);

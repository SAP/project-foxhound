// |jit-test| --enable-symbols-as-weakmap-keys; skip-if: helperThreadCount() === 0

evalInWorker(`
  let b = new WeakRef(Symbol.hasInstance);
  b.deref();
`);

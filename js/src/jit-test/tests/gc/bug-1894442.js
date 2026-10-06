// |jit-test| --enable-symbols-as-weakmap-keys; skip-if: helperThreadCount() === 0
evalInWorker(`
  a = new WeakSet
  a.add(Symbol.hasInstance)
  gczeal(14)(0 .b)
`)

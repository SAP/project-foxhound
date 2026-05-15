// |jit-test| skip-if: helperThreadCount() === 0

evalInWorker(`   
  a = newGlobal();
  a.eval("key = {}");
  enqueueMark("enter-weak-marking-mode");
  a.eval("enqueueMark(key)");
  a = undefined;
  gc();
`);

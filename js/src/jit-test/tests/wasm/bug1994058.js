oomTest(function() {
   WebAssembly.instantiate(new WebAssembly.Module(wasmTextToBinary("(module)")));
});

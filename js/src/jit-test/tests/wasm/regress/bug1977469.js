const bin = wasmTextToBinary("(type $a (array (mut i32)))(func (param i32)(result eqref) local.get 0 array.new_default $a)");
oomTest(() => new WebAssembly.Module(bin, {importedStringConstants: 0}));

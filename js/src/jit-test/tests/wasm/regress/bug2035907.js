let {t} = wasmEvalText(`
  (module
    (global (import "" "g") (ref extern))
    (table (export "t") 5 100 (ref extern) (global.get 0))
  )
`, {"": {g: "init"}}).exports;

oomTest(() => {
  t.grow(1);
  assertEq(t.length, 6);
  assertEq(t.get(5), "init");
});

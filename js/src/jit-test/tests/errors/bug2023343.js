// |jit-test| --no-blinterp

let g = newGlobal({newCompartment: true});

function f() {
  for (var y in {x:1}) {
    try {
      g.eval("throw 0")
    } finally {}
  }
}
try { f() } catch {}
oomTest(f)

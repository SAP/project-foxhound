// |jit-test| --baseline-offthread-compile=on; --setpref=experimental.self_hosted_cache=true
Object.defineProperty(this, "x", {
  value: {
    c: function*() {}.constructor
  }
})
x.c()().next();
setJitCompilerOption("offthread-compilation.enable", 1);
for (var i = 0; i < 500; i++) {
  x.c()().next();
}

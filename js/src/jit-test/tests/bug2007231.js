// |jit-test|

setJitCompilerOption("offthread-compilation.enable", 1);
for (let i = 0; i < 99; i++) {};
oomTest(Iterator.prototype.map, { keepFailing: true });

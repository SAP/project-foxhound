let module = `(function module() { "use asm";function foo(`;
const count = 1005;
for (let i = 0; i <= count; ++i) {
  module += `arg${i},`;
}
module += `arg${count}){`;
for (let i = 0; i <= count; ++i) {
  module += `arg${i}=+arg${i};`;
}

try {
  Function(module);
} catch (e) {
}

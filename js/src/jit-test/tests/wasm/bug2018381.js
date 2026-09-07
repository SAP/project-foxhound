// |jit-test| --no-threads

const code = `
(module
  (memory (import "imports" "mem0") 1 1)
  (memory (import "imports" "mem1") 1 1)

  (func (export "w0") (result i32)
    (local $tmp i64)
    (local.set $tmp (i64.atomic.rmw8.and_u 1 offset=1 (i32.const 0) (i64.const 0)))
    (local.set $tmp (i64.atomic.rmw8.cmpxchg_u 1 offset=1 (i32.const 0) (i64.const 0) (i64.const 0)))
    (local.set $tmp (i64.atomic.rmw8.xchg_u 1 offset=1 (i32.const 0) (i64.const 0)))
    (i32.const 0xcafebabe)
  )
)
`;
const v2 = new WebAssembly.Instance(new WebAssembly.Module(wasmTextToBinary(code)), {
  imports: {
    mem0: new WebAssembly.Memory({ initial: 1, maximum: 1, address: "i32" }),
    mem1: new WebAssembly.Memory({ initial: 1, maximum: 1, address: "i32" }),
  },
});
v2.exports.w0();
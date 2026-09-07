// |jit-test| --fast-warmup

const code = `
(module
  (memory 2 10 shared)
  (export "mem" (memory 0))

  (func (export "cas") (param i32 i32 i32) (result i32)
    local.get 0  local.get 1  local.get 2
    i32.atomic.rmw.cmpxchg offset=8192)

  (func (export "add") (param i32 i32) (result i32)
    local.get 0  local.get 1
    i32.atomic.rmw.add offset=8192)

  (func (export "store") (param i32 i32)
    local.get 0  local.get 1
    i32.atomic.store offset=8192)

  (func (export "load") (param i32) (result i32)
    local.get 0
    i32.atomic.load offset=8192)

  (func (export "xchg") (param i32 i32) (result i32)
    local.get 0  local.get 1
    i32.atomic.rmw.xchg offset=8192)
)`;

const mod = new WebAssembly.Module(wasmTextToBinary(code));
const inst = new WebAssembly.Instance(mod);

inst.exports.store(0, 0);
const loaded = inst.exports.load(0);
assertEq(loaded, 0);
const add_old = inst.exports.add(0, 1);
assertEq(add_old, 0);
const cas_old = inst.exports.cas(0, 1, 2);
assertEq(cas_old, 1);
const xchg_old = inst.exports.xchg(0, 0);
assertEq(xchg_old, 2);

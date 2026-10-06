// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Stress test for ContStackAllocator. Drives a deterministic mix of
// newborn/suspended cont allocation, mid-stack stepping, resume-to-completion
// freeing, drop-to-GC freeing, and GC purges over many iterations to exercise
// arena fill, free-list reuse, multi-arena allocation, and GC purge paths.

const ITERATIONS = 10000;
// The maximum number of live stacks.
const POOL_SIZE = 32;

const { init, makeNewbornAt, makeSuspendedAt, stepAt, finishAt, dropAt } =
  wasmEvalText(`(module
    (type $ft  (func))
    (type $ct  (cont $ft))
    (type $arr (array (mut (ref null $ct))))
    (tag $tag)
    (global $pool (mut (ref null $arr)) (ref.null $arr))

    (func $g (type $ft))

    (func $f (type $ft)
      suspend $tag
      suspend $tag
      suspend $tag
    )
    (elem declare func $g $f)

    (func (export "init") (param $size i32)
      (global.set $pool (array.new_default $arr (local.get $size)))
    )

    (func (export "makeNewbornAt") (param $slot i32)
      (array.set $arr
        (global.get $pool)
        (local.get $slot)
        (cont.new $ct (ref.func $g)))
    )

    (func (export "makeSuspendedAt") (param $slot i32)
      (local $captured (ref null $ct))
      (block (result (ref $ct))
        (cont.new $ct (ref.func $f))
        resume $ct (on $tag 0)
        unreachable
      )
      local.set $captured
      (array.set $arr
        (global.get $pool)
        (local.get $slot)
        (local.get $captured))
    )

    (func (export "stepAt") (param $slot i32) (result i32)
      (local $k (ref null $ct))
      (local $next (ref null $ct))
      (local.set $k
        (array.get $arr (global.get $pool) (local.get $slot)))
      (if (ref.is_null (local.get $k))
        (then (return (i32.const 0))))
      (block (result (ref $ct))
        (local.get $k)
        ref.as_non_null
        resume $ct (on $tag 0)
        ;; cont ran to completion: clear slot and return 0
        (array.set $arr (global.get $pool) (local.get $slot) (ref.null $ct))
        (return (i32.const 0))
      )
      local.set $next
      (array.set $arr
        (global.get $pool)
        (local.get $slot)
        (local.get $next))
      (i32.const 1)
    )

    (func (export "finishAt") (param $slot i32)
      (local $k (ref null $ct))
      (local.set $k
        (array.get $arr (global.get $pool) (local.get $slot)))
      (if (ref.is_null (local.get $k))
        (then (return)))
      (array.set $arr (global.get $pool) (local.get $slot) (ref.null $ct))
      (loop $drain
        (block $caught (result (ref $ct))
          (local.get $k)
          ref.as_non_null
          resume $ct (on $tag $caught)
          return
        )
        local.set $k
        br $drain
      )
    )

    (func (export "dropAt") (param $slot i32)
      (array.set $arr (global.get $pool) (local.get $slot) (ref.null $ct))
    )
  )`).exports;

init(POOL_SIZE);

// Deterministic 32-bit LCG so the operation sequence is reproducible.
let s = 0x12345678;
function rnd() {
  s = (Math.imul(s, 1103515245) + 12345) | 0;
  return s >>> 0;
}

let commands = [
  {
    chance: 20,
    run: (slot) => makeNewbornAt(slot),
    executions: 0,
    expectedExecutions: 2048,
  },
  {
    chance: 30,
    run: (slot) => makeSuspendedAt(slot),
    executions: 0,
    expectedExecutions: 3009,
  },
  {
    chance: 20,
    run: (slot) => stepAt(slot),
    executions: 0,
    expectedExecutions: 1923,
  },
  {
    chance: 15,
    run: (slot) => finishAt(slot),
    executions: 0,
    expectedExecutions: 1614,
  },
  {
    chance: 10,
    run: (slot) => dropAt(slot),
    executions: 0,
    expectedExecutions: 1012,
  },
  {
    chance: 3,
    run: (slot) => minorgc(),
    executions: 0,
    expectedExecutions: 185,
  },
  {
    chance: 2,
    run: (slot) => gc(),
    executions: 0,
    expectedExecutions: 209,
  },
];

// All commands must add up to 100%
let totalChance = 0;
for (let command of commands) {
  totalChance += command.chance;
}
assertEq(totalChance, 100);

// Run a fixed amount of iterations and run random commands.
for (let i = 0; i < ITERATIONS; i++) {
  let slot = rnd() % POOL_SIZE;
  let r = rnd() % 100;

  for (let commandIndex in commands) {
    let command = commands[commandIndex];
    if (r < command.chance) {
      command.run(slot);
      command.executions += 1;
      break;
    }
    r -= command.chance;
  }
}

// Uncomment this to get the execution counts for if they change.
// for (let command of commands) {
//   print(command.executions);
// }

for (let command of commands) {
  assertEq(command.executions, command.expectedExecutions);
}

/* Copyright 2021 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// ./test/core/compact-import-section/imports-compact.wast

// ./test/core/compact-import-section/imports-compact.wast:3
let $0 = instantiate(`(module
  (func (export "func->11i") (result i32) (i32.const 11))
  (func (export "func->22f") (result f32) (f32.const 22))
  (global (export "global->1") i32 (i32.const 1))
  (global (export "global->20") i32 (i32.const 20))
  (global (export "global->300") i32 (i32.const 300))
  (global (export "global->4000") i32 (i32.const 4000))
)`);

// ./test/core/compact-import-section/imports-compact.wast:11
register($0, `test`);

// ./test/core/compact-import-section/imports-compact.wast:16
let $1 = instantiate(`(module
  (import "test"
    (item "func->11i" (func (result i32)))
    (item "func->22f" (func (result f32)))
  )
  (import "test"
    (item "global->1")
    (item "global->20")
    (item "global->300")
    (item "global->4000")
    (global i32)
  )

  (global i32 (i32.const 50000))

  (func (export "sum1") (result i32)
    (local i32)

    call 0
    (i32.trunc_f32_s (call 1))
    i32.add
  )
  (func (export "sum2") (result i32)
    (local i32)

    global.get 0
    global.get 1
    global.get 2
    global.get 3
    i32.add
    i32.add
    i32.add
  )

  ;; Tests that indices were tracked correctly
  (func (export "sum3") (result i32)
    call 2 ;; sum1
    call 3 ;; sum2
    i32.add

    global.get 4
    i32.add
  )
)`);

// ./test/core/compact-import-section/imports-compact.wast:61
assert_return(() => invoke($1, `sum1`, []), [value("i32", 33)]);

// ./test/core/compact-import-section/imports-compact.wast:62
assert_return(() => invoke($1, `sum2`, []), [value("i32", 4321)]);

// ./test/core/compact-import-section/imports-compact.wast:63
assert_return(() => invoke($1, `sum3`, []), [value("i32", 54354)]);

// ./test/core/compact-import-section/imports-compact.wast:65
let $2 = instantiate(`(module (import "test" (item "func->11i" (func (result i32)))))`);

// ./test/core/compact-import-section/imports-compact.wast:66
assert_unlinkable(
  () => instantiate(`(module (import "test" (item "unknown" (func (result i32)))))`),
  `unknown import`,
);

// ./test/core/compact-import-section/imports-compact.wast:70
assert_unlinkable(
  () => instantiate(`(module (import "test" (item "func->11i" (func (result i32))) (item "unknown" (func (result i32)))))`),
  `unknown import`,
);

// ./test/core/compact-import-section/imports-compact.wast:75
let $3 = instantiate(`(module (import "test" (item "func->11i") (func (result i32))))`);

// ./test/core/compact-import-section/imports-compact.wast:76
assert_unlinkable(
  () => instantiate(`(module (import "test" (item "unknown") (func (result i32))))`),
  `unknown import`,
);

// ./test/core/compact-import-section/imports-compact.wast:80
assert_unlinkable(
  () => instantiate(`(module (import "test" (item "func->11i") (item "unknown") (func (result i32))))`),
  `unknown import`,
);

// ./test/core/compact-import-section/imports-compact.wast:85
assert_unlinkable(
  () => instantiate(`(module (import "test" (item "func->11i" (func))))`),
  `incompatible import type`,
);

// ./test/core/compact-import-section/imports-compact.wast:89
assert_unlinkable(
  () => instantiate(`(module (import "test" (item "func->11i" (func (result i32))) (item "func->22f" (func))))`),
  `incompatible import type`,
);

// ./test/core/compact-import-section/imports-compact.wast:94
assert_unlinkable(
  () => instantiate(`(module (import "test" (item "func->11i") (item "func->22f") (func (result i32))))`),
  `incompatible import type`,
);

// ./test/core/compact-import-section/imports-compact.wast:102
let $4 = instantiate(`(module
  (import "test" "func->11i" (func \$f11i (result i32)))
  (import "test"
    (item "global->1" (global \$g1 i32))
    (item "global->20" (global \$g20 i32))
  )
  ;; Shared-type form does not allow identifiers

  (func (export "sum") (result i32)
    call \$f11i
    global.get \$g1
    global.get \$g20
    i32.add
    i32.add
  )
)`);

// ./test/core/compact-import-section/imports-compact.wast:119
assert_return(() => invoke($4, `sum`, []), [value("i32", 32)]);

// ./test/core/compact-import-section/imports-compact.wast:121
assert_malformed(
  () => instantiate(`(import "test" (item "foo") (func \$foo)) `),
  `identifier not allowed`,
);

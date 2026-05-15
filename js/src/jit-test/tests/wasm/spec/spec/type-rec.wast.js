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

// ./test/core/type-rec.wast

// ./test/core/type-rec.wast:3
let $0 = instantiate(`(module
  (type (func (param (ref 0)) (result (ref 0))))
  (rec
    (type (func (param (ref 2))))
    (type (func (result (ref 1))))
  )

  (rec)
  (rec (type (func)))
  (rec (type \$t (func)))
  (rec (type \$t1 (func)) (type (func)) (type \$t2 (func)))
  (rec (type \$g (func (param (ref \$g)) (result (ref \$g)))))
  (rec
    (type \$h (func (param (ref \$k))))
    (type \$k (func (result (ref \$h))))
  )
)`);

// ./test/core/type-rec.wast:21
assert_invalid(
  () => instantiate(`(module
    (type (func (param (ref 1))))
    (type (func))
  )`),
  `unknown type`,
);

// ./test/core/type-rec.wast:28
assert_invalid(
  () => instantiate(`(module
    (rec (type (func (param (ref 1)))))
    (rec (type (func)))
  )`),
  `unknown type`,
);

// ./test/core/type-rec.wast:39
let $1 = instantiate(`(module
  (rec (type \$ft (func)) (type (struct)))
  (func \$f (type \$ft))
  (global (ref \$ft) (ref.func \$f))
)`);

// ./test/core/type-rec.wast:45
let $2 = instantiate(`(module
  (rec (type \$ft (func)))
  (func \$f)  ;; the implicit type of \$f is \$ft
  (global (ref \$ft) (ref.func \$f))
)`);

// ./test/core/type-rec.wast:51
assert_invalid(
  () => instantiate(`(module
    (rec (type \$ft (func)) (type (func)))
    (func \$f)  ;; the implicit type of \$f is not \$ft
    (global (ref \$ft) (ref.func \$f))
  )`),
  `type mismatch`,
);

// ./test/core/type-rec.wast:59
assert_invalid(
  () => instantiate(`(module
    (rec (type (func)) (type \$ft (func)))
    (func \$f)  ;; the implicit type of \$f is not \$ft
    (global (ref \$ft) (ref.func \$f))
  )`),
  `type mismatch`,
);

// ./test/core/type-rec.wast:71
let $3 = instantiate(`(module
  (rec (type \$f1 (func)) (type (struct (field (ref \$f1)))))
  (rec (type \$f2 (func)) (type (struct (field (ref \$f2)))))
  (func \$f (type \$f2))
  (global (ref \$f1) (ref.func \$f))
)`);

// ./test/core/type-rec.wast:78
let $4 = instantiate(`(module
  (rec (type \$f1 (func)) (type (struct (field (ref \$f1)))))
  (rec (type \$f2 (func)) (type (struct (field (ref \$f2)))))
  (rec
    (type \$g1 (func))
    (type (struct (field (ref \$f1) (ref \$f1) (ref \$f2) (ref \$f2) (ref \$g1))))
  )
  (rec
    (type \$g2 (func))
    (type (struct (field (ref \$f1) (ref \$f2) (ref \$f1) (ref \$f2) (ref \$g2))))
  )
  (func \$g (type \$g2))
  (global (ref \$g1) (ref.func \$g))
)`);

// ./test/core/type-rec.wast:93
assert_invalid(
  () => instantiate(`(module
    (rec (type \$f1 (func)) (type (struct (field (ref \$f1)))))
    (rec (type \$f2 (func)) (type (struct (field (ref \$f1)))))
    (func \$f (type \$f2))
    (global (ref \$f1) (ref.func \$f))
  )`),
  `type mismatch`,
);

// ./test/core/type-rec.wast:103
assert_invalid(
  () => instantiate(`(module
    (rec (type \$f0 (func)) (type (struct (field (ref \$f0)))))
    (rec (type \$f1 (func)) (type (struct (field (ref \$f0)))))
    (rec (type \$f2 (func)) (type (struct (field (ref \$f1)))))
    (func \$f (type \$f2))
    (global (ref \$f1) (ref.func \$f))
  )`),
  `type mismatch`,
);

// ./test/core/type-rec.wast:114
assert_invalid(
  () => instantiate(`(module
    (rec (type \$f1 (func)) (type (struct)))
    (rec (type (struct)) (type \$f2 (func)))
    (global (ref \$f1) (ref.func \$f))
    (func \$f (type \$f2))
  )`),
  `type mismatch`,
);

// ./test/core/type-rec.wast:124
assert_invalid(
  () => instantiate(`(module
    (rec (type \$f1 (func)) (type (struct)))
    (rec (type \$f2 (func)) (type (struct)) (type (func)))
    (global (ref \$f1) (ref.func \$f))
    (func \$f (type \$f2))
  )`),
  `type mismatch`,
);

// ./test/core/type-rec.wast:137
let $5 = instantiate(`(module \$M
  (rec (type \$f1 (func)) (type (struct)))
  (func (export "f") (type \$f1))
)`);
let $M = $5;

// ./test/core/type-rec.wast:141
register($M, `M`);

// ./test/core/type-rec.wast:143
let $6 = instantiate(`(module
  (rec (type \$f2 (func)) (type (struct)))
  (func (import "M" "f") (type \$f2))
)`);

// ./test/core/type-rec.wast:148
assert_unlinkable(
  () => instantiate(`(module
    (rec (type (struct)) (type \$f2 (func)))
    (func (import "M" "f") (type \$f2))
  )`),
  `incompatible import type`,
);

// ./test/core/type-rec.wast:156
assert_unlinkable(
  () => instantiate(`(module
    (rec (type \$f2 (func)))
    (func (import "M" "f") (type \$f2))
  )`),
  `incompatible import type`,
);

// ./test/core/type-rec.wast:167
let $7 = instantiate(`(module
  (rec (type \$f1 (func)) (type (struct)))
  (rec (type \$f2 (func)) (type (struct)))
  (table funcref (elem \$f1))
  (func \$f1 (type \$f1))
  (func (export "run") (call_indirect (type \$f2) (i32.const 0)))
)`);

// ./test/core/type-rec.wast:174
assert_return(() => invoke($7, `run`, []), []);

// ./test/core/type-rec.wast:176
let $8 = instantiate(`(module
  (rec (type \$f1 (func)) (type (struct)))
  (rec (type (struct)) (type \$f2 (func)))
  (table funcref (elem \$f1))
  (func \$f1 (type \$f1))
  (func (export "run") (call_indirect (type \$f2) (i32.const 0)))
)`);

// ./test/core/type-rec.wast:183
assert_trap(() => invoke($8, `run`, []), `indirect call type mismatch`);

// ./test/core/type-rec.wast:185
let $9 = instantiate(`(module
  (rec (type \$f1 (func)) (type (struct)))
  (rec (type \$f2 (func)))
  (table funcref (elem \$f1))
  (func \$f1 (type \$f1))
  (func (export "run") (call_indirect (type \$f2) (i32.const 0)))
)`);

// ./test/core/type-rec.wast:192
assert_trap(() => invoke($9, `run`, []), `indirect call type mismatch`);

// ./test/core/type-rec.wast:197
let $10 = instantiate(`(module
  (rec (type \$s (struct)))
  (rec (type \$t (func (param (ref \$s)))))
  (func \$f (param (ref \$s)))  ;; okay, type is equivalent to \$t
  (global (ref \$t) (ref.func \$f))
)`);

// ./test/core/type-rec.wast:204
assert_invalid(
  () => instantiate(`(module
    (rec
      (type \$s (struct))
      (type \$t (func (param (ref \$s))))
    )
    (func \$f (param (ref \$s)))  ;; type is not equivalent to \$t
    (global (ref \$t) (ref.func \$f))
  )`),
  `type mismatch`,
);

// ./test/core/type-rec.wast:216
assert_invalid(
  () => instantiate(`(module
    (rec
      (type (struct))
      (type \$t (func))
    )
    (func \$f)  ;; type is not equivalent to \$t
    (global (ref \$t) (ref.func \$f))
  )`),
  `type mismatch`,
);

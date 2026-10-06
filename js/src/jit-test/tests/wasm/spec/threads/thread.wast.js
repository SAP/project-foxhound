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

// ./test/core/threads/thread.wast

// ./test/core/threads/thread.wast:1
let $0 = instantiate(`(module \$Mem
  (memory (export "shared") 1 1 shared)
)`);
let $Mem = $0;

// ./test/core/threads/thread.wast:4
register($0, `mem_1`);

// ./test/core/threads/thread.wast:6
let $T1 = new Thread($Mem, "$Mem", `

// ./test/core/threads/thread.wast:7:3
register(\$Mem, \`mem\`);

// ./test/core/threads/thread.wast:8:3
let \$1 = instantiate(\`(module
    (memory (import "mem" "shared") 1 1 shared)
    (func (export "run")
      (i32.store (i32.const 0) (i32.const 42))
    )
  )\`);

// ./test/core/threads/thread.wast:14:3
invoke(\$1, \`run\`, []);
`);

// ./test/core/threads/thread.wast:17
let $T2 = new Thread($Mem, "$Mem", `

// ./test/core/threads/thread.wast:18:3
register(\$Mem, \`mem\`);

// ./test/core/threads/thread.wast:19:3
let \$2 = instantiate(\`(module
    (memory (import "mem" "shared") 1 1 shared)
    (func (export "run") (result i32)
      (i32.load (i32.const 0))
    )
  )\`);

// ./test/core/threads/thread.wast:25:3
assert_return(() => invoke(\$2, \`run\`, []), [either(value("i32", 0), value("i32", 42))]);
`);

// ./test/core/threads/thread.wast:28
$T1.wait();

// ./test/core/threads/thread.wast:29
$T2.wait();

// ./test/core/threads/thread.wast:32
let $3 = instantiate(`(module (memory (import "mem_1" "shared") 1 1 shared))`);

// ./test/core/threads/thread.wast:34
assert_unlinkable(
  () => instantiate(`(module (memory (import "mem" "shared") 1 1 shared))`),
  `unknown import`,
);

// ./test/core/threads/thread.wast:39
register($Mem, `mem`);

// ./test/core/threads/thread.wast:41
let $T3 = new Thread(null, "__nomodule", `

// ./test/core/threads/thread.wast:42:3
assert_unlinkable(
  () => instantiate(\`(module (memory (import "mem" "shared") 1 1 shared))\`),
  \`unknown import\`,
);
`);

// ./test/core/threads/thread.wast:48
$T3.wait();

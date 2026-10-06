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

// ./test/core/threads/simple.wast

// ./test/core/threads/simple.wast:1
let $0 = instantiate(`(module \$Mem
  (memory (export "shared") 1 1 shared)
)`);
let $Mem = $0;

// ./test/core/threads/simple.wast:4
register($0, `mem`);

// ./test/core/threads/simple.wast:6
let $T1 = new Thread($Mem, "$Mem", `

// ./test/core/threads/simple.wast:7:3
register(\$Mem, \`mem\`);

// ./test/core/threads/simple.wast:8:3
let \$1 = instantiate(\`(module
    (memory (import "mem" "shared") 1 1 shared)
    (func (export "run")
      (i32.atomic.store (i32.const 0) (i32.const 1))
    )
  )\`);

// ./test/core/threads/simple.wast:14:3
invoke(\$1, \`run\`, []);
`);

// ./test/core/threads/simple.wast:18
$T1.wait();

// ./test/core/threads/simple.wast:20
let $2 = instantiate(`(module \$Check
  (memory (import "mem" "shared") 1 1 shared)

  (func (export "check") (result i32)
    (i32.load (i32.const 0))
    (return)
  )
)`);
let $Check = $2;

// ./test/core/threads/simple.wast:29
assert_return(() => invoke($Check, `check`, []), [value("i32", 1)]);

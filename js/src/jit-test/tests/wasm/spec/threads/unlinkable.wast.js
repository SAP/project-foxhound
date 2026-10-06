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

// ./test/core/threads/unlinkable.wast

// ./test/core/threads/unlinkable.wast:1
let $0 = instantiate(`(module \$Mem
  (memory (export "shared") 1 1 shared)
)`);
let $Mem = $0;

// ./test/core/threads/unlinkable.wast:5
let $T2 = new Thread(null, "__nomodule", `

// ./test/core/threads/unlinkable.wast:6:3
assert_unlinkable(
  () => instantiate(\`(module (memory (import "mem" "shared") 1 1 shared))\`),
  \`unknown import\`,
);
`);

// ./test/core/threads/unlinkable.wast:12
$T2.wait();

// ./test/core/threads/unlinkable.wast:14
let $T4 = new Thread($Mem, "$Mem", `

// ./test/core/threads/unlinkable.wast:15:3
assert_unlinkable(
  () => instantiate(\`(module (memory (import "mem" "shared") 1 1 shared))\`),
  \`unknown import\`,
);
`);

// ./test/core/threads/unlinkable.wast:21
$T4.wait();

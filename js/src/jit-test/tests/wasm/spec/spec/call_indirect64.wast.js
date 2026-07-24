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

// ./test/core/memory64/call_indirect64.wast

// ./test/core/memory64/call_indirect64.wast:3
let $0 = instantiate(`(module
  ;; Auxiliary definitions
  (type \$out-i32 (func (result i32)))

  (func \$const-i32 (type \$out-i32) (i32.const 0x132))

  (table \$t64 i64 funcref
    (elem \$const-i32)
  )

  ;; Syntax

  (func
    (call_indirect \$t64 (i64.const 0))
  )

  ;; Typing

  (func (export "type-i32-t64") (result i32)
    (call_indirect \$t64 (type \$out-i32) (i64.const 0))
  )
)`);

// ./test/core/memory64/call_indirect64.wast:26
assert_return(() => invoke($0, `type-i32-t64`, []), [value("i32", 306)]);

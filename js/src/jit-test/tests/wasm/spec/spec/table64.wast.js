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

// ./test/core/memory64/table64.wast

// ./test/core/memory64/table64.wast:1
let $0 = instantiate(`(module (table i64 0 funcref))`);

// ./test/core/memory64/table64.wast:2
let $1 = instantiate(`(module (table i64 1 funcref))`);

// ./test/core/memory64/table64.wast:3
let $2 = instantiate(`(module (table i64 0 0 funcref))`);

// ./test/core/memory64/table64.wast:4
let $3 = instantiate(`(module (table i64 0 1 funcref))`);

// ./test/core/memory64/table64.wast:5
let $4 = instantiate(`(module (table i64 1 256 funcref))`);

// ./test/core/memory64/table64.wast:6
let $5 = instantiate(`(module (table i64 0 65536 funcref))`);

// ./test/core/memory64/table64.wast:7
let $6 = instantiate(`(module (table i64 0 0xffff_ffff funcref))`);

// ./test/core/memory64/table64.wast:8
let $7 = instantiate(`(module (table i64 0 0x1_0000_0000 funcref))`);

// ./test/core/memory64/table64.wast:9
let _anon_8 = module(`(module (table i64 0xffff_ffff_ffff_ffff funcref))`);

// ./test/core/memory64/table64.wast:10
let $8 = instantiate(`(module (table i64 0 0xffff_ffff_ffff_ffff funcref))`);

// ./test/core/memory64/table64.wast:12
let $9 = instantiate(`(module (table i64 0 funcref) (table i64 0 funcref))`);

// ./test/core/memory64/table64.wast:13
let $10 = instantiate(`(module (table (import "spectest" "table64") i64 0 funcref) (table i64 0 funcref))`);

// ./test/core/memory64/table64.wast:15
assert_invalid(
  () => instantiate(`(module (table i64 1 0 funcref))`),
  `size minimum must not be greater than maximum`,
);

// ./test/core/memory64/table64.wast:19
assert_invalid(
  () => instantiate(`(module (table i64 0xffff_ffff 0 funcref))`),
  `size minimum must not be greater than maximum`,
);

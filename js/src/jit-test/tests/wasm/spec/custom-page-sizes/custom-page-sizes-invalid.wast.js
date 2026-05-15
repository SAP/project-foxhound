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

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:2
assert_malformed(
  () => instantiate(`(memory 0 (pagesize 3)) `),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:7
assert_malformed(
  () => instantiate(`(memory 0 (pagesize 0)) `),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:13
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 2)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:17
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 4)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:21
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 8)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:25
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 16)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:29
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 32)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:33
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 64)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:37
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 128)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:41
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 256)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:45
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 512)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:49
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 1024)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:53
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 2048)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:57
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 4096)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:61
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 8192)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:65
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 16384)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:69
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 32768)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:75
assert_invalid(
  () => instantiate(`(module (memory 0 (pagesize 0x20000)))`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:82
assert_malformed(
  () => instantiate(`(module binary
    "\\00asm" "\\01\\00\\00\\00"
    "\\05\\04\\01"                ;; Memory section

    ;; memory 0
    "\\08"                      ;; flags w/ custom page size
    "\\00"                      ;; minimum = 0
    "\\41"                      ;; pagesize = 2**65
  )`),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:97
let $0 = instantiate(`(module \$m
  (memory (export "small-pages-memory") 0 (pagesize 1))
  (memory (export "large-pages-memory") 0 (pagesize 65536))
)`);
let $m = $0;

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:101
register($m, `m`);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:103
assert_unlinkable(
  () => instantiate(`(module
    (memory (import "m" "small-pages-memory") 0 (pagesize 65536))
  )`),
  `memory types incompatible`,
);

// ./test/core/custom-page-sizes/custom-page-sizes-invalid.wast:110
assert_unlinkable(
  () => instantiate(`(module
    (memory (import "m" "large-pages-memory") 0 (pagesize 1))
  )`),
  `memory types incompatible`,
);

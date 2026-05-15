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

// ./test/core/memory64/binary_leb128_64.wast

// ./test/core/memory64/binary_leb128_64.wast:1
let $0 = instantiate(`(module binary
  "\\00asm" "\\01\\00\\00\\00"
  "\\01\\04\\01\\60\\00\\00"             ;; Type section
  "\\03\\02\\01\\00"                   ;; Function section
  "\\05\\03\\01\\04\\00"                ;; Memory section (flags: i64)
  "\\0a\\13\\01"                      ;; Code section
  ;; function 0
  "\\11\\00"                         ;; local type count
  "\\42\\00"                         ;; i64.const 0
  "\\28"                            ;; i32.load
  "\\02"                            ;; alignment 2
  "\\ff\\ff\\ff\\ff\\ff\\ff\\ff\\ff\\ff\\01" ;; offset 2^64 - 1
  "\\1a"                            ;; drop
  "\\0b"                            ;; end
)`);

// ./test/core/memory64/binary_leb128_64.wast:16
assert_malformed(
  () => instantiate(`(module binary
    "\\00asm" "\\01\\00\\00\\00"
    "\\01\\04\\01\\60\\00\\00"             ;; Type section
    "\\03\\02\\01\\00"                   ;; Function section
    "\\05\\03\\01\\04\\00"                ;; Memory section (flags: i64)
    "\\0a\\13\\01"                      ;; Code section
    ;; function 0
    "\\11\\00"                         ;; local type count
    "\\42\\00"                         ;; i64.const 0
    "\\28"                            ;; i32.load
    "\\02"                            ;; alignment 2
    "\\ff\\ff\\ff\\ff\\ff\\ff\\ff\\ff\\ff\\02" ;; offset 2^64 (one unused bit set)
    "\\1a"                            ;; drop
    "\\0b"                            ;; end
  )`),
  `integer too large`,
);

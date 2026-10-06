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

// ./test/core/compact-import-section/binary-compact-imports.wast

// ./test/core/compact-import-section/binary-compact-imports.wast:3
let $0 = instantiate(`(module
  (func (export "b") (result i32) (i32.const 0x0f))
  (func (export "c") (result i32) (i32.const 0xf0))
)`);

// ./test/core/compact-import-section/binary-compact-imports.wast:7
register($0, `a`);

// ./test/core/compact-import-section/binary-compact-imports.wast:8
let $1 = instantiate(`(module
  (func (export "") (result i32) (i32.const 0xab))
)`);

// ./test/core/compact-import-section/binary-compact-imports.wast:11
register($1, ``);

// ./test/core/compact-import-section/binary-compact-imports.wast:16
let $2 = instantiate(`(module binary
  "\\00asm" "\\01\\00\\00\\00"
  "\\01\\05\\01\\60\\00\\01\\7f"     ;; Type section: (type (func (result i32)))
  "\\02\\13"                    ;; Import section
  "\\02"                       ;;   2 groups
  "\\01x"                      ;;     "x"
  "\\00" "\\7f"                 ;;       "" + 0x7f (compact encoding 1)
  "\\00"                       ;;       0 items
  "\\01a"                      ;;     "a"
  "\\00" "\\7f"                 ;;       "" + 0x7f (compact encoding 1)
  "\\02"                       ;;       2 items
  "\\01b" "\\00\\00"             ;;         "b" (func (type 0))
  "\\01c" "\\00\\00"             ;;         "c" (func (type 0))
  "\\03\\02" "\\01"              ;; Function section, 1 func
  "\\00"                       ;;   func 2: type 0
  "\\07\\08" "\\01"              ;; Export section, 1 export
  "\\04test" "\\00\\02"          ;;   "test" func 2
  "\\0a\\09" "\\01"              ;; Code section, 1 func
  "\\07" "\\00"                 ;;   len, 0 locals
  "\\10\\00"                    ;;   call 0
  "\\10\\01"                    ;;   call 1
  "\\6a"                       ;;   i32.add
  "\\0b"                       ;;   end
)`);

// ./test/core/compact-import-section/binary-compact-imports.wast:40
assert_return(() => invoke($2, `test`, []), [value("i32", 255)]);

// ./test/core/compact-import-section/binary-compact-imports.wast:42
let $3 = instantiate(`(module binary
  "\\00asm" "\\01\\00\\00\\00"
  "\\01\\05\\01\\60\\00\\01\\7f"     ;; Type section: (type (func (result i32)))
  "\\02\\13"                    ;; Import section
  "\\02"                       ;;   2 groups
  "\\01x"                      ;;     "x"
  "\\00" "\\7e"                 ;;       "" + 0x7e (compact encoding 2)
  "\\00\\00"                    ;;       (func (type 0))
  "\\00"                       ;;       0 items
  "\\01a"                      ;;     "a"
  "\\00" "\\7e"                 ;;       "" + 0x7e (compact encoding 2)
  "\\00\\00"                    ;;       (func (type 0))
  "\\02"                       ;;       2 items
  "\\01b"                      ;;         "b"
  "\\01c"                      ;;         "c"
  "\\03\\02" "\\01"              ;; Function section, 1 func
  "\\00"                       ;;   func 2: type 0
  "\\07\\08" "\\01"              ;; Export section, 1 export
  "\\04test" "\\00\\02"          ;;   "test" func 2
  "\\0a\\09" "\\01"              ;; Code section, 1 func
  "\\07" "\\00"                 ;;   len, 0 locals
  "\\10\\00"                    ;;   call 0
  "\\10\\01"                    ;;   call 1
  "\\6a"                       ;;   i32.add
  "\\0b"                       ;;   end
)`);

// ./test/core/compact-import-section/binary-compact-imports.wast:68
assert_return(() => invoke($3, `test`, []), [value("i32", 255)]);

// ./test/core/compact-import-section/binary-compact-imports.wast:73
let $4 = instantiate(`(module binary
  "\\00asm" "\\01\\00\\00\\00"
  "\\01\\05\\01\\60\\00\\01\\7f"     ;; Type section: (type (func (result i32)))
  "\\02\\11"                    ;; Import section
  "\\01"                       ;;   1 group
  "\\01a"                      ;;     "a"
  "\\80\\80\\80\\00" "\\7f"        ;;     "" (long encoding) + 0x7f
  "\\02"                       ;;     2 items
  "\\01b" "\\00\\00"             ;;       "b" (func (type 0))
  "\\01c" "\\00\\00"             ;;       "c" (func (type 0))
)`);

// ./test/core/compact-import-section/binary-compact-imports.wast:84
let $5 = instantiate(`(module binary
  "\\00asm" "\\01\\00\\00\\00"
  "\\01\\05\\01\\60\\00\\01\\7f"     ;; Type section: (type (func (result i32)))
  "\\02\\0f"                    ;; Import section
  "\\01"                       ;;   1 group
  "\\01a"                      ;;     "a"
  "\\80\\80\\80\\00" "\\7e"        ;;     "" (long encoding) + 0x7e
  "\\00\\00"                    ;;     (func (type 0))
  "\\02"                       ;;     2 items
  "\\01b"                      ;;       "b"
  "\\01c"                      ;;       "c"
)`);

// ./test/core/compact-import-section/binary-compact-imports.wast:100
assert_malformed(
  () => instantiate(`(module binary
    "\\00asm" "\\01\\00\\00\\00"
    "\\01\\05\\01\\60\\00\\01\\7f"   ;; Type section: (type (func (result i32)))
    "\\02\\12"                  ;; Import section
    "\\01"                     ;;   1 group
    "\\01a"                    ;;     "a"
    "\\01b" "\\7f"              ;;     "b" + 0x7f
    "\\02"                     ;;     2 items
    "\\01b" "\\00\\00"           ;;       "b" (func (type 0))
    "\\01c" "\\00\\00"           ;;       "c" (func (type 0))
  )`),
  `malformed import kind`,
);

// ./test/core/compact-import-section/binary-compact-imports.wast:114
assert_malformed(
  () => instantiate(`(module binary
    "\\00asm" "\\01\\00\\00\\00"
    "\\01\\05\\01\\60\\00\\01\\7f"   ;; Type section: (type (func (result i32)))
    "\\02\\10"                  ;; Import section
    "\\01"                     ;;   1 group
    "\\01a"                    ;;     "a"
    "\\01b" "\\7e"              ;;     "" + 0x7e (long encoding)
    "\\00\\00"                  ;;     (func (type 0))
    "\\02"                     ;;     2 items
    "\\01b"                    ;;       "b"
    "\\01c"                    ;;       "c"
  )`),
  `malformed import kind`,
);

// ./test/core/compact-import-section/binary-compact-imports.wast:133
assert_malformed(
  () => instantiate(`(module binary
    "\\00asm" "\\01\\00\\00\\00"
    "\\01\\05\\01\\60\\00\\01\\7f"   ;; Type section: (type (func (result i32)))
    "\\02\\11"                  ;; Import section
    "\\01"                     ;;   1 group
    "\\01a"                    ;;     "a"
    "\\00\\ff\\80\\80\\00"         ;;     "" + 0x7f (long encoding)
    "\\02"                     ;;     2 items
    "\\01b" "\\00\\00"           ;;       "b" (func (type 0))
    "\\01c" "\\00\\00"           ;;       "c" (func (type 0))
  )`),
  `malformed import kind`,
);

// ./test/core/compact-import-section/binary-compact-imports.wast:147
assert_malformed(
  () => instantiate(`(module binary
    "\\00asm" "\\01\\00\\00\\00"
    "\\01\\05\\01\\60\\00\\01\\7f"   ;; Type section: (type (func (result i32)))
    "\\02\\0f"                  ;; Import section
    "\\01"                     ;;   1 group
    "\\01a"                    ;;     "a"
    "\\00\\fe\\80\\80\\00"         ;;     "" + 0x7e (long encoding)
    "\\00\\00"                  ;;     (func (type 0))
    "\\02"                     ;;     2 items
    "\\01b"                    ;;       "b"
    "\\01c"                    ;;       "c"
  )`),
  `malformed import kind`,
);

// ./test/core/compact-import-section/binary-compact-imports.wast:166
let $6 = instantiate(`(module binary
  "\\00asm" "\\01\\00\\00\\00"
  "\\01\\05\\01\\60\\00\\01\\7f"     ;; Type section: (type (func (result i32)))
  "\\02\\05"                    ;; Import section
  "\\01"                       ;;   1 group
  "\\00\\00\\00\\00"              ;;     "" "" (func (type 0))
  "\\03\\02" "\\01"              ;; Function section, 1 func
  "\\00"                       ;;   func 1: type 0
  "\\07\\08" "\\01"              ;; Export section, 1 export
  "\\04test" "\\00\\01"          ;;   "test" func 1
  "\\0a\\06" "\\01"              ;; Code section, 1 func
  "\\04" "\\00"                 ;;   len, 0 locals
  "\\10\\00"                    ;;   call 0
  "\\0b"                       ;;   end
)`);

// ./test/core/compact-import-section/binary-compact-imports.wast:181
assert_return(() => invoke($6, `test`, []), [value("i32", 171)]);

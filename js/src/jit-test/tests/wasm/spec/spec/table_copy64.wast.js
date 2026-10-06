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

// ./test/core/memory64/table_copy64.wast

// ./test/core/memory64/table_copy64.wast:6
let $0 = instantiate(`(module
  (func (export "ef0") (result i32) (i32.const 0))
  (func (export "ef1") (result i32) (i32.const 1))
  (func (export "ef2") (result i32) (i32.const 2))
  (func (export "ef3") (result i32) (i32.const 3))
  (func (export "ef4") (result i32) (i32.const 4))
)`);

// ./test/core/memory64/table_copy64.wast:13
register($0, `a`);

// ./test/core/memory64/table_copy64.wast:15
let $1 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t0) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t1) (i32.const 3) func 1 3 1 4)
  (elem (table \$t1) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (nop))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:45
invoke($1, `test`, []);

// ./test/core/memory64/table_copy64.wast:46
assert_trap(() => invoke($1, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:47
assert_trap(() => invoke($1, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:48
assert_return(() => invoke($1, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:49
assert_return(() => invoke($1, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:50
assert_return(() => invoke($1, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:51
assert_return(() => invoke($1, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:52
assert_trap(() => invoke($1, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:53
assert_trap(() => invoke($1, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:54
assert_trap(() => invoke($1, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:55
assert_trap(() => invoke($1, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:56
assert_trap(() => invoke($1, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:57
assert_trap(() => invoke($1, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:58
assert_return(() => invoke($1, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:59
assert_return(() => invoke($1, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:60
assert_return(() => invoke($1, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:61
assert_return(() => invoke($1, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:62
assert_return(() => invoke($1, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:63
assert_trap(() => invoke($1, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:64
assert_trap(() => invoke($1, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:65
assert_trap(() => invoke($1, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:66
assert_trap(() => invoke($1, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:67
assert_trap(() => invoke($1, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:68
assert_trap(() => invoke($1, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:69
assert_trap(() => invoke($1, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:70
assert_trap(() => invoke($1, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:71
assert_trap(() => invoke($1, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:72
assert_trap(() => invoke($1, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:73
assert_trap(() => invoke($1, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:74
assert_trap(() => invoke($1, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:75
assert_trap(() => invoke($1, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:76
assert_trap(() => invoke($1, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:77
assert_trap(() => invoke($1, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:78
assert_trap(() => invoke($1, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:79
assert_return(() => invoke($1, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:80
assert_return(() => invoke($1, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:81
assert_return(() => invoke($1, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:82
assert_return(() => invoke($1, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:83
assert_trap(() => invoke($1, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:84
assert_trap(() => invoke($1, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:85
assert_trap(() => invoke($1, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:86
assert_trap(() => invoke($1, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:87
assert_return(() => invoke($1, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:88
assert_return(() => invoke($1, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:89
assert_return(() => invoke($1, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:90
assert_return(() => invoke($1, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:91
assert_return(() => invoke($1, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:92
assert_trap(() => invoke($1, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:93
assert_trap(() => invoke($1, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:94
assert_trap(() => invoke($1, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:95
assert_trap(() => invoke($1, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:96
assert_trap(() => invoke($1, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:97
assert_trap(() => invoke($1, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:98
assert_trap(() => invoke($1, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:99
assert_trap(() => invoke($1, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:100
assert_trap(() => invoke($1, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:101
assert_trap(() => invoke($1, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:102
assert_trap(() => invoke($1, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:103
assert_trap(() => invoke($1, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:104
assert_trap(() => invoke($1, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:105
assert_trap(() => invoke($1, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:107
let $2 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t0) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t1) (i32.const 3) func 1 3 1 4)
  (elem (table \$t1) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t0 \$t0 (i32.const 13) (i32.const 2) (i32.const 3)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:137
invoke($2, `test`, []);

// ./test/core/memory64/table_copy64.wast:138
assert_trap(() => invoke($2, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:139
assert_trap(() => invoke($2, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:140
assert_return(() => invoke($2, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:141
assert_return(() => invoke($2, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:142
assert_return(() => invoke($2, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:143
assert_return(() => invoke($2, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:144
assert_trap(() => invoke($2, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:145
assert_trap(() => invoke($2, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:146
assert_trap(() => invoke($2, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:147
assert_trap(() => invoke($2, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:148
assert_trap(() => invoke($2, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:149
assert_trap(() => invoke($2, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:150
assert_return(() => invoke($2, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:151
assert_return(() => invoke($2, `check_t0`, [13]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:152
assert_return(() => invoke($2, `check_t0`, [14]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:153
assert_return(() => invoke($2, `check_t0`, [15]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:154
assert_return(() => invoke($2, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:155
assert_trap(() => invoke($2, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:156
assert_trap(() => invoke($2, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:157
assert_trap(() => invoke($2, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:158
assert_trap(() => invoke($2, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:159
assert_trap(() => invoke($2, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:160
assert_trap(() => invoke($2, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:161
assert_trap(() => invoke($2, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:162
assert_trap(() => invoke($2, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:163
assert_trap(() => invoke($2, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:164
assert_trap(() => invoke($2, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:165
assert_trap(() => invoke($2, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:166
assert_trap(() => invoke($2, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:167
assert_trap(() => invoke($2, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:168
assert_trap(() => invoke($2, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:169
assert_trap(() => invoke($2, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:170
assert_trap(() => invoke($2, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:171
assert_return(() => invoke($2, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:172
assert_return(() => invoke($2, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:173
assert_return(() => invoke($2, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:174
assert_return(() => invoke($2, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:175
assert_trap(() => invoke($2, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:176
assert_trap(() => invoke($2, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:177
assert_trap(() => invoke($2, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:178
assert_trap(() => invoke($2, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:179
assert_return(() => invoke($2, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:180
assert_return(() => invoke($2, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:181
assert_return(() => invoke($2, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:182
assert_return(() => invoke($2, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:183
assert_return(() => invoke($2, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:184
assert_trap(() => invoke($2, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:185
assert_trap(() => invoke($2, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:186
assert_trap(() => invoke($2, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:187
assert_trap(() => invoke($2, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:188
assert_trap(() => invoke($2, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:189
assert_trap(() => invoke($2, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:190
assert_trap(() => invoke($2, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:191
assert_trap(() => invoke($2, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:192
assert_trap(() => invoke($2, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:193
assert_trap(() => invoke($2, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:194
assert_trap(() => invoke($2, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:195
assert_trap(() => invoke($2, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:196
assert_trap(() => invoke($2, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:197
assert_trap(() => invoke($2, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:199
let $3 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t0) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t1) (i32.const 3) func 1 3 1 4)
  (elem (table \$t1) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t0 \$t0 (i32.const 25) (i32.const 15) (i32.const 2)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:229
invoke($3, `test`, []);

// ./test/core/memory64/table_copy64.wast:230
assert_trap(() => invoke($3, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:231
assert_trap(() => invoke($3, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:232
assert_return(() => invoke($3, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:233
assert_return(() => invoke($3, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:234
assert_return(() => invoke($3, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:235
assert_return(() => invoke($3, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:236
assert_trap(() => invoke($3, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:237
assert_trap(() => invoke($3, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:238
assert_trap(() => invoke($3, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:239
assert_trap(() => invoke($3, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:240
assert_trap(() => invoke($3, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:241
assert_trap(() => invoke($3, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:242
assert_return(() => invoke($3, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:243
assert_return(() => invoke($3, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:244
assert_return(() => invoke($3, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:245
assert_return(() => invoke($3, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:246
assert_return(() => invoke($3, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:247
assert_trap(() => invoke($3, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:248
assert_trap(() => invoke($3, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:249
assert_trap(() => invoke($3, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:250
assert_trap(() => invoke($3, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:251
assert_trap(() => invoke($3, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:252
assert_trap(() => invoke($3, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:253
assert_trap(() => invoke($3, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:254
assert_trap(() => invoke($3, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:255
assert_return(() => invoke($3, `check_t0`, [25]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:256
assert_return(() => invoke($3, `check_t0`, [26]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:257
assert_trap(() => invoke($3, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:258
assert_trap(() => invoke($3, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:259
assert_trap(() => invoke($3, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:260
assert_trap(() => invoke($3, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:261
assert_trap(() => invoke($3, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:262
assert_trap(() => invoke($3, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:263
assert_return(() => invoke($3, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:264
assert_return(() => invoke($3, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:265
assert_return(() => invoke($3, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:266
assert_return(() => invoke($3, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:267
assert_trap(() => invoke($3, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:268
assert_trap(() => invoke($3, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:269
assert_trap(() => invoke($3, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:270
assert_trap(() => invoke($3, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:271
assert_return(() => invoke($3, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:272
assert_return(() => invoke($3, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:273
assert_return(() => invoke($3, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:274
assert_return(() => invoke($3, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:275
assert_return(() => invoke($3, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:276
assert_trap(() => invoke($3, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:277
assert_trap(() => invoke($3, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:278
assert_trap(() => invoke($3, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:279
assert_trap(() => invoke($3, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:280
assert_trap(() => invoke($3, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:281
assert_trap(() => invoke($3, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:282
assert_trap(() => invoke($3, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:283
assert_trap(() => invoke($3, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:284
assert_trap(() => invoke($3, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:285
assert_trap(() => invoke($3, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:286
assert_trap(() => invoke($3, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:287
assert_trap(() => invoke($3, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:288
assert_trap(() => invoke($3, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:289
assert_trap(() => invoke($3, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:291
let $4 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t0) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t1) (i32.const 3) func 1 3 1 4)
  (elem (table \$t1) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t0 \$t0 (i32.const 13) (i32.const 25) (i32.const 3)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:321
invoke($4, `test`, []);

// ./test/core/memory64/table_copy64.wast:322
assert_trap(() => invoke($4, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:323
assert_trap(() => invoke($4, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:324
assert_return(() => invoke($4, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:325
assert_return(() => invoke($4, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:326
assert_return(() => invoke($4, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:327
assert_return(() => invoke($4, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:328
assert_trap(() => invoke($4, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:329
assert_trap(() => invoke($4, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:330
assert_trap(() => invoke($4, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:331
assert_trap(() => invoke($4, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:332
assert_trap(() => invoke($4, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:333
assert_trap(() => invoke($4, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:334
assert_return(() => invoke($4, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:335
assert_trap(() => invoke($4, `check_t0`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:336
assert_trap(() => invoke($4, `check_t0`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:337
assert_trap(() => invoke($4, `check_t0`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:338
assert_return(() => invoke($4, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:339
assert_trap(() => invoke($4, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:340
assert_trap(() => invoke($4, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:341
assert_trap(() => invoke($4, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:342
assert_trap(() => invoke($4, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:343
assert_trap(() => invoke($4, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:344
assert_trap(() => invoke($4, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:345
assert_trap(() => invoke($4, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:346
assert_trap(() => invoke($4, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:347
assert_trap(() => invoke($4, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:348
assert_trap(() => invoke($4, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:349
assert_trap(() => invoke($4, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:350
assert_trap(() => invoke($4, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:351
assert_trap(() => invoke($4, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:352
assert_trap(() => invoke($4, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:353
assert_trap(() => invoke($4, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:354
assert_trap(() => invoke($4, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:355
assert_return(() => invoke($4, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:356
assert_return(() => invoke($4, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:357
assert_return(() => invoke($4, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:358
assert_return(() => invoke($4, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:359
assert_trap(() => invoke($4, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:360
assert_trap(() => invoke($4, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:361
assert_trap(() => invoke($4, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:362
assert_trap(() => invoke($4, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:363
assert_return(() => invoke($4, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:364
assert_return(() => invoke($4, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:365
assert_return(() => invoke($4, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:366
assert_return(() => invoke($4, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:367
assert_return(() => invoke($4, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:368
assert_trap(() => invoke($4, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:369
assert_trap(() => invoke($4, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:370
assert_trap(() => invoke($4, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:371
assert_trap(() => invoke($4, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:372
assert_trap(() => invoke($4, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:373
assert_trap(() => invoke($4, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:374
assert_trap(() => invoke($4, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:375
assert_trap(() => invoke($4, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:376
assert_trap(() => invoke($4, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:377
assert_trap(() => invoke($4, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:378
assert_trap(() => invoke($4, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:379
assert_trap(() => invoke($4, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:380
assert_trap(() => invoke($4, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:381
assert_trap(() => invoke($4, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:383
let $5 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t0) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t1) (i32.const 3) func 1 3 1 4)
  (elem (table \$t1) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t0 \$t0 (i32.const 20) (i32.const 22) (i32.const 4)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:413
invoke($5, `test`, []);

// ./test/core/memory64/table_copy64.wast:414
assert_trap(() => invoke($5, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:415
assert_trap(() => invoke($5, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:416
assert_return(() => invoke($5, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:417
assert_return(() => invoke($5, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:418
assert_return(() => invoke($5, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:419
assert_return(() => invoke($5, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:420
assert_trap(() => invoke($5, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:421
assert_trap(() => invoke($5, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:422
assert_trap(() => invoke($5, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:423
assert_trap(() => invoke($5, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:424
assert_trap(() => invoke($5, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:425
assert_trap(() => invoke($5, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:426
assert_return(() => invoke($5, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:427
assert_return(() => invoke($5, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:428
assert_return(() => invoke($5, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:429
assert_return(() => invoke($5, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:430
assert_return(() => invoke($5, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:431
assert_trap(() => invoke($5, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:432
assert_trap(() => invoke($5, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:433
assert_trap(() => invoke($5, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:434
assert_trap(() => invoke($5, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:435
assert_trap(() => invoke($5, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:436
assert_trap(() => invoke($5, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:437
assert_trap(() => invoke($5, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:438
assert_trap(() => invoke($5, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:439
assert_trap(() => invoke($5, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:440
assert_trap(() => invoke($5, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:441
assert_trap(() => invoke($5, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:442
assert_trap(() => invoke($5, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:443
assert_trap(() => invoke($5, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:444
assert_trap(() => invoke($5, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:445
assert_trap(() => invoke($5, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:446
assert_trap(() => invoke($5, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:447
assert_return(() => invoke($5, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:448
assert_return(() => invoke($5, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:449
assert_return(() => invoke($5, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:450
assert_return(() => invoke($5, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:451
assert_trap(() => invoke($5, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:452
assert_trap(() => invoke($5, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:453
assert_trap(() => invoke($5, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:454
assert_trap(() => invoke($5, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:455
assert_return(() => invoke($5, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:456
assert_return(() => invoke($5, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:457
assert_return(() => invoke($5, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:458
assert_return(() => invoke($5, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:459
assert_return(() => invoke($5, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:460
assert_trap(() => invoke($5, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:461
assert_trap(() => invoke($5, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:462
assert_trap(() => invoke($5, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:463
assert_trap(() => invoke($5, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:464
assert_trap(() => invoke($5, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:465
assert_trap(() => invoke($5, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:466
assert_trap(() => invoke($5, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:467
assert_trap(() => invoke($5, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:468
assert_trap(() => invoke($5, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:469
assert_trap(() => invoke($5, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:470
assert_trap(() => invoke($5, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:471
assert_trap(() => invoke($5, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:472
assert_trap(() => invoke($5, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:473
assert_trap(() => invoke($5, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:475
let $6 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t0) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t1) (i32.const 3) func 1 3 1 4)
  (elem (table \$t1) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t0 \$t0 (i32.const 25) (i32.const 1) (i32.const 3)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:505
invoke($6, `test`, []);

// ./test/core/memory64/table_copy64.wast:506
assert_trap(() => invoke($6, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:507
assert_trap(() => invoke($6, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:508
assert_return(() => invoke($6, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:509
assert_return(() => invoke($6, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:510
assert_return(() => invoke($6, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:511
assert_return(() => invoke($6, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:512
assert_trap(() => invoke($6, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:513
assert_trap(() => invoke($6, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:514
assert_trap(() => invoke($6, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:515
assert_trap(() => invoke($6, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:516
assert_trap(() => invoke($6, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:517
assert_trap(() => invoke($6, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:518
assert_return(() => invoke($6, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:519
assert_return(() => invoke($6, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:520
assert_return(() => invoke($6, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:521
assert_return(() => invoke($6, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:522
assert_return(() => invoke($6, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:523
assert_trap(() => invoke($6, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:524
assert_trap(() => invoke($6, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:525
assert_trap(() => invoke($6, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:526
assert_trap(() => invoke($6, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:527
assert_trap(() => invoke($6, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:528
assert_trap(() => invoke($6, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:529
assert_trap(() => invoke($6, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:530
assert_trap(() => invoke($6, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:531
assert_trap(() => invoke($6, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:532
assert_return(() => invoke($6, `check_t0`, [26]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:533
assert_return(() => invoke($6, `check_t0`, [27]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:534
assert_trap(() => invoke($6, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:535
assert_trap(() => invoke($6, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:536
assert_trap(() => invoke($6, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:537
assert_trap(() => invoke($6, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:538
assert_trap(() => invoke($6, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:539
assert_return(() => invoke($6, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:540
assert_return(() => invoke($6, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:541
assert_return(() => invoke($6, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:542
assert_return(() => invoke($6, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:543
assert_trap(() => invoke($6, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:544
assert_trap(() => invoke($6, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:545
assert_trap(() => invoke($6, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:546
assert_trap(() => invoke($6, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:547
assert_return(() => invoke($6, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:548
assert_return(() => invoke($6, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:549
assert_return(() => invoke($6, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:550
assert_return(() => invoke($6, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:551
assert_return(() => invoke($6, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:552
assert_trap(() => invoke($6, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:553
assert_trap(() => invoke($6, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:554
assert_trap(() => invoke($6, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:555
assert_trap(() => invoke($6, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:556
assert_trap(() => invoke($6, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:557
assert_trap(() => invoke($6, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:558
assert_trap(() => invoke($6, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:559
assert_trap(() => invoke($6, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:560
assert_trap(() => invoke($6, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:561
assert_trap(() => invoke($6, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:562
assert_trap(() => invoke($6, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:563
assert_trap(() => invoke($6, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:564
assert_trap(() => invoke($6, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:565
assert_trap(() => invoke($6, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:567
let $7 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t0) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t1) (i32.const 3) func 1 3 1 4)
  (elem (table \$t1) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t0 \$t0 (i32.const 10) (i32.const 12) (i32.const 7)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:597
invoke($7, `test`, []);

// ./test/core/memory64/table_copy64.wast:598
assert_trap(() => invoke($7, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:599
assert_trap(() => invoke($7, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:600
assert_return(() => invoke($7, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:601
assert_return(() => invoke($7, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:602
assert_return(() => invoke($7, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:603
assert_return(() => invoke($7, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:604
assert_trap(() => invoke($7, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:605
assert_trap(() => invoke($7, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:606
assert_trap(() => invoke($7, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:607
assert_trap(() => invoke($7, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:608
assert_return(() => invoke($7, `check_t0`, [10]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:609
assert_return(() => invoke($7, `check_t0`, [11]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:610
assert_return(() => invoke($7, `check_t0`, [12]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:611
assert_return(() => invoke($7, `check_t0`, [13]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:612
assert_return(() => invoke($7, `check_t0`, [14]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:613
assert_trap(() => invoke($7, `check_t0`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:614
assert_trap(() => invoke($7, `check_t0`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:615
assert_trap(() => invoke($7, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:616
assert_trap(() => invoke($7, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:617
assert_trap(() => invoke($7, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:618
assert_trap(() => invoke($7, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:619
assert_trap(() => invoke($7, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:620
assert_trap(() => invoke($7, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:621
assert_trap(() => invoke($7, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:622
assert_trap(() => invoke($7, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:623
assert_trap(() => invoke($7, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:624
assert_trap(() => invoke($7, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:625
assert_trap(() => invoke($7, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:626
assert_trap(() => invoke($7, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:627
assert_trap(() => invoke($7, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:628
assert_trap(() => invoke($7, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:629
assert_trap(() => invoke($7, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:630
assert_trap(() => invoke($7, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:631
assert_return(() => invoke($7, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:632
assert_return(() => invoke($7, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:633
assert_return(() => invoke($7, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:634
assert_return(() => invoke($7, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:635
assert_trap(() => invoke($7, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:636
assert_trap(() => invoke($7, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:637
assert_trap(() => invoke($7, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:638
assert_trap(() => invoke($7, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:639
assert_return(() => invoke($7, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:640
assert_return(() => invoke($7, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:641
assert_return(() => invoke($7, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:642
assert_return(() => invoke($7, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:643
assert_return(() => invoke($7, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:644
assert_trap(() => invoke($7, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:645
assert_trap(() => invoke($7, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:646
assert_trap(() => invoke($7, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:647
assert_trap(() => invoke($7, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:648
assert_trap(() => invoke($7, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:649
assert_trap(() => invoke($7, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:650
assert_trap(() => invoke($7, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:651
assert_trap(() => invoke($7, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:652
assert_trap(() => invoke($7, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:653
assert_trap(() => invoke($7, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:654
assert_trap(() => invoke($7, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:655
assert_trap(() => invoke($7, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:656
assert_trap(() => invoke($7, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:657
assert_trap(() => invoke($7, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:659
let $8 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t0) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t1) (i32.const 3) func 1 3 1 4)
  (elem (table \$t1) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t0 \$t0 (i32.const 12) (i32.const 10) (i32.const 7)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:689
invoke($8, `test`, []);

// ./test/core/memory64/table_copy64.wast:690
assert_trap(() => invoke($8, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:691
assert_trap(() => invoke($8, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:692
assert_return(() => invoke($8, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:693
assert_return(() => invoke($8, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:694
assert_return(() => invoke($8, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:695
assert_return(() => invoke($8, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:696
assert_trap(() => invoke($8, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:697
assert_trap(() => invoke($8, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:698
assert_trap(() => invoke($8, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:699
assert_trap(() => invoke($8, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:700
assert_trap(() => invoke($8, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:701
assert_trap(() => invoke($8, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:702
assert_trap(() => invoke($8, `check_t0`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:703
assert_trap(() => invoke($8, `check_t0`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:704
assert_return(() => invoke($8, `check_t0`, [14]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:705
assert_return(() => invoke($8, `check_t0`, [15]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:706
assert_return(() => invoke($8, `check_t0`, [16]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:707
assert_return(() => invoke($8, `check_t0`, [17]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:708
assert_return(() => invoke($8, `check_t0`, [18]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:709
assert_trap(() => invoke($8, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:710
assert_trap(() => invoke($8, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:711
assert_trap(() => invoke($8, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:712
assert_trap(() => invoke($8, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:713
assert_trap(() => invoke($8, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:714
assert_trap(() => invoke($8, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:715
assert_trap(() => invoke($8, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:716
assert_trap(() => invoke($8, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:717
assert_trap(() => invoke($8, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:718
assert_trap(() => invoke($8, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:719
assert_trap(() => invoke($8, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:720
assert_trap(() => invoke($8, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:721
assert_trap(() => invoke($8, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:722
assert_trap(() => invoke($8, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:723
assert_return(() => invoke($8, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:724
assert_return(() => invoke($8, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:725
assert_return(() => invoke($8, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:726
assert_return(() => invoke($8, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:727
assert_trap(() => invoke($8, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:728
assert_trap(() => invoke($8, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:729
assert_trap(() => invoke($8, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:730
assert_trap(() => invoke($8, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:731
assert_return(() => invoke($8, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:732
assert_return(() => invoke($8, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:733
assert_return(() => invoke($8, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:734
assert_return(() => invoke($8, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:735
assert_return(() => invoke($8, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:736
assert_trap(() => invoke($8, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:737
assert_trap(() => invoke($8, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:738
assert_trap(() => invoke($8, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:739
assert_trap(() => invoke($8, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:740
assert_trap(() => invoke($8, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:741
assert_trap(() => invoke($8, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:742
assert_trap(() => invoke($8, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:743
assert_trap(() => invoke($8, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:744
assert_trap(() => invoke($8, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:745
assert_trap(() => invoke($8, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:746
assert_trap(() => invoke($8, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:747
assert_trap(() => invoke($8, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:748
assert_trap(() => invoke($8, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:749
assert_trap(() => invoke($8, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:751
let $9 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t0) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t1) (i32.const 3) func 1 3 1 4)
  (elem (table \$t1) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t1 \$t0 (i32.const 10) (i32.const 0) (i32.const 20)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:781
invoke($9, `test`, []);

// ./test/core/memory64/table_copy64.wast:782
assert_trap(() => invoke($9, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:783
assert_trap(() => invoke($9, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:784
assert_return(() => invoke($9, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:785
assert_return(() => invoke($9, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:786
assert_return(() => invoke($9, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:787
assert_return(() => invoke($9, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:788
assert_trap(() => invoke($9, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:789
assert_trap(() => invoke($9, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:790
assert_trap(() => invoke($9, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:791
assert_trap(() => invoke($9, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:792
assert_trap(() => invoke($9, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:793
assert_trap(() => invoke($9, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:794
assert_return(() => invoke($9, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:795
assert_return(() => invoke($9, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:796
assert_return(() => invoke($9, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:797
assert_return(() => invoke($9, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:798
assert_return(() => invoke($9, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:799
assert_trap(() => invoke($9, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:800
assert_trap(() => invoke($9, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:801
assert_trap(() => invoke($9, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:802
assert_trap(() => invoke($9, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:803
assert_trap(() => invoke($9, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:804
assert_trap(() => invoke($9, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:805
assert_trap(() => invoke($9, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:806
assert_trap(() => invoke($9, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:807
assert_trap(() => invoke($9, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:808
assert_trap(() => invoke($9, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:809
assert_trap(() => invoke($9, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:810
assert_trap(() => invoke($9, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:811
assert_trap(() => invoke($9, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:812
assert_trap(() => invoke($9, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:813
assert_trap(() => invoke($9, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:814
assert_trap(() => invoke($9, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:815
assert_return(() => invoke($9, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:816
assert_return(() => invoke($9, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:817
assert_return(() => invoke($9, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:818
assert_return(() => invoke($9, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:819
assert_trap(() => invoke($9, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:820
assert_trap(() => invoke($9, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:821
assert_trap(() => invoke($9, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:822
assert_trap(() => invoke($9, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:823
assert_trap(() => invoke($9, `check_t1`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:824
assert_return(() => invoke($9, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:825
assert_return(() => invoke($9, `check_t1`, [13]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:826
assert_return(() => invoke($9, `check_t1`, [14]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:827
assert_return(() => invoke($9, `check_t1`, [15]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:828
assert_trap(() => invoke($9, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:829
assert_trap(() => invoke($9, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:830
assert_trap(() => invoke($9, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:831
assert_trap(() => invoke($9, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:832
assert_trap(() => invoke($9, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:833
assert_trap(() => invoke($9, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:834
assert_return(() => invoke($9, `check_t1`, [22]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:835
assert_return(() => invoke($9, `check_t1`, [23]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:836
assert_return(() => invoke($9, `check_t1`, [24]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:837
assert_return(() => invoke($9, `check_t1`, [25]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:838
assert_return(() => invoke($9, `check_t1`, [26]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:839
assert_trap(() => invoke($9, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:840
assert_trap(() => invoke($9, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:841
assert_trap(() => invoke($9, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:843
let $10 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t1) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t1) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t0) (i32.const 3) func 1 3 1 4)
  (elem (table \$t0) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (nop))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:873
invoke($10, `test`, []);

// ./test/core/memory64/table_copy64.wast:874
assert_trap(() => invoke($10, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:875
assert_trap(() => invoke($10, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:876
assert_return(() => invoke($10, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:877
assert_return(() => invoke($10, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:878
assert_return(() => invoke($10, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:879
assert_return(() => invoke($10, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:880
assert_trap(() => invoke($10, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:881
assert_trap(() => invoke($10, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:882
assert_trap(() => invoke($10, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:883
assert_trap(() => invoke($10, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:884
assert_trap(() => invoke($10, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:885
assert_trap(() => invoke($10, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:886
assert_return(() => invoke($10, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:887
assert_return(() => invoke($10, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:888
assert_return(() => invoke($10, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:889
assert_return(() => invoke($10, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:890
assert_return(() => invoke($10, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:891
assert_trap(() => invoke($10, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:892
assert_trap(() => invoke($10, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:893
assert_trap(() => invoke($10, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:894
assert_trap(() => invoke($10, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:895
assert_trap(() => invoke($10, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:896
assert_trap(() => invoke($10, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:897
assert_trap(() => invoke($10, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:898
assert_trap(() => invoke($10, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:899
assert_trap(() => invoke($10, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:900
assert_trap(() => invoke($10, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:901
assert_trap(() => invoke($10, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:902
assert_trap(() => invoke($10, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:903
assert_trap(() => invoke($10, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:904
assert_trap(() => invoke($10, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:905
assert_trap(() => invoke($10, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:906
assert_trap(() => invoke($10, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:907
assert_return(() => invoke($10, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:908
assert_return(() => invoke($10, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:909
assert_return(() => invoke($10, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:910
assert_return(() => invoke($10, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:911
assert_trap(() => invoke($10, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:912
assert_trap(() => invoke($10, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:913
assert_trap(() => invoke($10, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:914
assert_trap(() => invoke($10, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:915
assert_return(() => invoke($10, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:916
assert_return(() => invoke($10, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:917
assert_return(() => invoke($10, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:918
assert_return(() => invoke($10, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:919
assert_return(() => invoke($10, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:920
assert_trap(() => invoke($10, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:921
assert_trap(() => invoke($10, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:922
assert_trap(() => invoke($10, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:923
assert_trap(() => invoke($10, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:924
assert_trap(() => invoke($10, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:925
assert_trap(() => invoke($10, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:926
assert_trap(() => invoke($10, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:927
assert_trap(() => invoke($10, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:928
assert_trap(() => invoke($10, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:929
assert_trap(() => invoke($10, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:930
assert_trap(() => invoke($10, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:931
assert_trap(() => invoke($10, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:932
assert_trap(() => invoke($10, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:933
assert_trap(() => invoke($10, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:935
let $11 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t1) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t1) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t0) (i32.const 3) func 1 3 1 4)
  (elem (table \$t0) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t1 \$t1 (i32.const 13) (i32.const 2) (i32.const 3)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:965
invoke($11, `test`, []);

// ./test/core/memory64/table_copy64.wast:966
assert_trap(() => invoke($11, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:967
assert_trap(() => invoke($11, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:968
assert_return(() => invoke($11, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:969
assert_return(() => invoke($11, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:970
assert_return(() => invoke($11, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:971
assert_return(() => invoke($11, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:972
assert_trap(() => invoke($11, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:973
assert_trap(() => invoke($11, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:974
assert_trap(() => invoke($11, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:975
assert_trap(() => invoke($11, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:976
assert_trap(() => invoke($11, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:977
assert_trap(() => invoke($11, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:978
assert_return(() => invoke($11, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:979
assert_return(() => invoke($11, `check_t0`, [13]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:980
assert_return(() => invoke($11, `check_t0`, [14]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:981
assert_return(() => invoke($11, `check_t0`, [15]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:982
assert_return(() => invoke($11, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:983
assert_trap(() => invoke($11, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:984
assert_trap(() => invoke($11, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:985
assert_trap(() => invoke($11, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:986
assert_trap(() => invoke($11, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:987
assert_trap(() => invoke($11, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:988
assert_trap(() => invoke($11, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:989
assert_trap(() => invoke($11, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:990
assert_trap(() => invoke($11, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:991
assert_trap(() => invoke($11, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:992
assert_trap(() => invoke($11, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:993
assert_trap(() => invoke($11, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:994
assert_trap(() => invoke($11, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:995
assert_trap(() => invoke($11, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:996
assert_trap(() => invoke($11, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:997
assert_trap(() => invoke($11, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:998
assert_trap(() => invoke($11, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:999
assert_return(() => invoke($11, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1000
assert_return(() => invoke($11, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1001
assert_return(() => invoke($11, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1002
assert_return(() => invoke($11, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1003
assert_trap(() => invoke($11, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1004
assert_trap(() => invoke($11, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1005
assert_trap(() => invoke($11, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1006
assert_trap(() => invoke($11, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1007
assert_return(() => invoke($11, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1008
assert_return(() => invoke($11, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1009
assert_return(() => invoke($11, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1010
assert_return(() => invoke($11, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1011
assert_return(() => invoke($11, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1012
assert_trap(() => invoke($11, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1013
assert_trap(() => invoke($11, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1014
assert_trap(() => invoke($11, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1015
assert_trap(() => invoke($11, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1016
assert_trap(() => invoke($11, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1017
assert_trap(() => invoke($11, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1018
assert_trap(() => invoke($11, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1019
assert_trap(() => invoke($11, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1020
assert_trap(() => invoke($11, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1021
assert_trap(() => invoke($11, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1022
assert_trap(() => invoke($11, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1023
assert_trap(() => invoke($11, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1024
assert_trap(() => invoke($11, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1025
assert_trap(() => invoke($11, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1027
let $12 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t1) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t1) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t0) (i32.const 3) func 1 3 1 4)
  (elem (table \$t0) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t1 \$t1 (i32.const 25) (i32.const 15) (i32.const 2)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:1057
invoke($12, `test`, []);

// ./test/core/memory64/table_copy64.wast:1058
assert_trap(() => invoke($12, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1059
assert_trap(() => invoke($12, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1060
assert_return(() => invoke($12, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1061
assert_return(() => invoke($12, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1062
assert_return(() => invoke($12, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1063
assert_return(() => invoke($12, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1064
assert_trap(() => invoke($12, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1065
assert_trap(() => invoke($12, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1066
assert_trap(() => invoke($12, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1067
assert_trap(() => invoke($12, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1068
assert_trap(() => invoke($12, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1069
assert_trap(() => invoke($12, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1070
assert_return(() => invoke($12, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1071
assert_return(() => invoke($12, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1072
assert_return(() => invoke($12, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1073
assert_return(() => invoke($12, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1074
assert_return(() => invoke($12, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1075
assert_trap(() => invoke($12, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1076
assert_trap(() => invoke($12, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1077
assert_trap(() => invoke($12, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1078
assert_trap(() => invoke($12, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1079
assert_trap(() => invoke($12, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1080
assert_trap(() => invoke($12, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1081
assert_trap(() => invoke($12, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1082
assert_trap(() => invoke($12, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1083
assert_return(() => invoke($12, `check_t0`, [25]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1084
assert_return(() => invoke($12, `check_t0`, [26]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1085
assert_trap(() => invoke($12, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1086
assert_trap(() => invoke($12, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1087
assert_trap(() => invoke($12, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1088
assert_trap(() => invoke($12, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1089
assert_trap(() => invoke($12, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1090
assert_trap(() => invoke($12, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1091
assert_return(() => invoke($12, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1092
assert_return(() => invoke($12, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1093
assert_return(() => invoke($12, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1094
assert_return(() => invoke($12, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1095
assert_trap(() => invoke($12, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1096
assert_trap(() => invoke($12, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1097
assert_trap(() => invoke($12, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1098
assert_trap(() => invoke($12, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1099
assert_return(() => invoke($12, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1100
assert_return(() => invoke($12, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1101
assert_return(() => invoke($12, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1102
assert_return(() => invoke($12, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1103
assert_return(() => invoke($12, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1104
assert_trap(() => invoke($12, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1105
assert_trap(() => invoke($12, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1106
assert_trap(() => invoke($12, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1107
assert_trap(() => invoke($12, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1108
assert_trap(() => invoke($12, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1109
assert_trap(() => invoke($12, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1110
assert_trap(() => invoke($12, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1111
assert_trap(() => invoke($12, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1112
assert_trap(() => invoke($12, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1113
assert_trap(() => invoke($12, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1114
assert_trap(() => invoke($12, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1115
assert_trap(() => invoke($12, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1116
assert_trap(() => invoke($12, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1117
assert_trap(() => invoke($12, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1119
let $13 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t1) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t1) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t0) (i32.const 3) func 1 3 1 4)
  (elem (table \$t0) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t1 \$t1 (i32.const 13) (i32.const 25) (i32.const 3)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:1149
invoke($13, `test`, []);

// ./test/core/memory64/table_copy64.wast:1150
assert_trap(() => invoke($13, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1151
assert_trap(() => invoke($13, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1152
assert_return(() => invoke($13, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1153
assert_return(() => invoke($13, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1154
assert_return(() => invoke($13, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1155
assert_return(() => invoke($13, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1156
assert_trap(() => invoke($13, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1157
assert_trap(() => invoke($13, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1158
assert_trap(() => invoke($13, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1159
assert_trap(() => invoke($13, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1160
assert_trap(() => invoke($13, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1161
assert_trap(() => invoke($13, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1162
assert_return(() => invoke($13, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1163
assert_trap(() => invoke($13, `check_t0`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1164
assert_trap(() => invoke($13, `check_t0`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1165
assert_trap(() => invoke($13, `check_t0`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1166
assert_return(() => invoke($13, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1167
assert_trap(() => invoke($13, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1168
assert_trap(() => invoke($13, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1169
assert_trap(() => invoke($13, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1170
assert_trap(() => invoke($13, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1171
assert_trap(() => invoke($13, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1172
assert_trap(() => invoke($13, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1173
assert_trap(() => invoke($13, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1174
assert_trap(() => invoke($13, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1175
assert_trap(() => invoke($13, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1176
assert_trap(() => invoke($13, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1177
assert_trap(() => invoke($13, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1178
assert_trap(() => invoke($13, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1179
assert_trap(() => invoke($13, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1180
assert_trap(() => invoke($13, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1181
assert_trap(() => invoke($13, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1182
assert_trap(() => invoke($13, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1183
assert_return(() => invoke($13, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1184
assert_return(() => invoke($13, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1185
assert_return(() => invoke($13, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1186
assert_return(() => invoke($13, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1187
assert_trap(() => invoke($13, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1188
assert_trap(() => invoke($13, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1189
assert_trap(() => invoke($13, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1190
assert_trap(() => invoke($13, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1191
assert_return(() => invoke($13, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1192
assert_return(() => invoke($13, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1193
assert_return(() => invoke($13, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1194
assert_return(() => invoke($13, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1195
assert_return(() => invoke($13, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1196
assert_trap(() => invoke($13, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1197
assert_trap(() => invoke($13, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1198
assert_trap(() => invoke($13, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1199
assert_trap(() => invoke($13, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1200
assert_trap(() => invoke($13, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1201
assert_trap(() => invoke($13, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1202
assert_trap(() => invoke($13, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1203
assert_trap(() => invoke($13, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1204
assert_trap(() => invoke($13, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1205
assert_trap(() => invoke($13, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1206
assert_trap(() => invoke($13, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1207
assert_trap(() => invoke($13, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1208
assert_trap(() => invoke($13, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1209
assert_trap(() => invoke($13, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1211
let $14 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t1) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t1) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t0) (i32.const 3) func 1 3 1 4)
  (elem (table \$t0) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t1 \$t1 (i32.const 20) (i32.const 22) (i32.const 4)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:1241
invoke($14, `test`, []);

// ./test/core/memory64/table_copy64.wast:1242
assert_trap(() => invoke($14, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1243
assert_trap(() => invoke($14, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1244
assert_return(() => invoke($14, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1245
assert_return(() => invoke($14, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1246
assert_return(() => invoke($14, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1247
assert_return(() => invoke($14, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1248
assert_trap(() => invoke($14, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1249
assert_trap(() => invoke($14, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1250
assert_trap(() => invoke($14, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1251
assert_trap(() => invoke($14, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1252
assert_trap(() => invoke($14, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1253
assert_trap(() => invoke($14, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1254
assert_return(() => invoke($14, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1255
assert_return(() => invoke($14, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1256
assert_return(() => invoke($14, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1257
assert_return(() => invoke($14, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1258
assert_return(() => invoke($14, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1259
assert_trap(() => invoke($14, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1260
assert_trap(() => invoke($14, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1261
assert_trap(() => invoke($14, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1262
assert_trap(() => invoke($14, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1263
assert_trap(() => invoke($14, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1264
assert_trap(() => invoke($14, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1265
assert_trap(() => invoke($14, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1266
assert_trap(() => invoke($14, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1267
assert_trap(() => invoke($14, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1268
assert_trap(() => invoke($14, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1269
assert_trap(() => invoke($14, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1270
assert_trap(() => invoke($14, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1271
assert_trap(() => invoke($14, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1272
assert_trap(() => invoke($14, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1273
assert_trap(() => invoke($14, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1274
assert_trap(() => invoke($14, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1275
assert_return(() => invoke($14, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1276
assert_return(() => invoke($14, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1277
assert_return(() => invoke($14, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1278
assert_return(() => invoke($14, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1279
assert_trap(() => invoke($14, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1280
assert_trap(() => invoke($14, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1281
assert_trap(() => invoke($14, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1282
assert_trap(() => invoke($14, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1283
assert_return(() => invoke($14, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1284
assert_return(() => invoke($14, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1285
assert_return(() => invoke($14, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1286
assert_return(() => invoke($14, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1287
assert_return(() => invoke($14, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1288
assert_trap(() => invoke($14, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1289
assert_trap(() => invoke($14, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1290
assert_trap(() => invoke($14, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1291
assert_trap(() => invoke($14, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1292
assert_trap(() => invoke($14, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1293
assert_trap(() => invoke($14, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1294
assert_trap(() => invoke($14, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1295
assert_trap(() => invoke($14, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1296
assert_trap(() => invoke($14, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1297
assert_trap(() => invoke($14, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1298
assert_trap(() => invoke($14, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1299
assert_trap(() => invoke($14, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1300
assert_trap(() => invoke($14, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1301
assert_trap(() => invoke($14, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1303
let $15 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t1) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t1) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t0) (i32.const 3) func 1 3 1 4)
  (elem (table \$t0) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t1 \$t1 (i32.const 25) (i32.const 1) (i32.const 3)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:1333
invoke($15, `test`, []);

// ./test/core/memory64/table_copy64.wast:1334
assert_trap(() => invoke($15, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1335
assert_trap(() => invoke($15, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1336
assert_return(() => invoke($15, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1337
assert_return(() => invoke($15, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1338
assert_return(() => invoke($15, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1339
assert_return(() => invoke($15, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1340
assert_trap(() => invoke($15, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1341
assert_trap(() => invoke($15, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1342
assert_trap(() => invoke($15, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1343
assert_trap(() => invoke($15, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1344
assert_trap(() => invoke($15, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1345
assert_trap(() => invoke($15, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1346
assert_return(() => invoke($15, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1347
assert_return(() => invoke($15, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1348
assert_return(() => invoke($15, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1349
assert_return(() => invoke($15, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1350
assert_return(() => invoke($15, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1351
assert_trap(() => invoke($15, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1352
assert_trap(() => invoke($15, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1353
assert_trap(() => invoke($15, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1354
assert_trap(() => invoke($15, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1355
assert_trap(() => invoke($15, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1356
assert_trap(() => invoke($15, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1357
assert_trap(() => invoke($15, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1358
assert_trap(() => invoke($15, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1359
assert_trap(() => invoke($15, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1360
assert_return(() => invoke($15, `check_t0`, [26]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1361
assert_return(() => invoke($15, `check_t0`, [27]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1362
assert_trap(() => invoke($15, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1363
assert_trap(() => invoke($15, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1364
assert_trap(() => invoke($15, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1365
assert_trap(() => invoke($15, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1366
assert_trap(() => invoke($15, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1367
assert_return(() => invoke($15, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1368
assert_return(() => invoke($15, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1369
assert_return(() => invoke($15, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1370
assert_return(() => invoke($15, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1371
assert_trap(() => invoke($15, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1372
assert_trap(() => invoke($15, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1373
assert_trap(() => invoke($15, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1374
assert_trap(() => invoke($15, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1375
assert_return(() => invoke($15, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1376
assert_return(() => invoke($15, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1377
assert_return(() => invoke($15, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1378
assert_return(() => invoke($15, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1379
assert_return(() => invoke($15, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1380
assert_trap(() => invoke($15, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1381
assert_trap(() => invoke($15, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1382
assert_trap(() => invoke($15, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1383
assert_trap(() => invoke($15, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1384
assert_trap(() => invoke($15, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1385
assert_trap(() => invoke($15, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1386
assert_trap(() => invoke($15, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1387
assert_trap(() => invoke($15, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1388
assert_trap(() => invoke($15, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1389
assert_trap(() => invoke($15, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1390
assert_trap(() => invoke($15, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1391
assert_trap(() => invoke($15, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1392
assert_trap(() => invoke($15, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1393
assert_trap(() => invoke($15, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1395
let $16 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t1) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t1) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t0) (i32.const 3) func 1 3 1 4)
  (elem (table \$t0) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t1 \$t1 (i32.const 10) (i32.const 12) (i32.const 7)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:1425
invoke($16, `test`, []);

// ./test/core/memory64/table_copy64.wast:1426
assert_trap(() => invoke($16, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1427
assert_trap(() => invoke($16, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1428
assert_return(() => invoke($16, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1429
assert_return(() => invoke($16, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1430
assert_return(() => invoke($16, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1431
assert_return(() => invoke($16, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1432
assert_trap(() => invoke($16, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1433
assert_trap(() => invoke($16, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1434
assert_trap(() => invoke($16, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1435
assert_trap(() => invoke($16, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1436
assert_return(() => invoke($16, `check_t0`, [10]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1437
assert_return(() => invoke($16, `check_t0`, [11]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1438
assert_return(() => invoke($16, `check_t0`, [12]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1439
assert_return(() => invoke($16, `check_t0`, [13]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1440
assert_return(() => invoke($16, `check_t0`, [14]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1441
assert_trap(() => invoke($16, `check_t0`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1442
assert_trap(() => invoke($16, `check_t0`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1443
assert_trap(() => invoke($16, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1444
assert_trap(() => invoke($16, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1445
assert_trap(() => invoke($16, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1446
assert_trap(() => invoke($16, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1447
assert_trap(() => invoke($16, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1448
assert_trap(() => invoke($16, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1449
assert_trap(() => invoke($16, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1450
assert_trap(() => invoke($16, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1451
assert_trap(() => invoke($16, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1452
assert_trap(() => invoke($16, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1453
assert_trap(() => invoke($16, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1454
assert_trap(() => invoke($16, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1455
assert_trap(() => invoke($16, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1456
assert_trap(() => invoke($16, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1457
assert_trap(() => invoke($16, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1458
assert_trap(() => invoke($16, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1459
assert_return(() => invoke($16, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1460
assert_return(() => invoke($16, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1461
assert_return(() => invoke($16, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1462
assert_return(() => invoke($16, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1463
assert_trap(() => invoke($16, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1464
assert_trap(() => invoke($16, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1465
assert_trap(() => invoke($16, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1466
assert_trap(() => invoke($16, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1467
assert_return(() => invoke($16, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1468
assert_return(() => invoke($16, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1469
assert_return(() => invoke($16, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1470
assert_return(() => invoke($16, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1471
assert_return(() => invoke($16, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1472
assert_trap(() => invoke($16, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1473
assert_trap(() => invoke($16, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1474
assert_trap(() => invoke($16, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1475
assert_trap(() => invoke($16, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1476
assert_trap(() => invoke($16, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1477
assert_trap(() => invoke($16, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1478
assert_trap(() => invoke($16, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1479
assert_trap(() => invoke($16, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1480
assert_trap(() => invoke($16, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1481
assert_trap(() => invoke($16, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1482
assert_trap(() => invoke($16, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1483
assert_trap(() => invoke($16, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1484
assert_trap(() => invoke($16, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1485
assert_trap(() => invoke($16, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1487
let $17 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t1) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t1) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t0) (i32.const 3) func 1 3 1 4)
  (elem (table \$t0) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t1 \$t1 (i32.const 12) (i32.const 10) (i32.const 7)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:1517
invoke($17, `test`, []);

// ./test/core/memory64/table_copy64.wast:1518
assert_trap(() => invoke($17, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1519
assert_trap(() => invoke($17, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1520
assert_return(() => invoke($17, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1521
assert_return(() => invoke($17, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1522
assert_return(() => invoke($17, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1523
assert_return(() => invoke($17, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1524
assert_trap(() => invoke($17, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1525
assert_trap(() => invoke($17, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1526
assert_trap(() => invoke($17, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1527
assert_trap(() => invoke($17, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1528
assert_trap(() => invoke($17, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1529
assert_trap(() => invoke($17, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1530
assert_trap(() => invoke($17, `check_t0`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1531
assert_trap(() => invoke($17, `check_t0`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1532
assert_return(() => invoke($17, `check_t0`, [14]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1533
assert_return(() => invoke($17, `check_t0`, [15]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1534
assert_return(() => invoke($17, `check_t0`, [16]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1535
assert_return(() => invoke($17, `check_t0`, [17]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1536
assert_return(() => invoke($17, `check_t0`, [18]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1537
assert_trap(() => invoke($17, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1538
assert_trap(() => invoke($17, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1539
assert_trap(() => invoke($17, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1540
assert_trap(() => invoke($17, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1541
assert_trap(() => invoke($17, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1542
assert_trap(() => invoke($17, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1543
assert_trap(() => invoke($17, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1544
assert_trap(() => invoke($17, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1545
assert_trap(() => invoke($17, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1546
assert_trap(() => invoke($17, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1547
assert_trap(() => invoke($17, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1548
assert_trap(() => invoke($17, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1549
assert_trap(() => invoke($17, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1550
assert_trap(() => invoke($17, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1551
assert_return(() => invoke($17, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1552
assert_return(() => invoke($17, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1553
assert_return(() => invoke($17, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1554
assert_return(() => invoke($17, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1555
assert_trap(() => invoke($17, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1556
assert_trap(() => invoke($17, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1557
assert_trap(() => invoke($17, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1558
assert_trap(() => invoke($17, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1559
assert_return(() => invoke($17, `check_t1`, [11]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1560
assert_return(() => invoke($17, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1561
assert_return(() => invoke($17, `check_t1`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1562
assert_return(() => invoke($17, `check_t1`, [14]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1563
assert_return(() => invoke($17, `check_t1`, [15]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1564
assert_trap(() => invoke($17, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1565
assert_trap(() => invoke($17, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1566
assert_trap(() => invoke($17, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1567
assert_trap(() => invoke($17, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1568
assert_trap(() => invoke($17, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1569
assert_trap(() => invoke($17, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1570
assert_trap(() => invoke($17, `check_t1`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1571
assert_trap(() => invoke($17, `check_t1`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1572
assert_trap(() => invoke($17, `check_t1`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1573
assert_trap(() => invoke($17, `check_t1`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1574
assert_trap(() => invoke($17, `check_t1`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1575
assert_trap(() => invoke($17, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1576
assert_trap(() => invoke($17, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1577
assert_trap(() => invoke($17, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1579
let $18 = instantiate(`(module
  (type (func (result i32)))  ;; type #0
  (import "a" "ef0" (func (result i32)))    ;; index 0
  (import "a" "ef1" (func (result i32)))
  (import "a" "ef2" (func (result i32)))
  (import "a" "ef3" (func (result i32)))
  (import "a" "ef4" (func (result i32)))    ;; index 4
  (table \$t0 30 30 funcref)
  (table \$t1 30 30 funcref)
  (elem (table \$t1) (i32.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t1) (i32.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (elem (table \$t0) (i32.const 3) func 1 3 1 4)
  (elem (table \$t0) (i32.const 11) func 6 3 2 5 7)
  (func (result i32) (i32.const 5))  ;; index 5
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))  ;; index 9
  (func (export "test")
    (table.copy \$t0 \$t1 (i32.const 10) (i32.const 0) (i32.const 20)))
  (func (export "check_t0") (param i32) (result i32)
    (call_indirect \$t1 (type 0) (local.get 0)))
  (func (export "check_t1") (param i32) (result i32)
    (call_indirect \$t0 (type 0) (local.get 0)))
)`);

// ./test/core/memory64/table_copy64.wast:1609
invoke($18, `test`, []);

// ./test/core/memory64/table_copy64.wast:1610
assert_trap(() => invoke($18, `check_t0`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1611
assert_trap(() => invoke($18, `check_t0`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1612
assert_return(() => invoke($18, `check_t0`, [2]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1613
assert_return(() => invoke($18, `check_t0`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1614
assert_return(() => invoke($18, `check_t0`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1615
assert_return(() => invoke($18, `check_t0`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1616
assert_trap(() => invoke($18, `check_t0`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1617
assert_trap(() => invoke($18, `check_t0`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1618
assert_trap(() => invoke($18, `check_t0`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1619
assert_trap(() => invoke($18, `check_t0`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1620
assert_trap(() => invoke($18, `check_t0`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1621
assert_trap(() => invoke($18, `check_t0`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1622
assert_return(() => invoke($18, `check_t0`, [12]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1623
assert_return(() => invoke($18, `check_t0`, [13]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1624
assert_return(() => invoke($18, `check_t0`, [14]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1625
assert_return(() => invoke($18, `check_t0`, [15]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1626
assert_return(() => invoke($18, `check_t0`, [16]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1627
assert_trap(() => invoke($18, `check_t0`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1628
assert_trap(() => invoke($18, `check_t0`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1629
assert_trap(() => invoke($18, `check_t0`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1630
assert_trap(() => invoke($18, `check_t0`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1631
assert_trap(() => invoke($18, `check_t0`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1632
assert_trap(() => invoke($18, `check_t0`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1633
assert_trap(() => invoke($18, `check_t0`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1634
assert_trap(() => invoke($18, `check_t0`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1635
assert_trap(() => invoke($18, `check_t0`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1636
assert_trap(() => invoke($18, `check_t0`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1637
assert_trap(() => invoke($18, `check_t0`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1638
assert_trap(() => invoke($18, `check_t0`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1639
assert_trap(() => invoke($18, `check_t0`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1640
assert_trap(() => invoke($18, `check_t1`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1641
assert_trap(() => invoke($18, `check_t1`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1642
assert_trap(() => invoke($18, `check_t1`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1643
assert_return(() => invoke($18, `check_t1`, [3]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1644
assert_return(() => invoke($18, `check_t1`, [4]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1645
assert_return(() => invoke($18, `check_t1`, [5]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1646
assert_return(() => invoke($18, `check_t1`, [6]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1647
assert_trap(() => invoke($18, `check_t1`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1648
assert_trap(() => invoke($18, `check_t1`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1649
assert_trap(() => invoke($18, `check_t1`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1650
assert_trap(() => invoke($18, `check_t1`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1651
assert_trap(() => invoke($18, `check_t1`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1652
assert_return(() => invoke($18, `check_t1`, [12]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1653
assert_return(() => invoke($18, `check_t1`, [13]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1654
assert_return(() => invoke($18, `check_t1`, [14]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:1655
assert_return(() => invoke($18, `check_t1`, [15]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:1656
assert_trap(() => invoke($18, `check_t1`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1657
assert_trap(() => invoke($18, `check_t1`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1658
assert_trap(() => invoke($18, `check_t1`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1659
assert_trap(() => invoke($18, `check_t1`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1660
assert_trap(() => invoke($18, `check_t1`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1661
assert_trap(() => invoke($18, `check_t1`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1662
assert_return(() => invoke($18, `check_t1`, [22]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:1663
assert_return(() => invoke($18, `check_t1`, [23]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:1664
assert_return(() => invoke($18, `check_t1`, [24]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:1665
assert_return(() => invoke($18, `check_t1`, [25]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:1666
assert_return(() => invoke($18, `check_t1`, [26]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:1667
assert_trap(() => invoke($18, `check_t1`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1668
assert_trap(() => invoke($18, `check_t1`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1669
assert_trap(() => invoke($18, `check_t1`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:1671
let $19 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 28) (i64.const 1) (i64.const 3))
    ))`);

// ./test/core/memory64/table_copy64.wast:1694
assert_trap(() => invoke($19, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:1696
let $20 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 0xFFFFFFFE) (i64.const 1) (i64.const 2))
    ))`);

// ./test/core/memory64/table_copy64.wast:1719
assert_trap(() => invoke($20, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:1721
let $21 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 15) (i64.const 25) (i64.const 6))
    ))`);

// ./test/core/memory64/table_copy64.wast:1744
assert_trap(() => invoke($21, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:1746
let $22 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 15) (i64.const 0xFFFFFFFE) (i64.const 2))
    ))`);

// ./test/core/memory64/table_copy64.wast:1769
assert_trap(() => invoke($22, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:1771
let $23 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 15) (i64.const 25) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:1794
invoke($23, `test`, []);

// ./test/core/memory64/table_copy64.wast:1796
let $24 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 30) (i64.const 15) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:1819
invoke($24, `test`, []);

// ./test/core/memory64/table_copy64.wast:1821
let $25 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 31) (i64.const 15) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:1844
assert_trap(() => invoke($25, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:1846
let $26 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 15) (i64.const 30) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:1869
invoke($26, `test`, []);

// ./test/core/memory64/table_copy64.wast:1871
let $27 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 15) (i64.const 31) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:1894
assert_trap(() => invoke($27, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:1896
let $28 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 30) (i64.const 30) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:1919
invoke($28, `test`, []);

// ./test/core/memory64/table_copy64.wast:1921
let $29 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t0 \$t0 (i64.const 31) (i64.const 31) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:1944
assert_trap(() => invoke($29, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:1946
let $30 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 28) (i64.const 1) (i64.const 3))
    ))`);

// ./test/core/memory64/table_copy64.wast:1969
assert_trap(() => invoke($30, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:1971
let $31 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 0xFFFFFFFE) (i64.const 1) (i64.const 2))
    ))`);

// ./test/core/memory64/table_copy64.wast:1994
assert_trap(() => invoke($31, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:1996
let $32 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 15) (i64.const 25) (i64.const 6))
    ))`);

// ./test/core/memory64/table_copy64.wast:2019
assert_trap(() => invoke($32, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2021
let $33 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 15) (i64.const 0xFFFFFFFE) (i64.const 2))
    ))`);

// ./test/core/memory64/table_copy64.wast:2044
assert_trap(() => invoke($33, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2046
let $34 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 15) (i64.const 25) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:2069
invoke($34, `test`, []);

// ./test/core/memory64/table_copy64.wast:2071
let $35 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 30) (i64.const 15) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:2094
invoke($35, `test`, []);

// ./test/core/memory64/table_copy64.wast:2096
let $36 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 31) (i64.const 15) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:2119
assert_trap(() => invoke($36, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2121
let $37 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 15) (i64.const 30) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:2144
invoke($37, `test`, []);

// ./test/core/memory64/table_copy64.wast:2146
let $38 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 15) (i64.const 31) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:2169
assert_trap(() => invoke($38, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2171
let $39 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 30) (i64.const 30) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:2194
invoke($39, `test`, []);

// ./test/core/memory64/table_copy64.wast:2196
let $40 = instantiate(`(module
  (table \$t0 i64 30 30 funcref)
  (table \$t1 i64 30 30 funcref)
  (elem (table \$t0) (i64.const 2) func 3 1 4 1)
  (elem funcref
    (ref.func 2) (ref.func 7) (ref.func 1) (ref.func 8))
  (elem (table \$t0) (i64.const 12) func 7 5 2 3 6)
  (elem funcref
    (ref.func 5) (ref.func 9) (ref.func 2) (ref.func 7) (ref.func 6))
  (func (result i32) (i32.const 0))
  (func (result i32) (i32.const 1))
  (func (result i32) (i32.const 2))
  (func (result i32) (i32.const 3))
  (func (result i32) (i32.const 4))
  (func (result i32) (i32.const 5))
  (func (result i32) (i32.const 6))
  (func (result i32) (i32.const 7))
  (func (result i32) (i32.const 8))
  (func (result i32) (i32.const 9))
  (func (export "test")
    (table.copy \$t1 \$t0 (i64.const 31) (i64.const 31) (i64.const 0))
    ))`);

// ./test/core/memory64/table_copy64.wast:2219
assert_trap(() => invoke($40, `test`, []), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2221
let $41 = instantiate(`(module
  (type (func (result i32)))
  (table 32 64 funcref)
  (elem (i32.const 0)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2247
assert_trap(() => invoke($41, `run`, [24, 0, 16]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2249
assert_return(() => invoke($41, `test`, [0]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2250
assert_return(() => invoke($41, `test`, [1]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2251
assert_return(() => invoke($41, `test`, [2]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2252
assert_return(() => invoke($41, `test`, [3]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2253
assert_return(() => invoke($41, `test`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2254
assert_return(() => invoke($41, `test`, [5]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2255
assert_return(() => invoke($41, `test`, [6]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2256
assert_return(() => invoke($41, `test`, [7]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2257
assert_trap(() => invoke($41, `test`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2258
assert_trap(() => invoke($41, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2259
assert_trap(() => invoke($41, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2260
assert_trap(() => invoke($41, `test`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2261
assert_trap(() => invoke($41, `test`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2262
assert_trap(() => invoke($41, `test`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2263
assert_trap(() => invoke($41, `test`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2264
assert_trap(() => invoke($41, `test`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2265
assert_trap(() => invoke($41, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2266
assert_trap(() => invoke($41, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2267
assert_trap(() => invoke($41, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2268
assert_trap(() => invoke($41, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2269
assert_trap(() => invoke($41, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2270
assert_trap(() => invoke($41, `test`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2271
assert_trap(() => invoke($41, `test`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2272
assert_trap(() => invoke($41, `test`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2273
assert_trap(() => invoke($41, `test`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2274
assert_trap(() => invoke($41, `test`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2275
assert_trap(() => invoke($41, `test`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2276
assert_trap(() => invoke($41, `test`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2277
assert_trap(() => invoke($41, `test`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2278
assert_trap(() => invoke($41, `test`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2279
assert_trap(() => invoke($41, `test`, [30]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2280
assert_trap(() => invoke($41, `test`, [31]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2282
let $42 = instantiate(`(module
  (type (func (result i32)))
  (table 32 64 funcref)
  (elem (i32.const 0)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7 \$f8)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2308
assert_trap(() => invoke($42, `run`, [23, 0, 15]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2310
assert_return(() => invoke($42, `test`, [0]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2311
assert_return(() => invoke($42, `test`, [1]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2312
assert_return(() => invoke($42, `test`, [2]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2313
assert_return(() => invoke($42, `test`, [3]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2314
assert_return(() => invoke($42, `test`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2315
assert_return(() => invoke($42, `test`, [5]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2316
assert_return(() => invoke($42, `test`, [6]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2317
assert_return(() => invoke($42, `test`, [7]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2318
assert_return(() => invoke($42, `test`, [8]), [value("i32", 8)]);

// ./test/core/memory64/table_copy64.wast:2319
assert_trap(() => invoke($42, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2320
assert_trap(() => invoke($42, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2321
assert_trap(() => invoke($42, `test`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2322
assert_trap(() => invoke($42, `test`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2323
assert_trap(() => invoke($42, `test`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2324
assert_trap(() => invoke($42, `test`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2325
assert_trap(() => invoke($42, `test`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2326
assert_trap(() => invoke($42, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2327
assert_trap(() => invoke($42, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2328
assert_trap(() => invoke($42, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2329
assert_trap(() => invoke($42, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2330
assert_trap(() => invoke($42, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2331
assert_trap(() => invoke($42, `test`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2332
assert_trap(() => invoke($42, `test`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2333
assert_trap(() => invoke($42, `test`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2334
assert_trap(() => invoke($42, `test`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2335
assert_trap(() => invoke($42, `test`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2336
assert_trap(() => invoke($42, `test`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2337
assert_trap(() => invoke($42, `test`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2338
assert_trap(() => invoke($42, `test`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2339
assert_trap(() => invoke($42, `test`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2340
assert_trap(() => invoke($42, `test`, [30]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2341
assert_trap(() => invoke($42, `test`, [31]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2343
let $43 = instantiate(`(module
  (type (func (result i32)))
  (table 32 64 funcref)
  (elem (i32.const 24)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2369
assert_trap(() => invoke($43, `run`, [0, 24, 16]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2371
assert_trap(() => invoke($43, `test`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2372
assert_trap(() => invoke($43, `test`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2373
assert_trap(() => invoke($43, `test`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2374
assert_trap(() => invoke($43, `test`, [3]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2375
assert_trap(() => invoke($43, `test`, [4]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2376
assert_trap(() => invoke($43, `test`, [5]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2377
assert_trap(() => invoke($43, `test`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2378
assert_trap(() => invoke($43, `test`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2379
assert_trap(() => invoke($43, `test`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2380
assert_trap(() => invoke($43, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2381
assert_trap(() => invoke($43, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2382
assert_trap(() => invoke($43, `test`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2383
assert_trap(() => invoke($43, `test`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2384
assert_trap(() => invoke($43, `test`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2385
assert_trap(() => invoke($43, `test`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2386
assert_trap(() => invoke($43, `test`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2387
assert_trap(() => invoke($43, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2388
assert_trap(() => invoke($43, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2389
assert_trap(() => invoke($43, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2390
assert_trap(() => invoke($43, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2391
assert_trap(() => invoke($43, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2392
assert_trap(() => invoke($43, `test`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2393
assert_trap(() => invoke($43, `test`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2394
assert_trap(() => invoke($43, `test`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2395
assert_return(() => invoke($43, `test`, [24]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2396
assert_return(() => invoke($43, `test`, [25]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2397
assert_return(() => invoke($43, `test`, [26]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2398
assert_return(() => invoke($43, `test`, [27]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2399
assert_return(() => invoke($43, `test`, [28]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2400
assert_return(() => invoke($43, `test`, [29]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2401
assert_return(() => invoke($43, `test`, [30]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2402
assert_return(() => invoke($43, `test`, [31]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2404
let $44 = instantiate(`(module
  (type (func (result i32)))
  (table 32 64 funcref)
  (elem (i32.const 23)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7 \$f8)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2430
assert_trap(() => invoke($44, `run`, [0, 23, 15]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2432
assert_trap(() => invoke($44, `test`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2433
assert_trap(() => invoke($44, `test`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2434
assert_trap(() => invoke($44, `test`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2435
assert_trap(() => invoke($44, `test`, [3]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2436
assert_trap(() => invoke($44, `test`, [4]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2437
assert_trap(() => invoke($44, `test`, [5]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2438
assert_trap(() => invoke($44, `test`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2439
assert_trap(() => invoke($44, `test`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2440
assert_trap(() => invoke($44, `test`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2441
assert_trap(() => invoke($44, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2442
assert_trap(() => invoke($44, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2443
assert_trap(() => invoke($44, `test`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2444
assert_trap(() => invoke($44, `test`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2445
assert_trap(() => invoke($44, `test`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2446
assert_trap(() => invoke($44, `test`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2447
assert_trap(() => invoke($44, `test`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2448
assert_trap(() => invoke($44, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2449
assert_trap(() => invoke($44, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2450
assert_trap(() => invoke($44, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2451
assert_trap(() => invoke($44, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2452
assert_trap(() => invoke($44, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2453
assert_trap(() => invoke($44, `test`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2454
assert_trap(() => invoke($44, `test`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2455
assert_return(() => invoke($44, `test`, [23]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2456
assert_return(() => invoke($44, `test`, [24]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2457
assert_return(() => invoke($44, `test`, [25]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2458
assert_return(() => invoke($44, `test`, [26]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2459
assert_return(() => invoke($44, `test`, [27]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2460
assert_return(() => invoke($44, `test`, [28]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2461
assert_return(() => invoke($44, `test`, [29]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2462
assert_return(() => invoke($44, `test`, [30]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2463
assert_return(() => invoke($44, `test`, [31]), [value("i32", 8)]);

// ./test/core/memory64/table_copy64.wast:2465
let $45 = instantiate(`(module
  (type (func (result i32)))
  (table 32 64 funcref)
  (elem (i32.const 11)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2491
assert_trap(() => invoke($45, `run`, [24, 11, 16]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2493
assert_trap(() => invoke($45, `test`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2494
assert_trap(() => invoke($45, `test`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2495
assert_trap(() => invoke($45, `test`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2496
assert_trap(() => invoke($45, `test`, [3]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2497
assert_trap(() => invoke($45, `test`, [4]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2498
assert_trap(() => invoke($45, `test`, [5]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2499
assert_trap(() => invoke($45, `test`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2500
assert_trap(() => invoke($45, `test`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2501
assert_trap(() => invoke($45, `test`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2502
assert_trap(() => invoke($45, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2503
assert_trap(() => invoke($45, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2504
assert_return(() => invoke($45, `test`, [11]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2505
assert_return(() => invoke($45, `test`, [12]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2506
assert_return(() => invoke($45, `test`, [13]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2507
assert_return(() => invoke($45, `test`, [14]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2508
assert_return(() => invoke($45, `test`, [15]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2509
assert_return(() => invoke($45, `test`, [16]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2510
assert_return(() => invoke($45, `test`, [17]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2511
assert_return(() => invoke($45, `test`, [18]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2512
assert_trap(() => invoke($45, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2513
assert_trap(() => invoke($45, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2514
assert_trap(() => invoke($45, `test`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2515
assert_trap(() => invoke($45, `test`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2516
assert_trap(() => invoke($45, `test`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2517
assert_trap(() => invoke($45, `test`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2518
assert_trap(() => invoke($45, `test`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2519
assert_trap(() => invoke($45, `test`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2520
assert_trap(() => invoke($45, `test`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2521
assert_trap(() => invoke($45, `test`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2522
assert_trap(() => invoke($45, `test`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2523
assert_trap(() => invoke($45, `test`, [30]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2524
assert_trap(() => invoke($45, `test`, [31]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2526
let $46 = instantiate(`(module
  (type (func (result i32)))
  (table 32 64 funcref)
  (elem (i32.const 24)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2552
assert_trap(() => invoke($46, `run`, [11, 24, 16]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2554
assert_trap(() => invoke($46, `test`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2555
assert_trap(() => invoke($46, `test`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2556
assert_trap(() => invoke($46, `test`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2557
assert_trap(() => invoke($46, `test`, [3]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2558
assert_trap(() => invoke($46, `test`, [4]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2559
assert_trap(() => invoke($46, `test`, [5]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2560
assert_trap(() => invoke($46, `test`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2561
assert_trap(() => invoke($46, `test`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2562
assert_trap(() => invoke($46, `test`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2563
assert_trap(() => invoke($46, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2564
assert_trap(() => invoke($46, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2565
assert_trap(() => invoke($46, `test`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2566
assert_trap(() => invoke($46, `test`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2567
assert_trap(() => invoke($46, `test`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2568
assert_trap(() => invoke($46, `test`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2569
assert_trap(() => invoke($46, `test`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2570
assert_trap(() => invoke($46, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2571
assert_trap(() => invoke($46, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2572
assert_trap(() => invoke($46, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2573
assert_trap(() => invoke($46, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2574
assert_trap(() => invoke($46, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2575
assert_trap(() => invoke($46, `test`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2576
assert_trap(() => invoke($46, `test`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2577
assert_trap(() => invoke($46, `test`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2578
assert_return(() => invoke($46, `test`, [24]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2579
assert_return(() => invoke($46, `test`, [25]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2580
assert_return(() => invoke($46, `test`, [26]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2581
assert_return(() => invoke($46, `test`, [27]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2582
assert_return(() => invoke($46, `test`, [28]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2583
assert_return(() => invoke($46, `test`, [29]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2584
assert_return(() => invoke($46, `test`, [30]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2585
assert_return(() => invoke($46, `test`, [31]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2587
let $47 = instantiate(`(module
  (type (func (result i32)))
  (table 32 64 funcref)
  (elem (i32.const 21)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2613
assert_trap(() => invoke($47, `run`, [24, 21, 16]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2615
assert_trap(() => invoke($47, `test`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2616
assert_trap(() => invoke($47, `test`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2617
assert_trap(() => invoke($47, `test`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2618
assert_trap(() => invoke($47, `test`, [3]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2619
assert_trap(() => invoke($47, `test`, [4]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2620
assert_trap(() => invoke($47, `test`, [5]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2621
assert_trap(() => invoke($47, `test`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2622
assert_trap(() => invoke($47, `test`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2623
assert_trap(() => invoke($47, `test`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2624
assert_trap(() => invoke($47, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2625
assert_trap(() => invoke($47, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2626
assert_trap(() => invoke($47, `test`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2627
assert_trap(() => invoke($47, `test`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2628
assert_trap(() => invoke($47, `test`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2629
assert_trap(() => invoke($47, `test`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2630
assert_trap(() => invoke($47, `test`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2631
assert_trap(() => invoke($47, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2632
assert_trap(() => invoke($47, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2633
assert_trap(() => invoke($47, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2634
assert_trap(() => invoke($47, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2635
assert_trap(() => invoke($47, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2636
assert_return(() => invoke($47, `test`, [21]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2637
assert_return(() => invoke($47, `test`, [22]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2638
assert_return(() => invoke($47, `test`, [23]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2639
assert_return(() => invoke($47, `test`, [24]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2640
assert_return(() => invoke($47, `test`, [25]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2641
assert_return(() => invoke($47, `test`, [26]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2642
assert_return(() => invoke($47, `test`, [27]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2643
assert_return(() => invoke($47, `test`, [28]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2644
assert_trap(() => invoke($47, `test`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2645
assert_trap(() => invoke($47, `test`, [30]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2646
assert_trap(() => invoke($47, `test`, [31]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2648
let $48 = instantiate(`(module
  (type (func (result i32)))
  (table 32 64 funcref)
  (elem (i32.const 24)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2674
assert_trap(() => invoke($48, `run`, [21, 24, 16]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2676
assert_trap(() => invoke($48, `test`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2677
assert_trap(() => invoke($48, `test`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2678
assert_trap(() => invoke($48, `test`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2679
assert_trap(() => invoke($48, `test`, [3]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2680
assert_trap(() => invoke($48, `test`, [4]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2681
assert_trap(() => invoke($48, `test`, [5]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2682
assert_trap(() => invoke($48, `test`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2683
assert_trap(() => invoke($48, `test`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2684
assert_trap(() => invoke($48, `test`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2685
assert_trap(() => invoke($48, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2686
assert_trap(() => invoke($48, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2687
assert_trap(() => invoke($48, `test`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2688
assert_trap(() => invoke($48, `test`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2689
assert_trap(() => invoke($48, `test`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2690
assert_trap(() => invoke($48, `test`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2691
assert_trap(() => invoke($48, `test`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2692
assert_trap(() => invoke($48, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2693
assert_trap(() => invoke($48, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2694
assert_trap(() => invoke($48, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2695
assert_trap(() => invoke($48, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2696
assert_trap(() => invoke($48, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2697
assert_trap(() => invoke($48, `test`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2698
assert_trap(() => invoke($48, `test`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2699
assert_trap(() => invoke($48, `test`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2700
assert_return(() => invoke($48, `test`, [24]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2701
assert_return(() => invoke($48, `test`, [25]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2702
assert_return(() => invoke($48, `test`, [26]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2703
assert_return(() => invoke($48, `test`, [27]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2704
assert_return(() => invoke($48, `test`, [28]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2705
assert_return(() => invoke($48, `test`, [29]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2706
assert_return(() => invoke($48, `test`, [30]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2707
assert_return(() => invoke($48, `test`, [31]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2709
let $49 = instantiate(`(module
  (type (func (result i32)))
  (table 32 64 funcref)
  (elem (i32.const 21)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7 \$f8 \$f9 \$f10)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2735
assert_trap(() => invoke($49, `run`, [21, 21, 16]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2737
assert_trap(() => invoke($49, `test`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2738
assert_trap(() => invoke($49, `test`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2739
assert_trap(() => invoke($49, `test`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2740
assert_trap(() => invoke($49, `test`, [3]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2741
assert_trap(() => invoke($49, `test`, [4]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2742
assert_trap(() => invoke($49, `test`, [5]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2743
assert_trap(() => invoke($49, `test`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2744
assert_trap(() => invoke($49, `test`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2745
assert_trap(() => invoke($49, `test`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2746
assert_trap(() => invoke($49, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2747
assert_trap(() => invoke($49, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2748
assert_trap(() => invoke($49, `test`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2749
assert_trap(() => invoke($49, `test`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2750
assert_trap(() => invoke($49, `test`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2751
assert_trap(() => invoke($49, `test`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2752
assert_trap(() => invoke($49, `test`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2753
assert_trap(() => invoke($49, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2754
assert_trap(() => invoke($49, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2755
assert_trap(() => invoke($49, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2756
assert_trap(() => invoke($49, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2757
assert_trap(() => invoke($49, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2758
assert_return(() => invoke($49, `test`, [21]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2759
assert_return(() => invoke($49, `test`, [22]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2760
assert_return(() => invoke($49, `test`, [23]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2761
assert_return(() => invoke($49, `test`, [24]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2762
assert_return(() => invoke($49, `test`, [25]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2763
assert_return(() => invoke($49, `test`, [26]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2764
assert_return(() => invoke($49, `test`, [27]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2765
assert_return(() => invoke($49, `test`, [28]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2766
assert_return(() => invoke($49, `test`, [29]), [value("i32", 8)]);

// ./test/core/memory64/table_copy64.wast:2767
assert_return(() => invoke($49, `test`, [30]), [value("i32", 9)]);

// ./test/core/memory64/table_copy64.wast:2768
assert_return(() => invoke($49, `test`, [31]), [value("i32", 10)]);

// ./test/core/memory64/table_copy64.wast:2770
let $50 = instantiate(`(module
  (type (func (result i32)))
  (table 128 128 funcref)
  (elem (i32.const 112)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7 \$f8 \$f9 \$f10 \$f11 \$f12 \$f13 \$f14 \$f15)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2796
assert_trap(() => invoke($50, `run`, [0, 112, -32]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2798
assert_trap(() => invoke($50, `test`, [0]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2799
assert_trap(() => invoke($50, `test`, [1]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2800
assert_trap(() => invoke($50, `test`, [2]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2801
assert_trap(() => invoke($50, `test`, [3]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2802
assert_trap(() => invoke($50, `test`, [4]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2803
assert_trap(() => invoke($50, `test`, [5]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2804
assert_trap(() => invoke($50, `test`, [6]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2805
assert_trap(() => invoke($50, `test`, [7]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2806
assert_trap(() => invoke($50, `test`, [8]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2807
assert_trap(() => invoke($50, `test`, [9]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2808
assert_trap(() => invoke($50, `test`, [10]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2809
assert_trap(() => invoke($50, `test`, [11]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2810
assert_trap(() => invoke($50, `test`, [12]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2811
assert_trap(() => invoke($50, `test`, [13]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2812
assert_trap(() => invoke($50, `test`, [14]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2813
assert_trap(() => invoke($50, `test`, [15]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2814
assert_trap(() => invoke($50, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2815
assert_trap(() => invoke($50, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2816
assert_trap(() => invoke($50, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2817
assert_trap(() => invoke($50, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2818
assert_trap(() => invoke($50, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2819
assert_trap(() => invoke($50, `test`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2820
assert_trap(() => invoke($50, `test`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2821
assert_trap(() => invoke($50, `test`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2822
assert_trap(() => invoke($50, `test`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2823
assert_trap(() => invoke($50, `test`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2824
assert_trap(() => invoke($50, `test`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2825
assert_trap(() => invoke($50, `test`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2826
assert_trap(() => invoke($50, `test`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2827
assert_trap(() => invoke($50, `test`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2828
assert_trap(() => invoke($50, `test`, [30]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2829
assert_trap(() => invoke($50, `test`, [31]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2830
assert_trap(() => invoke($50, `test`, [32]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2831
assert_trap(() => invoke($50, `test`, [33]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2832
assert_trap(() => invoke($50, `test`, [34]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2833
assert_trap(() => invoke($50, `test`, [35]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2834
assert_trap(() => invoke($50, `test`, [36]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2835
assert_trap(() => invoke($50, `test`, [37]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2836
assert_trap(() => invoke($50, `test`, [38]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2837
assert_trap(() => invoke($50, `test`, [39]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2838
assert_trap(() => invoke($50, `test`, [40]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2839
assert_trap(() => invoke($50, `test`, [41]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2840
assert_trap(() => invoke($50, `test`, [42]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2841
assert_trap(() => invoke($50, `test`, [43]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2842
assert_trap(() => invoke($50, `test`, [44]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2843
assert_trap(() => invoke($50, `test`, [45]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2844
assert_trap(() => invoke($50, `test`, [46]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2845
assert_trap(() => invoke($50, `test`, [47]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2846
assert_trap(() => invoke($50, `test`, [48]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2847
assert_trap(() => invoke($50, `test`, [49]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2848
assert_trap(() => invoke($50, `test`, [50]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2849
assert_trap(() => invoke($50, `test`, [51]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2850
assert_trap(() => invoke($50, `test`, [52]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2851
assert_trap(() => invoke($50, `test`, [53]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2852
assert_trap(() => invoke($50, `test`, [54]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2853
assert_trap(() => invoke($50, `test`, [55]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2854
assert_trap(() => invoke($50, `test`, [56]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2855
assert_trap(() => invoke($50, `test`, [57]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2856
assert_trap(() => invoke($50, `test`, [58]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2857
assert_trap(() => invoke($50, `test`, [59]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2858
assert_trap(() => invoke($50, `test`, [60]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2859
assert_trap(() => invoke($50, `test`, [61]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2860
assert_trap(() => invoke($50, `test`, [62]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2861
assert_trap(() => invoke($50, `test`, [63]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2862
assert_trap(() => invoke($50, `test`, [64]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2863
assert_trap(() => invoke($50, `test`, [65]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2864
assert_trap(() => invoke($50, `test`, [66]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2865
assert_trap(() => invoke($50, `test`, [67]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2866
assert_trap(() => invoke($50, `test`, [68]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2867
assert_trap(() => invoke($50, `test`, [69]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2868
assert_trap(() => invoke($50, `test`, [70]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2869
assert_trap(() => invoke($50, `test`, [71]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2870
assert_trap(() => invoke($50, `test`, [72]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2871
assert_trap(() => invoke($50, `test`, [73]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2872
assert_trap(() => invoke($50, `test`, [74]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2873
assert_trap(() => invoke($50, `test`, [75]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2874
assert_trap(() => invoke($50, `test`, [76]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2875
assert_trap(() => invoke($50, `test`, [77]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2876
assert_trap(() => invoke($50, `test`, [78]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2877
assert_trap(() => invoke($50, `test`, [79]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2878
assert_trap(() => invoke($50, `test`, [80]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2879
assert_trap(() => invoke($50, `test`, [81]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2880
assert_trap(() => invoke($50, `test`, [82]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2881
assert_trap(() => invoke($50, `test`, [83]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2882
assert_trap(() => invoke($50, `test`, [84]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2883
assert_trap(() => invoke($50, `test`, [85]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2884
assert_trap(() => invoke($50, `test`, [86]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2885
assert_trap(() => invoke($50, `test`, [87]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2886
assert_trap(() => invoke($50, `test`, [88]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2887
assert_trap(() => invoke($50, `test`, [89]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2888
assert_trap(() => invoke($50, `test`, [90]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2889
assert_trap(() => invoke($50, `test`, [91]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2890
assert_trap(() => invoke($50, `test`, [92]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2891
assert_trap(() => invoke($50, `test`, [93]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2892
assert_trap(() => invoke($50, `test`, [94]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2893
assert_trap(() => invoke($50, `test`, [95]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2894
assert_trap(() => invoke($50, `test`, [96]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2895
assert_trap(() => invoke($50, `test`, [97]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2896
assert_trap(() => invoke($50, `test`, [98]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2897
assert_trap(() => invoke($50, `test`, [99]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2898
assert_trap(() => invoke($50, `test`, [100]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2899
assert_trap(() => invoke($50, `test`, [101]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2900
assert_trap(() => invoke($50, `test`, [102]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2901
assert_trap(() => invoke($50, `test`, [103]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2902
assert_trap(() => invoke($50, `test`, [104]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2903
assert_trap(() => invoke($50, `test`, [105]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2904
assert_trap(() => invoke($50, `test`, [106]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2905
assert_trap(() => invoke($50, `test`, [107]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2906
assert_trap(() => invoke($50, `test`, [108]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2907
assert_trap(() => invoke($50, `test`, [109]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2908
assert_trap(() => invoke($50, `test`, [110]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2909
assert_trap(() => invoke($50, `test`, [111]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2910
assert_return(() => invoke($50, `test`, [112]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2911
assert_return(() => invoke($50, `test`, [113]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2912
assert_return(() => invoke($50, `test`, [114]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2913
assert_return(() => invoke($50, `test`, [115]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2914
assert_return(() => invoke($50, `test`, [116]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2915
assert_return(() => invoke($50, `test`, [117]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2916
assert_return(() => invoke($50, `test`, [118]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2917
assert_return(() => invoke($50, `test`, [119]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2918
assert_return(() => invoke($50, `test`, [120]), [value("i32", 8)]);

// ./test/core/memory64/table_copy64.wast:2919
assert_return(() => invoke($50, `test`, [121]), [value("i32", 9)]);

// ./test/core/memory64/table_copy64.wast:2920
assert_return(() => invoke($50, `test`, [122]), [value("i32", 10)]);

// ./test/core/memory64/table_copy64.wast:2921
assert_return(() => invoke($50, `test`, [123]), [value("i32", 11)]);

// ./test/core/memory64/table_copy64.wast:2922
assert_return(() => invoke($50, `test`, [124]), [value("i32", 12)]);

// ./test/core/memory64/table_copy64.wast:2923
assert_return(() => invoke($50, `test`, [125]), [value("i32", 13)]);

// ./test/core/memory64/table_copy64.wast:2924
assert_return(() => invoke($50, `test`, [126]), [value("i32", 14)]);

// ./test/core/memory64/table_copy64.wast:2925
assert_return(() => invoke($50, `test`, [127]), [value("i32", 15)]);

// ./test/core/memory64/table_copy64.wast:2927
let $51 = instantiate(`(module
  (type (func (result i32)))
  (table 128 128 funcref)
  (elem (i32.const 0)
         \$f0 \$f1 \$f2 \$f3 \$f4 \$f5 \$f6 \$f7 \$f8 \$f9 \$f10 \$f11 \$f12 \$f13 \$f14 \$f15)
  (func \$f0 (export "f0") (result i32) (i32.const 0))
  (func \$f1 (export "f1") (result i32) (i32.const 1))
  (func \$f2 (export "f2") (result i32) (i32.const 2))
  (func \$f3 (export "f3") (result i32) (i32.const 3))
  (func \$f4 (export "f4") (result i32) (i32.const 4))
  (func \$f5 (export "f5") (result i32) (i32.const 5))
  (func \$f6 (export "f6") (result i32) (i32.const 6))
  (func \$f7 (export "f7") (result i32) (i32.const 7))
  (func \$f8 (export "f8") (result i32) (i32.const 8))
  (func \$f9 (export "f9") (result i32) (i32.const 9))
  (func \$f10 (export "f10") (result i32) (i32.const 10))
  (func \$f11 (export "f11") (result i32) (i32.const 11))
  (func \$f12 (export "f12") (result i32) (i32.const 12))
  (func \$f13 (export "f13") (result i32) (i32.const 13))
  (func \$f14 (export "f14") (result i32) (i32.const 14))
  (func \$f15 (export "f15") (result i32) (i32.const 15))
  (func (export "test") (param \$n i32) (result i32)
    (call_indirect (type 0) (local.get \$n)))
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (table.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len))))`);

// ./test/core/memory64/table_copy64.wast:2953
assert_trap(() => invoke($51, `run`, [112, 0, -32]), `out of bounds table access`);

// ./test/core/memory64/table_copy64.wast:2955
assert_return(() => invoke($51, `test`, [0]), [value("i32", 0)]);

// ./test/core/memory64/table_copy64.wast:2956
assert_return(() => invoke($51, `test`, [1]), [value("i32", 1)]);

// ./test/core/memory64/table_copy64.wast:2957
assert_return(() => invoke($51, `test`, [2]), [value("i32", 2)]);

// ./test/core/memory64/table_copy64.wast:2958
assert_return(() => invoke($51, `test`, [3]), [value("i32", 3)]);

// ./test/core/memory64/table_copy64.wast:2959
assert_return(() => invoke($51, `test`, [4]), [value("i32", 4)]);

// ./test/core/memory64/table_copy64.wast:2960
assert_return(() => invoke($51, `test`, [5]), [value("i32", 5)]);

// ./test/core/memory64/table_copy64.wast:2961
assert_return(() => invoke($51, `test`, [6]), [value("i32", 6)]);

// ./test/core/memory64/table_copy64.wast:2962
assert_return(() => invoke($51, `test`, [7]), [value("i32", 7)]);

// ./test/core/memory64/table_copy64.wast:2963
assert_return(() => invoke($51, `test`, [8]), [value("i32", 8)]);

// ./test/core/memory64/table_copy64.wast:2964
assert_return(() => invoke($51, `test`, [9]), [value("i32", 9)]);

// ./test/core/memory64/table_copy64.wast:2965
assert_return(() => invoke($51, `test`, [10]), [value("i32", 10)]);

// ./test/core/memory64/table_copy64.wast:2966
assert_return(() => invoke($51, `test`, [11]), [value("i32", 11)]);

// ./test/core/memory64/table_copy64.wast:2967
assert_return(() => invoke($51, `test`, [12]), [value("i32", 12)]);

// ./test/core/memory64/table_copy64.wast:2968
assert_return(() => invoke($51, `test`, [13]), [value("i32", 13)]);

// ./test/core/memory64/table_copy64.wast:2969
assert_return(() => invoke($51, `test`, [14]), [value("i32", 14)]);

// ./test/core/memory64/table_copy64.wast:2970
assert_return(() => invoke($51, `test`, [15]), [value("i32", 15)]);

// ./test/core/memory64/table_copy64.wast:2971
assert_trap(() => invoke($51, `test`, [16]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2972
assert_trap(() => invoke($51, `test`, [17]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2973
assert_trap(() => invoke($51, `test`, [18]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2974
assert_trap(() => invoke($51, `test`, [19]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2975
assert_trap(() => invoke($51, `test`, [20]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2976
assert_trap(() => invoke($51, `test`, [21]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2977
assert_trap(() => invoke($51, `test`, [22]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2978
assert_trap(() => invoke($51, `test`, [23]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2979
assert_trap(() => invoke($51, `test`, [24]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2980
assert_trap(() => invoke($51, `test`, [25]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2981
assert_trap(() => invoke($51, `test`, [26]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2982
assert_trap(() => invoke($51, `test`, [27]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2983
assert_trap(() => invoke($51, `test`, [28]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2984
assert_trap(() => invoke($51, `test`, [29]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2985
assert_trap(() => invoke($51, `test`, [30]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2986
assert_trap(() => invoke($51, `test`, [31]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2987
assert_trap(() => invoke($51, `test`, [32]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2988
assert_trap(() => invoke($51, `test`, [33]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2989
assert_trap(() => invoke($51, `test`, [34]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2990
assert_trap(() => invoke($51, `test`, [35]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2991
assert_trap(() => invoke($51, `test`, [36]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2992
assert_trap(() => invoke($51, `test`, [37]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2993
assert_trap(() => invoke($51, `test`, [38]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2994
assert_trap(() => invoke($51, `test`, [39]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2995
assert_trap(() => invoke($51, `test`, [40]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2996
assert_trap(() => invoke($51, `test`, [41]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2997
assert_trap(() => invoke($51, `test`, [42]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2998
assert_trap(() => invoke($51, `test`, [43]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:2999
assert_trap(() => invoke($51, `test`, [44]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3000
assert_trap(() => invoke($51, `test`, [45]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3001
assert_trap(() => invoke($51, `test`, [46]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3002
assert_trap(() => invoke($51, `test`, [47]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3003
assert_trap(() => invoke($51, `test`, [48]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3004
assert_trap(() => invoke($51, `test`, [49]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3005
assert_trap(() => invoke($51, `test`, [50]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3006
assert_trap(() => invoke($51, `test`, [51]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3007
assert_trap(() => invoke($51, `test`, [52]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3008
assert_trap(() => invoke($51, `test`, [53]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3009
assert_trap(() => invoke($51, `test`, [54]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3010
assert_trap(() => invoke($51, `test`, [55]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3011
assert_trap(() => invoke($51, `test`, [56]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3012
assert_trap(() => invoke($51, `test`, [57]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3013
assert_trap(() => invoke($51, `test`, [58]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3014
assert_trap(() => invoke($51, `test`, [59]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3015
assert_trap(() => invoke($51, `test`, [60]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3016
assert_trap(() => invoke($51, `test`, [61]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3017
assert_trap(() => invoke($51, `test`, [62]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3018
assert_trap(() => invoke($51, `test`, [63]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3019
assert_trap(() => invoke($51, `test`, [64]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3020
assert_trap(() => invoke($51, `test`, [65]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3021
assert_trap(() => invoke($51, `test`, [66]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3022
assert_trap(() => invoke($51, `test`, [67]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3023
assert_trap(() => invoke($51, `test`, [68]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3024
assert_trap(() => invoke($51, `test`, [69]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3025
assert_trap(() => invoke($51, `test`, [70]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3026
assert_trap(() => invoke($51, `test`, [71]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3027
assert_trap(() => invoke($51, `test`, [72]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3028
assert_trap(() => invoke($51, `test`, [73]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3029
assert_trap(() => invoke($51, `test`, [74]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3030
assert_trap(() => invoke($51, `test`, [75]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3031
assert_trap(() => invoke($51, `test`, [76]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3032
assert_trap(() => invoke($51, `test`, [77]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3033
assert_trap(() => invoke($51, `test`, [78]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3034
assert_trap(() => invoke($51, `test`, [79]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3035
assert_trap(() => invoke($51, `test`, [80]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3036
assert_trap(() => invoke($51, `test`, [81]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3037
assert_trap(() => invoke($51, `test`, [82]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3038
assert_trap(() => invoke($51, `test`, [83]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3039
assert_trap(() => invoke($51, `test`, [84]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3040
assert_trap(() => invoke($51, `test`, [85]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3041
assert_trap(() => invoke($51, `test`, [86]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3042
assert_trap(() => invoke($51, `test`, [87]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3043
assert_trap(() => invoke($51, `test`, [88]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3044
assert_trap(() => invoke($51, `test`, [89]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3045
assert_trap(() => invoke($51, `test`, [90]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3046
assert_trap(() => invoke($51, `test`, [91]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3047
assert_trap(() => invoke($51, `test`, [92]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3048
assert_trap(() => invoke($51, `test`, [93]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3049
assert_trap(() => invoke($51, `test`, [94]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3050
assert_trap(() => invoke($51, `test`, [95]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3051
assert_trap(() => invoke($51, `test`, [96]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3052
assert_trap(() => invoke($51, `test`, [97]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3053
assert_trap(() => invoke($51, `test`, [98]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3054
assert_trap(() => invoke($51, `test`, [99]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3055
assert_trap(() => invoke($51, `test`, [100]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3056
assert_trap(() => invoke($51, `test`, [101]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3057
assert_trap(() => invoke($51, `test`, [102]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3058
assert_trap(() => invoke($51, `test`, [103]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3059
assert_trap(() => invoke($51, `test`, [104]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3060
assert_trap(() => invoke($51, `test`, [105]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3061
assert_trap(() => invoke($51, `test`, [106]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3062
assert_trap(() => invoke($51, `test`, [107]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3063
assert_trap(() => invoke($51, `test`, [108]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3064
assert_trap(() => invoke($51, `test`, [109]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3065
assert_trap(() => invoke($51, `test`, [110]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3066
assert_trap(() => invoke($51, `test`, [111]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3067
assert_trap(() => invoke($51, `test`, [112]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3068
assert_trap(() => invoke($51, `test`, [113]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3069
assert_trap(() => invoke($51, `test`, [114]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3070
assert_trap(() => invoke($51, `test`, [115]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3071
assert_trap(() => invoke($51, `test`, [116]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3072
assert_trap(() => invoke($51, `test`, [117]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3073
assert_trap(() => invoke($51, `test`, [118]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3074
assert_trap(() => invoke($51, `test`, [119]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3075
assert_trap(() => invoke($51, `test`, [120]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3076
assert_trap(() => invoke($51, `test`, [121]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3077
assert_trap(() => invoke($51, `test`, [122]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3078
assert_trap(() => invoke($51, `test`, [123]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3079
assert_trap(() => invoke($51, `test`, [124]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3080
assert_trap(() => invoke($51, `test`, [125]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3081
assert_trap(() => invoke($51, `test`, [126]), `uninitialized element`);

// ./test/core/memory64/table_copy64.wast:3082
assert_trap(() => invoke($51, `test`, [127]), `uninitialized element`);

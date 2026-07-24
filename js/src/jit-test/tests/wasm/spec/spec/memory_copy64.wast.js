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

// ./test/core/memory64/memory_copy64.wast

// ./test/core/memory64/memory_copy64.wast:6
let $0 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (func (export "test")
    (nop))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:15
invoke($0, `test`, []);

// ./test/core/memory64/memory_copy64.wast:17
assert_return(() => invoke($0, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:18
assert_return(() => invoke($0, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:19
assert_return(() => invoke($0, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:20
assert_return(() => invoke($0, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:21
assert_return(() => invoke($0, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:22
assert_return(() => invoke($0, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:23
assert_return(() => invoke($0, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:24
assert_return(() => invoke($0, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:25
assert_return(() => invoke($0, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:26
assert_return(() => invoke($0, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:27
assert_return(() => invoke($0, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:28
assert_return(() => invoke($0, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:29
assert_return(() => invoke($0, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:30
assert_return(() => invoke($0, `load8_u`, [13n]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:31
assert_return(() => invoke($0, `load8_u`, [14n]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:32
assert_return(() => invoke($0, `load8_u`, [15n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:33
assert_return(() => invoke($0, `load8_u`, [16n]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:34
assert_return(() => invoke($0, `load8_u`, [17n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:35
assert_return(() => invoke($0, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:36
assert_return(() => invoke($0, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:37
assert_return(() => invoke($0, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:38
assert_return(() => invoke($0, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:39
assert_return(() => invoke($0, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:40
assert_return(() => invoke($0, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:41
assert_return(() => invoke($0, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:42
assert_return(() => invoke($0, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:43
assert_return(() => invoke($0, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:44
assert_return(() => invoke($0, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:45
assert_return(() => invoke($0, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:46
assert_return(() => invoke($0, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:48
let $1 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (func (export "test")
    (memory.copy (i64.const 13) (i64.const 2) (i64.const 3)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:57
invoke($1, `test`, []);

// ./test/core/memory64/memory_copy64.wast:59
assert_return(() => invoke($1, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:60
assert_return(() => invoke($1, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:61
assert_return(() => invoke($1, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:62
assert_return(() => invoke($1, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:63
assert_return(() => invoke($1, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:64
assert_return(() => invoke($1, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:65
assert_return(() => invoke($1, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:66
assert_return(() => invoke($1, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:67
assert_return(() => invoke($1, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:68
assert_return(() => invoke($1, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:69
assert_return(() => invoke($1, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:70
assert_return(() => invoke($1, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:71
assert_return(() => invoke($1, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:72
assert_return(() => invoke($1, `load8_u`, [13n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:73
assert_return(() => invoke($1, `load8_u`, [14n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:74
assert_return(() => invoke($1, `load8_u`, [15n]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:75
assert_return(() => invoke($1, `load8_u`, [16n]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:76
assert_return(() => invoke($1, `load8_u`, [17n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:77
assert_return(() => invoke($1, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:78
assert_return(() => invoke($1, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:79
assert_return(() => invoke($1, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:80
assert_return(() => invoke($1, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:81
assert_return(() => invoke($1, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:82
assert_return(() => invoke($1, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:83
assert_return(() => invoke($1, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:84
assert_return(() => invoke($1, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:85
assert_return(() => invoke($1, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:86
assert_return(() => invoke($1, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:87
assert_return(() => invoke($1, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:88
assert_return(() => invoke($1, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:90
let $2 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (func (export "test")
    (memory.copy (i64.const 25) (i64.const 15) (i64.const 2)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:99
invoke($2, `test`, []);

// ./test/core/memory64/memory_copy64.wast:101
assert_return(() => invoke($2, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:102
assert_return(() => invoke($2, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:103
assert_return(() => invoke($2, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:104
assert_return(() => invoke($2, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:105
assert_return(() => invoke($2, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:106
assert_return(() => invoke($2, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:107
assert_return(() => invoke($2, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:108
assert_return(() => invoke($2, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:109
assert_return(() => invoke($2, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:110
assert_return(() => invoke($2, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:111
assert_return(() => invoke($2, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:112
assert_return(() => invoke($2, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:113
assert_return(() => invoke($2, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:114
assert_return(() => invoke($2, `load8_u`, [13n]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:115
assert_return(() => invoke($2, `load8_u`, [14n]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:116
assert_return(() => invoke($2, `load8_u`, [15n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:117
assert_return(() => invoke($2, `load8_u`, [16n]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:118
assert_return(() => invoke($2, `load8_u`, [17n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:119
assert_return(() => invoke($2, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:120
assert_return(() => invoke($2, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:121
assert_return(() => invoke($2, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:122
assert_return(() => invoke($2, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:123
assert_return(() => invoke($2, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:124
assert_return(() => invoke($2, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:125
assert_return(() => invoke($2, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:126
assert_return(() => invoke($2, `load8_u`, [25n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:127
assert_return(() => invoke($2, `load8_u`, [26n]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:128
assert_return(() => invoke($2, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:129
assert_return(() => invoke($2, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:130
assert_return(() => invoke($2, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:132
let $3 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (func (export "test")
    (memory.copy (i64.const 13) (i64.const 25) (i64.const 3)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:141
invoke($3, `test`, []);

// ./test/core/memory64/memory_copy64.wast:143
assert_return(() => invoke($3, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:144
assert_return(() => invoke($3, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:145
assert_return(() => invoke($3, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:146
assert_return(() => invoke($3, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:147
assert_return(() => invoke($3, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:148
assert_return(() => invoke($3, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:149
assert_return(() => invoke($3, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:150
assert_return(() => invoke($3, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:151
assert_return(() => invoke($3, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:152
assert_return(() => invoke($3, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:153
assert_return(() => invoke($3, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:154
assert_return(() => invoke($3, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:155
assert_return(() => invoke($3, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:156
assert_return(() => invoke($3, `load8_u`, [13n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:157
assert_return(() => invoke($3, `load8_u`, [14n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:158
assert_return(() => invoke($3, `load8_u`, [15n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:159
assert_return(() => invoke($3, `load8_u`, [16n]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:160
assert_return(() => invoke($3, `load8_u`, [17n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:161
assert_return(() => invoke($3, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:162
assert_return(() => invoke($3, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:163
assert_return(() => invoke($3, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:164
assert_return(() => invoke($3, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:165
assert_return(() => invoke($3, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:166
assert_return(() => invoke($3, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:167
assert_return(() => invoke($3, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:168
assert_return(() => invoke($3, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:169
assert_return(() => invoke($3, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:170
assert_return(() => invoke($3, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:171
assert_return(() => invoke($3, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:172
assert_return(() => invoke($3, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:174
let $4 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (func (export "test")
    (memory.copy (i64.const 20) (i64.const 22) (i64.const 4)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:183
invoke($4, `test`, []);

// ./test/core/memory64/memory_copy64.wast:185
assert_return(() => invoke($4, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:186
assert_return(() => invoke($4, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:187
assert_return(() => invoke($4, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:188
assert_return(() => invoke($4, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:189
assert_return(() => invoke($4, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:190
assert_return(() => invoke($4, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:191
assert_return(() => invoke($4, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:192
assert_return(() => invoke($4, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:193
assert_return(() => invoke($4, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:194
assert_return(() => invoke($4, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:195
assert_return(() => invoke($4, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:196
assert_return(() => invoke($4, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:197
assert_return(() => invoke($4, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:198
assert_return(() => invoke($4, `load8_u`, [13n]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:199
assert_return(() => invoke($4, `load8_u`, [14n]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:200
assert_return(() => invoke($4, `load8_u`, [15n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:201
assert_return(() => invoke($4, `load8_u`, [16n]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:202
assert_return(() => invoke($4, `load8_u`, [17n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:203
assert_return(() => invoke($4, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:204
assert_return(() => invoke($4, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:205
assert_return(() => invoke($4, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:206
assert_return(() => invoke($4, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:207
assert_return(() => invoke($4, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:208
assert_return(() => invoke($4, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:209
assert_return(() => invoke($4, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:210
assert_return(() => invoke($4, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:211
assert_return(() => invoke($4, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:212
assert_return(() => invoke($4, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:213
assert_return(() => invoke($4, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:214
assert_return(() => invoke($4, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:216
let $5 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (func (export "test")
    (memory.copy (i64.const 25) (i64.const 1) (i64.const 3)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:225
invoke($5, `test`, []);

// ./test/core/memory64/memory_copy64.wast:227
assert_return(() => invoke($5, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:228
assert_return(() => invoke($5, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:229
assert_return(() => invoke($5, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:230
assert_return(() => invoke($5, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:231
assert_return(() => invoke($5, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:232
assert_return(() => invoke($5, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:233
assert_return(() => invoke($5, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:234
assert_return(() => invoke($5, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:235
assert_return(() => invoke($5, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:236
assert_return(() => invoke($5, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:237
assert_return(() => invoke($5, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:238
assert_return(() => invoke($5, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:239
assert_return(() => invoke($5, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:240
assert_return(() => invoke($5, `load8_u`, [13n]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:241
assert_return(() => invoke($5, `load8_u`, [14n]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:242
assert_return(() => invoke($5, `load8_u`, [15n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:243
assert_return(() => invoke($5, `load8_u`, [16n]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:244
assert_return(() => invoke($5, `load8_u`, [17n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:245
assert_return(() => invoke($5, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:246
assert_return(() => invoke($5, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:247
assert_return(() => invoke($5, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:248
assert_return(() => invoke($5, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:249
assert_return(() => invoke($5, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:250
assert_return(() => invoke($5, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:251
assert_return(() => invoke($5, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:252
assert_return(() => invoke($5, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:253
assert_return(() => invoke($5, `load8_u`, [26n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:254
assert_return(() => invoke($5, `load8_u`, [27n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:255
assert_return(() => invoke($5, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:256
assert_return(() => invoke($5, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:258
let $6 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (func (export "test")
    (memory.copy (i64.const 10) (i64.const 12) (i64.const 7)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:267
invoke($6, `test`, []);

// ./test/core/memory64/memory_copy64.wast:269
assert_return(() => invoke($6, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:270
assert_return(() => invoke($6, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:271
assert_return(() => invoke($6, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:272
assert_return(() => invoke($6, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:273
assert_return(() => invoke($6, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:274
assert_return(() => invoke($6, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:275
assert_return(() => invoke($6, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:276
assert_return(() => invoke($6, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:277
assert_return(() => invoke($6, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:278
assert_return(() => invoke($6, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:279
assert_return(() => invoke($6, `load8_u`, [10n]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:280
assert_return(() => invoke($6, `load8_u`, [11n]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:281
assert_return(() => invoke($6, `load8_u`, [12n]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:282
assert_return(() => invoke($6, `load8_u`, [13n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:283
assert_return(() => invoke($6, `load8_u`, [14n]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:284
assert_return(() => invoke($6, `load8_u`, [15n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:285
assert_return(() => invoke($6, `load8_u`, [16n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:286
assert_return(() => invoke($6, `load8_u`, [17n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:287
assert_return(() => invoke($6, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:288
assert_return(() => invoke($6, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:289
assert_return(() => invoke($6, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:290
assert_return(() => invoke($6, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:291
assert_return(() => invoke($6, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:292
assert_return(() => invoke($6, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:293
assert_return(() => invoke($6, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:294
assert_return(() => invoke($6, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:295
assert_return(() => invoke($6, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:296
assert_return(() => invoke($6, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:297
assert_return(() => invoke($6, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:298
assert_return(() => invoke($6, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:300
let $7 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (func (export "test")
    (memory.copy (i64.const 12) (i64.const 10) (i64.const 7)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:309
invoke($7, `test`, []);

// ./test/core/memory64/memory_copy64.wast:311
assert_return(() => invoke($7, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:312
assert_return(() => invoke($7, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:313
assert_return(() => invoke($7, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:314
assert_return(() => invoke($7, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:315
assert_return(() => invoke($7, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:316
assert_return(() => invoke($7, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:317
assert_return(() => invoke($7, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:318
assert_return(() => invoke($7, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:319
assert_return(() => invoke($7, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:320
assert_return(() => invoke($7, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:321
assert_return(() => invoke($7, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:322
assert_return(() => invoke($7, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:323
assert_return(() => invoke($7, `load8_u`, [12n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:324
assert_return(() => invoke($7, `load8_u`, [13n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:325
assert_return(() => invoke($7, `load8_u`, [14n]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:326
assert_return(() => invoke($7, `load8_u`, [15n]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:327
assert_return(() => invoke($7, `load8_u`, [16n]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:328
assert_return(() => invoke($7, `load8_u`, [17n]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:329
assert_return(() => invoke($7, `load8_u`, [18n]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:330
assert_return(() => invoke($7, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:331
assert_return(() => invoke($7, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:332
assert_return(() => invoke($7, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:333
assert_return(() => invoke($7, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:334
assert_return(() => invoke($7, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:335
assert_return(() => invoke($7, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:336
assert_return(() => invoke($7, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:337
assert_return(() => invoke($7, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:338
assert_return(() => invoke($7, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:339
assert_return(() => invoke($7, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:340
assert_return(() => invoke($7, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:342
let $8 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 0) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:350
assert_trap(() => invoke($8, `run`, [65516, 0, 40]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:353
assert_return(() => invoke($8, `load8_u`, [0]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:354
assert_return(() => invoke($8, `load8_u`, [1]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:355
assert_return(() => invoke($8, `load8_u`, [2]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:356
assert_return(() => invoke($8, `load8_u`, [3]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:357
assert_return(() => invoke($8, `load8_u`, [4]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:358
assert_return(() => invoke($8, `load8_u`, [5]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:359
assert_return(() => invoke($8, `load8_u`, [6]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:360
assert_return(() => invoke($8, `load8_u`, [7]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:361
assert_return(() => invoke($8, `load8_u`, [8]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:362
assert_return(() => invoke($8, `load8_u`, [9]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:363
assert_return(() => invoke($8, `load8_u`, [10]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:364
assert_return(() => invoke($8, `load8_u`, [11]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:365
assert_return(() => invoke($8, `load8_u`, [12]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:366
assert_return(() => invoke($8, `load8_u`, [13]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:367
assert_return(() => invoke($8, `load8_u`, [14]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:368
assert_return(() => invoke($8, `load8_u`, [15]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:369
assert_return(() => invoke($8, `load8_u`, [16]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:370
assert_return(() => invoke($8, `load8_u`, [17]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:371
assert_return(() => invoke($8, `load8_u`, [18]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:372
assert_return(() => invoke($8, `load8_u`, [19]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:373
assert_return(() => invoke($8, `load8_u`, [218]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:374
assert_return(() => invoke($8, `load8_u`, [417]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:375
assert_return(() => invoke($8, `load8_u`, [616]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:376
assert_return(() => invoke($8, `load8_u`, [815]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:377
assert_return(() => invoke($8, `load8_u`, [1014]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:378
assert_return(() => invoke($8, `load8_u`, [1213]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:379
assert_return(() => invoke($8, `load8_u`, [1412]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:380
assert_return(() => invoke($8, `load8_u`, [1611]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:381
assert_return(() => invoke($8, `load8_u`, [1810]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:382
assert_return(() => invoke($8, `load8_u`, [2009]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:383
assert_return(() => invoke($8, `load8_u`, [2208]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:384
assert_return(() => invoke($8, `load8_u`, [2407]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:385
assert_return(() => invoke($8, `load8_u`, [2606]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:386
assert_return(() => invoke($8, `load8_u`, [2805]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:387
assert_return(() => invoke($8, `load8_u`, [3004]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:388
assert_return(() => invoke($8, `load8_u`, [3203]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:389
assert_return(() => invoke($8, `load8_u`, [3402]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:390
assert_return(() => invoke($8, `load8_u`, [3601]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:391
assert_return(() => invoke($8, `load8_u`, [3800]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:392
assert_return(() => invoke($8, `load8_u`, [3999]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:393
assert_return(() => invoke($8, `load8_u`, [4198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:394
assert_return(() => invoke($8, `load8_u`, [4397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:395
assert_return(() => invoke($8, `load8_u`, [4596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:396
assert_return(() => invoke($8, `load8_u`, [4795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:397
assert_return(() => invoke($8, `load8_u`, [4994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:398
assert_return(() => invoke($8, `load8_u`, [5193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:399
assert_return(() => invoke($8, `load8_u`, [5392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:400
assert_return(() => invoke($8, `load8_u`, [5591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:401
assert_return(() => invoke($8, `load8_u`, [5790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:402
assert_return(() => invoke($8, `load8_u`, [5989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:403
assert_return(() => invoke($8, `load8_u`, [6188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:404
assert_return(() => invoke($8, `load8_u`, [6387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:405
assert_return(() => invoke($8, `load8_u`, [6586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:406
assert_return(() => invoke($8, `load8_u`, [6785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:407
assert_return(() => invoke($8, `load8_u`, [6984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:408
assert_return(() => invoke($8, `load8_u`, [7183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:409
assert_return(() => invoke($8, `load8_u`, [7382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:410
assert_return(() => invoke($8, `load8_u`, [7581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:411
assert_return(() => invoke($8, `load8_u`, [7780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:412
assert_return(() => invoke($8, `load8_u`, [7979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:413
assert_return(() => invoke($8, `load8_u`, [8178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:414
assert_return(() => invoke($8, `load8_u`, [8377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:415
assert_return(() => invoke($8, `load8_u`, [8576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:416
assert_return(() => invoke($8, `load8_u`, [8775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:417
assert_return(() => invoke($8, `load8_u`, [8974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:418
assert_return(() => invoke($8, `load8_u`, [9173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:419
assert_return(() => invoke($8, `load8_u`, [9372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:420
assert_return(() => invoke($8, `load8_u`, [9571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:421
assert_return(() => invoke($8, `load8_u`, [9770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:422
assert_return(() => invoke($8, `load8_u`, [9969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:423
assert_return(() => invoke($8, `load8_u`, [10168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:424
assert_return(() => invoke($8, `load8_u`, [10367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:425
assert_return(() => invoke($8, `load8_u`, [10566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:426
assert_return(() => invoke($8, `load8_u`, [10765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:427
assert_return(() => invoke($8, `load8_u`, [10964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:428
assert_return(() => invoke($8, `load8_u`, [11163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:429
assert_return(() => invoke($8, `load8_u`, [11362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:430
assert_return(() => invoke($8, `load8_u`, [11561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:431
assert_return(() => invoke($8, `load8_u`, [11760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:432
assert_return(() => invoke($8, `load8_u`, [11959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:433
assert_return(() => invoke($8, `load8_u`, [12158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:434
assert_return(() => invoke($8, `load8_u`, [12357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:435
assert_return(() => invoke($8, `load8_u`, [12556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:436
assert_return(() => invoke($8, `load8_u`, [12755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:437
assert_return(() => invoke($8, `load8_u`, [12954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:438
assert_return(() => invoke($8, `load8_u`, [13153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:439
assert_return(() => invoke($8, `load8_u`, [13352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:440
assert_return(() => invoke($8, `load8_u`, [13551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:441
assert_return(() => invoke($8, `load8_u`, [13750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:442
assert_return(() => invoke($8, `load8_u`, [13949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:443
assert_return(() => invoke($8, `load8_u`, [14148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:444
assert_return(() => invoke($8, `load8_u`, [14347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:445
assert_return(() => invoke($8, `load8_u`, [14546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:446
assert_return(() => invoke($8, `load8_u`, [14745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:447
assert_return(() => invoke($8, `load8_u`, [14944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:448
assert_return(() => invoke($8, `load8_u`, [15143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:449
assert_return(() => invoke($8, `load8_u`, [15342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:450
assert_return(() => invoke($8, `load8_u`, [15541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:451
assert_return(() => invoke($8, `load8_u`, [15740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:452
assert_return(() => invoke($8, `load8_u`, [15939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:453
assert_return(() => invoke($8, `load8_u`, [16138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:454
assert_return(() => invoke($8, `load8_u`, [16337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:455
assert_return(() => invoke($8, `load8_u`, [16536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:456
assert_return(() => invoke($8, `load8_u`, [16735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:457
assert_return(() => invoke($8, `load8_u`, [16934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:458
assert_return(() => invoke($8, `load8_u`, [17133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:459
assert_return(() => invoke($8, `load8_u`, [17332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:460
assert_return(() => invoke($8, `load8_u`, [17531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:461
assert_return(() => invoke($8, `load8_u`, [17730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:462
assert_return(() => invoke($8, `load8_u`, [17929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:463
assert_return(() => invoke($8, `load8_u`, [18128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:464
assert_return(() => invoke($8, `load8_u`, [18327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:465
assert_return(() => invoke($8, `load8_u`, [18526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:466
assert_return(() => invoke($8, `load8_u`, [18725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:467
assert_return(() => invoke($8, `load8_u`, [18924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:468
assert_return(() => invoke($8, `load8_u`, [19123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:469
assert_return(() => invoke($8, `load8_u`, [19322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:470
assert_return(() => invoke($8, `load8_u`, [19521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:471
assert_return(() => invoke($8, `load8_u`, [19720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:472
assert_return(() => invoke($8, `load8_u`, [19919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:473
assert_return(() => invoke($8, `load8_u`, [20118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:474
assert_return(() => invoke($8, `load8_u`, [20317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:475
assert_return(() => invoke($8, `load8_u`, [20516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:476
assert_return(() => invoke($8, `load8_u`, [20715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:477
assert_return(() => invoke($8, `load8_u`, [20914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:478
assert_return(() => invoke($8, `load8_u`, [21113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:479
assert_return(() => invoke($8, `load8_u`, [21312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:480
assert_return(() => invoke($8, `load8_u`, [21511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:481
assert_return(() => invoke($8, `load8_u`, [21710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:482
assert_return(() => invoke($8, `load8_u`, [21909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:483
assert_return(() => invoke($8, `load8_u`, [22108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:484
assert_return(() => invoke($8, `load8_u`, [22307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:485
assert_return(() => invoke($8, `load8_u`, [22506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:486
assert_return(() => invoke($8, `load8_u`, [22705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:487
assert_return(() => invoke($8, `load8_u`, [22904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:488
assert_return(() => invoke($8, `load8_u`, [23103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:489
assert_return(() => invoke($8, `load8_u`, [23302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:490
assert_return(() => invoke($8, `load8_u`, [23501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:491
assert_return(() => invoke($8, `load8_u`, [23700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:492
assert_return(() => invoke($8, `load8_u`, [23899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:493
assert_return(() => invoke($8, `load8_u`, [24098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:494
assert_return(() => invoke($8, `load8_u`, [24297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:495
assert_return(() => invoke($8, `load8_u`, [24496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:496
assert_return(() => invoke($8, `load8_u`, [24695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:497
assert_return(() => invoke($8, `load8_u`, [24894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:498
assert_return(() => invoke($8, `load8_u`, [25093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:499
assert_return(() => invoke($8, `load8_u`, [25292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:500
assert_return(() => invoke($8, `load8_u`, [25491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:501
assert_return(() => invoke($8, `load8_u`, [25690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:502
assert_return(() => invoke($8, `load8_u`, [25889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:503
assert_return(() => invoke($8, `load8_u`, [26088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:504
assert_return(() => invoke($8, `load8_u`, [26287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:505
assert_return(() => invoke($8, `load8_u`, [26486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:506
assert_return(() => invoke($8, `load8_u`, [26685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:507
assert_return(() => invoke($8, `load8_u`, [26884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:508
assert_return(() => invoke($8, `load8_u`, [27083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:509
assert_return(() => invoke($8, `load8_u`, [27282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:510
assert_return(() => invoke($8, `load8_u`, [27481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:511
assert_return(() => invoke($8, `load8_u`, [27680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:512
assert_return(() => invoke($8, `load8_u`, [27879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:513
assert_return(() => invoke($8, `load8_u`, [28078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:514
assert_return(() => invoke($8, `load8_u`, [28277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:515
assert_return(() => invoke($8, `load8_u`, [28476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:516
assert_return(() => invoke($8, `load8_u`, [28675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:517
assert_return(() => invoke($8, `load8_u`, [28874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:518
assert_return(() => invoke($8, `load8_u`, [29073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:519
assert_return(() => invoke($8, `load8_u`, [29272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:520
assert_return(() => invoke($8, `load8_u`, [29471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:521
assert_return(() => invoke($8, `load8_u`, [29670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:522
assert_return(() => invoke($8, `load8_u`, [29869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:523
assert_return(() => invoke($8, `load8_u`, [30068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:524
assert_return(() => invoke($8, `load8_u`, [30267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:525
assert_return(() => invoke($8, `load8_u`, [30466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:526
assert_return(() => invoke($8, `load8_u`, [30665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:527
assert_return(() => invoke($8, `load8_u`, [30864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:528
assert_return(() => invoke($8, `load8_u`, [31063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:529
assert_return(() => invoke($8, `load8_u`, [31262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:530
assert_return(() => invoke($8, `load8_u`, [31461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:531
assert_return(() => invoke($8, `load8_u`, [31660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:532
assert_return(() => invoke($8, `load8_u`, [31859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:533
assert_return(() => invoke($8, `load8_u`, [32058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:534
assert_return(() => invoke($8, `load8_u`, [32257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:535
assert_return(() => invoke($8, `load8_u`, [32456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:536
assert_return(() => invoke($8, `load8_u`, [32655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:537
assert_return(() => invoke($8, `load8_u`, [32854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:538
assert_return(() => invoke($8, `load8_u`, [33053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:539
assert_return(() => invoke($8, `load8_u`, [33252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:540
assert_return(() => invoke($8, `load8_u`, [33451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:541
assert_return(() => invoke($8, `load8_u`, [33650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:542
assert_return(() => invoke($8, `load8_u`, [33849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:543
assert_return(() => invoke($8, `load8_u`, [34048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:544
assert_return(() => invoke($8, `load8_u`, [34247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:545
assert_return(() => invoke($8, `load8_u`, [34446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:546
assert_return(() => invoke($8, `load8_u`, [34645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:547
assert_return(() => invoke($8, `load8_u`, [34844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:548
assert_return(() => invoke($8, `load8_u`, [35043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:549
assert_return(() => invoke($8, `load8_u`, [35242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:550
assert_return(() => invoke($8, `load8_u`, [35441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:551
assert_return(() => invoke($8, `load8_u`, [35640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:552
assert_return(() => invoke($8, `load8_u`, [35839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:553
assert_return(() => invoke($8, `load8_u`, [36038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:554
assert_return(() => invoke($8, `load8_u`, [36237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:555
assert_return(() => invoke($8, `load8_u`, [36436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:556
assert_return(() => invoke($8, `load8_u`, [36635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:557
assert_return(() => invoke($8, `load8_u`, [36834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:558
assert_return(() => invoke($8, `load8_u`, [37033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:559
assert_return(() => invoke($8, `load8_u`, [37232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:560
assert_return(() => invoke($8, `load8_u`, [37431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:561
assert_return(() => invoke($8, `load8_u`, [37630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:562
assert_return(() => invoke($8, `load8_u`, [37829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:563
assert_return(() => invoke($8, `load8_u`, [38028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:564
assert_return(() => invoke($8, `load8_u`, [38227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:565
assert_return(() => invoke($8, `load8_u`, [38426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:566
assert_return(() => invoke($8, `load8_u`, [38625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:567
assert_return(() => invoke($8, `load8_u`, [38824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:568
assert_return(() => invoke($8, `load8_u`, [39023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:569
assert_return(() => invoke($8, `load8_u`, [39222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:570
assert_return(() => invoke($8, `load8_u`, [39421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:571
assert_return(() => invoke($8, `load8_u`, [39620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:572
assert_return(() => invoke($8, `load8_u`, [39819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:573
assert_return(() => invoke($8, `load8_u`, [40018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:574
assert_return(() => invoke($8, `load8_u`, [40217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:575
assert_return(() => invoke($8, `load8_u`, [40416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:576
assert_return(() => invoke($8, `load8_u`, [40615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:577
assert_return(() => invoke($8, `load8_u`, [40814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:578
assert_return(() => invoke($8, `load8_u`, [41013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:579
assert_return(() => invoke($8, `load8_u`, [41212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:580
assert_return(() => invoke($8, `load8_u`, [41411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:581
assert_return(() => invoke($8, `load8_u`, [41610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:582
assert_return(() => invoke($8, `load8_u`, [41809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:583
assert_return(() => invoke($8, `load8_u`, [42008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:584
assert_return(() => invoke($8, `load8_u`, [42207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:585
assert_return(() => invoke($8, `load8_u`, [42406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:586
assert_return(() => invoke($8, `load8_u`, [42605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:587
assert_return(() => invoke($8, `load8_u`, [42804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:588
assert_return(() => invoke($8, `load8_u`, [43003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:589
assert_return(() => invoke($8, `load8_u`, [43202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:590
assert_return(() => invoke($8, `load8_u`, [43401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:591
assert_return(() => invoke($8, `load8_u`, [43600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:592
assert_return(() => invoke($8, `load8_u`, [43799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:593
assert_return(() => invoke($8, `load8_u`, [43998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:594
assert_return(() => invoke($8, `load8_u`, [44197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:595
assert_return(() => invoke($8, `load8_u`, [44396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:596
assert_return(() => invoke($8, `load8_u`, [44595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:597
assert_return(() => invoke($8, `load8_u`, [44794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:598
assert_return(() => invoke($8, `load8_u`, [44993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:599
assert_return(() => invoke($8, `load8_u`, [45192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:600
assert_return(() => invoke($8, `load8_u`, [45391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:601
assert_return(() => invoke($8, `load8_u`, [45590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:602
assert_return(() => invoke($8, `load8_u`, [45789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:603
assert_return(() => invoke($8, `load8_u`, [45988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:604
assert_return(() => invoke($8, `load8_u`, [46187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:605
assert_return(() => invoke($8, `load8_u`, [46386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:606
assert_return(() => invoke($8, `load8_u`, [46585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:607
assert_return(() => invoke($8, `load8_u`, [46784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:608
assert_return(() => invoke($8, `load8_u`, [46983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:609
assert_return(() => invoke($8, `load8_u`, [47182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:610
assert_return(() => invoke($8, `load8_u`, [47381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:611
assert_return(() => invoke($8, `load8_u`, [47580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:612
assert_return(() => invoke($8, `load8_u`, [47779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:613
assert_return(() => invoke($8, `load8_u`, [47978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:614
assert_return(() => invoke($8, `load8_u`, [48177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:615
assert_return(() => invoke($8, `load8_u`, [48376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:616
assert_return(() => invoke($8, `load8_u`, [48575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:617
assert_return(() => invoke($8, `load8_u`, [48774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:618
assert_return(() => invoke($8, `load8_u`, [48973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:619
assert_return(() => invoke($8, `load8_u`, [49172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:620
assert_return(() => invoke($8, `load8_u`, [49371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:621
assert_return(() => invoke($8, `load8_u`, [49570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:622
assert_return(() => invoke($8, `load8_u`, [49769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:623
assert_return(() => invoke($8, `load8_u`, [49968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:624
assert_return(() => invoke($8, `load8_u`, [50167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:625
assert_return(() => invoke($8, `load8_u`, [50366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:626
assert_return(() => invoke($8, `load8_u`, [50565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:627
assert_return(() => invoke($8, `load8_u`, [50764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:628
assert_return(() => invoke($8, `load8_u`, [50963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:629
assert_return(() => invoke($8, `load8_u`, [51162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:630
assert_return(() => invoke($8, `load8_u`, [51361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:631
assert_return(() => invoke($8, `load8_u`, [51560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:632
assert_return(() => invoke($8, `load8_u`, [51759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:633
assert_return(() => invoke($8, `load8_u`, [51958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:634
assert_return(() => invoke($8, `load8_u`, [52157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:635
assert_return(() => invoke($8, `load8_u`, [52356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:636
assert_return(() => invoke($8, `load8_u`, [52555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:637
assert_return(() => invoke($8, `load8_u`, [52754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:638
assert_return(() => invoke($8, `load8_u`, [52953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:639
assert_return(() => invoke($8, `load8_u`, [53152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:640
assert_return(() => invoke($8, `load8_u`, [53351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:641
assert_return(() => invoke($8, `load8_u`, [53550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:642
assert_return(() => invoke($8, `load8_u`, [53749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:643
assert_return(() => invoke($8, `load8_u`, [53948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:644
assert_return(() => invoke($8, `load8_u`, [54147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:645
assert_return(() => invoke($8, `load8_u`, [54346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:646
assert_return(() => invoke($8, `load8_u`, [54545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:647
assert_return(() => invoke($8, `load8_u`, [54744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:648
assert_return(() => invoke($8, `load8_u`, [54943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:649
assert_return(() => invoke($8, `load8_u`, [55142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:650
assert_return(() => invoke($8, `load8_u`, [55341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:651
assert_return(() => invoke($8, `load8_u`, [55540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:652
assert_return(() => invoke($8, `load8_u`, [55739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:653
assert_return(() => invoke($8, `load8_u`, [55938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:654
assert_return(() => invoke($8, `load8_u`, [56137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:655
assert_return(() => invoke($8, `load8_u`, [56336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:656
assert_return(() => invoke($8, `load8_u`, [56535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:657
assert_return(() => invoke($8, `load8_u`, [56734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:658
assert_return(() => invoke($8, `load8_u`, [56933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:659
assert_return(() => invoke($8, `load8_u`, [57132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:660
assert_return(() => invoke($8, `load8_u`, [57331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:661
assert_return(() => invoke($8, `load8_u`, [57530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:662
assert_return(() => invoke($8, `load8_u`, [57729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:663
assert_return(() => invoke($8, `load8_u`, [57928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:664
assert_return(() => invoke($8, `load8_u`, [58127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:665
assert_return(() => invoke($8, `load8_u`, [58326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:666
assert_return(() => invoke($8, `load8_u`, [58525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:667
assert_return(() => invoke($8, `load8_u`, [58724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:668
assert_return(() => invoke($8, `load8_u`, [58923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:669
assert_return(() => invoke($8, `load8_u`, [59122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:670
assert_return(() => invoke($8, `load8_u`, [59321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:671
assert_return(() => invoke($8, `load8_u`, [59520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:672
assert_return(() => invoke($8, `load8_u`, [59719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:673
assert_return(() => invoke($8, `load8_u`, [59918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:674
assert_return(() => invoke($8, `load8_u`, [60117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:675
assert_return(() => invoke($8, `load8_u`, [60316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:676
assert_return(() => invoke($8, `load8_u`, [60515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:677
assert_return(() => invoke($8, `load8_u`, [60714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:678
assert_return(() => invoke($8, `load8_u`, [60913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:679
assert_return(() => invoke($8, `load8_u`, [61112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:680
assert_return(() => invoke($8, `load8_u`, [61311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:681
assert_return(() => invoke($8, `load8_u`, [61510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:682
assert_return(() => invoke($8, `load8_u`, [61709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:683
assert_return(() => invoke($8, `load8_u`, [61908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:684
assert_return(() => invoke($8, `load8_u`, [62107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:685
assert_return(() => invoke($8, `load8_u`, [62306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:686
assert_return(() => invoke($8, `load8_u`, [62505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:687
assert_return(() => invoke($8, `load8_u`, [62704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:688
assert_return(() => invoke($8, `load8_u`, [62903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:689
assert_return(() => invoke($8, `load8_u`, [63102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:690
assert_return(() => invoke($8, `load8_u`, [63301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:691
assert_return(() => invoke($8, `load8_u`, [63500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:692
assert_return(() => invoke($8, `load8_u`, [63699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:693
assert_return(() => invoke($8, `load8_u`, [63898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:694
assert_return(() => invoke($8, `load8_u`, [64097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:695
assert_return(() => invoke($8, `load8_u`, [64296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:696
assert_return(() => invoke($8, `load8_u`, [64495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:697
assert_return(() => invoke($8, `load8_u`, [64694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:698
assert_return(() => invoke($8, `load8_u`, [64893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:699
assert_return(() => invoke($8, `load8_u`, [65092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:700
assert_return(() => invoke($8, `load8_u`, [65291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:701
assert_return(() => invoke($8, `load8_u`, [65490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:703
let $9 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 0) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13\\14")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:711
assert_trap(() => invoke($9, `run`, [65515, 0, 39]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:714
assert_return(() => invoke($9, `load8_u`, [0]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:715
assert_return(() => invoke($9, `load8_u`, [1]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:716
assert_return(() => invoke($9, `load8_u`, [2]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:717
assert_return(() => invoke($9, `load8_u`, [3]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:718
assert_return(() => invoke($9, `load8_u`, [4]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:719
assert_return(() => invoke($9, `load8_u`, [5]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:720
assert_return(() => invoke($9, `load8_u`, [6]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:721
assert_return(() => invoke($9, `load8_u`, [7]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:722
assert_return(() => invoke($9, `load8_u`, [8]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:723
assert_return(() => invoke($9, `load8_u`, [9]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:724
assert_return(() => invoke($9, `load8_u`, [10]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:725
assert_return(() => invoke($9, `load8_u`, [11]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:726
assert_return(() => invoke($9, `load8_u`, [12]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:727
assert_return(() => invoke($9, `load8_u`, [13]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:728
assert_return(() => invoke($9, `load8_u`, [14]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:729
assert_return(() => invoke($9, `load8_u`, [15]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:730
assert_return(() => invoke($9, `load8_u`, [16]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:731
assert_return(() => invoke($9, `load8_u`, [17]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:732
assert_return(() => invoke($9, `load8_u`, [18]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:733
assert_return(() => invoke($9, `load8_u`, [19]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:734
assert_return(() => invoke($9, `load8_u`, [20]), [value("i32", 20)]);

// ./test/core/memory64/memory_copy64.wast:735
assert_return(() => invoke($9, `load8_u`, [219]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:736
assert_return(() => invoke($9, `load8_u`, [418]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:737
assert_return(() => invoke($9, `load8_u`, [617]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:738
assert_return(() => invoke($9, `load8_u`, [816]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:739
assert_return(() => invoke($9, `load8_u`, [1015]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:740
assert_return(() => invoke($9, `load8_u`, [1214]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:741
assert_return(() => invoke($9, `load8_u`, [1413]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:742
assert_return(() => invoke($9, `load8_u`, [1612]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:743
assert_return(() => invoke($9, `load8_u`, [1811]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:744
assert_return(() => invoke($9, `load8_u`, [2010]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:745
assert_return(() => invoke($9, `load8_u`, [2209]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:746
assert_return(() => invoke($9, `load8_u`, [2408]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:747
assert_return(() => invoke($9, `load8_u`, [2607]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:748
assert_return(() => invoke($9, `load8_u`, [2806]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:749
assert_return(() => invoke($9, `load8_u`, [3005]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:750
assert_return(() => invoke($9, `load8_u`, [3204]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:751
assert_return(() => invoke($9, `load8_u`, [3403]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:752
assert_return(() => invoke($9, `load8_u`, [3602]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:753
assert_return(() => invoke($9, `load8_u`, [3801]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:754
assert_return(() => invoke($9, `load8_u`, [4000]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:755
assert_return(() => invoke($9, `load8_u`, [4199]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:756
assert_return(() => invoke($9, `load8_u`, [4398]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:757
assert_return(() => invoke($9, `load8_u`, [4597]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:758
assert_return(() => invoke($9, `load8_u`, [4796]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:759
assert_return(() => invoke($9, `load8_u`, [4995]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:760
assert_return(() => invoke($9, `load8_u`, [5194]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:761
assert_return(() => invoke($9, `load8_u`, [5393]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:762
assert_return(() => invoke($9, `load8_u`, [5592]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:763
assert_return(() => invoke($9, `load8_u`, [5791]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:764
assert_return(() => invoke($9, `load8_u`, [5990]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:765
assert_return(() => invoke($9, `load8_u`, [6189]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:766
assert_return(() => invoke($9, `load8_u`, [6388]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:767
assert_return(() => invoke($9, `load8_u`, [6587]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:768
assert_return(() => invoke($9, `load8_u`, [6786]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:769
assert_return(() => invoke($9, `load8_u`, [6985]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:770
assert_return(() => invoke($9, `load8_u`, [7184]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:771
assert_return(() => invoke($9, `load8_u`, [7383]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:772
assert_return(() => invoke($9, `load8_u`, [7582]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:773
assert_return(() => invoke($9, `load8_u`, [7781]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:774
assert_return(() => invoke($9, `load8_u`, [7980]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:775
assert_return(() => invoke($9, `load8_u`, [8179]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:776
assert_return(() => invoke($9, `load8_u`, [8378]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:777
assert_return(() => invoke($9, `load8_u`, [8577]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:778
assert_return(() => invoke($9, `load8_u`, [8776]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:779
assert_return(() => invoke($9, `load8_u`, [8975]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:780
assert_return(() => invoke($9, `load8_u`, [9174]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:781
assert_return(() => invoke($9, `load8_u`, [9373]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:782
assert_return(() => invoke($9, `load8_u`, [9572]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:783
assert_return(() => invoke($9, `load8_u`, [9771]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:784
assert_return(() => invoke($9, `load8_u`, [9970]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:785
assert_return(() => invoke($9, `load8_u`, [10169]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:786
assert_return(() => invoke($9, `load8_u`, [10368]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:787
assert_return(() => invoke($9, `load8_u`, [10567]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:788
assert_return(() => invoke($9, `load8_u`, [10766]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:789
assert_return(() => invoke($9, `load8_u`, [10965]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:790
assert_return(() => invoke($9, `load8_u`, [11164]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:791
assert_return(() => invoke($9, `load8_u`, [11363]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:792
assert_return(() => invoke($9, `load8_u`, [11562]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:793
assert_return(() => invoke($9, `load8_u`, [11761]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:794
assert_return(() => invoke($9, `load8_u`, [11960]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:795
assert_return(() => invoke($9, `load8_u`, [12159]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:796
assert_return(() => invoke($9, `load8_u`, [12358]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:797
assert_return(() => invoke($9, `load8_u`, [12557]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:798
assert_return(() => invoke($9, `load8_u`, [12756]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:799
assert_return(() => invoke($9, `load8_u`, [12955]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:800
assert_return(() => invoke($9, `load8_u`, [13154]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:801
assert_return(() => invoke($9, `load8_u`, [13353]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:802
assert_return(() => invoke($9, `load8_u`, [13552]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:803
assert_return(() => invoke($9, `load8_u`, [13751]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:804
assert_return(() => invoke($9, `load8_u`, [13950]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:805
assert_return(() => invoke($9, `load8_u`, [14149]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:806
assert_return(() => invoke($9, `load8_u`, [14348]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:807
assert_return(() => invoke($9, `load8_u`, [14547]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:808
assert_return(() => invoke($9, `load8_u`, [14746]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:809
assert_return(() => invoke($9, `load8_u`, [14945]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:810
assert_return(() => invoke($9, `load8_u`, [15144]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:811
assert_return(() => invoke($9, `load8_u`, [15343]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:812
assert_return(() => invoke($9, `load8_u`, [15542]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:813
assert_return(() => invoke($9, `load8_u`, [15741]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:814
assert_return(() => invoke($9, `load8_u`, [15940]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:815
assert_return(() => invoke($9, `load8_u`, [16139]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:816
assert_return(() => invoke($9, `load8_u`, [16338]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:817
assert_return(() => invoke($9, `load8_u`, [16537]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:818
assert_return(() => invoke($9, `load8_u`, [16736]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:819
assert_return(() => invoke($9, `load8_u`, [16935]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:820
assert_return(() => invoke($9, `load8_u`, [17134]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:821
assert_return(() => invoke($9, `load8_u`, [17333]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:822
assert_return(() => invoke($9, `load8_u`, [17532]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:823
assert_return(() => invoke($9, `load8_u`, [17731]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:824
assert_return(() => invoke($9, `load8_u`, [17930]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:825
assert_return(() => invoke($9, `load8_u`, [18129]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:826
assert_return(() => invoke($9, `load8_u`, [18328]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:827
assert_return(() => invoke($9, `load8_u`, [18527]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:828
assert_return(() => invoke($9, `load8_u`, [18726]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:829
assert_return(() => invoke($9, `load8_u`, [18925]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:830
assert_return(() => invoke($9, `load8_u`, [19124]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:831
assert_return(() => invoke($9, `load8_u`, [19323]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:832
assert_return(() => invoke($9, `load8_u`, [19522]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:833
assert_return(() => invoke($9, `load8_u`, [19721]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:834
assert_return(() => invoke($9, `load8_u`, [19920]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:835
assert_return(() => invoke($9, `load8_u`, [20119]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:836
assert_return(() => invoke($9, `load8_u`, [20318]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:837
assert_return(() => invoke($9, `load8_u`, [20517]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:838
assert_return(() => invoke($9, `load8_u`, [20716]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:839
assert_return(() => invoke($9, `load8_u`, [20915]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:840
assert_return(() => invoke($9, `load8_u`, [21114]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:841
assert_return(() => invoke($9, `load8_u`, [21313]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:842
assert_return(() => invoke($9, `load8_u`, [21512]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:843
assert_return(() => invoke($9, `load8_u`, [21711]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:844
assert_return(() => invoke($9, `load8_u`, [21910]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:845
assert_return(() => invoke($9, `load8_u`, [22109]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:846
assert_return(() => invoke($9, `load8_u`, [22308]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:847
assert_return(() => invoke($9, `load8_u`, [22507]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:848
assert_return(() => invoke($9, `load8_u`, [22706]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:849
assert_return(() => invoke($9, `load8_u`, [22905]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:850
assert_return(() => invoke($9, `load8_u`, [23104]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:851
assert_return(() => invoke($9, `load8_u`, [23303]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:852
assert_return(() => invoke($9, `load8_u`, [23502]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:853
assert_return(() => invoke($9, `load8_u`, [23701]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:854
assert_return(() => invoke($9, `load8_u`, [23900]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:855
assert_return(() => invoke($9, `load8_u`, [24099]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:856
assert_return(() => invoke($9, `load8_u`, [24298]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:857
assert_return(() => invoke($9, `load8_u`, [24497]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:858
assert_return(() => invoke($9, `load8_u`, [24696]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:859
assert_return(() => invoke($9, `load8_u`, [24895]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:860
assert_return(() => invoke($9, `load8_u`, [25094]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:861
assert_return(() => invoke($9, `load8_u`, [25293]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:862
assert_return(() => invoke($9, `load8_u`, [25492]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:863
assert_return(() => invoke($9, `load8_u`, [25691]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:864
assert_return(() => invoke($9, `load8_u`, [25890]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:865
assert_return(() => invoke($9, `load8_u`, [26089]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:866
assert_return(() => invoke($9, `load8_u`, [26288]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:867
assert_return(() => invoke($9, `load8_u`, [26487]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:868
assert_return(() => invoke($9, `load8_u`, [26686]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:869
assert_return(() => invoke($9, `load8_u`, [26885]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:870
assert_return(() => invoke($9, `load8_u`, [27084]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:871
assert_return(() => invoke($9, `load8_u`, [27283]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:872
assert_return(() => invoke($9, `load8_u`, [27482]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:873
assert_return(() => invoke($9, `load8_u`, [27681]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:874
assert_return(() => invoke($9, `load8_u`, [27880]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:875
assert_return(() => invoke($9, `load8_u`, [28079]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:876
assert_return(() => invoke($9, `load8_u`, [28278]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:877
assert_return(() => invoke($9, `load8_u`, [28477]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:878
assert_return(() => invoke($9, `load8_u`, [28676]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:879
assert_return(() => invoke($9, `load8_u`, [28875]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:880
assert_return(() => invoke($9, `load8_u`, [29074]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:881
assert_return(() => invoke($9, `load8_u`, [29273]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:882
assert_return(() => invoke($9, `load8_u`, [29472]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:883
assert_return(() => invoke($9, `load8_u`, [29671]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:884
assert_return(() => invoke($9, `load8_u`, [29870]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:885
assert_return(() => invoke($9, `load8_u`, [30069]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:886
assert_return(() => invoke($9, `load8_u`, [30268]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:887
assert_return(() => invoke($9, `load8_u`, [30467]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:888
assert_return(() => invoke($9, `load8_u`, [30666]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:889
assert_return(() => invoke($9, `load8_u`, [30865]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:890
assert_return(() => invoke($9, `load8_u`, [31064]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:891
assert_return(() => invoke($9, `load8_u`, [31263]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:892
assert_return(() => invoke($9, `load8_u`, [31462]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:893
assert_return(() => invoke($9, `load8_u`, [31661]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:894
assert_return(() => invoke($9, `load8_u`, [31860]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:895
assert_return(() => invoke($9, `load8_u`, [32059]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:896
assert_return(() => invoke($9, `load8_u`, [32258]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:897
assert_return(() => invoke($9, `load8_u`, [32457]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:898
assert_return(() => invoke($9, `load8_u`, [32656]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:899
assert_return(() => invoke($9, `load8_u`, [32855]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:900
assert_return(() => invoke($9, `load8_u`, [33054]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:901
assert_return(() => invoke($9, `load8_u`, [33253]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:902
assert_return(() => invoke($9, `load8_u`, [33452]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:903
assert_return(() => invoke($9, `load8_u`, [33651]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:904
assert_return(() => invoke($9, `load8_u`, [33850]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:905
assert_return(() => invoke($9, `load8_u`, [34049]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:906
assert_return(() => invoke($9, `load8_u`, [34248]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:907
assert_return(() => invoke($9, `load8_u`, [34447]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:908
assert_return(() => invoke($9, `load8_u`, [34646]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:909
assert_return(() => invoke($9, `load8_u`, [34845]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:910
assert_return(() => invoke($9, `load8_u`, [35044]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:911
assert_return(() => invoke($9, `load8_u`, [35243]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:912
assert_return(() => invoke($9, `load8_u`, [35442]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:913
assert_return(() => invoke($9, `load8_u`, [35641]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:914
assert_return(() => invoke($9, `load8_u`, [35840]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:915
assert_return(() => invoke($9, `load8_u`, [36039]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:916
assert_return(() => invoke($9, `load8_u`, [36238]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:917
assert_return(() => invoke($9, `load8_u`, [36437]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:918
assert_return(() => invoke($9, `load8_u`, [36636]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:919
assert_return(() => invoke($9, `load8_u`, [36835]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:920
assert_return(() => invoke($9, `load8_u`, [37034]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:921
assert_return(() => invoke($9, `load8_u`, [37233]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:922
assert_return(() => invoke($9, `load8_u`, [37432]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:923
assert_return(() => invoke($9, `load8_u`, [37631]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:924
assert_return(() => invoke($9, `load8_u`, [37830]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:925
assert_return(() => invoke($9, `load8_u`, [38029]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:926
assert_return(() => invoke($9, `load8_u`, [38228]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:927
assert_return(() => invoke($9, `load8_u`, [38427]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:928
assert_return(() => invoke($9, `load8_u`, [38626]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:929
assert_return(() => invoke($9, `load8_u`, [38825]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:930
assert_return(() => invoke($9, `load8_u`, [39024]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:931
assert_return(() => invoke($9, `load8_u`, [39223]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:932
assert_return(() => invoke($9, `load8_u`, [39422]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:933
assert_return(() => invoke($9, `load8_u`, [39621]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:934
assert_return(() => invoke($9, `load8_u`, [39820]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:935
assert_return(() => invoke($9, `load8_u`, [40019]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:936
assert_return(() => invoke($9, `load8_u`, [40218]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:937
assert_return(() => invoke($9, `load8_u`, [40417]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:938
assert_return(() => invoke($9, `load8_u`, [40616]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:939
assert_return(() => invoke($9, `load8_u`, [40815]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:940
assert_return(() => invoke($9, `load8_u`, [41014]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:941
assert_return(() => invoke($9, `load8_u`, [41213]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:942
assert_return(() => invoke($9, `load8_u`, [41412]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:943
assert_return(() => invoke($9, `load8_u`, [41611]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:944
assert_return(() => invoke($9, `load8_u`, [41810]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:945
assert_return(() => invoke($9, `load8_u`, [42009]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:946
assert_return(() => invoke($9, `load8_u`, [42208]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:947
assert_return(() => invoke($9, `load8_u`, [42407]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:948
assert_return(() => invoke($9, `load8_u`, [42606]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:949
assert_return(() => invoke($9, `load8_u`, [42805]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:950
assert_return(() => invoke($9, `load8_u`, [43004]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:951
assert_return(() => invoke($9, `load8_u`, [43203]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:952
assert_return(() => invoke($9, `load8_u`, [43402]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:953
assert_return(() => invoke($9, `load8_u`, [43601]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:954
assert_return(() => invoke($9, `load8_u`, [43800]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:955
assert_return(() => invoke($9, `load8_u`, [43999]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:956
assert_return(() => invoke($9, `load8_u`, [44198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:957
assert_return(() => invoke($9, `load8_u`, [44397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:958
assert_return(() => invoke($9, `load8_u`, [44596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:959
assert_return(() => invoke($9, `load8_u`, [44795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:960
assert_return(() => invoke($9, `load8_u`, [44994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:961
assert_return(() => invoke($9, `load8_u`, [45193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:962
assert_return(() => invoke($9, `load8_u`, [45392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:963
assert_return(() => invoke($9, `load8_u`, [45591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:964
assert_return(() => invoke($9, `load8_u`, [45790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:965
assert_return(() => invoke($9, `load8_u`, [45989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:966
assert_return(() => invoke($9, `load8_u`, [46188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:967
assert_return(() => invoke($9, `load8_u`, [46387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:968
assert_return(() => invoke($9, `load8_u`, [46586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:969
assert_return(() => invoke($9, `load8_u`, [46785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:970
assert_return(() => invoke($9, `load8_u`, [46984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:971
assert_return(() => invoke($9, `load8_u`, [47183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:972
assert_return(() => invoke($9, `load8_u`, [47382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:973
assert_return(() => invoke($9, `load8_u`, [47581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:974
assert_return(() => invoke($9, `load8_u`, [47780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:975
assert_return(() => invoke($9, `load8_u`, [47979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:976
assert_return(() => invoke($9, `load8_u`, [48178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:977
assert_return(() => invoke($9, `load8_u`, [48377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:978
assert_return(() => invoke($9, `load8_u`, [48576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:979
assert_return(() => invoke($9, `load8_u`, [48775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:980
assert_return(() => invoke($9, `load8_u`, [48974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:981
assert_return(() => invoke($9, `load8_u`, [49173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:982
assert_return(() => invoke($9, `load8_u`, [49372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:983
assert_return(() => invoke($9, `load8_u`, [49571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:984
assert_return(() => invoke($9, `load8_u`, [49770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:985
assert_return(() => invoke($9, `load8_u`, [49969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:986
assert_return(() => invoke($9, `load8_u`, [50168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:987
assert_return(() => invoke($9, `load8_u`, [50367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:988
assert_return(() => invoke($9, `load8_u`, [50566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:989
assert_return(() => invoke($9, `load8_u`, [50765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:990
assert_return(() => invoke($9, `load8_u`, [50964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:991
assert_return(() => invoke($9, `load8_u`, [51163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:992
assert_return(() => invoke($9, `load8_u`, [51362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:993
assert_return(() => invoke($9, `load8_u`, [51561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:994
assert_return(() => invoke($9, `load8_u`, [51760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:995
assert_return(() => invoke($9, `load8_u`, [51959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:996
assert_return(() => invoke($9, `load8_u`, [52158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:997
assert_return(() => invoke($9, `load8_u`, [52357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:998
assert_return(() => invoke($9, `load8_u`, [52556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:999
assert_return(() => invoke($9, `load8_u`, [52755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1000
assert_return(() => invoke($9, `load8_u`, [52954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1001
assert_return(() => invoke($9, `load8_u`, [53153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1002
assert_return(() => invoke($9, `load8_u`, [53352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1003
assert_return(() => invoke($9, `load8_u`, [53551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1004
assert_return(() => invoke($9, `load8_u`, [53750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1005
assert_return(() => invoke($9, `load8_u`, [53949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1006
assert_return(() => invoke($9, `load8_u`, [54148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1007
assert_return(() => invoke($9, `load8_u`, [54347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1008
assert_return(() => invoke($9, `load8_u`, [54546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1009
assert_return(() => invoke($9, `load8_u`, [54745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1010
assert_return(() => invoke($9, `load8_u`, [54944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1011
assert_return(() => invoke($9, `load8_u`, [55143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1012
assert_return(() => invoke($9, `load8_u`, [55342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1013
assert_return(() => invoke($9, `load8_u`, [55541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1014
assert_return(() => invoke($9, `load8_u`, [55740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1015
assert_return(() => invoke($9, `load8_u`, [55939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1016
assert_return(() => invoke($9, `load8_u`, [56138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1017
assert_return(() => invoke($9, `load8_u`, [56337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1018
assert_return(() => invoke($9, `load8_u`, [56536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1019
assert_return(() => invoke($9, `load8_u`, [56735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1020
assert_return(() => invoke($9, `load8_u`, [56934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1021
assert_return(() => invoke($9, `load8_u`, [57133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1022
assert_return(() => invoke($9, `load8_u`, [57332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1023
assert_return(() => invoke($9, `load8_u`, [57531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1024
assert_return(() => invoke($9, `load8_u`, [57730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1025
assert_return(() => invoke($9, `load8_u`, [57929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1026
assert_return(() => invoke($9, `load8_u`, [58128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1027
assert_return(() => invoke($9, `load8_u`, [58327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1028
assert_return(() => invoke($9, `load8_u`, [58526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1029
assert_return(() => invoke($9, `load8_u`, [58725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1030
assert_return(() => invoke($9, `load8_u`, [58924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1031
assert_return(() => invoke($9, `load8_u`, [59123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1032
assert_return(() => invoke($9, `load8_u`, [59322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1033
assert_return(() => invoke($9, `load8_u`, [59521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1034
assert_return(() => invoke($9, `load8_u`, [59720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1035
assert_return(() => invoke($9, `load8_u`, [59919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1036
assert_return(() => invoke($9, `load8_u`, [60118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1037
assert_return(() => invoke($9, `load8_u`, [60317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1038
assert_return(() => invoke($9, `load8_u`, [60516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1039
assert_return(() => invoke($9, `load8_u`, [60715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1040
assert_return(() => invoke($9, `load8_u`, [60914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1041
assert_return(() => invoke($9, `load8_u`, [61113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1042
assert_return(() => invoke($9, `load8_u`, [61312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1043
assert_return(() => invoke($9, `load8_u`, [61511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1044
assert_return(() => invoke($9, `load8_u`, [61710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1045
assert_return(() => invoke($9, `load8_u`, [61909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1046
assert_return(() => invoke($9, `load8_u`, [62108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1047
assert_return(() => invoke($9, `load8_u`, [62307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1048
assert_return(() => invoke($9, `load8_u`, [62506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1049
assert_return(() => invoke($9, `load8_u`, [62705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1050
assert_return(() => invoke($9, `load8_u`, [62904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1051
assert_return(() => invoke($9, `load8_u`, [63103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1052
assert_return(() => invoke($9, `load8_u`, [63302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1053
assert_return(() => invoke($9, `load8_u`, [63501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1054
assert_return(() => invoke($9, `load8_u`, [63700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1055
assert_return(() => invoke($9, `load8_u`, [63899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1056
assert_return(() => invoke($9, `load8_u`, [64098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1057
assert_return(() => invoke($9, `load8_u`, [64297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1058
assert_return(() => invoke($9, `load8_u`, [64496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1059
assert_return(() => invoke($9, `load8_u`, [64695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1060
assert_return(() => invoke($9, `load8_u`, [64894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1061
assert_return(() => invoke($9, `load8_u`, [65093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1062
assert_return(() => invoke($9, `load8_u`, [65292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1063
assert_return(() => invoke($9, `load8_u`, [65491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1065
let $10 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 65516) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:1073
assert_trap(() => invoke($10, `run`, [0, 65516, 40]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:1076
assert_return(() => invoke($10, `load8_u`, [198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1077
assert_return(() => invoke($10, `load8_u`, [397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1078
assert_return(() => invoke($10, `load8_u`, [596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1079
assert_return(() => invoke($10, `load8_u`, [795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1080
assert_return(() => invoke($10, `load8_u`, [994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1081
assert_return(() => invoke($10, `load8_u`, [1193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1082
assert_return(() => invoke($10, `load8_u`, [1392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1083
assert_return(() => invoke($10, `load8_u`, [1591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1084
assert_return(() => invoke($10, `load8_u`, [1790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1085
assert_return(() => invoke($10, `load8_u`, [1989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1086
assert_return(() => invoke($10, `load8_u`, [2188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1087
assert_return(() => invoke($10, `load8_u`, [2387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1088
assert_return(() => invoke($10, `load8_u`, [2586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1089
assert_return(() => invoke($10, `load8_u`, [2785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1090
assert_return(() => invoke($10, `load8_u`, [2984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1091
assert_return(() => invoke($10, `load8_u`, [3183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1092
assert_return(() => invoke($10, `load8_u`, [3382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1093
assert_return(() => invoke($10, `load8_u`, [3581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1094
assert_return(() => invoke($10, `load8_u`, [3780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1095
assert_return(() => invoke($10, `load8_u`, [3979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1096
assert_return(() => invoke($10, `load8_u`, [4178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1097
assert_return(() => invoke($10, `load8_u`, [4377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1098
assert_return(() => invoke($10, `load8_u`, [4576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1099
assert_return(() => invoke($10, `load8_u`, [4775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1100
assert_return(() => invoke($10, `load8_u`, [4974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1101
assert_return(() => invoke($10, `load8_u`, [5173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1102
assert_return(() => invoke($10, `load8_u`, [5372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1103
assert_return(() => invoke($10, `load8_u`, [5571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1104
assert_return(() => invoke($10, `load8_u`, [5770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1105
assert_return(() => invoke($10, `load8_u`, [5969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1106
assert_return(() => invoke($10, `load8_u`, [6168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1107
assert_return(() => invoke($10, `load8_u`, [6367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1108
assert_return(() => invoke($10, `load8_u`, [6566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1109
assert_return(() => invoke($10, `load8_u`, [6765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1110
assert_return(() => invoke($10, `load8_u`, [6964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1111
assert_return(() => invoke($10, `load8_u`, [7163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1112
assert_return(() => invoke($10, `load8_u`, [7362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1113
assert_return(() => invoke($10, `load8_u`, [7561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1114
assert_return(() => invoke($10, `load8_u`, [7760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1115
assert_return(() => invoke($10, `load8_u`, [7959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1116
assert_return(() => invoke($10, `load8_u`, [8158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1117
assert_return(() => invoke($10, `load8_u`, [8357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1118
assert_return(() => invoke($10, `load8_u`, [8556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1119
assert_return(() => invoke($10, `load8_u`, [8755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1120
assert_return(() => invoke($10, `load8_u`, [8954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1121
assert_return(() => invoke($10, `load8_u`, [9153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1122
assert_return(() => invoke($10, `load8_u`, [9352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1123
assert_return(() => invoke($10, `load8_u`, [9551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1124
assert_return(() => invoke($10, `load8_u`, [9750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1125
assert_return(() => invoke($10, `load8_u`, [9949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1126
assert_return(() => invoke($10, `load8_u`, [10148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1127
assert_return(() => invoke($10, `load8_u`, [10347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1128
assert_return(() => invoke($10, `load8_u`, [10546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1129
assert_return(() => invoke($10, `load8_u`, [10745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1130
assert_return(() => invoke($10, `load8_u`, [10944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1131
assert_return(() => invoke($10, `load8_u`, [11143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1132
assert_return(() => invoke($10, `load8_u`, [11342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1133
assert_return(() => invoke($10, `load8_u`, [11541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1134
assert_return(() => invoke($10, `load8_u`, [11740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1135
assert_return(() => invoke($10, `load8_u`, [11939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1136
assert_return(() => invoke($10, `load8_u`, [12138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1137
assert_return(() => invoke($10, `load8_u`, [12337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1138
assert_return(() => invoke($10, `load8_u`, [12536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1139
assert_return(() => invoke($10, `load8_u`, [12735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1140
assert_return(() => invoke($10, `load8_u`, [12934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1141
assert_return(() => invoke($10, `load8_u`, [13133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1142
assert_return(() => invoke($10, `load8_u`, [13332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1143
assert_return(() => invoke($10, `load8_u`, [13531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1144
assert_return(() => invoke($10, `load8_u`, [13730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1145
assert_return(() => invoke($10, `load8_u`, [13929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1146
assert_return(() => invoke($10, `load8_u`, [14128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1147
assert_return(() => invoke($10, `load8_u`, [14327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1148
assert_return(() => invoke($10, `load8_u`, [14526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1149
assert_return(() => invoke($10, `load8_u`, [14725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1150
assert_return(() => invoke($10, `load8_u`, [14924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1151
assert_return(() => invoke($10, `load8_u`, [15123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1152
assert_return(() => invoke($10, `load8_u`, [15322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1153
assert_return(() => invoke($10, `load8_u`, [15521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1154
assert_return(() => invoke($10, `load8_u`, [15720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1155
assert_return(() => invoke($10, `load8_u`, [15919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1156
assert_return(() => invoke($10, `load8_u`, [16118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1157
assert_return(() => invoke($10, `load8_u`, [16317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1158
assert_return(() => invoke($10, `load8_u`, [16516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1159
assert_return(() => invoke($10, `load8_u`, [16715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1160
assert_return(() => invoke($10, `load8_u`, [16914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1161
assert_return(() => invoke($10, `load8_u`, [17113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1162
assert_return(() => invoke($10, `load8_u`, [17312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1163
assert_return(() => invoke($10, `load8_u`, [17511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1164
assert_return(() => invoke($10, `load8_u`, [17710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1165
assert_return(() => invoke($10, `load8_u`, [17909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1166
assert_return(() => invoke($10, `load8_u`, [18108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1167
assert_return(() => invoke($10, `load8_u`, [18307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1168
assert_return(() => invoke($10, `load8_u`, [18506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1169
assert_return(() => invoke($10, `load8_u`, [18705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1170
assert_return(() => invoke($10, `load8_u`, [18904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1171
assert_return(() => invoke($10, `load8_u`, [19103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1172
assert_return(() => invoke($10, `load8_u`, [19302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1173
assert_return(() => invoke($10, `load8_u`, [19501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1174
assert_return(() => invoke($10, `load8_u`, [19700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1175
assert_return(() => invoke($10, `load8_u`, [19899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1176
assert_return(() => invoke($10, `load8_u`, [20098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1177
assert_return(() => invoke($10, `load8_u`, [20297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1178
assert_return(() => invoke($10, `load8_u`, [20496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1179
assert_return(() => invoke($10, `load8_u`, [20695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1180
assert_return(() => invoke($10, `load8_u`, [20894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1181
assert_return(() => invoke($10, `load8_u`, [21093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1182
assert_return(() => invoke($10, `load8_u`, [21292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1183
assert_return(() => invoke($10, `load8_u`, [21491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1184
assert_return(() => invoke($10, `load8_u`, [21690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1185
assert_return(() => invoke($10, `load8_u`, [21889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1186
assert_return(() => invoke($10, `load8_u`, [22088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1187
assert_return(() => invoke($10, `load8_u`, [22287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1188
assert_return(() => invoke($10, `load8_u`, [22486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1189
assert_return(() => invoke($10, `load8_u`, [22685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1190
assert_return(() => invoke($10, `load8_u`, [22884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1191
assert_return(() => invoke($10, `load8_u`, [23083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1192
assert_return(() => invoke($10, `load8_u`, [23282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1193
assert_return(() => invoke($10, `load8_u`, [23481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1194
assert_return(() => invoke($10, `load8_u`, [23680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1195
assert_return(() => invoke($10, `load8_u`, [23879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1196
assert_return(() => invoke($10, `load8_u`, [24078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1197
assert_return(() => invoke($10, `load8_u`, [24277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1198
assert_return(() => invoke($10, `load8_u`, [24476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1199
assert_return(() => invoke($10, `load8_u`, [24675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1200
assert_return(() => invoke($10, `load8_u`, [24874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1201
assert_return(() => invoke($10, `load8_u`, [25073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1202
assert_return(() => invoke($10, `load8_u`, [25272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1203
assert_return(() => invoke($10, `load8_u`, [25471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1204
assert_return(() => invoke($10, `load8_u`, [25670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1205
assert_return(() => invoke($10, `load8_u`, [25869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1206
assert_return(() => invoke($10, `load8_u`, [26068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1207
assert_return(() => invoke($10, `load8_u`, [26267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1208
assert_return(() => invoke($10, `load8_u`, [26466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1209
assert_return(() => invoke($10, `load8_u`, [26665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1210
assert_return(() => invoke($10, `load8_u`, [26864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1211
assert_return(() => invoke($10, `load8_u`, [27063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1212
assert_return(() => invoke($10, `load8_u`, [27262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1213
assert_return(() => invoke($10, `load8_u`, [27461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1214
assert_return(() => invoke($10, `load8_u`, [27660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1215
assert_return(() => invoke($10, `load8_u`, [27859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1216
assert_return(() => invoke($10, `load8_u`, [28058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1217
assert_return(() => invoke($10, `load8_u`, [28257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1218
assert_return(() => invoke($10, `load8_u`, [28456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1219
assert_return(() => invoke($10, `load8_u`, [28655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1220
assert_return(() => invoke($10, `load8_u`, [28854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1221
assert_return(() => invoke($10, `load8_u`, [29053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1222
assert_return(() => invoke($10, `load8_u`, [29252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1223
assert_return(() => invoke($10, `load8_u`, [29451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1224
assert_return(() => invoke($10, `load8_u`, [29650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1225
assert_return(() => invoke($10, `load8_u`, [29849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1226
assert_return(() => invoke($10, `load8_u`, [30048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1227
assert_return(() => invoke($10, `load8_u`, [30247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1228
assert_return(() => invoke($10, `load8_u`, [30446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1229
assert_return(() => invoke($10, `load8_u`, [30645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1230
assert_return(() => invoke($10, `load8_u`, [30844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1231
assert_return(() => invoke($10, `load8_u`, [31043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1232
assert_return(() => invoke($10, `load8_u`, [31242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1233
assert_return(() => invoke($10, `load8_u`, [31441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1234
assert_return(() => invoke($10, `load8_u`, [31640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1235
assert_return(() => invoke($10, `load8_u`, [31839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1236
assert_return(() => invoke($10, `load8_u`, [32038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1237
assert_return(() => invoke($10, `load8_u`, [32237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1238
assert_return(() => invoke($10, `load8_u`, [32436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1239
assert_return(() => invoke($10, `load8_u`, [32635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1240
assert_return(() => invoke($10, `load8_u`, [32834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1241
assert_return(() => invoke($10, `load8_u`, [33033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1242
assert_return(() => invoke($10, `load8_u`, [33232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1243
assert_return(() => invoke($10, `load8_u`, [33431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1244
assert_return(() => invoke($10, `load8_u`, [33630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1245
assert_return(() => invoke($10, `load8_u`, [33829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1246
assert_return(() => invoke($10, `load8_u`, [34028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1247
assert_return(() => invoke($10, `load8_u`, [34227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1248
assert_return(() => invoke($10, `load8_u`, [34426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1249
assert_return(() => invoke($10, `load8_u`, [34625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1250
assert_return(() => invoke($10, `load8_u`, [34824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1251
assert_return(() => invoke($10, `load8_u`, [35023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1252
assert_return(() => invoke($10, `load8_u`, [35222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1253
assert_return(() => invoke($10, `load8_u`, [35421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1254
assert_return(() => invoke($10, `load8_u`, [35620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1255
assert_return(() => invoke($10, `load8_u`, [35819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1256
assert_return(() => invoke($10, `load8_u`, [36018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1257
assert_return(() => invoke($10, `load8_u`, [36217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1258
assert_return(() => invoke($10, `load8_u`, [36416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1259
assert_return(() => invoke($10, `load8_u`, [36615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1260
assert_return(() => invoke($10, `load8_u`, [36814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1261
assert_return(() => invoke($10, `load8_u`, [37013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1262
assert_return(() => invoke($10, `load8_u`, [37212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1263
assert_return(() => invoke($10, `load8_u`, [37411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1264
assert_return(() => invoke($10, `load8_u`, [37610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1265
assert_return(() => invoke($10, `load8_u`, [37809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1266
assert_return(() => invoke($10, `load8_u`, [38008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1267
assert_return(() => invoke($10, `load8_u`, [38207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1268
assert_return(() => invoke($10, `load8_u`, [38406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1269
assert_return(() => invoke($10, `load8_u`, [38605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1270
assert_return(() => invoke($10, `load8_u`, [38804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1271
assert_return(() => invoke($10, `load8_u`, [39003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1272
assert_return(() => invoke($10, `load8_u`, [39202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1273
assert_return(() => invoke($10, `load8_u`, [39401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1274
assert_return(() => invoke($10, `load8_u`, [39600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1275
assert_return(() => invoke($10, `load8_u`, [39799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1276
assert_return(() => invoke($10, `load8_u`, [39998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1277
assert_return(() => invoke($10, `load8_u`, [40197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1278
assert_return(() => invoke($10, `load8_u`, [40396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1279
assert_return(() => invoke($10, `load8_u`, [40595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1280
assert_return(() => invoke($10, `load8_u`, [40794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1281
assert_return(() => invoke($10, `load8_u`, [40993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1282
assert_return(() => invoke($10, `load8_u`, [41192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1283
assert_return(() => invoke($10, `load8_u`, [41391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1284
assert_return(() => invoke($10, `load8_u`, [41590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1285
assert_return(() => invoke($10, `load8_u`, [41789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1286
assert_return(() => invoke($10, `load8_u`, [41988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1287
assert_return(() => invoke($10, `load8_u`, [42187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1288
assert_return(() => invoke($10, `load8_u`, [42386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1289
assert_return(() => invoke($10, `load8_u`, [42585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1290
assert_return(() => invoke($10, `load8_u`, [42784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1291
assert_return(() => invoke($10, `load8_u`, [42983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1292
assert_return(() => invoke($10, `load8_u`, [43182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1293
assert_return(() => invoke($10, `load8_u`, [43381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1294
assert_return(() => invoke($10, `load8_u`, [43580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1295
assert_return(() => invoke($10, `load8_u`, [43779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1296
assert_return(() => invoke($10, `load8_u`, [43978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1297
assert_return(() => invoke($10, `load8_u`, [44177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1298
assert_return(() => invoke($10, `load8_u`, [44376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1299
assert_return(() => invoke($10, `load8_u`, [44575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1300
assert_return(() => invoke($10, `load8_u`, [44774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1301
assert_return(() => invoke($10, `load8_u`, [44973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1302
assert_return(() => invoke($10, `load8_u`, [45172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1303
assert_return(() => invoke($10, `load8_u`, [45371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1304
assert_return(() => invoke($10, `load8_u`, [45570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1305
assert_return(() => invoke($10, `load8_u`, [45769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1306
assert_return(() => invoke($10, `load8_u`, [45968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1307
assert_return(() => invoke($10, `load8_u`, [46167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1308
assert_return(() => invoke($10, `load8_u`, [46366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1309
assert_return(() => invoke($10, `load8_u`, [46565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1310
assert_return(() => invoke($10, `load8_u`, [46764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1311
assert_return(() => invoke($10, `load8_u`, [46963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1312
assert_return(() => invoke($10, `load8_u`, [47162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1313
assert_return(() => invoke($10, `load8_u`, [47361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1314
assert_return(() => invoke($10, `load8_u`, [47560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1315
assert_return(() => invoke($10, `load8_u`, [47759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1316
assert_return(() => invoke($10, `load8_u`, [47958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1317
assert_return(() => invoke($10, `load8_u`, [48157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1318
assert_return(() => invoke($10, `load8_u`, [48356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1319
assert_return(() => invoke($10, `load8_u`, [48555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1320
assert_return(() => invoke($10, `load8_u`, [48754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1321
assert_return(() => invoke($10, `load8_u`, [48953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1322
assert_return(() => invoke($10, `load8_u`, [49152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1323
assert_return(() => invoke($10, `load8_u`, [49351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1324
assert_return(() => invoke($10, `load8_u`, [49550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1325
assert_return(() => invoke($10, `load8_u`, [49749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1326
assert_return(() => invoke($10, `load8_u`, [49948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1327
assert_return(() => invoke($10, `load8_u`, [50147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1328
assert_return(() => invoke($10, `load8_u`, [50346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1329
assert_return(() => invoke($10, `load8_u`, [50545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1330
assert_return(() => invoke($10, `load8_u`, [50744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1331
assert_return(() => invoke($10, `load8_u`, [50943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1332
assert_return(() => invoke($10, `load8_u`, [51142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1333
assert_return(() => invoke($10, `load8_u`, [51341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1334
assert_return(() => invoke($10, `load8_u`, [51540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1335
assert_return(() => invoke($10, `load8_u`, [51739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1336
assert_return(() => invoke($10, `load8_u`, [51938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1337
assert_return(() => invoke($10, `load8_u`, [52137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1338
assert_return(() => invoke($10, `load8_u`, [52336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1339
assert_return(() => invoke($10, `load8_u`, [52535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1340
assert_return(() => invoke($10, `load8_u`, [52734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1341
assert_return(() => invoke($10, `load8_u`, [52933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1342
assert_return(() => invoke($10, `load8_u`, [53132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1343
assert_return(() => invoke($10, `load8_u`, [53331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1344
assert_return(() => invoke($10, `load8_u`, [53530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1345
assert_return(() => invoke($10, `load8_u`, [53729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1346
assert_return(() => invoke($10, `load8_u`, [53928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1347
assert_return(() => invoke($10, `load8_u`, [54127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1348
assert_return(() => invoke($10, `load8_u`, [54326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1349
assert_return(() => invoke($10, `load8_u`, [54525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1350
assert_return(() => invoke($10, `load8_u`, [54724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1351
assert_return(() => invoke($10, `load8_u`, [54923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1352
assert_return(() => invoke($10, `load8_u`, [55122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1353
assert_return(() => invoke($10, `load8_u`, [55321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1354
assert_return(() => invoke($10, `load8_u`, [55520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1355
assert_return(() => invoke($10, `load8_u`, [55719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1356
assert_return(() => invoke($10, `load8_u`, [55918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1357
assert_return(() => invoke($10, `load8_u`, [56117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1358
assert_return(() => invoke($10, `load8_u`, [56316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1359
assert_return(() => invoke($10, `load8_u`, [56515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1360
assert_return(() => invoke($10, `load8_u`, [56714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1361
assert_return(() => invoke($10, `load8_u`, [56913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1362
assert_return(() => invoke($10, `load8_u`, [57112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1363
assert_return(() => invoke($10, `load8_u`, [57311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1364
assert_return(() => invoke($10, `load8_u`, [57510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1365
assert_return(() => invoke($10, `load8_u`, [57709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1366
assert_return(() => invoke($10, `load8_u`, [57908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1367
assert_return(() => invoke($10, `load8_u`, [58107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1368
assert_return(() => invoke($10, `load8_u`, [58306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1369
assert_return(() => invoke($10, `load8_u`, [58505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1370
assert_return(() => invoke($10, `load8_u`, [58704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1371
assert_return(() => invoke($10, `load8_u`, [58903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1372
assert_return(() => invoke($10, `load8_u`, [59102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1373
assert_return(() => invoke($10, `load8_u`, [59301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1374
assert_return(() => invoke($10, `load8_u`, [59500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1375
assert_return(() => invoke($10, `load8_u`, [59699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1376
assert_return(() => invoke($10, `load8_u`, [59898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1377
assert_return(() => invoke($10, `load8_u`, [60097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1378
assert_return(() => invoke($10, `load8_u`, [60296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1379
assert_return(() => invoke($10, `load8_u`, [60495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1380
assert_return(() => invoke($10, `load8_u`, [60694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1381
assert_return(() => invoke($10, `load8_u`, [60893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1382
assert_return(() => invoke($10, `load8_u`, [61092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1383
assert_return(() => invoke($10, `load8_u`, [61291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1384
assert_return(() => invoke($10, `load8_u`, [61490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1385
assert_return(() => invoke($10, `load8_u`, [61689]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1386
assert_return(() => invoke($10, `load8_u`, [61888]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1387
assert_return(() => invoke($10, `load8_u`, [62087]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1388
assert_return(() => invoke($10, `load8_u`, [62286]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1389
assert_return(() => invoke($10, `load8_u`, [62485]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1390
assert_return(() => invoke($10, `load8_u`, [62684]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1391
assert_return(() => invoke($10, `load8_u`, [62883]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1392
assert_return(() => invoke($10, `load8_u`, [63082]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1393
assert_return(() => invoke($10, `load8_u`, [63281]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1394
assert_return(() => invoke($10, `load8_u`, [63480]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1395
assert_return(() => invoke($10, `load8_u`, [63679]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1396
assert_return(() => invoke($10, `load8_u`, [63878]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1397
assert_return(() => invoke($10, `load8_u`, [64077]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1398
assert_return(() => invoke($10, `load8_u`, [64276]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1399
assert_return(() => invoke($10, `load8_u`, [64475]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1400
assert_return(() => invoke($10, `load8_u`, [64674]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1401
assert_return(() => invoke($10, `load8_u`, [64873]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1402
assert_return(() => invoke($10, `load8_u`, [65072]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1403
assert_return(() => invoke($10, `load8_u`, [65271]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1404
assert_return(() => invoke($10, `load8_u`, [65470]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1405
assert_return(() => invoke($10, `load8_u`, [65516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1406
assert_return(() => invoke($10, `load8_u`, [65517]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:1407
assert_return(() => invoke($10, `load8_u`, [65518]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:1408
assert_return(() => invoke($10, `load8_u`, [65519]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:1409
assert_return(() => invoke($10, `load8_u`, [65520]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:1410
assert_return(() => invoke($10, `load8_u`, [65521]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:1411
assert_return(() => invoke($10, `load8_u`, [65522]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:1412
assert_return(() => invoke($10, `load8_u`, [65523]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:1413
assert_return(() => invoke($10, `load8_u`, [65524]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:1414
assert_return(() => invoke($10, `load8_u`, [65525]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:1415
assert_return(() => invoke($10, `load8_u`, [65526]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:1416
assert_return(() => invoke($10, `load8_u`, [65527]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:1417
assert_return(() => invoke($10, `load8_u`, [65528]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:1418
assert_return(() => invoke($10, `load8_u`, [65529]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:1419
assert_return(() => invoke($10, `load8_u`, [65530]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:1420
assert_return(() => invoke($10, `load8_u`, [65531]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:1421
assert_return(() => invoke($10, `load8_u`, [65532]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:1422
assert_return(() => invoke($10, `load8_u`, [65533]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:1423
assert_return(() => invoke($10, `load8_u`, [65534]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:1424
assert_return(() => invoke($10, `load8_u`, [65535]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:1426
let $11 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 65515) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13\\14")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:1434
assert_trap(() => invoke($11, `run`, [0, 65515, 39]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:1437
assert_return(() => invoke($11, `load8_u`, [198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1438
assert_return(() => invoke($11, `load8_u`, [397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1439
assert_return(() => invoke($11, `load8_u`, [596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1440
assert_return(() => invoke($11, `load8_u`, [795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1441
assert_return(() => invoke($11, `load8_u`, [994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1442
assert_return(() => invoke($11, `load8_u`, [1193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1443
assert_return(() => invoke($11, `load8_u`, [1392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1444
assert_return(() => invoke($11, `load8_u`, [1591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1445
assert_return(() => invoke($11, `load8_u`, [1790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1446
assert_return(() => invoke($11, `load8_u`, [1989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1447
assert_return(() => invoke($11, `load8_u`, [2188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1448
assert_return(() => invoke($11, `load8_u`, [2387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1449
assert_return(() => invoke($11, `load8_u`, [2586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1450
assert_return(() => invoke($11, `load8_u`, [2785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1451
assert_return(() => invoke($11, `load8_u`, [2984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1452
assert_return(() => invoke($11, `load8_u`, [3183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1453
assert_return(() => invoke($11, `load8_u`, [3382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1454
assert_return(() => invoke($11, `load8_u`, [3581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1455
assert_return(() => invoke($11, `load8_u`, [3780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1456
assert_return(() => invoke($11, `load8_u`, [3979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1457
assert_return(() => invoke($11, `load8_u`, [4178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1458
assert_return(() => invoke($11, `load8_u`, [4377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1459
assert_return(() => invoke($11, `load8_u`, [4576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1460
assert_return(() => invoke($11, `load8_u`, [4775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1461
assert_return(() => invoke($11, `load8_u`, [4974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1462
assert_return(() => invoke($11, `load8_u`, [5173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1463
assert_return(() => invoke($11, `load8_u`, [5372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1464
assert_return(() => invoke($11, `load8_u`, [5571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1465
assert_return(() => invoke($11, `load8_u`, [5770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1466
assert_return(() => invoke($11, `load8_u`, [5969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1467
assert_return(() => invoke($11, `load8_u`, [6168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1468
assert_return(() => invoke($11, `load8_u`, [6367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1469
assert_return(() => invoke($11, `load8_u`, [6566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1470
assert_return(() => invoke($11, `load8_u`, [6765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1471
assert_return(() => invoke($11, `load8_u`, [6964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1472
assert_return(() => invoke($11, `load8_u`, [7163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1473
assert_return(() => invoke($11, `load8_u`, [7362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1474
assert_return(() => invoke($11, `load8_u`, [7561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1475
assert_return(() => invoke($11, `load8_u`, [7760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1476
assert_return(() => invoke($11, `load8_u`, [7959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1477
assert_return(() => invoke($11, `load8_u`, [8158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1478
assert_return(() => invoke($11, `load8_u`, [8357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1479
assert_return(() => invoke($11, `load8_u`, [8556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1480
assert_return(() => invoke($11, `load8_u`, [8755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1481
assert_return(() => invoke($11, `load8_u`, [8954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1482
assert_return(() => invoke($11, `load8_u`, [9153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1483
assert_return(() => invoke($11, `load8_u`, [9352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1484
assert_return(() => invoke($11, `load8_u`, [9551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1485
assert_return(() => invoke($11, `load8_u`, [9750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1486
assert_return(() => invoke($11, `load8_u`, [9949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1487
assert_return(() => invoke($11, `load8_u`, [10148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1488
assert_return(() => invoke($11, `load8_u`, [10347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1489
assert_return(() => invoke($11, `load8_u`, [10546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1490
assert_return(() => invoke($11, `load8_u`, [10745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1491
assert_return(() => invoke($11, `load8_u`, [10944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1492
assert_return(() => invoke($11, `load8_u`, [11143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1493
assert_return(() => invoke($11, `load8_u`, [11342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1494
assert_return(() => invoke($11, `load8_u`, [11541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1495
assert_return(() => invoke($11, `load8_u`, [11740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1496
assert_return(() => invoke($11, `load8_u`, [11939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1497
assert_return(() => invoke($11, `load8_u`, [12138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1498
assert_return(() => invoke($11, `load8_u`, [12337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1499
assert_return(() => invoke($11, `load8_u`, [12536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1500
assert_return(() => invoke($11, `load8_u`, [12735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1501
assert_return(() => invoke($11, `load8_u`, [12934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1502
assert_return(() => invoke($11, `load8_u`, [13133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1503
assert_return(() => invoke($11, `load8_u`, [13332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1504
assert_return(() => invoke($11, `load8_u`, [13531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1505
assert_return(() => invoke($11, `load8_u`, [13730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1506
assert_return(() => invoke($11, `load8_u`, [13929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1507
assert_return(() => invoke($11, `load8_u`, [14128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1508
assert_return(() => invoke($11, `load8_u`, [14327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1509
assert_return(() => invoke($11, `load8_u`, [14526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1510
assert_return(() => invoke($11, `load8_u`, [14725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1511
assert_return(() => invoke($11, `load8_u`, [14924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1512
assert_return(() => invoke($11, `load8_u`, [15123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1513
assert_return(() => invoke($11, `load8_u`, [15322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1514
assert_return(() => invoke($11, `load8_u`, [15521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1515
assert_return(() => invoke($11, `load8_u`, [15720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1516
assert_return(() => invoke($11, `load8_u`, [15919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1517
assert_return(() => invoke($11, `load8_u`, [16118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1518
assert_return(() => invoke($11, `load8_u`, [16317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1519
assert_return(() => invoke($11, `load8_u`, [16516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1520
assert_return(() => invoke($11, `load8_u`, [16715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1521
assert_return(() => invoke($11, `load8_u`, [16914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1522
assert_return(() => invoke($11, `load8_u`, [17113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1523
assert_return(() => invoke($11, `load8_u`, [17312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1524
assert_return(() => invoke($11, `load8_u`, [17511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1525
assert_return(() => invoke($11, `load8_u`, [17710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1526
assert_return(() => invoke($11, `load8_u`, [17909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1527
assert_return(() => invoke($11, `load8_u`, [18108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1528
assert_return(() => invoke($11, `load8_u`, [18307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1529
assert_return(() => invoke($11, `load8_u`, [18506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1530
assert_return(() => invoke($11, `load8_u`, [18705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1531
assert_return(() => invoke($11, `load8_u`, [18904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1532
assert_return(() => invoke($11, `load8_u`, [19103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1533
assert_return(() => invoke($11, `load8_u`, [19302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1534
assert_return(() => invoke($11, `load8_u`, [19501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1535
assert_return(() => invoke($11, `load8_u`, [19700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1536
assert_return(() => invoke($11, `load8_u`, [19899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1537
assert_return(() => invoke($11, `load8_u`, [20098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1538
assert_return(() => invoke($11, `load8_u`, [20297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1539
assert_return(() => invoke($11, `load8_u`, [20496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1540
assert_return(() => invoke($11, `load8_u`, [20695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1541
assert_return(() => invoke($11, `load8_u`, [20894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1542
assert_return(() => invoke($11, `load8_u`, [21093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1543
assert_return(() => invoke($11, `load8_u`, [21292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1544
assert_return(() => invoke($11, `load8_u`, [21491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1545
assert_return(() => invoke($11, `load8_u`, [21690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1546
assert_return(() => invoke($11, `load8_u`, [21889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1547
assert_return(() => invoke($11, `load8_u`, [22088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1548
assert_return(() => invoke($11, `load8_u`, [22287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1549
assert_return(() => invoke($11, `load8_u`, [22486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1550
assert_return(() => invoke($11, `load8_u`, [22685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1551
assert_return(() => invoke($11, `load8_u`, [22884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1552
assert_return(() => invoke($11, `load8_u`, [23083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1553
assert_return(() => invoke($11, `load8_u`, [23282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1554
assert_return(() => invoke($11, `load8_u`, [23481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1555
assert_return(() => invoke($11, `load8_u`, [23680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1556
assert_return(() => invoke($11, `load8_u`, [23879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1557
assert_return(() => invoke($11, `load8_u`, [24078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1558
assert_return(() => invoke($11, `load8_u`, [24277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1559
assert_return(() => invoke($11, `load8_u`, [24476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1560
assert_return(() => invoke($11, `load8_u`, [24675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1561
assert_return(() => invoke($11, `load8_u`, [24874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1562
assert_return(() => invoke($11, `load8_u`, [25073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1563
assert_return(() => invoke($11, `load8_u`, [25272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1564
assert_return(() => invoke($11, `load8_u`, [25471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1565
assert_return(() => invoke($11, `load8_u`, [25670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1566
assert_return(() => invoke($11, `load8_u`, [25869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1567
assert_return(() => invoke($11, `load8_u`, [26068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1568
assert_return(() => invoke($11, `load8_u`, [26267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1569
assert_return(() => invoke($11, `load8_u`, [26466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1570
assert_return(() => invoke($11, `load8_u`, [26665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1571
assert_return(() => invoke($11, `load8_u`, [26864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1572
assert_return(() => invoke($11, `load8_u`, [27063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1573
assert_return(() => invoke($11, `load8_u`, [27262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1574
assert_return(() => invoke($11, `load8_u`, [27461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1575
assert_return(() => invoke($11, `load8_u`, [27660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1576
assert_return(() => invoke($11, `load8_u`, [27859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1577
assert_return(() => invoke($11, `load8_u`, [28058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1578
assert_return(() => invoke($11, `load8_u`, [28257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1579
assert_return(() => invoke($11, `load8_u`, [28456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1580
assert_return(() => invoke($11, `load8_u`, [28655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1581
assert_return(() => invoke($11, `load8_u`, [28854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1582
assert_return(() => invoke($11, `load8_u`, [29053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1583
assert_return(() => invoke($11, `load8_u`, [29252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1584
assert_return(() => invoke($11, `load8_u`, [29451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1585
assert_return(() => invoke($11, `load8_u`, [29650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1586
assert_return(() => invoke($11, `load8_u`, [29849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1587
assert_return(() => invoke($11, `load8_u`, [30048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1588
assert_return(() => invoke($11, `load8_u`, [30247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1589
assert_return(() => invoke($11, `load8_u`, [30446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1590
assert_return(() => invoke($11, `load8_u`, [30645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1591
assert_return(() => invoke($11, `load8_u`, [30844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1592
assert_return(() => invoke($11, `load8_u`, [31043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1593
assert_return(() => invoke($11, `load8_u`, [31242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1594
assert_return(() => invoke($11, `load8_u`, [31441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1595
assert_return(() => invoke($11, `load8_u`, [31640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1596
assert_return(() => invoke($11, `load8_u`, [31839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1597
assert_return(() => invoke($11, `load8_u`, [32038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1598
assert_return(() => invoke($11, `load8_u`, [32237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1599
assert_return(() => invoke($11, `load8_u`, [32436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1600
assert_return(() => invoke($11, `load8_u`, [32635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1601
assert_return(() => invoke($11, `load8_u`, [32834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1602
assert_return(() => invoke($11, `load8_u`, [33033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1603
assert_return(() => invoke($11, `load8_u`, [33232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1604
assert_return(() => invoke($11, `load8_u`, [33431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1605
assert_return(() => invoke($11, `load8_u`, [33630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1606
assert_return(() => invoke($11, `load8_u`, [33829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1607
assert_return(() => invoke($11, `load8_u`, [34028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1608
assert_return(() => invoke($11, `load8_u`, [34227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1609
assert_return(() => invoke($11, `load8_u`, [34426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1610
assert_return(() => invoke($11, `load8_u`, [34625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1611
assert_return(() => invoke($11, `load8_u`, [34824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1612
assert_return(() => invoke($11, `load8_u`, [35023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1613
assert_return(() => invoke($11, `load8_u`, [35222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1614
assert_return(() => invoke($11, `load8_u`, [35421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1615
assert_return(() => invoke($11, `load8_u`, [35620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1616
assert_return(() => invoke($11, `load8_u`, [35819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1617
assert_return(() => invoke($11, `load8_u`, [36018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1618
assert_return(() => invoke($11, `load8_u`, [36217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1619
assert_return(() => invoke($11, `load8_u`, [36416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1620
assert_return(() => invoke($11, `load8_u`, [36615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1621
assert_return(() => invoke($11, `load8_u`, [36814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1622
assert_return(() => invoke($11, `load8_u`, [37013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1623
assert_return(() => invoke($11, `load8_u`, [37212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1624
assert_return(() => invoke($11, `load8_u`, [37411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1625
assert_return(() => invoke($11, `load8_u`, [37610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1626
assert_return(() => invoke($11, `load8_u`, [37809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1627
assert_return(() => invoke($11, `load8_u`, [38008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1628
assert_return(() => invoke($11, `load8_u`, [38207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1629
assert_return(() => invoke($11, `load8_u`, [38406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1630
assert_return(() => invoke($11, `load8_u`, [38605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1631
assert_return(() => invoke($11, `load8_u`, [38804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1632
assert_return(() => invoke($11, `load8_u`, [39003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1633
assert_return(() => invoke($11, `load8_u`, [39202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1634
assert_return(() => invoke($11, `load8_u`, [39401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1635
assert_return(() => invoke($11, `load8_u`, [39600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1636
assert_return(() => invoke($11, `load8_u`, [39799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1637
assert_return(() => invoke($11, `load8_u`, [39998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1638
assert_return(() => invoke($11, `load8_u`, [40197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1639
assert_return(() => invoke($11, `load8_u`, [40396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1640
assert_return(() => invoke($11, `load8_u`, [40595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1641
assert_return(() => invoke($11, `load8_u`, [40794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1642
assert_return(() => invoke($11, `load8_u`, [40993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1643
assert_return(() => invoke($11, `load8_u`, [41192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1644
assert_return(() => invoke($11, `load8_u`, [41391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1645
assert_return(() => invoke($11, `load8_u`, [41590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1646
assert_return(() => invoke($11, `load8_u`, [41789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1647
assert_return(() => invoke($11, `load8_u`, [41988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1648
assert_return(() => invoke($11, `load8_u`, [42187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1649
assert_return(() => invoke($11, `load8_u`, [42386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1650
assert_return(() => invoke($11, `load8_u`, [42585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1651
assert_return(() => invoke($11, `load8_u`, [42784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1652
assert_return(() => invoke($11, `load8_u`, [42983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1653
assert_return(() => invoke($11, `load8_u`, [43182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1654
assert_return(() => invoke($11, `load8_u`, [43381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1655
assert_return(() => invoke($11, `load8_u`, [43580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1656
assert_return(() => invoke($11, `load8_u`, [43779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1657
assert_return(() => invoke($11, `load8_u`, [43978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1658
assert_return(() => invoke($11, `load8_u`, [44177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1659
assert_return(() => invoke($11, `load8_u`, [44376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1660
assert_return(() => invoke($11, `load8_u`, [44575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1661
assert_return(() => invoke($11, `load8_u`, [44774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1662
assert_return(() => invoke($11, `load8_u`, [44973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1663
assert_return(() => invoke($11, `load8_u`, [45172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1664
assert_return(() => invoke($11, `load8_u`, [45371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1665
assert_return(() => invoke($11, `load8_u`, [45570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1666
assert_return(() => invoke($11, `load8_u`, [45769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1667
assert_return(() => invoke($11, `load8_u`, [45968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1668
assert_return(() => invoke($11, `load8_u`, [46167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1669
assert_return(() => invoke($11, `load8_u`, [46366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1670
assert_return(() => invoke($11, `load8_u`, [46565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1671
assert_return(() => invoke($11, `load8_u`, [46764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1672
assert_return(() => invoke($11, `load8_u`, [46963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1673
assert_return(() => invoke($11, `load8_u`, [47162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1674
assert_return(() => invoke($11, `load8_u`, [47361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1675
assert_return(() => invoke($11, `load8_u`, [47560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1676
assert_return(() => invoke($11, `load8_u`, [47759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1677
assert_return(() => invoke($11, `load8_u`, [47958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1678
assert_return(() => invoke($11, `load8_u`, [48157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1679
assert_return(() => invoke($11, `load8_u`, [48356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1680
assert_return(() => invoke($11, `load8_u`, [48555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1681
assert_return(() => invoke($11, `load8_u`, [48754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1682
assert_return(() => invoke($11, `load8_u`, [48953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1683
assert_return(() => invoke($11, `load8_u`, [49152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1684
assert_return(() => invoke($11, `load8_u`, [49351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1685
assert_return(() => invoke($11, `load8_u`, [49550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1686
assert_return(() => invoke($11, `load8_u`, [49749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1687
assert_return(() => invoke($11, `load8_u`, [49948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1688
assert_return(() => invoke($11, `load8_u`, [50147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1689
assert_return(() => invoke($11, `load8_u`, [50346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1690
assert_return(() => invoke($11, `load8_u`, [50545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1691
assert_return(() => invoke($11, `load8_u`, [50744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1692
assert_return(() => invoke($11, `load8_u`, [50943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1693
assert_return(() => invoke($11, `load8_u`, [51142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1694
assert_return(() => invoke($11, `load8_u`, [51341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1695
assert_return(() => invoke($11, `load8_u`, [51540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1696
assert_return(() => invoke($11, `load8_u`, [51739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1697
assert_return(() => invoke($11, `load8_u`, [51938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1698
assert_return(() => invoke($11, `load8_u`, [52137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1699
assert_return(() => invoke($11, `load8_u`, [52336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1700
assert_return(() => invoke($11, `load8_u`, [52535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1701
assert_return(() => invoke($11, `load8_u`, [52734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1702
assert_return(() => invoke($11, `load8_u`, [52933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1703
assert_return(() => invoke($11, `load8_u`, [53132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1704
assert_return(() => invoke($11, `load8_u`, [53331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1705
assert_return(() => invoke($11, `load8_u`, [53530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1706
assert_return(() => invoke($11, `load8_u`, [53729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1707
assert_return(() => invoke($11, `load8_u`, [53928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1708
assert_return(() => invoke($11, `load8_u`, [54127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1709
assert_return(() => invoke($11, `load8_u`, [54326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1710
assert_return(() => invoke($11, `load8_u`, [54525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1711
assert_return(() => invoke($11, `load8_u`, [54724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1712
assert_return(() => invoke($11, `load8_u`, [54923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1713
assert_return(() => invoke($11, `load8_u`, [55122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1714
assert_return(() => invoke($11, `load8_u`, [55321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1715
assert_return(() => invoke($11, `load8_u`, [55520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1716
assert_return(() => invoke($11, `load8_u`, [55719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1717
assert_return(() => invoke($11, `load8_u`, [55918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1718
assert_return(() => invoke($11, `load8_u`, [56117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1719
assert_return(() => invoke($11, `load8_u`, [56316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1720
assert_return(() => invoke($11, `load8_u`, [56515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1721
assert_return(() => invoke($11, `load8_u`, [56714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1722
assert_return(() => invoke($11, `load8_u`, [56913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1723
assert_return(() => invoke($11, `load8_u`, [57112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1724
assert_return(() => invoke($11, `load8_u`, [57311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1725
assert_return(() => invoke($11, `load8_u`, [57510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1726
assert_return(() => invoke($11, `load8_u`, [57709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1727
assert_return(() => invoke($11, `load8_u`, [57908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1728
assert_return(() => invoke($11, `load8_u`, [58107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1729
assert_return(() => invoke($11, `load8_u`, [58306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1730
assert_return(() => invoke($11, `load8_u`, [58505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1731
assert_return(() => invoke($11, `load8_u`, [58704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1732
assert_return(() => invoke($11, `load8_u`, [58903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1733
assert_return(() => invoke($11, `load8_u`, [59102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1734
assert_return(() => invoke($11, `load8_u`, [59301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1735
assert_return(() => invoke($11, `load8_u`, [59500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1736
assert_return(() => invoke($11, `load8_u`, [59699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1737
assert_return(() => invoke($11, `load8_u`, [59898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1738
assert_return(() => invoke($11, `load8_u`, [60097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1739
assert_return(() => invoke($11, `load8_u`, [60296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1740
assert_return(() => invoke($11, `load8_u`, [60495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1741
assert_return(() => invoke($11, `load8_u`, [60694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1742
assert_return(() => invoke($11, `load8_u`, [60893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1743
assert_return(() => invoke($11, `load8_u`, [61092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1744
assert_return(() => invoke($11, `load8_u`, [61291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1745
assert_return(() => invoke($11, `load8_u`, [61490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1746
assert_return(() => invoke($11, `load8_u`, [61689]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1747
assert_return(() => invoke($11, `load8_u`, [61888]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1748
assert_return(() => invoke($11, `load8_u`, [62087]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1749
assert_return(() => invoke($11, `load8_u`, [62286]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1750
assert_return(() => invoke($11, `load8_u`, [62485]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1751
assert_return(() => invoke($11, `load8_u`, [62684]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1752
assert_return(() => invoke($11, `load8_u`, [62883]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1753
assert_return(() => invoke($11, `load8_u`, [63082]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1754
assert_return(() => invoke($11, `load8_u`, [63281]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1755
assert_return(() => invoke($11, `load8_u`, [63480]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1756
assert_return(() => invoke($11, `load8_u`, [63679]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1757
assert_return(() => invoke($11, `load8_u`, [63878]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1758
assert_return(() => invoke($11, `load8_u`, [64077]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1759
assert_return(() => invoke($11, `load8_u`, [64276]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1760
assert_return(() => invoke($11, `load8_u`, [64475]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1761
assert_return(() => invoke($11, `load8_u`, [64674]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1762
assert_return(() => invoke($11, `load8_u`, [64873]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1763
assert_return(() => invoke($11, `load8_u`, [65072]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1764
assert_return(() => invoke($11, `load8_u`, [65271]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1765
assert_return(() => invoke($11, `load8_u`, [65470]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1766
assert_return(() => invoke($11, `load8_u`, [65515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1767
assert_return(() => invoke($11, `load8_u`, [65516]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:1768
assert_return(() => invoke($11, `load8_u`, [65517]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:1769
assert_return(() => invoke($11, `load8_u`, [65518]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:1770
assert_return(() => invoke($11, `load8_u`, [65519]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:1771
assert_return(() => invoke($11, `load8_u`, [65520]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:1772
assert_return(() => invoke($11, `load8_u`, [65521]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:1773
assert_return(() => invoke($11, `load8_u`, [65522]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:1774
assert_return(() => invoke($11, `load8_u`, [65523]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:1775
assert_return(() => invoke($11, `load8_u`, [65524]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:1776
assert_return(() => invoke($11, `load8_u`, [65525]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:1777
assert_return(() => invoke($11, `load8_u`, [65526]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:1778
assert_return(() => invoke($11, `load8_u`, [65527]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:1779
assert_return(() => invoke($11, `load8_u`, [65528]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:1780
assert_return(() => invoke($11, `load8_u`, [65529]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:1781
assert_return(() => invoke($11, `load8_u`, [65530]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:1782
assert_return(() => invoke($11, `load8_u`, [65531]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:1783
assert_return(() => invoke($11, `load8_u`, [65532]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:1784
assert_return(() => invoke($11, `load8_u`, [65533]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:1785
assert_return(() => invoke($11, `load8_u`, [65534]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:1786
assert_return(() => invoke($11, `load8_u`, [65535]), [value("i32", 20)]);

// ./test/core/memory64/memory_copy64.wast:1788
let $12 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 65486) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:1796
assert_trap(() => invoke($12, `run`, [65516, 65486, 40]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:1799
assert_return(() => invoke($12, `load8_u`, [198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1800
assert_return(() => invoke($12, `load8_u`, [397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1801
assert_return(() => invoke($12, `load8_u`, [596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1802
assert_return(() => invoke($12, `load8_u`, [795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1803
assert_return(() => invoke($12, `load8_u`, [994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1804
assert_return(() => invoke($12, `load8_u`, [1193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1805
assert_return(() => invoke($12, `load8_u`, [1392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1806
assert_return(() => invoke($12, `load8_u`, [1591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1807
assert_return(() => invoke($12, `load8_u`, [1790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1808
assert_return(() => invoke($12, `load8_u`, [1989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1809
assert_return(() => invoke($12, `load8_u`, [2188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1810
assert_return(() => invoke($12, `load8_u`, [2387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1811
assert_return(() => invoke($12, `load8_u`, [2586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1812
assert_return(() => invoke($12, `load8_u`, [2785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1813
assert_return(() => invoke($12, `load8_u`, [2984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1814
assert_return(() => invoke($12, `load8_u`, [3183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1815
assert_return(() => invoke($12, `load8_u`, [3382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1816
assert_return(() => invoke($12, `load8_u`, [3581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1817
assert_return(() => invoke($12, `load8_u`, [3780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1818
assert_return(() => invoke($12, `load8_u`, [3979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1819
assert_return(() => invoke($12, `load8_u`, [4178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1820
assert_return(() => invoke($12, `load8_u`, [4377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1821
assert_return(() => invoke($12, `load8_u`, [4576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1822
assert_return(() => invoke($12, `load8_u`, [4775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1823
assert_return(() => invoke($12, `load8_u`, [4974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1824
assert_return(() => invoke($12, `load8_u`, [5173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1825
assert_return(() => invoke($12, `load8_u`, [5372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1826
assert_return(() => invoke($12, `load8_u`, [5571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1827
assert_return(() => invoke($12, `load8_u`, [5770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1828
assert_return(() => invoke($12, `load8_u`, [5969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1829
assert_return(() => invoke($12, `load8_u`, [6168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1830
assert_return(() => invoke($12, `load8_u`, [6367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1831
assert_return(() => invoke($12, `load8_u`, [6566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1832
assert_return(() => invoke($12, `load8_u`, [6765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1833
assert_return(() => invoke($12, `load8_u`, [6964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1834
assert_return(() => invoke($12, `load8_u`, [7163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1835
assert_return(() => invoke($12, `load8_u`, [7362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1836
assert_return(() => invoke($12, `load8_u`, [7561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1837
assert_return(() => invoke($12, `load8_u`, [7760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1838
assert_return(() => invoke($12, `load8_u`, [7959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1839
assert_return(() => invoke($12, `load8_u`, [8158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1840
assert_return(() => invoke($12, `load8_u`, [8357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1841
assert_return(() => invoke($12, `load8_u`, [8556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1842
assert_return(() => invoke($12, `load8_u`, [8755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1843
assert_return(() => invoke($12, `load8_u`, [8954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1844
assert_return(() => invoke($12, `load8_u`, [9153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1845
assert_return(() => invoke($12, `load8_u`, [9352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1846
assert_return(() => invoke($12, `load8_u`, [9551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1847
assert_return(() => invoke($12, `load8_u`, [9750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1848
assert_return(() => invoke($12, `load8_u`, [9949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1849
assert_return(() => invoke($12, `load8_u`, [10148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1850
assert_return(() => invoke($12, `load8_u`, [10347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1851
assert_return(() => invoke($12, `load8_u`, [10546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1852
assert_return(() => invoke($12, `load8_u`, [10745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1853
assert_return(() => invoke($12, `load8_u`, [10944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1854
assert_return(() => invoke($12, `load8_u`, [11143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1855
assert_return(() => invoke($12, `load8_u`, [11342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1856
assert_return(() => invoke($12, `load8_u`, [11541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1857
assert_return(() => invoke($12, `load8_u`, [11740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1858
assert_return(() => invoke($12, `load8_u`, [11939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1859
assert_return(() => invoke($12, `load8_u`, [12138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1860
assert_return(() => invoke($12, `load8_u`, [12337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1861
assert_return(() => invoke($12, `load8_u`, [12536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1862
assert_return(() => invoke($12, `load8_u`, [12735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1863
assert_return(() => invoke($12, `load8_u`, [12934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1864
assert_return(() => invoke($12, `load8_u`, [13133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1865
assert_return(() => invoke($12, `load8_u`, [13332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1866
assert_return(() => invoke($12, `load8_u`, [13531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1867
assert_return(() => invoke($12, `load8_u`, [13730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1868
assert_return(() => invoke($12, `load8_u`, [13929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1869
assert_return(() => invoke($12, `load8_u`, [14128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1870
assert_return(() => invoke($12, `load8_u`, [14327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1871
assert_return(() => invoke($12, `load8_u`, [14526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1872
assert_return(() => invoke($12, `load8_u`, [14725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1873
assert_return(() => invoke($12, `load8_u`, [14924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1874
assert_return(() => invoke($12, `load8_u`, [15123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1875
assert_return(() => invoke($12, `load8_u`, [15322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1876
assert_return(() => invoke($12, `load8_u`, [15521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1877
assert_return(() => invoke($12, `load8_u`, [15720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1878
assert_return(() => invoke($12, `load8_u`, [15919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1879
assert_return(() => invoke($12, `load8_u`, [16118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1880
assert_return(() => invoke($12, `load8_u`, [16317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1881
assert_return(() => invoke($12, `load8_u`, [16516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1882
assert_return(() => invoke($12, `load8_u`, [16715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1883
assert_return(() => invoke($12, `load8_u`, [16914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1884
assert_return(() => invoke($12, `load8_u`, [17113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1885
assert_return(() => invoke($12, `load8_u`, [17312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1886
assert_return(() => invoke($12, `load8_u`, [17511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1887
assert_return(() => invoke($12, `load8_u`, [17710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1888
assert_return(() => invoke($12, `load8_u`, [17909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1889
assert_return(() => invoke($12, `load8_u`, [18108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1890
assert_return(() => invoke($12, `load8_u`, [18307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1891
assert_return(() => invoke($12, `load8_u`, [18506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1892
assert_return(() => invoke($12, `load8_u`, [18705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1893
assert_return(() => invoke($12, `load8_u`, [18904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1894
assert_return(() => invoke($12, `load8_u`, [19103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1895
assert_return(() => invoke($12, `load8_u`, [19302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1896
assert_return(() => invoke($12, `load8_u`, [19501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1897
assert_return(() => invoke($12, `load8_u`, [19700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1898
assert_return(() => invoke($12, `load8_u`, [19899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1899
assert_return(() => invoke($12, `load8_u`, [20098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1900
assert_return(() => invoke($12, `load8_u`, [20297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1901
assert_return(() => invoke($12, `load8_u`, [20496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1902
assert_return(() => invoke($12, `load8_u`, [20695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1903
assert_return(() => invoke($12, `load8_u`, [20894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1904
assert_return(() => invoke($12, `load8_u`, [21093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1905
assert_return(() => invoke($12, `load8_u`, [21292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1906
assert_return(() => invoke($12, `load8_u`, [21491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1907
assert_return(() => invoke($12, `load8_u`, [21690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1908
assert_return(() => invoke($12, `load8_u`, [21889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1909
assert_return(() => invoke($12, `load8_u`, [22088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1910
assert_return(() => invoke($12, `load8_u`, [22287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1911
assert_return(() => invoke($12, `load8_u`, [22486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1912
assert_return(() => invoke($12, `load8_u`, [22685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1913
assert_return(() => invoke($12, `load8_u`, [22884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1914
assert_return(() => invoke($12, `load8_u`, [23083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1915
assert_return(() => invoke($12, `load8_u`, [23282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1916
assert_return(() => invoke($12, `load8_u`, [23481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1917
assert_return(() => invoke($12, `load8_u`, [23680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1918
assert_return(() => invoke($12, `load8_u`, [23879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1919
assert_return(() => invoke($12, `load8_u`, [24078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1920
assert_return(() => invoke($12, `load8_u`, [24277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1921
assert_return(() => invoke($12, `load8_u`, [24476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1922
assert_return(() => invoke($12, `load8_u`, [24675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1923
assert_return(() => invoke($12, `load8_u`, [24874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1924
assert_return(() => invoke($12, `load8_u`, [25073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1925
assert_return(() => invoke($12, `load8_u`, [25272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1926
assert_return(() => invoke($12, `load8_u`, [25471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1927
assert_return(() => invoke($12, `load8_u`, [25670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1928
assert_return(() => invoke($12, `load8_u`, [25869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1929
assert_return(() => invoke($12, `load8_u`, [26068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1930
assert_return(() => invoke($12, `load8_u`, [26267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1931
assert_return(() => invoke($12, `load8_u`, [26466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1932
assert_return(() => invoke($12, `load8_u`, [26665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1933
assert_return(() => invoke($12, `load8_u`, [26864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1934
assert_return(() => invoke($12, `load8_u`, [27063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1935
assert_return(() => invoke($12, `load8_u`, [27262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1936
assert_return(() => invoke($12, `load8_u`, [27461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1937
assert_return(() => invoke($12, `load8_u`, [27660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1938
assert_return(() => invoke($12, `load8_u`, [27859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1939
assert_return(() => invoke($12, `load8_u`, [28058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1940
assert_return(() => invoke($12, `load8_u`, [28257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1941
assert_return(() => invoke($12, `load8_u`, [28456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1942
assert_return(() => invoke($12, `load8_u`, [28655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1943
assert_return(() => invoke($12, `load8_u`, [28854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1944
assert_return(() => invoke($12, `load8_u`, [29053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1945
assert_return(() => invoke($12, `load8_u`, [29252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1946
assert_return(() => invoke($12, `load8_u`, [29451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1947
assert_return(() => invoke($12, `load8_u`, [29650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1948
assert_return(() => invoke($12, `load8_u`, [29849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1949
assert_return(() => invoke($12, `load8_u`, [30048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1950
assert_return(() => invoke($12, `load8_u`, [30247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1951
assert_return(() => invoke($12, `load8_u`, [30446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1952
assert_return(() => invoke($12, `load8_u`, [30645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1953
assert_return(() => invoke($12, `load8_u`, [30844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1954
assert_return(() => invoke($12, `load8_u`, [31043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1955
assert_return(() => invoke($12, `load8_u`, [31242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1956
assert_return(() => invoke($12, `load8_u`, [31441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1957
assert_return(() => invoke($12, `load8_u`, [31640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1958
assert_return(() => invoke($12, `load8_u`, [31839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1959
assert_return(() => invoke($12, `load8_u`, [32038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1960
assert_return(() => invoke($12, `load8_u`, [32237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1961
assert_return(() => invoke($12, `load8_u`, [32436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1962
assert_return(() => invoke($12, `load8_u`, [32635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1963
assert_return(() => invoke($12, `load8_u`, [32834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1964
assert_return(() => invoke($12, `load8_u`, [33033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1965
assert_return(() => invoke($12, `load8_u`, [33232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1966
assert_return(() => invoke($12, `load8_u`, [33431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1967
assert_return(() => invoke($12, `load8_u`, [33630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1968
assert_return(() => invoke($12, `load8_u`, [33829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1969
assert_return(() => invoke($12, `load8_u`, [34028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1970
assert_return(() => invoke($12, `load8_u`, [34227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1971
assert_return(() => invoke($12, `load8_u`, [34426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1972
assert_return(() => invoke($12, `load8_u`, [34625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1973
assert_return(() => invoke($12, `load8_u`, [34824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1974
assert_return(() => invoke($12, `load8_u`, [35023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1975
assert_return(() => invoke($12, `load8_u`, [35222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1976
assert_return(() => invoke($12, `load8_u`, [35421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1977
assert_return(() => invoke($12, `load8_u`, [35620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1978
assert_return(() => invoke($12, `load8_u`, [35819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1979
assert_return(() => invoke($12, `load8_u`, [36018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1980
assert_return(() => invoke($12, `load8_u`, [36217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1981
assert_return(() => invoke($12, `load8_u`, [36416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1982
assert_return(() => invoke($12, `load8_u`, [36615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1983
assert_return(() => invoke($12, `load8_u`, [36814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1984
assert_return(() => invoke($12, `load8_u`, [37013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1985
assert_return(() => invoke($12, `load8_u`, [37212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1986
assert_return(() => invoke($12, `load8_u`, [37411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1987
assert_return(() => invoke($12, `load8_u`, [37610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1988
assert_return(() => invoke($12, `load8_u`, [37809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1989
assert_return(() => invoke($12, `load8_u`, [38008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1990
assert_return(() => invoke($12, `load8_u`, [38207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1991
assert_return(() => invoke($12, `load8_u`, [38406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1992
assert_return(() => invoke($12, `load8_u`, [38605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1993
assert_return(() => invoke($12, `load8_u`, [38804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1994
assert_return(() => invoke($12, `load8_u`, [39003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1995
assert_return(() => invoke($12, `load8_u`, [39202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1996
assert_return(() => invoke($12, `load8_u`, [39401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1997
assert_return(() => invoke($12, `load8_u`, [39600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1998
assert_return(() => invoke($12, `load8_u`, [39799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:1999
assert_return(() => invoke($12, `load8_u`, [39998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2000
assert_return(() => invoke($12, `load8_u`, [40197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2001
assert_return(() => invoke($12, `load8_u`, [40396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2002
assert_return(() => invoke($12, `load8_u`, [40595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2003
assert_return(() => invoke($12, `load8_u`, [40794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2004
assert_return(() => invoke($12, `load8_u`, [40993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2005
assert_return(() => invoke($12, `load8_u`, [41192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2006
assert_return(() => invoke($12, `load8_u`, [41391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2007
assert_return(() => invoke($12, `load8_u`, [41590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2008
assert_return(() => invoke($12, `load8_u`, [41789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2009
assert_return(() => invoke($12, `load8_u`, [41988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2010
assert_return(() => invoke($12, `load8_u`, [42187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2011
assert_return(() => invoke($12, `load8_u`, [42386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2012
assert_return(() => invoke($12, `load8_u`, [42585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2013
assert_return(() => invoke($12, `load8_u`, [42784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2014
assert_return(() => invoke($12, `load8_u`, [42983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2015
assert_return(() => invoke($12, `load8_u`, [43182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2016
assert_return(() => invoke($12, `load8_u`, [43381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2017
assert_return(() => invoke($12, `load8_u`, [43580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2018
assert_return(() => invoke($12, `load8_u`, [43779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2019
assert_return(() => invoke($12, `load8_u`, [43978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2020
assert_return(() => invoke($12, `load8_u`, [44177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2021
assert_return(() => invoke($12, `load8_u`, [44376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2022
assert_return(() => invoke($12, `load8_u`, [44575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2023
assert_return(() => invoke($12, `load8_u`, [44774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2024
assert_return(() => invoke($12, `load8_u`, [44973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2025
assert_return(() => invoke($12, `load8_u`, [45172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2026
assert_return(() => invoke($12, `load8_u`, [45371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2027
assert_return(() => invoke($12, `load8_u`, [45570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2028
assert_return(() => invoke($12, `load8_u`, [45769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2029
assert_return(() => invoke($12, `load8_u`, [45968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2030
assert_return(() => invoke($12, `load8_u`, [46167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2031
assert_return(() => invoke($12, `load8_u`, [46366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2032
assert_return(() => invoke($12, `load8_u`, [46565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2033
assert_return(() => invoke($12, `load8_u`, [46764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2034
assert_return(() => invoke($12, `load8_u`, [46963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2035
assert_return(() => invoke($12, `load8_u`, [47162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2036
assert_return(() => invoke($12, `load8_u`, [47361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2037
assert_return(() => invoke($12, `load8_u`, [47560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2038
assert_return(() => invoke($12, `load8_u`, [47759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2039
assert_return(() => invoke($12, `load8_u`, [47958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2040
assert_return(() => invoke($12, `load8_u`, [48157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2041
assert_return(() => invoke($12, `load8_u`, [48356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2042
assert_return(() => invoke($12, `load8_u`, [48555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2043
assert_return(() => invoke($12, `load8_u`, [48754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2044
assert_return(() => invoke($12, `load8_u`, [48953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2045
assert_return(() => invoke($12, `load8_u`, [49152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2046
assert_return(() => invoke($12, `load8_u`, [49351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2047
assert_return(() => invoke($12, `load8_u`, [49550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2048
assert_return(() => invoke($12, `load8_u`, [49749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2049
assert_return(() => invoke($12, `load8_u`, [49948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2050
assert_return(() => invoke($12, `load8_u`, [50147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2051
assert_return(() => invoke($12, `load8_u`, [50346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2052
assert_return(() => invoke($12, `load8_u`, [50545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2053
assert_return(() => invoke($12, `load8_u`, [50744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2054
assert_return(() => invoke($12, `load8_u`, [50943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2055
assert_return(() => invoke($12, `load8_u`, [51142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2056
assert_return(() => invoke($12, `load8_u`, [51341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2057
assert_return(() => invoke($12, `load8_u`, [51540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2058
assert_return(() => invoke($12, `load8_u`, [51739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2059
assert_return(() => invoke($12, `load8_u`, [51938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2060
assert_return(() => invoke($12, `load8_u`, [52137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2061
assert_return(() => invoke($12, `load8_u`, [52336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2062
assert_return(() => invoke($12, `load8_u`, [52535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2063
assert_return(() => invoke($12, `load8_u`, [52734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2064
assert_return(() => invoke($12, `load8_u`, [52933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2065
assert_return(() => invoke($12, `load8_u`, [53132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2066
assert_return(() => invoke($12, `load8_u`, [53331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2067
assert_return(() => invoke($12, `load8_u`, [53530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2068
assert_return(() => invoke($12, `load8_u`, [53729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2069
assert_return(() => invoke($12, `load8_u`, [53928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2070
assert_return(() => invoke($12, `load8_u`, [54127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2071
assert_return(() => invoke($12, `load8_u`, [54326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2072
assert_return(() => invoke($12, `load8_u`, [54525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2073
assert_return(() => invoke($12, `load8_u`, [54724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2074
assert_return(() => invoke($12, `load8_u`, [54923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2075
assert_return(() => invoke($12, `load8_u`, [55122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2076
assert_return(() => invoke($12, `load8_u`, [55321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2077
assert_return(() => invoke($12, `load8_u`, [55520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2078
assert_return(() => invoke($12, `load8_u`, [55719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2079
assert_return(() => invoke($12, `load8_u`, [55918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2080
assert_return(() => invoke($12, `load8_u`, [56117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2081
assert_return(() => invoke($12, `load8_u`, [56316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2082
assert_return(() => invoke($12, `load8_u`, [56515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2083
assert_return(() => invoke($12, `load8_u`, [56714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2084
assert_return(() => invoke($12, `load8_u`, [56913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2085
assert_return(() => invoke($12, `load8_u`, [57112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2086
assert_return(() => invoke($12, `load8_u`, [57311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2087
assert_return(() => invoke($12, `load8_u`, [57510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2088
assert_return(() => invoke($12, `load8_u`, [57709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2089
assert_return(() => invoke($12, `load8_u`, [57908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2090
assert_return(() => invoke($12, `load8_u`, [58107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2091
assert_return(() => invoke($12, `load8_u`, [58306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2092
assert_return(() => invoke($12, `load8_u`, [58505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2093
assert_return(() => invoke($12, `load8_u`, [58704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2094
assert_return(() => invoke($12, `load8_u`, [58903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2095
assert_return(() => invoke($12, `load8_u`, [59102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2096
assert_return(() => invoke($12, `load8_u`, [59301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2097
assert_return(() => invoke($12, `load8_u`, [59500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2098
assert_return(() => invoke($12, `load8_u`, [59699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2099
assert_return(() => invoke($12, `load8_u`, [59898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2100
assert_return(() => invoke($12, `load8_u`, [60097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2101
assert_return(() => invoke($12, `load8_u`, [60296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2102
assert_return(() => invoke($12, `load8_u`, [60495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2103
assert_return(() => invoke($12, `load8_u`, [60694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2104
assert_return(() => invoke($12, `load8_u`, [60893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2105
assert_return(() => invoke($12, `load8_u`, [61092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2106
assert_return(() => invoke($12, `load8_u`, [61291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2107
assert_return(() => invoke($12, `load8_u`, [61490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2108
assert_return(() => invoke($12, `load8_u`, [61689]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2109
assert_return(() => invoke($12, `load8_u`, [61888]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2110
assert_return(() => invoke($12, `load8_u`, [62087]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2111
assert_return(() => invoke($12, `load8_u`, [62286]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2112
assert_return(() => invoke($12, `load8_u`, [62485]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2113
assert_return(() => invoke($12, `load8_u`, [62684]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2114
assert_return(() => invoke($12, `load8_u`, [62883]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2115
assert_return(() => invoke($12, `load8_u`, [63082]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2116
assert_return(() => invoke($12, `load8_u`, [63281]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2117
assert_return(() => invoke($12, `load8_u`, [63480]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2118
assert_return(() => invoke($12, `load8_u`, [63679]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2119
assert_return(() => invoke($12, `load8_u`, [63878]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2120
assert_return(() => invoke($12, `load8_u`, [64077]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2121
assert_return(() => invoke($12, `load8_u`, [64276]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2122
assert_return(() => invoke($12, `load8_u`, [64475]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2123
assert_return(() => invoke($12, `load8_u`, [64674]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2124
assert_return(() => invoke($12, `load8_u`, [64873]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2125
assert_return(() => invoke($12, `load8_u`, [65072]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2126
assert_return(() => invoke($12, `load8_u`, [65271]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2127
assert_return(() => invoke($12, `load8_u`, [65470]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2128
assert_return(() => invoke($12, `load8_u`, [65486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2129
assert_return(() => invoke($12, `load8_u`, [65487]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:2130
assert_return(() => invoke($12, `load8_u`, [65488]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:2131
assert_return(() => invoke($12, `load8_u`, [65489]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:2132
assert_return(() => invoke($12, `load8_u`, [65490]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:2133
assert_return(() => invoke($12, `load8_u`, [65491]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:2134
assert_return(() => invoke($12, `load8_u`, [65492]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:2135
assert_return(() => invoke($12, `load8_u`, [65493]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:2136
assert_return(() => invoke($12, `load8_u`, [65494]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:2137
assert_return(() => invoke($12, `load8_u`, [65495]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:2138
assert_return(() => invoke($12, `load8_u`, [65496]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:2139
assert_return(() => invoke($12, `load8_u`, [65497]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:2140
assert_return(() => invoke($12, `load8_u`, [65498]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:2141
assert_return(() => invoke($12, `load8_u`, [65499]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:2142
assert_return(() => invoke($12, `load8_u`, [65500]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:2143
assert_return(() => invoke($12, `load8_u`, [65501]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:2144
assert_return(() => invoke($12, `load8_u`, [65502]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:2145
assert_return(() => invoke($12, `load8_u`, [65503]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:2146
assert_return(() => invoke($12, `load8_u`, [65504]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:2147
assert_return(() => invoke($12, `load8_u`, [65505]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:2149
let $13 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 65516) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:2157
assert_trap(() => invoke($13, `run`, [65486, 65516, 40]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:2160
assert_return(() => invoke($13, `load8_u`, [198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2161
assert_return(() => invoke($13, `load8_u`, [397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2162
assert_return(() => invoke($13, `load8_u`, [596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2163
assert_return(() => invoke($13, `load8_u`, [795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2164
assert_return(() => invoke($13, `load8_u`, [994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2165
assert_return(() => invoke($13, `load8_u`, [1193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2166
assert_return(() => invoke($13, `load8_u`, [1392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2167
assert_return(() => invoke($13, `load8_u`, [1591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2168
assert_return(() => invoke($13, `load8_u`, [1790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2169
assert_return(() => invoke($13, `load8_u`, [1989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2170
assert_return(() => invoke($13, `load8_u`, [2188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2171
assert_return(() => invoke($13, `load8_u`, [2387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2172
assert_return(() => invoke($13, `load8_u`, [2586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2173
assert_return(() => invoke($13, `load8_u`, [2785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2174
assert_return(() => invoke($13, `load8_u`, [2984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2175
assert_return(() => invoke($13, `load8_u`, [3183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2176
assert_return(() => invoke($13, `load8_u`, [3382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2177
assert_return(() => invoke($13, `load8_u`, [3581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2178
assert_return(() => invoke($13, `load8_u`, [3780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2179
assert_return(() => invoke($13, `load8_u`, [3979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2180
assert_return(() => invoke($13, `load8_u`, [4178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2181
assert_return(() => invoke($13, `load8_u`, [4377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2182
assert_return(() => invoke($13, `load8_u`, [4576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2183
assert_return(() => invoke($13, `load8_u`, [4775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2184
assert_return(() => invoke($13, `load8_u`, [4974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2185
assert_return(() => invoke($13, `load8_u`, [5173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2186
assert_return(() => invoke($13, `load8_u`, [5372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2187
assert_return(() => invoke($13, `load8_u`, [5571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2188
assert_return(() => invoke($13, `load8_u`, [5770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2189
assert_return(() => invoke($13, `load8_u`, [5969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2190
assert_return(() => invoke($13, `load8_u`, [6168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2191
assert_return(() => invoke($13, `load8_u`, [6367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2192
assert_return(() => invoke($13, `load8_u`, [6566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2193
assert_return(() => invoke($13, `load8_u`, [6765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2194
assert_return(() => invoke($13, `load8_u`, [6964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2195
assert_return(() => invoke($13, `load8_u`, [7163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2196
assert_return(() => invoke($13, `load8_u`, [7362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2197
assert_return(() => invoke($13, `load8_u`, [7561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2198
assert_return(() => invoke($13, `load8_u`, [7760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2199
assert_return(() => invoke($13, `load8_u`, [7959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2200
assert_return(() => invoke($13, `load8_u`, [8158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2201
assert_return(() => invoke($13, `load8_u`, [8357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2202
assert_return(() => invoke($13, `load8_u`, [8556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2203
assert_return(() => invoke($13, `load8_u`, [8755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2204
assert_return(() => invoke($13, `load8_u`, [8954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2205
assert_return(() => invoke($13, `load8_u`, [9153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2206
assert_return(() => invoke($13, `load8_u`, [9352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2207
assert_return(() => invoke($13, `load8_u`, [9551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2208
assert_return(() => invoke($13, `load8_u`, [9750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2209
assert_return(() => invoke($13, `load8_u`, [9949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2210
assert_return(() => invoke($13, `load8_u`, [10148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2211
assert_return(() => invoke($13, `load8_u`, [10347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2212
assert_return(() => invoke($13, `load8_u`, [10546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2213
assert_return(() => invoke($13, `load8_u`, [10745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2214
assert_return(() => invoke($13, `load8_u`, [10944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2215
assert_return(() => invoke($13, `load8_u`, [11143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2216
assert_return(() => invoke($13, `load8_u`, [11342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2217
assert_return(() => invoke($13, `load8_u`, [11541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2218
assert_return(() => invoke($13, `load8_u`, [11740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2219
assert_return(() => invoke($13, `load8_u`, [11939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2220
assert_return(() => invoke($13, `load8_u`, [12138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2221
assert_return(() => invoke($13, `load8_u`, [12337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2222
assert_return(() => invoke($13, `load8_u`, [12536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2223
assert_return(() => invoke($13, `load8_u`, [12735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2224
assert_return(() => invoke($13, `load8_u`, [12934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2225
assert_return(() => invoke($13, `load8_u`, [13133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2226
assert_return(() => invoke($13, `load8_u`, [13332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2227
assert_return(() => invoke($13, `load8_u`, [13531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2228
assert_return(() => invoke($13, `load8_u`, [13730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2229
assert_return(() => invoke($13, `load8_u`, [13929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2230
assert_return(() => invoke($13, `load8_u`, [14128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2231
assert_return(() => invoke($13, `load8_u`, [14327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2232
assert_return(() => invoke($13, `load8_u`, [14526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2233
assert_return(() => invoke($13, `load8_u`, [14725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2234
assert_return(() => invoke($13, `load8_u`, [14924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2235
assert_return(() => invoke($13, `load8_u`, [15123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2236
assert_return(() => invoke($13, `load8_u`, [15322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2237
assert_return(() => invoke($13, `load8_u`, [15521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2238
assert_return(() => invoke($13, `load8_u`, [15720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2239
assert_return(() => invoke($13, `load8_u`, [15919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2240
assert_return(() => invoke($13, `load8_u`, [16118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2241
assert_return(() => invoke($13, `load8_u`, [16317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2242
assert_return(() => invoke($13, `load8_u`, [16516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2243
assert_return(() => invoke($13, `load8_u`, [16715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2244
assert_return(() => invoke($13, `load8_u`, [16914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2245
assert_return(() => invoke($13, `load8_u`, [17113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2246
assert_return(() => invoke($13, `load8_u`, [17312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2247
assert_return(() => invoke($13, `load8_u`, [17511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2248
assert_return(() => invoke($13, `load8_u`, [17710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2249
assert_return(() => invoke($13, `load8_u`, [17909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2250
assert_return(() => invoke($13, `load8_u`, [18108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2251
assert_return(() => invoke($13, `load8_u`, [18307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2252
assert_return(() => invoke($13, `load8_u`, [18506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2253
assert_return(() => invoke($13, `load8_u`, [18705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2254
assert_return(() => invoke($13, `load8_u`, [18904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2255
assert_return(() => invoke($13, `load8_u`, [19103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2256
assert_return(() => invoke($13, `load8_u`, [19302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2257
assert_return(() => invoke($13, `load8_u`, [19501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2258
assert_return(() => invoke($13, `load8_u`, [19700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2259
assert_return(() => invoke($13, `load8_u`, [19899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2260
assert_return(() => invoke($13, `load8_u`, [20098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2261
assert_return(() => invoke($13, `load8_u`, [20297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2262
assert_return(() => invoke($13, `load8_u`, [20496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2263
assert_return(() => invoke($13, `load8_u`, [20695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2264
assert_return(() => invoke($13, `load8_u`, [20894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2265
assert_return(() => invoke($13, `load8_u`, [21093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2266
assert_return(() => invoke($13, `load8_u`, [21292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2267
assert_return(() => invoke($13, `load8_u`, [21491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2268
assert_return(() => invoke($13, `load8_u`, [21690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2269
assert_return(() => invoke($13, `load8_u`, [21889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2270
assert_return(() => invoke($13, `load8_u`, [22088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2271
assert_return(() => invoke($13, `load8_u`, [22287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2272
assert_return(() => invoke($13, `load8_u`, [22486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2273
assert_return(() => invoke($13, `load8_u`, [22685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2274
assert_return(() => invoke($13, `load8_u`, [22884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2275
assert_return(() => invoke($13, `load8_u`, [23083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2276
assert_return(() => invoke($13, `load8_u`, [23282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2277
assert_return(() => invoke($13, `load8_u`, [23481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2278
assert_return(() => invoke($13, `load8_u`, [23680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2279
assert_return(() => invoke($13, `load8_u`, [23879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2280
assert_return(() => invoke($13, `load8_u`, [24078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2281
assert_return(() => invoke($13, `load8_u`, [24277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2282
assert_return(() => invoke($13, `load8_u`, [24476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2283
assert_return(() => invoke($13, `load8_u`, [24675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2284
assert_return(() => invoke($13, `load8_u`, [24874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2285
assert_return(() => invoke($13, `load8_u`, [25073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2286
assert_return(() => invoke($13, `load8_u`, [25272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2287
assert_return(() => invoke($13, `load8_u`, [25471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2288
assert_return(() => invoke($13, `load8_u`, [25670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2289
assert_return(() => invoke($13, `load8_u`, [25869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2290
assert_return(() => invoke($13, `load8_u`, [26068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2291
assert_return(() => invoke($13, `load8_u`, [26267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2292
assert_return(() => invoke($13, `load8_u`, [26466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2293
assert_return(() => invoke($13, `load8_u`, [26665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2294
assert_return(() => invoke($13, `load8_u`, [26864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2295
assert_return(() => invoke($13, `load8_u`, [27063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2296
assert_return(() => invoke($13, `load8_u`, [27262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2297
assert_return(() => invoke($13, `load8_u`, [27461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2298
assert_return(() => invoke($13, `load8_u`, [27660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2299
assert_return(() => invoke($13, `load8_u`, [27859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2300
assert_return(() => invoke($13, `load8_u`, [28058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2301
assert_return(() => invoke($13, `load8_u`, [28257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2302
assert_return(() => invoke($13, `load8_u`, [28456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2303
assert_return(() => invoke($13, `load8_u`, [28655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2304
assert_return(() => invoke($13, `load8_u`, [28854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2305
assert_return(() => invoke($13, `load8_u`, [29053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2306
assert_return(() => invoke($13, `load8_u`, [29252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2307
assert_return(() => invoke($13, `load8_u`, [29451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2308
assert_return(() => invoke($13, `load8_u`, [29650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2309
assert_return(() => invoke($13, `load8_u`, [29849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2310
assert_return(() => invoke($13, `load8_u`, [30048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2311
assert_return(() => invoke($13, `load8_u`, [30247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2312
assert_return(() => invoke($13, `load8_u`, [30446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2313
assert_return(() => invoke($13, `load8_u`, [30645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2314
assert_return(() => invoke($13, `load8_u`, [30844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2315
assert_return(() => invoke($13, `load8_u`, [31043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2316
assert_return(() => invoke($13, `load8_u`, [31242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2317
assert_return(() => invoke($13, `load8_u`, [31441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2318
assert_return(() => invoke($13, `load8_u`, [31640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2319
assert_return(() => invoke($13, `load8_u`, [31839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2320
assert_return(() => invoke($13, `load8_u`, [32038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2321
assert_return(() => invoke($13, `load8_u`, [32237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2322
assert_return(() => invoke($13, `load8_u`, [32436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2323
assert_return(() => invoke($13, `load8_u`, [32635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2324
assert_return(() => invoke($13, `load8_u`, [32834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2325
assert_return(() => invoke($13, `load8_u`, [33033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2326
assert_return(() => invoke($13, `load8_u`, [33232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2327
assert_return(() => invoke($13, `load8_u`, [33431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2328
assert_return(() => invoke($13, `load8_u`, [33630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2329
assert_return(() => invoke($13, `load8_u`, [33829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2330
assert_return(() => invoke($13, `load8_u`, [34028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2331
assert_return(() => invoke($13, `load8_u`, [34227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2332
assert_return(() => invoke($13, `load8_u`, [34426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2333
assert_return(() => invoke($13, `load8_u`, [34625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2334
assert_return(() => invoke($13, `load8_u`, [34824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2335
assert_return(() => invoke($13, `load8_u`, [35023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2336
assert_return(() => invoke($13, `load8_u`, [35222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2337
assert_return(() => invoke($13, `load8_u`, [35421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2338
assert_return(() => invoke($13, `load8_u`, [35620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2339
assert_return(() => invoke($13, `load8_u`, [35819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2340
assert_return(() => invoke($13, `load8_u`, [36018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2341
assert_return(() => invoke($13, `load8_u`, [36217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2342
assert_return(() => invoke($13, `load8_u`, [36416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2343
assert_return(() => invoke($13, `load8_u`, [36615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2344
assert_return(() => invoke($13, `load8_u`, [36814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2345
assert_return(() => invoke($13, `load8_u`, [37013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2346
assert_return(() => invoke($13, `load8_u`, [37212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2347
assert_return(() => invoke($13, `load8_u`, [37411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2348
assert_return(() => invoke($13, `load8_u`, [37610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2349
assert_return(() => invoke($13, `load8_u`, [37809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2350
assert_return(() => invoke($13, `load8_u`, [38008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2351
assert_return(() => invoke($13, `load8_u`, [38207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2352
assert_return(() => invoke($13, `load8_u`, [38406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2353
assert_return(() => invoke($13, `load8_u`, [38605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2354
assert_return(() => invoke($13, `load8_u`, [38804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2355
assert_return(() => invoke($13, `load8_u`, [39003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2356
assert_return(() => invoke($13, `load8_u`, [39202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2357
assert_return(() => invoke($13, `load8_u`, [39401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2358
assert_return(() => invoke($13, `load8_u`, [39600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2359
assert_return(() => invoke($13, `load8_u`, [39799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2360
assert_return(() => invoke($13, `load8_u`, [39998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2361
assert_return(() => invoke($13, `load8_u`, [40197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2362
assert_return(() => invoke($13, `load8_u`, [40396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2363
assert_return(() => invoke($13, `load8_u`, [40595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2364
assert_return(() => invoke($13, `load8_u`, [40794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2365
assert_return(() => invoke($13, `load8_u`, [40993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2366
assert_return(() => invoke($13, `load8_u`, [41192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2367
assert_return(() => invoke($13, `load8_u`, [41391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2368
assert_return(() => invoke($13, `load8_u`, [41590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2369
assert_return(() => invoke($13, `load8_u`, [41789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2370
assert_return(() => invoke($13, `load8_u`, [41988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2371
assert_return(() => invoke($13, `load8_u`, [42187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2372
assert_return(() => invoke($13, `load8_u`, [42386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2373
assert_return(() => invoke($13, `load8_u`, [42585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2374
assert_return(() => invoke($13, `load8_u`, [42784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2375
assert_return(() => invoke($13, `load8_u`, [42983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2376
assert_return(() => invoke($13, `load8_u`, [43182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2377
assert_return(() => invoke($13, `load8_u`, [43381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2378
assert_return(() => invoke($13, `load8_u`, [43580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2379
assert_return(() => invoke($13, `load8_u`, [43779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2380
assert_return(() => invoke($13, `load8_u`, [43978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2381
assert_return(() => invoke($13, `load8_u`, [44177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2382
assert_return(() => invoke($13, `load8_u`, [44376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2383
assert_return(() => invoke($13, `load8_u`, [44575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2384
assert_return(() => invoke($13, `load8_u`, [44774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2385
assert_return(() => invoke($13, `load8_u`, [44973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2386
assert_return(() => invoke($13, `load8_u`, [45172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2387
assert_return(() => invoke($13, `load8_u`, [45371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2388
assert_return(() => invoke($13, `load8_u`, [45570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2389
assert_return(() => invoke($13, `load8_u`, [45769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2390
assert_return(() => invoke($13, `load8_u`, [45968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2391
assert_return(() => invoke($13, `load8_u`, [46167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2392
assert_return(() => invoke($13, `load8_u`, [46366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2393
assert_return(() => invoke($13, `load8_u`, [46565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2394
assert_return(() => invoke($13, `load8_u`, [46764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2395
assert_return(() => invoke($13, `load8_u`, [46963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2396
assert_return(() => invoke($13, `load8_u`, [47162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2397
assert_return(() => invoke($13, `load8_u`, [47361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2398
assert_return(() => invoke($13, `load8_u`, [47560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2399
assert_return(() => invoke($13, `load8_u`, [47759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2400
assert_return(() => invoke($13, `load8_u`, [47958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2401
assert_return(() => invoke($13, `load8_u`, [48157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2402
assert_return(() => invoke($13, `load8_u`, [48356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2403
assert_return(() => invoke($13, `load8_u`, [48555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2404
assert_return(() => invoke($13, `load8_u`, [48754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2405
assert_return(() => invoke($13, `load8_u`, [48953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2406
assert_return(() => invoke($13, `load8_u`, [49152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2407
assert_return(() => invoke($13, `load8_u`, [49351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2408
assert_return(() => invoke($13, `load8_u`, [49550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2409
assert_return(() => invoke($13, `load8_u`, [49749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2410
assert_return(() => invoke($13, `load8_u`, [49948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2411
assert_return(() => invoke($13, `load8_u`, [50147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2412
assert_return(() => invoke($13, `load8_u`, [50346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2413
assert_return(() => invoke($13, `load8_u`, [50545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2414
assert_return(() => invoke($13, `load8_u`, [50744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2415
assert_return(() => invoke($13, `load8_u`, [50943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2416
assert_return(() => invoke($13, `load8_u`, [51142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2417
assert_return(() => invoke($13, `load8_u`, [51341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2418
assert_return(() => invoke($13, `load8_u`, [51540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2419
assert_return(() => invoke($13, `load8_u`, [51739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2420
assert_return(() => invoke($13, `load8_u`, [51938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2421
assert_return(() => invoke($13, `load8_u`, [52137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2422
assert_return(() => invoke($13, `load8_u`, [52336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2423
assert_return(() => invoke($13, `load8_u`, [52535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2424
assert_return(() => invoke($13, `load8_u`, [52734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2425
assert_return(() => invoke($13, `load8_u`, [52933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2426
assert_return(() => invoke($13, `load8_u`, [53132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2427
assert_return(() => invoke($13, `load8_u`, [53331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2428
assert_return(() => invoke($13, `load8_u`, [53530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2429
assert_return(() => invoke($13, `load8_u`, [53729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2430
assert_return(() => invoke($13, `load8_u`, [53928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2431
assert_return(() => invoke($13, `load8_u`, [54127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2432
assert_return(() => invoke($13, `load8_u`, [54326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2433
assert_return(() => invoke($13, `load8_u`, [54525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2434
assert_return(() => invoke($13, `load8_u`, [54724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2435
assert_return(() => invoke($13, `load8_u`, [54923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2436
assert_return(() => invoke($13, `load8_u`, [55122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2437
assert_return(() => invoke($13, `load8_u`, [55321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2438
assert_return(() => invoke($13, `load8_u`, [55520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2439
assert_return(() => invoke($13, `load8_u`, [55719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2440
assert_return(() => invoke($13, `load8_u`, [55918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2441
assert_return(() => invoke($13, `load8_u`, [56117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2442
assert_return(() => invoke($13, `load8_u`, [56316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2443
assert_return(() => invoke($13, `load8_u`, [56515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2444
assert_return(() => invoke($13, `load8_u`, [56714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2445
assert_return(() => invoke($13, `load8_u`, [56913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2446
assert_return(() => invoke($13, `load8_u`, [57112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2447
assert_return(() => invoke($13, `load8_u`, [57311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2448
assert_return(() => invoke($13, `load8_u`, [57510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2449
assert_return(() => invoke($13, `load8_u`, [57709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2450
assert_return(() => invoke($13, `load8_u`, [57908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2451
assert_return(() => invoke($13, `load8_u`, [58107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2452
assert_return(() => invoke($13, `load8_u`, [58306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2453
assert_return(() => invoke($13, `load8_u`, [58505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2454
assert_return(() => invoke($13, `load8_u`, [58704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2455
assert_return(() => invoke($13, `load8_u`, [58903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2456
assert_return(() => invoke($13, `load8_u`, [59102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2457
assert_return(() => invoke($13, `load8_u`, [59301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2458
assert_return(() => invoke($13, `load8_u`, [59500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2459
assert_return(() => invoke($13, `load8_u`, [59699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2460
assert_return(() => invoke($13, `load8_u`, [59898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2461
assert_return(() => invoke($13, `load8_u`, [60097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2462
assert_return(() => invoke($13, `load8_u`, [60296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2463
assert_return(() => invoke($13, `load8_u`, [60495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2464
assert_return(() => invoke($13, `load8_u`, [60694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2465
assert_return(() => invoke($13, `load8_u`, [60893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2466
assert_return(() => invoke($13, `load8_u`, [61092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2467
assert_return(() => invoke($13, `load8_u`, [61291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2468
assert_return(() => invoke($13, `load8_u`, [61490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2469
assert_return(() => invoke($13, `load8_u`, [61689]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2470
assert_return(() => invoke($13, `load8_u`, [61888]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2471
assert_return(() => invoke($13, `load8_u`, [62087]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2472
assert_return(() => invoke($13, `load8_u`, [62286]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2473
assert_return(() => invoke($13, `load8_u`, [62485]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2474
assert_return(() => invoke($13, `load8_u`, [62684]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2475
assert_return(() => invoke($13, `load8_u`, [62883]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2476
assert_return(() => invoke($13, `load8_u`, [63082]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2477
assert_return(() => invoke($13, `load8_u`, [63281]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2478
assert_return(() => invoke($13, `load8_u`, [63480]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2479
assert_return(() => invoke($13, `load8_u`, [63679]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2480
assert_return(() => invoke($13, `load8_u`, [63878]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2481
assert_return(() => invoke($13, `load8_u`, [64077]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2482
assert_return(() => invoke($13, `load8_u`, [64276]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2483
assert_return(() => invoke($13, `load8_u`, [64475]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2484
assert_return(() => invoke($13, `load8_u`, [64674]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2485
assert_return(() => invoke($13, `load8_u`, [64873]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2486
assert_return(() => invoke($13, `load8_u`, [65072]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2487
assert_return(() => invoke($13, `load8_u`, [65271]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2488
assert_return(() => invoke($13, `load8_u`, [65470]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2489
assert_return(() => invoke($13, `load8_u`, [65516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2490
assert_return(() => invoke($13, `load8_u`, [65517]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:2491
assert_return(() => invoke($13, `load8_u`, [65518]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:2492
assert_return(() => invoke($13, `load8_u`, [65519]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:2493
assert_return(() => invoke($13, `load8_u`, [65520]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:2494
assert_return(() => invoke($13, `load8_u`, [65521]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:2495
assert_return(() => invoke($13, `load8_u`, [65522]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:2496
assert_return(() => invoke($13, `load8_u`, [65523]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:2497
assert_return(() => invoke($13, `load8_u`, [65524]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:2498
assert_return(() => invoke($13, `load8_u`, [65525]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:2499
assert_return(() => invoke($13, `load8_u`, [65526]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:2500
assert_return(() => invoke($13, `load8_u`, [65527]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:2501
assert_return(() => invoke($13, `load8_u`, [65528]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:2502
assert_return(() => invoke($13, `load8_u`, [65529]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:2503
assert_return(() => invoke($13, `load8_u`, [65530]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:2504
assert_return(() => invoke($13, `load8_u`, [65531]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:2505
assert_return(() => invoke($13, `load8_u`, [65532]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:2506
assert_return(() => invoke($13, `load8_u`, [65533]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:2507
assert_return(() => invoke($13, `load8_u`, [65534]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:2508
assert_return(() => invoke($13, `load8_u`, [65535]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:2510
let $14 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 65506) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:2518
assert_trap(() => invoke($14, `run`, [65516, 65506, 40]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:2521
assert_return(() => invoke($14, `load8_u`, [198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2522
assert_return(() => invoke($14, `load8_u`, [397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2523
assert_return(() => invoke($14, `load8_u`, [596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2524
assert_return(() => invoke($14, `load8_u`, [795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2525
assert_return(() => invoke($14, `load8_u`, [994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2526
assert_return(() => invoke($14, `load8_u`, [1193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2527
assert_return(() => invoke($14, `load8_u`, [1392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2528
assert_return(() => invoke($14, `load8_u`, [1591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2529
assert_return(() => invoke($14, `load8_u`, [1790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2530
assert_return(() => invoke($14, `load8_u`, [1989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2531
assert_return(() => invoke($14, `load8_u`, [2188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2532
assert_return(() => invoke($14, `load8_u`, [2387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2533
assert_return(() => invoke($14, `load8_u`, [2586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2534
assert_return(() => invoke($14, `load8_u`, [2785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2535
assert_return(() => invoke($14, `load8_u`, [2984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2536
assert_return(() => invoke($14, `load8_u`, [3183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2537
assert_return(() => invoke($14, `load8_u`, [3382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2538
assert_return(() => invoke($14, `load8_u`, [3581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2539
assert_return(() => invoke($14, `load8_u`, [3780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2540
assert_return(() => invoke($14, `load8_u`, [3979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2541
assert_return(() => invoke($14, `load8_u`, [4178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2542
assert_return(() => invoke($14, `load8_u`, [4377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2543
assert_return(() => invoke($14, `load8_u`, [4576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2544
assert_return(() => invoke($14, `load8_u`, [4775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2545
assert_return(() => invoke($14, `load8_u`, [4974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2546
assert_return(() => invoke($14, `load8_u`, [5173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2547
assert_return(() => invoke($14, `load8_u`, [5372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2548
assert_return(() => invoke($14, `load8_u`, [5571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2549
assert_return(() => invoke($14, `load8_u`, [5770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2550
assert_return(() => invoke($14, `load8_u`, [5969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2551
assert_return(() => invoke($14, `load8_u`, [6168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2552
assert_return(() => invoke($14, `load8_u`, [6367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2553
assert_return(() => invoke($14, `load8_u`, [6566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2554
assert_return(() => invoke($14, `load8_u`, [6765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2555
assert_return(() => invoke($14, `load8_u`, [6964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2556
assert_return(() => invoke($14, `load8_u`, [7163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2557
assert_return(() => invoke($14, `load8_u`, [7362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2558
assert_return(() => invoke($14, `load8_u`, [7561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2559
assert_return(() => invoke($14, `load8_u`, [7760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2560
assert_return(() => invoke($14, `load8_u`, [7959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2561
assert_return(() => invoke($14, `load8_u`, [8158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2562
assert_return(() => invoke($14, `load8_u`, [8357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2563
assert_return(() => invoke($14, `load8_u`, [8556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2564
assert_return(() => invoke($14, `load8_u`, [8755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2565
assert_return(() => invoke($14, `load8_u`, [8954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2566
assert_return(() => invoke($14, `load8_u`, [9153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2567
assert_return(() => invoke($14, `load8_u`, [9352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2568
assert_return(() => invoke($14, `load8_u`, [9551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2569
assert_return(() => invoke($14, `load8_u`, [9750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2570
assert_return(() => invoke($14, `load8_u`, [9949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2571
assert_return(() => invoke($14, `load8_u`, [10148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2572
assert_return(() => invoke($14, `load8_u`, [10347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2573
assert_return(() => invoke($14, `load8_u`, [10546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2574
assert_return(() => invoke($14, `load8_u`, [10745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2575
assert_return(() => invoke($14, `load8_u`, [10944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2576
assert_return(() => invoke($14, `load8_u`, [11143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2577
assert_return(() => invoke($14, `load8_u`, [11342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2578
assert_return(() => invoke($14, `load8_u`, [11541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2579
assert_return(() => invoke($14, `load8_u`, [11740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2580
assert_return(() => invoke($14, `load8_u`, [11939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2581
assert_return(() => invoke($14, `load8_u`, [12138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2582
assert_return(() => invoke($14, `load8_u`, [12337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2583
assert_return(() => invoke($14, `load8_u`, [12536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2584
assert_return(() => invoke($14, `load8_u`, [12735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2585
assert_return(() => invoke($14, `load8_u`, [12934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2586
assert_return(() => invoke($14, `load8_u`, [13133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2587
assert_return(() => invoke($14, `load8_u`, [13332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2588
assert_return(() => invoke($14, `load8_u`, [13531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2589
assert_return(() => invoke($14, `load8_u`, [13730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2590
assert_return(() => invoke($14, `load8_u`, [13929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2591
assert_return(() => invoke($14, `load8_u`, [14128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2592
assert_return(() => invoke($14, `load8_u`, [14327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2593
assert_return(() => invoke($14, `load8_u`, [14526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2594
assert_return(() => invoke($14, `load8_u`, [14725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2595
assert_return(() => invoke($14, `load8_u`, [14924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2596
assert_return(() => invoke($14, `load8_u`, [15123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2597
assert_return(() => invoke($14, `load8_u`, [15322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2598
assert_return(() => invoke($14, `load8_u`, [15521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2599
assert_return(() => invoke($14, `load8_u`, [15720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2600
assert_return(() => invoke($14, `load8_u`, [15919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2601
assert_return(() => invoke($14, `load8_u`, [16118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2602
assert_return(() => invoke($14, `load8_u`, [16317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2603
assert_return(() => invoke($14, `load8_u`, [16516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2604
assert_return(() => invoke($14, `load8_u`, [16715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2605
assert_return(() => invoke($14, `load8_u`, [16914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2606
assert_return(() => invoke($14, `load8_u`, [17113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2607
assert_return(() => invoke($14, `load8_u`, [17312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2608
assert_return(() => invoke($14, `load8_u`, [17511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2609
assert_return(() => invoke($14, `load8_u`, [17710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2610
assert_return(() => invoke($14, `load8_u`, [17909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2611
assert_return(() => invoke($14, `load8_u`, [18108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2612
assert_return(() => invoke($14, `load8_u`, [18307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2613
assert_return(() => invoke($14, `load8_u`, [18506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2614
assert_return(() => invoke($14, `load8_u`, [18705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2615
assert_return(() => invoke($14, `load8_u`, [18904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2616
assert_return(() => invoke($14, `load8_u`, [19103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2617
assert_return(() => invoke($14, `load8_u`, [19302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2618
assert_return(() => invoke($14, `load8_u`, [19501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2619
assert_return(() => invoke($14, `load8_u`, [19700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2620
assert_return(() => invoke($14, `load8_u`, [19899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2621
assert_return(() => invoke($14, `load8_u`, [20098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2622
assert_return(() => invoke($14, `load8_u`, [20297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2623
assert_return(() => invoke($14, `load8_u`, [20496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2624
assert_return(() => invoke($14, `load8_u`, [20695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2625
assert_return(() => invoke($14, `load8_u`, [20894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2626
assert_return(() => invoke($14, `load8_u`, [21093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2627
assert_return(() => invoke($14, `load8_u`, [21292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2628
assert_return(() => invoke($14, `load8_u`, [21491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2629
assert_return(() => invoke($14, `load8_u`, [21690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2630
assert_return(() => invoke($14, `load8_u`, [21889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2631
assert_return(() => invoke($14, `load8_u`, [22088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2632
assert_return(() => invoke($14, `load8_u`, [22287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2633
assert_return(() => invoke($14, `load8_u`, [22486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2634
assert_return(() => invoke($14, `load8_u`, [22685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2635
assert_return(() => invoke($14, `load8_u`, [22884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2636
assert_return(() => invoke($14, `load8_u`, [23083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2637
assert_return(() => invoke($14, `load8_u`, [23282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2638
assert_return(() => invoke($14, `load8_u`, [23481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2639
assert_return(() => invoke($14, `load8_u`, [23680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2640
assert_return(() => invoke($14, `load8_u`, [23879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2641
assert_return(() => invoke($14, `load8_u`, [24078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2642
assert_return(() => invoke($14, `load8_u`, [24277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2643
assert_return(() => invoke($14, `load8_u`, [24476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2644
assert_return(() => invoke($14, `load8_u`, [24675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2645
assert_return(() => invoke($14, `load8_u`, [24874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2646
assert_return(() => invoke($14, `load8_u`, [25073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2647
assert_return(() => invoke($14, `load8_u`, [25272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2648
assert_return(() => invoke($14, `load8_u`, [25471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2649
assert_return(() => invoke($14, `load8_u`, [25670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2650
assert_return(() => invoke($14, `load8_u`, [25869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2651
assert_return(() => invoke($14, `load8_u`, [26068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2652
assert_return(() => invoke($14, `load8_u`, [26267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2653
assert_return(() => invoke($14, `load8_u`, [26466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2654
assert_return(() => invoke($14, `load8_u`, [26665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2655
assert_return(() => invoke($14, `load8_u`, [26864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2656
assert_return(() => invoke($14, `load8_u`, [27063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2657
assert_return(() => invoke($14, `load8_u`, [27262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2658
assert_return(() => invoke($14, `load8_u`, [27461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2659
assert_return(() => invoke($14, `load8_u`, [27660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2660
assert_return(() => invoke($14, `load8_u`, [27859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2661
assert_return(() => invoke($14, `load8_u`, [28058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2662
assert_return(() => invoke($14, `load8_u`, [28257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2663
assert_return(() => invoke($14, `load8_u`, [28456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2664
assert_return(() => invoke($14, `load8_u`, [28655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2665
assert_return(() => invoke($14, `load8_u`, [28854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2666
assert_return(() => invoke($14, `load8_u`, [29053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2667
assert_return(() => invoke($14, `load8_u`, [29252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2668
assert_return(() => invoke($14, `load8_u`, [29451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2669
assert_return(() => invoke($14, `load8_u`, [29650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2670
assert_return(() => invoke($14, `load8_u`, [29849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2671
assert_return(() => invoke($14, `load8_u`, [30048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2672
assert_return(() => invoke($14, `load8_u`, [30247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2673
assert_return(() => invoke($14, `load8_u`, [30446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2674
assert_return(() => invoke($14, `load8_u`, [30645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2675
assert_return(() => invoke($14, `load8_u`, [30844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2676
assert_return(() => invoke($14, `load8_u`, [31043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2677
assert_return(() => invoke($14, `load8_u`, [31242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2678
assert_return(() => invoke($14, `load8_u`, [31441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2679
assert_return(() => invoke($14, `load8_u`, [31640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2680
assert_return(() => invoke($14, `load8_u`, [31839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2681
assert_return(() => invoke($14, `load8_u`, [32038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2682
assert_return(() => invoke($14, `load8_u`, [32237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2683
assert_return(() => invoke($14, `load8_u`, [32436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2684
assert_return(() => invoke($14, `load8_u`, [32635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2685
assert_return(() => invoke($14, `load8_u`, [32834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2686
assert_return(() => invoke($14, `load8_u`, [33033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2687
assert_return(() => invoke($14, `load8_u`, [33232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2688
assert_return(() => invoke($14, `load8_u`, [33431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2689
assert_return(() => invoke($14, `load8_u`, [33630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2690
assert_return(() => invoke($14, `load8_u`, [33829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2691
assert_return(() => invoke($14, `load8_u`, [34028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2692
assert_return(() => invoke($14, `load8_u`, [34227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2693
assert_return(() => invoke($14, `load8_u`, [34426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2694
assert_return(() => invoke($14, `load8_u`, [34625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2695
assert_return(() => invoke($14, `load8_u`, [34824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2696
assert_return(() => invoke($14, `load8_u`, [35023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2697
assert_return(() => invoke($14, `load8_u`, [35222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2698
assert_return(() => invoke($14, `load8_u`, [35421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2699
assert_return(() => invoke($14, `load8_u`, [35620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2700
assert_return(() => invoke($14, `load8_u`, [35819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2701
assert_return(() => invoke($14, `load8_u`, [36018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2702
assert_return(() => invoke($14, `load8_u`, [36217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2703
assert_return(() => invoke($14, `load8_u`, [36416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2704
assert_return(() => invoke($14, `load8_u`, [36615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2705
assert_return(() => invoke($14, `load8_u`, [36814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2706
assert_return(() => invoke($14, `load8_u`, [37013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2707
assert_return(() => invoke($14, `load8_u`, [37212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2708
assert_return(() => invoke($14, `load8_u`, [37411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2709
assert_return(() => invoke($14, `load8_u`, [37610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2710
assert_return(() => invoke($14, `load8_u`, [37809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2711
assert_return(() => invoke($14, `load8_u`, [38008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2712
assert_return(() => invoke($14, `load8_u`, [38207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2713
assert_return(() => invoke($14, `load8_u`, [38406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2714
assert_return(() => invoke($14, `load8_u`, [38605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2715
assert_return(() => invoke($14, `load8_u`, [38804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2716
assert_return(() => invoke($14, `load8_u`, [39003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2717
assert_return(() => invoke($14, `load8_u`, [39202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2718
assert_return(() => invoke($14, `load8_u`, [39401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2719
assert_return(() => invoke($14, `load8_u`, [39600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2720
assert_return(() => invoke($14, `load8_u`, [39799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2721
assert_return(() => invoke($14, `load8_u`, [39998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2722
assert_return(() => invoke($14, `load8_u`, [40197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2723
assert_return(() => invoke($14, `load8_u`, [40396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2724
assert_return(() => invoke($14, `load8_u`, [40595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2725
assert_return(() => invoke($14, `load8_u`, [40794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2726
assert_return(() => invoke($14, `load8_u`, [40993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2727
assert_return(() => invoke($14, `load8_u`, [41192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2728
assert_return(() => invoke($14, `load8_u`, [41391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2729
assert_return(() => invoke($14, `load8_u`, [41590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2730
assert_return(() => invoke($14, `load8_u`, [41789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2731
assert_return(() => invoke($14, `load8_u`, [41988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2732
assert_return(() => invoke($14, `load8_u`, [42187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2733
assert_return(() => invoke($14, `load8_u`, [42386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2734
assert_return(() => invoke($14, `load8_u`, [42585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2735
assert_return(() => invoke($14, `load8_u`, [42784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2736
assert_return(() => invoke($14, `load8_u`, [42983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2737
assert_return(() => invoke($14, `load8_u`, [43182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2738
assert_return(() => invoke($14, `load8_u`, [43381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2739
assert_return(() => invoke($14, `load8_u`, [43580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2740
assert_return(() => invoke($14, `load8_u`, [43779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2741
assert_return(() => invoke($14, `load8_u`, [43978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2742
assert_return(() => invoke($14, `load8_u`, [44177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2743
assert_return(() => invoke($14, `load8_u`, [44376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2744
assert_return(() => invoke($14, `load8_u`, [44575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2745
assert_return(() => invoke($14, `load8_u`, [44774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2746
assert_return(() => invoke($14, `load8_u`, [44973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2747
assert_return(() => invoke($14, `load8_u`, [45172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2748
assert_return(() => invoke($14, `load8_u`, [45371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2749
assert_return(() => invoke($14, `load8_u`, [45570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2750
assert_return(() => invoke($14, `load8_u`, [45769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2751
assert_return(() => invoke($14, `load8_u`, [45968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2752
assert_return(() => invoke($14, `load8_u`, [46167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2753
assert_return(() => invoke($14, `load8_u`, [46366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2754
assert_return(() => invoke($14, `load8_u`, [46565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2755
assert_return(() => invoke($14, `load8_u`, [46764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2756
assert_return(() => invoke($14, `load8_u`, [46963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2757
assert_return(() => invoke($14, `load8_u`, [47162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2758
assert_return(() => invoke($14, `load8_u`, [47361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2759
assert_return(() => invoke($14, `load8_u`, [47560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2760
assert_return(() => invoke($14, `load8_u`, [47759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2761
assert_return(() => invoke($14, `load8_u`, [47958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2762
assert_return(() => invoke($14, `load8_u`, [48157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2763
assert_return(() => invoke($14, `load8_u`, [48356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2764
assert_return(() => invoke($14, `load8_u`, [48555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2765
assert_return(() => invoke($14, `load8_u`, [48754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2766
assert_return(() => invoke($14, `load8_u`, [48953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2767
assert_return(() => invoke($14, `load8_u`, [49152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2768
assert_return(() => invoke($14, `load8_u`, [49351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2769
assert_return(() => invoke($14, `load8_u`, [49550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2770
assert_return(() => invoke($14, `load8_u`, [49749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2771
assert_return(() => invoke($14, `load8_u`, [49948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2772
assert_return(() => invoke($14, `load8_u`, [50147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2773
assert_return(() => invoke($14, `load8_u`, [50346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2774
assert_return(() => invoke($14, `load8_u`, [50545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2775
assert_return(() => invoke($14, `load8_u`, [50744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2776
assert_return(() => invoke($14, `load8_u`, [50943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2777
assert_return(() => invoke($14, `load8_u`, [51142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2778
assert_return(() => invoke($14, `load8_u`, [51341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2779
assert_return(() => invoke($14, `load8_u`, [51540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2780
assert_return(() => invoke($14, `load8_u`, [51739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2781
assert_return(() => invoke($14, `load8_u`, [51938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2782
assert_return(() => invoke($14, `load8_u`, [52137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2783
assert_return(() => invoke($14, `load8_u`, [52336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2784
assert_return(() => invoke($14, `load8_u`, [52535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2785
assert_return(() => invoke($14, `load8_u`, [52734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2786
assert_return(() => invoke($14, `load8_u`, [52933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2787
assert_return(() => invoke($14, `load8_u`, [53132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2788
assert_return(() => invoke($14, `load8_u`, [53331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2789
assert_return(() => invoke($14, `load8_u`, [53530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2790
assert_return(() => invoke($14, `load8_u`, [53729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2791
assert_return(() => invoke($14, `load8_u`, [53928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2792
assert_return(() => invoke($14, `load8_u`, [54127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2793
assert_return(() => invoke($14, `load8_u`, [54326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2794
assert_return(() => invoke($14, `load8_u`, [54525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2795
assert_return(() => invoke($14, `load8_u`, [54724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2796
assert_return(() => invoke($14, `load8_u`, [54923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2797
assert_return(() => invoke($14, `load8_u`, [55122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2798
assert_return(() => invoke($14, `load8_u`, [55321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2799
assert_return(() => invoke($14, `load8_u`, [55520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2800
assert_return(() => invoke($14, `load8_u`, [55719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2801
assert_return(() => invoke($14, `load8_u`, [55918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2802
assert_return(() => invoke($14, `load8_u`, [56117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2803
assert_return(() => invoke($14, `load8_u`, [56316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2804
assert_return(() => invoke($14, `load8_u`, [56515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2805
assert_return(() => invoke($14, `load8_u`, [56714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2806
assert_return(() => invoke($14, `load8_u`, [56913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2807
assert_return(() => invoke($14, `load8_u`, [57112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2808
assert_return(() => invoke($14, `load8_u`, [57311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2809
assert_return(() => invoke($14, `load8_u`, [57510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2810
assert_return(() => invoke($14, `load8_u`, [57709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2811
assert_return(() => invoke($14, `load8_u`, [57908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2812
assert_return(() => invoke($14, `load8_u`, [58107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2813
assert_return(() => invoke($14, `load8_u`, [58306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2814
assert_return(() => invoke($14, `load8_u`, [58505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2815
assert_return(() => invoke($14, `load8_u`, [58704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2816
assert_return(() => invoke($14, `load8_u`, [58903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2817
assert_return(() => invoke($14, `load8_u`, [59102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2818
assert_return(() => invoke($14, `load8_u`, [59301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2819
assert_return(() => invoke($14, `load8_u`, [59500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2820
assert_return(() => invoke($14, `load8_u`, [59699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2821
assert_return(() => invoke($14, `load8_u`, [59898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2822
assert_return(() => invoke($14, `load8_u`, [60097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2823
assert_return(() => invoke($14, `load8_u`, [60296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2824
assert_return(() => invoke($14, `load8_u`, [60495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2825
assert_return(() => invoke($14, `load8_u`, [60694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2826
assert_return(() => invoke($14, `load8_u`, [60893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2827
assert_return(() => invoke($14, `load8_u`, [61092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2828
assert_return(() => invoke($14, `load8_u`, [61291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2829
assert_return(() => invoke($14, `load8_u`, [61490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2830
assert_return(() => invoke($14, `load8_u`, [61689]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2831
assert_return(() => invoke($14, `load8_u`, [61888]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2832
assert_return(() => invoke($14, `load8_u`, [62087]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2833
assert_return(() => invoke($14, `load8_u`, [62286]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2834
assert_return(() => invoke($14, `load8_u`, [62485]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2835
assert_return(() => invoke($14, `load8_u`, [62684]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2836
assert_return(() => invoke($14, `load8_u`, [62883]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2837
assert_return(() => invoke($14, `load8_u`, [63082]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2838
assert_return(() => invoke($14, `load8_u`, [63281]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2839
assert_return(() => invoke($14, `load8_u`, [63480]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2840
assert_return(() => invoke($14, `load8_u`, [63679]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2841
assert_return(() => invoke($14, `load8_u`, [63878]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2842
assert_return(() => invoke($14, `load8_u`, [64077]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2843
assert_return(() => invoke($14, `load8_u`, [64276]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2844
assert_return(() => invoke($14, `load8_u`, [64475]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2845
assert_return(() => invoke($14, `load8_u`, [64674]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2846
assert_return(() => invoke($14, `load8_u`, [64873]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2847
assert_return(() => invoke($14, `load8_u`, [65072]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2848
assert_return(() => invoke($14, `load8_u`, [65271]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2849
assert_return(() => invoke($14, `load8_u`, [65470]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2850
assert_return(() => invoke($14, `load8_u`, [65506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2851
assert_return(() => invoke($14, `load8_u`, [65507]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:2852
assert_return(() => invoke($14, `load8_u`, [65508]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:2853
assert_return(() => invoke($14, `load8_u`, [65509]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:2854
assert_return(() => invoke($14, `load8_u`, [65510]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:2855
assert_return(() => invoke($14, `load8_u`, [65511]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:2856
assert_return(() => invoke($14, `load8_u`, [65512]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:2857
assert_return(() => invoke($14, `load8_u`, [65513]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:2858
assert_return(() => invoke($14, `load8_u`, [65514]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:2859
assert_return(() => invoke($14, `load8_u`, [65515]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:2860
assert_return(() => invoke($14, `load8_u`, [65516]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:2861
assert_return(() => invoke($14, `load8_u`, [65517]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:2862
assert_return(() => invoke($14, `load8_u`, [65518]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:2863
assert_return(() => invoke($14, `load8_u`, [65519]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:2864
assert_return(() => invoke($14, `load8_u`, [65520]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:2865
assert_return(() => invoke($14, `load8_u`, [65521]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:2866
assert_return(() => invoke($14, `load8_u`, [65522]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:2867
assert_return(() => invoke($14, `load8_u`, [65523]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:2868
assert_return(() => invoke($14, `load8_u`, [65524]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:2869
assert_return(() => invoke($14, `load8_u`, [65525]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:2871
let $15 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 65516) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:2879
assert_trap(() => invoke($15, `run`, [65506, 65516, 40]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:2882
assert_return(() => invoke($15, `load8_u`, [198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2883
assert_return(() => invoke($15, `load8_u`, [397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2884
assert_return(() => invoke($15, `load8_u`, [596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2885
assert_return(() => invoke($15, `load8_u`, [795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2886
assert_return(() => invoke($15, `load8_u`, [994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2887
assert_return(() => invoke($15, `load8_u`, [1193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2888
assert_return(() => invoke($15, `load8_u`, [1392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2889
assert_return(() => invoke($15, `load8_u`, [1591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2890
assert_return(() => invoke($15, `load8_u`, [1790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2891
assert_return(() => invoke($15, `load8_u`, [1989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2892
assert_return(() => invoke($15, `load8_u`, [2188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2893
assert_return(() => invoke($15, `load8_u`, [2387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2894
assert_return(() => invoke($15, `load8_u`, [2586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2895
assert_return(() => invoke($15, `load8_u`, [2785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2896
assert_return(() => invoke($15, `load8_u`, [2984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2897
assert_return(() => invoke($15, `load8_u`, [3183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2898
assert_return(() => invoke($15, `load8_u`, [3382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2899
assert_return(() => invoke($15, `load8_u`, [3581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2900
assert_return(() => invoke($15, `load8_u`, [3780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2901
assert_return(() => invoke($15, `load8_u`, [3979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2902
assert_return(() => invoke($15, `load8_u`, [4178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2903
assert_return(() => invoke($15, `load8_u`, [4377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2904
assert_return(() => invoke($15, `load8_u`, [4576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2905
assert_return(() => invoke($15, `load8_u`, [4775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2906
assert_return(() => invoke($15, `load8_u`, [4974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2907
assert_return(() => invoke($15, `load8_u`, [5173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2908
assert_return(() => invoke($15, `load8_u`, [5372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2909
assert_return(() => invoke($15, `load8_u`, [5571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2910
assert_return(() => invoke($15, `load8_u`, [5770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2911
assert_return(() => invoke($15, `load8_u`, [5969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2912
assert_return(() => invoke($15, `load8_u`, [6168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2913
assert_return(() => invoke($15, `load8_u`, [6367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2914
assert_return(() => invoke($15, `load8_u`, [6566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2915
assert_return(() => invoke($15, `load8_u`, [6765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2916
assert_return(() => invoke($15, `load8_u`, [6964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2917
assert_return(() => invoke($15, `load8_u`, [7163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2918
assert_return(() => invoke($15, `load8_u`, [7362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2919
assert_return(() => invoke($15, `load8_u`, [7561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2920
assert_return(() => invoke($15, `load8_u`, [7760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2921
assert_return(() => invoke($15, `load8_u`, [7959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2922
assert_return(() => invoke($15, `load8_u`, [8158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2923
assert_return(() => invoke($15, `load8_u`, [8357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2924
assert_return(() => invoke($15, `load8_u`, [8556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2925
assert_return(() => invoke($15, `load8_u`, [8755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2926
assert_return(() => invoke($15, `load8_u`, [8954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2927
assert_return(() => invoke($15, `load8_u`, [9153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2928
assert_return(() => invoke($15, `load8_u`, [9352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2929
assert_return(() => invoke($15, `load8_u`, [9551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2930
assert_return(() => invoke($15, `load8_u`, [9750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2931
assert_return(() => invoke($15, `load8_u`, [9949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2932
assert_return(() => invoke($15, `load8_u`, [10148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2933
assert_return(() => invoke($15, `load8_u`, [10347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2934
assert_return(() => invoke($15, `load8_u`, [10546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2935
assert_return(() => invoke($15, `load8_u`, [10745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2936
assert_return(() => invoke($15, `load8_u`, [10944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2937
assert_return(() => invoke($15, `load8_u`, [11143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2938
assert_return(() => invoke($15, `load8_u`, [11342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2939
assert_return(() => invoke($15, `load8_u`, [11541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2940
assert_return(() => invoke($15, `load8_u`, [11740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2941
assert_return(() => invoke($15, `load8_u`, [11939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2942
assert_return(() => invoke($15, `load8_u`, [12138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2943
assert_return(() => invoke($15, `load8_u`, [12337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2944
assert_return(() => invoke($15, `load8_u`, [12536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2945
assert_return(() => invoke($15, `load8_u`, [12735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2946
assert_return(() => invoke($15, `load8_u`, [12934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2947
assert_return(() => invoke($15, `load8_u`, [13133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2948
assert_return(() => invoke($15, `load8_u`, [13332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2949
assert_return(() => invoke($15, `load8_u`, [13531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2950
assert_return(() => invoke($15, `load8_u`, [13730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2951
assert_return(() => invoke($15, `load8_u`, [13929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2952
assert_return(() => invoke($15, `load8_u`, [14128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2953
assert_return(() => invoke($15, `load8_u`, [14327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2954
assert_return(() => invoke($15, `load8_u`, [14526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2955
assert_return(() => invoke($15, `load8_u`, [14725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2956
assert_return(() => invoke($15, `load8_u`, [14924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2957
assert_return(() => invoke($15, `load8_u`, [15123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2958
assert_return(() => invoke($15, `load8_u`, [15322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2959
assert_return(() => invoke($15, `load8_u`, [15521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2960
assert_return(() => invoke($15, `load8_u`, [15720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2961
assert_return(() => invoke($15, `load8_u`, [15919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2962
assert_return(() => invoke($15, `load8_u`, [16118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2963
assert_return(() => invoke($15, `load8_u`, [16317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2964
assert_return(() => invoke($15, `load8_u`, [16516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2965
assert_return(() => invoke($15, `load8_u`, [16715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2966
assert_return(() => invoke($15, `load8_u`, [16914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2967
assert_return(() => invoke($15, `load8_u`, [17113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2968
assert_return(() => invoke($15, `load8_u`, [17312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2969
assert_return(() => invoke($15, `load8_u`, [17511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2970
assert_return(() => invoke($15, `load8_u`, [17710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2971
assert_return(() => invoke($15, `load8_u`, [17909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2972
assert_return(() => invoke($15, `load8_u`, [18108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2973
assert_return(() => invoke($15, `load8_u`, [18307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2974
assert_return(() => invoke($15, `load8_u`, [18506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2975
assert_return(() => invoke($15, `load8_u`, [18705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2976
assert_return(() => invoke($15, `load8_u`, [18904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2977
assert_return(() => invoke($15, `load8_u`, [19103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2978
assert_return(() => invoke($15, `load8_u`, [19302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2979
assert_return(() => invoke($15, `load8_u`, [19501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2980
assert_return(() => invoke($15, `load8_u`, [19700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2981
assert_return(() => invoke($15, `load8_u`, [19899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2982
assert_return(() => invoke($15, `load8_u`, [20098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2983
assert_return(() => invoke($15, `load8_u`, [20297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2984
assert_return(() => invoke($15, `load8_u`, [20496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2985
assert_return(() => invoke($15, `load8_u`, [20695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2986
assert_return(() => invoke($15, `load8_u`, [20894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2987
assert_return(() => invoke($15, `load8_u`, [21093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2988
assert_return(() => invoke($15, `load8_u`, [21292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2989
assert_return(() => invoke($15, `load8_u`, [21491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2990
assert_return(() => invoke($15, `load8_u`, [21690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2991
assert_return(() => invoke($15, `load8_u`, [21889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2992
assert_return(() => invoke($15, `load8_u`, [22088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2993
assert_return(() => invoke($15, `load8_u`, [22287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2994
assert_return(() => invoke($15, `load8_u`, [22486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2995
assert_return(() => invoke($15, `load8_u`, [22685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2996
assert_return(() => invoke($15, `load8_u`, [22884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2997
assert_return(() => invoke($15, `load8_u`, [23083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2998
assert_return(() => invoke($15, `load8_u`, [23282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:2999
assert_return(() => invoke($15, `load8_u`, [23481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3000
assert_return(() => invoke($15, `load8_u`, [23680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3001
assert_return(() => invoke($15, `load8_u`, [23879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3002
assert_return(() => invoke($15, `load8_u`, [24078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3003
assert_return(() => invoke($15, `load8_u`, [24277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3004
assert_return(() => invoke($15, `load8_u`, [24476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3005
assert_return(() => invoke($15, `load8_u`, [24675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3006
assert_return(() => invoke($15, `load8_u`, [24874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3007
assert_return(() => invoke($15, `load8_u`, [25073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3008
assert_return(() => invoke($15, `load8_u`, [25272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3009
assert_return(() => invoke($15, `load8_u`, [25471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3010
assert_return(() => invoke($15, `load8_u`, [25670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3011
assert_return(() => invoke($15, `load8_u`, [25869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3012
assert_return(() => invoke($15, `load8_u`, [26068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3013
assert_return(() => invoke($15, `load8_u`, [26267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3014
assert_return(() => invoke($15, `load8_u`, [26466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3015
assert_return(() => invoke($15, `load8_u`, [26665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3016
assert_return(() => invoke($15, `load8_u`, [26864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3017
assert_return(() => invoke($15, `load8_u`, [27063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3018
assert_return(() => invoke($15, `load8_u`, [27262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3019
assert_return(() => invoke($15, `load8_u`, [27461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3020
assert_return(() => invoke($15, `load8_u`, [27660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3021
assert_return(() => invoke($15, `load8_u`, [27859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3022
assert_return(() => invoke($15, `load8_u`, [28058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3023
assert_return(() => invoke($15, `load8_u`, [28257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3024
assert_return(() => invoke($15, `load8_u`, [28456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3025
assert_return(() => invoke($15, `load8_u`, [28655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3026
assert_return(() => invoke($15, `load8_u`, [28854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3027
assert_return(() => invoke($15, `load8_u`, [29053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3028
assert_return(() => invoke($15, `load8_u`, [29252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3029
assert_return(() => invoke($15, `load8_u`, [29451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3030
assert_return(() => invoke($15, `load8_u`, [29650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3031
assert_return(() => invoke($15, `load8_u`, [29849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3032
assert_return(() => invoke($15, `load8_u`, [30048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3033
assert_return(() => invoke($15, `load8_u`, [30247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3034
assert_return(() => invoke($15, `load8_u`, [30446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3035
assert_return(() => invoke($15, `load8_u`, [30645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3036
assert_return(() => invoke($15, `load8_u`, [30844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3037
assert_return(() => invoke($15, `load8_u`, [31043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3038
assert_return(() => invoke($15, `load8_u`, [31242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3039
assert_return(() => invoke($15, `load8_u`, [31441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3040
assert_return(() => invoke($15, `load8_u`, [31640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3041
assert_return(() => invoke($15, `load8_u`, [31839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3042
assert_return(() => invoke($15, `load8_u`, [32038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3043
assert_return(() => invoke($15, `load8_u`, [32237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3044
assert_return(() => invoke($15, `load8_u`, [32436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3045
assert_return(() => invoke($15, `load8_u`, [32635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3046
assert_return(() => invoke($15, `load8_u`, [32834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3047
assert_return(() => invoke($15, `load8_u`, [33033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3048
assert_return(() => invoke($15, `load8_u`, [33232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3049
assert_return(() => invoke($15, `load8_u`, [33431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3050
assert_return(() => invoke($15, `load8_u`, [33630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3051
assert_return(() => invoke($15, `load8_u`, [33829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3052
assert_return(() => invoke($15, `load8_u`, [34028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3053
assert_return(() => invoke($15, `load8_u`, [34227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3054
assert_return(() => invoke($15, `load8_u`, [34426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3055
assert_return(() => invoke($15, `load8_u`, [34625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3056
assert_return(() => invoke($15, `load8_u`, [34824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3057
assert_return(() => invoke($15, `load8_u`, [35023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3058
assert_return(() => invoke($15, `load8_u`, [35222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3059
assert_return(() => invoke($15, `load8_u`, [35421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3060
assert_return(() => invoke($15, `load8_u`, [35620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3061
assert_return(() => invoke($15, `load8_u`, [35819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3062
assert_return(() => invoke($15, `load8_u`, [36018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3063
assert_return(() => invoke($15, `load8_u`, [36217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3064
assert_return(() => invoke($15, `load8_u`, [36416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3065
assert_return(() => invoke($15, `load8_u`, [36615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3066
assert_return(() => invoke($15, `load8_u`, [36814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3067
assert_return(() => invoke($15, `load8_u`, [37013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3068
assert_return(() => invoke($15, `load8_u`, [37212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3069
assert_return(() => invoke($15, `load8_u`, [37411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3070
assert_return(() => invoke($15, `load8_u`, [37610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3071
assert_return(() => invoke($15, `load8_u`, [37809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3072
assert_return(() => invoke($15, `load8_u`, [38008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3073
assert_return(() => invoke($15, `load8_u`, [38207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3074
assert_return(() => invoke($15, `load8_u`, [38406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3075
assert_return(() => invoke($15, `load8_u`, [38605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3076
assert_return(() => invoke($15, `load8_u`, [38804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3077
assert_return(() => invoke($15, `load8_u`, [39003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3078
assert_return(() => invoke($15, `load8_u`, [39202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3079
assert_return(() => invoke($15, `load8_u`, [39401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3080
assert_return(() => invoke($15, `load8_u`, [39600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3081
assert_return(() => invoke($15, `load8_u`, [39799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3082
assert_return(() => invoke($15, `load8_u`, [39998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3083
assert_return(() => invoke($15, `load8_u`, [40197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3084
assert_return(() => invoke($15, `load8_u`, [40396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3085
assert_return(() => invoke($15, `load8_u`, [40595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3086
assert_return(() => invoke($15, `load8_u`, [40794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3087
assert_return(() => invoke($15, `load8_u`, [40993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3088
assert_return(() => invoke($15, `load8_u`, [41192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3089
assert_return(() => invoke($15, `load8_u`, [41391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3090
assert_return(() => invoke($15, `load8_u`, [41590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3091
assert_return(() => invoke($15, `load8_u`, [41789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3092
assert_return(() => invoke($15, `load8_u`, [41988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3093
assert_return(() => invoke($15, `load8_u`, [42187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3094
assert_return(() => invoke($15, `load8_u`, [42386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3095
assert_return(() => invoke($15, `load8_u`, [42585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3096
assert_return(() => invoke($15, `load8_u`, [42784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3097
assert_return(() => invoke($15, `load8_u`, [42983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3098
assert_return(() => invoke($15, `load8_u`, [43182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3099
assert_return(() => invoke($15, `load8_u`, [43381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3100
assert_return(() => invoke($15, `load8_u`, [43580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3101
assert_return(() => invoke($15, `load8_u`, [43779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3102
assert_return(() => invoke($15, `load8_u`, [43978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3103
assert_return(() => invoke($15, `load8_u`, [44177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3104
assert_return(() => invoke($15, `load8_u`, [44376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3105
assert_return(() => invoke($15, `load8_u`, [44575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3106
assert_return(() => invoke($15, `load8_u`, [44774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3107
assert_return(() => invoke($15, `load8_u`, [44973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3108
assert_return(() => invoke($15, `load8_u`, [45172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3109
assert_return(() => invoke($15, `load8_u`, [45371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3110
assert_return(() => invoke($15, `load8_u`, [45570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3111
assert_return(() => invoke($15, `load8_u`, [45769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3112
assert_return(() => invoke($15, `load8_u`, [45968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3113
assert_return(() => invoke($15, `load8_u`, [46167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3114
assert_return(() => invoke($15, `load8_u`, [46366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3115
assert_return(() => invoke($15, `load8_u`, [46565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3116
assert_return(() => invoke($15, `load8_u`, [46764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3117
assert_return(() => invoke($15, `load8_u`, [46963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3118
assert_return(() => invoke($15, `load8_u`, [47162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3119
assert_return(() => invoke($15, `load8_u`, [47361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3120
assert_return(() => invoke($15, `load8_u`, [47560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3121
assert_return(() => invoke($15, `load8_u`, [47759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3122
assert_return(() => invoke($15, `load8_u`, [47958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3123
assert_return(() => invoke($15, `load8_u`, [48157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3124
assert_return(() => invoke($15, `load8_u`, [48356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3125
assert_return(() => invoke($15, `load8_u`, [48555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3126
assert_return(() => invoke($15, `load8_u`, [48754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3127
assert_return(() => invoke($15, `load8_u`, [48953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3128
assert_return(() => invoke($15, `load8_u`, [49152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3129
assert_return(() => invoke($15, `load8_u`, [49351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3130
assert_return(() => invoke($15, `load8_u`, [49550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3131
assert_return(() => invoke($15, `load8_u`, [49749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3132
assert_return(() => invoke($15, `load8_u`, [49948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3133
assert_return(() => invoke($15, `load8_u`, [50147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3134
assert_return(() => invoke($15, `load8_u`, [50346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3135
assert_return(() => invoke($15, `load8_u`, [50545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3136
assert_return(() => invoke($15, `load8_u`, [50744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3137
assert_return(() => invoke($15, `load8_u`, [50943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3138
assert_return(() => invoke($15, `load8_u`, [51142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3139
assert_return(() => invoke($15, `load8_u`, [51341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3140
assert_return(() => invoke($15, `load8_u`, [51540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3141
assert_return(() => invoke($15, `load8_u`, [51739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3142
assert_return(() => invoke($15, `load8_u`, [51938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3143
assert_return(() => invoke($15, `load8_u`, [52137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3144
assert_return(() => invoke($15, `load8_u`, [52336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3145
assert_return(() => invoke($15, `load8_u`, [52535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3146
assert_return(() => invoke($15, `load8_u`, [52734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3147
assert_return(() => invoke($15, `load8_u`, [52933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3148
assert_return(() => invoke($15, `load8_u`, [53132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3149
assert_return(() => invoke($15, `load8_u`, [53331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3150
assert_return(() => invoke($15, `load8_u`, [53530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3151
assert_return(() => invoke($15, `load8_u`, [53729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3152
assert_return(() => invoke($15, `load8_u`, [53928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3153
assert_return(() => invoke($15, `load8_u`, [54127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3154
assert_return(() => invoke($15, `load8_u`, [54326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3155
assert_return(() => invoke($15, `load8_u`, [54525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3156
assert_return(() => invoke($15, `load8_u`, [54724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3157
assert_return(() => invoke($15, `load8_u`, [54923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3158
assert_return(() => invoke($15, `load8_u`, [55122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3159
assert_return(() => invoke($15, `load8_u`, [55321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3160
assert_return(() => invoke($15, `load8_u`, [55520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3161
assert_return(() => invoke($15, `load8_u`, [55719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3162
assert_return(() => invoke($15, `load8_u`, [55918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3163
assert_return(() => invoke($15, `load8_u`, [56117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3164
assert_return(() => invoke($15, `load8_u`, [56316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3165
assert_return(() => invoke($15, `load8_u`, [56515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3166
assert_return(() => invoke($15, `load8_u`, [56714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3167
assert_return(() => invoke($15, `load8_u`, [56913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3168
assert_return(() => invoke($15, `load8_u`, [57112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3169
assert_return(() => invoke($15, `load8_u`, [57311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3170
assert_return(() => invoke($15, `load8_u`, [57510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3171
assert_return(() => invoke($15, `load8_u`, [57709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3172
assert_return(() => invoke($15, `load8_u`, [57908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3173
assert_return(() => invoke($15, `load8_u`, [58107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3174
assert_return(() => invoke($15, `load8_u`, [58306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3175
assert_return(() => invoke($15, `load8_u`, [58505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3176
assert_return(() => invoke($15, `load8_u`, [58704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3177
assert_return(() => invoke($15, `load8_u`, [58903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3178
assert_return(() => invoke($15, `load8_u`, [59102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3179
assert_return(() => invoke($15, `load8_u`, [59301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3180
assert_return(() => invoke($15, `load8_u`, [59500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3181
assert_return(() => invoke($15, `load8_u`, [59699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3182
assert_return(() => invoke($15, `load8_u`, [59898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3183
assert_return(() => invoke($15, `load8_u`, [60097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3184
assert_return(() => invoke($15, `load8_u`, [60296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3185
assert_return(() => invoke($15, `load8_u`, [60495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3186
assert_return(() => invoke($15, `load8_u`, [60694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3187
assert_return(() => invoke($15, `load8_u`, [60893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3188
assert_return(() => invoke($15, `load8_u`, [61092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3189
assert_return(() => invoke($15, `load8_u`, [61291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3190
assert_return(() => invoke($15, `load8_u`, [61490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3191
assert_return(() => invoke($15, `load8_u`, [61689]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3192
assert_return(() => invoke($15, `load8_u`, [61888]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3193
assert_return(() => invoke($15, `load8_u`, [62087]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3194
assert_return(() => invoke($15, `load8_u`, [62286]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3195
assert_return(() => invoke($15, `load8_u`, [62485]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3196
assert_return(() => invoke($15, `load8_u`, [62684]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3197
assert_return(() => invoke($15, `load8_u`, [62883]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3198
assert_return(() => invoke($15, `load8_u`, [63082]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3199
assert_return(() => invoke($15, `load8_u`, [63281]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3200
assert_return(() => invoke($15, `load8_u`, [63480]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3201
assert_return(() => invoke($15, `load8_u`, [63679]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3202
assert_return(() => invoke($15, `load8_u`, [63878]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3203
assert_return(() => invoke($15, `load8_u`, [64077]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3204
assert_return(() => invoke($15, `load8_u`, [64276]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3205
assert_return(() => invoke($15, `load8_u`, [64475]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3206
assert_return(() => invoke($15, `load8_u`, [64674]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3207
assert_return(() => invoke($15, `load8_u`, [64873]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3208
assert_return(() => invoke($15, `load8_u`, [65072]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3209
assert_return(() => invoke($15, `load8_u`, [65271]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3210
assert_return(() => invoke($15, `load8_u`, [65470]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3211
assert_return(() => invoke($15, `load8_u`, [65516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3212
assert_return(() => invoke($15, `load8_u`, [65517]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:3213
assert_return(() => invoke($15, `load8_u`, [65518]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:3214
assert_return(() => invoke($15, `load8_u`, [65519]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:3215
assert_return(() => invoke($15, `load8_u`, [65520]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:3216
assert_return(() => invoke($15, `load8_u`, [65521]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:3217
assert_return(() => invoke($15, `load8_u`, [65522]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:3218
assert_return(() => invoke($15, `load8_u`, [65523]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:3219
assert_return(() => invoke($15, `load8_u`, [65524]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:3220
assert_return(() => invoke($15, `load8_u`, [65525]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:3221
assert_return(() => invoke($15, `load8_u`, [65526]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:3222
assert_return(() => invoke($15, `load8_u`, [65527]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:3223
assert_return(() => invoke($15, `load8_u`, [65528]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:3224
assert_return(() => invoke($15, `load8_u`, [65529]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:3225
assert_return(() => invoke($15, `load8_u`, [65530]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:3226
assert_return(() => invoke($15, `load8_u`, [65531]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:3227
assert_return(() => invoke($15, `load8_u`, [65532]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:3228
assert_return(() => invoke($15, `load8_u`, [65533]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:3229
assert_return(() => invoke($15, `load8_u`, [65534]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:3230
assert_return(() => invoke($15, `load8_u`, [65535]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:3232
let $16 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 65516) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:3240
assert_trap(() => invoke($16, `run`, [65516, 65516, 40]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:3243
assert_return(() => invoke($16, `load8_u`, [198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3244
assert_return(() => invoke($16, `load8_u`, [397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3245
assert_return(() => invoke($16, `load8_u`, [596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3246
assert_return(() => invoke($16, `load8_u`, [795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3247
assert_return(() => invoke($16, `load8_u`, [994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3248
assert_return(() => invoke($16, `load8_u`, [1193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3249
assert_return(() => invoke($16, `load8_u`, [1392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3250
assert_return(() => invoke($16, `load8_u`, [1591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3251
assert_return(() => invoke($16, `load8_u`, [1790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3252
assert_return(() => invoke($16, `load8_u`, [1989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3253
assert_return(() => invoke($16, `load8_u`, [2188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3254
assert_return(() => invoke($16, `load8_u`, [2387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3255
assert_return(() => invoke($16, `load8_u`, [2586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3256
assert_return(() => invoke($16, `load8_u`, [2785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3257
assert_return(() => invoke($16, `load8_u`, [2984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3258
assert_return(() => invoke($16, `load8_u`, [3183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3259
assert_return(() => invoke($16, `load8_u`, [3382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3260
assert_return(() => invoke($16, `load8_u`, [3581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3261
assert_return(() => invoke($16, `load8_u`, [3780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3262
assert_return(() => invoke($16, `load8_u`, [3979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3263
assert_return(() => invoke($16, `load8_u`, [4178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3264
assert_return(() => invoke($16, `load8_u`, [4377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3265
assert_return(() => invoke($16, `load8_u`, [4576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3266
assert_return(() => invoke($16, `load8_u`, [4775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3267
assert_return(() => invoke($16, `load8_u`, [4974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3268
assert_return(() => invoke($16, `load8_u`, [5173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3269
assert_return(() => invoke($16, `load8_u`, [5372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3270
assert_return(() => invoke($16, `load8_u`, [5571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3271
assert_return(() => invoke($16, `load8_u`, [5770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3272
assert_return(() => invoke($16, `load8_u`, [5969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3273
assert_return(() => invoke($16, `load8_u`, [6168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3274
assert_return(() => invoke($16, `load8_u`, [6367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3275
assert_return(() => invoke($16, `load8_u`, [6566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3276
assert_return(() => invoke($16, `load8_u`, [6765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3277
assert_return(() => invoke($16, `load8_u`, [6964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3278
assert_return(() => invoke($16, `load8_u`, [7163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3279
assert_return(() => invoke($16, `load8_u`, [7362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3280
assert_return(() => invoke($16, `load8_u`, [7561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3281
assert_return(() => invoke($16, `load8_u`, [7760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3282
assert_return(() => invoke($16, `load8_u`, [7959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3283
assert_return(() => invoke($16, `load8_u`, [8158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3284
assert_return(() => invoke($16, `load8_u`, [8357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3285
assert_return(() => invoke($16, `load8_u`, [8556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3286
assert_return(() => invoke($16, `load8_u`, [8755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3287
assert_return(() => invoke($16, `load8_u`, [8954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3288
assert_return(() => invoke($16, `load8_u`, [9153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3289
assert_return(() => invoke($16, `load8_u`, [9352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3290
assert_return(() => invoke($16, `load8_u`, [9551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3291
assert_return(() => invoke($16, `load8_u`, [9750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3292
assert_return(() => invoke($16, `load8_u`, [9949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3293
assert_return(() => invoke($16, `load8_u`, [10148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3294
assert_return(() => invoke($16, `load8_u`, [10347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3295
assert_return(() => invoke($16, `load8_u`, [10546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3296
assert_return(() => invoke($16, `load8_u`, [10745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3297
assert_return(() => invoke($16, `load8_u`, [10944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3298
assert_return(() => invoke($16, `load8_u`, [11143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3299
assert_return(() => invoke($16, `load8_u`, [11342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3300
assert_return(() => invoke($16, `load8_u`, [11541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3301
assert_return(() => invoke($16, `load8_u`, [11740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3302
assert_return(() => invoke($16, `load8_u`, [11939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3303
assert_return(() => invoke($16, `load8_u`, [12138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3304
assert_return(() => invoke($16, `load8_u`, [12337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3305
assert_return(() => invoke($16, `load8_u`, [12536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3306
assert_return(() => invoke($16, `load8_u`, [12735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3307
assert_return(() => invoke($16, `load8_u`, [12934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3308
assert_return(() => invoke($16, `load8_u`, [13133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3309
assert_return(() => invoke($16, `load8_u`, [13332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3310
assert_return(() => invoke($16, `load8_u`, [13531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3311
assert_return(() => invoke($16, `load8_u`, [13730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3312
assert_return(() => invoke($16, `load8_u`, [13929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3313
assert_return(() => invoke($16, `load8_u`, [14128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3314
assert_return(() => invoke($16, `load8_u`, [14327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3315
assert_return(() => invoke($16, `load8_u`, [14526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3316
assert_return(() => invoke($16, `load8_u`, [14725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3317
assert_return(() => invoke($16, `load8_u`, [14924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3318
assert_return(() => invoke($16, `load8_u`, [15123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3319
assert_return(() => invoke($16, `load8_u`, [15322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3320
assert_return(() => invoke($16, `load8_u`, [15521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3321
assert_return(() => invoke($16, `load8_u`, [15720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3322
assert_return(() => invoke($16, `load8_u`, [15919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3323
assert_return(() => invoke($16, `load8_u`, [16118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3324
assert_return(() => invoke($16, `load8_u`, [16317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3325
assert_return(() => invoke($16, `load8_u`, [16516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3326
assert_return(() => invoke($16, `load8_u`, [16715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3327
assert_return(() => invoke($16, `load8_u`, [16914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3328
assert_return(() => invoke($16, `load8_u`, [17113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3329
assert_return(() => invoke($16, `load8_u`, [17312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3330
assert_return(() => invoke($16, `load8_u`, [17511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3331
assert_return(() => invoke($16, `load8_u`, [17710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3332
assert_return(() => invoke($16, `load8_u`, [17909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3333
assert_return(() => invoke($16, `load8_u`, [18108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3334
assert_return(() => invoke($16, `load8_u`, [18307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3335
assert_return(() => invoke($16, `load8_u`, [18506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3336
assert_return(() => invoke($16, `load8_u`, [18705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3337
assert_return(() => invoke($16, `load8_u`, [18904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3338
assert_return(() => invoke($16, `load8_u`, [19103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3339
assert_return(() => invoke($16, `load8_u`, [19302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3340
assert_return(() => invoke($16, `load8_u`, [19501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3341
assert_return(() => invoke($16, `load8_u`, [19700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3342
assert_return(() => invoke($16, `load8_u`, [19899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3343
assert_return(() => invoke($16, `load8_u`, [20098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3344
assert_return(() => invoke($16, `load8_u`, [20297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3345
assert_return(() => invoke($16, `load8_u`, [20496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3346
assert_return(() => invoke($16, `load8_u`, [20695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3347
assert_return(() => invoke($16, `load8_u`, [20894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3348
assert_return(() => invoke($16, `load8_u`, [21093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3349
assert_return(() => invoke($16, `load8_u`, [21292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3350
assert_return(() => invoke($16, `load8_u`, [21491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3351
assert_return(() => invoke($16, `load8_u`, [21690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3352
assert_return(() => invoke($16, `load8_u`, [21889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3353
assert_return(() => invoke($16, `load8_u`, [22088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3354
assert_return(() => invoke($16, `load8_u`, [22287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3355
assert_return(() => invoke($16, `load8_u`, [22486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3356
assert_return(() => invoke($16, `load8_u`, [22685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3357
assert_return(() => invoke($16, `load8_u`, [22884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3358
assert_return(() => invoke($16, `load8_u`, [23083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3359
assert_return(() => invoke($16, `load8_u`, [23282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3360
assert_return(() => invoke($16, `load8_u`, [23481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3361
assert_return(() => invoke($16, `load8_u`, [23680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3362
assert_return(() => invoke($16, `load8_u`, [23879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3363
assert_return(() => invoke($16, `load8_u`, [24078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3364
assert_return(() => invoke($16, `load8_u`, [24277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3365
assert_return(() => invoke($16, `load8_u`, [24476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3366
assert_return(() => invoke($16, `load8_u`, [24675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3367
assert_return(() => invoke($16, `load8_u`, [24874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3368
assert_return(() => invoke($16, `load8_u`, [25073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3369
assert_return(() => invoke($16, `load8_u`, [25272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3370
assert_return(() => invoke($16, `load8_u`, [25471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3371
assert_return(() => invoke($16, `load8_u`, [25670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3372
assert_return(() => invoke($16, `load8_u`, [25869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3373
assert_return(() => invoke($16, `load8_u`, [26068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3374
assert_return(() => invoke($16, `load8_u`, [26267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3375
assert_return(() => invoke($16, `load8_u`, [26466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3376
assert_return(() => invoke($16, `load8_u`, [26665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3377
assert_return(() => invoke($16, `load8_u`, [26864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3378
assert_return(() => invoke($16, `load8_u`, [27063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3379
assert_return(() => invoke($16, `load8_u`, [27262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3380
assert_return(() => invoke($16, `load8_u`, [27461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3381
assert_return(() => invoke($16, `load8_u`, [27660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3382
assert_return(() => invoke($16, `load8_u`, [27859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3383
assert_return(() => invoke($16, `load8_u`, [28058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3384
assert_return(() => invoke($16, `load8_u`, [28257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3385
assert_return(() => invoke($16, `load8_u`, [28456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3386
assert_return(() => invoke($16, `load8_u`, [28655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3387
assert_return(() => invoke($16, `load8_u`, [28854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3388
assert_return(() => invoke($16, `load8_u`, [29053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3389
assert_return(() => invoke($16, `load8_u`, [29252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3390
assert_return(() => invoke($16, `load8_u`, [29451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3391
assert_return(() => invoke($16, `load8_u`, [29650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3392
assert_return(() => invoke($16, `load8_u`, [29849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3393
assert_return(() => invoke($16, `load8_u`, [30048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3394
assert_return(() => invoke($16, `load8_u`, [30247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3395
assert_return(() => invoke($16, `load8_u`, [30446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3396
assert_return(() => invoke($16, `load8_u`, [30645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3397
assert_return(() => invoke($16, `load8_u`, [30844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3398
assert_return(() => invoke($16, `load8_u`, [31043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3399
assert_return(() => invoke($16, `load8_u`, [31242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3400
assert_return(() => invoke($16, `load8_u`, [31441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3401
assert_return(() => invoke($16, `load8_u`, [31640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3402
assert_return(() => invoke($16, `load8_u`, [31839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3403
assert_return(() => invoke($16, `load8_u`, [32038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3404
assert_return(() => invoke($16, `load8_u`, [32237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3405
assert_return(() => invoke($16, `load8_u`, [32436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3406
assert_return(() => invoke($16, `load8_u`, [32635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3407
assert_return(() => invoke($16, `load8_u`, [32834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3408
assert_return(() => invoke($16, `load8_u`, [33033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3409
assert_return(() => invoke($16, `load8_u`, [33232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3410
assert_return(() => invoke($16, `load8_u`, [33431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3411
assert_return(() => invoke($16, `load8_u`, [33630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3412
assert_return(() => invoke($16, `load8_u`, [33829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3413
assert_return(() => invoke($16, `load8_u`, [34028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3414
assert_return(() => invoke($16, `load8_u`, [34227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3415
assert_return(() => invoke($16, `load8_u`, [34426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3416
assert_return(() => invoke($16, `load8_u`, [34625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3417
assert_return(() => invoke($16, `load8_u`, [34824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3418
assert_return(() => invoke($16, `load8_u`, [35023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3419
assert_return(() => invoke($16, `load8_u`, [35222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3420
assert_return(() => invoke($16, `load8_u`, [35421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3421
assert_return(() => invoke($16, `load8_u`, [35620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3422
assert_return(() => invoke($16, `load8_u`, [35819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3423
assert_return(() => invoke($16, `load8_u`, [36018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3424
assert_return(() => invoke($16, `load8_u`, [36217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3425
assert_return(() => invoke($16, `load8_u`, [36416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3426
assert_return(() => invoke($16, `load8_u`, [36615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3427
assert_return(() => invoke($16, `load8_u`, [36814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3428
assert_return(() => invoke($16, `load8_u`, [37013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3429
assert_return(() => invoke($16, `load8_u`, [37212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3430
assert_return(() => invoke($16, `load8_u`, [37411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3431
assert_return(() => invoke($16, `load8_u`, [37610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3432
assert_return(() => invoke($16, `load8_u`, [37809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3433
assert_return(() => invoke($16, `load8_u`, [38008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3434
assert_return(() => invoke($16, `load8_u`, [38207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3435
assert_return(() => invoke($16, `load8_u`, [38406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3436
assert_return(() => invoke($16, `load8_u`, [38605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3437
assert_return(() => invoke($16, `load8_u`, [38804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3438
assert_return(() => invoke($16, `load8_u`, [39003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3439
assert_return(() => invoke($16, `load8_u`, [39202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3440
assert_return(() => invoke($16, `load8_u`, [39401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3441
assert_return(() => invoke($16, `load8_u`, [39600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3442
assert_return(() => invoke($16, `load8_u`, [39799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3443
assert_return(() => invoke($16, `load8_u`, [39998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3444
assert_return(() => invoke($16, `load8_u`, [40197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3445
assert_return(() => invoke($16, `load8_u`, [40396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3446
assert_return(() => invoke($16, `load8_u`, [40595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3447
assert_return(() => invoke($16, `load8_u`, [40794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3448
assert_return(() => invoke($16, `load8_u`, [40993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3449
assert_return(() => invoke($16, `load8_u`, [41192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3450
assert_return(() => invoke($16, `load8_u`, [41391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3451
assert_return(() => invoke($16, `load8_u`, [41590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3452
assert_return(() => invoke($16, `load8_u`, [41789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3453
assert_return(() => invoke($16, `load8_u`, [41988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3454
assert_return(() => invoke($16, `load8_u`, [42187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3455
assert_return(() => invoke($16, `load8_u`, [42386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3456
assert_return(() => invoke($16, `load8_u`, [42585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3457
assert_return(() => invoke($16, `load8_u`, [42784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3458
assert_return(() => invoke($16, `load8_u`, [42983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3459
assert_return(() => invoke($16, `load8_u`, [43182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3460
assert_return(() => invoke($16, `load8_u`, [43381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3461
assert_return(() => invoke($16, `load8_u`, [43580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3462
assert_return(() => invoke($16, `load8_u`, [43779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3463
assert_return(() => invoke($16, `load8_u`, [43978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3464
assert_return(() => invoke($16, `load8_u`, [44177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3465
assert_return(() => invoke($16, `load8_u`, [44376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3466
assert_return(() => invoke($16, `load8_u`, [44575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3467
assert_return(() => invoke($16, `load8_u`, [44774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3468
assert_return(() => invoke($16, `load8_u`, [44973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3469
assert_return(() => invoke($16, `load8_u`, [45172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3470
assert_return(() => invoke($16, `load8_u`, [45371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3471
assert_return(() => invoke($16, `load8_u`, [45570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3472
assert_return(() => invoke($16, `load8_u`, [45769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3473
assert_return(() => invoke($16, `load8_u`, [45968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3474
assert_return(() => invoke($16, `load8_u`, [46167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3475
assert_return(() => invoke($16, `load8_u`, [46366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3476
assert_return(() => invoke($16, `load8_u`, [46565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3477
assert_return(() => invoke($16, `load8_u`, [46764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3478
assert_return(() => invoke($16, `load8_u`, [46963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3479
assert_return(() => invoke($16, `load8_u`, [47162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3480
assert_return(() => invoke($16, `load8_u`, [47361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3481
assert_return(() => invoke($16, `load8_u`, [47560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3482
assert_return(() => invoke($16, `load8_u`, [47759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3483
assert_return(() => invoke($16, `load8_u`, [47958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3484
assert_return(() => invoke($16, `load8_u`, [48157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3485
assert_return(() => invoke($16, `load8_u`, [48356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3486
assert_return(() => invoke($16, `load8_u`, [48555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3487
assert_return(() => invoke($16, `load8_u`, [48754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3488
assert_return(() => invoke($16, `load8_u`, [48953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3489
assert_return(() => invoke($16, `load8_u`, [49152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3490
assert_return(() => invoke($16, `load8_u`, [49351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3491
assert_return(() => invoke($16, `load8_u`, [49550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3492
assert_return(() => invoke($16, `load8_u`, [49749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3493
assert_return(() => invoke($16, `load8_u`, [49948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3494
assert_return(() => invoke($16, `load8_u`, [50147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3495
assert_return(() => invoke($16, `load8_u`, [50346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3496
assert_return(() => invoke($16, `load8_u`, [50545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3497
assert_return(() => invoke($16, `load8_u`, [50744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3498
assert_return(() => invoke($16, `load8_u`, [50943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3499
assert_return(() => invoke($16, `load8_u`, [51142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3500
assert_return(() => invoke($16, `load8_u`, [51341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3501
assert_return(() => invoke($16, `load8_u`, [51540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3502
assert_return(() => invoke($16, `load8_u`, [51739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3503
assert_return(() => invoke($16, `load8_u`, [51938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3504
assert_return(() => invoke($16, `load8_u`, [52137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3505
assert_return(() => invoke($16, `load8_u`, [52336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3506
assert_return(() => invoke($16, `load8_u`, [52535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3507
assert_return(() => invoke($16, `load8_u`, [52734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3508
assert_return(() => invoke($16, `load8_u`, [52933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3509
assert_return(() => invoke($16, `load8_u`, [53132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3510
assert_return(() => invoke($16, `load8_u`, [53331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3511
assert_return(() => invoke($16, `load8_u`, [53530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3512
assert_return(() => invoke($16, `load8_u`, [53729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3513
assert_return(() => invoke($16, `load8_u`, [53928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3514
assert_return(() => invoke($16, `load8_u`, [54127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3515
assert_return(() => invoke($16, `load8_u`, [54326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3516
assert_return(() => invoke($16, `load8_u`, [54525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3517
assert_return(() => invoke($16, `load8_u`, [54724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3518
assert_return(() => invoke($16, `load8_u`, [54923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3519
assert_return(() => invoke($16, `load8_u`, [55122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3520
assert_return(() => invoke($16, `load8_u`, [55321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3521
assert_return(() => invoke($16, `load8_u`, [55520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3522
assert_return(() => invoke($16, `load8_u`, [55719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3523
assert_return(() => invoke($16, `load8_u`, [55918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3524
assert_return(() => invoke($16, `load8_u`, [56117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3525
assert_return(() => invoke($16, `load8_u`, [56316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3526
assert_return(() => invoke($16, `load8_u`, [56515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3527
assert_return(() => invoke($16, `load8_u`, [56714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3528
assert_return(() => invoke($16, `load8_u`, [56913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3529
assert_return(() => invoke($16, `load8_u`, [57112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3530
assert_return(() => invoke($16, `load8_u`, [57311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3531
assert_return(() => invoke($16, `load8_u`, [57510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3532
assert_return(() => invoke($16, `load8_u`, [57709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3533
assert_return(() => invoke($16, `load8_u`, [57908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3534
assert_return(() => invoke($16, `load8_u`, [58107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3535
assert_return(() => invoke($16, `load8_u`, [58306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3536
assert_return(() => invoke($16, `load8_u`, [58505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3537
assert_return(() => invoke($16, `load8_u`, [58704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3538
assert_return(() => invoke($16, `load8_u`, [58903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3539
assert_return(() => invoke($16, `load8_u`, [59102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3540
assert_return(() => invoke($16, `load8_u`, [59301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3541
assert_return(() => invoke($16, `load8_u`, [59500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3542
assert_return(() => invoke($16, `load8_u`, [59699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3543
assert_return(() => invoke($16, `load8_u`, [59898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3544
assert_return(() => invoke($16, `load8_u`, [60097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3545
assert_return(() => invoke($16, `load8_u`, [60296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3546
assert_return(() => invoke($16, `load8_u`, [60495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3547
assert_return(() => invoke($16, `load8_u`, [60694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3548
assert_return(() => invoke($16, `load8_u`, [60893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3549
assert_return(() => invoke($16, `load8_u`, [61092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3550
assert_return(() => invoke($16, `load8_u`, [61291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3551
assert_return(() => invoke($16, `load8_u`, [61490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3552
assert_return(() => invoke($16, `load8_u`, [61689]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3553
assert_return(() => invoke($16, `load8_u`, [61888]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3554
assert_return(() => invoke($16, `load8_u`, [62087]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3555
assert_return(() => invoke($16, `load8_u`, [62286]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3556
assert_return(() => invoke($16, `load8_u`, [62485]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3557
assert_return(() => invoke($16, `load8_u`, [62684]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3558
assert_return(() => invoke($16, `load8_u`, [62883]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3559
assert_return(() => invoke($16, `load8_u`, [63082]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3560
assert_return(() => invoke($16, `load8_u`, [63281]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3561
assert_return(() => invoke($16, `load8_u`, [63480]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3562
assert_return(() => invoke($16, `load8_u`, [63679]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3563
assert_return(() => invoke($16, `load8_u`, [63878]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3564
assert_return(() => invoke($16, `load8_u`, [64077]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3565
assert_return(() => invoke($16, `load8_u`, [64276]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3566
assert_return(() => invoke($16, `load8_u`, [64475]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3567
assert_return(() => invoke($16, `load8_u`, [64674]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3568
assert_return(() => invoke($16, `load8_u`, [64873]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3569
assert_return(() => invoke($16, `load8_u`, [65072]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3570
assert_return(() => invoke($16, `load8_u`, [65271]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3571
assert_return(() => invoke($16, `load8_u`, [65470]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3572
assert_return(() => invoke($16, `load8_u`, [65516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3573
assert_return(() => invoke($16, `load8_u`, [65517]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:3574
assert_return(() => invoke($16, `load8_u`, [65518]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:3575
assert_return(() => invoke($16, `load8_u`, [65519]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:3576
assert_return(() => invoke($16, `load8_u`, [65520]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:3577
assert_return(() => invoke($16, `load8_u`, [65521]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:3578
assert_return(() => invoke($16, `load8_u`, [65522]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:3579
assert_return(() => invoke($16, `load8_u`, [65523]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:3580
assert_return(() => invoke($16, `load8_u`, [65524]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:3581
assert_return(() => invoke($16, `load8_u`, [65525]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:3582
assert_return(() => invoke($16, `load8_u`, [65526]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:3583
assert_return(() => invoke($16, `load8_u`, [65527]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:3584
assert_return(() => invoke($16, `load8_u`, [65528]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:3585
assert_return(() => invoke($16, `load8_u`, [65529]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:3586
assert_return(() => invoke($16, `load8_u`, [65530]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:3587
assert_return(() => invoke($16, `load8_u`, [65531]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:3588
assert_return(() => invoke($16, `load8_u`, [65532]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:3589
assert_return(() => invoke($16, `load8_u`, [65533]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:3590
assert_return(() => invoke($16, `load8_u`, [65534]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:3591
assert_return(() => invoke($16, `load8_u`, [65535]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:3593
let $17 = instantiate(`(module
  (memory (export "mem") 1  )
  (data (i32.const 65516) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:3601
assert_trap(() => invoke($17, `run`, [0, 65516, -4096]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:3604
assert_return(() => invoke($17, `load8_u`, [198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3605
assert_return(() => invoke($17, `load8_u`, [397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3606
assert_return(() => invoke($17, `load8_u`, [596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3607
assert_return(() => invoke($17, `load8_u`, [795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3608
assert_return(() => invoke($17, `load8_u`, [994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3609
assert_return(() => invoke($17, `load8_u`, [1193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3610
assert_return(() => invoke($17, `load8_u`, [1392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3611
assert_return(() => invoke($17, `load8_u`, [1591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3612
assert_return(() => invoke($17, `load8_u`, [1790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3613
assert_return(() => invoke($17, `load8_u`, [1989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3614
assert_return(() => invoke($17, `load8_u`, [2188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3615
assert_return(() => invoke($17, `load8_u`, [2387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3616
assert_return(() => invoke($17, `load8_u`, [2586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3617
assert_return(() => invoke($17, `load8_u`, [2785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3618
assert_return(() => invoke($17, `load8_u`, [2984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3619
assert_return(() => invoke($17, `load8_u`, [3183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3620
assert_return(() => invoke($17, `load8_u`, [3382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3621
assert_return(() => invoke($17, `load8_u`, [3581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3622
assert_return(() => invoke($17, `load8_u`, [3780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3623
assert_return(() => invoke($17, `load8_u`, [3979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3624
assert_return(() => invoke($17, `load8_u`, [4178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3625
assert_return(() => invoke($17, `load8_u`, [4377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3626
assert_return(() => invoke($17, `load8_u`, [4576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3627
assert_return(() => invoke($17, `load8_u`, [4775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3628
assert_return(() => invoke($17, `load8_u`, [4974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3629
assert_return(() => invoke($17, `load8_u`, [5173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3630
assert_return(() => invoke($17, `load8_u`, [5372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3631
assert_return(() => invoke($17, `load8_u`, [5571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3632
assert_return(() => invoke($17, `load8_u`, [5770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3633
assert_return(() => invoke($17, `load8_u`, [5969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3634
assert_return(() => invoke($17, `load8_u`, [6168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3635
assert_return(() => invoke($17, `load8_u`, [6367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3636
assert_return(() => invoke($17, `load8_u`, [6566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3637
assert_return(() => invoke($17, `load8_u`, [6765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3638
assert_return(() => invoke($17, `load8_u`, [6964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3639
assert_return(() => invoke($17, `load8_u`, [7163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3640
assert_return(() => invoke($17, `load8_u`, [7362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3641
assert_return(() => invoke($17, `load8_u`, [7561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3642
assert_return(() => invoke($17, `load8_u`, [7760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3643
assert_return(() => invoke($17, `load8_u`, [7959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3644
assert_return(() => invoke($17, `load8_u`, [8158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3645
assert_return(() => invoke($17, `load8_u`, [8357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3646
assert_return(() => invoke($17, `load8_u`, [8556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3647
assert_return(() => invoke($17, `load8_u`, [8755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3648
assert_return(() => invoke($17, `load8_u`, [8954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3649
assert_return(() => invoke($17, `load8_u`, [9153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3650
assert_return(() => invoke($17, `load8_u`, [9352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3651
assert_return(() => invoke($17, `load8_u`, [9551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3652
assert_return(() => invoke($17, `load8_u`, [9750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3653
assert_return(() => invoke($17, `load8_u`, [9949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3654
assert_return(() => invoke($17, `load8_u`, [10148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3655
assert_return(() => invoke($17, `load8_u`, [10347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3656
assert_return(() => invoke($17, `load8_u`, [10546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3657
assert_return(() => invoke($17, `load8_u`, [10745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3658
assert_return(() => invoke($17, `load8_u`, [10944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3659
assert_return(() => invoke($17, `load8_u`, [11143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3660
assert_return(() => invoke($17, `load8_u`, [11342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3661
assert_return(() => invoke($17, `load8_u`, [11541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3662
assert_return(() => invoke($17, `load8_u`, [11740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3663
assert_return(() => invoke($17, `load8_u`, [11939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3664
assert_return(() => invoke($17, `load8_u`, [12138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3665
assert_return(() => invoke($17, `load8_u`, [12337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3666
assert_return(() => invoke($17, `load8_u`, [12536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3667
assert_return(() => invoke($17, `load8_u`, [12735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3668
assert_return(() => invoke($17, `load8_u`, [12934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3669
assert_return(() => invoke($17, `load8_u`, [13133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3670
assert_return(() => invoke($17, `load8_u`, [13332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3671
assert_return(() => invoke($17, `load8_u`, [13531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3672
assert_return(() => invoke($17, `load8_u`, [13730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3673
assert_return(() => invoke($17, `load8_u`, [13929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3674
assert_return(() => invoke($17, `load8_u`, [14128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3675
assert_return(() => invoke($17, `load8_u`, [14327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3676
assert_return(() => invoke($17, `load8_u`, [14526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3677
assert_return(() => invoke($17, `load8_u`, [14725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3678
assert_return(() => invoke($17, `load8_u`, [14924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3679
assert_return(() => invoke($17, `load8_u`, [15123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3680
assert_return(() => invoke($17, `load8_u`, [15322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3681
assert_return(() => invoke($17, `load8_u`, [15521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3682
assert_return(() => invoke($17, `load8_u`, [15720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3683
assert_return(() => invoke($17, `load8_u`, [15919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3684
assert_return(() => invoke($17, `load8_u`, [16118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3685
assert_return(() => invoke($17, `load8_u`, [16317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3686
assert_return(() => invoke($17, `load8_u`, [16516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3687
assert_return(() => invoke($17, `load8_u`, [16715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3688
assert_return(() => invoke($17, `load8_u`, [16914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3689
assert_return(() => invoke($17, `load8_u`, [17113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3690
assert_return(() => invoke($17, `load8_u`, [17312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3691
assert_return(() => invoke($17, `load8_u`, [17511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3692
assert_return(() => invoke($17, `load8_u`, [17710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3693
assert_return(() => invoke($17, `load8_u`, [17909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3694
assert_return(() => invoke($17, `load8_u`, [18108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3695
assert_return(() => invoke($17, `load8_u`, [18307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3696
assert_return(() => invoke($17, `load8_u`, [18506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3697
assert_return(() => invoke($17, `load8_u`, [18705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3698
assert_return(() => invoke($17, `load8_u`, [18904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3699
assert_return(() => invoke($17, `load8_u`, [19103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3700
assert_return(() => invoke($17, `load8_u`, [19302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3701
assert_return(() => invoke($17, `load8_u`, [19501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3702
assert_return(() => invoke($17, `load8_u`, [19700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3703
assert_return(() => invoke($17, `load8_u`, [19899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3704
assert_return(() => invoke($17, `load8_u`, [20098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3705
assert_return(() => invoke($17, `load8_u`, [20297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3706
assert_return(() => invoke($17, `load8_u`, [20496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3707
assert_return(() => invoke($17, `load8_u`, [20695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3708
assert_return(() => invoke($17, `load8_u`, [20894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3709
assert_return(() => invoke($17, `load8_u`, [21093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3710
assert_return(() => invoke($17, `load8_u`, [21292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3711
assert_return(() => invoke($17, `load8_u`, [21491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3712
assert_return(() => invoke($17, `load8_u`, [21690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3713
assert_return(() => invoke($17, `load8_u`, [21889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3714
assert_return(() => invoke($17, `load8_u`, [22088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3715
assert_return(() => invoke($17, `load8_u`, [22287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3716
assert_return(() => invoke($17, `load8_u`, [22486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3717
assert_return(() => invoke($17, `load8_u`, [22685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3718
assert_return(() => invoke($17, `load8_u`, [22884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3719
assert_return(() => invoke($17, `load8_u`, [23083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3720
assert_return(() => invoke($17, `load8_u`, [23282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3721
assert_return(() => invoke($17, `load8_u`, [23481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3722
assert_return(() => invoke($17, `load8_u`, [23680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3723
assert_return(() => invoke($17, `load8_u`, [23879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3724
assert_return(() => invoke($17, `load8_u`, [24078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3725
assert_return(() => invoke($17, `load8_u`, [24277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3726
assert_return(() => invoke($17, `load8_u`, [24476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3727
assert_return(() => invoke($17, `load8_u`, [24675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3728
assert_return(() => invoke($17, `load8_u`, [24874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3729
assert_return(() => invoke($17, `load8_u`, [25073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3730
assert_return(() => invoke($17, `load8_u`, [25272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3731
assert_return(() => invoke($17, `load8_u`, [25471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3732
assert_return(() => invoke($17, `load8_u`, [25670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3733
assert_return(() => invoke($17, `load8_u`, [25869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3734
assert_return(() => invoke($17, `load8_u`, [26068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3735
assert_return(() => invoke($17, `load8_u`, [26267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3736
assert_return(() => invoke($17, `load8_u`, [26466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3737
assert_return(() => invoke($17, `load8_u`, [26665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3738
assert_return(() => invoke($17, `load8_u`, [26864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3739
assert_return(() => invoke($17, `load8_u`, [27063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3740
assert_return(() => invoke($17, `load8_u`, [27262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3741
assert_return(() => invoke($17, `load8_u`, [27461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3742
assert_return(() => invoke($17, `load8_u`, [27660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3743
assert_return(() => invoke($17, `load8_u`, [27859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3744
assert_return(() => invoke($17, `load8_u`, [28058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3745
assert_return(() => invoke($17, `load8_u`, [28257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3746
assert_return(() => invoke($17, `load8_u`, [28456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3747
assert_return(() => invoke($17, `load8_u`, [28655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3748
assert_return(() => invoke($17, `load8_u`, [28854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3749
assert_return(() => invoke($17, `load8_u`, [29053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3750
assert_return(() => invoke($17, `load8_u`, [29252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3751
assert_return(() => invoke($17, `load8_u`, [29451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3752
assert_return(() => invoke($17, `load8_u`, [29650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3753
assert_return(() => invoke($17, `load8_u`, [29849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3754
assert_return(() => invoke($17, `load8_u`, [30048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3755
assert_return(() => invoke($17, `load8_u`, [30247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3756
assert_return(() => invoke($17, `load8_u`, [30446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3757
assert_return(() => invoke($17, `load8_u`, [30645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3758
assert_return(() => invoke($17, `load8_u`, [30844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3759
assert_return(() => invoke($17, `load8_u`, [31043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3760
assert_return(() => invoke($17, `load8_u`, [31242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3761
assert_return(() => invoke($17, `load8_u`, [31441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3762
assert_return(() => invoke($17, `load8_u`, [31640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3763
assert_return(() => invoke($17, `load8_u`, [31839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3764
assert_return(() => invoke($17, `load8_u`, [32038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3765
assert_return(() => invoke($17, `load8_u`, [32237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3766
assert_return(() => invoke($17, `load8_u`, [32436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3767
assert_return(() => invoke($17, `load8_u`, [32635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3768
assert_return(() => invoke($17, `load8_u`, [32834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3769
assert_return(() => invoke($17, `load8_u`, [33033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3770
assert_return(() => invoke($17, `load8_u`, [33232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3771
assert_return(() => invoke($17, `load8_u`, [33431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3772
assert_return(() => invoke($17, `load8_u`, [33630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3773
assert_return(() => invoke($17, `load8_u`, [33829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3774
assert_return(() => invoke($17, `load8_u`, [34028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3775
assert_return(() => invoke($17, `load8_u`, [34227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3776
assert_return(() => invoke($17, `load8_u`, [34426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3777
assert_return(() => invoke($17, `load8_u`, [34625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3778
assert_return(() => invoke($17, `load8_u`, [34824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3779
assert_return(() => invoke($17, `load8_u`, [35023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3780
assert_return(() => invoke($17, `load8_u`, [35222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3781
assert_return(() => invoke($17, `load8_u`, [35421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3782
assert_return(() => invoke($17, `load8_u`, [35620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3783
assert_return(() => invoke($17, `load8_u`, [35819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3784
assert_return(() => invoke($17, `load8_u`, [36018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3785
assert_return(() => invoke($17, `load8_u`, [36217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3786
assert_return(() => invoke($17, `load8_u`, [36416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3787
assert_return(() => invoke($17, `load8_u`, [36615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3788
assert_return(() => invoke($17, `load8_u`, [36814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3789
assert_return(() => invoke($17, `load8_u`, [37013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3790
assert_return(() => invoke($17, `load8_u`, [37212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3791
assert_return(() => invoke($17, `load8_u`, [37411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3792
assert_return(() => invoke($17, `load8_u`, [37610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3793
assert_return(() => invoke($17, `load8_u`, [37809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3794
assert_return(() => invoke($17, `load8_u`, [38008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3795
assert_return(() => invoke($17, `load8_u`, [38207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3796
assert_return(() => invoke($17, `load8_u`, [38406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3797
assert_return(() => invoke($17, `load8_u`, [38605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3798
assert_return(() => invoke($17, `load8_u`, [38804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3799
assert_return(() => invoke($17, `load8_u`, [39003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3800
assert_return(() => invoke($17, `load8_u`, [39202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3801
assert_return(() => invoke($17, `load8_u`, [39401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3802
assert_return(() => invoke($17, `load8_u`, [39600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3803
assert_return(() => invoke($17, `load8_u`, [39799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3804
assert_return(() => invoke($17, `load8_u`, [39998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3805
assert_return(() => invoke($17, `load8_u`, [40197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3806
assert_return(() => invoke($17, `load8_u`, [40396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3807
assert_return(() => invoke($17, `load8_u`, [40595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3808
assert_return(() => invoke($17, `load8_u`, [40794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3809
assert_return(() => invoke($17, `load8_u`, [40993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3810
assert_return(() => invoke($17, `load8_u`, [41192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3811
assert_return(() => invoke($17, `load8_u`, [41391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3812
assert_return(() => invoke($17, `load8_u`, [41590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3813
assert_return(() => invoke($17, `load8_u`, [41789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3814
assert_return(() => invoke($17, `load8_u`, [41988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3815
assert_return(() => invoke($17, `load8_u`, [42187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3816
assert_return(() => invoke($17, `load8_u`, [42386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3817
assert_return(() => invoke($17, `load8_u`, [42585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3818
assert_return(() => invoke($17, `load8_u`, [42784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3819
assert_return(() => invoke($17, `load8_u`, [42983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3820
assert_return(() => invoke($17, `load8_u`, [43182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3821
assert_return(() => invoke($17, `load8_u`, [43381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3822
assert_return(() => invoke($17, `load8_u`, [43580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3823
assert_return(() => invoke($17, `load8_u`, [43779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3824
assert_return(() => invoke($17, `load8_u`, [43978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3825
assert_return(() => invoke($17, `load8_u`, [44177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3826
assert_return(() => invoke($17, `load8_u`, [44376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3827
assert_return(() => invoke($17, `load8_u`, [44575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3828
assert_return(() => invoke($17, `load8_u`, [44774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3829
assert_return(() => invoke($17, `load8_u`, [44973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3830
assert_return(() => invoke($17, `load8_u`, [45172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3831
assert_return(() => invoke($17, `load8_u`, [45371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3832
assert_return(() => invoke($17, `load8_u`, [45570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3833
assert_return(() => invoke($17, `load8_u`, [45769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3834
assert_return(() => invoke($17, `load8_u`, [45968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3835
assert_return(() => invoke($17, `load8_u`, [46167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3836
assert_return(() => invoke($17, `load8_u`, [46366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3837
assert_return(() => invoke($17, `load8_u`, [46565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3838
assert_return(() => invoke($17, `load8_u`, [46764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3839
assert_return(() => invoke($17, `load8_u`, [46963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3840
assert_return(() => invoke($17, `load8_u`, [47162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3841
assert_return(() => invoke($17, `load8_u`, [47361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3842
assert_return(() => invoke($17, `load8_u`, [47560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3843
assert_return(() => invoke($17, `load8_u`, [47759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3844
assert_return(() => invoke($17, `load8_u`, [47958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3845
assert_return(() => invoke($17, `load8_u`, [48157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3846
assert_return(() => invoke($17, `load8_u`, [48356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3847
assert_return(() => invoke($17, `load8_u`, [48555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3848
assert_return(() => invoke($17, `load8_u`, [48754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3849
assert_return(() => invoke($17, `load8_u`, [48953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3850
assert_return(() => invoke($17, `load8_u`, [49152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3851
assert_return(() => invoke($17, `load8_u`, [49351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3852
assert_return(() => invoke($17, `load8_u`, [49550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3853
assert_return(() => invoke($17, `load8_u`, [49749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3854
assert_return(() => invoke($17, `load8_u`, [49948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3855
assert_return(() => invoke($17, `load8_u`, [50147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3856
assert_return(() => invoke($17, `load8_u`, [50346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3857
assert_return(() => invoke($17, `load8_u`, [50545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3858
assert_return(() => invoke($17, `load8_u`, [50744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3859
assert_return(() => invoke($17, `load8_u`, [50943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3860
assert_return(() => invoke($17, `load8_u`, [51142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3861
assert_return(() => invoke($17, `load8_u`, [51341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3862
assert_return(() => invoke($17, `load8_u`, [51540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3863
assert_return(() => invoke($17, `load8_u`, [51739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3864
assert_return(() => invoke($17, `load8_u`, [51938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3865
assert_return(() => invoke($17, `load8_u`, [52137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3866
assert_return(() => invoke($17, `load8_u`, [52336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3867
assert_return(() => invoke($17, `load8_u`, [52535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3868
assert_return(() => invoke($17, `load8_u`, [52734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3869
assert_return(() => invoke($17, `load8_u`, [52933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3870
assert_return(() => invoke($17, `load8_u`, [53132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3871
assert_return(() => invoke($17, `load8_u`, [53331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3872
assert_return(() => invoke($17, `load8_u`, [53530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3873
assert_return(() => invoke($17, `load8_u`, [53729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3874
assert_return(() => invoke($17, `load8_u`, [53928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3875
assert_return(() => invoke($17, `load8_u`, [54127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3876
assert_return(() => invoke($17, `load8_u`, [54326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3877
assert_return(() => invoke($17, `load8_u`, [54525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3878
assert_return(() => invoke($17, `load8_u`, [54724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3879
assert_return(() => invoke($17, `load8_u`, [54923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3880
assert_return(() => invoke($17, `load8_u`, [55122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3881
assert_return(() => invoke($17, `load8_u`, [55321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3882
assert_return(() => invoke($17, `load8_u`, [55520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3883
assert_return(() => invoke($17, `load8_u`, [55719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3884
assert_return(() => invoke($17, `load8_u`, [55918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3885
assert_return(() => invoke($17, `load8_u`, [56117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3886
assert_return(() => invoke($17, `load8_u`, [56316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3887
assert_return(() => invoke($17, `load8_u`, [56515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3888
assert_return(() => invoke($17, `load8_u`, [56714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3889
assert_return(() => invoke($17, `load8_u`, [56913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3890
assert_return(() => invoke($17, `load8_u`, [57112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3891
assert_return(() => invoke($17, `load8_u`, [57311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3892
assert_return(() => invoke($17, `load8_u`, [57510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3893
assert_return(() => invoke($17, `load8_u`, [57709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3894
assert_return(() => invoke($17, `load8_u`, [57908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3895
assert_return(() => invoke($17, `load8_u`, [58107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3896
assert_return(() => invoke($17, `load8_u`, [58306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3897
assert_return(() => invoke($17, `load8_u`, [58505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3898
assert_return(() => invoke($17, `load8_u`, [58704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3899
assert_return(() => invoke($17, `load8_u`, [58903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3900
assert_return(() => invoke($17, `load8_u`, [59102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3901
assert_return(() => invoke($17, `load8_u`, [59301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3902
assert_return(() => invoke($17, `load8_u`, [59500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3903
assert_return(() => invoke($17, `load8_u`, [59699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3904
assert_return(() => invoke($17, `load8_u`, [59898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3905
assert_return(() => invoke($17, `load8_u`, [60097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3906
assert_return(() => invoke($17, `load8_u`, [60296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3907
assert_return(() => invoke($17, `load8_u`, [60495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3908
assert_return(() => invoke($17, `load8_u`, [60694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3909
assert_return(() => invoke($17, `load8_u`, [60893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3910
assert_return(() => invoke($17, `load8_u`, [61092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3911
assert_return(() => invoke($17, `load8_u`, [61291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3912
assert_return(() => invoke($17, `load8_u`, [61490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3913
assert_return(() => invoke($17, `load8_u`, [61689]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3914
assert_return(() => invoke($17, `load8_u`, [61888]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3915
assert_return(() => invoke($17, `load8_u`, [62087]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3916
assert_return(() => invoke($17, `load8_u`, [62286]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3917
assert_return(() => invoke($17, `load8_u`, [62485]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3918
assert_return(() => invoke($17, `load8_u`, [62684]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3919
assert_return(() => invoke($17, `load8_u`, [62883]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3920
assert_return(() => invoke($17, `load8_u`, [63082]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3921
assert_return(() => invoke($17, `load8_u`, [63281]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3922
assert_return(() => invoke($17, `load8_u`, [63480]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3923
assert_return(() => invoke($17, `load8_u`, [63679]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3924
assert_return(() => invoke($17, `load8_u`, [63878]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3925
assert_return(() => invoke($17, `load8_u`, [64077]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3926
assert_return(() => invoke($17, `load8_u`, [64276]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3927
assert_return(() => invoke($17, `load8_u`, [64475]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3928
assert_return(() => invoke($17, `load8_u`, [64674]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3929
assert_return(() => invoke($17, `load8_u`, [64873]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3930
assert_return(() => invoke($17, `load8_u`, [65072]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3931
assert_return(() => invoke($17, `load8_u`, [65271]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3932
assert_return(() => invoke($17, `load8_u`, [65470]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3933
assert_return(() => invoke($17, `load8_u`, [65516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3934
assert_return(() => invoke($17, `load8_u`, [65517]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:3935
assert_return(() => invoke($17, `load8_u`, [65518]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:3936
assert_return(() => invoke($17, `load8_u`, [65519]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:3937
assert_return(() => invoke($17, `load8_u`, [65520]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:3938
assert_return(() => invoke($17, `load8_u`, [65521]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:3939
assert_return(() => invoke($17, `load8_u`, [65522]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:3940
assert_return(() => invoke($17, `load8_u`, [65523]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:3941
assert_return(() => invoke($17, `load8_u`, [65524]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:3942
assert_return(() => invoke($17, `load8_u`, [65525]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:3943
assert_return(() => invoke($17, `load8_u`, [65526]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:3944
assert_return(() => invoke($17, `load8_u`, [65527]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:3945
assert_return(() => invoke($17, `load8_u`, [65528]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:3946
assert_return(() => invoke($17, `load8_u`, [65529]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:3947
assert_return(() => invoke($17, `load8_u`, [65530]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:3948
assert_return(() => invoke($17, `load8_u`, [65531]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:3949
assert_return(() => invoke($17, `load8_u`, [65532]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:3950
assert_return(() => invoke($17, `load8_u`, [65533]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:3951
assert_return(() => invoke($17, `load8_u`, [65534]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:3952
assert_return(() => invoke($17, `load8_u`, [65535]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:3954
let $18 = instantiate(`(module
  (memory (export "mem") 1 1 )
  (data (i32.const 61440) "\\00\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13")
  (func (export "run") (param \$targetOffs i32) (param \$srcOffs i32) (param \$len i32)
    (memory.copy (local.get \$targetOffs) (local.get \$srcOffs) (local.get \$len)))
  (func (export "load8_u") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_copy64.wast:3962
assert_trap(() => invoke($18, `run`, [65516, 61440, -256]), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:3965
assert_return(() => invoke($18, `load8_u`, [198]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3966
assert_return(() => invoke($18, `load8_u`, [397]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3967
assert_return(() => invoke($18, `load8_u`, [596]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3968
assert_return(() => invoke($18, `load8_u`, [795]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3969
assert_return(() => invoke($18, `load8_u`, [994]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3970
assert_return(() => invoke($18, `load8_u`, [1193]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3971
assert_return(() => invoke($18, `load8_u`, [1392]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3972
assert_return(() => invoke($18, `load8_u`, [1591]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3973
assert_return(() => invoke($18, `load8_u`, [1790]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3974
assert_return(() => invoke($18, `load8_u`, [1989]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3975
assert_return(() => invoke($18, `load8_u`, [2188]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3976
assert_return(() => invoke($18, `load8_u`, [2387]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3977
assert_return(() => invoke($18, `load8_u`, [2586]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3978
assert_return(() => invoke($18, `load8_u`, [2785]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3979
assert_return(() => invoke($18, `load8_u`, [2984]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3980
assert_return(() => invoke($18, `load8_u`, [3183]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3981
assert_return(() => invoke($18, `load8_u`, [3382]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3982
assert_return(() => invoke($18, `load8_u`, [3581]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3983
assert_return(() => invoke($18, `load8_u`, [3780]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3984
assert_return(() => invoke($18, `load8_u`, [3979]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3985
assert_return(() => invoke($18, `load8_u`, [4178]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3986
assert_return(() => invoke($18, `load8_u`, [4377]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3987
assert_return(() => invoke($18, `load8_u`, [4576]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3988
assert_return(() => invoke($18, `load8_u`, [4775]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3989
assert_return(() => invoke($18, `load8_u`, [4974]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3990
assert_return(() => invoke($18, `load8_u`, [5173]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3991
assert_return(() => invoke($18, `load8_u`, [5372]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3992
assert_return(() => invoke($18, `load8_u`, [5571]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3993
assert_return(() => invoke($18, `load8_u`, [5770]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3994
assert_return(() => invoke($18, `load8_u`, [5969]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3995
assert_return(() => invoke($18, `load8_u`, [6168]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3996
assert_return(() => invoke($18, `load8_u`, [6367]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3997
assert_return(() => invoke($18, `load8_u`, [6566]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3998
assert_return(() => invoke($18, `load8_u`, [6765]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:3999
assert_return(() => invoke($18, `load8_u`, [6964]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4000
assert_return(() => invoke($18, `load8_u`, [7163]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4001
assert_return(() => invoke($18, `load8_u`, [7362]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4002
assert_return(() => invoke($18, `load8_u`, [7561]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4003
assert_return(() => invoke($18, `load8_u`, [7760]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4004
assert_return(() => invoke($18, `load8_u`, [7959]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4005
assert_return(() => invoke($18, `load8_u`, [8158]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4006
assert_return(() => invoke($18, `load8_u`, [8357]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4007
assert_return(() => invoke($18, `load8_u`, [8556]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4008
assert_return(() => invoke($18, `load8_u`, [8755]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4009
assert_return(() => invoke($18, `load8_u`, [8954]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4010
assert_return(() => invoke($18, `load8_u`, [9153]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4011
assert_return(() => invoke($18, `load8_u`, [9352]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4012
assert_return(() => invoke($18, `load8_u`, [9551]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4013
assert_return(() => invoke($18, `load8_u`, [9750]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4014
assert_return(() => invoke($18, `load8_u`, [9949]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4015
assert_return(() => invoke($18, `load8_u`, [10148]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4016
assert_return(() => invoke($18, `load8_u`, [10347]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4017
assert_return(() => invoke($18, `load8_u`, [10546]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4018
assert_return(() => invoke($18, `load8_u`, [10745]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4019
assert_return(() => invoke($18, `load8_u`, [10944]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4020
assert_return(() => invoke($18, `load8_u`, [11143]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4021
assert_return(() => invoke($18, `load8_u`, [11342]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4022
assert_return(() => invoke($18, `load8_u`, [11541]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4023
assert_return(() => invoke($18, `load8_u`, [11740]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4024
assert_return(() => invoke($18, `load8_u`, [11939]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4025
assert_return(() => invoke($18, `load8_u`, [12138]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4026
assert_return(() => invoke($18, `load8_u`, [12337]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4027
assert_return(() => invoke($18, `load8_u`, [12536]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4028
assert_return(() => invoke($18, `load8_u`, [12735]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4029
assert_return(() => invoke($18, `load8_u`, [12934]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4030
assert_return(() => invoke($18, `load8_u`, [13133]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4031
assert_return(() => invoke($18, `load8_u`, [13332]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4032
assert_return(() => invoke($18, `load8_u`, [13531]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4033
assert_return(() => invoke($18, `load8_u`, [13730]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4034
assert_return(() => invoke($18, `load8_u`, [13929]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4035
assert_return(() => invoke($18, `load8_u`, [14128]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4036
assert_return(() => invoke($18, `load8_u`, [14327]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4037
assert_return(() => invoke($18, `load8_u`, [14526]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4038
assert_return(() => invoke($18, `load8_u`, [14725]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4039
assert_return(() => invoke($18, `load8_u`, [14924]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4040
assert_return(() => invoke($18, `load8_u`, [15123]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4041
assert_return(() => invoke($18, `load8_u`, [15322]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4042
assert_return(() => invoke($18, `load8_u`, [15521]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4043
assert_return(() => invoke($18, `load8_u`, [15720]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4044
assert_return(() => invoke($18, `load8_u`, [15919]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4045
assert_return(() => invoke($18, `load8_u`, [16118]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4046
assert_return(() => invoke($18, `load8_u`, [16317]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4047
assert_return(() => invoke($18, `load8_u`, [16516]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4048
assert_return(() => invoke($18, `load8_u`, [16715]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4049
assert_return(() => invoke($18, `load8_u`, [16914]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4050
assert_return(() => invoke($18, `load8_u`, [17113]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4051
assert_return(() => invoke($18, `load8_u`, [17312]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4052
assert_return(() => invoke($18, `load8_u`, [17511]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4053
assert_return(() => invoke($18, `load8_u`, [17710]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4054
assert_return(() => invoke($18, `load8_u`, [17909]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4055
assert_return(() => invoke($18, `load8_u`, [18108]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4056
assert_return(() => invoke($18, `load8_u`, [18307]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4057
assert_return(() => invoke($18, `load8_u`, [18506]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4058
assert_return(() => invoke($18, `load8_u`, [18705]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4059
assert_return(() => invoke($18, `load8_u`, [18904]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4060
assert_return(() => invoke($18, `load8_u`, [19103]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4061
assert_return(() => invoke($18, `load8_u`, [19302]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4062
assert_return(() => invoke($18, `load8_u`, [19501]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4063
assert_return(() => invoke($18, `load8_u`, [19700]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4064
assert_return(() => invoke($18, `load8_u`, [19899]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4065
assert_return(() => invoke($18, `load8_u`, [20098]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4066
assert_return(() => invoke($18, `load8_u`, [20297]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4067
assert_return(() => invoke($18, `load8_u`, [20496]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4068
assert_return(() => invoke($18, `load8_u`, [20695]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4069
assert_return(() => invoke($18, `load8_u`, [20894]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4070
assert_return(() => invoke($18, `load8_u`, [21093]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4071
assert_return(() => invoke($18, `load8_u`, [21292]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4072
assert_return(() => invoke($18, `load8_u`, [21491]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4073
assert_return(() => invoke($18, `load8_u`, [21690]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4074
assert_return(() => invoke($18, `load8_u`, [21889]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4075
assert_return(() => invoke($18, `load8_u`, [22088]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4076
assert_return(() => invoke($18, `load8_u`, [22287]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4077
assert_return(() => invoke($18, `load8_u`, [22486]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4078
assert_return(() => invoke($18, `load8_u`, [22685]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4079
assert_return(() => invoke($18, `load8_u`, [22884]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4080
assert_return(() => invoke($18, `load8_u`, [23083]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4081
assert_return(() => invoke($18, `load8_u`, [23282]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4082
assert_return(() => invoke($18, `load8_u`, [23481]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4083
assert_return(() => invoke($18, `load8_u`, [23680]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4084
assert_return(() => invoke($18, `load8_u`, [23879]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4085
assert_return(() => invoke($18, `load8_u`, [24078]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4086
assert_return(() => invoke($18, `load8_u`, [24277]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4087
assert_return(() => invoke($18, `load8_u`, [24476]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4088
assert_return(() => invoke($18, `load8_u`, [24675]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4089
assert_return(() => invoke($18, `load8_u`, [24874]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4090
assert_return(() => invoke($18, `load8_u`, [25073]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4091
assert_return(() => invoke($18, `load8_u`, [25272]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4092
assert_return(() => invoke($18, `load8_u`, [25471]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4093
assert_return(() => invoke($18, `load8_u`, [25670]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4094
assert_return(() => invoke($18, `load8_u`, [25869]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4095
assert_return(() => invoke($18, `load8_u`, [26068]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4096
assert_return(() => invoke($18, `load8_u`, [26267]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4097
assert_return(() => invoke($18, `load8_u`, [26466]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4098
assert_return(() => invoke($18, `load8_u`, [26665]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4099
assert_return(() => invoke($18, `load8_u`, [26864]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4100
assert_return(() => invoke($18, `load8_u`, [27063]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4101
assert_return(() => invoke($18, `load8_u`, [27262]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4102
assert_return(() => invoke($18, `load8_u`, [27461]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4103
assert_return(() => invoke($18, `load8_u`, [27660]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4104
assert_return(() => invoke($18, `load8_u`, [27859]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4105
assert_return(() => invoke($18, `load8_u`, [28058]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4106
assert_return(() => invoke($18, `load8_u`, [28257]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4107
assert_return(() => invoke($18, `load8_u`, [28456]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4108
assert_return(() => invoke($18, `load8_u`, [28655]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4109
assert_return(() => invoke($18, `load8_u`, [28854]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4110
assert_return(() => invoke($18, `load8_u`, [29053]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4111
assert_return(() => invoke($18, `load8_u`, [29252]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4112
assert_return(() => invoke($18, `load8_u`, [29451]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4113
assert_return(() => invoke($18, `load8_u`, [29650]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4114
assert_return(() => invoke($18, `load8_u`, [29849]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4115
assert_return(() => invoke($18, `load8_u`, [30048]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4116
assert_return(() => invoke($18, `load8_u`, [30247]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4117
assert_return(() => invoke($18, `load8_u`, [30446]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4118
assert_return(() => invoke($18, `load8_u`, [30645]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4119
assert_return(() => invoke($18, `load8_u`, [30844]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4120
assert_return(() => invoke($18, `load8_u`, [31043]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4121
assert_return(() => invoke($18, `load8_u`, [31242]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4122
assert_return(() => invoke($18, `load8_u`, [31441]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4123
assert_return(() => invoke($18, `load8_u`, [31640]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4124
assert_return(() => invoke($18, `load8_u`, [31839]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4125
assert_return(() => invoke($18, `load8_u`, [32038]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4126
assert_return(() => invoke($18, `load8_u`, [32237]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4127
assert_return(() => invoke($18, `load8_u`, [32436]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4128
assert_return(() => invoke($18, `load8_u`, [32635]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4129
assert_return(() => invoke($18, `load8_u`, [32834]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4130
assert_return(() => invoke($18, `load8_u`, [33033]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4131
assert_return(() => invoke($18, `load8_u`, [33232]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4132
assert_return(() => invoke($18, `load8_u`, [33431]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4133
assert_return(() => invoke($18, `load8_u`, [33630]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4134
assert_return(() => invoke($18, `load8_u`, [33829]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4135
assert_return(() => invoke($18, `load8_u`, [34028]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4136
assert_return(() => invoke($18, `load8_u`, [34227]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4137
assert_return(() => invoke($18, `load8_u`, [34426]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4138
assert_return(() => invoke($18, `load8_u`, [34625]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4139
assert_return(() => invoke($18, `load8_u`, [34824]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4140
assert_return(() => invoke($18, `load8_u`, [35023]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4141
assert_return(() => invoke($18, `load8_u`, [35222]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4142
assert_return(() => invoke($18, `load8_u`, [35421]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4143
assert_return(() => invoke($18, `load8_u`, [35620]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4144
assert_return(() => invoke($18, `load8_u`, [35819]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4145
assert_return(() => invoke($18, `load8_u`, [36018]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4146
assert_return(() => invoke($18, `load8_u`, [36217]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4147
assert_return(() => invoke($18, `load8_u`, [36416]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4148
assert_return(() => invoke($18, `load8_u`, [36615]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4149
assert_return(() => invoke($18, `load8_u`, [36814]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4150
assert_return(() => invoke($18, `load8_u`, [37013]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4151
assert_return(() => invoke($18, `load8_u`, [37212]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4152
assert_return(() => invoke($18, `load8_u`, [37411]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4153
assert_return(() => invoke($18, `load8_u`, [37610]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4154
assert_return(() => invoke($18, `load8_u`, [37809]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4155
assert_return(() => invoke($18, `load8_u`, [38008]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4156
assert_return(() => invoke($18, `load8_u`, [38207]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4157
assert_return(() => invoke($18, `load8_u`, [38406]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4158
assert_return(() => invoke($18, `load8_u`, [38605]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4159
assert_return(() => invoke($18, `load8_u`, [38804]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4160
assert_return(() => invoke($18, `load8_u`, [39003]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4161
assert_return(() => invoke($18, `load8_u`, [39202]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4162
assert_return(() => invoke($18, `load8_u`, [39401]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4163
assert_return(() => invoke($18, `load8_u`, [39600]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4164
assert_return(() => invoke($18, `load8_u`, [39799]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4165
assert_return(() => invoke($18, `load8_u`, [39998]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4166
assert_return(() => invoke($18, `load8_u`, [40197]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4167
assert_return(() => invoke($18, `load8_u`, [40396]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4168
assert_return(() => invoke($18, `load8_u`, [40595]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4169
assert_return(() => invoke($18, `load8_u`, [40794]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4170
assert_return(() => invoke($18, `load8_u`, [40993]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4171
assert_return(() => invoke($18, `load8_u`, [41192]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4172
assert_return(() => invoke($18, `load8_u`, [41391]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4173
assert_return(() => invoke($18, `load8_u`, [41590]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4174
assert_return(() => invoke($18, `load8_u`, [41789]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4175
assert_return(() => invoke($18, `load8_u`, [41988]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4176
assert_return(() => invoke($18, `load8_u`, [42187]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4177
assert_return(() => invoke($18, `load8_u`, [42386]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4178
assert_return(() => invoke($18, `load8_u`, [42585]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4179
assert_return(() => invoke($18, `load8_u`, [42784]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4180
assert_return(() => invoke($18, `load8_u`, [42983]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4181
assert_return(() => invoke($18, `load8_u`, [43182]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4182
assert_return(() => invoke($18, `load8_u`, [43381]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4183
assert_return(() => invoke($18, `load8_u`, [43580]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4184
assert_return(() => invoke($18, `load8_u`, [43779]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4185
assert_return(() => invoke($18, `load8_u`, [43978]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4186
assert_return(() => invoke($18, `load8_u`, [44177]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4187
assert_return(() => invoke($18, `load8_u`, [44376]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4188
assert_return(() => invoke($18, `load8_u`, [44575]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4189
assert_return(() => invoke($18, `load8_u`, [44774]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4190
assert_return(() => invoke($18, `load8_u`, [44973]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4191
assert_return(() => invoke($18, `load8_u`, [45172]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4192
assert_return(() => invoke($18, `load8_u`, [45371]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4193
assert_return(() => invoke($18, `load8_u`, [45570]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4194
assert_return(() => invoke($18, `load8_u`, [45769]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4195
assert_return(() => invoke($18, `load8_u`, [45968]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4196
assert_return(() => invoke($18, `load8_u`, [46167]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4197
assert_return(() => invoke($18, `load8_u`, [46366]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4198
assert_return(() => invoke($18, `load8_u`, [46565]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4199
assert_return(() => invoke($18, `load8_u`, [46764]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4200
assert_return(() => invoke($18, `load8_u`, [46963]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4201
assert_return(() => invoke($18, `load8_u`, [47162]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4202
assert_return(() => invoke($18, `load8_u`, [47361]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4203
assert_return(() => invoke($18, `load8_u`, [47560]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4204
assert_return(() => invoke($18, `load8_u`, [47759]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4205
assert_return(() => invoke($18, `load8_u`, [47958]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4206
assert_return(() => invoke($18, `load8_u`, [48157]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4207
assert_return(() => invoke($18, `load8_u`, [48356]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4208
assert_return(() => invoke($18, `load8_u`, [48555]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4209
assert_return(() => invoke($18, `load8_u`, [48754]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4210
assert_return(() => invoke($18, `load8_u`, [48953]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4211
assert_return(() => invoke($18, `load8_u`, [49152]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4212
assert_return(() => invoke($18, `load8_u`, [49351]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4213
assert_return(() => invoke($18, `load8_u`, [49550]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4214
assert_return(() => invoke($18, `load8_u`, [49749]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4215
assert_return(() => invoke($18, `load8_u`, [49948]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4216
assert_return(() => invoke($18, `load8_u`, [50147]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4217
assert_return(() => invoke($18, `load8_u`, [50346]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4218
assert_return(() => invoke($18, `load8_u`, [50545]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4219
assert_return(() => invoke($18, `load8_u`, [50744]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4220
assert_return(() => invoke($18, `load8_u`, [50943]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4221
assert_return(() => invoke($18, `load8_u`, [51142]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4222
assert_return(() => invoke($18, `load8_u`, [51341]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4223
assert_return(() => invoke($18, `load8_u`, [51540]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4224
assert_return(() => invoke($18, `load8_u`, [51739]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4225
assert_return(() => invoke($18, `load8_u`, [51938]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4226
assert_return(() => invoke($18, `load8_u`, [52137]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4227
assert_return(() => invoke($18, `load8_u`, [52336]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4228
assert_return(() => invoke($18, `load8_u`, [52535]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4229
assert_return(() => invoke($18, `load8_u`, [52734]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4230
assert_return(() => invoke($18, `load8_u`, [52933]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4231
assert_return(() => invoke($18, `load8_u`, [53132]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4232
assert_return(() => invoke($18, `load8_u`, [53331]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4233
assert_return(() => invoke($18, `load8_u`, [53530]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4234
assert_return(() => invoke($18, `load8_u`, [53729]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4235
assert_return(() => invoke($18, `load8_u`, [53928]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4236
assert_return(() => invoke($18, `load8_u`, [54127]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4237
assert_return(() => invoke($18, `load8_u`, [54326]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4238
assert_return(() => invoke($18, `load8_u`, [54525]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4239
assert_return(() => invoke($18, `load8_u`, [54724]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4240
assert_return(() => invoke($18, `load8_u`, [54923]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4241
assert_return(() => invoke($18, `load8_u`, [55122]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4242
assert_return(() => invoke($18, `load8_u`, [55321]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4243
assert_return(() => invoke($18, `load8_u`, [55520]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4244
assert_return(() => invoke($18, `load8_u`, [55719]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4245
assert_return(() => invoke($18, `load8_u`, [55918]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4246
assert_return(() => invoke($18, `load8_u`, [56117]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4247
assert_return(() => invoke($18, `load8_u`, [56316]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4248
assert_return(() => invoke($18, `load8_u`, [56515]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4249
assert_return(() => invoke($18, `load8_u`, [56714]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4250
assert_return(() => invoke($18, `load8_u`, [56913]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4251
assert_return(() => invoke($18, `load8_u`, [57112]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4252
assert_return(() => invoke($18, `load8_u`, [57311]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4253
assert_return(() => invoke($18, `load8_u`, [57510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4254
assert_return(() => invoke($18, `load8_u`, [57709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4255
assert_return(() => invoke($18, `load8_u`, [57908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4256
assert_return(() => invoke($18, `load8_u`, [58107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4257
assert_return(() => invoke($18, `load8_u`, [58306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4258
assert_return(() => invoke($18, `load8_u`, [58505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4259
assert_return(() => invoke($18, `load8_u`, [58704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4260
assert_return(() => invoke($18, `load8_u`, [58903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4261
assert_return(() => invoke($18, `load8_u`, [59102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4262
assert_return(() => invoke($18, `load8_u`, [59301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4263
assert_return(() => invoke($18, `load8_u`, [59500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4264
assert_return(() => invoke($18, `load8_u`, [59699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4265
assert_return(() => invoke($18, `load8_u`, [59898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4266
assert_return(() => invoke($18, `load8_u`, [60097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4267
assert_return(() => invoke($18, `load8_u`, [60296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4268
assert_return(() => invoke($18, `load8_u`, [60495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4269
assert_return(() => invoke($18, `load8_u`, [60694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4270
assert_return(() => invoke($18, `load8_u`, [60893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4271
assert_return(() => invoke($18, `load8_u`, [61092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4272
assert_return(() => invoke($18, `load8_u`, [61291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4273
assert_return(() => invoke($18, `load8_u`, [61440]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4274
assert_return(() => invoke($18, `load8_u`, [61441]), [value("i32", 1)]);

// ./test/core/memory64/memory_copy64.wast:4275
assert_return(() => invoke($18, `load8_u`, [61442]), [value("i32", 2)]);

// ./test/core/memory64/memory_copy64.wast:4276
assert_return(() => invoke($18, `load8_u`, [61443]), [value("i32", 3)]);

// ./test/core/memory64/memory_copy64.wast:4277
assert_return(() => invoke($18, `load8_u`, [61444]), [value("i32", 4)]);

// ./test/core/memory64/memory_copy64.wast:4278
assert_return(() => invoke($18, `load8_u`, [61445]), [value("i32", 5)]);

// ./test/core/memory64/memory_copy64.wast:4279
assert_return(() => invoke($18, `load8_u`, [61446]), [value("i32", 6)]);

// ./test/core/memory64/memory_copy64.wast:4280
assert_return(() => invoke($18, `load8_u`, [61447]), [value("i32", 7)]);

// ./test/core/memory64/memory_copy64.wast:4281
assert_return(() => invoke($18, `load8_u`, [61448]), [value("i32", 8)]);

// ./test/core/memory64/memory_copy64.wast:4282
assert_return(() => invoke($18, `load8_u`, [61449]), [value("i32", 9)]);

// ./test/core/memory64/memory_copy64.wast:4283
assert_return(() => invoke($18, `load8_u`, [61450]), [value("i32", 10)]);

// ./test/core/memory64/memory_copy64.wast:4284
assert_return(() => invoke($18, `load8_u`, [61451]), [value("i32", 11)]);

// ./test/core/memory64/memory_copy64.wast:4285
assert_return(() => invoke($18, `load8_u`, [61452]), [value("i32", 12)]);

// ./test/core/memory64/memory_copy64.wast:4286
assert_return(() => invoke($18, `load8_u`, [61453]), [value("i32", 13)]);

// ./test/core/memory64/memory_copy64.wast:4287
assert_return(() => invoke($18, `load8_u`, [61454]), [value("i32", 14)]);

// ./test/core/memory64/memory_copy64.wast:4288
assert_return(() => invoke($18, `load8_u`, [61455]), [value("i32", 15)]);

// ./test/core/memory64/memory_copy64.wast:4289
assert_return(() => invoke($18, `load8_u`, [61456]), [value("i32", 16)]);

// ./test/core/memory64/memory_copy64.wast:4290
assert_return(() => invoke($18, `load8_u`, [61457]), [value("i32", 17)]);

// ./test/core/memory64/memory_copy64.wast:4291
assert_return(() => invoke($18, `load8_u`, [61458]), [value("i32", 18)]);

// ./test/core/memory64/memory_copy64.wast:4292
assert_return(() => invoke($18, `load8_u`, [61459]), [value("i32", 19)]);

// ./test/core/memory64/memory_copy64.wast:4293
assert_return(() => invoke($18, `load8_u`, [61510]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4294
assert_return(() => invoke($18, `load8_u`, [61709]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4295
assert_return(() => invoke($18, `load8_u`, [61908]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4296
assert_return(() => invoke($18, `load8_u`, [62107]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4297
assert_return(() => invoke($18, `load8_u`, [62306]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4298
assert_return(() => invoke($18, `load8_u`, [62505]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4299
assert_return(() => invoke($18, `load8_u`, [62704]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4300
assert_return(() => invoke($18, `load8_u`, [62903]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4301
assert_return(() => invoke($18, `load8_u`, [63102]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4302
assert_return(() => invoke($18, `load8_u`, [63301]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4303
assert_return(() => invoke($18, `load8_u`, [63500]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4304
assert_return(() => invoke($18, `load8_u`, [63699]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4305
assert_return(() => invoke($18, `load8_u`, [63898]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4306
assert_return(() => invoke($18, `load8_u`, [64097]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4307
assert_return(() => invoke($18, `load8_u`, [64296]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4308
assert_return(() => invoke($18, `load8_u`, [64495]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4309
assert_return(() => invoke($18, `load8_u`, [64694]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4310
assert_return(() => invoke($18, `load8_u`, [64893]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4311
assert_return(() => invoke($18, `load8_u`, [65092]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4312
assert_return(() => invoke($18, `load8_u`, [65291]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4313
assert_return(() => invoke($18, `load8_u`, [65490]), [value("i32", 0)]);

// ./test/core/memory64/memory_copy64.wast:4315
assert_invalid(
  () => instantiate(`(module
    (func (export "testfn")
      (memory.copy (i64.const 10) (i64.const 20) (i64.const 30))))`),
  `unknown memory 0`,
);

// ./test/core/memory64/memory_copy64.wast:4321
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (i32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4328
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (i32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4335
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (i32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4342
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (i32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4349
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (f32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4356
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (f32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4363
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (f32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4370
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (f32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4377
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (i64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4384
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (i64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4391
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (i64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4398
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (i64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4405
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (f64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4412
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (f64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4419
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (f64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4426
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i32.const 10) (f64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4433
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (i32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4440
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (i32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4447
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (i32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4454
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (i32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4461
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (f32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4468
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (f32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4475
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (f32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4482
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (f32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4489
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (i64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4496
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (i64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4503
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (i64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4510
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (i64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4517
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (f64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4524
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (f64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4531
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (f64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4538
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f32.const 10) (f64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4545
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (i32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4552
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (i32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4559
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (i32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4566
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (i32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4573
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (f32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4580
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (f32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4587
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (f32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4594
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (f32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4601
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (i64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4608
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (i64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4615
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (i64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4622
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (f64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4629
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (f64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4636
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (f64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4643
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (i64.const 10) (f64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4650
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (i32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4657
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (i32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4664
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (i32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4671
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (i32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4678
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (f32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4685
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (f32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4692
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (f32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4699
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (f32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4706
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (i64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4713
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (i64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4720
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (i64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4727
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (i64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4734
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (f64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4741
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (f64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4748
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (f64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4755
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.copy (f64.const 10) (f64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_copy64.wast:4763
let $19 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.fill (i64.const 10) (i32.const 0x55) (i64.const 10))
    (memory.copy (i64.const 9) (i64.const 10) (i64.const 5)))
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))
)`);

// ./test/core/memory64/memory_copy64.wast:4780
invoke($19, `test`, []);

// ./test/core/memory64/memory_copy64.wast:4782
assert_return(() => invoke($19, `checkRange`, [0n, 9n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:4784
assert_return(() => invoke($19, `checkRange`, [9n, 20n, 85]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:4786
assert_return(() => invoke($19, `checkRange`, [20n, 65536n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:4789
let $20 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.fill (i64.const 10) (i32.const 0x55) (i64.const 10))
    (memory.copy (i64.const 16) (i64.const 15) (i64.const 5)))
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))
)`);

// ./test/core/memory64/memory_copy64.wast:4806
invoke($20, `test`, []);

// ./test/core/memory64/memory_copy64.wast:4808
assert_return(() => invoke($20, `checkRange`, [0n, 10n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:4810
assert_return(() => invoke($20, `checkRange`, [10n, 21n, 85]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:4812
assert_return(() => invoke($20, `checkRange`, [21n, 65536n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:4815
let $21 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.copy (i64.const 0xFF00) (i64.const 0x8000) (i64.const 257))))`);

// ./test/core/memory64/memory_copy64.wast:4819
assert_trap(() => invoke($21, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:4821
let $22 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.copy (i64.const 0xFFFFFF00) (i64.const 0x4000) (i64.const 257))))`);

// ./test/core/memory64/memory_copy64.wast:4825
assert_trap(() => invoke($22, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:4827
let $23 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.copy (i64.const 0x8000) (i64.const 0xFF00) (i64.const 257))))`);

// ./test/core/memory64/memory_copy64.wast:4831
assert_trap(() => invoke($23, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:4833
let $24 = instantiate(`(module
 (memory i64 1 1)
 (func (export "test")
   (memory.copy (i64.const 0x4000) (i64.const 0xFFFFFF00) (i64.const 257))))`);

// ./test/core/memory64/memory_copy64.wast:4837
assert_trap(() => invoke($24, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:4839
let $25 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.fill (i64.const 0x0000) (i32.const 0x55) (i64.const 0x8000))
    (memory.fill (i64.const 0x8000) (i32.const 0xAA) (i64.const 0x8000))
    (memory.copy (i64.const 0x9000) (i64.const 0x7000) (i64.const 0)))
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))
)`);

// ./test/core/memory64/memory_copy64.wast:4857
invoke($25, `test`, []);

// ./test/core/memory64/memory_copy64.wast:4859
assert_return(() => invoke($25, `checkRange`, [0n, 32768n, 85]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:4861
assert_return(() => invoke($25, `checkRange`, [32768n, 65536n, 170]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:4863
let $26 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.copy (i64.const 0x10000) (i64.const 0x7000) (i64.const 0))))`);

// ./test/core/memory64/memory_copy64.wast:4867
invoke($26, `test`, []);

// ./test/core/memory64/memory_copy64.wast:4869
let $27 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.copy (i64.const 0x20000) (i64.const 0x7000) (i64.const 0))))`);

// ./test/core/memory64/memory_copy64.wast:4873
assert_trap(() => invoke($27, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:4875
let $28 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.copy (i64.const 0x9000) (i64.const 0x10000) (i64.const 0))))`);

// ./test/core/memory64/memory_copy64.wast:4879
invoke($28, `test`, []);

// ./test/core/memory64/memory_copy64.wast:4881
let $29 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.copy (i64.const 0x9000) (i64.const 0x20000) (i64.const 0))))`);

// ./test/core/memory64/memory_copy64.wast:4885
assert_trap(() => invoke($29, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:4887
let $30 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.copy (i64.const 0x10000) (i64.const 0x10000) (i64.const 0))))`);

// ./test/core/memory64/memory_copy64.wast:4891
invoke($30, `test`, []);

// ./test/core/memory64/memory_copy64.wast:4893
let $31 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.copy (i64.const 0x20000) (i64.const 0x20000) (i64.const 0))))`);

// ./test/core/memory64/memory_copy64.wast:4897
assert_trap(() => invoke($31, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_copy64.wast:4899
let $32 = instantiate(`(module
  (memory i64 1 1)
  (func (export "test")
    (memory.fill (i64.const 17767) (i32.const 1) (i64.const 1344))
    (memory.fill (i64.const 39017) (i32.const 2) (i64.const 1055))
    (memory.fill (i64.const 56401) (i32.const 3) (i64.const 988))
    (memory.fill (i64.const 37962) (i32.const 4) (i64.const 322))
    (memory.fill (i64.const 7977) (i32.const 5) (i64.const 1994))
    (memory.fill (i64.const 22714) (i32.const 6) (i64.const 3036))
    (memory.fill (i64.const 16882) (i32.const 7) (i64.const 2372))
    (memory.fill (i64.const 43491) (i32.const 8) (i64.const 835))
    (memory.fill (i64.const 124) (i32.const 9) (i64.const 1393))
    (memory.fill (i64.const 2132) (i32.const 10) (i64.const 2758))
    (memory.fill (i64.const 8987) (i32.const 11) (i64.const 3098))
    (memory.fill (i64.const 52711) (i32.const 12) (i64.const 741))
    (memory.fill (i64.const 3958) (i32.const 13) (i64.const 2823))
    (memory.fill (i64.const 49715) (i32.const 14) (i64.const 1280))
    (memory.fill (i64.const 50377) (i32.const 15) (i64.const 1466))
    (memory.fill (i64.const 20493) (i32.const 16) (i64.const 3158))
    (memory.fill (i64.const 47665) (i32.const 17) (i64.const 544))
    (memory.fill (i64.const 12451) (i32.const 18) (i64.const 2669))
    (memory.fill (i64.const 24869) (i32.const 19) (i64.const 2651))
    (memory.fill (i64.const 45317) (i32.const 20) (i64.const 1570))
    (memory.fill (i64.const 43096) (i32.const 21) (i64.const 1691))
    (memory.fill (i64.const 33886) (i32.const 22) (i64.const 646))
    (memory.fill (i64.const 48555) (i32.const 23) (i64.const 1858))
    (memory.fill (i64.const 53453) (i32.const 24) (i64.const 2657))
    (memory.fill (i64.const 30363) (i32.const 25) (i64.const 981))
    (memory.fill (i64.const 9300) (i32.const 26) (i64.const 1807))
    (memory.fill (i64.const 50190) (i32.const 27) (i64.const 487))
    (memory.fill (i64.const 62753) (i32.const 28) (i64.const 530))
    (memory.fill (i64.const 36316) (i32.const 29) (i64.const 943))
    (memory.fill (i64.const 6768) (i32.const 30) (i64.const 381))
    (memory.fill (i64.const 51262) (i32.const 31) (i64.const 3089))
    (memory.fill (i64.const 49729) (i32.const 32) (i64.const 658))
    (memory.fill (i64.const 44540) (i32.const 33) (i64.const 1702))
    (memory.fill (i64.const 33342) (i32.const 34) (i64.const 1092))
    (memory.fill (i64.const 50814) (i32.const 35) (i64.const 1410))
    (memory.fill (i64.const 47594) (i32.const 36) (i64.const 2204))
    (memory.fill (i64.const 54123) (i32.const 37) (i64.const 2394))
    (memory.fill (i64.const 55183) (i32.const 38) (i64.const 250))
    (memory.fill (i64.const 22620) (i32.const 39) (i64.const 2097))
    (memory.fill (i64.const 17132) (i32.const 40) (i64.const 3264))
    (memory.fill (i64.const 54331) (i32.const 41) (i64.const 3299))
    (memory.fill (i64.const 39474) (i32.const 42) (i64.const 2796))
    (memory.fill (i64.const 36156) (i32.const 43) (i64.const 2070))
    (memory.fill (i64.const 35308) (i32.const 44) (i64.const 2763))
    (memory.fill (i64.const 32731) (i32.const 45) (i64.const 312))
    (memory.fill (i64.const 63746) (i32.const 46) (i64.const 192))
    (memory.fill (i64.const 30974) (i32.const 47) (i64.const 596))
    (memory.fill (i64.const 16635) (i32.const 48) (i64.const 501))
    (memory.fill (i64.const 57002) (i32.const 49) (i64.const 686))
    (memory.fill (i64.const 34299) (i32.const 50) (i64.const 385))
    (memory.fill (i64.const 60881) (i32.const 51) (i64.const 903))
    (memory.fill (i64.const 61445) (i32.const 52) (i64.const 2390))
    (memory.fill (i64.const 46972) (i32.const 53) (i64.const 1441))
    (memory.fill (i64.const 25973) (i32.const 54) (i64.const 3162))
    (memory.fill (i64.const 5566) (i32.const 55) (i64.const 2135))
    (memory.fill (i64.const 35977) (i32.const 56) (i64.const 519))
    (memory.fill (i64.const 44892) (i32.const 57) (i64.const 3280))
    (memory.fill (i64.const 46760) (i32.const 58) (i64.const 1678))
    (memory.fill (i64.const 46607) (i32.const 59) (i64.const 3168))
    (memory.fill (i64.const 22449) (i32.const 60) (i64.const 1441))
    (memory.fill (i64.const 58609) (i32.const 61) (i64.const 663))
    (memory.fill (i64.const 32261) (i32.const 62) (i64.const 1671))
    (memory.fill (i64.const 3063) (i32.const 63) (i64.const 721))
    (memory.fill (i64.const 34025) (i32.const 64) (i64.const 84))
    (memory.fill (i64.const 33338) (i32.const 65) (i64.const 2029))
    (memory.fill (i64.const 36810) (i32.const 66) (i64.const 29))
    (memory.fill (i64.const 19147) (i32.const 67) (i64.const 3034))
    (memory.fill (i64.const 12616) (i32.const 68) (i64.const 1043))
    (memory.fill (i64.const 18276) (i32.const 69) (i64.const 3324))
    (memory.fill (i64.const 4639) (i32.const 70) (i64.const 1091))
    (memory.fill (i64.const 16158) (i32.const 71) (i64.const 1997))
    (memory.fill (i64.const 18204) (i32.const 72) (i64.const 2259))
    (memory.fill (i64.const 50532) (i32.const 73) (i64.const 3189))
    (memory.fill (i64.const 11028) (i32.const 74) (i64.const 1968))
    (memory.fill (i64.const 15962) (i32.const 75) (i64.const 1455))
    (memory.fill (i64.const 45406) (i32.const 76) (i64.const 1177))
    (memory.fill (i64.const 54137) (i32.const 77) (i64.const 1568))
    (memory.fill (i64.const 33083) (i32.const 78) (i64.const 1642))
    (memory.fill (i64.const 61028) (i32.const 79) (i64.const 3284))
    (memory.fill (i64.const 51729) (i32.const 80) (i64.const 223))
    (memory.fill (i64.const 4361) (i32.const 81) (i64.const 2171))
    (memory.fill (i64.const 57514) (i32.const 82) (i64.const 1322))
    (memory.fill (i64.const 55724) (i32.const 83) (i64.const 2648))
    (memory.fill (i64.const 24091) (i32.const 84) (i64.const 1045))
    (memory.fill (i64.const 43183) (i32.const 85) (i64.const 3097))
    (memory.fill (i64.const 32307) (i32.const 86) (i64.const 2796))
    (memory.fill (i64.const 3811) (i32.const 87) (i64.const 2010))
    (memory.fill (i64.const 54856) (i32.const 88) (i64.const 0))
    (memory.fill (i64.const 49941) (i32.const 89) (i64.const 2069))
    (memory.fill (i64.const 20411) (i32.const 90) (i64.const 2896))
    (memory.fill (i64.const 33826) (i32.const 91) (i64.const 192))
    (memory.fill (i64.const 9402) (i32.const 92) (i64.const 2195))
    (memory.fill (i64.const 12413) (i32.const 93) (i64.const 24))
    (memory.fill (i64.const 14091) (i32.const 94) (i64.const 577))
    (memory.fill (i64.const 44058) (i32.const 95) (i64.const 2089))
    (memory.fill (i64.const 36735) (i32.const 96) (i64.const 3436))
    (memory.fill (i64.const 23288) (i32.const 97) (i64.const 2765))
    (memory.fill (i64.const 6392) (i32.const 98) (i64.const 830))
    (memory.fill (i64.const 33307) (i32.const 99) (i64.const 1938))
    (memory.fill (i64.const 21941) (i32.const 100) (i64.const 2750))
    (memory.copy (i64.const 59214) (i64.const 54248) (i64.const 2098))
    (memory.copy (i64.const 63026) (i64.const 39224) (i64.const 230))
    (memory.copy (i64.const 51833) (i64.const 23629) (i64.const 2300))
    (memory.copy (i64.const 6708) (i64.const 23996) (i64.const 639))
    (memory.copy (i64.const 6990) (i64.const 33399) (i64.const 1097))
    (memory.copy (i64.const 19403) (i64.const 10348) (i64.const 3197))
    (memory.copy (i64.const 27308) (i64.const 54406) (i64.const 100))
    (memory.copy (i64.const 27221) (i64.const 43682) (i64.const 1717))
    (memory.copy (i64.const 60528) (i64.const 8629) (i64.const 119))
    (memory.copy (i64.const 5947) (i64.const 2308) (i64.const 658))
    (memory.copy (i64.const 4787) (i64.const 51631) (i64.const 2269))
    (memory.copy (i64.const 12617) (i64.const 19197) (i64.const 833))
    (memory.copy (i64.const 11854) (i64.const 46505) (i64.const 3300))
    (memory.copy (i64.const 11376) (i64.const 45012) (i64.const 2281))
    (memory.copy (i64.const 34186) (i64.const 6697) (i64.const 2572))
    (memory.copy (i64.const 4936) (i64.const 1690) (i64.const 1328))
    (memory.copy (i64.const 63164) (i64.const 7637) (i64.const 1670))
    (memory.copy (i64.const 44568) (i64.const 18344) (i64.const 33))
    (memory.copy (i64.const 43918) (i64.const 22348) (i64.const 1427))
    (memory.copy (i64.const 46637) (i64.const 49819) (i64.const 1434))
    (memory.copy (i64.const 63684) (i64.const 8755) (i64.const 834))
    (memory.copy (i64.const 33485) (i64.const 20131) (i64.const 3317))
    (memory.copy (i64.const 40575) (i64.const 54317) (i64.const 3201))
    (memory.copy (i64.const 25812) (i64.const 59254) (i64.const 2452))
    (memory.copy (i64.const 19678) (i64.const 56882) (i64.const 346))
    (memory.copy (i64.const 15852) (i64.const 35914) (i64.const 2430))
    (memory.copy (i64.const 11824) (i64.const 35574) (i64.const 300))
    (memory.copy (i64.const 59427) (i64.const 13957) (i64.const 3153))
    (memory.copy (i64.const 34299) (i64.const 60594) (i64.const 1281))
    (memory.copy (i64.const 8964) (i64.const 12276) (i64.const 943))
    (memory.copy (i64.const 2827) (i64.const 10425) (i64.const 1887))
    (memory.copy (i64.const 43194) (i64.const 43910) (i64.const 738))
    (memory.copy (i64.const 63038) (i64.const 18949) (i64.const 122))
    (memory.copy (i64.const 24044) (i64.const 44761) (i64.const 1755))
    (memory.copy (i64.const 22608) (i64.const 14755) (i64.const 702))
    (memory.copy (i64.const 11284) (i64.const 26579) (i64.const 1830))
    (memory.copy (i64.const 23092) (i64.const 20471) (i64.const 1064))
    (memory.copy (i64.const 57248) (i64.const 54770) (i64.const 2631))
    (memory.copy (i64.const 25492) (i64.const 1025) (i64.const 3113))
    (memory.copy (i64.const 49588) (i64.const 44220) (i64.const 975))
    (memory.copy (i64.const 28280) (i64.const 41722) (i64.const 2336))
    (memory.copy (i64.const 61289) (i64.const 230) (i64.const 2872))
    (memory.copy (i64.const 22480) (i64.const 52506) (i64.const 2197))
    (memory.copy (i64.const 40553) (i64.const 9578) (i64.const 1958))
    (memory.copy (i64.const 29004) (i64.const 20862) (i64.const 2186))
    (memory.copy (i64.const 53029) (i64.const 43955) (i64.const 1037))
    (memory.copy (i64.const 25476) (i64.const 35667) (i64.const 1650))
    (memory.copy (i64.const 58516) (i64.const 45819) (i64.const 1986))
    (memory.copy (i64.const 38297) (i64.const 5776) (i64.const 1955))
    (memory.copy (i64.const 28503) (i64.const 55364) (i64.const 2368))
    (memory.copy (i64.const 62619) (i64.const 18108) (i64.const 1356))
    (memory.copy (i64.const 50149) (i64.const 13861) (i64.const 382))
    (memory.copy (i64.const 16904) (i64.const 36341) (i64.const 1900))
    (memory.copy (i64.const 48098) (i64.const 11358) (i64.const 2807))
    (memory.copy (i64.const 28512) (i64.const 40362) (i64.const 323))
    (memory.copy (i64.const 35506) (i64.const 27856) (i64.const 1670))
    (memory.copy (i64.const 62970) (i64.const 53332) (i64.const 1341))
    (memory.copy (i64.const 14133) (i64.const 46312) (i64.const 644))
    (memory.copy (i64.const 29030) (i64.const 19074) (i64.const 496))
    (memory.copy (i64.const 44952) (i64.const 47577) (i64.const 2784))
    (memory.copy (i64.const 39559) (i64.const 44661) (i64.const 1350))
    (memory.copy (i64.const 10352) (i64.const 29274) (i64.const 1475))
    (memory.copy (i64.const 46911) (i64.const 46178) (i64.const 1467))
    (memory.copy (i64.const 4905) (i64.const 28740) (i64.const 1895))
    (memory.copy (i64.const 38012) (i64.const 57253) (i64.const 1751))
    (memory.copy (i64.const 26446) (i64.const 27223) (i64.const 1127))
    (memory.copy (i64.const 58835) (i64.const 24657) (i64.const 1063))
    (memory.copy (i64.const 61356) (i64.const 38790) (i64.const 766))
    (memory.copy (i64.const 44160) (i64.const 2284) (i64.const 1520))
    (memory.copy (i64.const 32740) (i64.const 47237) (i64.const 3014))
    (memory.copy (i64.const 11148) (i64.const 21260) (i64.const 1011))
    (memory.copy (i64.const 7665) (i64.const 31612) (i64.const 3034))
    (memory.copy (i64.const 18044) (i64.const 12987) (i64.const 3320))
    (memory.copy (i64.const 57306) (i64.const 55905) (i64.const 308))
    (memory.copy (i64.const 24675) (i64.const 16815) (i64.const 1155))
    (memory.copy (i64.const 19900) (i64.const 10115) (i64.const 722))
    (memory.copy (i64.const 2921) (i64.const 5935) (i64.const 2370))
    (memory.copy (i64.const 32255) (i64.const 50095) (i64.const 2926))
    (memory.copy (i64.const 15126) (i64.const 17299) (i64.const 2607))
    (memory.copy (i64.const 45575) (i64.const 28447) (i64.const 2045))
    (memory.copy (i64.const 55149) (i64.const 36113) (i64.const 2596))
    (memory.copy (i64.const 28461) (i64.const 54157) (i64.const 1168))
    (memory.copy (i64.const 47951) (i64.const 53385) (i64.const 3137))
    (memory.copy (i64.const 30646) (i64.const 45155) (i64.const 2649))
    (memory.copy (i64.const 5057) (i64.const 4295) (i64.const 52))
    (memory.copy (i64.const 6692) (i64.const 24195) (i64.const 441))
    (memory.copy (i64.const 32984) (i64.const 27117) (i64.const 3445))
    (memory.copy (i64.const 32530) (i64.const 59372) (i64.const 2785))
    (memory.copy (i64.const 34361) (i64.const 8962) (i64.const 2406))
    (memory.copy (i64.const 17893) (i64.const 54538) (i64.const 3381))
    (memory.copy (i64.const 22685) (i64.const 44151) (i64.const 136))
    (memory.copy (i64.const 59089) (i64.const 7077) (i64.const 1045))
    (memory.copy (i64.const 42945) (i64.const 55028) (i64.const 2389))
    (memory.copy (i64.const 44693) (i64.const 20138) (i64.const 877))
    (memory.copy (i64.const 36810) (i64.const 25196) (i64.const 3447))
    (memory.copy (i64.const 45742) (i64.const 31888) (i64.const 854))
    (memory.copy (i64.const 24236) (i64.const 31866) (i64.const 1377))
    (memory.copy (i64.const 33778) (i64.const 692) (i64.const 1594))
    (memory.copy (i64.const 60618) (i64.const 18585) (i64.const 2987))
    (memory.copy (i64.const 50370) (i64.const 41271) (i64.const 1406))
  )
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))
)`);

// ./test/core/memory64/memory_copy64.wast:5115
invoke($32, `test`, []);

// ./test/core/memory64/memory_copy64.wast:5117
assert_return(() => invoke($32, `checkRange`, [0n, 124n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5119
assert_return(() => invoke($32, `checkRange`, [124n, 1517n, 9]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5121
assert_return(() => invoke($32, `checkRange`, [1517n, 2132n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5123
assert_return(() => invoke($32, `checkRange`, [2132n, 2827n, 10]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5125
assert_return(() => invoke($32, `checkRange`, [2827n, 2921n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5127
assert_return(() => invoke($32, `checkRange`, [2921n, 3538n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5129
assert_return(() => invoke($32, `checkRange`, [3538n, 3786n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5131
assert_return(() => invoke($32, `checkRange`, [3786n, 4042n, 97]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5133
assert_return(() => invoke($32, `checkRange`, [4042n, 4651n, 99]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5135
assert_return(() => invoke($32, `checkRange`, [4651n, 5057n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5137
assert_return(() => invoke($32, `checkRange`, [5057n, 5109n, 99]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5139
assert_return(() => invoke($32, `checkRange`, [5109n, 5291n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5141
assert_return(() => invoke($32, `checkRange`, [5291n, 5524n, 72]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5143
assert_return(() => invoke($32, `checkRange`, [5524n, 5691n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5145
assert_return(() => invoke($32, `checkRange`, [5691n, 6552n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5147
assert_return(() => invoke($32, `checkRange`, [6552n, 7133n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5149
assert_return(() => invoke($32, `checkRange`, [7133n, 7665n, 99]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5151
assert_return(() => invoke($32, `checkRange`, [7665n, 8314n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5153
assert_return(() => invoke($32, `checkRange`, [8314n, 8360n, 62]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5155
assert_return(() => invoke($32, `checkRange`, [8360n, 8793n, 86]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5157
assert_return(() => invoke($32, `checkRange`, [8793n, 8979n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5159
assert_return(() => invoke($32, `checkRange`, [8979n, 9373n, 79]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5161
assert_return(() => invoke($32, `checkRange`, [9373n, 9518n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5163
assert_return(() => invoke($32, `checkRange`, [9518n, 9934n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5165
assert_return(() => invoke($32, `checkRange`, [9934n, 10087n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5167
assert_return(() => invoke($32, `checkRange`, [10087n, 10206n, 5]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5169
assert_return(() => invoke($32, `checkRange`, [10206n, 10230n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5171
assert_return(() => invoke($32, `checkRange`, [10230n, 10249n, 41]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5173
assert_return(() => invoke($32, `checkRange`, [10249n, 11148n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5175
assert_return(() => invoke($32, `checkRange`, [11148n, 11356n, 74]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5177
assert_return(() => invoke($32, `checkRange`, [11356n, 11380n, 93]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5179
assert_return(() => invoke($32, `checkRange`, [11380n, 11939n, 74]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5181
assert_return(() => invoke($32, `checkRange`, [11939n, 12159n, 68]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5183
assert_return(() => invoke($32, `checkRange`, [12159n, 12575n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5185
assert_return(() => invoke($32, `checkRange`, [12575n, 12969n, 79]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5187
assert_return(() => invoke($32, `checkRange`, [12969n, 13114n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5189
assert_return(() => invoke($32, `checkRange`, [13114n, 14133n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5191
assert_return(() => invoke($32, `checkRange`, [14133n, 14404n, 76]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5193
assert_return(() => invoke($32, `checkRange`, [14404n, 14428n, 57]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5195
assert_return(() => invoke($32, `checkRange`, [14428n, 14458n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5197
assert_return(() => invoke($32, `checkRange`, [14458n, 14580n, 32]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5199
assert_return(() => invoke($32, `checkRange`, [14580n, 14777n, 89]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5201
assert_return(() => invoke($32, `checkRange`, [14777n, 15124n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5203
assert_return(() => invoke($32, `checkRange`, [15124n, 15126n, 36]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5205
assert_return(() => invoke($32, `checkRange`, [15126n, 15192n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5207
assert_return(() => invoke($32, `checkRange`, [15192n, 15871n, 96]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5209
assert_return(() => invoke($32, `checkRange`, [15871n, 15998n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5211
assert_return(() => invoke($32, `checkRange`, [15998n, 17017n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5213
assert_return(() => invoke($32, `checkRange`, [17017n, 17288n, 76]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5215
assert_return(() => invoke($32, `checkRange`, [17288n, 17312n, 57]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5217
assert_return(() => invoke($32, `checkRange`, [17312n, 17342n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5219
assert_return(() => invoke($32, `checkRange`, [17342n, 17464n, 32]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5221
assert_return(() => invoke($32, `checkRange`, [17464n, 17661n, 89]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5223
assert_return(() => invoke($32, `checkRange`, [17661n, 17727n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5225
assert_return(() => invoke($32, `checkRange`, [17727n, 17733n, 5]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5227
assert_return(() => invoke($32, `checkRange`, [17733n, 17893n, 96]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5229
assert_return(() => invoke($32, `checkRange`, [17893n, 18553n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5231
assert_return(() => invoke($32, `checkRange`, [18553n, 18744n, 42]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5233
assert_return(() => invoke($32, `checkRange`, [18744n, 18801n, 76]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5235
assert_return(() => invoke($32, `checkRange`, [18801n, 18825n, 57]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5237
assert_return(() => invoke($32, `checkRange`, [18825n, 18876n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5239
assert_return(() => invoke($32, `checkRange`, [18876n, 18885n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5241
assert_return(() => invoke($32, `checkRange`, [18885n, 18904n, 41]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5243
assert_return(() => invoke($32, `checkRange`, [18904n, 19567n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5245
assert_return(() => invoke($32, `checkRange`, [19567n, 20403n, 96]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5247
assert_return(() => invoke($32, `checkRange`, [20403n, 21274n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5249
assert_return(() => invoke($32, `checkRange`, [21274n, 21364n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5251
assert_return(() => invoke($32, `checkRange`, [21364n, 21468n, 74]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5253
assert_return(() => invoke($32, `checkRange`, [21468n, 21492n, 93]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5255
assert_return(() => invoke($32, `checkRange`, [21492n, 22051n, 74]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5257
assert_return(() => invoke($32, `checkRange`, [22051n, 22480n, 68]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5259
assert_return(() => invoke($32, `checkRange`, [22480n, 22685n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5261
assert_return(() => invoke($32, `checkRange`, [22685n, 22694n, 68]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5263
assert_return(() => invoke($32, `checkRange`, [22694n, 22821n, 10]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5265
assert_return(() => invoke($32, `checkRange`, [22821n, 22869n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5267
assert_return(() => invoke($32, `checkRange`, [22869n, 24107n, 97]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5269
assert_return(() => invoke($32, `checkRange`, [24107n, 24111n, 37]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5271
assert_return(() => invoke($32, `checkRange`, [24111n, 24236n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5273
assert_return(() => invoke($32, `checkRange`, [24236n, 24348n, 72]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5275
assert_return(() => invoke($32, `checkRange`, [24348n, 24515n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5277
assert_return(() => invoke($32, `checkRange`, [24515n, 24900n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5279
assert_return(() => invoke($32, `checkRange`, [24900n, 25136n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5281
assert_return(() => invoke($32, `checkRange`, [25136n, 25182n, 85]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5283
assert_return(() => invoke($32, `checkRange`, [25182n, 25426n, 68]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5285
assert_return(() => invoke($32, `checkRange`, [25426n, 25613n, 89]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5287
assert_return(() => invoke($32, `checkRange`, [25613n, 25830n, 96]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5289
assert_return(() => invoke($32, `checkRange`, [25830n, 26446n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5291
assert_return(() => invoke($32, `checkRange`, [26446n, 26517n, 10]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5293
assert_return(() => invoke($32, `checkRange`, [26517n, 27468n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5295
assert_return(() => invoke($32, `checkRange`, [27468n, 27503n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5297
assert_return(() => invoke($32, `checkRange`, [27503n, 27573n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5299
assert_return(() => invoke($32, `checkRange`, [27573n, 28245n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5301
assert_return(() => invoke($32, `checkRange`, [28245n, 28280n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5303
assert_return(() => invoke($32, `checkRange`, [28280n, 29502n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5305
assert_return(() => invoke($32, `checkRange`, [29502n, 29629n, 42]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5307
assert_return(() => invoke($32, `checkRange`, [29629n, 30387n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5309
assert_return(() => invoke($32, `checkRange`, [30387n, 30646n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5311
assert_return(() => invoke($32, `checkRange`, [30646n, 31066n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5313
assert_return(() => invoke($32, `checkRange`, [31066n, 31131n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5315
assert_return(() => invoke($32, `checkRange`, [31131n, 31322n, 42]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5317
assert_return(() => invoke($32, `checkRange`, [31322n, 31379n, 76]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5319
assert_return(() => invoke($32, `checkRange`, [31379n, 31403n, 57]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5321
assert_return(() => invoke($32, `checkRange`, [31403n, 31454n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5323
assert_return(() => invoke($32, `checkRange`, [31454n, 31463n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5325
assert_return(() => invoke($32, `checkRange`, [31463n, 31482n, 41]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5327
assert_return(() => invoke($32, `checkRange`, [31482n, 31649n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5329
assert_return(() => invoke($32, `checkRange`, [31649n, 31978n, 72]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5331
assert_return(() => invoke($32, `checkRange`, [31978n, 32145n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5333
assert_return(() => invoke($32, `checkRange`, [32145n, 32530n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5335
assert_return(() => invoke($32, `checkRange`, [32530n, 32766n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5337
assert_return(() => invoke($32, `checkRange`, [32766n, 32812n, 85]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5339
assert_return(() => invoke($32, `checkRange`, [32812n, 33056n, 68]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5341
assert_return(() => invoke($32, `checkRange`, [33056n, 33660n, 89]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5343
assert_return(() => invoke($32, `checkRange`, [33660n, 33752n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5345
assert_return(() => invoke($32, `checkRange`, [33752n, 33775n, 36]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5347
assert_return(() => invoke($32, `checkRange`, [33775n, 33778n, 32]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5349
assert_return(() => invoke($32, `checkRange`, [33778n, 34603n, 9]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5351
assert_return(() => invoke($32, `checkRange`, [34603n, 35218n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5353
assert_return(() => invoke($32, `checkRange`, [35218n, 35372n, 10]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5355
assert_return(() => invoke($32, `checkRange`, [35372n, 35486n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5357
assert_return(() => invoke($32, `checkRange`, [35486n, 35605n, 5]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5359
assert_return(() => invoke($32, `checkRange`, [35605n, 35629n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5361
assert_return(() => invoke($32, `checkRange`, [35629n, 35648n, 41]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5363
assert_return(() => invoke($32, `checkRange`, [35648n, 36547n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5365
assert_return(() => invoke($32, `checkRange`, [36547n, 36755n, 74]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5367
assert_return(() => invoke($32, `checkRange`, [36755n, 36767n, 93]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5369
assert_return(() => invoke($32, `checkRange`, [36767n, 36810n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5371
assert_return(() => invoke($32, `checkRange`, [36810n, 36839n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5373
assert_return(() => invoke($32, `checkRange`, [36839n, 37444n, 96]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5375
assert_return(() => invoke($32, `checkRange`, [37444n, 38060n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5377
assert_return(() => invoke($32, `checkRange`, [38060n, 38131n, 10]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5379
assert_return(() => invoke($32, `checkRange`, [38131n, 39082n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5381
assert_return(() => invoke($32, `checkRange`, [39082n, 39117n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5383
assert_return(() => invoke($32, `checkRange`, [39117n, 39187n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5385
assert_return(() => invoke($32, `checkRange`, [39187n, 39859n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5387
assert_return(() => invoke($32, `checkRange`, [39859n, 39894n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5389
assert_return(() => invoke($32, `checkRange`, [39894n, 40257n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5391
assert_return(() => invoke($32, `checkRange`, [40257n, 40344n, 89]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5393
assert_return(() => invoke($32, `checkRange`, [40344n, 40371n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5395
assert_return(() => invoke($32, `checkRange`, [40371n, 40804n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5397
assert_return(() => invoke($32, `checkRange`, [40804n, 40909n, 5]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5399
assert_return(() => invoke($32, `checkRange`, [40909n, 42259n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5401
assert_return(() => invoke($32, `checkRange`, [42259n, 42511n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5403
assert_return(() => invoke($32, `checkRange`, [42511n, 42945n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5405
assert_return(() => invoke($32, `checkRange`, [42945n, 43115n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5407
assert_return(() => invoke($32, `checkRange`, [43115n, 43306n, 42]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5409
assert_return(() => invoke($32, `checkRange`, [43306n, 43363n, 76]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5411
assert_return(() => invoke($32, `checkRange`, [43363n, 43387n, 57]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5413
assert_return(() => invoke($32, `checkRange`, [43387n, 43438n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5415
assert_return(() => invoke($32, `checkRange`, [43438n, 43447n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5417
assert_return(() => invoke($32, `checkRange`, [43447n, 43466n, 41]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5419
assert_return(() => invoke($32, `checkRange`, [43466n, 44129n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5421
assert_return(() => invoke($32, `checkRange`, [44129n, 44958n, 96]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5423
assert_return(() => invoke($32, `checkRange`, [44958n, 45570n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5425
assert_return(() => invoke($32, `checkRange`, [45570n, 45575n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5427
assert_return(() => invoke($32, `checkRange`, [45575n, 45640n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5429
assert_return(() => invoke($32, `checkRange`, [45640n, 45742n, 42]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5431
assert_return(() => invoke($32, `checkRange`, [45742n, 45832n, 72]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5433
assert_return(() => invoke($32, `checkRange`, [45832n, 45999n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5435
assert_return(() => invoke($32, `checkRange`, [45999n, 46384n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5437
assert_return(() => invoke($32, `checkRange`, [46384n, 46596n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5439
assert_return(() => invoke($32, `checkRange`, [46596n, 46654n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5441
assert_return(() => invoke($32, `checkRange`, [46654n, 47515n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5443
assert_return(() => invoke($32, `checkRange`, [47515n, 47620n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5445
assert_return(() => invoke($32, `checkRange`, [47620n, 47817n, 79]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5447
assert_return(() => invoke($32, `checkRange`, [47817n, 47951n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5449
assert_return(() => invoke($32, `checkRange`, [47951n, 48632n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5451
assert_return(() => invoke($32, `checkRange`, [48632n, 48699n, 97]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5453
assert_return(() => invoke($32, `checkRange`, [48699n, 48703n, 37]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5455
assert_return(() => invoke($32, `checkRange`, [48703n, 49764n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5457
assert_return(() => invoke($32, `checkRange`, [49764n, 49955n, 42]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5459
assert_return(() => invoke($32, `checkRange`, [49955n, 50012n, 76]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5461
assert_return(() => invoke($32, `checkRange`, [50012n, 50036n, 57]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5463
assert_return(() => invoke($32, `checkRange`, [50036n, 50087n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5465
assert_return(() => invoke($32, `checkRange`, [50087n, 50096n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5467
assert_return(() => invoke($32, `checkRange`, [50096n, 50115n, 41]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5469
assert_return(() => invoke($32, `checkRange`, [50115n, 50370n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5471
assert_return(() => invoke($32, `checkRange`, [50370n, 51358n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5473
assert_return(() => invoke($32, `checkRange`, [51358n, 51610n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5475
assert_return(() => invoke($32, `checkRange`, [51610n, 51776n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5477
assert_return(() => invoke($32, `checkRange`, [51776n, 51833n, 89]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5479
assert_return(() => invoke($32, `checkRange`, [51833n, 52895n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5481
assert_return(() => invoke($32, `checkRange`, [52895n, 53029n, 97]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5483
assert_return(() => invoke($32, `checkRange`, [53029n, 53244n, 68]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5485
assert_return(() => invoke($32, `checkRange`, [53244n, 54066n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5487
assert_return(() => invoke($32, `checkRange`, [54066n, 54133n, 97]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5489
assert_return(() => invoke($32, `checkRange`, [54133n, 54137n, 37]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5491
assert_return(() => invoke($32, `checkRange`, [54137n, 55198n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5493
assert_return(() => invoke($32, `checkRange`, [55198n, 55389n, 42]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5495
assert_return(() => invoke($32, `checkRange`, [55389n, 55446n, 76]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5497
assert_return(() => invoke($32, `checkRange`, [55446n, 55470n, 57]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5499
assert_return(() => invoke($32, `checkRange`, [55470n, 55521n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5501
assert_return(() => invoke($32, `checkRange`, [55521n, 55530n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5503
assert_return(() => invoke($32, `checkRange`, [55530n, 55549n, 41]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5505
assert_return(() => invoke($32, `checkRange`, [55549n, 56212n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5507
assert_return(() => invoke($32, `checkRange`, [56212n, 57048n, 96]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5509
assert_return(() => invoke($32, `checkRange`, [57048n, 58183n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5511
assert_return(() => invoke($32, `checkRange`, [58183n, 58202n, 41]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5513
assert_return(() => invoke($32, `checkRange`, [58202n, 58516n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5515
assert_return(() => invoke($32, `checkRange`, [58516n, 58835n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5517
assert_return(() => invoke($32, `checkRange`, [58835n, 58855n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5519
assert_return(() => invoke($32, `checkRange`, [58855n, 59089n, 95]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5521
assert_return(() => invoke($32, `checkRange`, [59089n, 59145n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5523
assert_return(() => invoke($32, `checkRange`, [59145n, 59677n, 99]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5525
assert_return(() => invoke($32, `checkRange`, [59677n, 60134n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5527
assert_return(() => invoke($32, `checkRange`, [60134n, 60502n, 89]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5529
assert_return(() => invoke($32, `checkRange`, [60502n, 60594n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5531
assert_return(() => invoke($32, `checkRange`, [60594n, 60617n, 36]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5533
assert_return(() => invoke($32, `checkRange`, [60617n, 60618n, 32]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5535
assert_return(() => invoke($32, `checkRange`, [60618n, 60777n, 42]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5537
assert_return(() => invoke($32, `checkRange`, [60777n, 60834n, 76]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5539
assert_return(() => invoke($32, `checkRange`, [60834n, 60858n, 57]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5541
assert_return(() => invoke($32, `checkRange`, [60858n, 60909n, 59]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5543
assert_return(() => invoke($32, `checkRange`, [60909n, 60918n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5545
assert_return(() => invoke($32, `checkRange`, [60918n, 60937n, 41]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5547
assert_return(() => invoke($32, `checkRange`, [60937n, 61600n, 83]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5549
assert_return(() => invoke($32, `checkRange`, [61600n, 62436n, 96]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5551
assert_return(() => invoke($32, `checkRange`, [62436n, 63307n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5553
assert_return(() => invoke($32, `checkRange`, [63307n, 63397n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5555
assert_return(() => invoke($32, `checkRange`, [63397n, 63501n, 74]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5557
assert_return(() => invoke($32, `checkRange`, [63501n, 63525n, 93]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5559
assert_return(() => invoke($32, `checkRange`, [63525n, 63605n, 74]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5561
assert_return(() => invoke($32, `checkRange`, [63605n, 63704n, 100]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5563
assert_return(() => invoke($32, `checkRange`, [63704n, 63771n, 97]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5565
assert_return(() => invoke($32, `checkRange`, [63771n, 63775n, 37]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5567
assert_return(() => invoke($32, `checkRange`, [63775n, 64311n, 77]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5569
assert_return(() => invoke($32, `checkRange`, [64311n, 64331n, 26]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5571
assert_return(() => invoke($32, `checkRange`, [64331n, 64518n, 92]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5573
assert_return(() => invoke($32, `checkRange`, [64518n, 64827n, 11]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5575
assert_return(() => invoke($32, `checkRange`, [64827n, 64834n, 26]), [value("i64", -1n)]);

// ./test/core/memory64/memory_copy64.wast:5577
assert_return(() => invoke($32, `checkRange`, [64834n, 65536n, 0]), [value("i64", -1n)]);

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

// ./test/core/threads/atomic.wast

// ./test/core/threads/atomic.wast:3
let $0 = instantiate(`(module
  (memory 1 1 shared)

  (func (export "init") (param \$value i64) (i64.store (i32.const 0) (local.get \$value)))

  (func (export "i32.atomic.load") (param \$addr i32) (result i32) (i32.atomic.load (local.get \$addr)))
  (func (export "i64.atomic.load") (param \$addr i32) (result i64) (i64.atomic.load (local.get \$addr)))
  (func (export "i32.atomic.load8_u") (param \$addr i32) (result i32) (i32.atomic.load8_u (local.get \$addr)))
  (func (export "i32.atomic.load16_u") (param \$addr i32) (result i32) (i32.atomic.load16_u (local.get \$addr)))
  (func (export "i64.atomic.load8_u") (param \$addr i32) (result i64) (i64.atomic.load8_u (local.get \$addr)))
  (func (export "i64.atomic.load16_u") (param \$addr i32) (result i64) (i64.atomic.load16_u (local.get \$addr)))
  (func (export "i64.atomic.load32_u") (param \$addr i32) (result i64) (i64.atomic.load32_u (local.get \$addr)))

  (func (export "i32.atomic.store") (param \$addr i32) (param \$value i32) (i32.atomic.store (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.store") (param \$addr i32) (param \$value i64) (i64.atomic.store (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.store8") (param \$addr i32) (param \$value i32) (i32.atomic.store8 (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.store16") (param \$addr i32) (param \$value i32) (i32.atomic.store16 (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.store8") (param \$addr i32) (param \$value i64) (i64.atomic.store8 (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.store16") (param \$addr i32) (param \$value i64) (i64.atomic.store16 (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.store32") (param \$addr i32) (param \$value i64) (i64.atomic.store32 (local.get \$addr) (local.get \$value)))

  (func (export "i32.atomic.rmw.add") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.add (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw.add") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.add (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw8.add_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw8.add_u (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw16.add_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.add_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw8.add_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw8.add_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw16.add_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.add_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw32.add_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.add_u (local.get \$addr) (local.get \$value)))

  (func (export "i32.atomic.rmw.sub") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.sub (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw.sub") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.sub (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw8.sub_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw8.sub_u (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw16.sub_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.sub_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw8.sub_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw8.sub_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw16.sub_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.sub_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw32.sub_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.sub_u (local.get \$addr) (local.get \$value)))

  (func (export "i32.atomic.rmw.and") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.and (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw.and") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.and (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw8.and_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw8.and_u (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw16.and_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.and_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw8.and_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw8.and_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw16.and_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.and_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw32.and_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.and_u (local.get \$addr) (local.get \$value)))

  (func (export "i32.atomic.rmw.or") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.or (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw.or") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.or (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw8.or_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw8.or_u (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw16.or_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.or_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw8.or_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw8.or_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw16.or_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.or_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw32.or_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.or_u (local.get \$addr) (local.get \$value)))

  (func (export "i32.atomic.rmw.xor") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.xor (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw.xor") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.xor (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw8.xor_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw8.xor_u (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw16.xor_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.xor_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw8.xor_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw8.xor_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw16.xor_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.xor_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw32.xor_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.xor_u (local.get \$addr) (local.get \$value)))

  (func (export "i32.atomic.rmw.xchg") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.xchg (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw.xchg") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.xchg (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw8.xchg_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw8.xchg_u (local.get \$addr) (local.get \$value)))
  (func (export "i32.atomic.rmw16.xchg_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.xchg_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw8.xchg_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw8.xchg_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw16.xchg_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.xchg_u (local.get \$addr) (local.get \$value)))
  (func (export "i64.atomic.rmw32.xchg_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.xchg_u (local.get \$addr) (local.get \$value)))

  (func (export "i32.atomic.rmw.cmpxchg") (param \$addr i32) (param \$expected i32) (param \$value i32) (result i32) (i32.atomic.rmw.cmpxchg (local.get \$addr) (local.get \$expected) (local.get \$value)))
  (func (export "i64.atomic.rmw.cmpxchg") (param \$addr i32) (param \$expected i64) (param \$value i64) (result i64) (i64.atomic.rmw.cmpxchg (local.get \$addr) (local.get \$expected) (local.get \$value)))
  (func (export "i32.atomic.rmw8.cmpxchg_u") (param \$addr i32) (param \$expected i32) (param \$value i32) (result i32) (i32.atomic.rmw8.cmpxchg_u (local.get \$addr) (local.get \$expected) (local.get \$value)))
  (func (export "i32.atomic.rmw16.cmpxchg_u") (param \$addr i32) (param \$expected i32) (param \$value i32) (result i32) (i32.atomic.rmw16.cmpxchg_u (local.get \$addr) (local.get \$expected) (local.get \$value)))
  (func (export "i64.atomic.rmw8.cmpxchg_u") (param \$addr i32) (param \$expected i64) (param \$value i64) (result i64) (i64.atomic.rmw8.cmpxchg_u (local.get \$addr) (local.get \$expected) (local.get \$value)))
  (func (export "i64.atomic.rmw16.cmpxchg_u") (param \$addr i32) (param \$expected i64) (param \$value i64) (result i64) (i64.atomic.rmw16.cmpxchg_u (local.get \$addr) (local.get \$expected) (local.get \$value)))
  (func (export "i64.atomic.rmw32.cmpxchg_u") (param \$addr i32) (param \$expected i64) (param \$value i64) (result i64) (i64.atomic.rmw32.cmpxchg_u (local.get \$addr) (local.get \$expected) (local.get \$value)))

)`);

// ./test/core/threads/atomic.wast:84
invoke($0, `init`, [506097522914230528n]);

// ./test/core/threads/atomic.wast:86
assert_return(() => invoke($0, `i32.atomic.load`, [0]), [value("i32", 50462976)]);

// ./test/core/threads/atomic.wast:87
assert_return(() => invoke($0, `i32.atomic.load`, [4]), [value("i32", 117835012)]);

// ./test/core/threads/atomic.wast:89
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 506097522914230528n)]);

// ./test/core/threads/atomic.wast:91
assert_return(() => invoke($0, `i32.atomic.load8_u`, [0]), [value("i32", 0)]);

// ./test/core/threads/atomic.wast:92
assert_return(() => invoke($0, `i32.atomic.load8_u`, [5]), [value("i32", 5)]);

// ./test/core/threads/atomic.wast:94
assert_return(() => invoke($0, `i32.atomic.load16_u`, [0]), [value("i32", 256)]);

// ./test/core/threads/atomic.wast:95
assert_return(() => invoke($0, `i32.atomic.load16_u`, [6]), [value("i32", 1798)]);

// ./test/core/threads/atomic.wast:97
assert_return(() => invoke($0, `i64.atomic.load8_u`, [0]), [value("i64", 0n)]);

// ./test/core/threads/atomic.wast:98
assert_return(() => invoke($0, `i64.atomic.load8_u`, [5]), [value("i64", 5n)]);

// ./test/core/threads/atomic.wast:100
assert_return(() => invoke($0, `i64.atomic.load16_u`, [0]), [value("i64", 256n)]);

// ./test/core/threads/atomic.wast:101
assert_return(() => invoke($0, `i64.atomic.load16_u`, [6]), [value("i64", 1798n)]);

// ./test/core/threads/atomic.wast:103
assert_return(() => invoke($0, `i64.atomic.load32_u`, [0]), [value("i64", 50462976n)]);

// ./test/core/threads/atomic.wast:104
assert_return(() => invoke($0, `i64.atomic.load32_u`, [4]), [value("i64", 117835012n)]);

// ./test/core/threads/atomic.wast:108
invoke($0, `init`, [0n]);

// ./test/core/threads/atomic.wast:110
assert_return(() => invoke($0, `i32.atomic.store`, [0, -1122868]), []);

// ./test/core/threads/atomic.wast:111
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 4293844428n)]);

// ./test/core/threads/atomic.wast:113
assert_return(() => invoke($0, `i64.atomic.store`, [0, 81985529216486895n]), []);

// ./test/core/threads/atomic.wast:114
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 81985529216486895n)]);

// ./test/core/threads/atomic.wast:116
assert_return(() => invoke($0, `i32.atomic.store8`, [1, 66]), []);

// ./test/core/threads/atomic.wast:117
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 81985529216451311n)]);

// ./test/core/threads/atomic.wast:119
assert_return(() => invoke($0, `i32.atomic.store16`, [4, 34884]), []);

// ./test/core/threads/atomic.wast:120
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 82059046171656943n)]);

// ./test/core/threads/atomic.wast:122
assert_return(() => invoke($0, `i64.atomic.store8`, [1, 153n]), []);

// ./test/core/threads/atomic.wast:123
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 82059046171679215n)]);

// ./test/core/threads/atomic.wast:125
assert_return(() => invoke($0, `i64.atomic.store16`, [4, 51966n]), []);

// ./test/core/threads/atomic.wast:126
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 82132412803029487n)]);

// ./test/core/threads/atomic.wast:128
assert_return(() => invoke($0, `i64.atomic.store32`, [4, 3735928559n]), []);

// ./test/core/threads/atomic.wast:129
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", -2401053090302420497n)]);

// ./test/core/threads/atomic.wast:133
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:134
assert_return(() => invoke($0, `i32.atomic.rmw.add`, [0, 305419896]), [value("i32", 286331153)]);

// ./test/core/threads/atomic.wast:135
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938552723337n)]);

// ./test/core/threads/atomic.wast:137
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:138
assert_return(
  () => invoke($0, `i64.atomic.rmw.add`, [0, 72340172854919682n]),
  [value("i64", 1229782938247303441n)],
);

// ./test/core/threads/atomic.wast:139
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1302123111102223123n)]);

// ./test/core/threads/atomic.wast:141
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:142
assert_return(() => invoke($0, `i32.atomic.rmw8.add_u`, [0, -842150451]), [value("i32", 17)]);

// ./test/core/threads/atomic.wast:143
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303646n)]);

// ./test/core/threads/atomic.wast:145
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:146
assert_return(() => invoke($0, `i32.atomic.rmw16.add_u`, [0, -889271554]), [value("i32", 4369)]);

// ./test/core/threads/atomic.wast:147
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247355407n)]);

// ./test/core/threads/atomic.wast:149
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:150
assert_return(() => invoke($0, `i64.atomic.rmw8.add_u`, [0, 4774451407313060418n]), [value("i64", 17n)]);

// ./test/core/threads/atomic.wast:151
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303507n)]);

// ./test/core/threads/atomic.wast:153
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:154
assert_return(
  () => invoke($0, `i64.atomic.rmw16.add_u`, [0, -4688318750159552785n]),
  [value("i64", 4369n)],
);

// ./test/core/threads/atomic.wast:155
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247352320n)]);

// ./test/core/threads/atomic.wast:157
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:158
assert_return(
  () => invoke($0, `i64.atomic.rmw32.add_u`, [0, -3838290751524198683n]),
  [value("i64", 286331153n)],
);

// ./test/core/threads/atomic.wast:159
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782941648599030n)]);

// ./test/core/threads/atomic.wast:163
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:164
assert_return(() => invoke($0, `i32.atomic.rmw.sub`, [0, 305419896]), [value("i32", 286331153)]);

// ./test/core/threads/atomic.wast:165
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782942236850841n)]);

// ./test/core/threads/atomic.wast:167
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:168
assert_return(
  () => invoke($0, `i64.atomic.rmw.sub`, [0, 72340172854919682n]),
  [value("i64", 1229782938247303441n)],
);

// ./test/core/threads/atomic.wast:169
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1157442765392383759n)]);

// ./test/core/threads/atomic.wast:171
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:172
assert_return(() => invoke($0, `i32.atomic.rmw8.sub_u`, [0, -842150451]), [value("i32", 17)]);

// ./test/core/threads/atomic.wast:173
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303492n)]);

// ./test/core/threads/atomic.wast:175
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:176
assert_return(() => invoke($0, `i32.atomic.rmw16.sub_u`, [0, -889271554]), [value("i32", 4369)]);

// ./test/core/threads/atomic.wast:177
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247317011n)]);

// ./test/core/threads/atomic.wast:179
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:180
assert_return(() => invoke($0, `i64.atomic.rmw8.sub_u`, [0, 4774451407313060418n]), [value("i64", 17n)]);

// ./test/core/threads/atomic.wast:181
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303631n)]);

// ./test/core/threads/atomic.wast:183
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:184
assert_return(
  () => invoke($0, `i64.atomic.rmw16.sub_u`, [0, -4688318750159552785n]),
  [value("i64", 4369n)],
);

// ./test/core/threads/atomic.wast:185
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247320098n)]);

// ./test/core/threads/atomic.wast:187
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:188
assert_return(
  () => invoke($0, `i64.atomic.rmw32.sub_u`, [0, -3838290751524198683n]),
  [value("i64", 286331153n)],
);

// ./test/core/threads/atomic.wast:189
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782939140975148n)]);

// ./test/core/threads/atomic.wast:193
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:194
assert_return(() => invoke($0, `i32.atomic.rmw.and`, [0, 305419896]), [value("i32", 286331153)]);

// ./test/core/threads/atomic.wast:195
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938230460432n)]);

// ./test/core/threads/atomic.wast:197
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:198
assert_return(
  () => invoke($0, `i64.atomic.rmw.and`, [0, 72340172854919682n]),
  [value("i64", 1229782938247303441n)],
);

// ./test/core/threads/atomic.wast:199
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 72340172821233664n)]);

// ./test/core/threads/atomic.wast:201
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:202
assert_return(() => invoke($0, `i32.atomic.rmw8.and_u`, [0, -842150451]), [value("i32", 17)]);

// ./test/core/threads/atomic.wast:203
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303425n)]);

// ./test/core/threads/atomic.wast:205
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:206
assert_return(() => invoke($0, `i32.atomic.rmw16.and_u`, [0, -889271554]), [value("i32", 4369)]);

// ./test/core/threads/atomic.wast:207
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247299088n)]);

// ./test/core/threads/atomic.wast:209
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:210
assert_return(() => invoke($0, `i64.atomic.rmw8.and_u`, [0, 4774451407313060418n]), [value("i64", 17n)]);

// ./test/core/threads/atomic.wast:211
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303424n)]);

// ./test/core/threads/atomic.wast:213
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:214
assert_return(
  () => invoke($0, `i64.atomic.rmw16.and_u`, [0, -4688318750159552785n]),
  [value("i64", 4369n)],
);

// ./test/core/threads/atomic.wast:215
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303169n)]);

// ./test/core/threads/atomic.wast:217
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:218
assert_return(
  () => invoke($0, `i64.atomic.rmw32.and_u`, [0, -3838290751524198683n]),
  [value("i64", 286331153n)],
);

// ./test/core/threads/atomic.wast:219
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782937962086401n)]);

// ./test/core/threads/atomic.wast:223
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:224
assert_return(() => invoke($0, `i32.atomic.rmw.or`, [0, 305419896]), [value("i32", 286331153)]);

// ./test/core/threads/atomic.wast:225
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938283235193n)]);

// ./test/core/threads/atomic.wast:227
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:228
assert_return(
  () => invoke($0, `i64.atomic.rmw.or`, [0, 72340172854919682n]),
  [value("i64", 1229782938247303441n)],
);

// ./test/core/threads/atomic.wast:229
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938280989459n)]);

// ./test/core/threads/atomic.wast:231
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:232
assert_return(() => invoke($0, `i32.atomic.rmw8.or_u`, [0, -842150451]), [value("i32", 17)]);

// ./test/core/threads/atomic.wast:233
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303645n)]);

// ./test/core/threads/atomic.wast:235
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:236
assert_return(() => invoke($0, `i32.atomic.rmw16.or_u`, [0, -889271554]), [value("i32", 4369)]);

// ./test/core/threads/atomic.wast:237
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247355391n)]);

// ./test/core/threads/atomic.wast:239
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:240
assert_return(() => invoke($0, `i64.atomic.rmw8.or_u`, [0, 4774451407313060418n]), [value("i64", 17n)]);

// ./test/core/threads/atomic.wast:241
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303507n)]);

// ./test/core/threads/atomic.wast:243
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:244
assert_return(
  () => invoke($0, `i64.atomic.rmw16.or_u`, [0, -4688318750159552785n]),
  [value("i64", 4369n)],
);

// ./test/core/threads/atomic.wast:245
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247348223n)]);

// ./test/core/threads/atomic.wast:247
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:248
assert_return(
  () => invoke($0, `i64.atomic.rmw32.or_u`, [0, -3838290751524198683n]),
  [value("i64", 286331153n)],
);

// ./test/core/threads/atomic.wast:249
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782941647484917n)]);

// ./test/core/threads/atomic.wast:253
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:254
assert_return(() => invoke($0, `i32.atomic.rmw.xor`, [0, 305419896]), [value("i32", 286331153)]);

// ./test/core/threads/atomic.wast:255
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938013747049n)]);

// ./test/core/threads/atomic.wast:257
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:258
assert_return(
  () => invoke($0, `i64.atomic.rmw.xor`, [0, 72340172854919682n]),
  [value("i64", 1229782938247303441n)],
);

// ./test/core/threads/atomic.wast:259
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1157442765459755795n)]);

// ./test/core/threads/atomic.wast:261
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:262
assert_return(() => invoke($0, `i32.atomic.rmw8.xor_u`, [0, -842150451]), [value("i32", 17)]);

// ./test/core/threads/atomic.wast:263
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303644n)]);

// ./test/core/threads/atomic.wast:265
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:266
assert_return(() => invoke($0, `i32.atomic.rmw16.xor_u`, [0, -889271554]), [value("i32", 4369)]);

// ./test/core/threads/atomic.wast:267
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247355375n)]);

// ./test/core/threads/atomic.wast:269
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:270
assert_return(() => invoke($0, `i64.atomic.rmw8.xor_u`, [0, 4774451407313060418n]), [value("i64", 17n)]);

// ./test/core/threads/atomic.wast:271
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303507n)]);

// ./test/core/threads/atomic.wast:273
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:274
assert_return(
  () => invoke($0, `i64.atomic.rmw16.xor_u`, [0, -4688318750159552785n]),
  [value("i64", 4369n)],
);

// ./test/core/threads/atomic.wast:275
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247344126n)]);

// ./test/core/threads/atomic.wast:277
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:278
assert_return(
  () => invoke($0, `i64.atomic.rmw32.xor_u`, [0, -3838290751524198683n]),
  [value("i64", 286331153n)],
);

// ./test/core/threads/atomic.wast:279
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782941646370804n)]);

// ./test/core/threads/atomic.wast:283
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:284
assert_return(() => invoke($0, `i32.atomic.rmw.xchg`, [0, 305419896]), [value("i32", 286331153)]);

// ./test/core/threads/atomic.wast:285
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938266392184n)]);

// ./test/core/threads/atomic.wast:287
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:288
assert_return(
  () => invoke($0, `i64.atomic.rmw.xchg`, [0, 72340172854919682n]),
  [value("i64", 1229782938247303441n)],
);

// ./test/core/threads/atomic.wast:289
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 72340172854919682n)]);

// ./test/core/threads/atomic.wast:291
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:292
assert_return(() => invoke($0, `i32.atomic.rmw8.xchg_u`, [0, -842150451]), [value("i32", 17)]);

// ./test/core/threads/atomic.wast:293
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303629n)]);

// ./test/core/threads/atomic.wast:295
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:296
assert_return(() => invoke($0, `i32.atomic.rmw16.xchg_u`, [0, -889271554]), [value("i32", 4369)]);

// ./test/core/threads/atomic.wast:297
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247351038n)]);

// ./test/core/threads/atomic.wast:299
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:300
assert_return(
  () => invoke($0, `i64.atomic.rmw8.xchg_u`, [0, 4774451407313060418n]),
  [value("i64", 17n)],
);

// ./test/core/threads/atomic.wast:301
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303490n)]);

// ./test/core/threads/atomic.wast:303
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:304
assert_return(
  () => invoke($0, `i64.atomic.rmw16.xchg_u`, [0, -4688318750159552785n]),
  [value("i64", 4369n)],
);

// ./test/core/threads/atomic.wast:305
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247347951n)]);

// ./test/core/threads/atomic.wast:307
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:308
assert_return(
  () => invoke($0, `i64.atomic.rmw32.xchg_u`, [0, -3838290751524198683n]),
  [value("i64", 286331153n)],
);

// ./test/core/threads/atomic.wast:309
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782941362267877n)]);

// ./test/core/threads/atomic.wast:313
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:314
assert_return(() => invoke($0, `i32.atomic.rmw.cmpxchg`, [0, 0, 305419896]), [value("i32", 286331153)]);

// ./test/core/threads/atomic.wast:315
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303441n)]);

// ./test/core/threads/atomic.wast:317
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:318
assert_return(
  () => invoke($0, `i64.atomic.rmw.cmpxchg`, [0, 0n, 72340172854919682n]),
  [value("i64", 1229782938247303441n)],
);

// ./test/core/threads/atomic.wast:319
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303441n)]);

// ./test/core/threads/atomic.wast:321
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:322
assert_return(() => invoke($0, `i32.atomic.rmw8.cmpxchg_u`, [0, 0, -842150451]), [value("i32", 17)]);

// ./test/core/threads/atomic.wast:323
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303441n)]);

// ./test/core/threads/atomic.wast:325
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:326
assert_return(
  () => invoke($0, `i32.atomic.rmw8.cmpxchg_u`, [0, 286331153, -842150451]),
  [value("i32", 17)],
);

// ./test/core/threads/atomic.wast:327
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303629n)]);

// ./test/core/threads/atomic.wast:329
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:330
assert_return(() => invoke($0, `i32.atomic.rmw16.cmpxchg_u`, [0, 0, -889271554]), [value("i32", 4369)]);

// ./test/core/threads/atomic.wast:331
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303441n)]);

// ./test/core/threads/atomic.wast:333
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:334
assert_return(
  () => invoke($0, `i32.atomic.rmw16.cmpxchg_u`, [0, 286331153, -889271554]),
  [value("i32", 4369)],
);

// ./test/core/threads/atomic.wast:335
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247351038n)]);

// ./test/core/threads/atomic.wast:337
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:338
assert_return(
  () => invoke($0, `i64.atomic.rmw8.cmpxchg_u`, [0, 0n, 4774451407313060418n]),
  [value("i64", 17n)],
);

// ./test/core/threads/atomic.wast:339
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303441n)]);

// ./test/core/threads/atomic.wast:341
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:342
assert_return(
  () => invoke($0, `i64.atomic.rmw8.cmpxchg_u`, [
    0,
    1229782938247303441n,
    4774451407313060418n,
  ]),
  [value("i64", 17n)],
);

// ./test/core/threads/atomic.wast:343
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303490n)]);

// ./test/core/threads/atomic.wast:345
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:346
assert_return(
  () => invoke($0, `i64.atomic.rmw16.cmpxchg_u`, [0, 0n, -4688318750159552785n]),
  [value("i64", 4369n)],
);

// ./test/core/threads/atomic.wast:347
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303441n)]);

// ./test/core/threads/atomic.wast:349
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:350
assert_return(
  () => invoke($0, `i64.atomic.rmw16.cmpxchg_u`, [
    0,
    1229782938247303441n,
    -4688318750159552785n,
  ]),
  [value("i64", 4369n)],
);

// ./test/core/threads/atomic.wast:351
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247347951n)]);

// ./test/core/threads/atomic.wast:353
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:354
assert_return(
  () => invoke($0, `i64.atomic.rmw32.cmpxchg_u`, [0, 0n, -3838290751524198683n]),
  [value("i64", 286331153n)],
);

// ./test/core/threads/atomic.wast:355
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303441n)]);

// ./test/core/threads/atomic.wast:357
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:358
assert_return(
  () => invoke($0, `i64.atomic.rmw32.cmpxchg_u`, [
    0,
    1229782938247303441n,
    -3838290751524198683n,
  ]),
  [value("i64", 286331153n)],
);

// ./test/core/threads/atomic.wast:359
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782941362267877n)]);

// ./test/core/threads/atomic.wast:363
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:364
assert_return(
  () => invoke($0, `i32.atomic.rmw.cmpxchg`, [0, 286331153, 305419896]),
  [value("i32", 286331153)],
);

// ./test/core/threads/atomic.wast:365
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938266392184n)]);

// ./test/core/threads/atomic.wast:367
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:368
assert_return(
  () => invoke($0, `i64.atomic.rmw.cmpxchg`, [
    0,
    1229782938247303441n,
    72340172854919682n,
  ]),
  [value("i64", 1229782938247303441n)],
);

// ./test/core/threads/atomic.wast:369
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 72340172854919682n)]);

// ./test/core/threads/atomic.wast:371
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:372
assert_return(() => invoke($0, `i32.atomic.rmw8.cmpxchg_u`, [0, 17, -842150451]), [value("i32", 17)]);

// ./test/core/threads/atomic.wast:373
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303629n)]);

// ./test/core/threads/atomic.wast:375
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:376
assert_return(
  () => invoke($0, `i32.atomic.rmw16.cmpxchg_u`, [0, 4369, -889271554]),
  [value("i32", 4369)],
);

// ./test/core/threads/atomic.wast:377
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247351038n)]);

// ./test/core/threads/atomic.wast:379
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:380
assert_return(
  () => invoke($0, `i64.atomic.rmw8.cmpxchg_u`, [0, 17n, 4774451407313060418n]),
  [value("i64", 17n)],
);

// ./test/core/threads/atomic.wast:381
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247303490n)]);

// ./test/core/threads/atomic.wast:383
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:384
assert_return(
  () => invoke($0, `i64.atomic.rmw16.cmpxchg_u`, [0, 4369n, -4688318750159552785n]),
  [value("i64", 4369n)],
);

// ./test/core/threads/atomic.wast:385
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782938247347951n)]);

// ./test/core/threads/atomic.wast:387
invoke($0, `init`, [1229782938247303441n]);

// ./test/core/threads/atomic.wast:388
assert_return(
  () => invoke($0, `i64.atomic.rmw32.cmpxchg_u`, [0, 286331153n, -3838290751524198683n]),
  [value("i64", 286331153n)],
);

// ./test/core/threads/atomic.wast:389
assert_return(() => invoke($0, `i64.atomic.load`, [0]), [value("i64", 1229782941362267877n)]);

// ./test/core/threads/atomic.wast:394
assert_trap(() => invoke($0, `i32.atomic.load`, [1]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:395
assert_trap(() => invoke($0, `i64.atomic.load`, [1]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:396
assert_trap(() => invoke($0, `i32.atomic.load16_u`, [1]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:397
assert_trap(() => invoke($0, `i64.atomic.load16_u`, [1]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:398
assert_trap(() => invoke($0, `i64.atomic.load32_u`, [1]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:399
assert_trap(() => invoke($0, `i32.atomic.store`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:400
assert_trap(() => invoke($0, `i64.atomic.store`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:401
assert_trap(() => invoke($0, `i32.atomic.store16`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:402
assert_trap(() => invoke($0, `i64.atomic.store16`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:403
assert_trap(() => invoke($0, `i64.atomic.store32`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:404
assert_trap(() => invoke($0, `i32.atomic.rmw.add`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:405
assert_trap(() => invoke($0, `i64.atomic.rmw.add`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:406
assert_trap(() => invoke($0, `i32.atomic.rmw16.add_u`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:407
assert_trap(() => invoke($0, `i64.atomic.rmw16.add_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:408
assert_trap(() => invoke($0, `i64.atomic.rmw32.add_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:409
assert_trap(() => invoke($0, `i32.atomic.rmw.sub`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:410
assert_trap(() => invoke($0, `i64.atomic.rmw.sub`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:411
assert_trap(() => invoke($0, `i32.atomic.rmw16.sub_u`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:412
assert_trap(() => invoke($0, `i64.atomic.rmw16.sub_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:413
assert_trap(() => invoke($0, `i64.atomic.rmw32.sub_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:414
assert_trap(() => invoke($0, `i32.atomic.rmw.and`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:415
assert_trap(() => invoke($0, `i64.atomic.rmw.and`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:416
assert_trap(() => invoke($0, `i32.atomic.rmw16.and_u`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:417
assert_trap(() => invoke($0, `i64.atomic.rmw16.and_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:418
assert_trap(() => invoke($0, `i64.atomic.rmw32.and_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:419
assert_trap(() => invoke($0, `i32.atomic.rmw.or`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:420
assert_trap(() => invoke($0, `i64.atomic.rmw.or`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:421
assert_trap(() => invoke($0, `i32.atomic.rmw16.or_u`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:422
assert_trap(() => invoke($0, `i64.atomic.rmw16.or_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:423
assert_trap(() => invoke($0, `i64.atomic.rmw32.or_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:424
assert_trap(() => invoke($0, `i32.atomic.rmw.xor`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:425
assert_trap(() => invoke($0, `i64.atomic.rmw.xor`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:426
assert_trap(() => invoke($0, `i32.atomic.rmw16.xor_u`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:427
assert_trap(() => invoke($0, `i64.atomic.rmw16.xor_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:428
assert_trap(() => invoke($0, `i64.atomic.rmw32.xor_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:429
assert_trap(() => invoke($0, `i32.atomic.rmw.xchg`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:430
assert_trap(() => invoke($0, `i64.atomic.rmw.xchg`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:431
assert_trap(() => invoke($0, `i32.atomic.rmw16.xchg_u`, [1, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:432
assert_trap(() => invoke($0, `i64.atomic.rmw16.xchg_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:433
assert_trap(() => invoke($0, `i64.atomic.rmw32.xchg_u`, [1, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:434
assert_trap(() => invoke($0, `i32.atomic.rmw.cmpxchg`, [1, 0, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:435
assert_trap(() => invoke($0, `i64.atomic.rmw.cmpxchg`, [1, 0n, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:436
assert_trap(() => invoke($0, `i32.atomic.rmw16.cmpxchg_u`, [1, 0, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:437
assert_trap(() => invoke($0, `i64.atomic.rmw16.cmpxchg_u`, [1, 0n, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:438
assert_trap(() => invoke($0, `i64.atomic.rmw32.cmpxchg_u`, [1, 0n, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:442
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.load") (param \$addr i32) (result i32) (i32.atomic.load align=1 (local.get \$addr)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:451
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.load") (param \$addr i32) (result i64) (i64.atomic.load align=1 (local.get \$addr)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:460
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.load16_u") (param \$addr i32) (result i32) (i32.atomic.load16_u align=1 (local.get \$addr)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:469
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.load16_u") (param \$addr i32) (result i64) (i64.atomic.load16_u align=1 (local.get \$addr)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:478
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.load32_u") (param \$addr i32) (result i64) (i64.atomic.load32_u align=1 (local.get \$addr)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:487
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.store") (param \$addr i32) (param \$value i32) (i32.atomic.store align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:496
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.store") (param \$addr i32) (param \$value i64) (i64.atomic.store align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:505
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.store16") (param \$addr i32) (param \$value i32) (i32.atomic.store16 align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:514
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.store16") (param \$addr i32) (param \$value i64) (i64.atomic.store16 align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:523
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.store32") (param \$addr i32) (param \$value i64) (i64.atomic.store32 align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:532
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw.add") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.add align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:541
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw.add") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.add align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:550
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw16.add_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.add_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:559
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw16.add_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.add_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:568
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw32.add_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.add_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:577
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw.sub") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.sub align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:586
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw.sub") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.sub align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:595
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw16.sub_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.sub_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:604
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw16.sub_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.sub_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:613
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw32.sub_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.sub_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:622
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw.and") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.and align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:631
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw.and") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.and align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:640
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw16.and_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.and_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:649
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw16.and_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.and_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:658
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw32.and_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.and_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:667
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw.or") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.or align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:676
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw.or") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.or align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:685
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw16.or_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.or_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:694
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw16.or_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.or_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:703
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw32.or_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.or_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:712
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw.xor") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.xor align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:721
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw.xor") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.xor align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:730
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw16.xor_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.xor_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:739
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw16.xor_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.xor_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:748
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw32.xor_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.xor_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:757
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw.xchg") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw.xchg align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:766
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw.xchg") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw.xchg align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:775
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw16.xchg_u") (param \$addr i32) (param \$value i32) (result i32) (i32.atomic.rmw16.xchg_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:784
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw16.xchg_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw16.xchg_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:793
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw32.xchg_u") (param \$addr i32) (param \$value i64) (result i64) (i64.atomic.rmw32.xchg_u align=1 (local.get \$addr) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:802
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw.cmpxchg") (param \$addr i32) (param \$expected i32) (param \$value i32) (result i32) (i32.atomic.rmw.cmpxchg align=1 (local.get \$addr) (local.get \$expected) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:811
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw.cmpxchg") (param \$addr i32) (param \$expected i64) (param \$value i64) (result i64) (i64.atomic.rmw.cmpxchg align=1 (local.get \$addr) (local.get \$expected) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:820
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i32.atomic.rmw16.cmpxchg_u") (param \$addr i32) (param \$expected i32) (param \$value i32) (result i32) (i32.atomic.rmw16.cmpxchg_u align=1 (local.get \$addr) (local.get \$expected) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:829
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw16.cmpxchg_u") (param \$addr i32) (param \$expected i64) (param \$value i64) (result i64) (i64.atomic.rmw16.cmpxchg_u align=1 (local.get \$addr) (local.get \$expected) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:838
assert_invalid(
  () => instantiate(`(module
    (memory 1 1 shared)

    (func (export "i64.atomic.rmw32.cmpxchg_u") (param \$addr i32) (param \$expected i64) (param \$value i64) (result i64) (i64.atomic.rmw32.cmpxchg_u align=1 (local.get \$addr) (local.get \$expected) (local.get \$value)))
  )`),
  `atomic alignment must be natural`,
);

// ./test/core/threads/atomic.wast:849
let $1 = instantiate(`(module
  (memory 1 1 shared)

  (func (export "init") (param \$value i64) (i64.store (i32.const 0) (local.get \$value)))

  (func (export "memory.atomic.notify") (param \$addr i32) (param \$count i32) (result i32)
      (memory.atomic.notify (local.get 0) (local.get 1)))
  (func (export "memory.atomic.wait32") (param \$addr i32) (param \$expected i32) (param \$timeout i64) (result i32)
      (memory.atomic.wait32 (local.get 0) (local.get 1) (local.get 2)))
  (func (export "memory.atomic.wait64") (param \$addr i32) (param \$expected i64) (param \$timeout i64) (result i32)
      (memory.atomic.wait64 (local.get 0) (local.get 1) (local.get 2)))
)`);

// ./test/core/threads/atomic.wast:862
invoke($1, `init`, [281474976710655n]);

// ./test/core/threads/atomic.wast:865
assert_return(() => invoke($1, `memory.atomic.wait32`, [0, 0, 0n]), [value("i32", 1)]);

// ./test/core/threads/atomic.wast:866
assert_return(() => invoke($1, `memory.atomic.wait64`, [0, 0n, 0n]), [value("i32", 1)]);

// ./test/core/threads/atomic.wast:869
assert_return(() => invoke($1, `memory.atomic.notify`, [0, 0]), [value("i32", 0)]);

// ./test/core/threads/atomic.wast:872
assert_trap(() => invoke($1, `memory.atomic.wait32`, [65536, 0, 0n]), `out of bounds memory access`);

// ./test/core/threads/atomic.wast:873
assert_trap(() => invoke($1, `memory.atomic.wait64`, [65536, 0n, 0n]), `out of bounds memory access`);

// ./test/core/threads/atomic.wast:876
assert_trap(() => invoke($1, `memory.atomic.notify`, [65536, 0]), `out of bounds memory access`);

// ./test/core/threads/atomic.wast:879
assert_trap(() => invoke($1, `memory.atomic.wait32`, [65531, 0, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:880
assert_trap(() => invoke($1, `memory.atomic.wait64`, [65524, 0n, 0n]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:882
assert_trap(() => invoke($1, `memory.atomic.notify`, [65531, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:885
let $2 = instantiate(`(module
  (memory 1 1)

  (func (export "init") (param \$value i64) (i64.store (i32.const 0) (local.get \$value)))

  (func (export "memory.atomic.notify") (param \$addr i32) (param \$count i32) (result i32)
      (memory.atomic.notify (local.get 0) (local.get 1)))
  (func (export "memory.atomic.wait32") (param \$addr i32) (param \$expected i32) (param \$timeout i64) (result i32)
      (memory.atomic.wait32 (local.get 0) (local.get 1) (local.get 2)))
  (func (export "memory.atomic.wait64") (param \$addr i32) (param \$expected i64) (param \$timeout i64) (result i32)
      (memory.atomic.wait64 (local.get 0) (local.get 1) (local.get 2)))
)`);

// ./test/core/threads/atomic.wast:898
invoke($2, `init`, [281474976710655n]);

// ./test/core/threads/atomic.wast:900
assert_trap(() => invoke($2, `memory.atomic.wait32`, [0, 0, 0n]), `expected shared memory`);

// ./test/core/threads/atomic.wast:901
assert_trap(() => invoke($2, `memory.atomic.wait64`, [0, 0n, 0n]), `expected shared memory`);

// ./test/core/threads/atomic.wast:904
assert_return(() => invoke($2, `memory.atomic.notify`, [0, 0]), [value("i32", 0)]);

// ./test/core/threads/atomic.wast:907
assert_trap(() => invoke($2, `memory.atomic.notify`, [65536, 0]), `out of bounds memory access`);

// ./test/core/threads/atomic.wast:908
assert_trap(() => invoke($2, `memory.atomic.notify`, [65531, 0]), `unaligned atomic`);

// ./test/core/threads/atomic.wast:911
let $3 = instantiate(`(module
  (memory 1 1)
  (func (drop (memory.atomic.notify (i32.const 0) (i32.const 0))))
  (func (drop (memory.atomic.wait32 (i32.const 0) (i32.const 0) (i64.const 0))))
  (func (drop (memory.atomic.wait64 (i32.const 0) (i64.const 0) (i64.const 0))))
  (func (drop (i32.atomic.load (i32.const 0))))
  (func (drop (i64.atomic.load (i32.const 0))))
  (func (drop (i32.atomic.load16_u (i32.const 0))))
  (func (drop (i64.atomic.load16_u (i32.const 0))))
  (func (drop (i64.atomic.load32_u (i32.const 0))))
  (func       (i32.atomic.store (i32.const 0) (i32.const 0)))
  (func       (i64.atomic.store (i32.const 0) (i64.const 0)))
  (func       (i32.atomic.store16 (i32.const 0) (i32.const 0)))
  (func       (i64.atomic.store16 (i32.const 0) (i64.const 0)))
  (func       (i64.atomic.store32 (i32.const 0) (i64.const 0)))
  (func (drop (i32.atomic.rmw.add (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw.add (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw16.add_u (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw16.add_u (i32.const 0) (i64.const 0))))
  (func (drop (i64.atomic.rmw32.add_u (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw.sub (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw.sub (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw16.sub_u (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw16.sub_u (i32.const 0) (i64.const 0))))
  (func (drop (i64.atomic.rmw32.sub_u (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw.and (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw.and (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw16.and_u (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw16.and_u (i32.const 0) (i64.const 0))))
  (func (drop (i64.atomic.rmw32.and_u (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw.or (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw.or (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw16.or_u (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw16.or_u (i32.const 0) (i64.const 0))))
  (func (drop (i64.atomic.rmw32.or_u (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw.xor (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw.xor (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw16.xor_u (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw16.xor_u (i32.const 0) (i64.const 0))))
  (func (drop (i64.atomic.rmw32.xor_u (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw.xchg (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw.xchg (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw16.xchg_u (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw16.xchg_u (i32.const 0) (i64.const 0))))
  (func (drop (i64.atomic.rmw32.xchg_u (i32.const 0) (i64.const 0))))
  (func (drop (i32.atomic.rmw.cmpxchg (i32.const 0) (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw.cmpxchg (i32.const 0) (i64.const 0)  (i64.const 0))))
  (func (drop (i32.atomic.rmw16.cmpxchg_u (i32.const 0) (i32.const 0) (i32.const 0))))
  (func (drop (i64.atomic.rmw16.cmpxchg_u (i32.const 0) (i64.const 0) (i64.const 0))))
  (func (drop (i64.atomic.rmw32.cmpxchg_u (i32.const 0) (i64.const 0) (i64.const 0))))
)`);

// ./test/core/threads/atomic.wast:964
let $4 = instantiate(`(module
  (func (export "fence") (atomic.fence))
)`);

// ./test/core/threads/atomic.wast:968
assert_return(() => invoke($4, `fence`, []), []);

// ./test/core/threads/atomic.wast:971
assert_invalid(
  () => instantiate(`(module (func (drop (memory.atomic.notify (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:972
assert_invalid(
  () => instantiate(`(module (func (drop (memory.atomic.wait32 (i32.const 0) (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:973
assert_invalid(
  () => instantiate(`(module (func (drop (memory.atomic.wait64 (i32.const 0) (i64.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:974
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.load (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:975
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.load (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:976
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.load16_u (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:977
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.load16_u (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:978
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.load32_u (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:979
assert_invalid(
  () => instantiate(`(module (func       (i32.atomic.store (i32.const 0) (i32.const 0))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:980
assert_invalid(
  () => instantiate(`(module (func       (i64.atomic.store (i32.const 0) (i64.const 0))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:981
assert_invalid(
  () => instantiate(`(module (func       (i32.atomic.store16 (i32.const 0) (i32.const 0))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:982
assert_invalid(
  () => instantiate(`(module (func       (i64.atomic.store16 (i32.const 0) (i64.const 0))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:983
assert_invalid(
  () => instantiate(`(module (func       (i64.atomic.store32 (i32.const 0) (i64.const 0))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:984
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw.add (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:985
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw.add (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:986
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw16.add_u (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:987
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw16.add_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:988
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw32.add_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:989
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw.sub (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:990
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw.sub (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:991
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw16.sub_u (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:992
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw16.sub_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:993
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw32.sub_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:994
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw.and (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:995
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw.and (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:996
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw16.and_u (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:997
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw16.and_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:998
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw32.and_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:999
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw.or (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1000
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw.or (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1001
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw16.or_u (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1002
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw16.or_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1003
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw32.or_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1004
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw.xor (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1005
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw.xor (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1006
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw16.xor_u (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1007
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw16.xor_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1008
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw32.xor_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1009
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw.xchg (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1010
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw.xchg (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1011
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw16.xchg_u (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1012
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw16.xchg_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1013
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw32.xchg_u (i32.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1014
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw.cmpxchg (i32.const 0) (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1015
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw.cmpxchg (i32.const 0) (i64.const 0)  (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1016
assert_invalid(
  () => instantiate(`(module (func (drop (i32.atomic.rmw16.cmpxchg_u (i32.const 0) (i32.const 0) (i32.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1017
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw16.cmpxchg_u (i32.const 0) (i64.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

// ./test/core/threads/atomic.wast:1018
assert_invalid(
  () => instantiate(`(module (func (drop (i64.atomic.rmw32.cmpxchg_u (i32.const 0) (i64.const 0) (i64.const 0)))))`),
  `unknown memory`,
);

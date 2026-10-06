// |reftest| shell-option(--enable-iterator-join) skip-if(!Iterator.prototype.join||!xulRuntime.shell) -- Iterator.prototype.join is not enabled unconditionally, requires shell-options
// Copyright (C) 2025 Kevin Gibbons. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-iterator.prototype.join
description: Iterator.prototype.join throws if the receiver is not an object.
features: [Iterator.prototype.join]
---*/

var it = [].values();

assert.throws(TypeError, function () {
  it.join.call(undefined);
});

assert.throws(TypeError, function () {
  it.join.call(null);
});

assert.throws(TypeError, function () {
  it.join.call(false);
});

assert.throws(TypeError, function () {
  it.join.call(0);
});

assert.throws(TypeError, function () {
  it.join.call(0n);
});

assert.throws(TypeError, function () {
  it.join.call("");
});

assert.throws(TypeError, function () {
  it.join.call(Symbol());
});

reportCompare(0, 0);

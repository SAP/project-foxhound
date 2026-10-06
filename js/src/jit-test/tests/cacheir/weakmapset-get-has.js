function testBasicWeakMap() {
  var objs = [{}, Math, this, [], {}];
  var wm = new WeakMap();
  for (var i = 0; i < objs.length - 1; i++) {
    wm.set(objs[i], i);
  }
  var res = 0;
  for (var i = 0; i < 100; i++) {
    var idx = i % objs.length;
    var obj = objs[idx];
    if (wm.has(obj)) {
      assertEq(idx < 4, true);
      res += wm.get(obj);
      wm.set(obj, wm.get(obj) + 1);
    } else {
      assertEq(idx, 4);
      assertEq(wm.get(obj), undefined);
    }
  }
  assertEq(res, 880);
}
testBasicWeakMap();

function testBasicWeakSet() {
  var objs = [{}, Math, this, [], {}];
  var ws = new WeakSet();
  for (var i = 0; i < objs.length - 1; i++) {
    ws.add(objs[i]);
  }
  for (var i = 0; i < 100; i++) {
    var idx = i % objs.length;
    var obj = objs[idx];
    assertEq(ws.has(obj), idx < 4);
  }
}
testBasicWeakSet();

function testWeakMapKeyGuard() {
  var obj1 = {}, obj2 = {};
  var wm = new WeakMap([[obj1, obj2]]);
  var arr = [obj1, "foo"];
  for (var i = 0; i < 100; i++) {
    var key = arr[(i >= 95) | 0];
    var val = wm.get(key);
    assertEq(val, i < 95 ? obj2 : undefined);
    var has = wm.has(key);
    assertEq(has, i < 95);
  }
}
testWeakMapKeyGuard();

function testWeakSetKeyGuard() {
  var obj1 = {};
  var ws = new WeakSet([obj1]);
  var arr = [obj1, "foo"];
  for (var i = 0; i < 100; i++) {
    var key = arr[(i >= 95) | 0];
    var has = ws.has(key);
    assertEq(has, i < 95);
  }
}
testWeakSetKeyGuard();

function testWeakMapThisGuard() {
  var obj1 = {}, obj2 = {};
  var wm = new WeakMap([[obj1, obj2]]);
  var arr = [wm, {get: WeakMap.prototype.get}];
  for (var i = 0; i < 100; i++) {
    var m = arr[(i >= 95) | 0];
    var threw = false;
    try {
      assertEq(m.get(obj1), obj2);
    } catch (e) {
      threw = true;
    }
    assertEq(threw, i >= 95);
  }
}
testWeakMapThisGuard();

function testWeakSetThisGuard() {
  var obj1 = {};
  var ws = new WeakSet([obj1]);
  var arr = [ws, {has: WeakSet.prototype.has}];
  for (var i = 0; i < 100; i++) {
    var s = arr[(i >= 95) | 0];
    var threw = false;
    try {
      assertEq(s.has(obj1), true);
    } catch (e) {
      threw = true;
    }
    assertEq(threw, i >= 95);
  }
}
testWeakSetThisGuard();

function testWeakMapEmptyGet() {
  var obj = {};
  var wm1 = new WeakMap([[obj, 1]]);
  var wm2 = new WeakMap();
  function get(wm) { return wm.get(obj); }
  for (var i = 0; i < 100; i++) {
    var val = get(i < 95 ? wm1 : wm2);
    assertEq(val, i < 95 ? 1 : undefined);
  }
}
testWeakMapEmptyGet();

function testWeakMapEmptyHas() {
  var obj = {};
  var wm1 = new WeakMap([[obj, 1]]);
  var wm2 = new WeakMap();
  function has(wm) { return wm.has(obj); }
  for (var i = 0; i < 100; i++) {
    var val = has(i < 95 ? wm1 : wm2);
    assertEq(val, i < 95);
  }
}
testWeakMapEmptyHas();

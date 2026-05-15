// Test calling an inlinable native accessor property as a normal function.

// Set.prototype.size is an inlinable getter accessor.
var SetSize = Object.getOwnPropertyDescriptor(Set.prototype, "size").get;

// Install "size" getter as a normal method on Set.prototype.
Set.prototype.getSize = SetSize;

var sets = [
  new Set(),
  new Set([1, 2, 3]),
];

// Call inlinable accessor as normal method.
function testInlinableAccessorAsMethod() {
  for (var i = 0; i < 100; ++i) {
    var set = sets[i & 1];
    assertEq(set.getSize(), set.size);
  }
}
testInlinableAccessorAsMethod();

// Call inlinable accessor as through FunCall.
function testInlinableAccessorWithFunCall() {
  for (var i = 0; i < 100; ++i) {
    var set = sets[i & 1];
    assertEq(SetSize.call(set), set.size);
  }
}
testInlinableAccessorWithFunCall();

// Call inlinable accessor as through FunApply.
function testInlinableAccessorWithFunApply() {
  for (var i = 0; i < 100; ++i) {
    var set = sets[i & 1];
    assertEq(SetSize.apply(set), set.size);
  }
}
testInlinableAccessorWithFunApply();

// Call inlinable accessor as through bound FunCall.
function testInlinableAccessorWithBoundFunCall() {
  var callSetSize = Function.prototype.call.bind(SetSize);

  for (var i = 0; i < 100; ++i) {
    var set = sets[i & 1];
    assertEq(callSetSize(set), set.size);
  }
}
testInlinableAccessorWithBoundFunCall();

// Call inlinable accessor as through bound FunCall.
function testInlinableAccessorWithBoundFunApply() {
  var applySetSize = Function.prototype.apply.bind(SetSize);

  for (var i = 0; i < 100; ++i) {
    var set = sets[i & 1];
    assertEq(applySetSize(set), set.size);
  }
}
testInlinableAccessorWithBoundFunApply();

// Call inlinable accessor as bound function.
function testBoundInlinableAccessor() {
  var boundSetSize = SetSize.bind(sets[0]);

  for (var i = 0; i < 100; ++i) {
    assertEq(boundSetSize(), sets[0].size);
  }
}
testBoundInlinableAccessor();

// Call inlinable accessor as bound function through FunCall.
function testBoundInlinableAccessorWithFunCall() {
  var boundSetSize = SetSize.bind(sets[0]);

  for (var i = 0; i < 100; ++i) {
    assertEq(boundSetSize.call(), sets[0].size);
  }
}
testBoundInlinableAccessorWithFunCall();

// Call inlinable accessor as bound function through FunApply.
function testBoundInlinableAccessorWithFunApply() {
  var boundSetSize = SetSize.bind(sets[0]);

  for (var i = 0; i < 100; ++i) {
    assertEq(boundSetSize.apply(), sets[0].size);
  }
}
testInlinableAccessorWithBoundFunApply();

var calls = 0;
function retFn() {
  calls++;
  return {};
}
function nextFn() {
  return {done: false, value: 0};
}
function makeIter(i) {
  var it = {};
  for (var j = 0; j < 16; j++) {
    it["q" + i + "_" + j] = j;
  }
  it.return = retFn;
  it.next = nextFn;
  return it;
}

function test() {
  var iters = [];
  for (var i = 0; i < 12; i++) {
    iters.push(makeIter(i));
  }

  var cur = null;
  var iterable = {[Symbol.iterator]() {return cur;} };
  var close = function(it) {
    cur = it; 
    for (var x of iterable) {
      break;
    }
  };

  for (var round = 0; round < 20; round++) {
    for (var i = 0; i < iters.length; i++) {
      close(iters[i]);
    }
  }

  var evil = Object.create(null);
  for (var j = 0; j < 24; j++) {
    evil["e" + j] = (j >= 8) ? retFn : j;
  }
  evil.next = nextFn;

  var before = calls;
  close(evil);
  close(evil);
  assertEq(calls, before);
}
test();
test();

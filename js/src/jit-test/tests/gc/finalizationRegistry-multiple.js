// Check we get the semantics right when registering the same target multiple
// times and when unregister tokens die before the registry.

gczeal(0);

let vs = [];
let r = new FinalizationRegistry(v => vs.push(v));
let t;

function check(n) {
  gc();
  drainJobQueue();
  assertEq(vs.length, n);
  vs = vs.sort();
  for (let i = 0; i < n; i++) {
    assertEq(vs[i], i);
  }
  vs = [];
}

// No token.

t = {};
r.register(t, 0);
r.register(t, 1);
check(0);
t = undefined;
check(2);

// One token.

t = {};
let k = {};
r.register(t, 0, k);
r.register(t, 1, k);
check(0);
k = undefined;
check(0);
t = undefined;
check(2);

// Two tokens.

t = {};
let k1 = {};
let k2 = {};
r.register(t, 0, k1);
r.register(t, 1, k1);
r.register(t, 2, k2);
r.register(t, 3, k2);
check(0);
t = undefined;
check(4);

// Two tokens with unregister.

t = {};
k1 = {};
k2 = {};
r.register(t, 0, k1);
r.register(t, 1, k1);
r.register(t, 2, k2);
r.register(t, 3, k2);
check(0);
r.unregister(k2);
check(0);
k1 = undefined;
check(0);
t = undefined;
check(2);

// |jit-test| --fast-warmup; --no-threads

// Ensure the profiler doesn't get confused about a private instance accessor
// (get #x() {...}) and its parser-synthesized private-method-initializer lambda
// because these share the same scriptSource/toStringStart/toStringEnd.

enableGeckoProfilingWithSlowAssertions();

let a = 0;

class C {
  get #x() {
    a += 1; a += 2; a += 3; a += 4; a += 5;
    a += 1; a += 2; a += 3; a += 4; a += 5;
    a += 1; a += 2; a += 3; a += 4; a += 5;
    a += 1; a += 2; a += 3; a += 4; a += 5;
    readGeckoProfilingStack();
    return a;
  }
  constructor() {
    this.y = 1;
  }
  read() {
    return this.#x;
  }
}

function test() {
  let c = new C();
  for (let i = 0; i < 100; i++) {
    c.read();
    c = new C();
  }
  assertEq(a, 6000);
}
test();

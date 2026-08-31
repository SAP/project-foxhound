function f(x) {
  function g() {
    async function* h() {
      return x;
    }
    h().next();
    return interruptTest(g, { expectExceptionOnFailure: false });
  }
  g();
}
Object.setPrototypeOf(
  f,
  new Proxy([], {
    get() {},
  }),
);
f(f);

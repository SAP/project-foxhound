// |jit-test| --setpref=experimental.self_hosted_cache=true

a = `
  b = newGlobal().evaluate("grayRoot()");
  b += undefined;
  gc();
`;
for (let i = 0; i < 20; ++i) {
  evaluate("");
  evaluate(a);
}

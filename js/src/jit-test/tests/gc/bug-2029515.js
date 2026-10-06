// |jit-test| --no-ggc
for (let i = 0; i < 100; i++) {
  let a = new Uint8Array(100);
}

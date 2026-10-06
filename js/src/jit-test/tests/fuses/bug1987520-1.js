function test() {
  for (let i = 0; i < 50; i++) {
    let o = {};
    globalVar = o;
    assertEq(globalVar, o);
    if (i === 40)
      delete this.globalVar;
  }
}
test();

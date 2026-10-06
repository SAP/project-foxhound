function test(obj) {
	var keys = Object.keys(obj);
	keys.test = {foo: 42};
	for (var i = 0; i < keys.test; i++) {}
};

let obj = {a:0, b: 1, c: 2};
with ({}) {}
for (var i = 0; i < 2000; i++) {
  test(obj);
}

function bar(o, trigger) {
    with ({}) {}
    if (trigger) {
	Object.defineProperty(o, "y", {
	    get() { return 3; }
	});
    }
}

function foo(o, trigger) {
    var result;
    for (var key in o) {
	result = o[key];
	bar(o, trigger);
    }
    return result;
}

function foo2(o, trigger) {
    var result;
      var keys = Object.keys(o);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        result = o[key];
        bar(o, trigger);
    }
    return result;
}

var arr = [];
for (var i = 0; i < 10; i++) {
    arr.push({["x" + i]: 0, y: 0});
}

with ({}) {}
for (var i = 0; i < 1000; i++) {
    for (var o of arr) {
    foo(o, false)
	foo2(o, false)
    }
}
print(foo(arr[0], true));
print(foo2(arr[0], true));

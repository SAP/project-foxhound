load(libdir + "asserts.js");

assertErrorMessage(() => RegExp.prototype.test.call({}), TypeError,
                   /RegExp.prototype.test called on incompatible receiver: Object/);
assertErrorMessage(() => RegExp.prototype[Symbol.match].call([]), TypeError,
                   /RegExp.prototype.\[Symbol\.match\] called on incompatible receiver: Array/);
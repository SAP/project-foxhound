function test() {
    var sym = Symbol();
    for (var i = 0; i < 100; i++) {
        var obj = newObjectWithAddPropertyHook();
        assertEq(obj._propertiesAdded, 0);
        obj.x = 1;
        obj.y = 2;
        obj.z = 3;
        obj[sym] = 4;
        obj[0] = 1;
        obj[1234567] = 1;
        assertEq(obj._propertiesAdded, 6);
        assertEq(obj.x, 1);
        assertEq(obj[sym], 4);
        assertEq(obj[0], 1);
        // The _propertiesAdded property must be non-configurable to prevent
        // redefining as an accessor property.
        assertEq(Object.getOwnPropertyDescriptor(obj, "_propertiesAdded").configurable, false);
    }
}
test();

function testNotCalledOnRedefine() {
    for (var i = 0; i < 100; i++) {
        var obj = newObjectWithAddPropertyHook();
        assertEq(obj._propertiesAdded, 0);
        obj.x = 1;
        obj.y = 2;
        obj[0] = 1;
        obj[1] = 2;
        Object.defineProperty(obj, "z", {get: () => 1, configurable: true});
        assertEq(obj._propertiesAdded, 5);
        Object.defineProperty(obj, "x", {writable: false, configurable: true});
        Object.defineProperty(obj, 0, {writable: false, configurable: true});
        Object.defineProperty(obj, "z", {configurable: false});
        assertEq(obj._propertiesAdded, 5);
    }
}
testNotCalledOnRedefine();

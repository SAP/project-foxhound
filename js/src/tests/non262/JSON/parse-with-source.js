// |reftest| shell-option(--enable-json-parse-with-source) skip-if(!JSON.hasOwnProperty('isRawJSON')||!xulRuntime.shell)

(function checkJSONParseWithSource() {
    var actual;

    function reviver(key, value, context) {
        assertEq(arguments.length, 3);
        if ("source" in context) {
            actual.push(context["source"]);
        } else { // objects and arrays have no "source"
            actual.push(null);
        }
    }

    let tests = [
        // STRINGS
        {input: '""', expected: ['""']},
        {input: '"str"', expected: ['"str"']},
        {input: '"str" ', expected: ['"str"']},
        {input: ' "str" ', expected: ['"str"']},
        {input: ' " str"', expected: ['" str"']},
        {input: '"\uD83D\uDE0A\u2764\u2FC1"', expected: ['"\uD83D\uDE0A\u2764\u2FC1"']},
        // NUMBERS
        {input: '1', expected: ['1']},
        {input: ' 1', expected: ['1']},
        {input: '4.2', expected: ['4.2']},
        {input: '4.2 ', expected: ['4.2']},
        {input: '4.2000 ', expected: ['4.2000']},
        {input: '4e2000 ', expected: ['4e2000']},
        {input: '4.4e2000 ', expected: ['4.4e2000']},
        {input: '9007199254740999', expected: ['9007199254740999']},
        {input: '-31', expected: ['-31']},
        {input: '-3.1', expected: ['-3.1']},
        {input: ' -31 ', expected: ['-31']},
        // BOOLEANS
        {input: 'true', expected: ['true']},
        {input: 'true ', expected: ['true']},
        {input: 'false', expected: ['false']},
        {input: ' false', expected: ['false']},
        // NULL
        {input: 'null', expected: ['null']},
        {input: ' null', expected: ['null']},
        {input: '\tnull ', expected: ['null']},
        {input: 'null\t', expected: ['null']},
        // OBJECTS
        {input: '{ }', expected: [null]},
        {input: '{ "4": 1 }', expected: ['1', null]},
        {input: '{ "a": 1 }', expected: ['1', null]},
        {input: '{ "b": 2, "a": 1 }', expected: ['2', '1', null]},
        {input: '{ "b": 2, "1": 1 }', expected: ['1', '2', null]},
        {input: '{ "b": 2, "c": null }', expected: ['2', 'null', null]},
        {input: '{ "b": 2, "b": 1, "b": 4 }', expected: ['4', null]},
        {input: '{ "b": 2, "a": "1" }', expected: ['2', '"1"', null]},
        {input: '{ "b": { "c": 3 }, "a": 1 }', expected: ['3', null, '1', null]},
        // ARRAYS
        {input: '[]', expected: [null]},
        {input: '[1, 5, 2]', expected: ['1', '5', '2', null]},
        {input: '[1, null, 2]', expected: ['1', 'null', '2', null]},
        {input: '[1, {"a":2}, "7"]', expected: ['1', '2', null, '"7"', null]},
        {input: '[1, [2, [3, [4, 5], [6, 7], 8], 9], 10]', expected: ['1', '2', '3', '4', '5', null, '6', '7', null, '8', null, '9', null, '10', null]},
        {input: '[1, [2, [3, [4, 5, 6, 7, 8, 9, 10], []]]]', expected: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', null, null, null, null, null]},
        {input: '{"a": [1, {"b":2}, "7"], "c": 8}', expected: ['1', '2', null, '"7"', null, '8', null]},
    ];
    for (const test of tests) {
        actual = [];
        JSON.parse(test.input, reviver);
        assertEqArray(actual, test.expected);
    }

    // If the constructed object is modified but the result of the modification is
    // the same as the original, we should still provide the source
    function replace_c_with_same_val(key, value, context) {
        if (key === "a") {
            this["c"] = "ABCDEABCDE";
        }
        if (key) {
            assertEq("source" in context, true);
        }
        return value;
    }
    JSON.parse('{ "a": "b", "c": "ABCDEABCDE" }', replace_c_with_same_val);
})();

(function checkRawJSON() {
    function assertIsRawJson(rawJson, expectedRawJsonValue) {
        assertEq(null, Object.getPrototypeOf(rawJson));
        assertEq(true, Object.hasOwn(rawJson, 'rawJSON'));
        assertDeepEq(['rawJSON'], Object.keys(rawJson));
        assertDeepEq(['rawJSON'], Object.getOwnPropertyNames(rawJson));
        assertDeepEq([], Object.getOwnPropertySymbols(rawJson));
        assertEq(expectedRawJsonValue, rawJson.rawJSON);
    }

    assertEq(true, Object.isFrozen(JSON.rawJSON('"shouldBeFrozen"')));
    assertThrowsInstanceOf(() => JSON.rawJSON(), SyntaxError);
    assertIsRawJson(JSON.rawJSON(1, 2), '1');
})();

(function checkIsRawJSON() {
    assertEq(false, JSON.isRawJSON());
    assertEq(false, JSON.isRawJSON({}, {}));
    assertEq(false, JSON.isRawJSON({}, JSON.rawJSON(2)));
    assertEq(true, JSON.isRawJSON(JSON.rawJSON(1), JSON.rawJSON(2)));
})();

(function checkCrossCompartmentWrappers() {
    var gbl = newGlobal({newCompartment: true});

    // the created context object should be wrapped in this compartment
    gbl.eval("context = JSON.parse('4.0', (k,v,context) => context);");
    assertEq(isCCW(gbl.context), true);
    // an object created in the reviver function should be wrapped in this compartment
    gbl.eval("sourceV = JSON.parse('4.0', (k,v,context) => { return {}; });");
    assertEq(isCCW(gbl.sourceV), true);

    // objects created by a reviver in this compartment should be wrapped in
    // the other compartment
    gbl.rev = (k,v,c) => { return {v}};
    gbl.eval("v2 = JSON.parse('4.0', rev);");
    assertEq(gbl.eval("isCCW(v2)"), true);

    gbl.eval("objCCW = {};");
    assertEq(JSON.isRawJSON(gbl.objCCW), false, "isRawJSON() should accept CCW arguments");
    rawJSONCCW = gbl.eval("JSON.rawJSON(455);");
    assertEq(JSON.isRawJSON(rawJSONCCW), true, "isRawJSON() should return true for wrapped rawJSON objects");

    assertEq(rawJSONCCW.rawJSON, "455", "rawJSON object enumerable property should be visible through CCW");

    objWithCCW = { ccw: rawJSONCCW, raw: JSON.rawJSON(true) };
    assertEq(JSON.stringify(objWithCCW), '{"ccw":455,"raw":true}');
    assertEq(isCCW(rawJSONCCW), true);
})();

(function checkUseAsPrototype() {
    var p = JSON.rawJSON(false);
    var obj = { a: "hi" };
    Object.setPrototypeOf(obj, p);
    assertDeepEq(obj.rawJSON, "false");
})();

(function checkErrorsComeFromCorrectRealm() {
    const otherGlobal = newGlobal({newCompartment: true});
    assertEq(TypeError !== otherGlobal.TypeError, true);

    assertErrorComesFromCorrectRealm = (fun, thisRealmType) => {
        assertThrowsInstanceOf(() => fun(this), thisRealmType,
            `${thisRealmType.name} should come from this realm.`);
        assertThrowsInstanceOf(() => fun(otherGlobal), otherGlobal[thisRealmType.name],
            `${thisRealmType.name} should come from the other realm.`);
    }

    otherGlobal.eval('obj = {}');

    assertErrorComesFromCorrectRealm((gbl) => gbl.JSON.rawJSON(Symbol('123')), TypeError);
    assertErrorComesFromCorrectRealm((gbl) => gbl.JSON.rawJSON(undefined), SyntaxError);
    assertErrorComesFromCorrectRealm((gbl) => gbl.JSON.rawJSON({}), SyntaxError);
    assertErrorComesFromCorrectRealm((gbl) => gbl.JSON.rawJSON(otherGlobal.obj), SyntaxError);
    assertErrorComesFromCorrectRealm((gbl) => gbl.JSON.rawJSON([]), SyntaxError);
    assertErrorComesFromCorrectRealm((gbl) => gbl.JSON.rawJSON('123\n'), SyntaxError);
    assertErrorComesFromCorrectRealm((gbl) => gbl.JSON.rawJSON('\t123'), SyntaxError);
    assertErrorComesFromCorrectRealm((gbl) => gbl.JSON.rawJSON(''), SyntaxError);
})();

if (typeof reportCompare == 'function')
    reportCompare(0, 0);
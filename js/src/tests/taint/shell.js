/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Token to indicate the end of a string.
var STR_END = -1;

if (typeof assertDeepEq === 'undefined') {
    var assertDeepEq = (function(){
        var call = Function.prototype.call,
            Array_isArray = Array.isArray,
            Map_ = Map,
            Error_ = Error,
            Symbol_ = Symbol,
            Map_has = call.bind(Map.prototype.has),
            Map_get = call.bind(Map.prototype.get),
            Map_set = call.bind(Map.prototype.set),
            Object_toString = call.bind(Object.prototype.toString),
            Function_toString = call.bind(Function.prototype.toString),
            Object_getPrototypeOf = Object.getPrototypeOf,
            Object_hasOwnProperty = call.bind(Object.prototype.hasOwnProperty),
            Object_getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
            Object_isExtensible = Object.isExtensible,
            Object_getOwnPropertyNames = Object.getOwnPropertyNames,
            uneval_ = uneval;

        // Return true iff ES6 Type(v) isn't Object.
        // Note that `typeof document.all === "undefined"`.
        function isPrimitive(v) {
            return (v === null ||
                    v === undefined ||
                    typeof v === "boolean" ||
                    typeof v === "number" ||
                    typeof v === "string" ||
                    typeof v === "symbol");
        }

        function assertSameValue(a, b, msg) {
            try {
                assertEq(a, b);
            } catch (exc) {
                throw Error_(exc.message + (msg ? " " + msg : ""));
            }
        }

        function assertSameClass(a, b, msg) {
            var ac = Object_toString(a), bc = Object_toString(b);
            assertSameValue(ac, bc, msg);
            switch (ac) {
            case "[object Function]":
                assertSameValue(Function_toString(a), Function_toString(b), msg);
            }
        }

        function at(prevmsg, segment) {
            return prevmsg ? prevmsg + segment : "at _" + segment;
        }

        // Assert that the arguments a and b are thoroughly structurally equivalent.
        //
        // For the sake of speed, we cut a corner:
        //        var x = {}, y = {}, ax = [x];
        //        assertDeepEq([ax, x], [ax, y]);  // passes (?!)
        //
        // Technically this should fail, since the two object graphs are different.
        // (The graph of [ax, y] contains one more object than the graph of [ax, x].)
        //
        // To get technically correct behavior, pass {strictEquivalence: true}.
        // This is slower because we have to walk the entire graph, and Object.prototype
        // is big.
        //
        return function assertDeepEq(a, b, options) {
            var strictEquivalence = options ? options.strictEquivalence : false;

            function assertSameProto(a, b, msg) {
                check(Object_getPrototypeOf(a), Object_getPrototypeOf(b), at(msg, ".__proto__"));
            }

            function failPropList(na, nb, msg) {
                throw Error_("got own properties " + uneval_(na) + ", expected " + uneval_(nb) +
                             (msg ? " " + msg : ""));
            }

            function assertSameProps(a, b, msg) {
                var na = Object_getOwnPropertyNames(a),
                    nb = Object_getOwnPropertyNames(b);
                if (na.length !== nb.length)
                    failPropList(na, nb, msg);

                // Ignore differences in whether Array elements are stored densely.
                if (Array_isArray(a)) {
                    na.sort();
                    nb.sort();
                }

                for (var i = 0; i < na.length; i++) {
                    var name = na[i];
                    if (name !== nb[i])
                        failPropList(na, nb, msg);
                    var da = Object_getOwnPropertyDescriptor(a, name),
                        db = Object_getOwnPropertyDescriptor(b, name);
                    var pmsg = at(msg, /^[_$A-Za-z0-9]+$/.test(name)
                                       ? /0|[1-9][0-9]*/.test(name) ? "[" + name + "]" : "." + name
                                       : "[" + uneval_(name) + "]");
                    assertSameValue(da.configurable, db.configurable, at(pmsg, ".[[Configurable]]"));
                    assertSameValue(da.enumerable, db.enumerable, at(pmsg, ".[[Enumerable]]"));
                    if (Object_hasOwnProperty(da, "value")) {
                        if (!Object_hasOwnProperty(db, "value"))
                            throw Error_("got data property, expected accessor property" + pmsg);
                        check(da.value, db.value, pmsg);
                    } else {
                        if (Object_hasOwnProperty(db, "value"))
                            throw Error_("got accessor property, expected data property" + pmsg);
                        check(da.get, db.get, at(pmsg, ".[[Get]]"));
                        check(da.set, db.set, at(pmsg, ".[[Set]]"));
                    }
                }
            };

            var ab = new Map_();
            var bpath = new Map_();

            function check(a, b, path) {
                if (typeof a === "symbol") {
                    // Symbols are primitives, but they have identity.
                    // Symbol("x") !== Symbol("x") but
                    // assertDeepEq(Symbol("x"), Symbol("x")) should pass.
                    if (typeof b !== "symbol") {
                        throw Error_("got " + uneval_(a) + ", expected " + uneval_(b) + " " + path);
                    } else if (uneval_(a) !== uneval_(b)) {
                        // We lamely use uneval_ to distinguish well-known symbols
                        // from user-created symbols. The standard doesn't offer
                        // a convenient way to do it.
                        throw Error_("got " + uneval_(a) + ", expected " + uneval_(b) + " " + path);
                    } else if (Map_has(ab, a)) {
                        assertSameValue(Map_get(ab, a), b, path);
                    } else if (Map_has(bpath, b)) {
                        var bPrevPath = Map_get(bpath, b) || "_";
                        throw Error_("got distinct symbols " + at(path, "") + " and " +
                                     at(bPrevPath, "") + ", expected the same symbol both places");
                    } else {
                        Map_set(ab, a, b);
                        Map_set(bpath, b, path);
                    }
                } else if (isPrimitive(a)) {
                    assertSameValue(a, b, path);
                } else if (isPrimitive(b)) {
                    throw Error_("got " + Object_toString(a) + ", expected " + uneval_(b) + " " + path);
                } else if (Map_has(ab, a)) {
                    assertSameValue(Map_get(ab, a), b, path);
                } else if (Map_has(bpath, b)) {
                    var bPrevPath = Map_get(bpath, b) || "_";
                    throw Error_("got distinct objects " + at(path, "") + " and " + at(bPrevPath, "") +
                                 ", expected the same object both places");
                } else {
                    Map_set(ab, a, b);
                    Map_set(bpath, b, path);
                    if (a !== b || strictEquivalence) {
                        assertSameClass(a, b, path);
                        assertSameProto(a, b, path);
                        assertSameProps(a, b, path);
                        assertSameValue(Object_isExtensible(a),
                                        Object_isExtensible(b),
                                        at(path, ".[[Extensible]]"));
                    }
                }
            }

            check(a, b, "");
        };
    })();
}

// TODO throw an error here instead of using assert().

if (typeof assertTainted === 'undefined') {
    // Assert that at least part of the given string is tainted.
    var assertTainted = function (str) {
        if (str.taint.length == 0) {
            throw Error("String is not tainted");
        }
    }
}

if (typeof assertRangeTainted === 'undefined') {
    // Assert that the given range is fully tainted in the provided string.
    var assertRangeTainted = function(str, range) {
        function rangeToString(range) {
            return "[" + range[0] + ", " + (range[1] === STR_END ? "STR_END" : range[1]) + "]";
        }

        var begin = range[0];
        var end = range[1] === STR_END ? str.length : range[1];

        if (begin === end)
            return;

        if (begin > end)
            throw Error("Invalid range: " + rangeToString(range));

        var end_of_last_range = 0;
        for (var i = 0; i < str.taint.length; i++) {
            var cur_range = str.taint[i];
            if (begin >= cur_range.begin) {
                if (end_of_last_range !== 0 && end_of_last_range != cur_range.begin) {
                    // There's a gap
                    break;
                }
                end_of_last_range = cur_range.end;
                if (end_of_last_range >= end) {
                    return;
                }
            }
        }

        throw Error("Range " + rangeToString(range) + " not tainted");
    }
}

if (typeof assertRangesTainted === 'undefined') {
    // Assert that the provided ranges (varargs arguments) are tainted.
    // Example usage: assertRangesTainted(str, [0,3], [5, 8], [10, STR_END]);
    var assertRangesTainted = function(str) {
        var ranges = arguments;
        for (var i = 1; i < ranges.length; i++) {
            assertRangeTainted(str, ranges[i]);
        }
    }
}

if (typeof assertFullTainted === 'undefined') {
    // Assert that every character of the given string is tainted.
    var assertFullTainted = function(str) {
        assertRangeTainted(str, [0, STR_END]);
    }
}

if (typeof assertNotTainted === 'undefined') {
    // Assert that the given string is not tainted.
    var assertNotTainted = function(a) {
        if (a.taint.length != 0) {
            throw Error("String is tainted");
        }
    }
}

if (typeof randomString === 'undefined') {
    var randomString = function() {
        var len = Math.floor(Math.random() * 10) + 1;

        var text = "";
        var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789   \n{}[]()!@#$%^&*-_=+'\";:/?.,<>";

        for(var i = 0; i < len; i++)
            text += charset.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }
}

if (typeof randomTaintedString === 'undefined') {
    var randomTaintedString = function() {
        return taint(randomString());
    }
}

if (typeof randomMultiTaintedString === 'undefined') {
    var randomMultiTaintedString = function() {

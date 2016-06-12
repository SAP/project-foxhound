/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Token to indicate the end of a string.
var STR_END = -1;

if (typeof stringifyTaint === 'undefined') {
    // Produce a string representation of the provided taint information.
    var stringifyTaint = function(taint) {
        function replacer(key, value) {
            if (key == 'flow') {
                return undefined;
            }
            return value;
        }
        return JSON.stringify(taint, replacer);
    }
}

if (typeof assertTainted === 'undefined') {
    // Assert that at least part of the given string is tainted.
    var assertTainted = function (str) {
        if (str.taint.length == 0) {
            throw Error("String ('" + str + "') is not tainted");
        }
    }
}

if (typeof assertRangeTainted === 'undefined') {
    // Assert that the given range is fully tainted in the provided string.
    var assertRangeTainted = function(str, range) {
        function stringifyRange(range) {
            return "[" + range[0] + ", " + (range[1] === STR_END ? "str.length" : range[1]) + "]";
        }

        var begin = range[0];
        var end = range[1] === STR_END ? str.length : range[1];

        if (begin === end)
            return;

        if (begin > end)
            throw Error("Invalid range: " + stringifyRange(range));

        var curBegin = 0;
        var curEnd = 0;
        for (var i = 0; i < str.taint.length; i++) {
            var curRange = str.taint[i];
            if (curRange.begin == curEnd) {
                // Extend current range
                curEnd = curRange.end;
            } else {
                if (begin < curRange.begin)
                    // If the target range is tainted then it must lie inside the current range
                    break;

                // Start a new range
                curBegin = curRange.begin;
                curEnd = curRange.end;
            }
        }

        if (!(begin >= curBegin && begin < curEnd && end <= curEnd))
            // Target range not included in current range
            throw Error("Range " + stringifyRange(range) + " not tainted in string '" + str + "'");
    }
}

if (typeof assertRangesTainted === 'undefined') {
    // Assert that the provided ranges (varargs arguments) are tainted.
    // Example usage: assertRangesTainted(str, [0,3], [5, 8], [10, STR_END]);
    var assertRangesTainted = function(str) {
        var ranges = arguments;
        for (var i = 1; i < ranges.length; i++) {
            // This maybe isn't super effecient...
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
    var assertNotTainted = function(str) {
        if (str.taint.length != 0) {
            throw Error("String ('" + str + "') is tainted");
        }
    }
}

if (typeof assertEqualTaint === 'undefined') {
    // Assert that the given strings are equally tainted. This only compares the ranges, not the operations.
    var assertEqualTaint = function(s1, s2) {
        var t = s1.taint;
        for (var i = 0; i < t.length; i++) {
            assertRangeTainted(s2, [t[i].begin, t[i].end]);
        }
    }
}

if (typeof rand === 'undefined') {
    // Return a random integer in the range [start, end)
    var rand = function(start, end) {
        return Math.floor(Math.random() * (end - start)) + start;
    }
}

if (typeof randomString === 'undefined') {
    // Generate a random string
    var randomString = function(len) {
        if (len === undefined)
            len = rand(4, 25);       // Minimum length of 4, for multiTaint to be usable

        var str = "";
        var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789   \n{}[]()!@#$%^&*-_=+'\";:/?.,<>";   // TODO extend

        for (var i = 0; i < len; i++)
            str += charset.charAt(Math.floor(Math.random() * charset.length));

        return str;
    }
}

if (typeof randomTaintedString === 'undefined') {
    // Generate a random tainted string
    var randomTaintedString = function() {
        return taint(randomString());
    }
}

if (typeof multiTaint === 'undefined') {
    // Taint a random number of substrings of the given string
    var multiTaint = function(str) {
        var last_index = 0;
        var parts = [];
        while (last_index < str.length - 3) {
            var start_index = rand(last_index, Math.min(last_index + 5, str.length - 1));
            var end_index = rand(start_index + 1, Math.min(start_index + 5, str.length));
            parts.push(str.substr(last_index, start_index));
            parts.push(taint(str.substr(start_index, end_index)));
            last_index = end_index;
        }
        parts.push(str.substr(last_index, str.length));
        print(parts);
        return parts.join('');
    }
}

if (typeof randomMultiTaintedString === 'undefined') {
    // Generates a random string with randomly tainted substrings
    var randomMultiTaintedString = function(len) {
        var str = randomString(len);
        return multiTaint(str);
    }
}

if (typeof assertHasTaintOperation === 'undefined') {
    var assertHasTaintOperation = function(str, opName) {
        for (var i = 0; i < str.taint.length; i++) {
            var range = str.taint[i];
            for (var j = 0; j < range.flow.length; j++) {
                var node = range.flow[j];
                if (node.operation === opName) {
                    return true;
                }
            }
        }
        return false;
    }
}

if (typeof runTaintTest === 'undefined') {
    // Run the given tests in interpreter and JIT mode.
    var runTaintTest = function(doTest) {
        // Separate function so it's visible in the backtrace
        var runJITTest = function(doTest) {
            // Force JIT compilation
            for (var i = 0; i < 500; i++) {
                doTest();
            }
        }

        doTest();         // Will be interpreted
        runJITTest(doTest);
    }
}

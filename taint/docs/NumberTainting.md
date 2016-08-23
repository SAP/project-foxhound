# Making Numbers Taint-aware

There are several approaches to making the number type taint aware, ranging from
changing the JSValue type itself to creating lookup tables for the taint
information.

Our approach works by extending the NumberObject type (new Number(...)) to
containt the taint information, and then changing various functions (str.charCodeAt(),
arithmetic operations, binary operations, etc.) throughout the engine to produce NumberObjects if the
result of the computation is tainted.
Moreover, features such as typeof were modified to make tainted numbers look
like primitive numbers to the JavaScript code.
This works quite well as it gives us basic JIT support "for free" since the
NumberObject type isn't specifically optimized for, and so fallbacks to the
interpreter happen automatically (unlike with strings, where we have to
force a fallback if we detect a tainted string in the JIT code).

However, there are still issues with approach. For example, the bitshift
operations are defined to produce a 32 bit integer as result [1], a fact that the Ion
JIT compiler optimizes for. So, given e.g. a sequence of bitshifts and
additions, ((a << 16) + (b << 8) + c), the Ion compiler will likely inline the
additions (instead of calling AddOperation), since it now assumes the result
must be an integer. This assumption is violated by our approch (now the result
is an Object) and so this code breaks.
The easiest way to deal with this for now is to disable the Ion JIT compiler. Fixing
these specific cases would be preferable though.


[1] http://www.ecma-international.org/ecma-262/6.0/#sec-left-shift-operator-runtime-semantics-evaluation

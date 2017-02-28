# TaintFlow

Taintfox will trace the flow of tainted strings throughout the engine inside a "TaintFlow" datastructure (available from JavaScript as the "flow" property). 
The flow is made up of several nodes, one for each operation that was performed on the tainted data. The taint flow tracing is currently considered a "best-effort" service.

Mainly two types of operations are currently recorded in the taint flow: function calls and JavaScript string operations.


## Function calls

These are added to any tainted string arguments during a function call. Their purpose is to help identify the vulnerable code in the application.
The engine will generally fail to record function call information when executing in one of the JIT modes (instead of the interpreter). As such, functions
that are used often by the application will likely not show up in the trace.


## String operations

These are added during processing of JSString objects in native C++ code. They should be available for most (ideally all) of the String.prototype methods.
In theory, they should still be available during JIT execution, however, a few methods are actually "inlined" by the JIT compiler and will thus not be recorded.

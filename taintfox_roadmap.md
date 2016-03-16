# Taintfox Roadmap

1. Fix failing tests
2. Add new tests
3. Refactor: Add TaintInfo class, attach to every string
4. Refactor: Clean up jstaint code
5. Refactor: Move JavaScript code into global Object, code maybe even self hosted
6. Check: Can we remote __TAINT_ON__ completely?

# Stuff

- need concat(), substr() operations
- need line numbers? Source file?
- Array.join()?

Best effort because:
- String.fromCharCode
- Atoms

- Trace functions called with tainted arguments?
- ToSource important?

- postMessage ??
    - Instead of sink, make StructuredClone taint aware


- removed sources
    - port
    - protocol


# taint property of C++ objects

- public StringTaint taint; or appendTaint() ... ?



# Removed

- No more taint support in the frozen string api
    - xpcom/glue/nxStringAPI

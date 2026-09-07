---
description: You MUST use this skill when working with C++, C, Rust code to implement or modify WebIDL interfaces and their native implementations.
---


## Workflow
- When implementing or reviewing new web-exposed interfaces, compare the code against the specification. The relevant link should be in the .webidl file. When reviewing, explicitly check each method's implementation against the corresponding spec algorithm and note any discrepancies. If `webspec-index` is available, use `webspec-index query '<spec-url-or-shortname#anchor>' --format markdown` to fetch the exact algorithm steps for each method; otherwise fall back to fetching the spec URL directly.
- The C++ implementation of the algorithms should match the specifications as closely as possible so that future readers can ensure correctness more easily.
- If the specification's algorithm has clear steps, those steps should be added to the C++ implementation too. These comments are required even though the general style guideline otherwise limits comments, to be able to quickly match what part of the web standard is implemented where.
- If some steps in the implementation are implicit or otherwise not implemented exactly, there should be a comment about that, because it is often the source of confusion and mistake when read years later.
- When dealing with Web Workers and some asynchronous steps, the implementation may need to use WorkerRefs to correctly sequence shutdown between the worker and the main thread.
- When using raw pointers in C++/C as member variables, it must be documented why that is safe. This comment is required even though the general style guideline otherwise limits comments.
- Ensure cycle collected objects actually do get added to the cycle collection.
- Coding style should match the surrounding code, and otherwise Mozilla coding style.
- Prefer low-level Gecko primitives over high-level DOM APIs for performance.

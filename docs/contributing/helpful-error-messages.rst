Helpful error messages for web developers
===========================================

When errors are surfaced to the web platform, developers see them in the console on their local machine, or they may be using an error tracking system to record errors happening on their users' machines.

This means developers may be exposed to our error messages even if they aren't developing in Firefox.

Vague error messages are frustrating experiences and negatively impacts Firefox, especially if, in their logs, developers are seeing more helpful messages from other browsers.

Instead:

- Explain why this specific error happened.
- Use terms familiar to web developers.
- If there's a likely solution, suggest it.
- Link to MDN, so the developer has an immediate way to learn about the requirements of the API.

Example
-------

Given error-throwing code like:

.. code-block:: js

   const urlPattern = new URLPattern('/blog/:year/:title');

.. admonition:: Bad example
   :class: warning

   Uncaught TypeError: URLPattern constructor: Failed to create URLPattern (from string)

.. admonition:: Better example
   :class: tip

   Throw something like: Uncaught TypeError: URLPattern constructor: Relative pattern '/blog/:year/:title' must have a base URL passed as the second argument, or use an object as the first argument to match specific parts of URLs. See https://developer.mozilla.org/docs/Web/API/URLPattern/URLPattern

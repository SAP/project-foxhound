===========
JSON viewer
===========

Firefox includes a JSON viewer. If you open a JSON file in the browser, or view a remote URL with the Content-Type set to application/json, it is parsed and given syntax highlighting. Arrays and objects are shown collapsed, and you can expand them using the "+" icons.

The JSON viewer provides a search box that you can use to filter the JSON.

You can also view the raw JSON and pretty-print it.

Finally, if the document was the result of a network request, the viewer displays the request and response headers.

Console API
===========

The JSON viewer exposes data through a console API, making it easy to access the parsed JSON and other information from the Console:

- **$json.data** - The parsed JSON object
- **$json.text** - The original JSON text
- **$json.headers** - HTTP request and response headers

To access these from the console, :ref:`open the Web Console <keyboard-shortcuts-opening-and-closing-tools>`, and type ``$json.data`` to explore the parsed JSON object.

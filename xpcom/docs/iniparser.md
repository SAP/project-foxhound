# INI Parsing Components

XPCOM contains components for parsing and writing INI style files where key value pairs are split into names sections. There are three different entry points available:

* `nsINIParser` is a component accessible from C++ which implements the core functionality.
* `nsIINIParser` is an XPCOM component accessible to JavaScript that can parse a string and be queried about the data it contained. This component also implements `nsIINIParserWrite` which allows for modifying the data and persisting it.
* `nsIINIParserFactory` is an XPCOM component that can be used to parse a file's contents returning an `nsIINIParser`. This reads the file synchronously so most callers should prefer to read the file asynchronously and use `nsINIParser` directly.

## Supported syntax

The parser supports a very basic set of INI style data:

```ini
# an ignored comment
; another comment

[section1]
key=value

[section2]
otherkey=othervalue
```

Keys outside of sections are ignored.

The parser is fault tolerant, lines that contain invalid tokens will be ignored and parsing will continue with the next line. Invalid section names cause all subsequent keys to be ignored until the next valid section is found.

## Quirks

While whitespace is stripped from the start of lines other whitespace in the line is retained, this impacts keys and values. For example a line that is `"    key  =  value  "` will parse into a key `"key  "` and value `"  value  "` (quotes for clarity).

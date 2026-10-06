# [android-components](../../../README.md) > Concept > Bookmark File Parser

An abstract definition of a bookmarks-parser component.

## Usage

### Setting up the dependency

Use Gradle to download the library from maven.mozilla.org:

```Groovy
implementation "org.mozilla.components:concept-bookmarks-parser:{latest-version}"
```

### BookmarksFileParser

`BookmarksFileParser` is a functional interface for parsing bookmark files into a tree of `InsertableBookmarkNode`s.

```kotlin
class HtmlBookmarksFileParser : BookmarksFileParser {
    override suspend fun parse(inputStream: InputStream): Result<InsertableBookmarkNode> {
        // Parse the HTML bookmark file and return the root node.
    }
}
```

## License

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/

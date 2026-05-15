# [Android Components](../../../README.md) > UI > RichText

A Jetpack Compose component for rendering rich text content with Markdown support.

## Overview

The RichText component provides a declarative way to render rich text content in Compose.

### Supported Features
1. Strong, emphasis, inline code, inline links and simple line breaks
2. Headings 1 to 6
3. Lists - unordered, ordered and nested lists
4. Block quotes
5. Paragraphs

## Architecture
It follows a three-layer architecture that involves: parsing, intermediate representation, and rendering steps.
The architecture provides a clear separation between parsing, representation, and rendering.

### Parsing
This component uses [JetBrains Markdown library](https://github.com/JetBrains/markdown/) to parse a markdown file.

The parsing generates an Abstract Syntax Tree that is then converted to an Intermediate Representation that models
the structure of a markdown document.

The parsing code lives in the `parser` package, and the entry-point is the `Parser` object.

### Intermediate Representation

The intermediate representation is the output of the parsing step. The intermediate representation is an abstract
representation of the markdown/rich document. This is useful in our case, so that we are not tied to the JetBrains Markdown library.
The work to move from that parsing library to another one will be minimal, and we will be able to preserve our intermediate representation
and our rendering code.

A core principle of the intermediate representation is that every node in the markdown file is parsed either
as an inline content or a block content.

#### Inline content
Elements such as `Strong` text, `Plain` text, `Bold` text, `Link`, `LineBreak`, etc. are inline. The form
the building blocks of the `BlockContent` type.

#### Block content
Elements like paragraphs, block quotes, lists, headings, are block contents. Each block content can
potentially contain one or more inline contents, or other block contents too.

For example, a list will often have a paragraph content, and could also contain another block content.

A rich document contains one or more blocks.

### Rendering

This is the final and visual part of the module. This deals with how we convert those intermediate representations
to actual visual elements.

Every rendered element is a block, and the blocks are rendered recursively because as part of rendering a
block, we might encounter another block that needs to be rendered.

To enable customization of various layers, the rendering layer exposes some additional APIs like:

- `RichTextTypography.kt` - typography configuration for different text styles
- `RichTextColors.kt` - color scheme for rich text elements
- `RichTextDefaults.kt` - default configurations for typography and colors
- `LinkClickHandler.kt` - interface for link click handling

## License

    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at http://mozilla.org/MPL/2.0/

# Multiline Editor

`moz-multiline-editor` is a multiline rich text editor custom element based on ProseMirror.

```html story
<moz-multiline-editor placeholder="Enter your text here"></moz-multiline-editor>
```

## Code

The source for `moz-multiline-editor` can be found under [browser/components/multilineeditor/](https://searchfox.org/mozilla-central/source/browser/components/multilineeditor)

## How to use `moz-multiline-editor`

### Importing the element

Like other custom elements, you should usually be able to rely on `moz-multiline-editor` getting lazy loaded at the time of first use.
See [this documentation](https://firefox-source-docs.mozilla.org/browser/components/storybook/docs/README.reusable-widgets.stories.html#using-new-design-system-components) for more information on using design system custom elements.

### Setting the `placeholder`

A placeholder can be set via the `placeholder` attribute. The placeholder is displayed when the editor is empty.

```html
<moz-multiline-editor placeholder="Placeholder text"></moz-multiline-editor>
```
```html story
<moz-multiline-editor placeholder="Placeholder text"></moz-multiline-editor>
```

### Setting the `readonly` state

The editor can be set to be read-only using the `readonly` attribute, which prevents editing while still allowing text selection.

```html
<moz-multiline-editor
  readonly
  placeholder="This editor is read-only"
></moz-multiline-editor>
```
```html story
<moz-multiline-editor
  readonly
  placeholder="This editor is read-only"
></moz-multiline-editor>
```

### Programmatic access

The editor exposes properties and methods for programmatic control:

**Properties:**
- `value` - Get or set text content
- `selectionStart` - Get or set the start offset of the selection
- `selectionEnd` - Get or set the end offset of the selection
- `composing` - `True` if IME composition is in progress

**Methods:**
- `setSelectionRange(start, end)` - Set the selection range
- `select()` - Select text content
- `focus()` - Focus the editor

### Events

The editor dispatches input and selection events:

- `input` - Fired when the text content changes
- `selectionchange` - Fired when the text selection changes

### Plugins

The editor supports extending functionality with plugins:

#### Native ProseMirror plugins

Native ProseMirror plugins can be used directly and work as documented in the [ProseMirror guide](https://prosemirror.net/docs/guide/).

```js
import { Plugin } from "chrome://browser/content/multilineeditor/prosemirror.bundle.mjs";

const plugin = new Plugin();
editor.plugins = [plugin];
```

#### Custom plugins

Custom plugins can be added to `/plugins`.

```js
import { createCustomPlugin } from "chrome://browser/content/multilineeditor/plugins/CustomPlugin.mjs";

const customPlugin = createCustomPlugin();
editor.plugins = [customPlugin];
```

**Plugin structure:**
- `schemaExtension` - Extends the ProseMirror schema with custom nodes and marks.
- `createPlugin(editor)` - Receives the editor instance and returns a ProseMirror Plugin

### Fluent usage

The `placeholder` attribute of `moz-multiline-editor` will generally be provided via [Fluent attributes](https://mozilla-l10n.github.io/localizer-documentation/tools/fluent/basic_syntax.html#attributes).
The relevant `data-l10n-attrs` are set automatically, so to get things working you just need to supply a `data-l10n-id` as you would with any other element.

For example, the following Fluent message:

```
multiline-editor-placeholder =
  .placeholder = Enter your text here
```

would be used to set the placeholder on `moz-multiline-editor` as follows:

```html
<moz-multiline-editor data-l10n-id="multiline-editor-placeholder"></moz-multiline-editor>
```

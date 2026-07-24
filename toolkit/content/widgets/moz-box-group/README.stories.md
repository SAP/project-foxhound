# MozBoxGroup

`moz-box-group` custom element is a flexible container used to group and manage combinations of `moz-box-item`, `moz-box-link`, and `moz-box-button` elements with consistent styles and interaction behaviors.

```html story
<div style={{ width: "500px" }}>
  <moz-box-group>
    <moz-box-item label="I am a box item"></moz-box-item>
    <moz-box-link label="I am a box link"></moz-box-link>
    <moz-box-button label="I am a box button"></moz-box-button>
  </moz-box-group>
</div>
```

## Code

The source for `moz-box-group` can be found under [toolkit/content/widgets/moz-box-group/](https://searchfox.org/mozilla-central/source/toolkit/content/widgets/moz-box-group)

## How to use `moz-box-group`

### Importing the element

Like other custom elements, you should usually be able to rely on `moz-box-group` getting lazy loaded at the time of first use.
See [this documentation](https://firefox-source-docs.mozilla.org/browser/components/storybook/docs/README.reusable-widgets.stories.html#using-new-design-system-components) for more information on using design system custom elements.

### Adding items to the group

In order to group `moz-box-*` elements (`moz-box-item`, `moz-box-link`, and `moz-box-button`), place them directly inside the `moz-box-group` element as its immediate children.

```html
<moz-box-group>
  <moz-box-item label="I am a box item"></moz-box-item>
  <moz-box-link label="I am a box link"></moz-box-link>
  <moz-box-button label="I am a box button"></moz-box-button>
</moz-box-group>
```

```html story
<div style={{ width: "500px" }}>
  <moz-box-group>
    <moz-box-item label="I am a box item"></moz-box-item>
    <moz-box-link label="I am a box link"></moz-box-link>
    <moz-box-button label="I am a box button"></moz-box-button>
  </moz-box-group>
</div>
```

### Setting the type

The `type` attribute on `moz-box-group` determines how its child elements are grouped, displayed, and interacted with. The `moz-box-group` supports following types: `default`, `list`, `reorderable-list`.

#### No Type (Default)

When no `type` is specified, `moz-box-group` acts as a simple visual grouping container. Elements are rendered as-is, in document order, without being wrapped in a list.

Default `moz-box-group` has the following keyboard navigation behavior:
* Each interactive element (`moz-box-link` and `moz-box-button`) or element with interactive children (e.g. a `moz-box-item` with a toggle or button in one of the actions slots) will be it's own tab stop.
* Tabbing or using the left and right arrow keys in a `moz-box-item` with multiple interactive elements will navigate between those elements.
* Up/Down arrow keys don't go between elements.


```html
<moz-box-group>
  <moz-box-item label="I am a box item in a group"></moz-box-item>
  <moz-box-link label="I am a box link in a group"></moz-box-link>
  <moz-box-button label="I am a box button in a group"></moz-box-button>
</moz-box-group>
```

```html story
<div style={{ width: "500px" }}>
  <moz-box-group>
    <moz-box-item label="I am a box item in a group"></moz-box-item>
    <moz-box-link label="I am a box link in a group"></moz-box-link>
    <moz-box-button label="I am a box button in a group"></moz-box-button>
  </moz-box-group>
</div>
```

#### type="list"

When `type` is set to `"list"`, the component wraps the grouped elements in an unordered list (`ul`), with each item rendered inside an individual `li` list element. This improves accessibility and structure for similar items. `type="list"` provides accessible keyboard navigation to move focus between interactive elements inside the group:

**Tab key:** Pressing `Tab` moves focus into the list and lands on the first interactive element within the `moz-box-group`.

**Arrow keys:** Once focus is inside the list:
* Pressing `ArrowDown` moves focus to the next item in the list.
* Pressing `ArrowUp` moves focus to the previous item.
* Pressing `ArrowRight` and `ArrowLeft` or `Tab` when one of the `moz-box-item` interactive elements is in focus will navigate between those elements.

**Tab key (again):** After navigating through the list with arrow keys, pressing `Tab` again will move focus out of the list to the next focusable element outside the group.

```html
<moz-box-group type="list">
  <moz-box-item label="I'm the first item in a list">
    <moz-button label="Click me!" slot="actions"></moz-button>
  </moz-box-item>
  <moz-box-item label="I'm the second item in a list">
    <moz-button label="Click me!" slot="actions"></moz-button>
  </moz-box-item>
  <moz-box-item label="I'm the third item in a list">
    <moz-button label="Click me!" slot="actions"></moz-button>
  </moz-box-item>
</moz-box-group>
```

```html story
<div style={{ width: "500px" }}>
  <moz-box-group type="list">
    <moz-box-item label="I'm the first item in a list">
      <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
    <moz-box-item label="I'm the second item in a list">
      <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
    <moz-box-item label="I'm the third item in a list">
      <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
  </moz-box-group>
</div>
```

#### type="reorderable-list"

Setting `type="reorderable-list"` enhances the `moz-box-group` with reordering capabilities. It behaves like `"list"`, but:
* Renders an ordered list (`ol`).
* Wraps the list in a `moz-reorderable-list`.
* Enables drag-and-drop reordering using `handle` elements inside `moz-box-item`.

**Note:** Only `moz-box-item` is currently supported in `reorderable-list`.

When focus is on the `moz-box-item`’s `handle`, you can reorder items in the list using the following keyboard shortcuts:
* Ctrl + Shift + ArrowDown: moves the focused item after the next item in the list.
* Ctrl + Shift + ArrowUp: moves the focused item before the previous item.

Reordering updates the DOM and retains focus on the moved item, allowing for continuous reordering using the keyboard.

```html
<moz-box-group type="reorderable-list">
  <moz-box-item label="I'm the first item in a list">
    <moz-button label="Click me!" slot="actions"></moz-button>
  </moz-box-item>
  <moz-box-item label="I'm the second item in a list">
    <moz-button label="Click me!" slot="actions"></moz-button>
  </moz-box-item>
  <moz-box-item label="I'm the third item in a list">
    <moz-button label="Click me!" slot="actions"></moz-button>
  </moz-box-item>
</moz-box-group>
```

```html story
<div style={{ width: "500px" }}>
  <moz-box-group type="reorderable-list">
    <moz-box-item label="I'm the first item in a list">
      <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
    <moz-box-item label="I'm the second item in a list">
      <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
    <moz-box-item label="I'm the third item in a list">
      <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
  </moz-box-group>
</div>
```
### Header and Footer

The `moz-box-group` component supports optional header and footer content. To insert a header or footer, use the slot="header" and slot="footer" attributes on the first and last elements of the group. This allows you to consistently wrap groups of elements with contextual content without affecting the layout or behavior of the list.

**Note:** Header and footer elements are not included in list keyboard navigation (`ArrowUp` and `ArrowDown`) or reordering.

```html
<moz-box-group type="list">
  <moz-box-item slot="header" label="I am a header"></moz-box-item>
  <moz-box-button label="I am the first button in a list"></moz-box-button>
  <moz-box-button label="I am the second button in a list"></moz-box-button>
  <moz-box-item slot="footer" label="I am a footer"></moz-box-item>
</moz-box-group>
```

```html story
<div style={{ width: "500px" }}>
  <moz-box-group type="list">
    <moz-box-item slot="header" label="I am a header"></moz-box-item>
    <moz-box-button label="I am the first button in a list"></moz-box-button>
    <moz-box-button label="I am the second button in a list"></moz-box-button>
    <moz-box-item slot="footer" label="I am a footer">
    <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
  </moz-box-group>
</div>
```

### Static Items

The `moz-box-group` component supports static (non-reorderable) items in reorderable lists. To mark an item as static, place it in the `static` named slot. Static items are positioned after regular items and cannot be reordered.

Static items are only supported in `type="reorderable-list"`. They are included in keyboard navigation, and can contain interactive elements.

```html
<moz-box-group type="reorderable-list">
  <moz-box-item label="Reorderable item 1">
    <moz-button label="Click me!" slot="actions"></moz-button>
  </moz-box-item>
  <moz-box-item label="Reorderable item 2">
    <moz-button label="Click me!" slot="actions"></moz-button>
  </moz-box-item>
  <moz-box-item slot="static" label="Static item (cannot be reordered)">
    <moz-button label="Click me!" slot="actions"></moz-button>
  </moz-box-item>
</moz-box-group>
```

```html story
<div style={{ width: "500px" }}>
  <moz-box-group type="reorderable-list">
    <moz-box-item label="Reorderable item 1">
      <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
    <moz-box-item label="Reorderable item 2">
      <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
    <moz-box-item slot="static" label="Static item (cannot be reordered)">
      <moz-button label="Click me!" slot="actions"></moz-button>
    </moz-box-item>
  </moz-box-group>
</div>
```

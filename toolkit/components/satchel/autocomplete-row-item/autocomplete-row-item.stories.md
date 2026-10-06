# Autocomplete Row Item

`autocomplete-row-item` is a row component for the credential management autocomplete
popup that appears when a user focuses an input field (e.g. a login or address form).
Each row displays an icon, a primary label, an optional description, and optional
action buttons.

```html
<autocomplete-row-item
  .label=${"example@example.com"}
  .description=${"From this website"}
  .icon=${"chrome://global/skin/icons/defaultFavicon.svg"}
  .actions=${{ primary: () => {} }}
></autocomplete-row-item>
```

## When to use

- When rendering a row inside the autocomplete popup for credential management
  (logins, addresses, payment methods).
- When a row needs to display rich content: an icon, a primary label, an optional
  secondary description, and one or more actions beyond the primary fill action.

## When not to use

- Do not use this component for general-purpose lists or menus outside of the
  autocomplete popup.
- Do not use this component in in-content pages. It is designed to live inside the
  XUL `richlistbox` that backs the autocomplete panel, which is a chrome-level
  XUL container.
- For plain autocomplete suggestions with no icon or actions, the existing
  `richlistitem` is more appropriate.

## How to use

### Importing the element

The component must be imported before use:

```js
import "chrome://global/content/autocomplete-row-item/autocomplete-row-item.mjs";
```

### Creating a row from JS

In a XUL context (e.g. populating a `richlistbox`), create the element imperatively:

```js
const item = document.createElement("autocomplete-row-item");
item.label = "example@example.com";
item.description = "From this website";
item.icon = "chrome://global/skin/icons/defaultFavicon.svg";
item.value = "example@example.com";
item.actions = {
  primary: () => fillForm(item.value),
};
richlistbox.appendChild(item);
```

### Creating a row from a Lit template

In a Lit component context:

```js
html`
  <autocomplete-row-item
    .label=${entry.username}
    .description=${entry.origin}
    .icon=${entry.icon}
    .value=${entry.value}
    .actions=${{ primary: () => fillForm(entry.value) }}
  ></autocomplete-row-item>
`
```

### Properties

```js
/**
 * The primary text displayed in the row, typically a username or email address.
 * @type {string}
 */
item.label = "example@example.com";

/**
 * Optional secondary text displayed below the label, e.g. the origin or form field name.
 * @type {string}
 */
item.description = "From this website";

/**
 * The value associated with this row, used by the caller to identify which
 * entry to fill when the primary action is triggered.
 * @type {string}
 */
item.value = "example@example.com";

/**
 * URL of the icon displayed at the leading edge of the row, typically a site favicon.
 * @type {string}
 */
item.icon = "chrome://global/skin/icons/defaultFavicon.svg";

/**
 * Defines the primary and optional secondary actions for the row.
 * See "Defining actions" below for the full shape.
 * @type {{ primary: Function, secondary?: object }}
 */
item.actions = { primary: () => fillForm(item.value) };
```

### Defining actions

The `actions` property is an object that defines how the row responds to user
interaction. It has two keys:

- **`primary`** — A callback invoked when the user clicks anywhere on the row
  itself. This is the main fill action, e.g. populating the form with the
  selected credential.
- **`secondary`** _(optional)_ — Defines one or more additional actions exposed
  through a secondary-action button rendered on the trailing edge of the row.
  The button is only shown when `secondary` is present.

When `secondary` contains an `action` property (singular), the component assumes
there is only one secondary action, and clicking the button invokes it directly.
When `secondary` contains an `actions` array (plural), the button opens a menu
listing all available actions.

```js
// Single secondary action — button invokes the action directly.
item.actions = {
  primary: () => fillForm(item.value),
  secondary: {
    type: "edit",
    action: () => openEditDialog(item.value),
  },
};

// Multiple secondary actions — button opens a menu.
item.actions = {
  primary: () => fillForm(item.value),
  secondary: {
    type: "menupopup",
    actions: [
      { label: "Edit",   action: () => openEditDialog(item.value) },
      { label: "Remove", action: () => removeEntry(item.value) },
    ],
  },
};
```

### Adding a single secondary action

A secondary action renders as an icon button on the trailing edge of the row.
The `type` field controls which icon is shown (`"edit"` renders a pencil icon;
any other value falls back to a settings gear icon).

```js
item.actions = {
  primary: () => fillForm(item.value),
  secondary: {
    type: "edit",
    action: () => openEditDialog(item.value),
  },
};
```

### Adding multiple secondary actions

When there are multiple secondary actions, set `type` to `"menupopup"` and
provide an `actions` array. Each entry requires a `label` string (visible in
the menu) and an `action` callback.

```js
item.actions = {
  primary: () => fillForm(item.value),
  secondary: {
    type: "menupopup",
    actions: [
      { label: "Edit",   action: () => openEditDialog(item.value) },
      { label: "Remove", action: () => removeEntry(item.value) },
    ],
  },
};
```

> **Note:** The multiple-actions button isn't available in Storybook demo.
> Because this component will be used inside the XUL autocomplete popup
> (a chrome-level `richlistbox`), it isn't possible to display the menupopup
> example here.

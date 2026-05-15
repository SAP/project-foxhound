# MozBoxButton

`moz-box-button` is a button custom element used for navigating between sub-pages or opening dialogs. This component can be used separately or together with `moz-box-item` and `moz-box-link` as a part of a `moz-box-group`.

```html story
<moz-box-button style={{ width: "400px" }}
              label="I'm a box button">
</moz-box-button>
```

## Code

The source for `moz-box-button` can be found under [toolkit/content/widgets/moz-box-button/](https://searchfox.org/mozilla-central/source/toolkit/content/widgets/moz-box-button)

## How to use `moz-box-button`

### Importing the element

Like other custom elements, you should usually be able to rely on `moz-box-button` getting lazy loaded at the time of first use.
See [this documentation](https://firefox-source-docs.mozilla.org/browser/components/storybook/docs/README.reusable-widgets.stories.html#using-new-design-system-components) for more information on using design system custom elements.

### Setting the `label` and `description`

In order to set a label and description, use the `label` and `description` attributes.
In general, the label and description should be controlled by Fluent.

```html
<moz-box-button label="I'm a box button" description="Some description of the button"></moz-box-button>
```

```html story
<moz-box-button style={{ width: "400px" }}
              label="I'm a box button"
              description="Some description of the button">
</moz-box-button>
```

### Setting an icon

In order to have an icon appear next to the label, use the `.iconSrc` property or `iconsrc` attribute.

```html
<moz-box-button label="I'm a box button"
              description="Some description of the button"
              iconsrc="chrome://global/skin/icons/highlights.svg">
</moz-box-button>
```

```html story
<moz-box-button style={{ width: "400px" }}
              label="I'm a box button"
              description="Some description of the button"
              iconsrc="chrome://global/skin/icons/highlights.svg">
</moz-box-button>
```

### Setting the `accesskey`

`accesskey` defines a keyboard shortcut for the `moz-box-button`.

```html
<moz-box-button label="Click me to navigate!" accesskey="o"></moz-box-button>
```
```html story
<moz-box-button style={{ width: "400px" }}
               label="Click me to navigate!"
               accesskey="o">
</moz-box-button>
```

### Fluent usage

The `label`, `description` and `accesskey` attributes of `moz-box-button` will generally be provided via [Fluent attributes](https://mozilla-l10n.github.io/localizer-documentation/tools/fluent/basic_syntax.html#attributes).
The relevant `data-l10n-attrs` are set automatically, so to get things working you just need to supply a `data-l10n-id` as you would with any other element.

For example, the following Fluent messages:

```
moz-box-button-label =
  .label = I'm a box button
moz-box-button-label-description =
  .label = I'm a box button
  .description = Some description of the button
moz-box-button-with-accesskey =
  .label = I'm a box button
  .accesskey = o
```

would be used to set attributes on the different `moz-box-button` elements as follows:

```html
<moz-box-button data-l10n-id="moz-box-button-label"></moz-box-button>
<moz-box-button data-l10n-id="moz-box-button-label-description"></moz-box-button>
<moz-box-button data-l10n-id="moz-box-button-with-accesskey"></moz-box-button>
```

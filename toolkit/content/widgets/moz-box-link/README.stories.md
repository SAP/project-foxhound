# MozBoxLink

`moz-box-link` is a link component with a box-like shape that allows for custom title and description. `moz-box-link` can be used separately or together with `moz-box-item` and `moz-box-button` as a part of a `moz-box-group`.

```html story
<moz-box-link style={{ width: "400px" }}
              label="I'm a box link"
              href="#">
</moz-box-link>
```

## Code

The source for `moz-box-link` can be found under [toolkit/content/widgets/moz-box-link/](https://searchfox.org/mozilla-central/source/toolkit/content/widgets/moz-box-link)

## How to use `moz-box-link`

### Importing the element

Like other custom elements, you should usually be able to rely on `moz-box-link` getting lazy loaded at the time of first use.
See [this documentation](https://firefox-source-docs.mozilla.org/browser/components/storybook/docs/README.reusable-widgets.stories.html#using-new-design-system-components) for more information on using design system custom elements.

### Setting the `label` and `description`

In order to set a label and description, use the `label` and `description` attributes.
In general, the label and description should be controlled by Fluent.

```html
<moz-box-link label="I'm a box link" description="Some description of the link" href="#"></moz-box-link>
```

```html story
<moz-box-link style={{ width: "400px" }}
              href="#"
              label="I'm a box link"
              description="Some description of the link">
</moz-box-link>
```

### Setting an icon

In order to have an icon appear next to the label, use the `.iconSrc` property or `iconsrc` attribute.

```html
<moz-box-link label="I'm a box link"
              description="Some description of the link"
              href="#"
              iconsrc="chrome://global/skin/icons/highlights.svg">
</moz-box-link>
```

```html story
<moz-box-link style={{ width: "400px" }}
              label="I'm a box link"
              description="Some description of the link"
              href="#"
              iconsrc="chrome://global/skin/icons/highlights.svg">
</moz-box-link>
```

### Setting the support page

To turn a `moz-box-link` into a SUMO link, use the `support-page` attribute.

```html
<moz-box-link label="I'm a support link"
              support-page="support-page-short-hand">
</moz-box-link>
```

```html story
<moz-box-link style={{ width: "400px" }}
              label="I'm a support link"
              support-page="support-page-short-hand">
</moz-box-link>
```


### Fluent usage

The `label` and `description` attributes of `moz-box-link` will generally be provided via [Fluent attributes](https://mozilla-l10n.github.io/localizer-documentation/tools/fluent/basic_syntax.html#attributes).
The relevant `data-l10n-attrs` are set automatically, so to get things working you just need to supply a `data-l10n-id` as you would with any other element.

For example, the following Fluent messages:

```
moz-box-link-label =
  .label = I'm a box link
moz-box-link-label-description =
  .label = I'm a box link
  .description = Some description of the link
```

would be used to set attributes on the different `moz-box-link` elements as follows:

```html
<moz-box-link data-l10n-id="moz-box-link-label"></moz-box-link>
<moz-box-link data-l10n-id="moz-box-link-label-description"></moz-box-link>
```

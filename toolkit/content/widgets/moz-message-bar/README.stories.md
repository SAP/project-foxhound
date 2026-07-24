# MozMessageBar

`moz-message-bar` is a versatile user interface element designed to display messages or notifications.
These messages and notifications are nonmodal, and keep users informed without blocking access to the base page.
It supports various types of messages - info, warning, success, and error - each with distinct visual styling
to convey the message's urgency or importance. You can customize `moz-message-bar` by adding a message, message heading,
`moz-support-link`, actions buttons, or by making the message bar dismissable.

```html story
<moz-message-bar dismissable
                 heading="Heading of the message bar"
                 message="Message for the user">
</moz-message-bar>
```

## When to use

* Use the message bar to display important announcements or notifications to the user.
* Use it to attract the user's attention without interrupting the user's task.

## When not to use

* Do not use the message bar for displaying critical alerts or warnings that require immediate and focused attention.

## Code

The source for `moz-message-bar` can be found under
[toolkit/content/widgets/moz-message-bar](https://searchfox.org/mozilla-central/source/toolkit/content/widgets/moz-message-bar/moz-message-bar.mjs).
You can find an examples of `moz-message-bar` in use in the Firefox codebase in
[about:addons](https://searchfox.org/mozilla-central/source/toolkit/mozapps/extensions/content/aboutaddons.html) and
[unified extensions panel](https://searchfox.org/mozilla-central/source/browser/base/content/browser-addons.js).

## How to use `moz-message-bar`

### Importing the element

Like other custom elements, you should usually be able to rely on `moz-message-bar` getting lazy loaded at the time of first use. See [this documentation](https://firefox-source-docs.mozilla.org/browser/components/storybook/docs/README.reusable-widgets.stories.html#using-new-design-system-components) for more information on using design system custom elements.

### Fluent usage

Generally the `heading` and `message` properties of
`moz-message-bar` will be provided via [Fluent attributes](https://mozilla-l10n.github.io/localizer-documentation/tools/fluent/basic_syntax.html#attributes).
To get this working you will need to format your Fluent message like this:

```
with-heading-and-message =
  .heading = Heading text goes here
  .message = Message text goes here
```

The `data-l10n-attrs` will be set up automatically via `MozLitElement`, so you can just specify `data-l10n-id` on your message bar as you would with any other markup:

```html
  <moz-message-bar data-l10n-id="with-heading-and-message"></moz-message-bar>
```

### Custom `message` slot

Normally the "message" of `moz-message-bar` can only be a string (containing no HTML elements). However, if you'd like to use a message that contains nested HTML, such as an anchor link, you can use the message slot.


```html
<moz-message-bar>
  <span slot="message" data-l10n-id="moz-message-bar-message-slot">
    <a data-l10n-name="moz-message-bar-link" href="http://example.com"></a>
  </span>
</moz-message-bar>
```


```html story
<moz-message-bar>
  <span slot="message">Here is a message with a nested <a href="https://example.com" target="_blank">link</a>.</span>
</moz-message-bar>
```

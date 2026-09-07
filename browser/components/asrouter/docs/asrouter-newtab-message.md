# ASRouter New Tab Message

A custom web component for displaying ASRouter messages on the Firefox New Tab page.

Notably, this component is packaged to take advantage of newtab train-hopping. The newtab extension knows to package this component in at build-time both to the built-in instance of newtab, as well as the train-hoppable XPI. **It is the responsibility of the owners of this component to maintain newtab train-hop compatibility. At this time, the owners of this component are the OMC team.**

## Overview

The `<asrouter-newtab-message>` component is a Lit-based custom element that integrates with Firefox's ASRouter messaging system and the newtab External Components mechanism. It provides a standardized way to display promotional, informational, or actionable messages to users on the newtab page.

## Integration

The component is loaded dynamically through the newtab page's `ExternalComponentWrapper` and is wrapped by the `MessageWrapper` component, which provides message lifecycle management and telemetry tracking.

### Message Configuration

Messages are configured through ASRouter's messaging system. A typical message configuration looks like:

```javascript
{
  id: "MY_NEWTAB_MESSAGE",
  template: "newtab_message",
  content: {
    messageType: "ASRouterNewTabMessage",
    // Additional content properties for your message
  },
  trigger: {
    id: "newtabMessageCheck",
  },
  groups: [],
}
```

## Properties

### `content` (Object)
The message data object from ASRouter containing all configuration and content for the message. This is passed in by the newtab page infrastructure.

`content` is passed directly through to `asrouter-newtab-message` to use as it pleases. One optional property, however, is used by New Tab as a way of controlling the position of the message - `content.position`.

This is a string property that can have the following values:

- `ABOVE_TOPSITES`: The message will be displayed above where top sites normally render (regardless of whether topsites are configured to be displayed)
- `ABOVE_WIDGETS`: The message will be displayed above where widgets normally render (regardless of whether widgets are configured to be displayed)
- `ABOVE_CONTENT_FEED`: The message will be displayed above where the content feed (stories) normally render (regardless of whether stories are configured to be displayed)

If `content.position` is not defined, it defaults to the `ABOVE_WIDGETS` behaviour.

### `content.imageSrc` (String)

This is an optional square image that can be displayed at the start of the message surface. If `imageSrc` is not defined, the image element is not rendered.

### Handler Functions

The following functions are injected by the newtab `MessageWrapper` component and provide message lifecycle management:

#### `handleClose` (Function)
Closes the message and removes it from the DOM without recording any telemetry. This is a purely visual action that hides the message for the current session. The message may appear again in future sessions.

**Use this when:** The user wants to temporarily dismiss the message without expressing an opinion about it.

#### `handleDismiss` (Function)
Dismisses the message, records a DISMISS telemetry event, and removes it from the DOM. This is a superset of `handleClose` that also records user intent. Internally, this calls `handleClose` after recording telemetry.

**Use this when:** The user actively chooses to dismiss the message (e.g., clicking an "X" or "No thanks" button).

#### `handleBlock` (Function)
Blocks the message permanently by adding its ID (or campaign ID) to ASRouter's block list. Blocked messages will never be shown again, even across browser restarts. This does NOT automatically remove the message from the DOM - you typically want to call `handleClose` after blocking.

**Use this when:** The user explicitly indicates they never want to see this message or campaign again (e.g., clicking "Don't show me this again").

#### `handleClick` (Function)
Records a CLICK telemetry event for user interaction with the message.

**Parameters:**
- `elementId` (string, optional): An identifier for the clicked element, used for telemetry tracking.

**Use this when:** The user clicks on interactive elements within the message that you want to track.

### `isIntersecting` (Boolean)
Indicates whether the message element is currently visible in the viewport. This is managed by the `MessageWrapper` using an Intersection Observer. This can be useful for triggering animations or lazy-loading content only when the message becomes visible.

## Methods

### `specialMessageAction(action)`
Executes a SpecialMessageAction by dispatching an event that will be caught by the ASRouterNewTabMessage JSWindowActor pair and forwarded to SpecialMessageActions.handleAction() in the parent process.

**Parameters:**
- `action` (Object): The action object to execute. Must conform to the SpecialMessageActions schema.
  - `type` (string): The action type (e.g., "OPEN_URL", "OPEN_SIDEBAR", "SET_PREF")
  - `data` (any): Action-specific data

**Example:**
```javascript
this.specialMessageAction({
  type: "OPEN_URL",
  data: { url: "https://example.com" }
});
```

## Strings

Since this component is meant to support train-hopping, its strings must live within `newtab.ftl`, or be statically plumbed through the `messageData` object. Usage of any new strings in `newtab.ftl` must be coordinated with the New Tab team to ensure that the strings are translated for the regions the message strings are meant to target.

## Testing

See `browser/components/asrouter/tests/browser/browser_asrouter_newtab_messages.js` for example browser tests that exercise the component's functionality. This test file has the `newtab` tag, meaning that it will be included in train-hop compatibility CI jobs.

## See Also

- [New Tab External Components](../../../extensions/newtab/docs/v2-system-addon/external_components_guide.md)
- [New Tab Train-hop Compatibility](../../../extensions/newtab/docs/v2-system-addon/train_hopping.md)
- [ASRouter Documentation](../../asrouter/docs/index.rst)

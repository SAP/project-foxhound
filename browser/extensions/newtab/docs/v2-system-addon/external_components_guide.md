# External Components Registration Guide

This guide is for Firefox feature teams who want to embed custom web components into the about:newtab and about:home pages.

## Overview

The External Components system allows you to register custom web components that will be displayed on the New Tab page without modifying the New Tab codebase. You provide a registrant module that returns component configurations, and the New Tab system handles loading and rendering your components.

## Getting Started

The first step is always to engage with the New Tab team in order to arrange for your component to be integrated, as there's some work that must occur within the New Tab code to allow this.

The New Tab team will help guide you as you develop your component so that it integrates properly and sustainably. The intent of this mechanism is so that external teams can focus on providing the features that they're the experts in, while New Tab can ensure that the integration of those features maps properly to New Tab's needs.

## Component Configuration

Each component configuration must include:

```javascript
{
  type: "UNIQUE_TYPE",           // Required: Unique identifier for this component type.
  componentURL: "chrome://...",  // Required: URL to the module that defines the custom element
  tagName: "custom-element",     // Required: Tag name of the custom element
  l10nURLs: [],                  // Optional: Array of localization file URLs
  attributes: {},                // Optional: HTML attributes to set on the element
  cssVariables: {}               // Optional: CSS custom properties to set on the element
}
```

### Required Fields

- **type**: A unique string identifier for your component (e.g., `"SEARCH"`, `"MY_FEATURE"`). This must be unique across all registered components. The New Tab team will assign this to you once you've started talking to them about your external component.
- **componentURL**: A chrome:// or resource:// URL pointing to the ES module that defines your custom element.
- **tagName**: The HTML tag name for your custom element (must contain a hyphen per web component standards).

### Optional Fields

- **l10nURLs**: Array of Fluent localization file paths (e.g., `["browser/myfeature.ftl"]`)
- **attributes**: Object mapping attribute names to values to set on your custom element
- **cssVariables**: Object mapping CSS custom property names to values for styling

## Step-by-Step Registration

### 1. Create a Registrant Module

Create a module that extends `BaseAboutNewTabComponentRegistrant`:

```javascript
// MyComponentRegistrant.sys.mjs
import {
  AboutNewTabComponentRegistry,
  BaseAboutNewTabComponentRegistrant,
} from "moz-src:///browser/components/newtab/AboutNewTabComponents.sys.mjs";

export class MyComponentRegistrant extends BaseAboutNewTabComponentRegistrant {
  getComponents() {
    return [
      {
        type: AboutNewTabComponentRegistry.TYPES.MY_FEATURE,
        componentURL: "chrome://browser/content/myfeature/component.mjs",
        tagName: "my-feature-component",
        l10nURLs: ["browser/myfeature.ftl"],
        attributes: {
          "data-feature-id": "my-feature",
          "role": "region"
        },
        cssVariables: {
          "--feature-primary-color": "var(--in-content-primary-button-background)",
          "--feature-spacing": "16px"
        }
      }
    ];
  }
}
```

### 2. Define Your Custom Element

Create the custom element referenced in your `componentURL`. This can be a
vanilla web component, or a `MozLitElement`.

```javascript
// component.mjs
class MyFeatureComponent extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });

    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          padding: var(--feature-spacing, 12px);
          color: var(--feature-primary-color, blue);
        }
      </style>
      <div data-l10n-id="my-feature-title"></div>
      <div class="content"></div>
    `;

    this.render();
  }

  disconnectedCallback() {
    // Clean up any event listeners or resources
  }

  render() {
    const content = this.shadowRoot.querySelector(".content");
    content.textContent = "My feature content";
  }
}

customElements.define("my-feature-component", MyFeatureComponent);
```

### 3. Register with the Category Manager

Register your registrant with the category manager when your feature initializes.

Typically, this is done declaratively inside of a chrome manifest file like
`BrowserComponents.manifest`, like so:

```
category browser-newtab-external-component moz-src:///browser/components/my-team/MyComponentRegistrant.sys.mjs MyComponentRegistrant
```

Declarative is preferable, but if you need to do this dynamically, it can be done
by adding a category at runtime like so:

```javascript
Services.catMan.addCategoryEntry(
  "browser-newtab-external-component",
  "moz-src:///browser/components/my-team/MyComponentRegistrant.sys.mjs",
  "MyComponentRegistrant",
  false,
  true
);
```

## Best Practices

### Use Shadow DOM

Always use Shadow DOM to encapsulate your component's styles and avoid conflicts:

```javascript
connectedCallback() {
  const shadow = this.attachShadow({ mode: "open" });
  // Your component markup goes here
}
```

### Never reach into the New Tab page DOM

**External components are forbidden** from reaching outside of themselves into the
surrounding page DOM either for reading or writing state. If there's some state
value that your component needs to read, talk to the New Tab team so that we
can expose that value to you.

### Localization

Use Fluent for all user-facing strings:

1. Add your localization file to `l10nURLs` in your configuration
2. Use `data-l10n-id` attributes in your markup
3. Create corresponding entries in your .ftl file

Example .ftl file:
```fluent
my-feature-title = My Feature
my-feature-description = This is my feature description
```

### Styling

Use CSS custom properties for theming to integrate with Firefox's design system:

```css
:host {
  color: var(--in-content-text-color);
  background: var(--in-content-box-background);
  font: message-box;
}
```

### Cleanup

Always clean up resources in `disconnectedCallback`:

```javascript
disconnectedCallback() {
  // Remove event listeners
  // Cancel pending operations
  // Clear timers
}
```

## Testing

### Writing Tests

Test your registrant in xpcshell tests:

```javascript
add_task(async function test_my_registrant() {
  const registrant = new MyComponentRegistrant();
  const components = registrant.getComponents();

  Assert.equal(components.length, 1);
  Assert.equal(components[0].type, "MY_FEATURE");
  Assert.equal(components[0].tagName, "my-feature-component");
});
```

### Integration Testing

Test that your component registers correctly with the category manager:

```javascript
add_task(async function test_component_registration() {
  let registry = new AboutNewTabComponentRegistry();

  Services.catMan.addCategoryEntry(
    "browser-newtab-external-component",
    "resource://gre/modules/MyComponentRegistrant.sys.mjs",
    "MyComponentRegistrant",
    false,
    true
  );

  await TestUtils.waitForTick();

  let components = Array.from(registry.values);
  Assert.ok(components.some(c => c.type === "MY_FEATURE"));

  Services.catMan.deleteCategoryEntry(
    "browser-newtab-external-component",
    "resource://gre/modules/MyComponentRegistrant.sys.mjs",
    false
  );

  registry.destroy();
});
```

## Debugging

### Enable Logging

Set this pref to enable component registration logging:

```
browser.newtabpage.activity-stream.externalComponents.log=true
```

### Common Issues

**Component not appearing on New Tab:**
- Verify your registrant is added to the category manager
- Check that your component type is unique
- Ensure your custom element is properly defined
- Check the browser console for errors

**Styling issues:**
- Verify you're using Shadow DOM
- Check that CSS custom properties are defined
- Ensure localization files are loaded

**Type conflicts:**
- Each component type must be unique. If two registrants provide the same type, only the first one will be registered.

## Support

For questions or issues with the External Components system, contact the Firefox New Tab team or file a bug in the `Firefox :: New Tab Page` component.

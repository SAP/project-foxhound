# External Components Architecture

Internal documentation for the New Tab team on the External Components system implementation.

## Overview

The External Components system provides a pluggable architecture for embedding custom web components from other Firefox features into about:newtab and about:home. This document describes the internal architecture, data flow, and implementation details.

## System Components

### 1. AboutNewTabComponentRegistry

**Location**: `browser/components/newtab/AboutNewTabComponents.sys.mjs`

The registry is the central coordinator for external components. It:

- Observes the `browser-newtab-external-component` category for registrant modules
- Loads and validates registrants and their component configurations
- Maintains a deduplicated map of components keyed by type
- Emits `UPDATED_EVENT` when components are added or removed
- Provides access via `AboutNewTabComponentRegistry.instance()`
- Lives under `browser/components/newtab`, and therefore, does not train-hop.
  Since the train-hopping `ExternalComponentsFeed.sys.mjs` talks to it, care must
  be given to ensure train-hop compatibility if either changes.

#### Validation Rules for Registrants

- Registrants must extend `BaseAboutNewTabComponentRegistrant`
- Component configurations must have `type`, `componentURL`, and `tagName`
- Duplicate types are rejected (first registrant wins)
- Invalid configurations are logged but don't break the system

### 2. ExternalComponentsFeed

**Location**: `browser/extensions/newtab/lib/ExternalComponentsFeed.sys.mjs`

The feed connects the registry to the Redux store and manages component data distribution.

The feed instantiates and has responsibility over the `AboutNewTabComponentRegistry`
instance.

This feed lives within `browser/extensions/newtab`, and will train-hop - however,
it depends on `AboutNewTabComponents.sys.mjs`, which does not train-hop. Care must
be given to ensure train-hop compatibility if either changes.

#### Responsibilities

- Initializes on `INIT` action
- Queries the registry for all registered components
- Dispatches `REFRESH_EXTERNAL_COMPONENTS` to broadcast component data to content processes
- Responds to registry `UPDATED_EVENT` to refresh component data

#### Data Flow

```
INIT action
    ↓
ExternalComponentsFeed.onAction()
    ↓
refreshComponents()
    ↓
AboutNewTabComponentRegistry instance.values()
    ↓
ac.BroadcastToContent(REFRESH_EXTERNAL_COMPONENTS, [...components])
    ↓
Redux Store (ExternalComponents state)
```

### 3. ExternalComponentWrapper

**Location**: `browser/extensions/newtab/content-src/components/ExternalComponentWrapper/ExternalComponentWrapper.jsx`

A React component that loads and renders external custom elements.

#### Component Lifecycle

```javascript
<ExternalComponentWrapper type="SEARCH" className="search-wrapper" />
```

**Mount**:
1. Look up configuration by type from Redux store
2. If no config, log warning and return
3. Dynamically import the component module
4. Create and append localization link elements to document head
5. Create the custom element via `document.createElement()`
6. Apply attributes and CSS variables from configuration
7. Append custom element to container div

**Unmount**:
1. Remove custom element from DOM
2. Remove localization link elements

#### Key Implementation Details

- Uses `useEffect` with dependency on `[type, ExternalComponents.components]`
- Uses `importModule` prop for dependency injection (enables testing)
- Uses refs to track custom element and l10n links
- Renders error state (null) if component loading fails
- Prevents duplicate element creation on re-renders

## Complete Data Flow

```
1. Feature registers with category manager

2. AboutNewTabComponentRegistry observes category change

3. Registry emits UPDATED_EVENT

4. On ActivityStream INIT:
   ExternalComponentsFeed.onAction(INIT)
     → refreshComponents()
     → dispatch(BroadcastToContent(REFRESH_EXTERNAL_COMPONENTS))

5. Redux reducer updates state.ExternalComponents

6. ExternalComponentWrappers do the work of mapping configurations to hook
   points within the DOM.
   <ExternalComponentWrapper type="SEARCH" />
     → connect(state => ({ ExternalComponents: state.ExternalComponents }))

7. Component loads and renders at the ExternalComponentWrapper hook point:
   useEffect → import(componentURL) → createElement(tagName) → appendChild()
```

## Adding New Features

### For the New Tab Team

When adding support for a new component placement:

1. Add `<ExternalComponentWrapper>` to the desired location in your React component
2. Specify the `type` prop matching the component type
3. Add appropriate CSS for the wrapper element
4. Update tests to account for the new component location

Example:
```jsx
<div className="newtab-search-section">
  <ExternalComponentWrapper
    type="SEARCH"
    className="search-handoff-wrapper"
  />
</div>
```

## Error Handling

The system is designed to be resilient:

- Invalid registrants are logged but don't crash the registry
- Invalid component configurations are skipped
- Component loading errors are caught and logged
- Failed components render null without breaking the page

All errors are logged to the browser console with descriptive messages.

## Future Improvements

Potential areas for enhancement:

- Add support for component communication to the parent process via custom events and subclassable JSActor pairs
- Add support for React components (not just custom elements)
- Add component lifecycle hooks for more complex initialization
- Add support for conditional rendering based on prefs or experiments
- Add performance monitoring for component load times
- Add support for component updates without full remount
- Add support for opt-in train-hopping for external components

## Debugging

### Logging

Enable verbose logging:
```
browser.newtabpage.activity-stream.externalComponents.log=true
```

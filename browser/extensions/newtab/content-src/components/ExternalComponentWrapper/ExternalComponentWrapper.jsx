/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { useSelector } from "react-redux";

/**
 * A React component that dynamically loads and embeds external custom elements
 * into the newtab page.
 *
 * This component serves as a bridge between React's declarative rendering and
 * browser-native custom elements that are registered and managed outside of
 * React's control. It:
 *
 * 1. Looks up the component configuration by type from the ExternalComponents
 *    registry
 * 2. Dynamically imports the component's script module (which registers the
 *    custom element)
 * 3. Creates an instance of the custom element using imperative DOM APIs
 * 4. Appends it to a React-managed container div
 * 5. Cleans up the custom element on unmount
 *
 * This approach is necessary because:
 * - Custom elements have their own lifecycle separate from React
 * - They need to be created imperatively (document.createElement) rather than
 *   declaratively (JSX)
 * - React shouldn't try to diff/reconcile their internal DOM, as they manage
 *   their own shadow DOM
 * - We need manual cleanup to prevent memory leaks when the component unmounts
 *
 * @param {object} props
 * @param {string} props.type - The component type to load (e.g., "SEARCH")
 * @param {string} props.className - CSS class name(s) to apply to the wrapper div
 * @param {Function} props.importModule - Function to import modules (for testing)
 */
function ExternalComponentWrapper({
  type,
  className,
  // importFunction is declared as an arrow function here purely so that we can
  // override it for testing.
  // eslint-disable-next-line no-unsanitized/method
  importModule = url => import(/* webpackIgnore: true */ url),
}) {
  const containerRef = React.useRef(null);
  const customElementRef = React.useRef(null);
  const l10nLinksRef = React.useRef([]);
  const [error, setError] = React.useState(null);
  const { components } = useSelector(state => state.ExternalComponents);

  React.useEffect(() => {
    const container = containerRef.current;

    const loadComponent = async () => {
      try {
        const config = components.find(c => c.type === type);

        if (!config) {
          console.warn(
            `No external component configuration found for type: ${type}`
          );
          return;
        }

        await importModule(config.componentURL);

        l10nLinksRef.current = [];
        for (let l10nURL of config.l10nURLs) {
          const l10nEl = document.createElement("link");
          l10nEl.rel = "localization";
          l10nEl.href = l10nURL;
          document.head.appendChild(l10nEl);
          l10nLinksRef.current.push(l10nEl);
        }

        if (containerRef.current && !customElementRef.current) {
          const element = document.createElement(config.tagName);

          if (config.attributes) {
            for (const [key, value] of Object.entries(config.attributes)) {
              element.setAttribute(key, value);
            }
          }

          if (config.cssVariables) {
            for (const [variable, style] of Object.entries(
              config.cssVariables
            )) {
              element.style.setProperty(variable, style);
            }
          }

          customElementRef.current = element;
          containerRef.current.appendChild(element);
        }
      } catch (err) {
        console.error(
          `Failed to load external component for type ${type}:`,
          err
        );
        setError(err);
      }
    };

    loadComponent();

    return () => {
      if (customElementRef.current && container) {
        container.removeChild(customElementRef.current);
        customElementRef.current = null;
      }

      for (const link of l10nLinksRef.current) {
        link.remove();
      }
      l10nLinksRef.current = [];
    };
  }, [type, components, importModule]);

  if (error) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}

export { ExternalComponentWrapper };

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
 * @param {object} props.props - Properties to assign to the component, where
 *   each key is the property name, and the value is the property value.
 */
// eslint-disable-next-line no-unsanitized/method
const defaultImportModule = url => import(/* webpackIgnore: true */ url);

function ExternalComponentWrapper({
  type,
  className,
  // importModule can be overridden for testing.
  importModule = defaultImportModule,
  ...props
}) {
  const containerRef = React.useRef(null);
  const customElementRef = React.useRef(null);
  const cleanupRef = React.useRef(null);
  const scriptRef = React.useRef(null);
  const styleRef = React.useRef(null);
  const shadowRootRef = React.useRef(null);
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

        l10nLinksRef.current = [];
        for (const l10nURL of config.l10nURLs ?? []) {
          const l10nEl = document.createElement("link");
          l10nEl.rel = "localization";
          l10nEl.href = l10nURL;
          document.head.appendChild(l10nEl);
          l10nLinksRef.current.push(l10nEl);
        }

        if (config.mountStrategy === "react-bundle") {
          if (!shadowRootRef.current) {
            shadowRootRef.current =
              container.shadowRoot ?? container.attachShadow({ mode: "open" });
            document.l10n.connectRoot(shadowRootRef.current);
          }
          const shadowRoot = shadowRootRef.current;

          for (const stylesURL of config.stylesURLs) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = stylesURL;
            shadowRoot.appendChild(link);
          }

          if (config.moduleURLs?.length) {
            await Promise.all(config.moduleURLs.map(url => importModule(url)));
          }

          const mountPoint = document.createElement("div");
          shadowRoot.appendChild(mountPoint);

          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = config.bundleURL;
            script.onload = () => {
              cleanupRef.current = window[config.mountFunction](
                mountPoint,
                props
              );
              resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
            scriptRef.current = script;
          });
          return;
        }

        await importModule(config.componentURL);

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

          if (props) {
            for (let [propName, propValue] of Object.entries(props)) {
              element[propName] = propValue;
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
      cleanupRef.current?.();
      cleanupRef.current = null;
      scriptRef.current?.remove();
      scriptRef.current = null;

      if (shadowRootRef.current) {
        document.l10n.disconnectRoot(shadowRootRef.current);
        while (shadowRootRef.current.firstChild) {
          shadowRootRef.current.firstChild.remove();
        }
        shadowRootRef.current = null;
      } else {
        styleRef.current?.remove();
        styleRef.current = null;
      }

      if (customElementRef.current && container) {
        container.removeChild(customElementRef.current);
        customElementRef.current = null;
      }

      for (const link of l10nLinksRef.current) {
        link.remove();
      }
      l10nLinksRef.current = [];
    };
    // props is intentionally excluded from the dependency array because it creates
    // a new object reference on every render, which would cause the effect to
    // re-run unnecessarily. The props are only used during initial element creation,
    // which is guarded by the !customElementRef.current check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, components, importModule]);

  if (error) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}

export { ExternalComponentWrapper };

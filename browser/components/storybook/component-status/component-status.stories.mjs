/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  LitElement,
  html,
  css,
} from "chrome://global/content/vendor/lit.all.mjs";
import componentsData from "./components.json";

/* DS styles */
import dsTokensTable from "toolkit/themes/shared/design-system/storybook/tokens-table.css";

export default {
  title: "Docs/Component Statuses",
  parameters: {
    options: { showPanel: false },
    docs: { source: { state: "closed" } },
  },
};

/**
 * A component that displays the UI Widget Reusable Library components.
 *
 * Features:
 * - Lists all reusable UI components from toolkit/content/widgets
 * - Provides direct links to:
 *   - Individual component
 *   - Component source code in SearchFox
 *   - Related Bugzilla ticket
 * - Shows implementation progress status for each component
 *
 * @see {@link https://bugzilla.mozilla.org/show_bug.cgi?id=1795301} Main tracking bug
 */
class ComponentStatusList extends LitElement {
  static properties = {
    _components: { state: true },
  };

  static styles = css`
    tr td:first-of-type {
      color-scheme: unset;
    }

    tr td {
      border-bottom-color: var(--border-color);
    }

    /* the button look */
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-xsmall) var(--space-small);
      border: var(--border-width) solid var(--border-color);
      border-radius: var(--border-radius-small);
      background: var(--button-background-color);
      color: var(--link-color); /* prevent visited purple */
      text-decoration: none;
      line-height: 1;
      min-inline-size: 0;
      cursor: pointer;
    }

    /* hover/active */
    a:hover {
      background: var(--button-background-color-hover);
    }

    /* arrow only on external buttons */
    a[target="_blank"]::after {
      content: "↗" !important; /* wins over any earlier content:none */
      margin-inline-start: var(--space-small);
      font-size: var(--font-size-small);
      line-height: 1;
      opacity: 0.8;
    }
  `;

  constructor() {
    super();

    this._components = Array.isArray(componentsData?.items)
      ? componentsData.items
      : [];
  }

  render() {
    return html`
      <link rel="stylesheet" href=${dsTokensTable} />
      <header>
        <h1>Component Statuses</h1>
        <p>
          Tracking
          <a
            href="https://bugzilla.mozilla.org/show_bug.cgi?id=1795301"
            target="_blank"
            rel="noreferrer"
            >reusable components</a
          >
          from
          <code>toolkit/content/widgets</code>.
        </p>
      </header>
      <div class="table-wrapper">${this._renderTable()}</div>
    `;
  }

  /********  Helpers *********/
  // Get story Id href
  _storyHrefFromId(storyId) {
    return storyId ? `/?path=/story/${storyId}` : "#";
  }

  _renderLinkGroup(it) {
    const storyHref = this._storyHrefFromId(it.storyId);
    const links = [["Story", storyHref, { top: true }]];
    if (it.sourceUrl) {
      links.push(["Source", it.sourceUrl, { top: false }]);
    }
    const bugUrl = it.bugUrl;
    if (bugUrl && /bugzilla\.mozilla\.org/.test(bugUrl)) {
      links.push(["Bugzilla", bugUrl, { top: false }]);
    }

    return html`
      ${links.map(
        ([label, href, opts = {}]) => html`
          <a
            href=${href}
            rel="noreferrer"
            target=${opts.top ? "_top" : "_blank"}
          >
            ${label}
          </a>
        `
      )}
    `;
  }

  _renderTable() {
    return html`
      <table class="token-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>Status</th>
            <th>Links</th>
          </tr>
        </thead>
        <tbody>
          ${this._components.map(
            it => html`
              <tr>
                <td>
                  <a
                    href=${this._storyHrefFromId(it.storyId)}
                    target="_top"
                    rel="noreferrer"
                  >
                    ${it.component}
                  </a>
                </td>
                <td>${it.status ?? "unknown"}</td>
                <td>${this._renderLinkGroup(it)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }
}

customElements.define("component-status-list", ComponentStatusList);

export const Default = () => {
  return html`<component-status-list></component-status-list>`;
};

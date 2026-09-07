/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const XHTML_NS = "http://www.w3.org/1999/xhtml";

const STYLE_INSPECTOR_PROPERTIES =
  "devtools/shared/locales/styleinspector.properties";

loader.lazyGetter(this, "STYLE_INSPECTOR_L10N", function () {
  const { LocalizationHelper } = require("resource://devtools/shared/l10n.js");
  return new LocalizationHelper(STYLE_INSPECTOR_PROPERTIES);
});
loader.lazyGetter(this, "L10N_EMPTY", function () {
  return STYLE_INSPECTOR_L10N.getStr("rule.variableEmpty");
});

class CssQueryContainerTooltipHelper {
  /**
   * Fill the tooltip with container information.
   */
  async setContent(data, tooltip) {
    const inspector = data.rule.elementStyle.ruleView.inspector;
    const res = await data.rule.domRule.getQueryContainerForNode(
      data.ancestorIndex,
      data.rule.inherited || inspector.selection.nodeFront,
      data.conditionIndex
    );

    const { doc } = tooltip;

    const tooltipContainer = doc.createElementNS(XHTML_NS, "div");
    tooltipContainer.classList.add("devtools-tooltip-query-container");

    if (!res.node) {
      tooltipContainer.setAttribute(
        "data-l10n-id",
        "css-selector-container-query-condition-no-container"
      );
      tooltipContainer.setAttribute(
        "data-l10n-args",
        JSON.stringify({ name: res.containerName })
      );
    } else {
      const nodeContainer = doc.createElementNS(XHTML_NS, "header");
      tooltipContainer.append(nodeContainer);

      const nodeEl = doc.createElementNS(XHTML_NS, "span");
      nodeEl.classList.add("objectBox-node");
      nodeContainer.append(nodeEl);
      nodeEl.append("<");

      const nodeNameEl = doc.createElementNS(XHTML_NS, "span");
      nodeNameEl.classList.add("tag-name");
      nodeNameEl.appendChild(
        doc.createTextNode(res.node.nodeName.toLowerCase())
      );

      nodeEl.appendChild(nodeNameEl);

      if (res.node.id) {
        const idEl = doc.createElementNS(XHTML_NS, "span");
        idEl.classList.add("attribute-name");
        idEl.appendChild(doc.createTextNode(`#${res.node.id}`));
        nodeEl.appendChild(idEl);
      }

      for (const attr of res.node.attributes) {
        if (attr.name !== "class") {
          continue;
        }
        for (const cls of attr.value.split(/\s/)) {
          const el = doc.createElementNS(XHTML_NS, "span");
          el.classList.add("attribute-name");
          el.appendChild(doc.createTextNode(`.${cls}`));
          nodeEl.appendChild(el);
        }
      }
      nodeEl.append(">");

      nodeEl.addEventListener("mouseover", async () => {
        await inspector.highlighters.showHighlighterTypeForNode(
          inspector.highlighters.TYPES.BOXMODEL,
          res.node
        );
      });
      nodeEl.addEventListener("mouseout", async () => {
        await inspector.highlighters.hideHighlighterType(
          inspector.highlighters.TYPES.BOXMODEL
        );
      });

      const jumpToNodeButton = doc.createElementNS(XHTML_NS, "button");
      jumpToNodeButton.classList.add("open-inspector");
      jumpToNodeButton.setAttribute(
        "title",
        STYLE_INSPECTOR_L10N.getStr(
          "rule.containerQuery.selectContainerButton.tooltip"
        )
      );
      jumpToNodeButton.addEventListener("click", () => {
        inspector.selection.setNodeFront(res.node);
      });
      nodeEl.appendChild(jumpToNodeButton);

      const ul = doc.createElementNS(XHTML_NS, "ul");
      tooltipContainer.appendChild(ul);

      if (res.containerName) {
        const containerNameEl = doc.createElementNS(XHTML_NS, "li");
        const containerNameLabel = doc.createElementNS(XHTML_NS, "span");
        containerNameLabel.classList.add("property-name");
        containerNameLabel.append(`container-name`);

        const containerNameValue = doc.createElementNS(XHTML_NS, "span");
        containerNameValue.classList.add("property-value");
        containerNameValue.append(res.containerName);

        containerNameEl.append(containerNameLabel, ": ", containerNameValue);
        ul.appendChild(containerNameEl);
      }

      const containerTypeEl = doc.createElementNS(XHTML_NS, "li");
      const containerTypeLabel = doc.createElementNS(XHTML_NS, "span");
      containerTypeLabel.classList.add("property-name");
      containerTypeLabel.appendChild(doc.createTextNode(`container-type`));

      const containerTypeValue = doc.createElementNS(XHTML_NS, "span");
      containerTypeValue.classList.add("property-value");
      containerTypeValue.appendChild(doc.createTextNode(res.containerType));

      containerTypeEl.append(
        containerTypeLabel,
        doc.createTextNode(": "),
        containerTypeValue
      );
      ul.appendChild(containerTypeEl);

      let unsetEl;
      for (const { name, value, type } of res.queryFeatures) {
        const el = doc.createElementNS(XHTML_NS, "li");

        // We should display a specific string when the property is not set (i.e.
        // when value is null).
        if (value === null) {
          if (!unsetEl) {
            unsetEl = doc.createElementNS(XHTML_NS, "ul");
            unsetEl.classList.add("unset-properties");
            tooltipContainer.appendChild(unsetEl);
          }
          if (type === "var") {
            el.append(
              STYLE_INSPECTOR_L10N.getFormatStr("rule.variableUnset", name)
            );
          } else if (type === "attr") {
            el.append(
              STYLE_INSPECTOR_L10N.getFormatStr("rule.attributeUnset", name)
            );
          }
          unsetEl.append(el);
          continue;
        }
        const labelEl = doc.createElementNS(XHTML_NS, "span");
        labelEl.classList.add("property-name");
        labelEl.append(name);

        const valueEl = doc.createElementNS(XHTML_NS, "span");
        valueEl.classList.add("property-value");
        // if value is an empty string, let's display <empty>
        valueEl.append(value === "" ? `<${L10N_EMPTY}>` : value);
        if (value === "") {
          valueEl.classList.add("empty");
        }

        el.append(labelEl, ": ", valueEl);

        ul.appendChild(el);
      }
    }

    await tooltip.replaceChildrenLocalized(tooltipContainer, {
      width: "auto",
    });
  }
}

module.exports = CssQueryContainerTooltipHelper;

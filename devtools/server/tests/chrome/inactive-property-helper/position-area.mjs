/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// InactivePropertyHelper `position-area` test cases.
export default [
  {
    info: "position-area is inactive on non-abs-pos element",
    property: "position-area",
    tagName: "div",
    rules: ["div { position-area: center; }"],
    isActive: false,
    expectedMsgId: "inactive-css-not-absolutely-positioned-item",
  },
  {
    info: "position-area is inactive on abs-pos element without default anchor",
    property: "position-area",
    tagName: "div",
    rules: ["div { position: absolute; position-area: center; }"],
    isActive: false,
    expectedMsgId: "inactive-css-no-default-anchor",
  },
  {
    info: "position-area is active on abs-pos element with anchor",
    property: "position-area",
    createTestElement: rootNode => {
      const anchor = document.createElement("button");
      const element = document.createElement("span");
      rootNode.append(anchor, element);
      return element;
    },
    rules: [
      "button { anchor-name: --my-anchor }",
      `span {
         position: absolute;
         position-anchor: --my-anchor;
         position-area: center;
       }`,
    ],
    ruleIndex: 1,
    isActive: true,
  },
  {
    info: "position-area is inactive on abs-pos element with unknown anchor name",
    property: "position-area",
    createTestElement: rootNode => {
      const anchor = document.createElement("button");
      const element = document.createElement("span");
      rootNode.append(anchor, element);
      return element;
    },
    rules: [
      "button { anchor-name: --my-anchor }",
      `span {
         position: absolute;
         position-anchor: --another-anchor;
         position-area: center;
       }`,
    ],
    ruleIndex: 1,
    isActive: false,
    expectedMsgId: "inactive-css-no-default-anchor",
  },
  {
    info: "position-area is active on element with implicit anchor (e.g. popover)",
    property: "position-area",
    createTestElement: rootNode => {
      const popover = document.createElement("aside");
      popover.id = "my-popover";
      popover.setAttribute("popover", "auto");

      const commander = document.createElement("button");
      commander.setAttribute("popovertarget", "my-popover");

      rootNode.append(commander, popover);

      // Show the popover
      commander.click();

      return popover;
    },
    rules: ["[popover] { position-area: center; }"],
    isActive: true,
  },
];

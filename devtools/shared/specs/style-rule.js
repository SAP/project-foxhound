/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {
  Arg,
  RetVal,
  generateActorSpec,
  types,
} = require("resource://devtools/shared/protocol.js");

// Load the shared types for style actors
require("resource://devtools/shared/specs/style/style-types.js");

types.addDictType("domstylerule.queryContainerForNodeReturn", {
  node: "nullable:domnode",
  containerType: "nullable:string",
  containerName: "nullable:string",
  queryFeatures: "nullable:array:json",
});

const styleRuleSpec = generateActorSpec({
  typeName: "domstylerule",

  events: {
    "location-changed": {
      type: "locationChanged",
      line: Arg(0, "number"),
      column: Arg(1, "number"),
    },
    "rule-updated": {
      type: "ruleUpdated",
      rule: Arg(0, "domstylerule"),
    },
  },

  methods: {
    getRuleText: {
      response: {
        text: RetVal("string"),
      },
    },
    setRuleText: {
      request: {
        newText: Arg(0, "string"),
        modifications: Arg(1, "array:json"),
      },
      response: { rule: RetVal("domstylerule") },
    },
    modifyProperties: {
      request: { modifications: Arg(0, "array:json") },
      response: { rule: RetVal("domstylerule") },
    },
    modifySelector: {
      request: {
        node: Arg(0, "domnode"),
        value: Arg(1, "string"),
        editAuthored: Arg(2, "boolean"),
      },
      response: RetVal("modifiedStylesReturn"),
    },
    getQueryContainerForNode: {
      request: {
        ancestorRuleIndex: Arg(0, "number"),
        node: Arg(1, "domnode"),
        conditionIndex: Arg(2, "number"),
      },
      response: RetVal("domstylerule.queryContainerForNodeReturn"),
    },
    getCssExplainersData: {
      request: {
        expression: Arg(0, "string"),
        pseudo: Arg(1, "nullable:string"),
        inheritedNode: Arg(2, "nullable:domnode"),
      },
      response: {
        steps: RetVal("array:string"),
      },
    },
  },
});

exports.styleRuleSpec = styleRuleSpec;

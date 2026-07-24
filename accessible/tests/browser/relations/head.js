/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* exported testCachedRelation, testRelated */

// Load the shared-head file first.
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/accessible/tests/browser/shared-head.js",
  this
);

// Loading and common.js from accessible/tests/mochitest/ for all tests, as
// well as promisified-events.js and relations.js.
/* import-globals-from ../../mochitest/relations.js */
loadScripts(
  { name: "common.js", dir: MOCHITESTS_DIR },
  { name: "promisified-events.js", dir: MOCHITESTS_DIR },
  { name: "relations.js", dir: MOCHITESTS_DIR }
);

/**
 * Test the accessible relation.
 *
 * @param identifier          [in] identifier to get an accessible, may be ID
 *                             attribute or DOM element or accessible object
 * @param relType             [in] relation type (see constants above)
 * @param relatedIdentifiers  [in] identifier or array of identifiers of
 *                             expected related accessibles
 */
async function testCachedRelation(
  identifier,
  relType,
  relatedIdentifiers = []
) {
  const relDescr = getRelationErrorMsg(identifier, relType);

  const relatedIds =
    relatedIdentifiers instanceof Array
      ? relatedIdentifiers
      : [relatedIdentifiers];

  await untilCacheIs(
    () => {
      let r = getRelationByType(identifier, relType);
      return r ? r.targetsCount : -1;
    },
    relatedIds.length,
    "Found correct number of expected relations"
  );

  let targetSet = new Set(relatedIds.map(id => getAccessible(id)));

  await untilCacheOk(function () {
    const relation = getRelationByType(identifier, relType);
    const actualTargets = relation ? relation.getTargets() : null;
    if (!actualTargets) {
      info("Could not fetch relations");
      return false;
    }

    const actualTargetsSet = new Set(
      Array.from({ length: actualTargets.length }, (_, idx) =>
        actualTargets.queryElementAt(idx, Ci.nsIAccessible)
      )
    );

    const unexpectedTargets = actualTargetsSet.difference(targetSet);
    for (let extraAcc of unexpectedTargets) {
      info(
        prettyName(extraAcc) +
          " was found, but shouldn't be in relation: " +
          relDescr
      );
    }

    const missingTargets = targetSet.difference(actualTargetsSet);
    for (let missingAcc of missingTargets) {
      info(
        prettyName(missingAcc) + " could not be found in relation: " + relDescr
      );
    }

    return unexpectedTargets.size == 0 && missingTargets.size == 0;
  }, "Expected targets match");
}

/**
 * Asynchronously set or remove content element's reflected elements attribute
 * (in content process if e10s is enabled).
 *
 * @param  {object}  browser  current "tabbrowser" element
 * @param  {string}  id       content element id
 * @param  {string}  attr     attribute name
 * @param  {string?} value    optional attribute value, if not present, remove
 *                            attribute
 * @return {Promise}          promise indicating that attribute is set/removed
 */
function invokeSetReflectedElementsAttribute(browser, id, attr, targetIds) {
  if (targetIds) {
    Logger.log(
      `Setting reflected ${attr} attribute to ${targetIds} for node with id: ${id}`
    );
  } else {
    Logger.log(`Removing reflected ${attr} attribute from node with id: ${id}`);
  }

  return invokeContentTask(
    browser,
    [id, attr, targetIds],
    (contentId, contentAttr, contentTargetIds) => {
      let elm = content.document.getElementById(contentId);
      if (contentTargetIds) {
        elm[contentAttr] = contentTargetIds.map(targetId =>
          content.document.getElementById(targetId)
        );
      } else {
        elm[contentAttr] = null;
      }
    }
  );
}

const REFLECTEDATTR_NAME_MAP = {
  "aria-controls": "ariaControlsElements",
  "aria-describedby": "ariaDescribedByElements",
  "aria-details": "ariaDetailsElements",
  "aria-errormessage": "ariaErrorMessageElements",
  "aria-flowto": "ariaFlowToElements",
  "aria-labelledby": "ariaLabelledByElements",
};

async function testRelated(
  browser,
  accDoc,
  attr,
  hostRelation,
  dependantRelation
) {
  let host = findAccessibleChildByID(accDoc, "host");
  let dependant1 = findAccessibleChildByID(accDoc, "dependant1");
  let dependant2 = findAccessibleChildByID(accDoc, "dependant2");

  /**
   * Test data has the format of:
   * {
   *   desc          {String}   description for better logging
   *   attrs         {?Array}   an optional list of attributes to update
   *   reflectedattr {?Array}   an optional list of reflected attributes to update
   *   expected      {Array}    expected relation values for dependant1, dependant2
   *                        and host respectively.
   * }
   */
  let tests = [
    {
      desc: "No attribute",
      expected: [null, null, null],
    },
    {
      desc: "Set attribute",
      attrs: [{ id: "host", key: attr, value: "dependant1" }],
      expected: [host, null, dependant1],
    },
    {
      desc: "Change attribute",
      attrs: [{ id: "host", key: attr, value: "dependant2" }],
      expected: [null, host, dependant2],
    },
    {
      desc: "Change attribute to multiple targets",
      attrs: [{ id: "host", key: attr, value: "dependant1 dependant2" }],
      expected: [host, host, [dependant1, dependant2]],
    },
    {
      desc: "Change 'dependent2' id to 'invalid'",
      attrs: [{ id: "dependant2", key: "id", value: "invalid" }],
      expected: [host, null, dependant1],
    },
    {
      desc: "Change 'invalid' id back to 'dependent2'",
      attrs: [{ id: "invalid", key: "id", value: "dependant2" }],
      expected: [host, host, [dependant1, dependant2]],
    },
    {
      desc: "Remove attribute",
      attrs: [{ id: "host", key: attr }],
      expected: [null, null, null],
    },
  ];

  let reflectedAttrName = REFLECTEDATTR_NAME_MAP[attr];
  if (reflectedAttrName) {
    tests = tests.concat([
      {
        desc: "Set reflected attribute",
        reflectedattr: [
          { id: "host", key: reflectedAttrName, value: ["dependant1"] },
        ],
        expected: [host, null, dependant1],
      },
      {
        desc: "Change reflected attribute",
        reflectedattr: [
          { id: "host", key: reflectedAttrName, value: ["dependant2"] },
        ],
        expected: [null, host, dependant2],
      },
      {
        desc: "Change reflected attribute to multiple targets",
        reflectedattr: [
          {
            id: "host",
            key: reflectedAttrName,
            value: ["dependant2", "dependant1"],
          },
        ],
        expected: [host, host, [dependant1, dependant2]],
      },
      {
        desc: "Remove reflected attribute",
        reflectedattr: [{ id: "host", key: reflectedAttrName, value: null }],
        expected: [null, null, null],
      },
    ]);
  }

  for (let { desc, attrs, reflectedattr, expected } of tests) {
    info(desc);

    if (attrs) {
      for (let { id, key, value } of attrs) {
        await invokeSetAttribute(browser, id, key, value);
      }
    } else if (reflectedattr) {
      for (let { id, key, value } of reflectedattr) {
        await invokeSetReflectedElementsAttribute(browser, id, key, value);
      }
    }

    await testCachedRelation(
      dependant1,
      dependantRelation,
      expected[0] ? expected[0] : []
    );
    await testCachedRelation(
      dependant2,
      dependantRelation,
      expected[1] ? expected[1] : []
    );
    await testCachedRelation(
      host,
      hostRelation,
      expected[2] ? expected[2] : []
    );
  }
}

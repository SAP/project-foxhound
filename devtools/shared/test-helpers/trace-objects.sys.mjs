/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CCAnalyzer } from "chrome://mochitests/content/browser/devtools/shared/test-helpers/cc-analyzer.sys.mjs";

/**
 * Print information about why a list of objects are being held in memory.
 *
 * @param Array<Object {weakRef: Object, ubiNodeId: String> leakedObjects
 *        List of object with 'weakRef' attribute pointing to a leaked object,
 *        and 'ubiNodeId' attribute refering to a ubi::Node's id.
 *        ubi::Node::Id can be retrieved via ChromeUtils.getObjectNodeId.
 *        (we don't compute the ubi::Node::Id from this method as it may be computed from
 *        the content process and 'weakRef' may be null here)
 * @param String snapshotFile
 *        Absolute path to a Heap snapshot file retrieved via this.getSnapshotFile.
 *        This is used to trace content process objects. We have to record the snapshot
 *        from the content process, but can only read it from the parent process because
 *        of I/O restrictions in content processes.
 */
export async function traceObjects(leakedObjects, snapshotFile) {
  // Initialize the CycleCollector logic
  let ccLeaks = [];
  // Only run the Cycle Collector if we have a 'weakRef'
  if (leakedObjects.some(o => o.weakRef?.get())) {
    // Put the leaked objects in an array to easily find them in the GC graph.
    const objects = leakedObjects.map(o => o.weakRef?.get());

    // /!\ Workaround as we can't easily get a CycleCollector CCObject for a given JS Object.
    // Put a somewhat unique attribute name on the `objects` array (the JS Object).
    // So that we can later look at all CycleCollector edge names and find this
    // attribute name. The CCObject which is the source of the edge will represent `objects`.
    //
    // We store a JS Object as attribute's value to ensure an edge exists.
    //
    // Ideally the CycleCollector API would help identify the address or a given JS Object.
    const uniqueAttributeName = "allocation-tracker-leak-array";
    objects[uniqueAttributeName] = {};

    // For some reason, being in the local scope prevent the CC from seeing `objects`.
    // Workaround this by transiently registering it in the global scope.
    // eslint-disable-next-line mozilla/reject-globalThis-modification
    globalThis.ccAnalyzerCCObjects = objects;

    const analyzer = new CCAnalyzer();
    await analyzer.run(true);

    delete globalThis.ccAnalyzerCCObjects;

    dump(" # objects: " + analyzer.count + "\n");
    dump(" # edges: " + analyzer.edges.length + "\n");

    // Find `objects` in the graph via its unique attribute name
    const { from: array } = analyzer.edges.find(
      e => e.name === uniqueAttributeName
    );

    ccLeaks = getCCArrayElements(array);
  }

  // Initialized the Memory API logic
  let snapshot, tree;
  if (leakedObjects.some(o => o.ubiNodeId)) {
    // There is no API to get the heap snapshot at runtime,
    // the only way is to save it to disk and then load it from disk
    snapshot = ChromeUtils.readHeapSnapshot(snapshotFile);
    tree = snapshot.computeDominatorTree();
  }

  let i = 1;
  for (const { ubiNodeId } of leakedObjects) {
    logTracker(`### Tracing leaked object #${i}:\n`);

    if (ccLeaks[i]) {
      printShortestCCPath(ccLeaks[i]);
    }

    if (ubiNodeId) {
      // Print the path from the global object down to leaked object.
      // This print the allocation site of each object which has a reference
      // to another object, ultimately leading to our leaked object.
      printShortestNodePath(snapshot, tree.root, ubiNodeId);

      /**
       * This happens to be somewhat redundant with printPath, but printed the other way around.
       *
       * Print the dominators.
       * i.e. from the leaked object, print all parent objects whichs
       */
      // printDominators(snapshot, tree, ubiNodeId);

      /**
       * In case you are not able to figure out what the object is.
       * This will print all what it keeps allocated,
       * kinds of list of attributes
       */
      // printDominated(snapshot, tree, ubiNodeId);
    }
    i++;
  }
}

// eslint-disable-next-line no-unused-vars
function printDominators(snapshot, tree, ubiNodeId) {
  logTracker("### Dominators:");
  logTracker(" " + getNodeObjectDescription(snapshot, ubiNodeId));
  while ((ubiNodeId = tree.getImmediateDominator(ubiNodeId))) {
    logTracker(" ^-- " + getNodeObjectDescription(snapshot, ubiNodeId));
  }
}

// eslint-disable-next-line no-unused-vars
function printDominated(snapshot, tree, ubiNodeId) {
  logTracker("### Dominateds:");
  logTracker(" " + getNodeObjectDescription(snapshot, ubiNodeId));
  for (const n of tree.getImmediatelyDominated(ubiNodeId)) {
    logTracker(" --> " + getNodeObjectDescription(snapshot, n));
  }
}

/**
 * Return the elements of a given array.
 *
 * @param {CCObject} array
 * @returns {CCObject}
 */
function getCCArrayElements(array) {
  return array.edges
    .filter(edge => edge.name.startsWith("objectElements"))
    .map(edge => edge.to);
}

/**
 * Return the shortest path between a given CCObject and a CCObject root.
 *
 * @param {CCObject} object
 * @param {Array} path (shouldn't be passed from the top callsite)
 * @param {set} processed (shouldn't be passed from the top callsite)
 * @returns {Array<Object{from:CCObject, name:String}>} List of CC Edges from object to root.
 */
function shortestCCPathToRoot(object, path = [], processed = new Set()) {
  if (object.root) {
    return path;
  }
  // Ignore the path if that goes through the CC Analyzer logic.
  if (object.name == "JS Object (Function - #runCC/<)") {
    return null;
  }
  if (processed.has(object)) {
    return null;
  }
  processed.add(object);
  let shortestPath = null;
  for (const edge of object.owners) {
    const edgePath = shortestCCPathToRoot(
      edge.from,
      [...path, edge],
      processed
    );
    if (!edgePath) {
      continue;
    }
    if (!shortestPath || edgePath.length < shortestPath.length) {
      shortestPath = edgePath;
    }
  }
  return shortestPath;
}

/**
 * Print the shortest retaining path between a given CCObject and a CCObject root.
 *
 * @param {CCObject} object
 */
function printShortestCCPath(leak) {
  const path = shortestCCPathToRoot(leak);
  let indent = 0;
  // Reverse the path to print from the root down to the leaked object
  for (const edge of path.reverse()) {
    logTracker(
      "  ".repeat(indent) + edge.from.name + " :: " + edge.name + " -> \n"
    );
    indent++;
  }
}

/**
 * Return a meaningful description for a given ubi::Node.
 *
 * @param {object} snapshot
 *        Memory API snapshot object.
 * @param {string} id
 *        Memory API ubi::Node's id
 * @param {number} prefix
 *        Current indentation in the description, if called recursively.
 * @returns {string}
 */
function getNodeObjectDescription(snapshot, id, prefix = 0) {
  prefix = "  ".repeat(prefix);
  if (!id) {
    return prefix + "<null>";
  }
  try {
    let stack = [...snapshot.describeNode({ by: "allocationStack" }, id)];
    if (stack) {
      stack = stack.find(([src]) => src != "noStack");
      if (stack) {
        const { line, column, source } = stack[0];
        if (source) {
          const lines = getFileContent(source);
          const lineBefore = lines[line - 2];
          const lineText = lines[line - 1];
          const lineAfter = lines[line];
          const filename = source.substr(source.lastIndexOf("/") + 1);

          stack = "allocated at " + source + ":\n";
          // Print one line before and after for context
          if (lineBefore.trim().length) {
            stack += prefix + `  ${filename} @ ${line - 1}   \u007C`;
            stack += "\x1b[2m" + lineBefore + "\n";
          }
          stack += prefix + `  ${filename} @ ${line} > \u007C`;
          // Grey out the beginning of the line, before frame's column,
          // and display an arrow before displaying the rest of the line.
          stack +=
            "\x1b[2m" +
            lineText.substr(0, column - 1) +
            "\x1b[0m" +
            "\u21A6 " +
            lineText.substr(column - 1) +
            "\n";
          if (lineAfter.trim().length) {
            stack += prefix + `  ${filename} @ ${line + 1}   \u007C`;
            stack += lineAfter;
          }
        } else {
          stack = "(missing source)";
        }
      } else {
        stack = "(without allocation stack)";
      }
    } else {
      stack = "(without description)";
    }
    let objectClass = Object.entries(
      snapshot.describeNode({ by: "objectClass" }, id)
    )[0][0];
    if (objectClass == "other") {
      objectClass = Object.entries(
        snapshot.describeNode({ by: "internalType" }, id)
      )[0][0];
    }
    const arrow = prefix > 0 ? "\\--> " : "";
    return prefix + arrow + objectClass + " " + stack;
  } catch (e) {
    if (e.name == "NS_ERROR_ILLEGAL_VALUE") {
      return prefix + "<not-in-memory-snapshot:is-from-untracked-global?>";
    }
    return prefix + "<invalid:" + id + ":" + e + ">";
  }
}

/**
 * Print the shortest retaining path between two ubi::Node objects.
 *
 * @param {object} snapshot
 *        Memory API snapshot object.
 * @param {string} src
 *        Memory API ubi::Node's id
 * @param {string} dst
 *        Memory API ubi::Node's id
 */
function printShortestNodePath(snapshot, src, dst) {
  let paths;
  try {
    paths = snapshot.computeShortestPaths(src, [dst], 10);
  } catch (e) {}
  if (paths && paths.has(dst)) {
    let pathLength = Infinity;
    let n = 0;
    for (const path of paths.get(dst)) {
      n++;
      // Only print the smaller paths.
      // The longer ones will only repeat the smaller ones, with some extra edges.
      if (path.length > pathLength + 1) {
        continue;
      }
      pathLength = path.length;
      logTracker(
        `Path #${n}:\n` +
          path
            .map(({ predecessor, edge }, i) => {
              return (
                getNodeObjectDescription(snapshot, predecessor, i) +
                "\n" +
                "  ".repeat(i) +
                "Holds the following object via '" +
                edge +
                "' attribute:\n"
              );
            })
            .join("") +
          getNodeObjectDescription(snapshot, dst, path.length)
      );
    }
  } else {
    logTracker("NO-PATH");
  }
}

const fileContents = new Map();

function getFileContent(url) {
  let content = fileContents.get(url);
  if (content) {
    return content;
  }
  content = readURI(url).split("\n");
  fileContents.set(url, content);
  return content;
}

function readURI(uri) {
  const { NetUtil } = ChromeUtils.importESModule(
    "resource://gre/modules/NetUtil.sys.mjs",
    { global: "contextual" }
  );
  const stream = NetUtil.newChannel({
    uri: NetUtil.newURI(uri, "UTF-8"),
    loadUsingSystemPrincipal: true,
  }).open();
  const count = stream.available();
  const data = NetUtil.readInputStreamToString(stream, count, {
    charset: "UTF-8",
  });

  stream.close();
  return data;
}

function logTracker(message) {
  // Use special characters to grey out [TRACKER] and make allocation logs stands out.
  dump(` \x1b[2m[TRACKER]\x1b[0m ${message}\n`);
}

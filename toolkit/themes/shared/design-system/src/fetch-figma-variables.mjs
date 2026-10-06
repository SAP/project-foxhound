/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import process from "node:process";

const DEFAULT_FILE_KEY = "Co6vXnF5SiQMcJ7UoJvZX6";
const OUTPUT_FILENAME = "nova-export-clean-variables.json";
const FIGMA_API = "https://api.figma.com/v1";

function joinRelativePath(...args) {
  return join(import.meta.dirname, ...args);
}

function die(message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

const token = process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN;
if (!token) {
  die(
    "FIGMA_ACCESS_TOKEN is not set.\n" +
      "Create a Figma personal access token with the `file_variables:read` scope at\n" +
      "https://www.figma.com/developers/api#access-tokens and re-run with:\n" +
      "  FIGMA_ACCESS_TOKEN=figd_... node src/fetch-figma-variables.mjs"
  );
}

const fileKey = process.env.FIGMA_FILE_KEY || DEFAULT_FILE_KEY;
const url = `${FIGMA_API}/files/${fileKey}/variables/local`;

const response = await fetch(url, {
  headers: { "X-Figma-Token": token },
});

if (!response.ok) {
  const body = await response.text();
  die(
    `Figma API request failed (${response.status} ${response.statusText}) for ${url}\n${body}`
  );
}

const { meta } = await response.json();
const { variables, variableCollections } = meta;

function to255(c) {
  return Math.round(c * 255);
}

function toHex(n) {
  return n.toString(16).padStart(2, "0").toUpperCase();
}

function formatColor({ r, g, b, a }) {
  const R = to255(r);
  const G = to255(g);
  const B = to255(b);
  if (a === 1) {
    return `#${toHex(R)}${toHex(G)}${toHex(B)}`;
  }
  return `rgba(${R}, ${G}, ${B}, ${a})`;
}

const VariableAliasError = Symbol("VariableAliasError");

function formatValue(value) {
  if (value && typeof value === "object") {
    if (value.type === "VARIABLE_ALIAS") {
      const target = variables[value.id];
      if (!target) {
        return VariableAliasError;
      }
      return `{${target.name}}`;
    }
    if ("r" in value) {
      return formatColor(value);
    }
  }
  return value;
}

function insertAtPath(tree, pathSegments, leafKey, leafValue) {
  let cursor = tree;
  for (const seg of pathSegments) {
    if (!(seg in cursor) || typeof cursor[seg] !== "object") {
      cursor[seg] = {};
    }
    cursor = cursor[seg];
  }
  cursor[leafKey] = leafValue;
}

// Figma allows multiple collections with the same name. Merge them into a
// single top-level bucket (which is what the Clean Variables To JSON plugin
// does) so downstream code can address the collection by its display name.
const result = {};
for (const collection of Object.values(variableCollections)) {
  if (!(collection.name in result)) {
    result[collection.name] = {};
  }
  const bucket = result[collection.name];
  for (const variableId of collection.variableIds) {
    const variable = variables[variableId];
    if (!variable || variable.deletedButReferenced) {
      console.warn(
        `Deleted but referenced variable name=${variable?.name}; skipping.`
      );
      continue;
    }
    const segments = variable.name.split("/");
    for (const mode of collection.modes) {
      const raw = variable.valuesByMode[mode.modeId];
      if (raw === undefined) {
        continue;
      }
      const formatted = formatValue(raw);
      if (formatted === VariableAliasError) {
        // eslint-disable-next-line no-console
        console.warn(
          `Alias target missing for parentName=${variable.name}; aliasId=${raw.id}; skipping.`
        );
        continue;
      }
      if (formatted === undefined) {
        continue;
      }
      insertAtPath(bucket, segments, mode.name, formatted);
    }
  }
}

// The REST API's key order (both for collections and for variables inside
// each collection) differs from the Figma plugin that produced the existing
// export. Without this, a refresh produces thousands of lines of purely
// structural churn on top of any real data changes. Walk the existing file
// and reorder `result` to match, appending anything new at the end of its
// parent object.
const outputPath = joinRelativePath(OUTPUT_FILENAME);

function reorderToMatch(fresh, existing) {
  if (
    !fresh ||
    typeof fresh !== "object" ||
    !existing ||
    typeof existing !== "object" ||
    Array.isArray(fresh) ||
    Array.isArray(existing)
  ) {
    return fresh;
  }
  const reordered = {};
  for (const key of Object.keys(existing)) {
    if (key in fresh) {
      reordered[key] = reorderToMatch(fresh[key], existing[key]);
    }
  }
  for (const key of Object.keys(fresh)) {
    if (!(key in reordered)) {
      reordered[key] = fresh[key];
    }
  }
  return reordered;
}

const ordered = existsSync(outputPath)
  ? reorderToMatch(result, JSON.parse(readFileSync(outputPath, "utf8")))
  : result;

writeFileSync(outputPath, JSON.stringify(ordered, null, 2) + "\n");

// eslint-disable-next-line no-console
console.log(`Wrote ${outputPath}`);

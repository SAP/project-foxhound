/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  existsSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { basename, join } from "path";

// eslint-disable-next-line mozilla/reject-import-system-module-from-non-system
import { ObjectUtils } from "../../../../modules/ObjectUtils.sys.mjs";

function joinRelativePath(...args) {
  return join(import.meta.dirname, ...args);
}

const WIDGETS_PATH = "../../../../content/widgets".split("/");
const TOKEN_DIRS = [
  joinRelativePath("tokens", "base"),
  joinRelativePath("tokens", "components"),
  joinRelativePath(...WIDGETS_PATH),
];
const FIGMA_VALUE_MAP = {
  Light: "/light",
  Dark: "/dark",
  HCM: "/forcedColors",
  Value: "",
};
const TOKEN_VALUE_KEYS = new Set(["light", "dark", "forcedColors", "value"]);
const FIGMA_IGNORES = new Set(["focus/outline", "focus/outline/inset"]);

function transformValue(val, tokenNames, figmaName) {
  if (typeof val === "number") {
    if (figmaName.includes("opacity")) {
      // This is intended for opacity which is exported as a number between 0-100...
      // Likely we need to handle other numbers that are px, etc too
      return String(val / 100);
    }
    return val === 0 ? String(val) : `${val}px`;
  }
  if (typeof val !== "string") {
    return val;
  }
  if (/^rgba\(([^,]+, ?){3} ?0(\.0)?\)$/.test(val)) {
    return "transparent";
  }
  if (val === "semibold") {
    return 600;
  }
  if (val === "bold") {
    return 700;
  }
  let rgbaMatch = val.match(
    /^rgba\((\d?.?\d+), (\d?.?\d+), (\d?.?\d+), (\d?.?\d+)\)$/
  );
  if (rgbaMatch) {
    let [, r, g, b, a] = rgbaMatch;
    if (a !== "0" && a !== "1") {
      a = Math.round(parseFloat(a) * 100) / 100;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (val.startsWith("#")) {
    return val.toLowerCase();
  }
  let varMatch = val.match(/^\{(.+)\}$/);
  if (!varMatch) {
    return val;
  }
  let varName = varMatch[1];
  if (varName.includes("/")) {
    let tokenName = varName.replaceAll("/", ".");
    if (!tokenNames.has(tokenName) && tokenNames.has(tokenName + ".@base")) {
      tokenName += ".@base";
    }

    return `{${tokenName}}`;
  }
  // HCM system color keyword like {CanvasText} -> strip braces
  if (varName === "Highlight") {
    return "AccentColor";
  }
  return varName;
}

function getTokenFiles(globalDirs) {
  let files = {};
  for (const group of globalDirs) {
    const tokenFiles = readdirSync(group, { recursive: true }).filter(path =>
      path.endsWith(".tokens.json")
    );
    for (const file of tokenFiles) {
      const path = join(group, file);
      let [prop, remainder] = basename(file).split(".", 2);
      if (prop.startsWith("moz-")) {
        prop = prop.substring(4);
      }
      if (remainder.startsWith("nova")) {
        unlinkSync(path);
        continue;
      }
      files[prop] = path;
    }
  }
  return files;
}

function normalizeFigma(figma, path) {
  if (!figma) {
    return {};
  }
  let vars = {};
  for (const node in figma) {
    if (node in FIGMA_VALUE_MAP) {
      let figmaVar = `${path}${FIGMA_VALUE_MAP[node]}`;
      if (!FIGMA_IGNORES.has(path)) {
        vars[figmaVar] = figma[node];
      }
    }
    let value = figma[node];
    if (!value || typeof value === "string" || typeof value === "number") {
      continue;
    }
    vars = {
      ...vars,
      ...normalizeFigma(figma[node], `${path}/${node}`),
    };
  }
  return vars;
}

function normalizeTokens(tokens, path) {
  let tokenNames = new Set();
  if (!tokens) {
    return tokenNames;
  }
  for (const node in tokens) {
    if (node === "value") {
      tokenNames.add(path);
    }
    let value = tokens[node];
    if (!value || typeof value === "string" || typeof value === "number") {
      continue;
    }
    tokenNames = new Set([
      ...tokenNames,
      ...normalizeTokens(tokens[node], `${path}.${node}`),
    ]);
  }
  return tokenNames;
}

// Main
const FIGMA_GROUPS = ["Surface", "Primitives", "Colors", "Theme", "Components"];
const tokenFiles = getTokenFiles(TOKEN_DIRS);
const exportData = JSON.parse(
  readFileSync(joinRelativePath("nova-export-clean-variables.json"), "utf8")
);
let figmaVars = {};
let localTokenNames = new Set();

for (const group of FIGMA_GROUPS) {
  for (const prop in exportData[group]) {
    figmaVars = {
      ...figmaVars,
      ...normalizeFigma(exportData[group][prop], prop),
    };
  }
}
for (const prop in tokenFiles) {
  localTokenNames = new Set([
    ...localTokenNames,
    ...normalizeTokens(JSON.parse(readFileSync(tokenFiles[prop])), prop),
  ]);
}

function matchesFigmaVar(resolvedPath, figmaVar) {
  return (
    // It must start with the same prefix
    figmaVar.startsWith(resolvedPath) &&
    // And match in length
    (resolvedPath.length === figmaVar.length ||
      // Or the next part of the name is another variant
      // i.e. button/color matches button/color/hover
      // i.e. color/neutral/10 does not match color/neutral/100
      figmaVar[resolvedPath.length] === "/")
  );
}

function walkUpdateNovaTokens(tokens, vars, tokenNames, path = []) {
  for (const tokenProp in tokens) {
    if (tokenProp === "comment") {
      continue;
    }
    if (tokenProp === "value") {
      let resolvedPath = path.filter(p => p !== "@base").join("/");
      let newValue = {};
      let { nativeTheme } = tokens.value;
      for (const figmaVar in vars) {
        if (matchesFigmaVar(resolvedPath, figmaVar)) {
          const figmaName = figmaVar.slice(resolvedPath.length + 1);
          const figmaValue = transformValue(
            vars[figmaVar],
            tokenNames,
            resolvedPath
          );
          if (!figmaName) {
            // Exact match, only one value.
            // We actually never hit this, values are set for each from Figma.
            newValue = figmaValue;
            delete vars[figmaVar];
          } else if (TOKEN_VALUE_KEYS.has(figmaName)) {
            // Sometimes comes after, like Light/Dark/HCM.
            newValue[figmaName] = figmaValue;
            delete vars[figmaVar];
          }
        }
      }
      if (Object.keys(newValue).length) {
        if (typeof newValue === "object") {
          let simplified = {};
          if (nativeTheme) {
            simplified.nativeTheme = nativeTheme;
          }
          if (newValue.light && newValue.light === newValue.dark) {
            simplified.default = newValue.light;
          } else {
            simplified.light = newValue.light;
            simplified.dark = newValue.dark;
          }
          if (newValue.forcedColors) {
            if (
              !simplified.default ||
              newValue.forcedColors !== simplified.default
            ) {
              simplified.forcedColors = newValue.forcedColors;
            }
          }
          if (
            simplified.default !== undefined &&
            Object.keys(simplified).length === 1
          ) {
            simplified = simplified.default;
          }
          newValue = simplified;
        }
        tokens.value = newValue;
      }
    } else {
      try {
        tokens[tokenProp] = walkUpdateNovaTokens(
          tokens[tokenProp],
          vars,
          tokenNames,
          [...path, tokenProp]
        );
      } catch (ex) {
        console.error(`Error process token: ${[...path, tokenProp].join(".")}`);
        throw ex;
      }
    }
  }
  return tokens;
}

function stripUnchangedTokens(modified, original) {
  if (!modified || typeof modified !== "object") {
    return modified;
  }
  let result = {};
  if ("comment" in original) {
    result.comment = original.comment;
  }
  for (let key of Object.keys(modified)) {
    if (key === "value") {
      if (!ObjectUtils.deepEqual(modified.value, original?.value)) {
        result.value = modified.value;
      }
    } else if (key === "comment" || key === "override") {
      continue;
    } else {
      let stripped = stripUnchangedTokens(modified[key], original?.[key]);
      if (stripped !== null) {
        result[key] = stripped;
      }
    }
  }
  let keyCount = Object.keys(result).length;
  if (keyCount === 0 || (keyCount === 1 && "comment" in result)) {
    return null;
  }
  return result;
}

const _tokensFiles = new Map();
function readTokens(filePath) {
  if (!_tokensFiles.has(filePath)) {
    _tokensFiles.set(filePath, JSON.parse(readFileSync(filePath)));
  }
  return _tokensFiles.get(filePath);
}
function updateTokens(filePath, tokens) {
  _tokensFiles.set(filePath, tokens);
}
function writeTokens() {
  for (let [filePath, tokens] of _tokensFiles.entries()) {
    let original = JSON.parse(readFileSync(filePath));
    let novaPath = filePath.replace(".tokens.", ".nova.tokens.");
    let stripped = stripUnchangedTokens(tokens, original);
    if (!stripped) {
      if (existsSync(novaPath)) {
        unlinkSync(novaPath);
      }
    } else {
      writeFileSync(novaPath, JSON.stringify(stripped, null, 2) + "\n");
    }
  }
}

function updateNovaTokens(filePath, prop, vars, tokenNames) {
  let tokens = readTokens(filePath);

  tokens = walkUpdateNovaTokens(tokens, vars, tokenNames, [prop]);
  updateTokens(filePath, tokens);
}

for (const prop in tokenFiles) {
  updateNovaTokens(tokenFiles[prop], prop, figmaVars, localTokenNames);
}
writeTokens();

// eslint-disable-next-line no-console
console.log("Remaining Figma vars:", figmaVars);

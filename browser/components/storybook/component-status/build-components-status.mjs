/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------- paths -------- */

// Root of the `component-status` directory
const STATUS_ROOT = path.resolve(__dirname, "..");
// Root of the `firefox` repository
const REPO_ROOT = path.resolve(STATUS_ROOT, "../../..");

const STORIES_DIR = path.join(REPO_ROOT, "toolkit", "content", "widgets");
const BUGS_IDS_JSON = path.join(
  STATUS_ROOT,
  "component-status",
  "data",
  "bug-ids.json"
);
const OUT_JSON = path.join(STATUS_ROOT, "component-status", "components.json");

const PROD_STORYBOOK_URL =
  globalThis?.process?.env?.PROD_STORYBOOK_URL ||
  "https://firefoxux.github.io/firefox-desktop-components/";

/* -------- data bug-ids -------- */

function readJsonIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const txt = fs.readFileSync(filePath, "utf8");
      return JSON.parse(txt);
    }
  } catch (e) {
    console.error(`Error reading or parsing ${filePath}:`, e);
  }
  return {};
}

const BUG_IDS = readJsonIfExists(BUGS_IDS_JSON);

/* -------- helpers -------- */

function slugify(str) {
  if (!str) {
    return "";
  }
  let s = String(str).trim().toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  s = s.replace(/--+/g, "-");
  return s;
}

function getBugzillaUrl(bugId) {
  return bugId && bugId > 0
    ? `https://bugzilla.mozilla.org/show_bug.cgi?id=${bugId}`
    : "";
}

function readFileSafe(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (_e) {
    return "";
  }
}

function findStoriesFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        return findStoriesFiles(p);
      }
      return ent.isFile() && /\.stories\.mjs$/i.test(ent.name) ? [p] : [];
    });
  } catch (e) {
    console.error(`Error finding files in ${dir}:`, e);
    return [];
  }
}

// Parses `export default { title: "...", parameters: { status: "..." } }` from the file content
// Parses `export default { title: "...", parameters: { status: "..." } }`
function parseMeta(src) {
  const meta = { title: "", status: "unknown" };

  // First, find and capture the story's title
  const titleMatch = src.match(
    /export\s+default\s*\{\s*[\s\S]*?title\s*:\s*(['"`])([\s\S]*?)\1/
  );
  if (titleMatch && titleMatch[2]) {
    meta.title = titleMatch[2].trim();
  }

  // Use the final "};" of the export as a definitive anchor to find the correct closing brace.
  const paramsBlockMatch = src.match(
    /parameters\s*:\s*(\{[\s\S]*?\})\s*,\s*};/
  );

  if (!paramsBlockMatch) {
    return meta;
  }
  const paramsContent = paramsBlockMatch[1];

  // Look for `status: "some-string"`
  const stringStatusMatch = paramsContent.match(
    /status\s*:\s*(['"`])([\s\S]*?)\1/
  );
  if (stringStatusMatch && stringStatusMatch[2]) {
    meta.status = stringStatusMatch[2].trim().toLowerCase();
    return meta;
  }

  // If a simple string wasn't found, look for `status: { type: "some-string" }`
  const objectStatusMatch = paramsContent.match(
    /status\s*:\s*\{\s*type\s*:\s*(['"`])([\s\S]*?)\1/
  );
  if (objectStatusMatch && objectStatusMatch[2]) {
    meta.status = objectStatusMatch[2].trim().toLowerCase();
    return meta;
  }

  return meta;
}

// Finds the main story export name (e.g., "Default" or the first export const)
function pickExportName(src) {
  const names = [];
  const re = /export\s+const\s+([A-Za-z0-9_]+)\s*=/g;
  let m;
  while ((m = re.exec(src))) {
    names.push(m[1]);
  }
  if (names.length === 0) {
    return "default";
  }
  for (const n of names) {
    if (n.toLowerCase() === "default") {
      return "default";
    }
  }
  return names[0].toLowerCase();
}

function componentSlug(filePath, title) {
  const rel = path.relative(STORIES_DIR, filePath);
  const root = rel.split(path.sep)[0] || "";
  if (root) {
    return root;
  }
  const parts = title.split("/");
  const last = parts[parts.length - 1].trim();
  return slugify(last || "unknown");
}

/* -------- build items -------- */
function buildItems() {
  const files = findStoriesFiles(STORIES_DIR);
  const items = [];

  for (const file of files) {
    const src = readFileSafe(file);
    if (!src) {
      continue;
    }

    const meta = parseMeta(src);
    if (!meta.title) {
      continue;
    }

    const exportKey = pickExportName(src);
    const titleSlug = slugify(meta.title);
    const exportSlug = slugify(exportKey || "default");
    if (!titleSlug || !exportSlug) {
      continue;
    }

    const storyId = `${titleSlug}--${exportSlug}`;
    const componentName = componentSlug(file, meta.title);

    const storyUrl = `${PROD_STORYBOOK_URL}?path=/story/${storyId}`;
    const sourceUrl = `https://searchfox.org/firefox-main/source/toolkit/content/widgets/${encodeURIComponent(componentName)}`;

    const bugId = BUG_IDS[componentName] || 0;
    const bugUrl = getBugzillaUrl(bugId);

    items.push({
      component: componentName,
      title: meta.title,
      status: meta.status,
      storyId,
      storyUrl,
      sourceUrl,
      bugUrl,
    });
  }

  items.sort((a, b) => a.component.localeCompare(b.component));
  return items;
}

/* -------- write JSON -------- */

const items = buildItems();
const data = {
  generatedAt: new Date().toISOString(),
  count: items.length,
  items,
};

fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2) + "\n");
console.warn(`wrote ${OUT_JSON} (${items.length} components)`);

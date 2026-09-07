/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const selection = $("#selection")[0];
const selectedTasksInput = $("#selected-tasks")[0];
const count = $("#selection-count")[0];
const excludeFilter = $("#exclude-filter")[0];
const largePushWarning = $("#large-push-warning")[0];
const largePushCount = $("#large-push-count")[0];
const pluralize = (count, noun, suffix = "s") =>
  `${count} ${noun}${count !== 1 ? suffix : ""}`;

var selected = [];
// Labels dismissed via the per-row × button. Cleared whenever apply() runs,
// so toggling any checkbox resets the dismissals.
var manualExcluded = new Set();

// For each filter attribute, the set of all values any section offers as a
// checkbox option. Computed once from the rendered DOM and used by apply()
// to scope cross-section constraints: a task is only subject to another
// section's attribute filter when its attribute value falls inside that
// attribute's namespace. E.g. Platform's build_platform namespace covers
// desktop platforms, so it narrows test tasks (build_platform="linux")
// but skips Android builds (build_platform="android-arm64-opt").
const attrNamespace = {};
$(".filter[type='checkbox']").each(function () {
  let attrs = JSON.parse(this.value);
  for (let attr in attrs) {
    if (!(attr in attrNamespace)) {
      attrNamespace[attr] = new Set();
    }
    for (let v of attrs[attr]) {
      attrNamespace[attr].add(v);
    }
  }
});
// Fail loudly if the namespace ends up empty but there are tasks to
// filter — an empty namespace means every cross-section constraint
// silently skips, so selecting a Platform row would stop narrowing Test
// rows. That exact failure mode is invisible from the UI.
if (!Object.keys(attrNamespace).length && Object.keys(tasks).length) {
  throw new Error(
    `try chooser: no checkbox filter attributes discovered at load; ` +
      `cross-section narrowing would silently no-op`
  );
}

var getExcludeTerms = () =>
  excludeFilter.value
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t);

let applyFiltersDebounce;
var scheduleApplyFilters = () => {
  clearTimeout(applyFiltersDebounce);
  applyFiltersDebounce = setTimeout(applyFilters, 150);
};

// Flush any pending debounced keystroke synchronously before Push serializes
// the form, so the submitted value reflects the latest set.
$("#push")[0].addEventListener("click", () => {
  clearTimeout(applyFiltersDebounce);
  applyFilters();
});

var renderSelection = labels => {
  let frag = document.createDocumentFragment();
  for (let label of labels) {
    let li = document.createElement("li");
    li.className = "selection-item";
    let name = document.createElement("span");
    name.className = "selection-label";
    name.textContent = label;
    let remove = document.createElement("button");
    remove.type = "button";
    remove.className = "selection-remove";
    remove.setAttribute("aria-label", "Remove " + label);
    remove.textContent = "\u00d7";
    remove.addEventListener("click", () => {
      let idx = Array.from(selection.children).indexOf(li);
      manualExcluded.add(label);
      clearTimeout(applyFiltersDebounce);
      applyFilters();
      let items = selection.querySelectorAll(".selection-remove");
      items[Math.min(idx, items.length - 1)]?.focus();
    });
    li.appendChild(name);
    li.appendChild(remove);
    frag.appendChild(li);
  }
  selection.textContent = "";
  selection.appendChild(frag);
  selectedTasksInput.value = labels.join("\n");
};

var updateLabels = () => {
  $(".tab-pane.active > .filter-label").each(function () {
    let box = $("#" + this.htmlFor)[0];
    let method = box.checked ? "add" : "remove";
    $(this)[method + "Class"]("is-checked");
  });
};

var apply = () => {
  manualExcluded.clear();

  // Each checked section box contributes a per-checkbox filter set scoped
  // to that section's task kinds. Sets are OR'd across checkboxes so that
  // e.g. checking two Android rows matches only tasks that fit either row
  // exactly (no combinatorial expansion across rows within a section).
  //
  // Attribute values are also pooled across checked boxes so that selecting
  // a platform narrows other sections that share the attribute (e.g.
  // Platform "windows" constrains Test rows to windows tasks). The pooled
  // filter only applies when the task's attribute value is inside the
  // attribute's namespace (see attrNamespace above), which lets Platform's
  // build_platform=[windows] narrow tests without rejecting Android builds
  // whose build_platform is in a different namespace entirely. The same
  // rule also handles the "kind" collision: Android's "kind" values
  // (build-apk, etc.) don't include "build", so a Platform build task
  // whose attributes.kind is "build" is not in the kind namespace and the
  // pooled filter skips it.
  let filterSets = [];
  let crossSection = {};
  let buildTypeFilter = null;

  $(".filter:checked").each(function () {
    // Checkbox element values are generated by Section.get_context() in app.py
    let attrs = JSON.parse(this.value);
    // The buildtype radios are the only radio inputs in the filter set;
    // every section filter is a checkbox.
    if (this.type === "radio") {
      buildTypeFilter = attrs.build_type ?? null;
      return;
    }
    filterSets.push({
      kinds: new Set(this.name.split(",")),
      filters: attrs,
    });
    for (let attr in attrs) {
      if (!(attr in crossSection)) {
        crossSection[attr] = new Set();
      }
      for (let v of attrs[attr]) {
        crossSection[attr].add(v);
      }
    }
  });
  updateLabels();

  var taskMatches = label => {
    let task = tasks[label];

    if (
      buildTypeFilter !== null &&
      "build_type" in task &&
      task.build_type !== buildTypeFilter
    ) {
      return false;
    }

    let matchedSection = false;
    for (let { kinds, filters } of filterSets) {
      if (!kinds.has(task.kind)) {
        continue;
      }
      let ok = true;
      for (let attr in filters) {
        if (attr in task && !filters[attr].includes(task[attr])) {
          ok = false;
          break;
        }
      }
      if (ok) {
        matchedSection = true;
        break;
      }
    }
    if (!matchedSection) {
      return false;
    }

    for (let attr in crossSection) {
      if (!(attr in task)) {
        continue;
      }
      // Pooled value must be in the attribute's namespace (values any
      // section renders for this attr); otherwise skip — not our
      // dimension to narrow. A missing namespace entry means crossSection
      // picked up an attribute from a source attrNamespace didn't index
      // (which shouldn't be possible today) — throw so a future refactor
      // that breaks this invariant fails loud instead of silently letting
      // tasks through unfiltered.
      const ns = attrNamespace[attr];
      if (!ns) {
        throw new Error(
          `try chooser: attrNamespace missing entry for "${attr}"`
        );
      }
      if (!ns.has(task[attr])) {
        continue;
      }
      if (!crossSection[attr].has(task[attr])) {
        return false;
      }
    }
    return true;
  };

  selected = filterSets.length ? Object.keys(tasks).filter(taskMatches) : [];
  applyFilters();
};

var applyFilters = () => {
  let filters = {};
  // Chunk ranges are entered per-row as printer-style lists, e.g. "1,4-6,9".
  $(".filter:text").each(function () {
    let value = $(this).val();
    if (value === "") {
      return;
    }

    let attrs = JSON.parse(this.name);
    let key = `${attrs.unittest_suite}-${attrs.unittest_flavor}`;
    if (!(key in filters)) {
      filters[key] = [];
    }

    for (let item of value.split(",")) {
      if (!item.includes("-")) {
        filters[key].push(parseInt(item));
        continue;
      }

      let [start, end] = item.split("-");
      for (let i = parseInt(start); i <= parseInt(end); ++i) {
        filters[key].push(i);
      }
    }
  });

  let visible = selected.filter(function (label) {
    let task = tasks[label];
    let key = task.unittest_suite + "-" + task.unittest_flavor;
    if (key in filters && !filters[key].includes(parseInt(task.test_chunk))) {
      return false;
    }
    return true;
  });

  let excludeTerms = getExcludeTerms();
  if (excludeTerms.length) {
    visible = visible.filter(label => {
      let lower = label.toLowerCase();
      return !excludeTerms.some(term => lower.includes(term));
    });
  }

  if (manualExcluded.size) {
    visible = visible.filter(l => !manualExcluded.has(l));
  }

  renderSelection(visible);
  count.textContent = pluralize(visible.length, "task") + " selected";
  let effective = visible.length * largePushMultiplier;
  largePushCount.textContent = effective;
  largePushWarning.hidden =
    largePushSuppressed || effective <= largePushThreshold;
};

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const table = document.getElementById("table");

function setTextContent(element, content) {
  if (content.startsWith("customkeys-")) {
    element.setAttribute("data-l10n-id", content);
  } else {
    element.textContent = content;
  }
}

function notifyUpdate() {
  window.dispatchEvent(new CustomEvent("CustomKeysUpdate"));
}

async function buildTable() {
  const keys = await RPMSendQuery("CustomKeys:GetKeys");
  for (const category in keys) {
    const tbody = document.createElement("tbody");
    table.append(tbody);
    let row = document.createElement("tr");
    row.className = "category";
    tbody.append(row);
    let cell = document.createElement("td");
    row.append(cell);
    cell.setAttribute("colspan", 5);
    const heading = document.createElement("h1");
    setTextContent(heading, category);
    cell.append(heading);
    const categoryKeys = keys[category];
    for (const keyId in categoryKeys) {
      row = document.createElement("tr");
      row.className = "key";
      tbody.append(row);
      row.setAttribute("data-id", keyId);
      cell = document.createElement("th");
      const key = categoryKeys[keyId];
      setTextContent(cell, key.title);
      row.append(cell);
      cell = document.createElement("td");
      cell.textContent = key.shortcut;
      row.append(cell);
      cell = document.createElement("td");
      let button = document.createElement("button");
      button.className = "change";
      button.setAttribute("data-l10n-id", "customkeys-change");
      cell.append(button);
      let label = document.createElement("label");
      label.className = "newLabel";
      let span = document.createElement("span");
      span.setAttribute("data-l10n-id", "customkeys-new-key");
      label.append(span);
      let input = document.createElement("input");
      input.className = "new";
      label.append(input);
      cell.append(label);
      row.append(cell);
      cell = document.createElement("td");
      button = document.createElement("button");
      button.className = "clear";
      button.setAttribute("data-l10n-id", "customkeys-clear");
      cell.append(button);
      row.append(cell);
      cell = document.createElement("td");
      button = document.createElement("button");
      button.className = "reset";
      button.setAttribute("data-l10n-id", "customkeys-reset");
      cell.append(button);
      row.append(cell);
      updateKey(row, key);
    }
  }
  notifyUpdate();
}

function updateKey(row, data) {
  row.children[1].textContent = data.shortcut;
  row.classList.toggle("customized", data.isCustomized);
  row.classList.toggle("assigned", !!data.shortcut);
}

// Returns false if the assignment should be cancelled.
async function maybeHandleConflict(data) {
  for (const row of table.querySelectorAll(".key")) {
    if (data.shortcut != row.children[1].textContent) {
      continue; // Not a conflict.
    }
    const conflictId = row.dataset.id;
    if (conflictId == data.id) {
      // We're trying to assign this key to the shortcut it is already
      // assigned to. We don't need to do anything.
      return false;
    }
    const conflictDesc = row.children[0].textContent;
    if (
      window.confirm(
        await document.l10n.formatValue("customkeys-conflict-confirm", {
          conflict: conflictDesc,
        })
      )
    ) {
      // Clear the conflicting key.
      const newData = await RPMSendQuery("CustomKeys:ClearKey", conflictId);
      updateKey(row, newData);
      return true;
    }
    return false;
  }
  return true;
}

async function onAction(event) {
  const row = event.target.closest("tr");
  const keyId = row.dataset.id;
  if (event.target.className == "reset") {
    Glean.browserCustomkeys.actions.reset.add();
    const data = await RPMSendQuery("CustomKeys:GetDefaultKey", keyId);
    if (await maybeHandleConflict(data)) {
      const newData = await RPMSendQuery("CustomKeys:ResetKey", keyId);
      updateKey(row, newData);
      notifyUpdate();
    }
  } else if (event.target.className == "change") {
    Glean.browserCustomkeys.actions.change.add();
    // The "editing" class will cause the Change button to be replaced by a
    // labelled input for the new key.
    row.classList.add("editing");
    // We need to listen for keys in the parent process because we want to
    // intercept reserved keys, which we can't do in the content process.
    RPMSendAsyncMessage("CustomKeys:CaptureKey", true);
    row.querySelector(".new").focus();
  } else if (event.target.className == "clear") {
    Glean.browserCustomkeys.actions.clear.add();
    const newData = await RPMSendQuery("CustomKeys:ClearKey", keyId);
    updateKey(row, newData);
    notifyUpdate();
  }
}

async function onKey({ data }) {
  const input = document.activeElement;
  const row = input.closest("tr");
  data.id = row.dataset.id;
  if (data.isModifier) {
    // This is a modifier. Display it, but don't assign yet. We assign when the
    // main key is pressed (below).
    input.value = data.modifierString;
    // Select the input's text so screen readers will report it.
    input.select();
    return;
  }
  if (!data.isValid) {
    input.value = await document.l10n.formatValue("customkeys-key-invalid");
    input.select();
    return;
  }
  if (await maybeHandleConflict(data)) {
    const newData = await RPMSendQuery("CustomKeys:ChangeKey", data);
    updateKey(row, newData);
  }
  RPMSendAsyncMessage("CustomKeys:CaptureKey", false);
  row.classList.remove("editing");
  row.querySelector(".change").focus();
  notifyUpdate();
}

function onFocusLost(event) {
  if (event.target.className == "new") {
    // If the input loses focus, cancel editing of the key.
    RPMSendAsyncMessage("CustomKeys:CaptureKey", false);
    const row = event.target.closest("tr");
    row.classList.remove("editing");
    // Clear any modifiers that were displayed, ready for the next edit.
    event.target.value = "";
  }
}

function onSearchInput(event) {
  const query = event.target.value.toLowerCase();
  for (const row of table.querySelectorAll(".key")) {
    row.hidden =
      query && !row.children[0].textContent.toLowerCase().includes(query);
  }
  for (const tbody of table.tBodies) {
    // Show a category only if it has at least 1 shown key.
    tbody.hidden = !tbody.querySelector(".key:not([hidden])");
  }
  notifyUpdate();
}

async function onResetAll() {
  Glean.browserCustomkeys.actions.reset_all.add();
  if (
    !window.confirm(
      await document.l10n.formatValue("customkeys-reset-all-confirm")
    )
  ) {
    return;
  }
  await RPMSendQuery("CustomKeys:ResetAll");
  const keysByCat = await RPMSendQuery("CustomKeys:GetKeys");
  const keysById = {};
  for (const category in keysByCat) {
    const categoryKeys = keysByCat[category];
    for (const keyId in categoryKeys) {
      keysById[keyId] = categoryKeys[keyId];
    }
  }
  for (const row of table.querySelectorAll(".key")) {
    const data = keysById[row.dataset.id];
    if (data) {
      updateKey(row, data);
    }
  }
  notifyUpdate();
}

buildTable();
table.addEventListener("click", onAction);
RPMAddMessageListener("CustomKeys:CapturedKey", onKey);
table.addEventListener("focusout", onFocusLost);
document.getElementById("search").addEventListener("input", onSearchInput);
document.getElementById("resetAll").addEventListener("click", onResetAll);
Glean.browserCustomkeys.opened.add();

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global RPMCanSetDefaultPDFHandler, RPMGetBoolPref, RPMOpenPDFFile,
   RPMSetDefaultPDFHandler, RPMSetPref */

const PROMO_DISMISSED_PREF = "browser.aboutpdf.promo.dismissed";

const dropzone = document.getElementById("dropzone");
const dropzoneHint = document.getElementById("dropzone-hint");
const dropzoneError = document.getElementById("dropzone-error");
const fileInput = document.getElementById("file-input");
const browseFiles = document.getElementById("browse-files");
const promo = document.getElementById("promo");
const setDefault = document.getElementById("set-default");
const dismissPromo = document.getElementById("dismiss-promo");

browseFiles.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  // Reset so the same file can be re-selected after an error.
  fileInput.value = "";
  if (file) {
    handleFile(file);
  }
});

dropzone.addEventListener("dragenter", e => {
  e.preventDefault();
  dropzone.classList.add("drag-over");
});

dropzone.addEventListener("dragover", e => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "copy";
  }
});

dropzone.addEventListener("dragleave", e => {
  if (!dropzone.contains(e.relatedTarget)) {
    dropzone.classList.remove("drag-over");
  }
});

dropzone.addEventListener("drop", e => {
  e.preventDefault();
  dropzone.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file) {
    handleFile(file);
  }
});

// Mouse users can click anywhere in the dropzone; keyboard/AT users go
// through #browse-files which has the real button semantics.
dropzone.addEventListener("click", e => {
  if (!e.target.closest("#browse-files")) {
    fileInput.click();
  }
});

setDefault.addEventListener("click", async () => {
  setDefault.disabled = true;
  try {
    await RPMSetDefaultPDFHandler();
  } catch (e) {
    console.error("Failed to set Firefox as the default PDF handler", e);
  } finally {
    setDefault.disabled = false;
    updatePromoVisibility();
  }
});

dismissPromo.addEventListener("click", () => {
  promo.hidden = true;
  RPMSetPref(PROMO_DISMISSED_PREF, true).catch(e => {
    console.error("Failed to persist promo dismissal", e);
  });
});

updatePromoVisibility();

async function updatePromoVisibility() {
  try {
    if (RPMGetBoolPref(PROMO_DISMISSED_PREF, false)) {
      promo.hidden = true;
      return;
    }
    promo.hidden = !(await RPMCanSetDefaultPDFHandler());
  } catch {
    promo.hidden = true;
  }
}

let processing = false;

async function handleFile(file) {
  if (processing) {
    return;
  }
  processing = true;
  showError(null);
  try {
    if (!(await RPMOpenPDFFile(file))) {
      showError("invalid");
    }
  } catch (e) {
    console.error("Failed to open PDF file", e);
    showError("generic");
  } finally {
    processing = false;
  }
}

// errorType: null (clear), "invalid" (file type), or "generic" (other failure).
function showError(errorType) {
  if (!errorType) {
    dropzoneError.hidden = true;
    dropzoneError.removeAttribute("data-l10n-id");
    dropzoneHint.hidden = false;
    return;
  }
  dropzoneError.hidden = false;
  dropzoneError.setAttribute(
    "data-l10n-id",
    errorType === "invalid"
      ? "about-pdf-dropzone-invalid-file"
      : "about-pdf-dropzone-error-generic"
  );
  dropzoneHint.hidden = errorType === "invalid";
}

// Enter triggers the picker only when the dropzone itself is hovered and no
// inner control has focus (which would handle Enter itself).
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && dropzone.matches(":hover")) {
    const active = document.activeElement;
    if (
      !active ||
      active === document.body ||
      active === document.documentElement
    ) {
      e.preventDefault();
      fileInput.click();
    }
  }
});

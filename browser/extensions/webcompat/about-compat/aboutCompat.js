/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals browser */

let availablePatches;

const portToAddon = (function () {
  let port;

  function connect() {
    port = browser.runtime.connect({ name: "AboutCompatTab" });
    port.onMessage.addListener(onMessageFromAddon);
    port.onDisconnect.addListener(() => {
      port = undefined;
    });
  }

  connect();

  async function send(message) {
    if (port) {
      return port.postMessage(message);
    }
    return Promise.reject("background script port disconnected");
  }

  return { send };
})();

const $ = function (sel) {
  return document.querySelector(sel);
};

const DOMContentLoadedPromise = new Promise(resolve => {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      resolve();
    },
    { once: true }
  );
});

Promise.all([
  browser.runtime.sendMessage("getAllInterventions"),
  DOMContentLoadedPromise,
]).then(([info]) => {
  // alphabetize the interventions and shims
  if (info.interventions) {
    info.interventions = info.interventions.sort((a, b) =>
      a.domain.localeCompare(b.domain)
    );
  }
  if (info.shims) {
    info.shims = info.shims.sort((a, b) => a.name.localeCompare(b.name));
  }

  document.body.addEventListener("click", async evt => {
    const ele = evt.target;
    if (ele.nodeName === "BUTTON") {
      const row = ele.closest("[data-id]");
      if (row) {
        evt.preventDefault();
        ele.disabled = true;
        const id = row.getAttribute("data-id");
        try {
          await browser.runtime.sendMessage({ command: "toggle", id });
        } catch (_) {
          ele.disabled = false;
        }
      }
    } else if (ele.classList.contains("tab")) {
      document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.remove("active");
      });
      ele.classList.add("active");
    }
  });

  availablePatches = info;
  redraw();
});

async function onMessageFromAddon(msg) {
  const alsoShowHidden = location.hash === "#all";

  await DOMContentLoadedPromise;

  if ("interventionsChanged" in msg) {
    const section = document.querySelector("#interventions");

    // if we toggled the global pref, we need to redraw the whole section.
    if (
      msg.interventionsChanged === false ||
      section.querySelector("[data-l10n-id=text-disabled-in-about-config]")
    ) {
      redrawSection(
        $("#interventions"),
        msg.interventionsChanged,
        alsoShowHidden
      );
    } else {
      // redraw just the interventions which changed.
      for (const config of msg.interventionsChanged) {
        if (config.hidden && !alsoShowHidden) {
          continue;
        }

        const { domain } = config;
        const newArticle = createArticle(config);

        const oldArticle = document.querySelector(`[data-id="${config.id}"]`);
        const oldDomain = oldArticle?.querySelector("span").innerText;
        if (domain == oldDomain) {
          oldArticle.parentNode.replaceChild(newArticle, oldArticle);
          continue;
        }

        oldArticle?.remove();
        let whereToInsert = section.firstElementChild;
        while (
          whereToInsert &&
          (whereToInsert.nodeName != "ARTICLE" ||
            whereToInsert.querySelector("span").innerText < domain)
        ) {
          whereToInsert = whereToInsert.nextElementSibling;
        }
        section.insertBefore(newArticle, whereToInsert);
      }
    }
  }

  if ("shimsChanged" in msg) {
    updateShimSections(msg.shimsChanged, alsoShowHidden);
  }

  if ("toggling" in msg) {
    // Disable the button while an intervention is being enabled/disabled.
    // The markup of the section-row will be updated appropriately when a
    // subsequent interventionsChanged message arrives.
    const id = msg.toggling;
    const button = $(`[data-id="${id}"] button`);
    if (!button) {
      return;
    }
    button.disabled = true;
  }
}

function redraw() {
  if (!availablePatches) {
    return;
  }
  const { interventions, shims } = availablePatches;
  const alsoShowHidden = location.hash === "#all";
  redrawSection($("#interventions"), interventions, alsoShowHidden);
  updateShimSections(shims, alsoShowHidden);
}

function clearSectionAndAddMessage(section, msgId) {
  section.querySelectorAll("article").forEach(article => {
    article.remove();
  });

  const article = document.createElement("article");
  article.className = "message";
  article.id = msgId;

  const span = document.createElement("span");
  document.l10n.setAttributes(span, msgId);
  article.appendChild(span);

  section.appendChild(article);
}

function hideMessagesOnSection(section) {
  section.querySelectorAll("article.message").forEach(article => {
    article.remove();
  });
}

function updateShimSections(shimsChanged, alsoShowHidden) {
  const sections = document.querySelectorAll("section.shims");
  if (!sections.length) {
    return;
  }

  for (const { bug, disabledReason, hidden, id, name, type } of shimsChanged) {
    // if any shim is disabled by global pref, all of them are. just show the
    // "disabled in about:config" message on each shim section in that case.
    if (disabledReason === "globalPref") {
      for (const section of sections) {
        clearSectionAndAddMessage(section, "text-disabled-in-about-config");
      }
      return;
    }

    // otherwise, find which section the shim belongs in. if there is none,
    // ignore the shim (we're not showing it on the UI for whatever reason).
    const section = document.querySelector(`section.shims#${type}`);
    if (!section) {
      continue;
    }

    // similarly, skip shims hidden from the UI (only for testing, etc).
    if (!alsoShowHidden && hidden) {
      continue;
    }

    // also, hide the shim if it is disabled because it is not meant for this
    // platform, release (etc) rather than being disabled by pref/about:compat
    const notApplicable =
      disabledReason &&
      disabledReason !== "pref" &&
      disabledReason !== "session";
    if (!alsoShowHidden && notApplicable) {
      continue;
    }

    // create an updated section-row for the shim
    const article = document.createElement("article");
    article.setAttribute("data-id", id);

    let span = document.createElement("span");
    span.innerText = name;
    article.appendChild(span);

    span = document.createElement("span");
    const a = document.createElement("a");
    a.href = `https://bugzilla.mozilla.org/show_bug.cgi?id=${bug}`;
    document.l10n.setAttributes(a, "label-more-information", { bug });
    a.target = "_blank";
    span.appendChild(a);
    article.appendChild(span);

    span = document.createElement("span");
    article.appendChild(span);
    const button = document.createElement("button");
    document.l10n.setAttributes(
      button,
      disabledReason ? "label-enable" : "label-disable"
    );
    span.appendChild(button);

    // is it already in the section?
    const row = section.querySelector(`article[data-id="${id}"]`);
    if (row) {
      row.replaceWith(article);
    } else {
      section.appendChild(article);
    }
  }

  for (const section of sections) {
    if (!section.querySelector("article:not(.message)")) {
      // no shims? then add a message that none are available for this platform/config
      clearSectionAndAddMessage(section, `text-no-${section.id}`);
    } else {
      // otherwise hide any such message, since we have shims on the list
      hideMessagesOnSection(section);
    }
  }
}

function redrawSection(section, data, alsoShowHidden) {
  const df = document.createDocumentFragment();
  section.querySelectorAll("article").forEach(article => {
    article.remove();
  });

  let noEntriesMessage;
  if (data === false) {
    noEntriesMessage = "text-disabled-in-about-config";
  } else if (data.length === 0) {
    noEntriesMessage = `text-no-${section.id}`;
  }

  if (noEntriesMessage) {
    const article = document.createElement("article");
    df.appendChild(article);

    const span = document.createElement("span");
    document.l10n.setAttributes(span, noEntriesMessage);
    article.appendChild(span);

    section.appendChild(df);
    return;
  }

  for (const row of data) {
    if (row.hidden && !alsoShowHidden) {
      continue;
    }
    df.appendChild(createArticle(row));
  }
  section.appendChild(df);
}

function createArticle(row) {
  const article = document.createElement("article");
  article.setAttribute("data-id", row.id);

  let span = document.createElement("span");
  span.innerText = row.domain;
  article.appendChild(span);

  span = document.createElement("span");
  const a = document.createElement("a");
  const bug = row.bug;
  a.href = `https://bugzilla.mozilla.org/show_bug.cgi?id=${bug}`;
  document.l10n.setAttributes(a, "label-more-information", { bug });
  a.target = "_blank";
  span.appendChild(a);
  article.appendChild(span);

  span = document.createElement("span");
  article.appendChild(span);
  const button = document.createElement("button");
  document.l10n.setAttributes(
    button,
    row.active ? "label-disable" : "label-enable"
  );
  span.appendChild(button);

  return article;
}

window.onhashchange = redraw;

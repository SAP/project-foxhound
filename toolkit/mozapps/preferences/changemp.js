/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function init() {
  process();
  document.addEventListener("dialogaccept", setPassword);
  document.getElementById("pw1").addEventListener("input", () => {
    setPasswordStrength();
    checkPasswords();
  });
  document.getElementById("pw2").addEventListener("input", checkPasswords);
}

function process() {
  // If the token doesn't have a password, don't use the old password box.
  // Otherwise, do.
  let token = Cc["@mozilla.org/security/internalkeytoken;1"].createInstance(
    Ci.nsIPKCS11Token
  );
  let oldpwbox = document.getElementById("oldpw");
  let msgBox = document.getElementById("message");
  if (!token.hasPassword) {
    oldpwbox.hidden = true;
    msgBox.hidden = false;
    // Select first password field
    document.getElementById("pw1").focus();
  } else {
    // Select old password field
    oldpwbox.hidden = false;
    msgBox.hidden = true;
    oldpwbox.focus();
  }

  if (
    !token.hasPassword &&
    !Services.policies.isAllowed("removeMasterPassword")
  ) {
    document.getElementById("admin").hidden = false;
  }

  checkPasswords();
}

async function createAlert(titleL10nId, messageL10nId) {
  const [title, message] = await document.l10n.formatValues([
    { id: titleL10nId },
    { id: messageL10nId },
  ]);
  Services.prompt.alert(window, title, message);
}

function setPassword(event) {
  let token = Cc["@mozilla.org/security/internalkeytoken;1"].createInstance(
    Ci.nsIPKCS11Token
  );

  let oldpwbox = document.getElementById("oldpw");
  let pw1 = document.getElementById("pw1");
  if (pw1.value == "") {
    const fipsUtils = Cc["@mozilla.org/security/fipsutils;1"].getService(
      Ci.nsIFIPSUtils
    );
    if (fipsUtils.isFIPSEnabled) {
      // empty passwords are not allowed in FIPS mode
      createAlert("pw-change-failed-title", "pp-change2empty-in-fips-mode");
      event.preventDefault();
      return;
    }
  }

  try {
    token.changePassword(oldpwbox.value, pw1.value);
    if (pw1.value == "") {
      createAlert("pw-change-success-title", "settings-pp-erased-ok");
    } else {
      createAlert("pw-change-success-title", "pp-change-ok");
    }
  } catch (e) {
    let nssErrorsService = Cc["@mozilla.org/nss_errors_service;1"].getService(
      Ci.nsINSSErrorsService
    );
    // SEC_ERROR_BASE + 15 = SEC_ERROR_BAD_PASSWORD
    let badPasswordResult = nssErrorsService.getXPCOMFromNSSError(
      Ci.nsINSSErrorsService.NSS_SEC_ERROR_BASE + 15
    );
    if (e.result == badPasswordResult) {
      oldpwbox.focus();
      oldpwbox.setAttribute("value", "");
      createAlert("pw-change-failed-title", "incorrect-pp");
    } else {
      createAlert("pw-change-failed-title", "failed-pp-change");
    }
    event.preventDefault();
  }
}

function setPasswordStrength() {
  // Here is how we weigh the quality of the password
  // number of characters
  // numbers
  // non-alpha-numeric chars
  // upper and lower case characters

  var pw = document.getElementById("pw1").value;

  // length of the password
  var pwlength = pw.length;
  if (pwlength > 5) {
    pwlength = 5;
  }

  // use of numbers in the password
  var numnumeric = pw.replace(/[0-9]/g, "");
  var numeric = pw.length - numnumeric.length;
  if (numeric > 3) {
    numeric = 3;
  }

  // use of symbols in the password
  var symbols = pw.replace(/\W/g, "");
  var numsymbols = pw.length - symbols.length;
  if (numsymbols > 3) {
    numsymbols = 3;
  }

  // use of uppercase in the password
  var numupper = pw.replace(/[A-Z]/g, "");
  var upper = pw.length - numupper.length;
  if (upper > 3) {
    upper = 3;
  }

  var pwstrength =
    pwlength * 10 - 20 + numeric * 10 + numsymbols * 15 + upper * 10;

  // make sure we're give a value between 0 and 100
  if (pwstrength < 0) {
    pwstrength = 0;
  }

  if (pwstrength > 100) {
    pwstrength = 100;
  }

  var mymeter = document.getElementById("pwmeter");
  mymeter.value = pwstrength;
}

function checkPasswords() {
  var pw1 = document.getElementById("pw1").value;
  var pw2 = document.getElementById("pw2").value;
  var ok = document.getElementById("changemp").getButton("accept");

  let token = Cc["@mozilla.org/security/internalkeytoken;1"].createInstance(
    Ci.nsIPKCS11Token
  );
  if (!token.hasPassword && pw1 == "") {
    // The default password for the internal key token is the empty string. It
    // makes no sense to change the password from the empty string to the empty
    // string.
    ok.toggleAttribute("disabled", true);
    return;
  }

  let enabled =
    pw1 == pw2 &&
    (pw1 != "" || Services.policies.isAllowed("removeMasterPassword"));
  ok.toggleAttribute("disabled", !enabled);
}

window.addEventListener("load", init);

import React from "react";
import { mount } from "enzyme";
import { EmbeddedFxBackupOptIn } from "content-src/components/EmbeddedFxBackupOptIn.jsx";

function getFxBackupComponent(wrapper) {
  return wrapper.find("turn-on-scheduled-backups").getDOMNode();
}

describe("EmbeddedFxBackupOptIn", () => {
  it("does not crash if ref is null", () => {
    const wrapper = mount(<EmbeddedFxBackupOptIn isEncryptedBackup={false} />);
    wrapper.unmount();
  });

  it("unencrypted backups always show file chooser screen", () => {
    const wrapper = mount(
      <EmbeddedFxBackupOptIn
        isEncryptedBackup={false}
        options={{ hide_password_input: false }}
      />
    );
    const el = getFxBackupComponent(wrapper);

    assert.strictEqual(el.hasAttribute("hide-password-input"), true);
    assert.strictEqual(el.hasAttribute("hide-file-path-chooser"), false);

    wrapper.unmount();
  });

  it("encrypted backups show file chooser first if hide_password_input=true", () => {
    const wrapper = mount(
      <EmbeddedFxBackupOptIn
        isEncryptedBackup={true}
        options={{ hide_password_input: true }}
      />
    );
    const el = getFxBackupComponent(wrapper);

    assert.strictEqual(el.hasAttribute("hide-password-input"), true);
    assert.strictEqual(el.hasAttribute("hide-file-path-chooser"), false);

    wrapper.unmount();
  });

  it("encrypted backups show password input screen if hide_password_input=false", () => {
    const wrapper = mount(
      <EmbeddedFxBackupOptIn
        isEncryptedBackup={true}
        options={{ hide_password_input: false }}
      />
    );
    const el = getFxBackupComponent(wrapper);

    assert.strictEqual(el.hasAttribute("hide-password-input"), false);
    assert.strictEqual(el.hasAttribute("hide-file-path-chooser"), true);

    wrapper.unmount();
  });

  it("updates screen when hide_password_input changes for encrypted backups", () => {
    const wrapper = mount(
      <EmbeddedFxBackupOptIn
        isEncryptedBackup={true}
        options={{ hide_password_input: true }}
      />
    );
    let el = getFxBackupComponent(wrapper);

    // Show file chooser screen first
    assert.strictEqual(el.hasAttribute("hide-password-input"), true);
    assert.strictEqual(el.hasAttribute("hide-file-path-chooser"), false);

    // Switch to password input screen
    wrapper.setProps({ options: { hide_password_input: false } });
    wrapper.update();
    el = getFxBackupComponent(wrapper);

    assert.strictEqual(el.hasAttribute("hide-password-input"), false);
    assert.strictEqual(el.hasAttribute("hide-file-path-chooser"), true);

    wrapper.unmount();
  });

  it("forwards messageId to the source attribute on the embedded widget", () => {
    const wrapper = mount(
      <EmbeddedFxBackupOptIn
        isEncryptedBackup={false}
        options={{ hide_password_input: false }}
        messageId="BROWSER_BACKUP_OPTIN_SPOTLIGHT"
      />
    );
    const el = getFxBackupComponent(wrapper);

    assert.strictEqual(
      el.getAttribute("source"),
      "BROWSER_BACKUP_OPTIN_SPOTLIGHT"
    );

    wrapper.unmount();
  });
});

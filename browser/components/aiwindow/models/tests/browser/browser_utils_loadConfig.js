/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { openAIEngine, MODEL_FEATURES } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
);

const { RemoteSettings } = ChromeUtils.importESModule(
  "resource://services-settings/remote-settings.sys.mjs"
);

async function loadRemoteSettingsSnapshot() {
  const chromeUrl = getRootDirectory(gTestPath);
  const snapshotUrl = `${chromeUrl}ai-window-prompts-remote-settings-snapshot.json`;

  const response = await fetch(snapshotUrl);
  if (!response.ok) {
    throw new Error(`Failed to load snapshot: ${response.statusText}`);
  }
  return response.json();
}

add_setup(async function () {
  const snapshotData = await loadRemoteSettingsSnapshot();

  // Populate Remote Settings with snapshot data
  const client = RemoteSettings("ai-window-prompts");
  await client.db.clear();

  for (const record of snapshotData) {
    await client.db.create({
      id: `${record.feature}-${record.model || "default"}-${record.version}`,
      ...record,
    });
  }

  await client.db.importChanges({}, Date.now());

  registerCleanupFunction(async () => {
    await client.db.clear();
  });
});

add_task(async function test_loadConfig_chat_feature() {
  const engine = new openAIEngine();
  await engine.loadConfig(MODEL_FEATURES.CHAT);
  const config = engine.getConfig(engine.feature);

  info("Loaded config for 'chat' feature:");
  info(`  Model: ${engine.model}`);
  info(`  Feature: ${engine.feature}`);
  if (config) {
    info(`  Config version: ${config.version}`);
    info(`  Config model: ${config.model}`);
    info(`  Has prompts: ${!!config.prompts}`);
    info(`  Prompts: ${config.prompts}`);
  }

  Assert.equal(engine.feature, "chat", "Feature should be set to 'chat'");
  Assert.equal(
    engine.model,
    "qwen3-235b-a22b-instruct-2507-maas",
    "Model should be loaded from remote settings"
  );
  Assert.ok(config, "Config should not be null or undefined");
  Assert.notEqual(
    JSON.stringify(config),
    "{}",
    "Config should not be an empty object"
  );
  Assert.ok(config.version, "Version should be present");
  Assert.equal(
    config.prompts,
    "You are a helpful browser assistant.",
    "Prompts should be loaded from remote settings"
  );
  Assert.equal(
    config.parameters.temperature,
    1.0,
    "Temperature parameter should be loaded"
  );
});

add_task(async function test_loadConfig_with_additional_components() {
  const engine = new openAIEngine();
  await engine.loadConfig(
    MODEL_FEATURES.CONVERSATION_SUGGESTIONS_SIDEBAR_STARTER
  );

  const mainConfig = engine.getConfig(
    MODEL_FEATURES.CONVERSATION_SUGGESTIONS_SIDEBAR_STARTER
  );

  info("Testing additional_components loading:");
  info(`  Main feature: ${engine.feature}`);
  info(`  Model: ${engine.model}`);
  if (mainConfig) {
    info(
      `  Additional components: ${mainConfig.additional_components.join(", ")}`
    );
  }

  Assert.ok(mainConfig, "Main config should be loaded");
  Assert.ok(
    Array.isArray(mainConfig.additional_components),
    "additional_components should be an array"
  );
  Assert.equal(
    mainConfig.additional_components.length,
    2,
    "Should have 2 additional components"
  );

  const limitationsConfig = engine.getConfig(
    "conversation-suggestions-assistant-limitations"
  );
  Assert.ok(
    limitationsConfig,
    "Assistant limitations component should be loaded"
  );
  Assert.ok(
    limitationsConfig.prompts,
    "Assistant limitations should have prompts"
  );

  const memoriesConfig = engine.getConfig("conversation-suggestions-memories");
  Assert.ok(memoriesConfig, "Memories component should be loaded");
  Assert.ok(memoriesConfig.prompts, "Memories should have prompts");
});

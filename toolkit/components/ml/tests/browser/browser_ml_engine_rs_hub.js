/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test the hub return values by default.
 */
add_task(async function test_hub_by_default() {
  const { cleanup, remoteClients } = await setup();

  info("Get the engine");
  const engineInstance = await createEngine({
    taskName: "moz-echo",
  });

  info("Run the inference");
  const inferencePromise = engineInstance.run({ data: "This gets echoed." });

  info("Wait for the pending downloads.");
  await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);

  Assert.equal(
    (await inferencePromise).output.echo,
    "This gets echoed.",
    "The text gets echoed exercising the whole flow."
  );

  Assert.equal(
    (await inferencePromise).output.modelHubUrlTemplate,
    "{model}/{revision}",
    "Default template should be model/revision"
  );

  Assert.equal(
    (await inferencePromise).output.modelRevision,
    "main",
    "modelRevision should be main"
  );

  ok(
    !EngineProcess.areAllEnginesTerminated(),
    "The engine process is still active."
  );

  await EngineProcess.destroyMLEngine();
  await cleanup();
});

/**
 * Tests that the pipeline can use a custom model hub.
 */
add_task(async function test_ml_custom_hub() {
  const { cleanup, remoteClients } = await setup();

  info("Get engineInstance");

  const options = new PipelineOptions({
    taskName: "summarization",
    modelId: "test-echo",
    modelRevision: "main",
    modelHubRootUrl: "https://example.com",
    modelHubUrlTemplate: "models/{model}/{revision}",
  });

  const engineInstance = await createEngine(options);

  info("Run the inference");
  const inferencePromise = engineInstance.run({
    args: ["This gets echoed."],
  });

  info("Wait for the pending downloads.");
  await remoteClients["ml-onnx-runtime"].resolvePendingDownloads(1);

  let res = await inferencePromise;

  Assert.equal(
    res.output,
    "This gets echoed.",
    "The text get echoed exercising the whole flow."
  );

  Assert.equal(
    res.config.modelHubRootUrl,
    "https://example.com",
    "The pipeline used the custom hub"
  );

  ok(
    !EngineProcess.areAllEnginesTerminated(),
    "The engine process is still active."
  );

  await EngineProcess.destroyMLEngine();
  await cleanup();
});

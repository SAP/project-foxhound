async function createEMEDecodingInfo({
  keySystem,
  robustness,
  videoConfig,
  resistFingerprinting,
}) {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.resistFingerprinting", resistFingerprinting]],
  });
  const result = await navigator.mediaCapabilities.decodingInfo({
    type: "media-source",
    video: videoConfig,
    keySystemConfiguration: {
      keySystem,
      video: { robustness },
    },
  });
  await SpecialPowers.popPrefEnv();
  return result;
}

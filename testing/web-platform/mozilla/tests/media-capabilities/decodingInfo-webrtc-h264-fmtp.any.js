// META: global=window,dedicatedworker

const kVideoBase = {
  width: 640,
  height: 480,
  bitrate: 500000,
  framerate: 30,
};

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: { ...kVideoBase, contentType: 'video/H264' },
  });
  assert_true(info.supported,
              'absent profile-level-id maps to CB/3.1 per libwebrtc');
}, 'decodingInfo: H.264 with no profile-level-id is supported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=42e01f',
    },
  });
  assert_true(info.supported);
}, 'decodingInfo: H.264 with valid profile-level-id 42e01f is supported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=zze01f',
    },
  });
  assert_false(info.supported);
  assert_false(info.smooth);
  assert_false(info.powerEfficient);
}, 'decodingInfo: H.264 with invalid profile-level-id is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=42e0',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 with short profile-level-id is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=42c00a',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 CB / level 1.0 at 640x480 exceeds level cap and is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;packetization-mode=1',
    },
  });
  assert_true(info.supported);
}, 'decodingInfo: H.264 packetization-mode=1 is supported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;packetization-mode=2',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 packetization-mode=2 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=42e01f;packetization-mode=2',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 valid profile-level-id with packetization-mode=2 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=42001f;packetization-mode=2',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 Baseline / level 3.1 with packetization-mode=2 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=42e028;packetization-mode=2',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 CB / level 4.0 with packetization-mode=2 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=4d001f;packetization-mode=2',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 Main / level 3.1 with packetization-mode=2 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=640034;packetization-mode=2',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 High / level 5.2 with packetization-mode=2 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=f4001f',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 High 4:4:4 Predictive / level 3.1 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=f40034',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 High 4:4:4 Predictive / level 5.2 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=6e001f',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 High 10 / level 3.1 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=7a001f',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 High 4:2:2 / level 3.1 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      contentType: 'video/H264;profile-level-id=42e03c',
    },
  });
  assert_false(info.supported);
}, 'decodingInfo: H.264 CB / level 6.0 is unsupported');

promise_test(async () => {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'webrtc',
    video: {
      ...kVideoBase,
      width: 128,
      height: 96,
      contentType: 'video/H264;profile-level-id=42c00a',
    },
  });
  assert_true(info.supported);
}, 'decodingInfo: H.264 CB / level 1.0 at 128x96 is supported');

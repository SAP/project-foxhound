// META: global=window,dedicatedworker

// Tests media.webrtc.encoder_creation_strategy set to prefer the builtin
// WebRTC encoder (the inverse of -platform-encoder).
// 0: prefer builtin WebRTC encoder (including OpenH264 via GMP)
// 1: prefer PlatformEncoderModule

const kCodecs = ['video/VP8', 'video/VP9', 'video/H264', 'video/AV1'];

// Below threshold: every codec's smallest bucket scales above 1.0 at 30fps.
for (const contentType of kCodecs) {
  promise_test(async () => {
    const info = await navigator.mediaCapabilities.encodingInfo({
      type: 'webrtc',
      video: {
        contentType,
        width: 426,
        height: 240,
        bitrate: 500000,
        framerate: 30,
      },
    });
    assert_true(info.supported);
    assert_true(info.smooth);
  }, `encodingInfo: ${contentType} 426x240 at 30fps is smooth`);
}

// Above threshold: 8K is above the largest measured bucket for every codec
// and above HW encode capability on typical CI hardware.
for (const contentType of kCodecs) {
  promise_test(async () => {
    const info = await navigator.mediaCapabilities.encodingInfo({
      type: 'webrtc',
      video: {
        contentType,
        width: 7680,
        height: 4320,
        bitrate: 50000000,
        framerate: 30,
      },
    });
    assert_true(info.supported);
    assert_false(info.smooth);
  }, `encodingInfo: ${contentType} 7680x4320 is not smooth`);
}

for (const contentType of kCodecs) {
  promise_test(async () => {
    const info = await navigator.mediaCapabilities.encodingInfo({
      type: 'webrtc',
      video: {
        contentType,
        width: 1920,
        height: 1080,
        bitrate: 5000000,
        framerate: 240,
      },
    });
    assert_true(info.supported);
    assert_false(info.smooth);
  }, `encodingInfo: ${contentType} 1920x1080 at 240fps is not smooth`);
}

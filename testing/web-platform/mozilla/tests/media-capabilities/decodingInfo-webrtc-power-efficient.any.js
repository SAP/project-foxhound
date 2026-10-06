// META: global=window,dedicatedworker

const kCodecs = ['video/VP8', 'video/VP9', 'video/H264', 'video/AV1'];
const kLowResolutions = [
  { name: '320x240', width: 320, height: 240 },
  { name: '640x480 (lowResolution boundary)', width: 640, height: 480 },
];

for (const contentType of kCodecs) {
  for (const res of kLowResolutions) {
    promise_test(async () => {
      const info = await navigator.mediaCapabilities.decodingInfo({
        type: 'webrtc',
        video: {
          contentType,
          width: res.width,
          height: res.height,
          bitrate: 500000,
          framerate: 30,
        },
      });
      assert_true(info.supported);
      assert_true(info.powerEfficient);
      assert_true(info.smooth);
    }, `decodingInfo: ${contentType} ${res.name} is powerEfficient and smooth`);
  }
}

for (const contentType of kCodecs) {
  promise_test(async () => {
    const info = await navigator.mediaCapabilities.decodingInfo({
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
    assert_true(info.smooth);
    assert_false(info.powerEfficient);
  }, `decodingInfo: ${contentType} 7680x4320 is not powerEfficient`);
}

// META: global=window,dedicatedworker

// Tests media.webrtc.encoder_creation_strategy set to prefer PEM.
// 0: prefer builtin WebRTC encoder (including OpenH264 via GMP)
// 1: prefer PlatformEncoderModule

const kCodecs = ['video/VP8', 'video/VP9', 'video/H264', 'video/AV1'];
const kResolutions = [
  { name: '1280x720', width: 1280, height: 720, bitrate: 2000000 },
  { name: '3840x2160', width: 3840, height: 2160, bitrate: 20000000 },
];

for (const contentType of kCodecs) {
  for (const res of kResolutions) {
    promise_test(async () => {
      const info = await navigator.mediaCapabilities.encodingInfo({
        type: 'webrtc',
        video: {
          contentType,
          width: res.width,
          height: res.height,
          bitrate: res.bitrate,
          framerate: 30,
        },
      });
      assert_equals(typeof info.supported, "boolean");
      assert_equals(typeof info.smooth, "boolean");
      assert_equals(typeof info.powerEfficient, "boolean");
    }, `encodingInfo: ${contentType} ${res.name} resolves under PreferPlatformEncoder`);
  }
}

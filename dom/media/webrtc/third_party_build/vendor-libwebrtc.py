# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import argparse
import datetime
import os
import shutil
import stat
import subprocess
import sys
import tarfile

import requests

THIRDPARTY_USED_IN_FIREFOX = [
    "abseil-cpp",
    "pffft",
    "rnnoise",
]

LIBWEBRTC_DIR = os.path.normpath("third_party/libwebrtc")


# Files in this list are excluded.
def get_excluded_files():
    return [
        ".clang-format",
        ".git-blame-ignore-revs",
        ".gitignore",
        ".vpython",
        "CODE_OF_CONDUCT.md",
        "ENG_REVIEW_OWNERS",
        "PRESUBMIT.py",
        "README.chromium",
        "WATCHLISTS",
        "codereview.settings",
        "license_template.txt",
        "native-api.md",
        "presubmit_test.py",
        "presubmit_test_mocks.py",
        "pylintrc",
    ]


# Directories in this list are excluded.  Directories are handled
# separately from files so that script 'filter_git_changes.py' can use
# different regex handling for directory paths.
def get_excluded_dirs():
    return [
        # Only the camera code under sdk/android/api/org/webrtc is used, so
        # we remove sdk/android and add back the specific files we want.
        "sdk/android",
    ]


# Paths in this list are included even if their parent directory is
# excluded in get_excluded_dirs()
def get_included_path_overrides():
    return [
        "sdk/android/src/java/org/webrtc/NativeLibrary.java",
        "sdk/android/src/java/org/webrtc/FramerateBitrateAdjuster.java",
        "sdk/android/src/java/org/webrtc/MediaCodecVideoDecoderFactory.java",
        "sdk/android/src/java/org/webrtc/BitrateAdjuster.java",
        "sdk/android/src/java/org/webrtc/MediaCodecWrapperFactory.java",
        "sdk/android/src/java/org/webrtc/WebRtcClassLoader.java",
        "sdk/android/src/java/org/webrtc/audio/WebRtcAudioRecord.java",
        "sdk/android/src/java/org/webrtc/audio/WebRtcAudioTrack.java",
        "sdk/android/src/java/org/webrtc/audio/WebRtcAudioManager.java",
        "sdk/android/src/java/org/webrtc/audio/LowLatencyAudioBufferManager.java",
        "sdk/android/src/java/org/webrtc/audio/WebRtcAudioUtils.java",
        "sdk/android/src/java/org/webrtc/audio/WebRtcAudioEffects.java",
        "sdk/android/src/java/org/webrtc/audio/VolumeLogger.java",
        "sdk/android/src/java/org/webrtc/NativeCapturerObserver.java",
        "sdk/android/src/java/org/webrtc/MediaCodecWrapper.java",
        "sdk/android/src/java/org/webrtc/CalledByNative.java",
        "sdk/android/src/java/org/webrtc/Histogram.java",
        "sdk/android/src/java/org/webrtc/EglBase10Impl.java",
        "sdk/android/src/java/org/webrtc/EglBase14Impl.java",
        "sdk/android/src/java/org/webrtc/MediaCodecWrapperFactoryImpl.java",
        "sdk/android/src/java/org/webrtc/AndroidVideoDecoder.java",
        "sdk/android/src/java/org/webrtc/BaseBitrateAdjuster.java",
        "sdk/android/src/java/org/webrtc/HardwareVideoEncoder.java",
        "sdk/android/src/java/org/webrtc/VideoCodecMimeType.java",
        "sdk/android/src/java/org/webrtc/NativeAndroidVideoTrackSource.java",
        "sdk/android/src/java/org/webrtc/VideoDecoderWrapper.java",
        "sdk/android/src/java/org/webrtc/JNILogging.java",
        "sdk/android/src/java/org/webrtc/CameraCapturer.java",
        "sdk/android/src/java/org/webrtc/CameraSession.java",
        "sdk/android/src/java/org/webrtc/H264Utils.java",
        "sdk/android/src/java/org/webrtc/Empty.java",
        "sdk/android/src/java/org/webrtc/DynamicBitrateAdjuster.java",
        "sdk/android/src/java/org/webrtc/Camera1Session.java",
        "sdk/android/src/java/org/webrtc/JniCommon.java",
        "sdk/android/src/java/org/webrtc/NV12Buffer.java",
        "sdk/android/src/java/org/webrtc/WrappedNativeI420Buffer.java",
        "sdk/android/src/java/org/webrtc/GlGenericDrawer.java",
        "sdk/android/src/java/org/webrtc/RefCountDelegate.java",
        "sdk/android/src/java/org/webrtc/Camera2Session.java",
        "sdk/android/src/java/org/webrtc/MediaCodecUtils.java",
        "sdk/android/src/java/org/webrtc/CalledByNativeUnchecked.java",
        "sdk/android/src/java/org/webrtc/VideoEncoderWrapper.java",
        "sdk/android/src/java/org/webrtc/NV21Buffer.java",
        "sdk/android/api/org/webrtc/RendererCommon.java",
        "sdk/android/api/org/webrtc/RenderSynchronizer.java",
        "sdk/android/api/org/webrtc/YuvHelper.java",
        "sdk/android/api/org/webrtc/LibvpxVp9Encoder.java",
        "sdk/android/api/org/webrtc/Metrics.java",
        "sdk/android/api/org/webrtc/CryptoOptions.java",
        "sdk/android/api/org/webrtc/MediaConstraints.java",
        "sdk/android/api/org/webrtc/YuvConverter.java",
        "sdk/android/api/org/webrtc/JavaI420Buffer.java",
        "sdk/android/api/org/webrtc/VideoDecoder.java",
        "sdk/android/api/org/webrtc/WrappedNativeVideoDecoder.java",
        "sdk/android/api/org/webrtc/Camera2Enumerator.java",
        "sdk/android/api/org/webrtc/SurfaceTextureHelper.java",
        "sdk/android/api/org/webrtc/EglBase10.java",
        "sdk/android/api/org/webrtc/DataChannel.java",
        "sdk/android/api/org/webrtc/audio/JavaAudioDeviceModule.java",
        "sdk/android/api/org/webrtc/audio/AudioDeviceModule.java",
        "sdk/android/api/org/webrtc/SessionDescription.java",
        "sdk/android/api/org/webrtc/GlUtil.java",
        "sdk/android/api/org/webrtc/VideoSource.java",
        "sdk/android/api/org/webrtc/AudioTrack.java",
        "sdk/android/api/org/webrtc/EglRenderer.java",
        "sdk/android/api/org/webrtc/EglThread.java",
        "sdk/android/api/org/webrtc/VideoEncoder.java",
        "sdk/android/api/org/webrtc/VideoCapturer.java",
        "sdk/android/api/org/webrtc/SoftwareVideoDecoderFactory.java",
        "sdk/android/api/org/webrtc/AudioSource.java",
        "sdk/android/api/org/webrtc/GlRectDrawer.java",
        "sdk/android/api/org/webrtc/StatsReport.java",
        "sdk/android/api/org/webrtc/CameraVideoCapturer.java",
        "sdk/android/api/org/webrtc/NetEqFactoryFactory.java",
        "sdk/android/api/org/webrtc/AudioProcessingFactory.java",
        "sdk/android/api/org/webrtc/Camera2Capturer.java",
        "sdk/android/api/org/webrtc/ScreenCapturerAndroid.java",
        "sdk/android/api/org/webrtc/RefCounted.java",
        "sdk/android/api/org/webrtc/VideoEncoderFallback.java",
        "sdk/android/api/org/webrtc/AudioEncoderFactoryFactory.java",
        "sdk/android/api/org/webrtc/EglBase14.java",
        "sdk/android/api/org/webrtc/SoftwareVideoEncoderFactory.java",
        "sdk/android/api/org/webrtc/VideoEncoderFactory.java",
        "sdk/android/api/org/webrtc/StatsObserver.java",
        "sdk/android/api/org/webrtc/PlatformSoftwareVideoDecoderFactory.java",
        "sdk/android/api/org/webrtc/Camera1Capturer.java",
        "sdk/android/api/org/webrtc/AddIceObserver.java",
        "sdk/android/api/org/webrtc/SurfaceViewRenderer.java",
        "sdk/android/api/org/webrtc/CameraEnumerator.java",
        "sdk/android/api/org/webrtc/CameraEnumerationAndroid.java",
        "sdk/android/api/org/webrtc/VideoDecoderFallback.java",
        "sdk/android/api/org/webrtc/FileVideoCapturer.java",
        "sdk/android/api/org/webrtc/NativeLibraryLoader.java",
        "sdk/android/api/org/webrtc/Camera1Enumerator.java",
        "sdk/android/api/org/webrtc/NativePeerConnectionFactory.java",
        "sdk/android/api/org/webrtc/LibaomAv1Encoder.java",
        "sdk/android/api/org/webrtc/BuiltinAudioEncoderFactoryFactory.java",
        "sdk/android/api/org/webrtc/AudioDecoderFactoryFactory.java",
        "sdk/android/api/org/webrtc/FecControllerFactoryFactoryInterface.java",
        "sdk/android/api/org/webrtc/VideoFrameBufferType.java",
        "sdk/android/api/org/webrtc/SdpObserver.java",
        "sdk/android/api/org/webrtc/Predicate.java",
        "sdk/android/api/org/webrtc/VideoFileRenderer.java",
        "sdk/android/api/org/webrtc/WrappedNativeVideoEncoder.java",
        "sdk/android/api/org/webrtc/LibvpxVp8Encoder.java",
        "sdk/android/api/org/webrtc/DtmfSender.java",
        "sdk/android/api/org/webrtc/VideoTrack.java",
        "sdk/android/api/org/webrtc/LibvpxVp8Decoder.java",
        "sdk/android/api/org/webrtc/GlShader.java",
        "sdk/android/api/org/webrtc/FrameEncryptor.java",
        "sdk/android/api/org/webrtc/EglBase.java",
        "sdk/android/api/org/webrtc/VideoProcessor.java",
        "sdk/android/api/org/webrtc/SSLCertificateVerifier.java",
        "sdk/android/api/org/webrtc/VideoSink.java",
        "sdk/android/api/org/webrtc/MediaSource.java",
        "sdk/android/api/org/webrtc/DefaultVideoDecoderFactory.java",
        "sdk/android/api/org/webrtc/VideoCodecInfo.java",
        "sdk/android/api/org/webrtc/FrameDecryptor.java",
        "sdk/android/api/org/webrtc/VideoDecoderFactory.java",
        "sdk/android/api/org/webrtc/TextureBufferImpl.java",
        "sdk/android/api/org/webrtc/VideoFrame.java",
        "sdk/android/api/org/webrtc/IceCandidateErrorEvent.java",
        "sdk/android/api/org/webrtc/CapturerObserver.java",
        "sdk/android/api/org/webrtc/MediaStreamTrack.java",
        "sdk/android/api/org/webrtc/GlTextureFrameBuffer.java",
        "sdk/android/api/org/webrtc/TurnCustomizer.java",
        "sdk/android/api/org/webrtc/TimestampAligner.java",
        "sdk/android/api/org/webrtc/BuiltinAudioDecoderFactoryFactory.java",
        "sdk/android/api/org/webrtc/LibvpxVp9Decoder.java",
        "sdk/android/api/org/webrtc/SurfaceEglRenderer.java",
        "sdk/android/api/org/webrtc/HardwareVideoDecoderFactory.java",
        "sdk/android/api/org/webrtc/VideoCodecStatus.java",
        "sdk/android/api/org/webrtc/Dav1dDecoder.java",
        "sdk/android/api/org/webrtc/VideoFrameDrawer.java",
        "sdk/android/api/org/webrtc/CallSessionFileRotatingLogSink.java",
        "sdk/android/api/org/webrtc/EncodedImage.java",
    ]


def make_github_url(repo, commit):
    if not repo.endswith("/"):
        repo += "/"
    return repo + "archive/" + commit + ".tar.gz"


def make_googlesource_url(target, commit):
    if target == "libwebrtc":
        return "https://webrtc.googlesource.com/src.git/+archive/" + commit + ".tar.gz"
    elif target == "build":
        return (
            "https://chromium.googlesource.com/chromium/src/build/+archive/"
            + commit
            + ".tar.gz"
        )
    elif target == "third_party":
        return (
            "https://chromium.googlesource.com/chromium/src/third_party/+archive/"
            + commit
            + ".tar.gz"
        )


def fetch(target, url):
    print("Fetching commit from {}".format(url))
    req = requests.get(url)
    if req.status_code == 200:
        with open(target + ".tar.gz", "wb") as f:
            f.write(req.content)
    else:
        print(
            "Hit status code {} fetching commit. Aborting.".format(req.status_code),
            file=sys.stderr,
        )
        sys.exit(1)
    with open(os.path.join(LIBWEBRTC_DIR, "README.mozilla"), "a") as f:
        # write the the command line used
        f.write("# ./mach python {}\n".format(" ".join(sys.argv[0:])))
        f.write(
            "{} updated from commit {} on {}.\n".format(
                target, url, datetime.datetime.utcnow().isoformat()
            )
        )


def fetch_local(target, path, commit):
    target_archive = target + ".tar.gz"
    cp = subprocess.run(["git", "archive", "-o", target_archive, commit], cwd=path)
    if cp.returncode != 0:
        print(
            "Hit return code {} fetching commit. Aborting.".format(cp.returncode),
            file=sys.stderr,
        )
        sys.exit(1)

    with open(os.path.join(LIBWEBRTC_DIR, "README.mozilla"), "a") as f:
        # write the the command line used
        f.write("# ./mach python {}\n".format(" ".join(sys.argv[0:])))
        f.write(
            "{} updated from {} commit {} on {}.\n".format(
                target, path, commit, datetime.datetime.utcnow().isoformat()
            )
        )
    shutil.move(os.path.join(path, target_archive), target_archive)


def validate_tar_member(member, path):
    def _is_within_directory(directory, target):
        real_directory = os.path.realpath(directory)
        real_target = os.path.realpath(target)
        prefix = os.path.commonprefix([real_directory, real_target])
        return prefix == real_directory

    member_path = os.path.join(path, member.name)
    if not _is_within_directory(path, member_path):
        raise Exception("Attempted path traversal in tar file: " + member.name)
    if member.issym():
        link_path = os.path.join(os.path.dirname(member_path), member.linkname)
        if not _is_within_directory(path, link_path):
            raise Exception("Attempted link path traversal in tar file: " + member.name)
    if member.mode & (stat.S_ISUID | stat.S_ISGID):
        raise Exception("Attempted setuid or setgid in tar file: " + member.name)


def safe_extract(tar, path=".", *, numeric_owner=False):
    def _files(tar, path):
        for member in tar:
            validate_tar_member(member, path)
            yield member

    tar.extractall(path, members=_files(tar, path), numeric_owner=numeric_owner)


def unpack(target):
    target_archive = target + ".tar.gz"
    target_path = "tmp-" + target
    try:
        shutil.rmtree(target_path)
    except FileNotFoundError:
        pass
    with tarfile.open(target_archive) as t:
        safe_extract(t, path=target_path)

    if target == "libwebrtc":
        # use the top level directories from the tarfile and
        # delete those directories in LIBWEBRTC_DIR
        libwebrtc_used_in_firefox = os.listdir(target_path)
        for path in libwebrtc_used_in_firefox:
            try:
                shutil.rmtree(os.path.join(LIBWEBRTC_DIR, path))
            except FileNotFoundError:
                pass
            except NotADirectoryError:
                pass

        unused_libwebrtc_in_firefox = get_excluded_files() + get_excluded_dirs()
        forced_used_in_firefox = get_included_path_overrides()

        # adjust target_path if GitHub packaging is involved
        if not os.path.exists(os.path.join(target_path, libwebrtc_used_in_firefox[0])):
            # GitHub packs everything inside a separate directory
            target_path = os.path.join(target_path, os.listdir(target_path)[0])

        # remove any entries found in unused_libwebrtc_in_firefox from the
        # tarfile
        for path in unused_libwebrtc_in_firefox:
            if os.path.isdir(os.path.join(target_path, path)):
                shutil.rmtree(os.path.join(target_path, path))
            else:
                os.remove(os.path.join(target_path, path))

        # move remaining top level entries from the tarfile to LIBWEBRTC_DIR
        for path in os.listdir(target_path):
            shutil.move(
                os.path.join(target_path, path), os.path.join(LIBWEBRTC_DIR, path)
            )

        # An easy, but inefficient way to accomplish including specific
        # files from directories otherwise removed.  Re-extract the tar
        # file, and only copy over the exact files requested.
        shutil.rmtree(target_path)
        with tarfile.open(target_archive) as t:
            safe_extract(t, path=target_path)

        # Copy the force included files.  Note: the instinctual action
        # is to do this prior to removing the excluded paths to avoid
        # reextracting the tar file.  However, this causes errors due to
        # pre-existing paths when other directories are moved out of the
        # tar file in the "move all the top level entries from the
        # tarfile" phase above.
        for path in forced_used_in_firefox:
            dest_path = os.path.join(LIBWEBRTC_DIR, path)
            dir_path = os.path.dirname(dest_path)
            if not os.path.exists(dir_path):
                os.makedirs(dir_path)
            shutil.move(os.path.join(target_path, path), dest_path)
    elif target == "build":
        try:
            shutil.rmtree(os.path.join(LIBWEBRTC_DIR, "build"))
        except FileNotFoundError:
            pass
        os.makedirs(os.path.join(LIBWEBRTC_DIR, "build"))

        if os.path.exists(os.path.join(target_path, "linux")):
            for path in os.listdir(target_path):
                shutil.move(
                    os.path.join(target_path, path),
                    os.path.join(LIBWEBRTC_DIR, "build", path),
                )
        else:
            # GitHub packs everything inside a separate directory
            target_path = os.path.join(target_path, os.listdir(target_path)[0])
            for path in os.listdir(target_path):
                shutil.move(
                    os.path.join(target_path, path),
                    os.path.join(LIBWEBRTC_DIR, "build", path),
                )
    elif target == "third_party":
        # Only delete the THIRDPARTY_USED_IN_FIREFOX paths from
        # LIBWEBRTC_DIR/third_party to avoid deleting directories that
        # we use to trampoline to libraries already in mozilla's tree.
        for path in THIRDPARTY_USED_IN_FIREFOX:
            try:
                shutil.rmtree(os.path.join(LIBWEBRTC_DIR, "third_party", path))
            except FileNotFoundError:
                pass
            except NotADirectoryError:
                pass

        if os.path.exists(os.path.join(target_path, THIRDPARTY_USED_IN_FIREFOX[0])):
            for path in THIRDPARTY_USED_IN_FIREFOX:
                shutil.move(
                    os.path.join(target_path, path),
                    os.path.join(LIBWEBRTC_DIR, "third_party", path),
                )
        else:
            # GitHub packs everything inside a separate directory
            target_path = os.path.join(target_path, os.listdir(target_path)[0])
            for path in THIRDPARTY_USED_IN_FIREFOX:
                shutil.move(
                    os.path.join(target_path, path),
                    os.path.join(LIBWEBRTC_DIR, "third_party", path),
                )


def cleanup(target):
    os.remove(target + ".tar.gz")
    shutil.rmtree("tmp-" + target)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update libwebrtc")
    parser.add_argument("target", choices=("libwebrtc", "build", "third_party"))
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--from-github", type=str)
    group.add_argument("--from-googlesource", action="store_true", default=False)
    group.add_argument("--from-local", type=str)
    parser.add_argument("--commit", type=str, default="master")
    parser.add_argument("--skip-fetch", action="store_true", default=False)
    parser.add_argument("--skip-cleanup", action="store_true", default=False)
    args = parser.parse_args()

    os.makedirs(LIBWEBRTC_DIR, exist_ok=True)

    if not args.skip_fetch:
        if args.from_github:
            fetch(args.target, make_github_url(args.from_github, args.commit))
        elif args.from_googlesource:
            fetch(args.target, make_googlesource_url(args.target, args.commit))
        elif args.from_local:
            fetch_local(args.target, args.from_local, args.commit)
    unpack(args.target)
    if not args.skip_cleanup:
        cleanup(args.target)

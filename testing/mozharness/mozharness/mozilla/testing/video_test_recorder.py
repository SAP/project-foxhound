import os
import subprocess
import sys
import threading
from glob import glob


class VideoTestRecorder:
    def __init__(self, suite_name, logger):
        self._suite_name = suite_name
        self._logger = logger

    def __enter__(self):
        self.finish_video = threading.Event()

        target_dir = os.environ.get("UPLOAD_DIR")
        if target_dir and not os.path.isdir(target_dir):
            os.makedirs(target_dir, exist_ok=True)

        self.video_recording_thread = None
        if os.getenv("MOZ_RECORD_TEST"):
            video_recording_target = None
            if sys.platform == "linux":
                video_recording_target = self.do_gnome_video_recording
            elif sys.platform == "darwin":
                video_recording_target = self.do_macos_video_recording
            elif sys.platform == "win32":
                video_recording_target = self.do_windows_video_recording

            if video_recording_target:
                self.video_recording_thread = threading.Thread(
                    target=video_recording_target,
                    args=(
                        self._suite_name,
                        target_dir,
                        self.finish_video,
                    ),
                )
                self._logger.info(f"Starting recording thread {self._suite_name}")
                self.video_recording_thread.start()
            else:
                self._logger.warning(
                    "Screen recording not implemented for this platform"
                )

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.video_recording_thread:
            self._logger.info(f"Stopping recording thread {self._suite_name}")
            self.finish_video.set()
            self.video_recording_thread.join()
            if self.video_recording_thread.is_alive():
                self._logger.error(
                    f"Error while stopping recording thread {self._suite_name}"
                )
            else:
                self._logger.info(f"Stopped recording thread {self._suite_name}")

    def do_gnome_video_recording(self, suite_name, upload_dir, ev):
        import dbus

        target_file = os.path.join(
            upload_dir,
            f"video_{suite_name}.webm",
        )

        self._logger.info(f"Recording suite {suite_name} to {target_file}")

        session_bus = dbus.SessionBus()
        session_bus.call_blocking(
            "org.gnome.Shell.Screencast",
            "/org/gnome/Shell/Screencast",
            "org.gnome.Shell.Screencast",
            "Screencast",
            signature="sa{sv}",
            args=[
                target_file,
                {"draw-cursor": True, "framerate": 35},
            ],
        )

        ev.wait()

        self._logger.info(f"Ending recording suite {suite_name} to {target_file}")
        session_bus.call_blocking(
            "org.gnome.Shell.Screencast",
            "/org/gnome/Shell/Screencast",
            "org.gnome.Shell.Screencast",
            "StopScreencast",
            signature="",
            args=[],
            timeout=30,
        )
        self._logger.info(f"Completed recording suite {suite_name} to {target_file}")

    def do_macos_video_recording(self, suite_name, upload_dir, ev):
        target_file = os.path.join(
            upload_dir,
            f"video_{suite_name}.mov",
        )
        self._logger.info(f"Recording suite {suite_name} to {target_file}")

        process = subprocess.Popen(
            ["/usr/sbin/screencapture", "-v", "-k", target_file],
            stdin=subprocess.PIPE,
        )
        ev.wait()
        self._logger.info(f"Ending recording suite {suite_name} to {target_file}")
        process.stdin.write(b"p")
        process.stdin.flush()
        self._logger.info(
            f"Waiting process shutdown recording suite {suite_name} to {target_file}"
        )
        process.wait(timeout=30)
        self._logger.info(
            f"Completed process shutdown recording suite {suite_name} to {target_file}"
        )

    def do_windows_video_recording(self, suite_name, upload_dir, ev):
        target_file = os.path.join(
            upload_dir,
            f"video_{suite_name}.mp4",
        )
        self._logger.info(f"Recording suite {suite_name} to {target_file}")

        ffmpeg_bin = glob(
            os.path.join(
                os.environ.get("MOZ_FETCHES_DIR", ""), "ffmpeg-*/bin/ffmpeg.exe"
            )
        )[0]

        process = subprocess.Popen(
            [
                ffmpeg_bin,
                "-f",
                "gdigrab",
                "-framerate",
                "30",
                "-i",
                "desktop",
                "-c:v",
                "libx264",
                "-preset",
                "ultrafast",
                target_file,
            ],
            stdin=subprocess.PIPE,
        )
        ev.wait()
        self._logger.info(f"Ending recording suite {suite_name} to {target_file}")
        process.stdin.write(b"q")
        process.stdin.flush()
        self._logger.info(
            f"Waiting process shutdown recording suite {suite_name} to {target_file}"
        )
        process.wait(timeout=30)
        self._logger.info(
            f"Completed process shutdown recording suite {suite_name} to {target_file}"
        )

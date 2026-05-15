# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import socket
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from marionette_driver import Wait
from marionette_harness import MarionetteTestCase


class BeaconHandler(BaseHTTPRequestHandler):
    """HTTP request handler that logs beacon requests."""

    received_beacons = []

    def do_POST(self):
        if self.path.startswith("/beacon"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = (
                self.rfile.read(content_length).decode("utf-8")
                if content_length > 0
                else ""
            )

            beacon_data = {"path": self.path, "body": body, "timestamp": time.time()}
            BeaconHandler.received_beacons.append(beacon_data)

            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            self.wfile.write(b"OK")
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        # Suppress server logs
        pass


class BeaconOnPagehideShutdownTestCase(MarionetteTestCase):
    """Test that sendBeacon works during pagehide when shutting down."""

    def setUp(self):
        super().setUp()

        # Find a free port for our test server
        sock = socket.socket()
        sock.bind(("", 0))
        self.server_port = sock.getsockname()[1]
        sock.close()

        # Start HTTP server in a separate thread
        self.server = HTTPServer(("localhost", self.server_port), BeaconHandler)
        self.server_thread = threading.Thread(target=self.server.serve_forever)
        self.server_thread.daemon = True
        self.server_thread.start()

        # Clear any previous beacon data
        BeaconHandler.received_beacons.clear()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        super().tearDown()

    def test_beacon_sent_on_regular_pagehide(self):
        """Test that a beacon is successfully sent during regular pagehide (navigation)."""

        # Use marionette to inject a test page with sendBeacon functionality
        self.marionette.navigate("about:blank")

        # Inject the beacon test script directly into the page
        self.marionette.execute_script(
            f"""
            // Set up beacon test
            window.beaconServerPort = {self.server_port};

            // Add the pagehide event listener
            window.addEventListener('pagehide', function(event) {{
                console.log('PAGEHIDE EVENT FIRED - persisted:', event.persisted);

                const data = JSON.stringify({{
                    message: 'beacon from regular pagehide',
                    timestamp: Date.now(),
                    persisted: event.persisted
                }});

                // Send beacon to our test server
                const result = navigator.sendBeacon('http://localhost:' + window.beaconServerPort + '/beacon/regular', data);
                console.log('SENDBEACON RESULT:', result);
            }});

            // Set a title so we can verify the script loaded
            document.title = 'Regular Beacon Test Page';
            console.log('Regular beacon test page setup complete');
        """
        )

        # Wait for script execution
        Wait(self.marionette, timeout=10).until(
            lambda _: self.marionette.title == "Regular Beacon Test Page"
        )

        # Record how many beacons we had before navigation
        initial_beacon_count = len(BeaconHandler.received_beacons)

        # Navigate to a different page - this should trigger pagehide and send the beacon
        self.marionette.navigate("about:blank")

        # Wait for navigation and any pending beacon requests
        Wait(self.marionette, timeout=10).until(
            lambda _: self.marionette.execute_script("return document.readyState")
            == "complete"
        )
        time.sleep(2)  # Give server time to process the beacon

        # Check that we received the beacon
        final_beacon_count = len(BeaconHandler.received_beacons)

        # Log debug information
        print(f"Regular pagehide - Initial beacon count: {initial_beacon_count}")
        print(f"Regular pagehide - Final beacon count: {final_beacon_count}")
        print(f"Regular pagehide - Received beacons: {BeaconHandler.received_beacons}")

        self.assertGreater(
            final_beacon_count,
            initial_beacon_count,
            f"Expected to receive a beacon during regular pagehide (navigation). "
            f"Initial: {initial_beacon_count}, Final: {final_beacon_count}",
        )

        # Verify the beacon contains expected data
        received_beacon = BeaconHandler.received_beacons[-1]
        self.assertEqual(received_beacon["path"], "/beacon/regular")

        # Parse the beacon body as JSON
        try:
            beacon_data = json.loads(received_beacon["body"])
            self.assertEqual(beacon_data["message"], "beacon from regular pagehide")
            self.assertIn("timestamp", beacon_data)
        except json.JSONDecodeError:
            self.fail(f"Beacon body was not valid JSON: {received_beacon['body']}")

    def test_beacon_sent_on_pagehide_during_shutdown(self):
        """Test that a beacon is successfully sent during pagehide when browser shuts down.

        This is a regression test for bug 1931956 - sendBeacon requests were not reliably
        sent during pagehide when the browser was shutting down. The test verifies that
        this functionality works correctly.
        """

        # Use marionette to inject a test page with sendBeacon functionality
        self.marionette.navigate("about:blank")

        # Inject the beacon test script directly into the page
        self.marionette.execute_script(
            f"""
            // Set up beacon test
            window.beaconServerPort = {self.server_port};

            // Add the pagehide event listener
            window.addEventListener('pagehide', function(event) {{
                console.log('SHUTDOWN PAGEHIDE EVENT FIRED - persisted:', event.persisted);

                const data = JSON.stringify({{
                    message: 'beacon from pagehide',
                    timestamp: Date.now(),
                    persisted: event.persisted
                }});

                // Send beacon to our test server
                const result = navigator.sendBeacon('http://localhost:' + window.beaconServerPort + '/beacon/shutdown', data);
                console.log('SHUTDOWN SENDBEACON RESULT:', result);
            }});

            // Set a title so we can verify the script loaded
            document.title = 'Beacon Test Page';
            console.log('Beacon test page loaded');
        """
        )

        # Wait for script execution
        Wait(self.marionette, timeout=10).until(
            lambda _: self.marionette.title == "Beacon Test Page"
        )

        # Record how many beacons we had before shutdown
        initial_beacon_count = len(BeaconHandler.received_beacons)

        # Trigger browser shutdown - this should fire the pagehide event
        # and send the beacon before the browser fully closes
        self.marionette.quit()

        # Give the server a moment to receive any pending requests
        # The beacon should be sent synchronously during pagehide, but we'll
        # wait a bit to ensure it's processed by our server
        time.sleep(2)

        # Check that we received the beacon
        final_beacon_count = len(BeaconHandler.received_beacons)

        # Log debug information
        print(f"Initial beacon count: {initial_beacon_count}")
        print(f"Final beacon count: {final_beacon_count}")
        print(f"Received beacons: {BeaconHandler.received_beacons}")

        self.assertGreater(
            final_beacon_count,
            initial_beacon_count,
            f"Expected to receive a beacon during pagehide on shutdown. "
            f"Initial: {initial_beacon_count}, Final: {final_beacon_count}. "
            f"If this fails, it indicates a regression of bug 1931956.",
        )

        # Verify the beacon contains expected data
        received_beacon = BeaconHandler.received_beacons[-1]
        self.assertEqual(received_beacon["path"], "/beacon/shutdown")

        # Parse the beacon body as JSON
        try:
            beacon_data = json.loads(received_beacon["body"])
            self.assertEqual(beacon_data["message"], "beacon from pagehide")
            self.assertIn("timestamp", beacon_data)
        except json.JSONDecodeError:
            self.fail(f"Beacon body was not valid JSON: {received_beacon['body']}")

#!/bin/bash

#name: newssite-applink-startup
#owner: perftest
#description: Runs the newssite applink startup(cvne) test for chrome/fenix

SCRIPT_PATH="testing/performance/mobile-startup/android_startup_videoapplink.py"
CA_PEM="netwerk/test/unit/http2-ca.pem"
SERVER_CERT="testing/raptor/browsertime/utils/http2-cert.pem"
SERVER_KEY="testing/raptor/browsertime/utils/http2-cert.key"
SERVER_SCRIPT="testing/performance/mobile-startup/http2-server.js"
SITE_DIR="testing/performance/mobile-startup/newssite-nuxt"

# Add fetched node to PATH (CI provides it via linux64-node).
if [ -d "${MOZ_FETCHES_DIR}/node/bin" ]; then
    export PATH="${MOZ_FETCHES_DIR}/node/bin:${PATH}"
fi

# Probe for root: try su -c first, then check if adb
# is already running as root (emulators / adb root).
if adb shell su -c 'id' >/dev/null 2>&1; then
    SHELL_CMD="adb shell su -c"
    HAS_ROOT=1
elif [ "$(adb shell id -u 2>/dev/null | tr -d '\r')" = "0" ]; then
    SHELL_CMD="adb shell"
    HAS_ROOT=1
else
    HAS_ROOT=0
fi

if [ "$HAS_ROOT" = "1" ]; then
    # Install the test CA so Chrome trusts the server cert (Chrome reads
    # user-installed CAs from cacerts-added natively).
    # The filename must be the subject hash of the CA cert with a .0 suffix.
    CA_HASH=$(openssl x509 -subject_hash -noout -in $CA_PEM)
    adb push $CA_PEM /sdcard/Download/ca.pem
    $SHELL_CMD 'mkdir -p /data/misc/user/0/cacerts-added'
    $SHELL_CMD "cp /sdcard/Download/ca.pem /data/misc/user/0/cacerts-added/${CA_HASH}.0"
    $SHELL_CMD "chown system:system /data/misc/user/0/cacerts-added/${CA_HASH}.0"
    $SHELL_CMD "chmod 644 /data/misc/user/0/cacerts-added/${CA_HASH}.0"

    # Start HTTP/2 server with TLS.
    node $SERVER_SCRIPT $SITE_DIR $SERVER_CERT $SERVER_KEY \
        > $TESTING_DIR/server.log 2>&1 &
    SERVER_PID=$!
    sleep 2
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "ERROR: HTTP/2 server failed to start (PID $SERVER_PID). Server log:"
        cat $TESTING_DIR/server.log
        exit 1
    fi
    TEST_URL="https://localhost:8000"
    echo "HTTP/2 TLS server started with PID $SERVER_PID"
else
    # No root: plain HTTP.
    $PYTHON_PATH_SHELL_SCRIPT -m http.server \
        --directory $SITE_DIR \
        > $TESTING_DIR/server.log 2>&1 &
    SERVER_PID=$!
    sleep 2
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "ERROR: HTTP server failed to start (PID $SERVER_PID). Server log:"
        cat $TESTING_DIR/server.log
        exit 1
    fi
    TEST_URL="http://localhost:8000"
    echo "HTTP server started with PID $SERVER_PID"
fi

# Reroute localhost:8000 on the device to the host.
adb reverse tcp:8000 tcp:8000

# Run the Python script
$PYTHON_PATH_SHELL_SCRIPT $SCRIPT_PATH $APP cold_view_nav_end $TEST_URL

# Remove all reverse rules
adb reverse --remove-all

# Kill server
kill $SERVER_PID

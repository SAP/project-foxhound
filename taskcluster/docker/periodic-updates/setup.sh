#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

set -ve

apt-get update -q
apt-get install -y --no-install-recommends \
    curl \
    jq \
    libasound2 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxml2-utils \
    libxt6 \
    libxtst6 \
    php-cli \
    php-curl \
    shellcheck \
    unzip \
    bzip2 \
    wget

# Install specific version of Arcanist to avoid PHP deprecation issues (Bug 2016414)
git clone https://github.com/phacility/arcanist.git /usr/local/share/arcanist
git -C /usr/local/share/arcanist checkout e50d1bc4eabac9c37e3220e9f3fb8e37ae20b957
ln -s /usr/local/share/arcanist/bin/arc /usr/local/bin/arc

rm -rf /setup

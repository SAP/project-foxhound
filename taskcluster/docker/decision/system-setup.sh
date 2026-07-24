#!/usr/bin/env bash

set -v -e

test "$(whoami)" == 'root'

apt-get update
apt-get install \
    python-is-python3 \
    sudo \
    python3-yaml

apt-get autoremove --purge
apt-get clean
apt-get autoclean
rm -rf /var/lib/apt/lists/
rm "$0"

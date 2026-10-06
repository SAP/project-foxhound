#!/usr/bin/env bash

set -ve

test "$(whoami)" == 'root'

mkdir -p /setup
cd /setup

# p7zip-full is for extracting Windows and OS X packages
# wget is for downloading update.xml, installers, and MARs
# libgtk-3-0 is required to run the Firefox updater
apt_packages=()
apt_packages+=('curl')
apt_packages+=('libgtk-3-0')
apt_packages+=('locales')
apt_packages+=('p7zip-full')
apt_packages+=('python3-cairo')
apt_packages+=('python3-pip')
apt_packages+=('python3-aiohttp')
apt_packages+=('shellcheck')
apt_packages+=('sudo')
apt_packages+=('wget')
apt_packages+=('zip')

apt-get update
apt-get install "${apt_packages[@]}"

su -c 'git config --global user.email "worker@mozilla.test"' worker
su -c 'git config --global user.name "worker"' worker

rm -rf /setup

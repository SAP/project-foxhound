#!/bin/sh
set -v -e -x

pip3 install --break-system-packages --no-cache-dir git+https://github.com/mozilla/reposado@f786789206ef8b924ed6b5e978cfa394724e5ec6

python3 /usr/local/bin/repoutil --configure <<EOF
/opt/data-reposado/html/
/opt/data-reposado/metadata/
http://example.com/
EOF

pip3 install --break-system-packages --no-cache-dir -r /setup/requirements.txt

cd /
rm -rf /setup

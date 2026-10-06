#!/bin/bash

L1="20200101-0"
L2="20200101-1"

python add_cert.py ${L1} known int.pem valid.example.com.pem
python add_cert.py ${L1} revoked int.pem revoked.example.com.pem
python add_cert.py ${L1} revoked int.pem revoked-no-sct.example.com.pem

python add_cert.py ${L2} known int.pem valid.example.com.pem
python add_cert.py ${L2} revoked int.pem revoked.example.com.pem
python add_cert.py ${L1} revoked int.pem revoked-no-sct.example.com.pem
python add_cert.py ${L2} revoked int.pem revoked-in-delta.example.com.pem

cat > ./ct-logs.json << EOF
[{
 "LogID": "VCIlmPM9NkgFQtrs4Oa5TeFcDu6MWRTKSNdePEhOgD8=",
 "MinTimestamp": 0,
 "MaxTimestamp": 9999999999999,
 "MMD": 86400,
 "MinEntry": 0
}]
EOF

rust-create-cascade --filter-type clubcard --ct-logs-json ./ct-logs.json \
        --known ./${L1}/known/ --revoked ./${L1}/revoked --outdir ./${L1}/out

rust-create-cascade --filter-type clubcard --ct-logs-json ./ct-logs.json \
        --known ./${L2}/known/ --revoked ./${L2}/revoked --outdir ./${L2}/out \
        --prev-revset ./${L1}/out/revset.bin

mv ./${L1}/out/filter ./${L1}-filter
mv ./${L2}/out/filter.delta ./${L2}-filter.delta

rm -rf ./${L1} ./${L2} ./ct-logs.json

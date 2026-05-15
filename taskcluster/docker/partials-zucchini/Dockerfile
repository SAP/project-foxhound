FROM $DOCKER_IMAGE_PARENT

# Install deps
RUN apt-get install python3-pip
COPY requirements.txt /tmp/requirements.txt
RUN python3 -m pip install --break-system-packages --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Copy DER certificates and convert to public keys
# %include toolkit/mozapps/update/updater/nightly_aurora_level3_primary.der
COPY topsrcdir/toolkit/mozapps/update/updater/nightly_aurora_level3_primary.der /tmp/
# %include toolkit/mozapps/update/updater/dep1.der
COPY topsrcdir/toolkit/mozapps/update/updater/dep1.der /tmp/
# %include toolkit/mozapps/update/updater/release_primary.der
COPY topsrcdir/toolkit/mozapps/update/updater/release_primary.der /tmp/
RUN mkdir -p /builds/worker/workspace/keys && \
    openssl x509 -inform DER -pubkey -noout -in /tmp/nightly_aurora_level3_primary.der > /builds/worker/workspace/keys/nightly.pubkey && \
    openssl x509 -inform DER -pubkey -noout -in /tmp/dep1.der > /builds/worker/workspace/keys/dep.pubkey && \
    openssl x509 -inform DER -pubkey -noout -in /tmp/release_primary.der > /builds/worker/workspace/keys/release.pubkey && \
    rm /tmp/*.der && \
    chmod -R a+r,a-w /builds/worker/workspace/keys

# Copy files
COPY make_incremental_zucchini.py /builds/worker/bin/make_incremental_zucchini.py

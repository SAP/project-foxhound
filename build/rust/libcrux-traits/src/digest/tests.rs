// Copyright 2023 Cryspen Sarl
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

pub fn simple<
    const OUTPUT_LEN: usize,
    IncrementalState,
    HashImplementation: super::arrayref::DigestIncremental<OUTPUT_LEN, IncrementalState = IncrementalState>
        + super::arrayref::Hash<OUTPUT_LEN>,
>(
    // provide the state, since not all states currently implement `Default`
    state: IncrementalState,
) {
    let payload = &[1, 2, 3, 4, 5];

    // oneshot API
    let mut digest_oneshot = [0u8; OUTPUT_LEN];
    HashImplementation::hash(&mut digest_oneshot, payload).unwrap();

    // incremental API
    let mut digest_incremental = [0u8; OUTPUT_LEN];
    let mut hasher = super::Hasher::<OUTPUT_LEN, HashImplementation> { state };
    hasher.update(payload).unwrap();
    hasher.finish(&mut digest_incremental);

    // ensure same
    assert_eq!(digest_oneshot, digest_incremental);
}

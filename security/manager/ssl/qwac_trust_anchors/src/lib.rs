/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

mod trust_anchors;

use thin_vec::ThinVec;
use trust_anchors::{TrustAnchor, TEST_TRUST_ANCHORS, TRUST_ANCHORS};

fn trust_anchors_with_subject_from<'a>(
    subject: &[u8],
    trust_anchor_list: &'static [TrustAnchor],
) -> Box<dyn Iterator<Item = &'static TrustAnchor>> {
    let Ok(index) = trust_anchor_list.binary_search_by_key(&subject, |r| &r.subject()) else {
        return Box::new(std::iter::empty::<&'static TrustAnchor>());
    };

    // binary search returned a matching index, but maybe not the smallest
    let mut min = index;
    while min > 0 && subject.eq(trust_anchor_list[min - 1].subject()) {
        min -= 1;
    }

    // ... and maybe not the largest.
    let mut max = index;
    while max < trust_anchor_list.len() - 1 && subject.eq(trust_anchor_list[max + 1].subject()) {
        max += 1;
    }
    Box::new(trust_anchor_list.iter().take(max + 1).skip(min))
}

#[no_mangle]
pub extern "C" fn find_qwac_trust_anchors_by_subject(
    subject: &ThinVec<u8>,
    trust_anchors_out: &mut ThinVec<ThinVec<u8>>,
) {
    trust_anchors_out.clear();
    for trust_anchor in trust_anchors_with_subject_from(subject, &TRUST_ANCHORS) {
        trust_anchors_out.push(trust_anchor.bytes().into());
    }
    if static_prefs::pref!("security.qwacs.enable_test_trust_anchors") {
        for trust_anchor in trust_anchors_with_subject_from(subject, &TEST_TRUST_ANCHORS) {
            trust_anchors_out.push(trust_anchor.bytes().into());
        }
    }
}

#[no_mangle]
pub extern "C" fn is_qwac_trust_anchor(subject: &ThinVec<u8>, certificate: &ThinVec<u8>) -> bool {
    if trust_anchors_with_subject_from(subject, &TRUST_ANCHORS)
        .find(|trust_anchor| trust_anchor.bytes() == certificate.as_slice())
        .is_some()
    {
        return true;
    }
    if static_prefs::pref!("security.qwacs.enable_test_trust_anchors") {
        return trust_anchors_with_subject_from(subject, &TEST_TRUST_ANCHORS)
            .find(|trust_anchor| trust_anchor.bytes() == certificate.as_slice())
            .is_some();
    }
    false
}

/* -*- Mode: rust; rust-indent-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

pub(crate) struct TrustAnchor {
    bytes: &'static [u8],
    subject: (u16, u8),
}

impl TrustAnchor {
    pub fn bytes(&self) -> &'static [u8] {
        self.bytes
    }

    pub fn subject(&self) -> &'static [u8] {
        &self.bytes[self.subject.0 as usize..][..self.subject.1 as usize]
    }
}

include!(concat!(env!("OUT_DIR"), "/trust_anchors.rs"));

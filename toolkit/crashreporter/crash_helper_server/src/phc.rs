/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// The types here must match the ones in memory/build/PHC.h

use anyhow::{bail, Result};
use std::{
    ffi::{c_char, c_void},
    mem::{size_of, MaybeUninit},
    slice,
};

pub(crate) const PHC_KIND_UNKNOWN: u32 = 0;
pub(crate) const PHC_KIND_NEVER_ALLOCATED_PAGE: u32 = 1;
pub(crate) const PHC_KIND_IN_USE_PAGE: u32 = 2;
pub(crate) const PHC_KIND_FREED_PAGE: u32 = 3;
pub(crate) const PHC_KIND_GUARD_PAGE: u32 = 4;

pub fn is_phc_kind(value: u32) -> bool {
    matches!(
        value,
        PHC_KIND_UNKNOWN
            | PHC_KIND_NEVER_ALLOCATED_PAGE
            | PHC_KIND_IN_USE_PAGE
            | PHC_KIND_FREED_PAGE
            | PHC_KIND_GUARD_PAGE
    )
}

const MAX_FRAMES: usize = 16;

#[repr(C)]
pub(crate) struct StackTrace {
    pub(crate) length: usize,
    pub(crate) pcs: [*const c_void; MAX_FRAMES],
    pub(crate) has_stack: c_char,
}

#[repr(C)]
pub(crate) struct AddrInfo {
    pub(crate) kind: u32,
    pub(crate) base_addr: *const c_void,
    pub(crate) usable_size: usize,
    pub(crate) alloc_stack: StackTrace,
    pub(crate) free_stack: StackTrace,
    pub(crate) phc_was_locked: c_char,
}

impl AddrInfo {
    pub(crate) fn from_bytes(buff: &[u8]) -> Result<AddrInfo> {
        if buff.len() != size_of::<AddrInfo>() {
            bail!(
                "PHC AddrInfo structure size {} doesn't match expected size {}",
                buff.len(),
                size_of::<AddrInfo>()
            );
        }

        let mut addr_info = MaybeUninit::<AddrInfo>::uninit();
        // SAFETY: MaybeUninit<u8> is always valid, even for padding bytes
        let uninit_addr_info = unsafe {
            slice::from_raw_parts_mut(
                addr_info.as_mut_ptr() as *mut MaybeUninit<u8>,
                size_of::<AddrInfo>(),
            )
        };

        for (index, &value) in buff.iter().enumerate() {
            uninit_addr_info[index].write(value);
        }

        let addr_info = unsafe { addr_info.assume_init() };
        if !addr_info.check_consistency() {
            bail!("PHC AddrInfo structure is inconsistent");
        }

        Ok(addr_info)
    }

    pub(crate) fn kind_as_str(&self) -> &'static str {
        match self.kind {
            PHC_KIND_UNKNOWN => "Unknown(?!)",
            PHC_KIND_NEVER_ALLOCATED_PAGE => "NeverAllocatedPage",
            PHC_KIND_IN_USE_PAGE => "InUsePage(?!)",
            PHC_KIND_FREED_PAGE => "FreedPage",
            PHC_KIND_GUARD_PAGE => "GuardPage",
            _ => "Invalid(?!)",
        }
    }

    fn check_consistency(&self) -> bool {
        if (!is_phc_kind(self.kind))
            || (self.alloc_stack.length > MAX_FRAMES)
            || (self.free_stack.length > MAX_FRAMES)
            || (self.alloc_stack.has_stack > 1)
            || (self.free_stack.has_stack > 1)
            || (self.phc_was_locked > 1)
        {
            return false;
        }

        true
    }
}

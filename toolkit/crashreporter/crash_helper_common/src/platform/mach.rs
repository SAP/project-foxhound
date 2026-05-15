/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use mach2::{
    kern_return::{kern_return_t, KERN_SUCCESS},
    mach_port::{
        mach_port_allocate, mach_port_deallocate, mach_port_insert_right, mach_port_mod_refs,
    },
    message::{
        mach_msg, mach_msg_base_t, mach_msg_body_t, mach_msg_header_t, mach_msg_port_descriptor_t,
        mach_msg_trailer_t, MACH_MSGH_BITS, MACH_MSGH_BITS_COMPLEX, MACH_MSG_SUCCESS,
        MACH_MSG_TYPE_COPY_SEND, MACH_MSG_TYPE_MAKE_SEND, MACH_RCV_MSG, MACH_RCV_TIMEOUT,
        MACH_SEND_MSG, MACH_SEND_TIMEOUT,
    },
    port::{mach_port_name_t, mach_port_t, MACH_PORT_NULL, MACH_PORT_RIGHT_RECEIVE},
    traps::mach_task_self,
};
use nix::errno::Errno;
use std::{
    alloc::{alloc_zeroed, dealloc, Layout},
    cmp::max,
    fmt::Display,
    mem::ManuallyDrop,
    result, slice,
};
use thiserror::Error;

use crate::IO_TIMEOUT;

pub type Result<T> = result::Result<T, PlatformError>;

pub type ProcessHandle = ();

#[derive(Error, Debug)]
pub enum PlatformError {
    #[error("Bootstrap look-up failure: {0}")]
    BootstrapLookUp(kern_return_t),
    #[error("Bootstrap registration failure: {0}")]
    BootstrapRegister(kern_return_t),
    #[error("Could not get random value: {0}")]
    GetRandom(getrandom::Error),
    #[error("Could not insert a send right: {0}")]
    InsertSendRight(kern_return_t),
    #[error("kevent() call failed with error: {0}")]
    KernelEventError(Errno),
    #[error("kqueue() call failed with error: {0}")]
    KernelQueueError(Errno),
    #[error("Could not create a mach port: {0}")]
    MachPortAllocate(kern_return_t),
    #[error("No more senders remain for this port")]
    NoMoreSenders,
    #[error("mach_msg() call failed with error: {0}")]
    ReceiveFailure(kern_return_t),
    #[error("mach_port_request_notification failed with error: {0}")]
    RequestNotification(kern_return_t),
    #[error("mach_msg() call failed with error: {0}")]
    SendFailure(kern_return_t),
    #[error("Value exceeds a 32-bit integer")]
    ValueTooLarge,
}

/****************************************************************************
 * Ports and rights                                                         *
 ****************************************************************************/

pub trait AsRawPort {
    fn as_raw_port(&self) -> mach_port_t;
}

#[repr(transparent)]
pub struct ReceiveRight(mach_port_name_t);

impl ReceiveRight {
    pub fn new() -> Result<ReceiveRight> {
        let mut receive_right: mach_port_name_t = MACH_PORT_NULL;
        let rv = unsafe {
            mach_port_allocate(
                mach_task_self(),
                MACH_PORT_RIGHT_RECEIVE,
                &mut receive_right,
            )
        };

        if rv == KERN_SUCCESS {
            Ok(ReceiveRight(receive_right))
        } else {
            Err(PlatformError::MachPortAllocate(rv))
        }
    }

    pub(crate) unsafe fn from_raw_port(port: mach_port_name_t) -> ReceiveRight {
        ReceiveRight(port)
    }

    pub fn into_raw_port(self) -> mach_port_name_t {
        ManuallyDrop::new(self).0
    }

    pub(crate) fn insert_send_right(&self) -> Result<SendRight> {
        let rv = unsafe {
            mach_port_insert_right(
                mach_task_self(),
                /* name */ self.0,
                /* right */ self.0,
                MACH_MSG_TYPE_MAKE_SEND,
            )
        };

        if rv == KERN_SUCCESS {
            // SAFETY: We verified that `self.0` contains a valid send right
            // which we just inserted.
            Ok(unsafe { SendRight::from_raw_port(self.0) })
        } else {
            Err(PlatformError::InsertSendRight(rv))
        }
    }
}

impl Drop for ReceiveRight {
    fn drop(&mut self) {
        let rv =
            unsafe { mach_port_mod_refs(mach_task_self(), self.0, MACH_PORT_RIGHT_RECEIVE, -1) };
        assert!(
            rv == KERN_SUCCESS,
            "Could not dispose of a receive right, error {rv}"
        );
    }
}

impl AsRawPort for ReceiveRight {
    fn as_raw_port(&self) -> mach_port_name_t {
        self.0
    }
}

#[repr(transparent)]
pub struct SendRight(mach_port_name_t);

impl SendRight {
    /// Create an owned send right from a raw port right name.
    ///
    /// # Safety
    ///
    /// `port` must be a valid send right to a Mach port.
    pub unsafe fn from_raw_port(port: mach_port_name_t) -> SendRight {
        SendRight(port)
    }

    pub fn into_raw_port(self) -> mach_port_name_t {
        ManuallyDrop::new(self).0
    }
}

impl AsRawPort for SendRight {
    fn as_raw_port(&self) -> mach_port_name_t {
        self.0
    }
}

impl Drop for SendRight {
    fn drop(&mut self) {
        // We use `mach_port_deallocate()` instead of `mach_port_mod_refs()`
        // because it doesn't fail if the corresponding receive right has
        // already been destroyed.
        let rv = unsafe { mach_port_deallocate(mach_task_self(), self.0) };
        assert!(
            rv == KERN_SUCCESS,
            "Could not dispose of a send right {}, error {rv}",
            self.0,
        );
    }
}

pub enum OwnedRight {
    Send(SendRight),
    Receive(ReceiveRight),
}

/****************************************************************************
 * Mach messages                                                            *
 ****************************************************************************/

pub struct MachMessageWrapper {
    layout: Layout,
    ptr: *mut u8,
}

impl MachMessageWrapper {
    pub fn for_send(size: usize, descriptors: u32) -> MachMessageWrapper {
        let total_size = MachMessageWrapper::compute_size(size, descriptors);
        let layout = Layout::from_size_align(total_size as usize, align_of::<u32>())
            .expect("Invalid layout for a Mach message");
        let ptr = unsafe { alloc_zeroed(layout) };
        let base_msg = unsafe { &mut *(ptr as *mut mach_msg_base_t) };
        base_msg.header.msgh_size = total_size;
        base_msg.body.msgh_descriptor_count = descriptors;

        MachMessageWrapper { layout, ptr }
    }

    pub fn for_recv(expected_size: usize, expected_descriptors: u32) -> MachMessageWrapper {
        let total_size = MachMessageWrapper::compute_size(
            expected_size + size_of::<mach_msg_trailer_t>(),
            expected_descriptors,
        );
        let layout = Layout::from_size_align(total_size as usize, align_of::<u32>())
            .expect("Invalid layout for a Mach message");
        let ptr = unsafe { alloc_zeroed(layout) };
        let base_msg = unsafe { &mut *(ptr as *mut mach_msg_base_t) };
        base_msg.header.msgh_size = total_size;
        base_msg.body.msgh_descriptor_count = expected_descriptors;

        MachMessageWrapper { layout, ptr }
    }

    pub fn as_ptr(&self) -> *mut mach_msg_header_t {
        self.ptr as *mut mach_msg_header_t
    }

    pub fn data_size(&self) -> usize {
        // `data_offset()` measures everything but the data in the message.
        self.header().msgh_size as usize - self.data_offset()
    }

    pub fn descriptors_len(&self) -> usize {
        self.body().msgh_descriptor_count as usize
    }

    pub fn header(&self) -> &mach_msg_header_t {
        unsafe { &*(self.ptr as *const mach_msg_header_t) }
    }

    pub fn header_mut(&mut self) -> &mut mach_msg_header_t {
        unsafe { &mut *(self.ptr as *mut mach_msg_header_t) }
    }

    fn body_offset() -> usize {
        size_of::<mach_msg_header_t>()
    }

    pub fn body(&self) -> &mach_msg_body_t {
        unsafe { &*(self.ptr.add(Self::body_offset()) as *const mach_msg_body_t) }
    }

    pub fn body_mut(&mut self) -> &mut mach_msg_body_t {
        unsafe { &mut *(self.ptr.add(Self::body_offset()) as *mut mach_msg_body_t) }
    }

    fn descriptors_offset() -> usize {
        Self::body_offset() + size_of::<mach_msg_body_t>()
    }

    pub fn descriptors(&self) -> &[mach_msg_port_descriptor_t] {
        unsafe {
            let ptr = self.ptr.add(Self::descriptors_offset()) as *const mach_msg_port_descriptor_t;
            slice::from_raw_parts(ptr, self.descriptors_len())
        }
    }

    pub fn descriptors_mut(&mut self) -> &mut [mach_msg_port_descriptor_t] {
        unsafe {
            let ptr = self.ptr.add(Self::descriptors_offset()) as *mut mach_msg_port_descriptor_t;
            slice::from_raw_parts_mut(ptr, self.descriptors_len())
        }
    }

    fn data_offset(&self) -> usize {
        Self::descriptors_offset()
            + (self.descriptors_len() * size_of::<mach_msg_port_descriptor_t>())
    }

    pub fn data(&self) -> &[u8] {
        unsafe {
            let ptr = self.ptr.add(self.data_offset());
            slice::from_raw_parts(ptr, self.data_size())
        }
    }

    pub fn data_mut(&mut self) -> &mut [u8] {
        unsafe {
            let ptr = self.ptr.add(self.data_offset());
            slice::from_raw_parts_mut(ptr, self.data_size())
        }
    }

    fn size(&self) -> u32 {
        self.header().msgh_size
    }

    fn compute_size(size: usize, descriptors: u32) -> u32 {
        // mach message data is packed on 4-bytes boundaries
        let rounded_data = size.next_multiple_of(4);
        (size_of::<mach_msg_header_t>()
            + size_of::<mach_msg_body_t>()
            + (size_of::<mach_msg_port_descriptor_t>() * (descriptors as usize))
            + rounded_data)
            .try_into()
            .expect("Mach messages cannot be larger than 4 GiB")
    }
}

impl Display for MachMessageWrapper {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let header = self.header();
        let body = self.body();
        write!(f, "{header:?} {body:?}")
    }
}

impl Drop for MachMessageWrapper {
    fn drop(&mut self) {
        unsafe { dealloc(self.ptr, self.layout) }
    }
}

pub fn mach_msg_send(port: &SendRight, msg: &mut MachMessageWrapper) -> Result<()> {
    let msgh_bits = MACH_MSGH_BITS(MACH_MSG_TYPE_COPY_SEND, 0)
        | if msg.body().msgh_descriptor_count != 0 {
            MACH_MSGH_BITS_COMPLEX
        } else {
            0
        };

    let header = msg.header_mut();
    header.msgh_bits |= msgh_bits;
    header.msgh_remote_port = port.as_raw_port();

    let rv = unsafe {
        mach_msg(
            msg.as_ptr(),
            MACH_SEND_MSG | MACH_SEND_TIMEOUT,
            msg.size(),
            0,
            MACH_PORT_NULL,
            IO_TIMEOUT as u32,
            MACH_PORT_NULL,
        )
    };

    if rv == MACH_MSG_SUCCESS {
        Ok(())
    } else {
        Err(PlatformError::SendFailure(rv))
    }
}

// Remove when we vendor mach2 0.6.0
static MACH_NOTIFY_NO_SENDERS: i32 = 0o106;

pub fn mach_msg_recv(
    port: &ReceiveRight,
    expected_size: usize,
    expected_descriptors: u32,
) -> Result<MachMessageWrapper> {
    // We can receive a MACH_NOTIFY_NO_SENDERS message at any time and it comes
    // with an 8-byte sized payload which we must account for.
    const MIN_MESSAGE_SIZE: usize = 8;
    let expected_size = max(expected_size, MIN_MESSAGE_SIZE);
    let mut msg = MachMessageWrapper::for_recv(expected_size, expected_descriptors);
    msg.header_mut().msgh_local_port = port.as_raw_port();

    let rv = unsafe {
        mach_msg(
            msg.as_ptr(),
            MACH_RCV_MSG | MACH_RCV_TIMEOUT,
            0,
            msg.size(),
            port.as_raw_port(),
            IO_TIMEOUT as u32,
            MACH_PORT_NULL,
        )
    };

    if msg.header().msgh_id == MACH_NOTIFY_NO_SENDERS {
        // We've got a message, but it's a disconnection
        return Err(PlatformError::NoMoreSenders);
    }

    if rv == MACH_MSG_SUCCESS {
        Ok(msg)
    } else {
        Err(PlatformError::ReceiveFailure(rv))
    }
}

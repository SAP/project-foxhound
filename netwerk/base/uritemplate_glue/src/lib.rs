/* -*- Mode: rust; rust-indent-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

extern crate uritemplate;
use uritemplate::UriTemplate;

use std::{ptr, str};

use nserror::{nsresult, NS_ERROR_INVALID_ARG, NS_OK};
extern crate nsstring;
use nsstring::nsACString;

use xpcom::{AtomicRefcnt, RefCounted, RefPtr};

pub struct UriTemplateWrapper {
    builder: UriTemplate,
    refcnt: AtomicRefcnt,
}

impl UriTemplateWrapper {
    fn new(input: &nsACString) -> Result<RefPtr<UriTemplateWrapper>, nsresult> {
        let template = str::from_utf8(input).map_err(|_| NS_ERROR_INVALID_ARG)?;
        let builder: *mut UriTemplateWrapper = Box::into_raw(Box::new(Self {
            builder: UriTemplate::new(template),
            refcnt: unsafe { AtomicRefcnt::new() },
        }));
        unsafe { Ok(RefPtr::from_raw(builder).unwrap()) }
    }
}

#[no_mangle]
pub unsafe extern "C" fn uri_template_addref(builder: &UriTemplateWrapper) {
    builder.refcnt.inc();
}

#[no_mangle]
pub unsafe extern "C" fn uri_template_release(builder: &UriTemplateWrapper) {
    let rc = builder.refcnt.dec();
    if rc == 0 {
        drop(Box::from_raw(ptr::from_ref(builder).cast_mut()));
    }
}

// xpcom::RefPtr support
unsafe impl RefCounted for UriTemplateWrapper {
    unsafe fn addref(&self) {
        uri_template_addref(self);
    }
    unsafe fn release(&self) {
        uri_template_release(self);
    }
}

#[no_mangle]
pub extern "C" fn uri_template_new(input: &nsACString, result: &mut *const UriTemplateWrapper) {
    *result = ptr::null_mut();
    if let Ok(builder) = UriTemplateWrapper::new(input) {
        builder.forget(result);
    }
}

#[no_mangle]
pub extern "C" fn uri_template_set(
    builder: &mut UriTemplateWrapper,
    name: &nsACString,
    value: &nsACString,
) -> nsresult {
    let Ok(name_conv) = str::from_utf8(name) else {
        return NS_ERROR_INVALID_ARG;
    };
    let Ok(value_conv) = str::from_utf8(value) else {
        return NS_ERROR_INVALID_ARG;
    };
    builder.builder.set(name_conv, value_conv);
    NS_OK
}

#[no_mangle]
pub extern "C" fn uri_template_set_int(
    builder: &mut UriTemplateWrapper,
    name: &nsACString,
    value: i32,
) -> nsresult {
    let Ok(name_conv) = str::from_utf8(name) else {
        return NS_ERROR_INVALID_ARG;
    };
    builder.builder.set(name_conv, value.to_string());
    NS_OK
}

#[no_mangle]
pub extern "C" fn uri_template_build(builder: &mut UriTemplateWrapper, result: &mut nsACString) {
    let res = builder.builder.build();
    result.assign(&res);
}

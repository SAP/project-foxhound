/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use core::ffi::c_int;
use core::ffi::c_void;
#[cfg(debug_assertions)]
use core::sync::atomic::AtomicBool;
use icu_collator::options::CaseLevel;
use icu_collator::options::CollatorOptions;
use icu_collator::options::Strength;
use icu_collator::preferences::CollationNumericOrdering;
use icu_collator::CollatorBorrowed;
use icu_collator::CollatorPreferences;
use icu_locale_core::locale;
use icu_locale_core::Locale;
use libsqlite3_sys::sqlite3;
use libsqlite3_sys::sqlite3_create_collation_v2;
use libsqlite3_sys::SQLITE_OK;
use libsqlite3_sys::SQLITE_UTF16_ALIGNED;
use libsqlite3_sys::SQLITE_UTF8;
use nsstring::nsACString;

#[cfg(debug_assertions)]
static mut INITIALIZED: AtomicBool = AtomicBool::new(false);

// The four collator configurations correspond to the four
// ECMA-402 sensitivities. See:
// https://docs.rs/icu_collator/latest/icu_collator/options/struct.CollatorOptions.html#ecma-402-sensitivity

/// ECMA-402 "base", i.e. primary
static mut BASE: Option<CollatorBorrowed> = None;

/// ECMA-402 "case", i.e. primary with case level turned on.
static mut CASE: Option<CollatorBorrowed> = None;

/// ECMA-402 "accent", i.e. secondary
static mut ACCENT: Option<CollatorBorrowed> = None;

/// ECMA-402 "variant", i.e. tertiary
static mut VARIANT: Option<CollatorBorrowed> = None;

/// ECMA-402 "base", i.e. primary, with numeric mode enabled.
static mut BASE_NUMERIC: Option<CollatorBorrowed> = None;

/// ECMA-402 "variant", i.e. tertiary, with numeric mode enabled.
static mut VARIANT_NUMERIC: Option<CollatorBorrowed> = None;

/// Initialization
///
/// Must be called exactly once before any of the other public
/// functions.
///
/// Takes the collation to be used as BCP47 string (`-u-co-`
/// extension is allowed).
///
/// # SAFETY
///
/// This function assigns to `static mut` variables. This is safe
/// on the assumption that this function is called once on app
/// startup before calling any of the other public functions.
///
/// (There is no need for a shutdown function for leak avoidance,
/// since the items written to `static mut` variables don't hold
/// heap allocations or other types of releasable resources.)
#[allow(static_mut_refs)]
#[no_mangle]
pub unsafe extern "C" fn mozilla_app_collator_glue_initialize(locale: *const nsACString) {
    // Yes, this outer cfg is really needed for this to compile without debug assertions!
    #[cfg(debug_assertions)]
    {
        debug_assert!(
            !INITIALIZED.swap(true, core::sync::atomic::Ordering::Relaxed),
            "Double initialization of the app collator"
        );
    }
    let mut prefs: CollatorPreferences = if let Ok(locale) = Locale::try_from_utf8(&*locale) {
        locale.into()
    } else {
        debug_assert!(
            false,
            "Bad locale identifier passed to mozilla_app_collator_glue_initialize"
        );
        // Fall back to root instead of crashing in release builds
        locale!("und").into()
    };
    // `unwrap` is OK below, because `CollatorBorrowed::try_new`` never
    // fails with properly-generated baked data.
    // See https://github.com/unicode-org/icu4x/issues/6634

    let mut options = CollatorOptions::default();

    // Tertiary is the default, but setting it explicitly for clarity.
    options.strength = Some(Strength::Tertiary);
    // SAFETY: See function doc about assigment to `static mut`.
    VARIANT = Some(CollatorBorrowed::try_new(prefs, options).unwrap());

    prefs.numeric_ordering = Some(CollationNumericOrdering::True);
    // SAFETY: See function doc about assigment to `static mut`.
    VARIANT_NUMERIC = Some(CollatorBorrowed::try_new(prefs, options).unwrap());
    prefs.numeric_ordering = None;

    options.strength = Some(Strength::Secondary);
    // SAFETY: See function doc about assigment to `static mut`.
    ACCENT = Some(CollatorBorrowed::try_new(prefs, options).unwrap());

    options.strength = Some(Strength::Primary);
    // SAFETY: See function doc about assigment to `static mut`.
    BASE = Some(CollatorBorrowed::try_new(prefs, options).unwrap());

    prefs.numeric_ordering = Some(CollationNumericOrdering::True);
    // SAFETY: See function doc about assigment to `static mut`.
    BASE_NUMERIC = Some(CollatorBorrowed::try_new(prefs, options).unwrap());
    prefs.numeric_ordering = None;

    options.case_level = Some(CaseLevel::On);
    // SAFETY: See function doc about assigment to `static mut`.
    CASE = Some(CollatorBorrowed::try_new(prefs, options).unwrap());
}

/// Installs mozStorage collation callbacks to an sqlite database.
///
/// # Safety
///
/// Takes pointers to `static mut` items, which is safe on the assumption
/// that `mozilla_app_collator_glue_initialize` has been called previously and
/// will not be called subsequently.
#[allow(static_mut_refs)]
#[no_mangle]
pub unsafe extern "C" fn mozilla_app_collator_glue_install_sqlite3_collation_callbacks(
    db: *mut sqlite3,
) -> c_int {
    // Yes, this outer cfg is really needed for this to compile without debug assertions!
    #[cfg(debug_assertions)]
    {
        debug_assert!(
            INITIALIZED.load(core::sync::atomic::Ordering::Relaxed),
            "App collator used before initialization"
        );
    }
    let mut r = sqlite3_create_collation_v2(
        db,
        c"locale".as_ptr(),
        SQLITE_UTF8,
        (BASE.as_ref().unwrap_unchecked() as *const CollatorBorrowed) as *mut c_void,
        Some(callback_compare_utf8),
        None,
    );
    if r != SQLITE_OK {
        return r;
    }
    r = sqlite3_create_collation_v2(
        db,
        c"locale_case_sensitive".as_ptr(),
        SQLITE_UTF8,
        (CASE.as_ref().unwrap_unchecked() as *const CollatorBorrowed) as *mut c_void,
        Some(callback_compare_utf8),
        None,
    );
    if r != SQLITE_OK {
        return r;
    }
    r = sqlite3_create_collation_v2(
        db,
        c"locale_accent_sensitive".as_ptr(),
        SQLITE_UTF8,
        (ACCENT.as_ref().unwrap_unchecked() as *const CollatorBorrowed) as *mut c_void,
        Some(callback_compare_utf8),
        None,
    );
    if r != SQLITE_OK {
        return r;
    }
    r = sqlite3_create_collation_v2(
        db,
        c"locale_case_accent_sensitive".as_ptr(),
        SQLITE_UTF8,
        (VARIANT.as_ref().unwrap_unchecked() as *const CollatorBorrowed) as *mut c_void,
        Some(callback_compare_utf8),
        None,
    );
    if r != SQLITE_OK {
        return r;
    }

    r = sqlite3_create_collation_v2(
        db,
        c"locale".as_ptr(),
        SQLITE_UTF16_ALIGNED,
        (BASE.as_ref().unwrap_unchecked() as *const CollatorBorrowed) as *mut c_void,
        Some(callback_compare_utf16),
        None,
    );
    if r != SQLITE_OK {
        return r;
    }
    r = sqlite3_create_collation_v2(
        db,
        c"locale_case_sensitive".as_ptr(),
        SQLITE_UTF16_ALIGNED,
        (CASE.as_ref().unwrap_unchecked() as *const CollatorBorrowed) as *mut c_void,
        Some(callback_compare_utf16),
        None,
    );
    if r != SQLITE_OK {
        return r;
    }
    r = sqlite3_create_collation_v2(
        db,
        c"locale_accent_sensitive".as_ptr(),
        SQLITE_UTF16_ALIGNED,
        (ACCENT.as_ref().unwrap_unchecked() as *const CollatorBorrowed) as *mut c_void,
        Some(callback_compare_utf16),
        None,
    );
    if r != SQLITE_OK {
        return r;
    }
    r = sqlite3_create_collation_v2(
        db,
        c"locale_case_accent_sensitive".as_ptr(),
        SQLITE_UTF16_ALIGNED,
        (VARIANT.as_ref().unwrap_unchecked() as *const CollatorBorrowed) as *mut c_void,
        Some(callback_compare_utf16),
        None,
    );
    if r != SQLITE_OK {
        return r;
    }
    SQLITE_OK
}

unsafe extern "C" fn callback_compare_utf8(
    collator: *mut c_void,
    left_len: c_int,
    left_ptr: *const c_void,
    right_len: c_int,
    right_ptr: *const c_void,
) -> c_int {
    let left = if !left_ptr.is_null() {
        core::slice::from_raw_parts(left_ptr as *const u8, left_len as usize)
    } else {
        b""
    };
    let right = if !right_ptr.is_null() {
        core::slice::from_raw_parts(right_ptr as *const u8, right_len as usize)
    } else {
        b""
    };
    (*(collator as *const CollatorBorrowed)).compare_utf8(left, right) as c_int
}

unsafe extern "C" fn callback_compare_utf16(
    collator: *mut c_void,
    left_byte_len: c_int,
    left_ptr: *const c_void,
    right_byte_len: c_int,
    right_ptr: *const c_void,
) -> c_int {
    let left = if !left_ptr.is_null() {
        core::slice::from_raw_parts(left_ptr as *const u16, (left_byte_len as usize) / 2)
    } else {
        &[]
    };
    let right = if !right_ptr.is_null() {
        core::slice::from_raw_parts(right_ptr as *const u16, (right_byte_len as usize) / 2)
    } else {
        &[]
    };
    (*(collator as *const CollatorBorrowed)).compare_utf16(left, right) as c_int
}

/// Compare known-well-formed UTF-8 on the variant sensitivity /
/// tertiary level that gives a consistent order to strings that have
/// user-visible differences (if base characters are equal,
/// accents and case break ties). The numeric mode is enabled
/// so that "10" compares greater than "2".
///
/// This corresponds to the defaults of the `Intl.Collator` API
/// plus the numeric mode enabled.
///
/// # Safety
///
/// Reads a `static mut` item, which is safe on the assumption that
/// `mozilla_app_collator_glue_initialize` has been called previously and
/// will not be called subsequently.
///
/// Note that we're relying on mozilla::Span to provide a non-null
/// pointer for empty spans, which works for now, but probably should
/// be changed on the mozilla::Span side eventually.
#[allow(static_mut_refs)]
pub fn compare(left: &str, right: &str) -> core::cmp::Ordering {
    // SAFETY: See the comment on the function.
    unsafe {
        // Yes, this outer cfg is really needed for this to compile without debug assertions!
        #[cfg(debug_assertions)]
        {
            debug_assert!(
                INITIALIZED.load(core::sync::atomic::Ordering::Relaxed),
                "App collator used before initialization"
            );
        }
        VARIANT_NUMERIC
            .as_ref()
            .unwrap_unchecked()
            .compare(left, right)
    }
}

/// Compare UTF-8 on the variant sensitivity / tertiary level
/// that gives a consistent order to strings that have
/// user-visible differences (if base characters are equal,
/// accents and case break ties). The numeric mode is enabled
/// so that "10" compares greater than "2".
///
/// This corresponds to the defaults of the `Intl.Collator` API
/// plus the numeric mode enabled.
///
/// UTF-8 errors are handled according to the Encoding Standard.
///
/// # Safety
///
/// Reads a `static mut` item, which is safe on the assumption that
/// `mozilla_app_collator_glue_initialize` has been called previously and
/// will not be called subsequently.
///
/// Note that we're relying on mozilla::Span to provide a non-null
/// pointer for empty spans, which works for now, but probably should
/// be changed on the mozilla::Span side eventually.
#[allow(static_mut_refs)]
#[no_mangle]
pub unsafe extern "C" fn mozilla_app_collator_compare_utf8(
    left: *const u8,
    left_len: usize,
    right: *const u8,
    right_len: usize,
) -> i32 {
    // Yes, this outer cfg is really needed for this to compile without debug assertions!
    #[cfg(debug_assertions)]
    {
        debug_assert!(
            INITIALIZED.load(core::sync::atomic::Ordering::Relaxed),
            "App collator used before initialization"
        );
    }
    VARIANT_NUMERIC.as_ref().unwrap_unchecked().compare_utf8(
        core::slice::from_raw_parts(left, left_len),
        core::slice::from_raw_parts(right, right_len),
    ) as i32
}

/// Compare UTF-16 on the variant sensitivity / tertiary level
/// that gives a consistent order to strings that have
/// user-visible differences (if base characters are equal,
/// accents and case break ties). The numeric mode is enabled
/// so that "10" compares greater than "2".
///
/// This corresponds to the defaults of the `Intl.Collator` API
/// plus the numeric mode enabled.
///
/// Unpaired surrogates are treated as the REPLACEMENT CHARACTER.
///
/// # Safety
///
/// Reads a `static mut` item, which is safe on the assumption that
/// `mozilla_app_collator_glue_initialize` has been called previously and
/// will not be called subsequently.
///
/// Note that we're relying on mozilla::Span to provide a non-null
/// pointer for empty spans, which works for now, but probably should
/// be changed on the mozilla::Span side eventually.
#[allow(static_mut_refs)]
#[no_mangle]
pub unsafe extern "C" fn mozilla_app_collator_compare_utf16(
    left: *const u16,
    left_len: usize,
    right: *const u16,
    right_len: usize,
) -> i32 {
    // Yes, this outer cfg is really needed for this to compile without debug assertions!
    #[cfg(debug_assertions)]
    {
        debug_assert!(
            INITIALIZED.load(core::sync::atomic::Ordering::Relaxed),
            "App collator used before initialization"
        );
    }
    VARIANT_NUMERIC.as_ref().unwrap_unchecked().compare_utf16(
        core::slice::from_raw_parts(left, left_len),
        core::slice::from_raw_parts(right, right_len),
    ) as i32
}

/// Compares UTF-8 strings on the base sensitivity / primary strength, which ignores accents and case.
/// The numeric mode is enabled so that "10" compares greater than "2".
///
/// Provided only for compat with existing code; you should probably use the variant / tertiary
/// function instead.
///
/// UTF-8 errors are handled according to the Encoding Standard.
///
/// # Safety
///
/// Reads a `static mut` item, which is safe on the assumption that
/// `mozilla_app_collator_glue_initialize` has been called previously and
/// will not be called subsequently.
///
/// Note that we're relying on mozilla::Span to provide a non-null
/// pointer for empty spans, which works for now, but probably should
/// be changed on the mozilla::Span side eventually.
#[allow(static_mut_refs)]
#[no_mangle]
pub unsafe extern "C" fn mozilla_app_collator_compare_base_utf8(
    left: *const u8,
    left_len: usize,
    right: *const u8,
    right_len: usize,
) -> i32 {
    // Yes, this outer cfg is really needed for this to compile without debug assertions!
    #[cfg(debug_assertions)]
    {
        debug_assert!(
            INITIALIZED.load(core::sync::atomic::Ordering::Relaxed),
            "App collator used before initialization"
        );
    }
    BASE_NUMERIC.as_ref().unwrap_unchecked().compare_utf8(
        core::slice::from_raw_parts(left, left_len),
        core::slice::from_raw_parts(right, right_len),
    ) as i32
}

/// Compares UTF-16 strings on the base sensitivity / primary strength, which ignores accents and case.
/// The numeric mode is enabled so that "10" compares greater than "2".
///
/// Provided only for compat with existing code; you should probably use the variant / tertiary
/// function instead.
///
/// Unpaired surrogates are treated as the REPLACEMENT CHARACTER.
///
/// # Safety
///
/// Reads a `static mut` item, which is safe on the assumption that
/// `mozilla_app_collator_glue_initialize` has been called previously and
/// will not be called subsequently.
///
/// Note that we're relying on mozilla::Span to provide a non-null
/// pointer for empty spans, which works for now, but probably should
/// be changed on the mozilla::Span side eventually.
#[allow(static_mut_refs)]
#[no_mangle]
pub unsafe extern "C" fn mozilla_app_collator_compare_base_utf16(
    left: *const u16,
    left_len: usize,
    right: *const u16,
    right_len: usize,
) -> i32 {
    // Yes, this outer cfg is really needed for this to compile without debug assertions!
    #[cfg(debug_assertions)]
    {
        debug_assert!(
            INITIALIZED.load(core::sync::atomic::Ordering::Relaxed),
            "App collator used before initialization"
        );
    }
    BASE_NUMERIC.as_ref().unwrap_unchecked().compare_utf16(
        core::slice::from_raw_parts(left, left_len),
        core::slice::from_raw_parts(right, right_len),
    ) as i32
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! Mocking utilities.
//!
//! Mock data is set on a per-thread basis. [`crate::std::thread`] handles this automatically for
//! scoped threads, and warns about creating threads otherwise (which won't be able to
//! automatically share mocked data, but it can be easily done with [`SharedMockData`] when
//! appropriate).
//!
//! Mock data is stored using type erasure, with a [`MockKey`] indexing arbitrary values. Use
//! [`mock_key!`] to define keys and the values to which they map. This approach was taken as a
//! matter of covenience for programmers, and the resulting creation and consumption APIs are
//! succinct yet extensible.
//!
//! Consumers should define keys (and expose them for mockers), and at runtime create a mock key
//! instance and call [`MockKey::get`] or [`MockKey::try_get`] to retrieve mocked values to use.
//!
//! Mockers should call [`builder`] to create a builder, [`set`](Builder::set) key/value mappings,
//! and call [`run`](Builder::run) to execute code with the mock data set.

use std::any::{Any, TypeId};
use std::collections::{hash_map::DefaultHasher, HashMap};
use std::hash::{Hash, Hasher};
use std::sync::atomic::{AtomicPtr, Ordering::Relaxed};

type MockDataMap = HashMap<Box<dyn MockKeyStored>, Box<dyn Any + Send + Sync>>;

thread_local! {
    static MOCK_DATA: AtomicPtr<MockDataMap> = Default::default();
}

/// A trait intended to be used as a trait object interface for mock keys.
pub trait MockKeyStored: Any + std::fmt::Debug + Sync {
    fn eq(&self, other: &dyn MockKeyStored) -> bool;
    fn hash(&self, state: &mut DefaultHasher);
}

impl PartialEq for dyn MockKeyStored {
    fn eq(&self, other: &Self) -> bool {
        MockKeyStored::eq(self, other)
    }
}

impl Eq for dyn MockKeyStored {}

impl Hash for dyn MockKeyStored {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.type_id().hash(state);
        let mut hasher = DefaultHasher::new();
        MockKeyStored::hash(self, &mut hasher);
        state.write_u64(hasher.finish());
    }
}

impl dyn MockKeyStored {
    pub fn downcast_ref<T: Any>(&self) -> Option<&T> {
        if self.type_id() == TypeId::of::<T>() {
            Some(unsafe { &*(self as *const _ as *const T) })
        } else {
            None
        }
    }
}

/// A type which can be used as a mock key.
pub trait MockKey: MockKeyStored + Sized {
    /// The value to which the key maps.
    type Value: Any + Send + Sync;

    /// Get the value set for this key, returning `None` if no data is set.
    fn try_get<F, R>(&self, f: F) -> Option<R>
    where
        F: FnOnce(&Self::Value) -> R,
    {
        MOCK_DATA.with(move |ptr| {
            let ptr = ptr.load(Relaxed);
            if ptr.is_null() {
                panic!("no mock data set");
            }
            unsafe { &*ptr }
                .get(self as &dyn MockKeyStored)
                .and_then(move |b| b.downcast_ref())
                .map(f)
        })
    }

    /// Get the value set for this key.
    ///
    /// Panics if no mock data is set for the key.
    fn get<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&Self::Value) -> R,
    {
        match self.try_get(f) {
            Some(v) => v,
            None => panic!("mock data for {self:?} not set"),
        }
    }
}

/// Mock data which can be shared amongst threads.
pub struct SharedMockData(AtomicPtr<MockDataMap>);

impl Clone for SharedMockData {
    fn clone(&self) -> Self {
        SharedMockData(AtomicPtr::new(self.0.load(Relaxed)))
    }
}

impl SharedMockData {
    /// Create a `SharedMockData` which stores the mock data from the current thread.
    pub fn new() -> Self {
        MOCK_DATA.with(|ptr| SharedMockData(AtomicPtr::new(ptr.load(Relaxed))))
    }

    /// Set the mock data on the current thread.
    ///
    /// # Safety
    /// Callers must ensure that the mock data outlives the lifetime of the thread.
    pub unsafe fn set(self) {
        MOCK_DATA.with(|ptr| ptr.store(self.0.into_inner(), Relaxed));
    }
}

/// Create a mock builder, which allows adding mock data and running functions under that mock
/// environment.
pub fn builder() -> Builder {
    Builder::new()
}

/// A mock data builder.
#[derive(Default)]
pub struct Builder {
    data: MockDataMap,
}

impl Builder {
    /// Create a new, empty builder.
    pub fn new() -> Self {
        Default::default()
    }

    /// Set a mock data key/value mapping.
    pub fn set<K: MockKey>(&mut self, key: K, value: K::Value) -> &mut Self {
        self.data.insert(Box::new(key), Box::new(value));
        self
    }

    /// Run the given function with mock data set.
    pub fn run<F, R>(&mut self, f: F) -> R
    where
        F: FnOnce() -> R,
    {
        MOCK_DATA.with(|ptr| ptr.store(&mut self.data, Relaxed));
        let ret = f();
        MOCK_DATA.with(|ptr| ptr.store(std::ptr::null_mut(), Relaxed));
        ret
    }
}

/// A general-purpose [`MockKey`] keyed by an identifier string and the stored type.
///
/// Use [`hook`] or [`try_hook`] in code accessing the values.
pub struct MockHook<T> {
    name: &'static str,
    _p: std::marker::PhantomData<fn() -> T>,
}

impl<T> std::fmt::Debug for MockHook<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        f.debug_struct(&format!("MockHook<{}>", std::any::type_name::<T>()))
            .field("name", &self.name)
            .finish()
    }
}

impl<T: 'static> MockKeyStored for MockHook<T> {
    fn eq(&self, other: &dyn MockKeyStored) -> bool {
        std::any::TypeId::of::<Self>() == other.type_id()
            && self.name == other.downcast_ref::<Self>().unwrap().name
    }
    fn hash(&self, state: &mut DefaultHasher) {
        self.name.hash(state)
    }
}

impl<T: Any + Send + Sync + 'static> MockKey for MockHook<T> {
    type Value = T;
}

impl<T> MockHook<T> {
    /// Create a new mock hook key with the given name.
    pub fn new(name: &'static str) -> Self {
        MockHook {
            name,
            _p: Default::default(),
        }
    }
}

/// Create a mock hook with the given name. When mocking isn't enabled, the given value will be
/// used instead. Panics if the hook isn't set.
pub fn hook<T: Any + Send + Sync + Clone>(_normally: T, name: &'static str) -> T {
    MockHook::new(name).get(|v: &T| v.clone())
}

/// Create a mock hook with the given name. When mocking isn't enabled or the hook hasn't been set,
/// the given value will be used instead.
pub fn try_hook<T: Any + Send + Sync + Clone>(fallback: T, name: &'static str) -> T {
    MockHook::new(name)
        .try_get(|v: &T| v.clone())
        .unwrap_or(fallback)
}

/// Create a mock key with an associated value type.
///
/// Supports the following syntaxes:
/// * Unit struct: `<visibility> struct NAME => VALUE_TYPE`
/// * Tuple struct: `<visibility> struct NAME(ITEMS) => VALUE_TYPE`
/// * Normal struct: `<visibility> struct NAME { FIELDS } => VALUE_TYPE`
macro_rules! mock_key {
    ( $vis:vis struct $name:ident => $value:ty ) => {
        $crate::std::mock::mock_key! { @structdef[$vis struct $name;] $name $value }
    };
    ( $vis:vis struct $name:ident ($($tuple:tt)*) => $value:ty ) => {
        $crate::std::mock::mock_key! { @structdef[$vis struct $name($($tuple)*);] $name $value }
    };
    ( $vis:vis struct $name:ident {$($full:tt)*} => $value:ty ) => {
        $crate::std::mock::mock_key! { @structdef[$vis struct $name{$($full)*}] $name $value }
    };
    ( @structdef [$($def:tt)+] $name:ident $value:ty ) => {
        #[derive(Debug, PartialEq, Eq, Hash)]
        $($def)+

        impl crate::std::mock::MockKeyStored for $name {
            fn eq(&self, other: &dyn crate::std::mock::MockKeyStored) -> bool {
                std::any::TypeId::of::<Self>() == other.type_id()
                    && PartialEq::eq(self, other.downcast_ref::<Self>().unwrap())
            }

            fn hash(&self, state: &mut std::collections::hash_map::DefaultHasher) {
                std::hash::Hash::hash(self, state)
            }
        }

        impl crate::std::mock::MockKey for $name {
            type Value = $value;
        }
    }
}

pub(crate) use mock_key;

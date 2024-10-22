/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//! Registered custom properties.

use super::rule::{Inherits, InitialValue, PropertyRuleName};
use super::syntax::Descriptor;
use crate::selector_map::PrecomputedHashMap;
use crate::stylesheets::UrlExtraData;
use crate::Atom;
use cssparser::SourceLocation;

/// The metadata of a custom property registration that we need to do the cascade properly.
#[derive(Debug, Clone, MallocSizeOf)]
pub struct PropertyRegistrationData {
    /// The syntax of the property.
    pub syntax: Descriptor,
    /// Whether the property inherits.
    pub inherits: Inherits,
    /// The initial value. Only missing for universal syntax.
    #[ignore_malloc_size_of = "Arc"]
    pub initial_value: Option<InitialValue>,
}

static UNREGISTERED: PropertyRegistrationData = PropertyRegistrationData {
    syntax: Descriptor::universal(),
    inherits: Inherits::True,
    initial_value: None,
};

impl PropertyRegistrationData {
    /// The data for an unregistered property.
    pub fn unregistered() -> &'static Self {
        &UNREGISTERED
    }

    /// Returns whether this property inherits.
    #[inline]
    pub fn inherits(&self) -> bool {
        self.inherits == Inherits::True
    }
}

/// A computed, already-validated property registration.
/// <https://drafts.css-houdini.org/css-properties-values-api-1/#custom-property-registration>
#[derive(Debug, Clone, MallocSizeOf)]
pub struct PropertyRegistration {
    /// The custom property name.
    pub name: PropertyRuleName,
    /// The actual information about the property.
    pub data: PropertyRegistrationData,
    /// The url data that is used to parse and compute the registration's initial value. Note that
    /// it's not the url data that should be used to parse other values. Other values should use
    /// the data of the style sheet where they came from.
    pub url_data: UrlExtraData,
    /// The source location of this registration, if it comes from a CSS rule.
    pub source_location: SourceLocation,
}

impl PropertyRegistration {
    /// Returns whether this property inherits.
    #[inline]
    pub fn inherits(&self) -> bool {
        self.data.inherits == Inherits::True
    }
}

/// The script registry of custom properties.
/// <https://drafts.css-houdini.org/css-properties-values-api-1/#dom-window-registeredpropertyset-slot>
#[derive(Default)]
pub struct ScriptRegistry {
    properties: PrecomputedHashMap<Atom, PropertyRegistration>,
}

impl ScriptRegistry {
    /// Gets an already-registered custom property via script.
    #[inline]
    pub fn get(&self, name: &Atom) -> Option<&PropertyRegistration> {
        self.properties.get(name)
    }

    /// Gets already-registered custom properties via script.
    #[inline]
    pub fn properties(&self) -> &PrecomputedHashMap<Atom, PropertyRegistration> {
        &self.properties
    }

    /// Register a given property. As per
    /// <https://drafts.css-houdini.org/css-properties-values-api-1/#the-registerproperty-function>
    /// we don't allow overriding the registration.
    #[inline]
    pub fn register(&mut self, registration: PropertyRegistration) {
        let name = registration.name.0.clone();
        let old = self.properties.insert(name, registration);
        debug_assert!(old.is_none(), "Already registered? Should be an error");
    }

    /// Returns the properties hashmap.
    #[inline]
    pub fn get_all(&self) -> &PrecomputedHashMap<Atom, PropertyRegistration> {
        &self.properties
    }
}

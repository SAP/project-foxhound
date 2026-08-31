/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.address.utils

import mozilla.components.concept.storage.Address

internal fun generateAddress(
    name: String = "Firefox The Browser",
    organization: String = "Mozilla",
    streetAddress: String = "street",
    addressLevel3: String = "3",
    addressLevel2: String = "2",
    addressLevel1: String = "1",
    postalCode: String = "code",
    country: String = "country",
    tel: String = "tel",
    email: String = "email",
) = Address(
    guid = "",
    name = name,
    organization = organization,
    streetAddress = streetAddress,
    addressLevel3 = addressLevel3,
    addressLevel2 = addressLevel2,
    addressLevel1 = addressLevel1,
    postalCode = postalCode,
    country = country,
    tel = tel,
    email = email,
    timeCreated = 1,
    timeLastUsed = 1,
    timeLastModified = 1,
    timesUsed = 1,
)

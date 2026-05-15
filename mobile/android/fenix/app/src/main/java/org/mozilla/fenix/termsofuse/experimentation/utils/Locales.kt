/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.experimentation.utils

import org.mozilla.fenix.utils.Locale

/**
 * List of supported locales (language/region) for sponsored shortcuts/tiles (Top Sites).
 */
internal val supportedSponsoredShortcutsLocales = listOf(
    Locale.Austria,
    Locale.BelgiumGerman,
    Locale.BelgiumFrench,
    Locale.Bulgaria,
    Locale.Canada,
    Locale.Croatia,
    Locale.CyprusGreek,
    Locale.CyprusTurkish,
    Locale.Czechia,
    Locale.Denmark,
    Locale.Estonia,
    Locale.FinlandFinnish,
    Locale.FinlandSwedish,
    Locale.France,
    Locale.Germany,
    Locale.Greece,
    Locale.Hungary,
    Locale.Iceland,
    Locale.Ireland,
    Locale.Latvia,
    Locale.Lithuania,
    Locale.Japan,
    Locale.Malta,
    Locale.Netherlands,
    Locale.NewZealand,
    Locale.Norway,
    Locale.Poland,
    Locale.Portugal,
    Locale.Romania,
    Locale.Singapore,
    Locale.Slovakia,
    Locale.Spain,
    Locale.Sweden,
    Locale.Switzerland,
    Locale.UnitedKingdom,
    Locale.UnitedStates,
).map { it.localeCode }

/**
 * List of supported locales (language/region) for sponsored stories.
 */
internal val supportedSponsoredStoriesLocales = listOf(
    Locale.UnitedStates,
    Locale.Canada,
).map { it.localeCode }

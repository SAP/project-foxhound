/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.util

import java.util.IllformedLocaleException
import java.util.Locale
import java.util.MissingResourceException

// Built once on first access. ~250 entries; subsequent lookups are O(1).
private val iso3ToIso2: Map<String, String> by lazy {
    buildMap {
        for (iso2 in Locale.getISOCountries()) {
            try {
                val iso3 = Locale.Builder().setRegion(iso2).build().isO3Country
                if (iso3.isNotEmpty()) put(iso3.uppercase(Locale.ROOT), iso2)
            } catch (_: MissingResourceException) {
                // Region has no ISO3 mapping; skip.
            }
        }
    }
}

// FIFA three-letter codes that diverge from the ISO 3166-1 alpha-3 standard.
internal val fifaToIso3: Map<String, String> = mapOf(
    "ALG" to "DZA",
    "CRO" to "HRV",
    "GER" to "DEU",
    "HAI" to "HTI",
    "KSA" to "SAU",
    "NED" to "NLD",
    "PAR" to "PRY",
    "POR" to "PRT",
    "RSA" to "ZAF",
    "SUI" to "CHE",
    "URU" to "URY",
)

/**
 * Reverse lookup used to normalize team keys returned by the API (which uses
 * ISO 3166-1 alpha-3) into the FIFA codes our [org.mozilla.fenix.home.sports.regionGrouping]
 * is keyed by.
 *
 * Also covers keys returned by the API that aren't standard ISO3 — currently "CVI" for Cabo Verde, and CDR for Congo,
 * instead of the standard "CPV" and "COD".
 */
internal val apiKeyToFifa: Map<String, String> = buildMap {
    fifaToIso3.forEach { (fifa, iso3) -> put(iso3, fifa) }
    put("CVI", "CPV")
    put("CDR", "COD")
}

/**
 * Resolves an ISO 3166-1 alpha-3 region code (or known FIFA alias) to a country
 * name localized to [locale]. Falls back to [code] when no match exists — e.g. UK
 * constituent codes like "ENG" and "SCO" that have no ISO country equivalent.
 */
fun localizedCountryName(code: String, locale: Locale = Locale.getDefault()): String {
    val iso3 = fifaToIso3[code.uppercase(Locale.ROOT)] ?: code
    val iso2 = iso3ToIso2[iso3.uppercase(Locale.ROOT)] ?: return code
    return try {
        Locale.Builder().setRegion(iso2).build().getDisplayCountry(locale)
    } catch (e: IllformedLocaleException) {
        code
    } catch (e: MissingResourceException) {
        code
    }
}

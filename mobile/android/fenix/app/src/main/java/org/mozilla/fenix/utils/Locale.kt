/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

/**
 * Enum representing various locales (language–region).
 * Country-only names are used when there is a single locale per country in this list.
 * For countries with multiple locales, the language is appended to the country name.
 */
internal enum class Locale(val localeCode: String) {
    // Austria
    Austria("de-AT"),

    // Belgium (multiple)
    BelgiumGerman("de-BE"),
    BelgiumFrench("fr-BE"),

    // Bulgaria
    Bulgaria("bg-BG"),

    // Canada
    Canada("en-CA"),

    // Croatia
    Croatia("hr-HR"),

    // Cyprus (multiple)
    CyprusGreek("el-CY"),
    CyprusTurkish("tr-CY"),

    // Czechia
    Czechia("cs-CZ"),

    // Denmark
    Denmark("da-DK"),

    // Estonia
    Estonia("et-EE"),

    // Finland (multiple)
    FinlandFinnish("fi-FI"),
    FinlandSwedish("sv-FI"),

    // France
    France("fr-FR"),

    // Germany
    Germany("de-DE"),

    // Greece
    Greece("el-GR"),

    // Hungary
    Hungary("hu-HU"),

    // Iceland
    Iceland("is-IS"),

    // Ireland
    Ireland("en-IE"),

    // Latvia
    Latvia("lv-LV"),

    // Lithuania
    Lithuania("lt-LT"),

    // Japan
    Japan("ja-JP"),

    // Malta
    Malta("mt-MT"),

    // Netherlands
    Netherlands("nl-NL"),

    // New Zealand
    NewZealand("en-NZ"),

    // Norway
    Norway("nb-NO"),

    // Poland
    Poland("pl-PL"),

    // Portugal
    Portugal("pt-PT"),

    // Romania
    Romania("ro-RO"),

    // Singapore
    Singapore("en-SG"),

    // Slovakia
    Slovakia("sk-SK"),

    // Spain
    Spain("es-ES"),

    // Sweden
    Sweden("sv-SE"),

    // Switzerland
    Switzerland("de-CH"),

    // United Kingdom
    UnitedKingdom("en-GB"),

    // United States
    UnitedStates("en-US"),
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.addons

/**
 * A contract that indicate how an add-on provider must behave.
 */
interface AddonsProvider {

    /**
     * Provides a list of all featured add-ons, which are add-ons we list in the add-ons manager UI
     * by default (e.g. the add-ons that are available for the app or a set of curated add-ons).
     *
     * @param allowCache whether or not the result may be provided from a previously cached response,
     * defaults to true.
     * @param readTimeoutInSeconds optional timeout in seconds to use when fetching featured add-ons.
     * @param language indicates in which language the translatable fields should be in, if no
     * matching language is found then a fallback translation is returned using the default language.
     * When it is null all translations available will be returned.
     */
    suspend fun getFeaturedAddons(
        allowCache: Boolean = true,
        readTimeoutInSeconds: Long? = null,
        language: String? = null,
    ): List<Addon>

    /**
     * Interacts with the AMO search endpoint to get an addon based on any of its identifier.
     *
     * See: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#search
     *
     * @param id of the addon for which to get the download URL.
     * Can be an addon's ID, GUID, or other unique identifier.
     * @param readTimeoutInSeconds optional timeout in seconds to use when fetching the add-ons.
     * @param language indicates in which language the translatable fields should be in, if no
     * matching language is found then a fallback translation is returned using the default language.
     * When it is null all translations available will be returned.
     *
     * @return an [Addon] configuration if it was successfully downloaded or null otherwise.
     */
    suspend fun getAddonByID(
        id: String,
        readTimeoutInSeconds: Long? = null,
        language: String? = null,
    ): Addon?
}

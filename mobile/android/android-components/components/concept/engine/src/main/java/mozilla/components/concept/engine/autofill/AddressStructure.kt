/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.autofill

/**
 * Represents the visual structure of an address.
 */
data class AddressStructure(val fields: List<Field>) {
    /**
     * Represents a single field in an [AddressStructure]
     */
    sealed class Field {
        abstract val id: ID
        abstract val localizationKey: LocalizationKey

        /**
         * Represents the ID of a [Field]. This ID maps 1:1 to a property on [Address].
         */
        sealed class ID(val id: String) {

            /**
             * ID representing the Name property
             **/
            object Name : ID("name")

            /**
             * ID representing the Organization property
             **/
            object Organization : ID("organization")

            /**
             * ID representing the StreetAddress property
             **/
            object StreetAddress : ID("street-address")

            /**
             * ID representing the AddressLevel1 property
             **/
            object AddressLevel1 : ID("address-level1")

            /**
             * ID representing the AddressLevel2 property
             **/
            object AddressLevel2 : ID("address-level2")

            /**
             * ID representing the AddressLevel3 property
             **/
            object AddressLevel3 : ID("address-level3")

            /**
             * ID representing the PostalCode property
             **/
            object PostalCode : ID("postal-code")

            /**
             * ID representing the Country property
             **/
            object Country : ID("country")

            /**
             * ID representing the Tel property
             **/
            object Tel : ID("tel")

            /**
             * ID representing the Email property
             **/
            object Email : ID("email")

            /**
             * ID representing an unknown property
             **/
            data class Unknown(val value: String) : ID(value)

            /**
             * Companion object for ID
             */
            companion object {
                /**
                 * Retrieve an ID with a string
                 *
                 * @param key used to lookup an ID.
                 */
                fun from(key: String) = when (key) {
                    "name" -> Name
                    "organization" -> Organization
                    "street-address" -> StreetAddress
                    "address-level1" -> AddressLevel1
                    "address-level2" -> AddressLevel2
                    "address-level3" -> AddressLevel3
                    "postal-code" -> PostalCode
                    "country" -> Country
                    "tel" -> Tel
                    "email" -> Email
                    else -> Unknown(key)
                }
            }
        }

        /**
         * Represents the localizationKey of a [Field]. This is used to lookup a user facing string
         * in the client.
         */
        sealed class LocalizationKey(val key: String) {

            /**
             * Localization Key for Name
             **/
            object Name : LocalizationKey("autofill-address-name")

            /**
             * Localization Key for Organization
             **/
            object Organization : LocalizationKey("autofill-address-organization")

            /**
             * Localization Key for StreetAddress
             **/
            object StreetAddress : LocalizationKey("autofill-address-street-address")

            /**
             * Localization Key for Street
             **/
            object Street : LocalizationKey("autofill-address-street")

            /**
             * Localization Key for Neighborhood
             **/
            object Neighborhood : LocalizationKey("autofill-address-neighborhood")

            /**
             * Localization Key for VillageTownship
             **/
            object VillageTownship : LocalizationKey("autofill-address-village-township")

            /**
             * Localization Key for Island
             **/
            object Island : LocalizationKey("autofill-address-island")

            /**
             * Localization Key for Townland
             **/
            object Townland : LocalizationKey("autofill-address-townland")

            /**
             * Localization Key for City
             **/
            object City : LocalizationKey("autofill-address-city")

            /**
             * Localization Key for District
             **/
            object District : LocalizationKey("autofill-address-district")

            /**
             * Localization Key for PostTown
             **/
            object PostTown : LocalizationKey("autofill-address-post-town")

            /**
             * Localization Key for Suburb
             **/
            object Suburb : LocalizationKey("autofill-address-suburb")

            /**
             * Localization Key for Province
             **/
            object Province : LocalizationKey("autofill-address-province")

            /**
             * Localization Key for State
             **/
            object State : LocalizationKey("autofill-address-state")

            /**
             * Localization Key for County
             **/
            object County : LocalizationKey("autofill-address-county")

            /**
             * Localization Key for Parish
             **/
            object Parish : LocalizationKey("autofill-address-parish")

            /**
             * Localization Key for Prefecture
             **/
            object Prefecture : LocalizationKey("autofill-address-prefecture")

            /**
             * Localization Key for Area
             **/
            object Area : LocalizationKey("autofill-address-area")

            /**
             * Localization Key for DoSi
             **/
            object DoSi : LocalizationKey("autofill-address-do-si")

            /**
             * Localization Key for Department
             **/
            object Department : LocalizationKey("autofill-address-department")

            /**
             * Localization Key for Emirate
             **/
            object Emirate : LocalizationKey("autofill-address-emirate")

            /**
             * Localization Key for Oblast
             **/
            object Oblast : LocalizationKey("autofill-address-oblast")

            /**
             * Localization Key for Pin
             **/
            object Pin : LocalizationKey("autofill-address-pin")

            /**
             * Localization Key for PostalCode
             **/
            object PostalCode : LocalizationKey("autofill-address-postal-code")

            /**
             * Localization Key for Zip
             **/
            object Zip : LocalizationKey("autofill-address-zip")

            /**
             * Localization Key for Eircode
             **/
            object Eircode : LocalizationKey("autofill-address-eircode")

            /**
             * Localization Key for Country
             **/
            object Country : LocalizationKey("autofill-address-country")

            /**
             * Localization Key for CountryOnly
             **/
            object CountryOnly : LocalizationKey("autofill-address-country-only")

            /**
             * Localization Key for Tel
             **/
            object Tel : LocalizationKey("autofill-address-tel")

            /**
             * Localization Key for Email
             **/
            object Email : LocalizationKey("autofill-address-email")

            /**
             * Unknown Localization Key
             **/
            data class Unknown(val value: String) : LocalizationKey(value)

            /**
             * Companion object for LocalizationKey
             */
            companion object {
                /**
                 * Retrieve a [LocalizationKey] with a string
                 *
                 * @param key used to lookup a [LocalizationKey].
                 */
                fun from(key: String) = when (key) {
                    "autofill-address-name" -> Name
                    "autofill-address-organization" -> Organization
                    "autofill-address-street-address" -> StreetAddress
                    "autofill-address-street" -> Street
                    "autofill-address-neighborhood" -> Neighborhood
                    "autofill-address-village-township" -> VillageTownship
                    "autofill-address-island" -> Island
                    "autofill-address-townland" -> Townland
                    "autofill-address-city" -> City
                    "autofill-address-district" -> District
                    "autofill-address-post-town" -> PostTown
                    "autofill-address-suburb" -> Suburb
                    "autofill-address-province" -> Province
                    "autofill-address-state" -> State
                    "autofill-address-county" -> County
                    "autofill-address-parish" -> Parish
                    "autofill-address-prefecture" -> Prefecture
                    "autofill-address-area" -> Area
                    "autofill-address-do-si" -> DoSi
                    "autofill-address-department" -> Department
                    "autofill-address-emirate" -> Emirate
                    "autofill-address-oblast" -> Oblast
                    "autofill-address-pin" -> Pin
                    "autofill-address-postal-code" -> PostalCode
                    "autofill-address-zip" -> Zip
                    "autofill-address-eircode" -> Eircode
                    "autofill-address-country" -> Country
                    "autofill-address-country-only" -> CountryOnly
                    "autofill-address-tel" -> Tel
                    "autofill-address-email" -> Email
                    else -> Unknown(key)
                }
            }
        }

        /**
         * Text input address field
         */
        data class TextField(
            override val id: ID,
            override val localizationKey: LocalizationKey,
        ) : Field()

        /**
         * Select address field
         *
         * @param id Identifier for the field. Used to map this to the right prompt value
         * @param localizationKey key used to lookup the displayable string for this field.
         * @param defaultSelectionKey The key for the default value. Ideally this key would be represented in [options].
         * @param options List of [Option] options that the selector field represents.
         */
        data class SelectField(
            override val id: ID,
            override val localizationKey: LocalizationKey,
            val defaultSelectionKey: String,
            val options: List<Option>,
        ) : Field() {
            /**
             * An option item of a [SelectField]
             *
             * @param key The key to identify the elements
             * @param value The value if the address field option
             */
            data class Option(val key: String, val value: String)
        }
    }
}

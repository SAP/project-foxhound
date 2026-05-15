# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

## The address and credit card autofill management dialog in browser preferences

autofill-manage-addresses-title = Saved addresses
autofill-manage-addresses-list-header = Addresses

autofill-manage-payment-methods-title = Saved payment methods
autofill-manage-cards-list-header = Cards

autofill-manage-dialog =
    .style = min-width: 560px
autofill-manage-remove-button = Remove
autofill-manage-add-button = Add…
autofill-manage-edit-button = Edit…

## The address capture doorhanger

address-capture-save-doorhanger-header = Save address?
address-capture-save-doorhanger-description = Save info to { -brand-short-name } so you can fill out forms quickly.
address-capture-update-doorhanger-header = Update address?
address-capture-edit-doorhanger-header = Edit address

address-capture-save-button =
    .label = Save
    .accessKey = S
address-capture-not-now-button =
    .label = Not now
    .accessKey = N
address-capture-cancel-button =
    .label = Cancel
    .accessKey = C
address-capture-update-button =
    .label = Update
    .accessKey = U
address-capture-manage-address-button =
    .label = Address settings
address-capture-learn-more-button =
    .label = Learn more
address-capture-open-menu-button =
    .aria-label = Open menu
address-capture-edit-address-button =
    .aria-label = Edit address


# The dialog title for creating addresses in browser preferences.
autofill-add-address-title = Add address
# The dialog title for editing addresses in browser preferences.
autofill-edit-address-title = Edit address

## Labels for address fields (e.g. for a mailing address) used as part of the form
## autofill feature. For more information on the address structure (e.g. levels),
## see also https://developers.google.com/maps/documentation/javascript/geocoding

autofill-address-name = Name
autofill-address-organization = Organization
autofill-address-street-address = Street Address

autofill-address-street = Street Address

# Used in Iran (IR), Mexico (MX) as sublocality (civil entity below a locality, e.g. within a city).
autofill-address-neighborhood = Neighborhood
# Used in Malaysia (MY) as sublocality (civil entity below a locality, e.g. within a city).
autofill-address-village-township = Village or Township
autofill-address-island = Island
# Used in Ireland (IE) as sublocality (civil entity below a locality, e.g. within a city).
autofill-address-townland = Townland

autofill-address-city = City
# Used in Hong Kong (HK), Sudan (SD), Syria (SY), Türkiye (TR) as as secondary address information (2 levels below the country level).
# Used in Korea as sublocality (civil entity below a locality, e.g. within a city).
autofill-address-district = District
# Used in United Kingdom (GB), Norway (NO), Sweden (SE) as as secondary address information (2 levels below the country level).
autofill-address-post-town = Post town
# Used in Australia (AU) as as secondary address information (below the country level).
# Used for international addresses as sublocality (civil entity below a locality, e.g. within a city).
autofill-address-suburb = Suburb

autofill-address-province = Province
autofill-address-state = State
autofill-address-county = County
# Used in Barbados (BB), Jamaica (JM) as primary address information (1 level below the country level).
autofill-address-parish = Parish
# Used in Japan (JP) as primary address information (1 level below the country level).
autofill-address-prefecture = Prefecture
# Used in Honk Kong (HK) as primary address information (1 level below the country level).
autofill-address-area = Area
# Used in Korea (KO) as primary address information (1 level below the country level).
autofill-address-do-si = Do/Si
# Used in Nicaragua (NI), Colombia (CO) as primary address information (1 level below the country level).
autofill-address-department = Department
# Used in United Arab Emirates (AE) as primary address information (1 level below the country level).
autofill-address-emirate = Emirate
# Used in Russia (RU), Ukraine (UA) as primary address information (1 level below the country level).
autofill-address-oblast = Oblast

# Postal code field used in India (IN).
autofill-address-pin = Pin
autofill-address-postal-code = Postal Code
# Postal code field.
autofill-address-zip = ZIP Code
# Postal code field used in Ireland (IE).
autofill-address-eircode = Eircode

autofill-address-country = Country or Region
autofill-address-country-only = Country

##

autofill-address-tel = Phone
autofill-address-email = Email

autofill-cancel-button = Cancel
autofill-save-button = Save
autofill-country-warning-message = Form Autofill is currently available only for certain countries.
autofill-message-tooltip = View message about autofill

# The dialog title for creating credit cards in browser preferences.
autofill-add-card-title = Add card
# The dialog title for editing credit cards in browser preferences.
autofill-edit-card-title2 = Edit card

autofill-card-number = Card Number
autofill-card-invalid-number = Please enter a valid card number
autofill-card-name-on-card = Name on Card
autofill-card-expires-month = Exp. Month
autofill-card-expires-year = Exp. Year
autofill-card-billing-address = Billing Address
autofill-card-network = Card Type

# This string is never actually displayed, but is used to make it easier to
# find the payment methods section of about:settings via the search input. It's
# simply a comma separated list of additional search keywords for the payment
# methods section. Localizers should choose terms that make sense for payment
# methods in their region.
autofill-card-search-term-credit-cards = credit cards, credit, cards, debit cards, debit, wallet, checkout

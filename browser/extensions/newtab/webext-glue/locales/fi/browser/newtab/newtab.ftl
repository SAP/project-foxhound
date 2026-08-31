# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Uusi välilehti
newtab-settings-button =
    .title = Muokkaa Uusi välilehti -sivua
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Mukauta tätä sivua
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Mukauta
newtab-customize-panel-label =
    .label = Mukauta
newtab-personalize-settings-icon-label =
    .title = Mukauta uutta välilehteä
    .aria-label = Asetukset
newtab-settings-dialog-label =
    .aria-label = Asetukset
newtab-personalize-icon-label =
    .title = Muokkaa uutta välilehteä
    .aria-label = Muokkaa uutta välilehteä
newtab-personalize-dialog-label =
    .aria-label = Muokkaa
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Hylkää
    .aria-label = Hylkää

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Etusivu
home-homepage-new-windows =
    .label = Uudet ikkunat
home-homepage-new-tabs =
    .label = Uudet välilehdet
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Valitse tietty sivusto

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Verkkosivuston tai -sivustojen osoitteet
home-custom-homepage-address =
    .placeholder = Kirjoita osoite
home-custom-homepage-address-button =
    .label = Lisää osoite
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Ei vielä lisättyjä verkkosivustoja.
home-custom-homepage-delete-address-button =
    .aria-label = Poista osoite
    .title = Poista osoite
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Korvaa käyttäen
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = nyt avoinna olevia sivuja
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Kirjanmerkit…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Haku
home-prefs-stories-header2 =
    .label = Tarinat
    .description = Poikkeuksellista { -brand-product-name }-perheen kuratoimaa sisältöä
home-prefs-widgets-header =
    .label = Widgetit
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listat
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Ajastin
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Urheilu
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Kello
home-prefs-mission-message2 =
    .message = Sponsorimme tukevat tehtäväämme rakentaa parempaa Internetiä.
home-prefs-manage-topics-link2 =
    .label = Hallinnoi aiheita
home-prefs-choose-wallpaper-link2 =
    .label = Valitse taustakuva
home-prefs-firefox-logo-header =
    .label = { -brand-short-name }in logo
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Käyttääksesi näitä ominaisuuksia, aseta uudet välilehdet tai uudet ikkunat { -firefox-home-brand-name }iin.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } rivi
           *[other] { $num } riviä
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Laajennus ({ $extension })
home-restore-defaults-srd =
    .label = Palauta oletukset
    .accesskey = P
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Oletus)
home-mode-choice-custom-srd =
    .label = Omat osoitteet…
home-mode-choice-blank-srd =
    .label = Tyhjä sivu
home-prefs-shortcuts-header-srd =
    .label = Oikotiet
home-prefs-shortcuts-select =
    .aria-label = Oikotiet
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponsoroidut oikotiet
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponsoroidut tarinat
home-prefs-highlights-option-visited-pages-srd =
    .label = Vieraillut sivustot
home-prefs-highlights-options-bookmarks-srd =
    .label = Kirjanmerkit
home-prefs-highlights-option-most-recent-download-srd =
    .label = Viimeisimmät lataukset
home-prefs-recent-activity-header-srd =
    .label = Viimeisin toiminta
home-prefs-recent-activity-select =
    .aria-label = Viimeisin toiminta
home-prefs-weather-header-srd =
    .label = Sää
home-prefs-support-firefox-header-srd =
    .label = Tue { -brand-product-name }ia
home-prefs-mission-message-learn-more-link-srd = Lue lisää

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Haku
    .aria-label = Haku
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Hae hakukoneella { $engine } tai kirjoita osoite
newtab-search-box-handoff-text-no-engine = Kirjoita osoite tai hakusana
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Hae hakukoneella { $engine } tai kirjoita osoite
    .title = Hae hakukoneella { $engine } tai kirjoita osoite
    .aria-label = Hae hakukoneella { $engine } tai kirjoita osoite
newtab-search-box-handoff-input-no-engine =
    .placeholder = Kirjoita osoite tai hakusana
    .title = Kirjoita osoite tai hakusana
    .aria-label = Kirjoita osoite tai hakusana
newtab-search-box-text = Verkkohaku
newtab-search-box-input =
    .placeholder = Verkkohaku
    .aria-label = Verkkohaku

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Lisää hakukone
newtab-topsites-add-shortcut-header = Uusi oikotie
newtab-topsites-edit-topsites-header = Muokkaa ykkössivustoa
newtab-topsites-edit-shortcut-header = Muokkaa oikotietä
newtab-topsites-add-shortcut-label = Lisää pikavalinta
newtab-topsites-add-shortcut-title =
    .title = Lisää pikavalinta
    .aria-label = Lisää pikavalinta
newtab-topsites-title-label = Otsikko
newtab-topsites-title-input =
    .placeholder = Kirjoita otsikko
newtab-topsites-url-label = Osoite
newtab-topsites-url-input =
    .placeholder =
        { PLATFORM() ->
            [macos] Kirjoita tai sijoita osoite
           *[other] Kirjoita tai liitä osoite
        }
newtab-topsites-url-validation = Kelvollinen osoite vaaditaan
newtab-topsites-image-url-label = Oman kuvan osoite
newtab-topsites-use-image-link = Käytä omaa kuvaa…
newtab-topsites-image-validation = Kuvan lataaminen epäonnistui. Kokeile toista osoitetta.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Tyhjennä teksti

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Peruuta
newtab-topsites-delete-history-button = Poista historiasta
newtab-topsites-save-button = Tallenna
newtab-topsites-preview-button = Esikatsele
newtab-topsites-add-button = Lisää

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Haluatko varmasti poistaa tämän sivun kaikkialta historiastasi?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Tämä toiminto on peruuttamaton.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsoroitu

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (kiinnitetty)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Avaa valikko
    .aria-label = Avaa valikko
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Poista
    .aria-label = Poista
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Avaa valikko
    .aria-label = Avaa pikavalikko sivustolle { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Muokkaa tätä sivustoa
    .aria-label = Muokkaa tätä sivustoa

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Muokkaa
newtab-menu-open-new-window = Avaa uuteen ikkunaan
newtab-menu-open-new-private-window = Avaa uuteen yksityiseen ikkunaan
newtab-menu-dismiss = Hylkää
newtab-menu-pin = Kiinnitä
newtab-menu-unpin = Poista kiinnitys
newtab-menu-delete-history = Poista historiasta
newtab-menu-save-to-pocket = Tallenna { -pocket-brand-name }-palveluun
newtab-menu-delete-pocket = Poista { -pocket-brand-name }-palvelusta
newtab-menu-archive-pocket = Arkistoi { -pocket-brand-name }-palveluun
newtab-menu-show-privacy-info = Tukijamme ja yksityisyytesi
newtab-menu-about-fakespot = Tietoja { -fakespot-brand-name }ista
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Ilmoita
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Estä
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Lopeta seuraaminen
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Lue lisää
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Lopeta aiheen seuraaminen

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Hallinnoi sponsoroitua sisältöä
newtab-menu-our-sponsors-and-your-privacy = Tukijamme ja yksityisyytesi
newtab-menu-report-this-ad = Ilmoita tästä mainoksesta

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Valmis
newtab-privacy-modal-button-manage = Hallitse sponsoroidun sisällön asetuksia
newtab-privacy-modal-header = Yksityisyydelläsi on merkitystä.
newtab-privacy-modal-paragraph-2 =
    Kiehtovien tarinoiden tarjoamisen lisäksi näytämme sinulle myös kiinnostavaa,
    tarkastettua sisältöä valituilta sponsoreilta. Voit olla varma, että <strong>selaustietosi
    pysyvät omassa { -brand-product-name }-kopiossasi</strong> – emme näe niitä eivätkä 
    myöskään sponsorimme.
newtab-privacy-modal-link = Opi miten yksityisyys on esillä uusi välilehti -sivulla

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Poista kirjanmerkki
# Bookmark is a verb here.
newtab-menu-bookmark = Lisää kirjanmerkki

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopioi latauslinkki
newtab-menu-go-to-download-page = Siirry lataussivulle
newtab-menu-remove-download = Poista historiasta

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Näytä Finderissa
       *[other] Avaa kohteen kansio
    }
newtab-menu-open-file = Avaa tiedosto

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Vierailtu
newtab-label-bookmarked = Kirjanmerkki
newtab-label-removed-bookmark = Kirjanmerkki poistettu
newtab-label-recommended = Pinnalla
newtab-label-saved = Tallennettu { -pocket-brand-name }-palveluun
newtab-label-download = Ladatut
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsoroitu
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsorina { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsoroitu

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Poista osio
newtab-section-menu-collapse-section = Pienennä osio
newtab-section-menu-expand-section = Laajenna osio
newtab-section-menu-manage-section = Muokkaa osiota
newtab-section-menu-manage-webext = Hallitse laajennusta
newtab-section-menu-add-topsite = Lisää ykkössivusto
newtab-section-menu-add-search-engine = Lisää hakukone
newtab-section-menu-move-up = Siirrä ylös
newtab-section-menu-move-down = Siirrä alas
newtab-section-menu-privacy-notice = Tietosuojakäytäntö

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Pienennä osio
newtab-section-expand-section-label =
    .aria-label = Laajenna osio

## Section Headers.

newtab-section-header-topsites = Ykkössivustot
newtab-section-header-recent-activity = Viimeisin toiminta
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Suositukset lähteestä { $provider }
newtab-section-header-stories = Ajatuksia herättäviä tarinoita
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Tämän päivän valinnat sinulle

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Ala selata, niin tässä alkaa näkyä hyviä juttuja, videoita ja muita sivuja, joilla olet käynyt hiljattain tai jotka olet lisännyt kirjanmerkkeihin.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Ei enempää suosituksia juuri nyt. Katso myöhemmin uudestaan lisää ykkösjuttuja lähteestä { $provider }. Etkö malta odottaa? Valitse suosittu aihe ja löydä lisää hyviä juttuja ympäri verkkoa.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Ei enempää suosituksia juuri nyt. Katso myöhemmin uudestaan lisää juttuja. Etkö malta odottaa? Valitse suosittu aihe ja löydä lisää hyviä juttuja ympäri verkkoa.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Olet ajan tasalla!
newtab-discovery-empty-section-topstories-content = Katso myöhemmin lisää juttuja.
newtab-discovery-empty-section-topstories-try-again-button = Yritä uudelleen
newtab-discovery-empty-section-topstories-loading = Ladataan…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Hups! Tämä osio ladattiin melkein, mutta ei ihan.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Suositut aiheet:
newtab-pocket-new-topics-title = Haluatko lisää tarinoita? Katso nämä suositut aiheet { -pocket-brand-name }ista
newtab-pocket-more-recommendations = Lisää suosituksia
newtab-pocket-learn-more = Lue lisää
newtab-pocket-cta-button = Hanki { -pocket-brand-name }
newtab-pocket-cta-text = Tallenna tykkäämäsi tekstit { -pocket-brand-name }iin ja ravitse mieltäsi kiinnostavilla teksteillä.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } on osa { -brand-product-name }-perhettä
newtab-pocket-save = Tallenna
newtab-pocket-saved = Tallennettu

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Lisää tällaista
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ei minulle
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Kiitos. Palautteesi auttaa meitä parantamaan syötettäsi.
newtab-toast-dismiss-button =
    .title = Hylkää
    .aria-label = Hylkää

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Löydä verkon parhaat puolet
newtab-pocket-onboarding-cta = { -pocket-brand-name } tutkii monenlaisia julkaisuja tarjotakseen informatiivisimman, inspiroivimman ja luotettavimman sisällön suoraan { -brand-product-name }-selaimellesi.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Hups, jotain meni vikaan tätä sisältöä ladattaessa.
newtab-error-fallback-refresh-link = Yritä uudestaan päivittämällä sivu.

## Customization Menu

newtab-custom-shortcuts-title = Oikotiet
newtab-custom-shortcuts-subtitle = Tallentamasi tai vierailemasi sivustot
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Oikotiet
    .description = Tallentamasi tai vierailemasi sivustot
newtab-custom-shortcuts-nova =
    .label = Oikotiet
newtab-custom-row-description =
    .description = Rivien lukumäärä
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } rivi
           *[other] { $num } riviä
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } rivi
       *[other] { $num } riviä
    }
newtab-custom-sponsored-sites = Sponsoroidut oikotiet
newtab-custom-pocket-title = { -pocket-brand-name } suosittelee
newtab-custom-pocket-subtitle = Poikkeuksellista, valikoitua sisältöä { -pocket-brand-name }-palvelulta, osana { -brand-product-name }-perhettä
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Suositellut tarinat
    .description = Poikkeuksellista { -brand-product-name }-perheen kuratoimaa sisältöä
newtab-recommended-stories-toggle =
    .label = Suositellut tarinat
newtab-custom-stories-personalized-toggle =
    .label = Tarinat
newtab-custom-stories-personalized-checkbox-label = Personoituja tarinoita aktiivisuuteesi pohjautuen
newtab-custom-pocket-sponsored = Sponsoroidut tarinat
newtab-custom-pocket-show-recent-saves = Näytä viimeisimmät tallennukset
newtab-custom-recent-title = Viimeisin toiminta
newtab-custom-recent-subtitle = Valikoima viimeisimpiä sivustoja ja sisältöä
newtab-custom-weather-toggle =
    .label = Sää
    .description = Päivän sääennuste yhdellä vilkaisulla
newtab-custom-widget-weather-toggle =
    .label = Sää
newtab-custom-widget-lists-toggle =
    .label = Listat
newtab-custom-widget-timer-toggle =
    .label = Ajastin
newtab-custom-widget-sports-toggle =
    .label = Jalkapallon maailmanmestaruuskilpailut
newtab-custom-widget-clock-toggle =
    .label = Kello
newtab-custom-widget-sports-toggle2 =
    .label = Urheilu
newtab-custom-widget-section-title = Pienoisohjelmat
newtab-custom-widget-section-toggle =
    .label = Pienoisohjelmat
newtab-widget-manage-title = Pienoisohjelmat
newtab-widget-manage-widget-button =
    .label = Hallitse pienoisohjelmia
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Sulje
    .aria-label = Sulje valikko
newtab-custom-close-button = Sulje
newtab-custom-settings = Muokkaa lisää asetuksia

## New Tab Wallpapers

newtab-wallpaper-title = Taustakuvat
newtab-wallpaper-reset = Palauta oletusarvo
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Lähetä kuva
newtab-wallpaper-add-an-image = Lisää kuva
newtab-wallpaper-custom-color = Valitse väri
newtab-wallpaper-toggle-title =
    .label = Taustakuvat
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Kuvan koko ylitti tiedostokokorajan { $file_size } Mt. Yritä ladata pienempi tiedosto.
newtab-wallpaper-error-upload-file-type = Tiedostosi lataaminen epäonnistui. Yritä uudelleen kuvatiedostolla.
newtab-wallpaper-error-file-type = Tiedostoa ei voitu lähettää. Yritä uudelleen toisella tiedostotyypillä.
newtab-wallpaper-light-red-panda = Kultapanda
newtab-wallpaper-light-mountain = Valkoinen vuori
newtab-wallpaper-light-sky = Taivas violettien ja vaaleanpunaisten pilvien kera
newtab-wallpaper-light-color = Siniset, vaaleanpunaiset ja keltaiset muodot
newtab-wallpaper-light-landscape = Sinertävän usvan vuorimaisema
newtab-wallpaper-light-beach = Ranta ja palmupuu
newtab-wallpaper-dark-aurora = Revontulet
newtab-wallpaper-dark-color = Punaiset ja siniset muodot
newtab-wallpaper-dark-panda = Kultapanda metsän piilossa
newtab-wallpaper-dark-sky = Kaupunkimaisema ja yötaivas
newtab-wallpaper-dark-mountain = Vuorimaisema
newtab-wallpaper-dark-city = Purppura kaupunkimaisema
newtab-wallpaper-dark-fox-anniversary = Kettu jalkakäytävällä lähellä metsää
newtab-wallpaper-light-fox-anniversary = Kettu ruohopellolla ja sumuinen vuoristomaisema

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Yhtenäiset värit
newtab-wallpaper-colors = Värit
newtab-wallpaper-blue = Sininen
newtab-wallpaper-light-blue = Vaaleansininen
newtab-wallpaper-light-purple = Vaaleanvioletti
newtab-wallpaper-light-green = Vaaleanvihreä
newtab-wallpaper-green = Vihreä
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Keltainen
newtab-wallpaper-orange = Oranssi
newtab-wallpaper-pink = Pinkki
newtab-wallpaper-light-pink = Vaaleanpinkki
newtab-wallpaper-red = Punainen
newtab-wallpaper-dark-blue = Tummansininen
newtab-wallpaper-dark-purple = Tummanvioletti
newtab-wallpaper-dark-green = Tummanvihreä
newtab-wallpaper-brown = Ruskea

## Abstract

newtab-wallpaper-category-title-abstract = Abstrakti
newtab-wallpaper-abstract-green = Vihreät muodot
newtab-wallpaper-abstract-blue = Siniset muodot
newtab-wallpaper-abstract-purple = Violetit muodot
newtab-wallpaper-abstract-orange = Oranssit muodot
newtab-wallpaper-gradient-orange = Oranssi ja pinkki liukuväreissä
newtab-wallpaper-abstract-blue-purple = Sinisiä ja violetteja muotoja
newtab-wallpaper-abstract-white-curves = Valkoista ja varjostettuja kaaria
newtab-wallpaper-abstract-purple-green = Violetin ja vihreän valon liukuväriä
newtab-wallpaper-abstract-blue-purple-waves = Sinisiä ja violetteja aaltoilevia muotoja
newtab-wallpaper-abstract-black-waves = Mustia aaltoilevia muotoja

## Firefox

newtab-wallpaper-category-title-photographs = Valokuvat
newtab-wallpaper-beach-at-sunrise = Ranta auringonnousun aikaan
newtab-wallpaper-beach-at-sunset = Ranta auringonlaskun aikaan
newtab-wallpaper-storm-sky = Myrskyinen taivas
newtab-wallpaper-sky-with-pink-clouds = Taivas ja vaaleanpunaiset pilvet
newtab-wallpaper-red-panda-yawns-in-a-tree = Kultapanda haukottelee puussa
newtab-wallpaper-white-mountains = Valkoiset vuoret
newtab-wallpaper-hot-air-balloons = Värikkäitä kuumailmapalloja päiväsaikaan
newtab-wallpaper-starry-canyon = Sininen tähtiyö
newtab-wallpaper-suspension-bridge = Harmaa riippusilta päiväsaikaan
newtab-wallpaper-sand-dunes = Valkoiset hiekkadyynit
newtab-wallpaper-palm-trees = Kookospalmujen siluetti auringonnousun aikana
newtab-wallpaper-blue-flowers = Lähikuva siniterälehtisistä kukista
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Kuva: <a data-l10n-name="name-link">{ $author_string }</a> sivustolla <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Lisää ripaus väriä
newtab-wallpaper-feature-highlight-content = Anna uudelle välilehdelle uusi ilme taustakuvien avulla.
newtab-wallpaper-feature-highlight-button = Selvä
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Hylkää
    .aria-label = Sulje ilmoitus
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Taivaallinen
newtab-wallpaper-celestial-lunar-eclipse = Kuunpimennys
newtab-wallpaper-celestial-earth-night = Yökuva matalalta Maan kiertoradalta
newtab-wallpaper-celestial-starry-sky = Tähtitaivas
newtab-wallpaper-celestial-eclipse-time-lapse = Kuunpimennyksen kuvasarja
newtab-wallpaper-celestial-black-hole = Mustan aukon galaksikuvitus
newtab-wallpaper-celestial-river = Satelliittikuva joesta

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Katso ennuste palvelussa { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsoroitu
newtab-weather-menu-change-location = Vaihda sijaintia
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Hae sijaintia
    .aria-label = Hae sijaintia
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Käytä nykyistä sijaintia
newtab-weather-menu-weather-display = Sään näkymä
newtab-weather-todays-forecast = Tämän päivän ennuste
newtab-weather-see-full-forecast = Katso koko ennuste
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Yksinkertainen
newtab-weather-menu-change-weather-display-simple = Vaihda yksinkertaiseen näkymään
newtab-weather-menu-weather-display-option-detailed = Yksityiskohtainen
newtab-weather-menu-change-weather-display-detailed = Vaihda yksityiskohtaiseen näkymään
newtab-weather-menu-temperature-units = Lämpötilayksiköt
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Vaihda Fahrenheitiin
newtab-weather-menu-change-temperature-units-celsius = Vaihda Celsiukseen
newtab-weather-menu-hide-weather = Piilota sää uudessa välilehdessä
newtab-weather-menu-learn-more = Lue lisää
newtab-weather-menu-detect-my-location = Havaitse sijaintini
# This message is shown if user is working offline
newtab-weather-error-not-available = Säätiedot eivät ole tällä hetkellä saatavilla.
newtab-weather-opt-in-see-weather = Haluatko nähdä sijaintisi sään?
newtab-weather-opt-in-not-now =
    .label = Ei nyt
newtab-weather-opt-in-yes =
    .label = Kyllä
newtab-weather-opt-in-headline = Hanki paikallinen sääennuste
newtab-weather-opt-in-use-location =
    .label = Käytä sijaintia
newtab-weather-opt-in-choose-location = Valitse sijainti
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Helsinki
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Korkein
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Matalin
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Katso ennuste palvelussa { $provider }
    .aria-description = { $provider } ∙ Sponsoroitu

## Topic Labels

newtab-topic-label-business = Liiketoiminta
newtab-topic-label-career = Ura
newtab-topic-label-education = Koulutus
newtab-topic-label-arts = Viihde
newtab-topic-label-food = Ruoka
newtab-topic-label-health = Terveys
newtab-topic-label-hobbies = Pelaaminen
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Raha-asiat
newtab-topic-label-society-parenting = Vanhemmuus
newtab-topic-label-government = Politiikka
newtab-topic-label-education-science = Tiede
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Niksit
newtab-topic-label-sports = Urheilu
newtab-topic-label-tech = Tekniikka
newtab-topic-label-travel = Matkailu
newtab-topic-label-home = Koti ja puutarha

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Hienosäädä syötettä valitsemalla aiheita
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Valitse vähintään kaksi aihetta. Asiantuntevat kuraattorimme priorisoivat kiinnostuksen kohteidesi mukaan räätälöityjä tarinoita. Päivitä milloin tahansa.
newtab-topic-selection-save-button = Tallenna
newtab-topic-selection-cancel-button = Peruuta
newtab-topic-selection-button-maybe-later = Ehkä myöhemmin
newtab-topic-selection-privacy-link = Lue lisää, kuinka suojaamme ja hallitsemme tietoja
newtab-topic-selection-button-update-interests = Päivitä kiinnostuksen kohteesi
newtab-topic-selection-button-pick-interests = Valitse kiinnostuksen kohteesi

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Seuraa
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Seuraa aihetta { $topic }
newtab-section-following-button = Seurataan
newtab-section-unfollow-button = Lopeta seuraaminen
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Seurataan: Lopeta aiheen { $topic } seuraaminen
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Hienosäädä syötettä
newtab-section-follow-highlight-subtitle = Seuraa kiinnostuksen kohteitasi nähdäksesi enemmän sinua kiinnostavia asioita.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Estä
newtab-section-blocked-button = Estetty
newtab-section-unblock-button = Poista esto
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Seuraa aihetta { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Lopeta aiheen { $topic } seuraaminen
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Estä { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Poista aiheen { $topic } esto

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ei nyt
newtab-section-confirm-block-topic-p1 = Haluatko varmasti estää tämän aiheen?
newtab-section-confirm-block-topic-p2 = Estetyt aiheet eivät enää näy syötteessäsi.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Estä { $topic }
newtab-section-block-cancel-button = Peruuta

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Aiheet
newtab-section-manage-topics-button-v2 =
    .label = Hallinnoi aiheita
newtab-section-mangage-topics-followed-topics = Seurattu
newtab-section-mangage-topics-followed-topics-empty-state = Et ole vielä seurannut yhtäkään aihetta.
newtab-section-mangage-topics-blocked-topics = Estetty
newtab-section-mangage-topics-blocked-topics-empty-state = Et ole vielä estänyt yhtäkään aihetta.
newtab-custom-wallpaper-title = Mukautetut taustakuvat ovat täällä
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Valitse oma taustakuvasi tai mukautettu väri ja tee { -brand-product-name }ista mieluisesi.
newtab-custom-wallpaper-cta = Kokeile

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Valitse taustakuva ja tee { -brand-product-name }ista omasi
newtab-new-user-custom-wallpaper-subtitle = Tee jokaisesta uudesta välilehdestä tutunomainen mukautetuilla taustakuvilla ja väreillä.
newtab-new-user-custom-wallpaper-cta = Kokeile nyt

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Uudet taustakuvat saapuivat juuri
newtab-wallpaper-feature-highlight-subtitle = Valitse suosikkisi ja tee jokaisesta uudesta välilehdestä kotoisa.
newtab-wallpaper-feature-highlight-cta = Valitse taustakuva

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Lataa { -brand-product-name } mobiililaitteille
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Skannaa koodi selataksesi turvallisesti liikkeellä ollessasi.
newtab-download-mobile-highlight-body-variant-b = Jatka siitä, mihin jäit, synkronoimalla välilehdet, salasanat ja muut tiedot.
newtab-download-mobile-highlight-body-variant-c = Tiesitkö, että voit ottaa { -brand-product-name }in mukaasi liikkeellä ollessasi? Sama selain. Taskussasi.
newtab-download-mobile-highlight-image =
    .aria-label = QR-koodi { -brand-product-name }in lataamiseksi mobiililaitteille

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Suosikkisi sormiesi ulottuvilla
newtab-shortcuts-highlight-subtitle = Lisää pikakuvake, niin suosikkisivustosi ovat yhden napsautuksen päässä.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Miksi ilmoitat tästä?
newtab-report-ads-reason-not-interested =
    .label = En ole kiinnostunut
newtab-report-ads-reason-inappropriate =
    .label = Se on sopimatonta
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Olen nähnyt sen liian monta kertaa
newtab-report-content-wrong-category =
    .label = Väärä luokka
newtab-report-content-outdated =
    .label = Vanhentunut
newtab-report-content-inappropriate-offensive =
    .label = Sopimaton tai loukkaava
newtab-report-content-spam-misleading =
    .label = Roskapostia tai harhaanjohtavaa
newtab-report-content-requires-payment-subscription =
    .label = Vaatii maksun tai tilauksen
newtab-report-content-requires-payment-subscription-learn-more = Lue lisää
newtab-report-cancel = Peruuta
newtab-report-submit = Lähetä
newtab-toast-thanks-for-reporting =
    .message = Kiitos, että ilmoitit tästä.
newtab-toast-widgets-hidden =
    .message = Voit lisätä pienoisohjelmia takaisin milloin tahansa valitsemalla kynäkuvakkeen.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Seuraat nyt aihetta { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Et enää seuraa aihetta { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Et enää näe aihetta { $topic } käsitteleviä tarinoita.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Mahdollisuudet ovat rajattomat. Lisää yksi sellainen.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Uusi
newtab-widget-lists-label-beta =
    .label = Beeta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Valmis ({ $number })
newtab-widget-lists-celebration-headline = Hyvää työtä
newtab-widget-lists-celebration-subhead = Kaikki hoidettu
newtab-widget-task-list-menu-copy = Kopioi
newtab-widget-lists-menu-edit = Muokkaa listan nimeä
newtab-widget-lists-menu-edit2 =
    .aria-label = Muokkaa listan nimeä
newtab-widget-lists-menu-create = Luo uusi lista
newtab-widget-lists-menu-delete = Poista tämä lista
newtab-widget-lists-menu-copy = Kopioi lista leikepöydälle
newtab-widget-lists-menu-learn-more = Lue lisää
newtab-widget-lists-button-add-item = Lisää kohde
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Lisää kohde
    .aria-label = Lisää kohde
newtab-widget-lists-input-error = Sisällytä tekstiä lisätäksesi kohteen.
newtab-widget-lists-input-menu-open-link = Avaa linkki
newtab-widget-lists-input-menu-move-up = Siirrä ylös
newtab-widget-lists-input-menu-move-down = Siirrä alas
newtab-widget-lists-input-menu-delete = Poista
newtab-widget-lists-input-menu-edit = Muokkaa
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Muokkaa merkintää
newtab-widget-lists-edit-clear =
    .aria-label = Peruuta
    .title = Peruuta
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Luo uusi lista
newtab-widget-lists-name-label-default =
    .label = Tehtävälista
newtab-widget-lists-name-label-checklist =
    .label = Tarkistuslista
newtab-widget-lists-name-placeholder-default =
    .placeholder = Tehtävälista
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Tarkistuslista
    .aria-label = Muokkaa listan nimeä
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Uusi lista
    .aria-label = Muokkaa listan nimeä
newtab-widget-section-title = Pienoisohjelmat
newtab-widget-menu-hide = Piilota pienoisohjelma
newtab-widget-menu-change-size = Muuta kokoa
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Siirrä
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Vasen
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Oikea
newtab-widget-size-small = Pieni
newtab-widget-size-medium = Keskikokoinen
newtab-widget-size-large = Suuri
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Piilota pienoisohjelmat
    .aria-label = Piilota kaikki pienoisohjelmat
newtab-widget-section-maximize =
    .title = Laajenna pienoisohjelmat
    .aria-label = Laajenna pienoisohjelmat täyteen kokoon
newtab-widget-section-minimize =
    .title = Pienennä pienoisohjelmat
    .aria-label = Supista pienoisohjelmat kompaktiin kokoon
newtab-widget-section-menu-button =
    .title = Pienoisohjelmien valikko
    .aria-label = Avaa pienoisohjelmien valikko
newtab-widget-add-widgets-button =
    .aria-label = Lisää pienoisohjelma
    .title = Lisää pienoisohjelma
newtab-widget-section-menu-manage = Hallitse pienoisohjelmia
newtab-widget-section-menu-hide-all = Piilota pienoisohjelmat
newtab-widget-section-menu-learn-more = Lue lisää
newtab-widget-section-feedback = Kerro meille mielipiteesi
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Näytä lisää pienoisohjelmia
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Näytä vähemmän pienoisohjelmia
newtab-widget-lists-name-default = Tarkistuslista

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Ajastin
newtab-widget-timer-notification-focus = Keskittymisaika on ohi. Hyvää työtä. Tarvitsetko tauon?
newtab-widget-timer-notification-break = Taukosi on ohi. Oletko valmis keskittymään?
newtab-widget-timer-notification-warning = Ilmoitukset ovat pois päältä
newtab-widget-timer-mode-focus =
    .label = Keskity
newtab-widget-timer-mode-break =
    .label = Tauko
newtab-widget-timer-label-play =
    .label = Käynnistä
newtab-widget-timer-label-pause =
    .label = Keskeytä
newtab-widget-timer-reset =
    .title = Nollaa
newtab-widget-timer-menu-notifications = Poista ilmoitukset käytöstä
newtab-widget-timer-menu-notifications-on = Ota ilmoitukset käyttöön
newtab-widget-timer-menu-learn-more = Lue lisää
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Pääotsikot
newtab-daily-briefing-card-menu-dismiss = Hylkää
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Päivitetty { $minutes } min sitten
newtab-widget-message-title = Pysy keskittyneenä listojen ja sisäänrakennetun ajastimen avulla
# to-dos stands for "things to do".
newtab-widget-message-copy = Nopeista muistutuksista päivittäisiin tehtäviin, keskittymisharjoituksista venyttelytaukoihin – pysy tehtävässäsi ja aikataulussa.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Yksi paikka keskittymiselle, ennusteille ja muulle
newtab-widget-message-focus-forecasts-body = Pidä päiväsi liikkeessä { -brand-product-name }in pienoisohjelmien avulla. Tarkista sääennuste, pysy tehtävissäsi tai seuraa aikaa ympäri maailmaa.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Tee { -brand-product-name }ista omasi
newtab-promo-card-body-addons = Valitse taustakuva kokoelmastamme tai luo omasi.
newtab-promo-card-cta-addons = Kokeile nyt
newtab-promo-card-title = Tue { -brand-product-name }ia
newtab-promo-card-body = Sponsorimme tukevat tehtäväämme rakentaa parempaa Internetiä
newtab-promo-card-cta = Lue lisää
newtab-promo-card-dismiss-button =
    .title = Hylkää
    .aria-label = Hylkää

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Käynnistä { $minutes } minuutin ajastin
           *[other] Käynnistä { $minutes } minuutin ajastin
        }
newtab-widget-timer-pause-aria =
    .aria-label = Keskeytä ajastin
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minuutti
           *[other] { $minutes } minuuttia
        }
newtab-widget-timer-decrease-min =
    .title = Vähennä 1 minuutti
newtab-widget-timer-increase-min =
    .title = Lisää 1 minuutti
newtab-widget-timer-mode-group =
    .aria-label = Ajastintila
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Keskity
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Tauko
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Piilota ajastin
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Hyvää työtä
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Tauko on ohi
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Tarvitsetko tauon?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Valmis keskittymään?

##

newtab-sports-widget-menu-follow-teams = Seuraa joukkueita
newtab-sports-widget-menu-view-schedule = Näytä aikataulu
newtab-sports-widget-menu-view-upcoming = Näytä tulevat
newtab-sports-widget-menu-view-results = Näytä tulokset
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Tärkeimmät päivät
newtab-sports-widget-menu-learn-more = Lue lisää
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Pidä silmällä MM-kisoja
newtab-sports-widget-get-updates = Saat päivityksiä otteluiden suorista tapahtumista ja paljon muuta.
newtab-sports-widget-view-schedule =
    .label = Näytä aikataulu
newtab-sports-widget-follow-teams =
    .label = Seuraa joukkueita
newtab-sports-widget-view-matches =
    .label = Näytä ottelut
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Seuraa { $number } joukkuetta
       *[other] Seuraa { $number } joukkuetta
    }
newtab-sports-widget-choose-wallpaper =
    .label = Valitse taustakuva
newtab-sports-widget-skip = Ohita
newtab-sports-widget-search-country =
    .placeholder = Hae maata
    .aria-label = Hae maata
newtab-sports-widget-cancel = Peruuta
newtab-sports-widget-back-button =
    .aria-label = Takaisin
newtab-sports-widget-done-button =
    .label = Valmis
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (tiputettu)
newtab-sports-widget-view-all =
    .label = Näytä kaikki
newtab-sports-widget-show-less =
    .label = Näytä vähemmän
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Vain seuratut joukkueet
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Katso
    .title = Katso suorana
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Katso suorana
    .title = Katso suorana
newtab-sports-widget-watch-dialog-close =
    .aria-label = Sulje
    .title = Sulje
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Ilmainen
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Ilmainen kokeilujakso
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Ilmainen ja maksullinen
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Maksullinen
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Vain valitut pelit
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Saatavilla alueellasi
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Muut alueet
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Avaa suoratoisto
    .title = Avaa suoratoisto
newtab-sports-widget-group-stage = Lohkovaihe
newtab-sports-widget-group-a = Lohko A
newtab-sports-widget-group-b = Lohko B
newtab-sports-widget-group-c = Lohko C
newtab-sports-widget-group-d = Lohko D
newtab-sports-widget-group-e = Lohko E
newtab-sports-widget-group-f = Lohko F
newtab-sports-widget-group-g = Lohko G
newtab-sports-widget-group-h = Lohko H
newtab-sports-widget-group-i = Lohko I
newtab-sports-widget-group-j = Lohko J
newtab-sports-widget-group-k = Lohko K
newtab-sports-widget-group-l = Lohko L
newtab-sports-widget-round-32 = 32 parasta
newtab-sports-widget-round-16 = 16 parasta
newtab-sports-widget-quarter-finals = Puolivälierät
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = SUORA
newtab-custom-widget-live-refresh =
    .title = Päivitä tulokset
    .aria-label = Päivitä tulokset
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Tärkeimmät päivät
newtab-sports-widget-upcoming = Tulossa
# Used for a match currently ongoing
newtab-sports-widget-now = Nyt
newtab-sports-widget-results = Tulokset
newtab-sports-widget-semi-finals = Välierät
newtab-sports-widget-bronze-finals = Pronssiottelu
# Final is the final match for 1st place.
newtab-sports-widget-final = Loppuottelu
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Viivästynyt
newtab-sports-widget-postponed = Lykätty
newtab-sports-widget-suspended = Keskeytetty
newtab-sports-widget-cancelled = Peruttu
newtab-sports-widget-information = Tietoja ottelusta
newtab-sports-widget-no-live-data = Suoran ottelun tiedot eivät päivity juuri nyt
newtab-sports-widget-view-results-link = Näytä tulokset
newtab-sports-widget-third-place = Kolmas sija
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Toinen sija
newtab-sports-widget-champions = Mestarit
newtab-sports-widget-world-cup-champions = Vuoden 2026 MM-kilpailujen mestarit
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Täysi aika
newtab-sports-widget-match-halftime = Puoliaika
newtab-sports-widget-match-extra-time = Jatkoaika
newtab-sports-widget-match-penalties = Rangaistuspotkut

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Edellinen
    .title = Edellinen
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Seuraava
    .title = Seuraava
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Suora ottelu { $index }/{ $total }
    .title = Suora ottelu { $index }/{ $total }

## Accessible labels for match rows in the sports widget. These are read by
## screen readers to announce the match details and status.
## Variables shared by all messages in this group:
##   $homeTeam (String) - The full name of the home team (e.g. "Mexico")
##   $awayTeam (String) - The full name of the away team (e.g. "Russia")

# A finished match row (regular full-time result).
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
newtab-sports-widget-match-aria-label-results =
    .aria-label = { $homeTeam }, { $homeScore } vastaan { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) vastaan { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Suora: { $homeTeam }, { $homeScore } vastaan { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } vastaan { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } vastaan { $awayTeam }, viivästetty
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } vastaan { $awayTeam }, siirretty
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } vastaan { $awayTeam }, keskeytetty
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } vastaan { $awayTeam }, peruttu

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnia ja Hertsegovina
newtab-sports-widget-team-name-label-civ =
    .label = Norsunluurannikko
newtab-sports-widget-team-name-label-cod =
    .label = Kongon demokraattinen tasavalta
newtab-sports-widget-team-name-label-eng =
    .label = Englanti
newtab-sports-widget-team-name-label-sco =
    .label = Skotlanti

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Aloita MM-kisat uusilla taustakuvilla
newtab-sports-widget-message-wallpapers-body = Tuo ottelupäivän energiaa selaimeesi.
newtab-sports-widget-message-wallpapers-cta = Valitse taustakuva
newtab-sports-widget-message-add-widgets-cta =
    .label = Lisää pienoisohjelmia
newtab-sports-widget-message-day-in-play-title = Pidä päiväsi käynnissä { -brand-product-name }in pienoisohjelmien avulla
newtab-sports-widget-message-day-in-play-body = Seuraa jalkapallon MM-kisoja, pysy tehtävissäsi, seuraa aikaa ympäri maailmaa ja paljon muuta.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Tutustu pienoisohjelmiin

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Hylkää
    .aria-label = Hylkää
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Tee tästä tilasta omasi
newtab-activation-window-message-customization-focus-message = Valitse uusi taustakuva, lisää oikotiet suosikkisivustoillesi ja pysy ajan tasalla sinua kiinnostavista tarinoista.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Aloita mukauttaminen
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Tämä tila toimii sinun säännöilläsi
newtab-activation-window-message-values-focus-message = { -brand-product-name } antaa sinun selata verkkoa haluamallasi tavalla, tarjoten henkilökohtaisemman tavan aloittaa päiväsi verkossa. Tee { -brand-product-name }ista omasi.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Piilota kello
newtab-clock-widget-menu-learn-more = Lue lisää
newtab-clock-widget-menu-edit = Muokkaa kelloja
newtab-clock-widget-menu-switch-to-12h = Vaihda 12 tunnin muotoon
newtab-clock-widget-menu-switch-to-24h = Vaihda 24 tunnin muotoon
newtab-clock-widget-label-your-clocks = Kellosi
newtab-clock-widget-search-location-input =
    .label = Sijainti
    .placeholder = Hae kaupunkia
    .aria-label = Hae kaupunkia
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Kutsumanimi (valinnainen)
    .placeholder = Lisää kutsumanimi
    .aria-label = Kutsumanimi (valinnainen)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Lisää uusi kello
    .aria-label = Lisää uusi kello
newtab-clock-widget-button-add-clock = Lisää
newtab-clock-widget-button-cancel = Peruuta
newtab-clock-widget-button-back =
    .title = Takaisin
    .aria-label = Takaisin
newtab-clock-widget-button-edit-clock =
    .title = Muokkaa kelloa
    .aria-label = Muokkaa kelloa
newtab-clock-widget-button-save = Tallenna
newtab-clock-widget-button-remove-clock =
    .title = Poista kello
    .aria-label = Poista kello
# Accessible name for a clock row in the "Your clocks" management panel
# when the row has no user-provided nickname. Read aloud by screen
# readers when focus lands on the row.
# Variables:
#   $city (string) - The city name displayed in the row.
newtab-clock-widget-edit-item =
    .aria-label = { $city }
# Accessible name for a clock row when a user nickname has been set.
# Variables:
#   $city (string) - The city name displayed in the row.
#   $nickname (string) - The user-provided nickname for the row.
newtab-clock-widget-edit-item-with-nickname =
    .aria-label = { $city }, kutsumanimi: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Lisää kello
newtab-clock-widget-edit-clock-form =
    .aria-label = Muokkaa kelloa
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Hakutulokset
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Ei tuloksia
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Avaa kellon valikko
    .aria-label = Avaa kellon valikko
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Kutsumanimi: { $nickname }

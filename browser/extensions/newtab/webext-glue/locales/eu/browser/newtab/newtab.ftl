# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Fitxa berria
newtab-settings-button =
    .title = Pertsonalizatu fitxa berriaren orria
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Pertsonalizatu orri hau
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Pertsonalizatu
newtab-customize-panel-label =
    .label = Pertsonalizatu
newtab-personalize-settings-icon-label =
    .title = Pertsonalizatu fitxa berria
    .aria-label = Ezarpenak
newtab-settings-dialog-label =
    .aria-label = Ezarpenak
newtab-personalize-icon-label =
    .title = Pertsonalizatu fitxa berria
    .aria-label = Pertsonalizatu fitxa berria
newtab-personalize-dialog-label =
    .aria-label = Pertsonalizatu
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Baztertu
    .aria-label = Baztertu

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Hasiera-orria
home-homepage-new-windows =
    .label = Leiho berriak
home-homepage-new-tabs =
    .label = Fitxa berriak
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Aukeratu gune zehatza

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Webgunearen helbidea
home-custom-homepage-address =
    .placeholder = Idatzi helbidea
home-custom-homepage-address-button =
    .label = Gehitu helbidea
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Ez da webgunerik gehitu oraindik.
home-custom-homepage-delete-address-button =
    .aria-label = Ezabatu helbidea
    .title = Ezabatu helbidea
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Ordeztu honekin
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Unean irekitako orriak
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Laster-markak…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Bilatu
home-prefs-stories-header2 =
    .label = Istorioak
    .description = { -brand-product-name } familiak hautatutako aparteko edukia
home-prefs-widgets-header =
    .label = Widgetak
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Zerrendak
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Tenporizadorea
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Kirolak
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Erlojua
home-prefs-mission-message2 =
    .message = Gure babesleek web hobeagoa eraikitzeko misioan laguntzen gaituzte.
home-prefs-manage-topics-link2 =
    .label = Kudeatu gaiak
home-prefs-choose-wallpaper-link2 =
    .label = Aukeratu horma-papera
home-prefs-firefox-logo-header =
    .label = { -brand-short-name } logoa
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Eginbide hauek erabiltzeko, ezarri fitxa edo leiho berriak '{ -firefox-home-brand-name }' aukerara.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] Errenkada bat
           *[other] { $num } errenkada
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Gehigarria ({ $extension })
home-restore-defaults-srd =
    .label = Berrezarri lehenetsiak
    .accesskey = B
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Lehenetsia)
home-mode-choice-custom-srd =
    .label = URL pertsonalizatuak…
home-mode-choice-blank-srd =
    .label = Orri zuria
home-prefs-shortcuts-header-srd =
    .label = Lasterbideak
home-prefs-shortcuts-select =
    .aria-label = Lasterbideak
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Babesleen lasterbideak
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Babesleen istorioak
home-prefs-highlights-option-visited-pages-srd =
    .label = Bisitatutako orriak
home-prefs-highlights-options-bookmarks-srd =
    .label = Laster-markak
home-prefs-highlights-option-most-recent-download-srd =
    .label = Azken deskarga
home-prefs-recent-activity-header-srd =
    .label = Azken jarduera
home-prefs-recent-activity-select =
    .aria-label = Azken jarduera
home-prefs-weather-header-srd =
    .label = Eguraldia
home-prefs-support-firefox-header-srd =
    .label = Lagundu { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Ezagutu nola

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Bilatu
    .aria-label = Bilatu
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Bilatu { $engine } erabiliz edo idatzi helbidea
newtab-search-box-handoff-text-no-engine = Bilatu edo idatzi helbidea
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Bilatu { $engine } erabiliz edo idatzi helbidea
    .title = Bilatu { $engine } erabiliz edo idatzi helbidea
    .aria-label = Bilatu { $engine } erabiliz edo idatzi helbidea
newtab-search-box-handoff-input-no-engine =
    .placeholder = Bilatu edo idatzi helbidea
    .title = Bilatu edo idatzi helbidea
    .aria-label = Bilatu edo idatzi helbidea
newtab-search-box-text = Bilatu webean
newtab-search-box-input =
    .placeholder = Bilatu webean
    .aria-label = Bilatu webean

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Gehitu bilaketa-motorra
newtab-topsites-add-shortcut-header = Lasterbide berria
newtab-topsites-edit-topsites-header = Editatu maiz erabilitako gunea
newtab-topsites-edit-shortcut-header = Editatu lasterbidea
newtab-topsites-add-shortcut-label = Gehitu lasterbidea
newtab-topsites-add-shortcut-title =
    .title = Gehitu lasterbidea
    .aria-label = Gehitu lasterbidea
newtab-topsites-title-label = Izenburua
newtab-topsites-title-input =
    .placeholder = Idatzi izenburua
newtab-topsites-url-label = URLa
newtab-topsites-url-input =
    .placeholder = Idatzi edo itsatsi URLa
newtab-topsites-url-validation = Baliozko URLa behar da
newtab-topsites-image-url-label = Irudi pertsonalizatuaren URLa
newtab-topsites-use-image-link = Erabili irudi pertsonalizatua…
newtab-topsites-image-validation = Ezin da irudia kargatu. Saiatu beste URL batekin.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Garbitu testua

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Utzi
newtab-topsites-delete-history-button = Ezabatu historiatik
newtab-topsites-save-button = Gorde
newtab-topsites-preview-button = Aurrebista
newtab-topsites-add-button = Gehitu

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Ziur zaude orri honen agerpen guztiak ezabatu nahi dituzula historiatik?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Ekintza hau ezin da desegin.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Babesleak hornituta

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (ainguratuta)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Ireki menua
    .aria-label = Ireki menua
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Kendu
    .aria-label = Kendu
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Ireki menua
    .aria-label = Ikusi { $title } gunerako testuinguru-menua
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Editatu gune hau
    .aria-label = Editatu gune hau

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Editatu
newtab-menu-open-new-window = Ireki leiho berri batean
newtab-menu-open-new-private-window = Ireki leiho pribatu berrian
newtab-menu-dismiss = Baztertu
newtab-menu-pin = Ainguratu
newtab-menu-unpin = Desainguratu
newtab-menu-delete-history = Ezabatu historiatik
newtab-menu-save-to-pocket = Gorde { -pocket-brand-name }-en
newtab-menu-delete-pocket = Ezabatu { -pocket-brand-name }-etik
newtab-menu-archive-pocket = Artxibatu { -pocket-brand-name }-en
newtab-menu-show-privacy-info = Gure babesleak eta zure pribatutasuna
newtab-menu-about-fakespot = { -fakespot-brand-name }(r)i buruz
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Jakinarazi
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blokeatu
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Utzi jarraitzeari
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Argibide gehiago
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Ez jarraitu gaia

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Kudeatu babesleen edukia
newtab-menu-our-sponsors-and-your-privacy = Gure babesleak eta zure pribatutasuna
newtab-menu-report-this-ad = Eman iragarki honen berri

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Eginda
newtab-privacy-modal-button-manage = Kudeatu babesleek ordaindutako edukien ezarpenak
newtab-privacy-modal-header = Zure pribatutasuna garrantzitsua da.
newtab-privacy-modal-paragraph-2 =
    Harrapatuko zaituzten istorioak biltzeaz gain, hautatutako babesleek
    hornitutako eta aurrez ikuskatutako eduki esanguratsua ere erakusten dizugu.
    Zaude lasai, <strong>zure nabigatze-datuak inoiz ez dira zure { -brand-product-name }(e)tik irtengo</strong> — ez guk ez eta gure babesleek ez dute halakorik ikusten.
newtab-privacy-modal-link = Ikasi pribatutasuna nola dabilen fitxa berrian

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Kendu laster-marka
# Bookmark is a verb here.
newtab-menu-bookmark = Egin laster-marka

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopiatu deskargaren lotura
newtab-menu-go-to-download-page = Joan deskargaren orrira
newtab-menu-remove-download = Kendu historiatik

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Erakutsi Finder-en
       *[other] Ireki dagoen karpeta
    }
newtab-menu-open-file = Ireki fitxategia

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Bisitatuta
newtab-label-bookmarked = Laster-marka eginda
newtab-label-removed-bookmark = Laster-marka kenduta
newtab-label-recommended = Joerak
newtab-label-saved = { -pocket-brand-name }-en gordeta
newtab-label-download = Deskargatuta
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource }(e)k lagundua
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Babeslea: { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Babesleak hornituta

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Kendu atala
newtab-section-menu-collapse-section = Tolestu atala
newtab-section-menu-expand-section = Zabaldu atala
newtab-section-menu-manage-section = Kudeatu atala
newtab-section-menu-manage-webext = Kudeatu hedapena
newtab-section-menu-add-topsite = Gehitu maiz erabilitako gunea
newtab-section-menu-add-search-engine = Gehitu bilaketa-motorra
newtab-section-menu-move-up = Eraman gora
newtab-section-menu-move-down = Eraman behera
newtab-section-menu-privacy-notice = Pribatutasun-oharra

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Tolestu atala
newtab-section-expand-section-label =
    .aria-label = Zabaldu atala

## Section Headers.

newtab-section-header-topsites = Gune erabilienak
newtab-section-header-recent-activity = Azken jarduera
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } hornitzaileak gomendatuta
newtab-section-header-stories = Hausnartzeko moduko istorioak
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Gaurko hautua zuretzat

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Hasi nabigatzen eta azkenaldian bisitatutako edo laster-marka egindako aparteko artikulu, bideo eta orriak erakutsiko ditugu.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Egunean zaude jada. Etorri berriro geroago { $provider } hornitzailearen istorio ezagun gehiagorako. Ezin duzu itxaron? Hautatu gai ezagun bat webeko istorio gehiago aurkitzeko.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Egunean zaude jada. Etorri berriro geroago istorio gehiago jasotzeko. Ezin duzu itxaron? Hautatu gai ezagun bat webeko istorio gehiago aurkitzeko.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Egunean zaude!
newtab-discovery-empty-section-topstories-content = Itzuli geroago istorio gehiago aurkitzeko.
newtab-discovery-empty-section-topstories-try-again-button = Saiatu berriro
newtab-discovery-empty-section-topstories-loading = Kargatzen…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Kontxo! Atal hau ia-ia kargatu dugu baina ez erabat.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Gai ezagunak:
newtab-pocket-new-topics-title = Istorio gehiago nahi dituzu? Ikusi { -pocket-brand-name }(e)ko gai ezagun hauek
newtab-pocket-more-recommendations = Gomendio gehiago
newtab-pocket-learn-more = Argibide gehiago
newtab-pocket-cta-button = Eskuratu { -pocket-brand-name }
newtab-pocket-cta-text = Gorde gogoko dituzun istorioak { -pocket-brand-name }-en eta piztu zure gogoa irakurgai erakargarriekin.
newtab-pocket-pocket-firefox-family = { -brand-product-name }(r)en familiakoa da { -pocket-brand-name }
newtab-pocket-save = Gorde
newtab-pocket-saved = Gordeta

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Horrelako gehiago
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ez zait interesatzen
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Eskerrik asko. Zure iritziak jarioa hobetzen lagunduko digu.
newtab-toast-dismiss-button =
    .title = Baztertu
    .aria-label = Baztertu

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Aurkitu webeko onena
newtab-pocket-onboarding-cta = { -pocket-brand-name }(e)k hainbat argitalpen arakatzen ditu eduki informatibo, suspergarri eta fidagarriena zuzenean zure { -brand-product-name } nabigatzailera ekartzeko.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Kontxo, zerbait gaizki joan da edukia kargatzerakoan.
newtab-error-fallback-refresh-link = Berritu orria berriro saiatzeko.

## Customization Menu

newtab-custom-shortcuts-title = Lasterbideak
newtab-custom-shortcuts-subtitle = Gordetzen edo bisitatzen dituzun guneak
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Lasterbideak
    .description = Gordetzen edo bisitatzen dituzun guneak
newtab-custom-shortcuts-nova =
    .label = Lasterbideak
newtab-custom-row-description =
    .description = Lerro kopurua
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] Errenkada bat
           *[other] { $num } errenkada
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] Errenkada bat
       *[other] { $num } errenkada
    }
newtab-custom-sponsored-sites = Babesleen lasterbideak
newtab-custom-pocket-title = { -pocket-brand-name }-ek gomendatua
newtab-custom-pocket-subtitle = { -brand-product-name } familiakide den { -pocket-brand-name }-eko taldeak hautatutako aparteko edukia.
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Gomendatutako istorioak
    .description = { -brand-product-name } familiak aukeratutako eduki aparta
newtab-recommended-stories-toggle =
    .label = Gomendatutako istorioak
newtab-custom-stories-personalized-toggle =
    .label = Istorioak
newtab-custom-stories-personalized-checkbox-label = Zure jardueran oinarritutako istorio pertsonalizatuak
newtab-custom-pocket-sponsored = Babesleen istorioak
newtab-custom-pocket-show-recent-saves = Erakutsi gordetako azkenak
newtab-custom-recent-title = Azken jarduera
newtab-custom-recent-subtitle = Azken gune eta edukien hautapena
newtab-custom-weather-toggle =
    .label = Eguraldia
    .description = Gaurko eguraldi-iragarpena
newtab-custom-widget-weather-toggle =
    .label = Eguraldia
newtab-custom-widget-lists-toggle =
    .label = Zerrendak
newtab-custom-widget-timer-toggle =
    .label = Tenporizadorea
newtab-custom-widget-sports-toggle =
    .label = Munduko Kopa
newtab-custom-widget-clock-toggle =
    .label = Erlojua
newtab-custom-widget-sports-toggle2 =
    .label = Kirolak
newtab-custom-widget-section-title = Widgetak
newtab-custom-widget-section-toggle =
    .label = Widgetak
newtab-widget-manage-title = Widgetak
newtab-widget-manage-widget-button =
    .label = Kudeatu widgetak
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Itxi
    .aria-label = Itxi menua
newtab-custom-close-button = Itxi
newtab-custom-settings = Kudeatu ezarpen gehiago

## New Tab Wallpapers

newtab-wallpaper-title = Horma-paperak
newtab-wallpaper-reset = Berrezarri lehenespenera
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Igo irudia
newtab-wallpaper-add-an-image = Gehitu irudia
newtab-wallpaper-custom-color = Aukeratu kolorea
newtab-wallpaper-toggle-title =
    .label = Horma-paperak
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Irudiak fitxategi-tamainaren { $file_size } MBko muga gainditzen du. Saiatu fitxategi txikiago bat igotzen.
newtab-wallpaper-error-upload-file-type = Ezin izan dugu zure fitxategia igo. Saiatu berriro irudi-fitxategi batekin.
newtab-wallpaper-error-file-type = Ezin izan dugu zure fitxategia igo. Saiatu berriro beste fitxategi mota batekin.
newtab-wallpaper-light-red-panda = Panda gorria
newtab-wallpaper-light-mountain = Mendi zuria
newtab-wallpaper-light-sky = Hodei more eta arrosadun zerua
newtab-wallpaper-light-color = Forma urdin, arrosa eta horiak
newtab-wallpaper-light-landscape = Lanbro urdindun mendiko paisaia
newtab-wallpaper-light-beach = Palmondoa duen hondartza
newtab-wallpaper-dark-aurora = Aurora boreala
newtab-wallpaper-dark-color = Forma gorri eta urdinak
newtab-wallpaper-dark-panda = Basoan ezkutatutako panda gorria
newtab-wallpaper-dark-sky = Gaueko zerudun hiriko paisaia
newtab-wallpaper-dark-mountain = Paisaia mendia
newtab-wallpaper-dark-city = Hiriko paisaia morea
newtab-wallpaper-dark-fox-anniversary = Azeria espaloian baso batetik gertu
newtab-wallpaper-light-fox-anniversary = Azeria belardi batean mendiko paisaia lanbrotsuarekin

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Kolore solidoak
newtab-wallpaper-colors = Koloreak
newtab-wallpaper-blue = Urdina
newtab-wallpaper-light-blue = Urdin argia
newtab-wallpaper-light-purple = More argia
newtab-wallpaper-light-green = Berde argia
newtab-wallpaper-green = Berdea
newtab-wallpaper-beige = Beixa
newtab-wallpaper-yellow = Horia
newtab-wallpaper-orange = Laranja
newtab-wallpaper-pink = Arrosa
newtab-wallpaper-light-pink = Arrosa argia
newtab-wallpaper-red = Gorria
newtab-wallpaper-dark-blue = Urdin iluna
newtab-wallpaper-dark-purple = More iluna
newtab-wallpaper-dark-green = Berde iluna
newtab-wallpaper-brown = Marroia

## Abstract

newtab-wallpaper-category-title-abstract = Abstraktua
newtab-wallpaper-abstract-green = Forma berdeak
newtab-wallpaper-abstract-blue = Forma urdinak
newtab-wallpaper-abstract-purple = Forma moreak
newtab-wallpaper-abstract-orange = Forma laranjak
newtab-wallpaper-gradient-orange = Gradiente laranja eta arrosa
newtab-wallpaper-abstract-blue-purple = Forma urdin eta moreak
newtab-wallpaper-abstract-white-curves = Zuria kurba itzaldunekin
newtab-wallpaper-abstract-purple-green = Gradiente more eta berde argia
newtab-wallpaper-abstract-blue-purple-waves = Forma kizkur urdin eta moreak
newtab-wallpaper-abstract-black-waves = Forma izurtsu beltzak

## Firefox

newtab-wallpaper-category-title-photographs = Argazkiak
newtab-wallpaper-beach-at-sunrise = Hondartza egunsentian
newtab-wallpaper-beach-at-sunset = Hondartza ilunabarrean
newtab-wallpaper-storm-sky = Ekaitz zerua
newtab-wallpaper-sky-with-pink-clouds = Hodei arrosadun zerua
newtab-wallpaper-red-panda-yawns-in-a-tree = Panda gorria zuhaitzean aharrausika
newtab-wallpaper-white-mountains = Mendi zuriak
newtab-wallpaper-hot-air-balloons = Globoen askotariko koloreak egunez
newtab-wallpaper-starry-canyon = Gau urdin izartsua
newtab-wallpaper-suspension-bridge = Zubi eseki grisaren argazkia egunez
newtab-wallpaper-sand-dunes = Hondar zuriko dunak
newtab-wallpaper-palm-trees = Kokondoen silueta urrezko orduan
newtab-wallpaper-blue-flowers = Loratzen dauden petalo urdindun loreen gertuko argazkilaritza
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Argazkiaren egilea: <a data-l10n-name="name-link">{ $author_string }</a>, <a data-l10n-name="webpage-link">{ $webpage_string }</a> webgunean
newtab-wallpaper-feature-highlight-header = Probatu kolore ukitu bat
newtab-wallpaper-feature-highlight-content = Emaiozu itxura berria zure fitxa berriari horma-paperekin.
newtab-wallpaper-feature-highlight-button = Ulertuta
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Utzi
    .aria-label = Itxi laster-leihoa
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Zerutarra
newtab-wallpaper-celestial-lunar-eclipse = Ilargi-eklipsea
newtab-wallpaper-celestial-earth-night = Gaueko argazkia lurraren orbita baxutik
newtab-wallpaper-celestial-starry-sky = Zeru izartua
newtab-wallpaper-celestial-eclipse-time-lapse = Ilargi-eklipsearen denbora-tartea
newtab-wallpaper-celestial-black-hole = Zulo beltz galaxiaren ilustrazioa
newtab-wallpaper-celestial-river = Ibai baten satelite-irudia

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Ikusi iragarpena { $provider } hornitzailean
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Babeslea
newtab-weather-menu-change-location = Aldatu kokapena
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Bilatu kokapena
    .aria-label = Bilatu kokapena
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Erabili uneko kokapena
newtab-weather-menu-weather-display = Eguraldia bistaratzea
newtab-weather-todays-forecast = Gaurko iragarpena
newtab-weather-see-full-forecast = Ikusi iragarpen osoa
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Sinplea
newtab-weather-menu-change-weather-display-simple = Aldatu ikuspegi sinplera
newtab-weather-menu-weather-display-option-detailed = Xehatua
newtab-weather-menu-change-weather-display-detailed = Aldatu ikuspegi xehatura
newtab-weather-menu-temperature-units = Tenperatura-unitateak
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Aldatu Fahrenheit-era
newtab-weather-menu-change-temperature-units-celsius = Aldatu Celsius-era
newtab-weather-menu-hide-weather = Ezkutatu eguraldia fitxa berrian
newtab-weather-menu-learn-more = Argibide gehiago
newtab-weather-menu-detect-my-location = Hauteman nire kokalekua
# This message is shown if user is working offline
newtab-weather-error-not-available = Eguraldiari buruzko daturik ez dago erabilgarri orain.
newtab-weather-opt-in-see-weather = Zure kokalekurako eguraldia ikusi nahi duzu?
newtab-weather-opt-in-not-now =
    .label = Une honetan ez
newtab-weather-opt-in-yes =
    .label = Bai
newtab-weather-opt-in-headline = Lortu tokiko eguraldiaren iragarpena
newtab-weather-opt-in-use-location =
    .label = Erabili kokapena
newtab-weather-opt-in-choose-location = Aukeratu kokapena
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Altua
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Baxua
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Ikusi iragarpena { $provider } hornitzailean
    .aria-description = { $provider } ∙ Babeslea

## Topic Labels

newtab-topic-label-business = Negozioak
newtab-topic-label-career = Lan-eskaintzak
newtab-topic-label-education = Hezkuntza
newtab-topic-label-arts = Entretenimendua
newtab-topic-label-food = Janaria
newtab-topic-label-health = Osasuna
newtab-topic-label-hobbies = Jokoak
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Finantzak
newtab-topic-label-society-parenting = Guraso izatea
newtab-topic-label-government = Politika
newtab-topic-label-education-science = Zientzia
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Auto-hobekuntza
newtab-topic-label-sports = Kirolak
newtab-topic-label-tech = Teknologia
newtab-topic-label-travel = Bidaiak
newtab-topic-label-home = Etxea eta lorategia

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Hautatu zure jarioa doitzeko gaiak
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Aukeratu gai bat edo gehiago. Gure adituek zure interesen neurriko istorioei ematen die lehentasuna. Eguneratu edonoiz.
newtab-topic-selection-save-button = Gorde
newtab-topic-selection-cancel-button = Utzi
newtab-topic-selection-button-maybe-later = Geroago agian
newtab-topic-selection-privacy-link = Ikasi nola babesten eta kudeatzen ditugun datuak
newtab-topic-selection-button-update-interests = Eguneratu zure interesak
newtab-topic-selection-button-pick-interests = Hautatu zure interesak

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Jarraitu
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Jarraitu { $topic }
newtab-section-following-button = Jarraitzen
newtab-section-unfollow-button = Utzi jarraitzeari
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Jarraitzen: utzi { $topic } jarraitzeari
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Doitu zure jarioa
newtab-section-follow-highlight-subtitle = Jarraitu zure interesak gustatzen zaizunetik gehiago ikusteko.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blokeatu
newtab-section-blocked-button = Blokeatuta
newtab-section-unblock-button = Desblokeatu
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Jarraitu { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Utzi { $topic } jarraitzeari
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Blokeatu { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Desblokeatu { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Une honetan ez
newtab-section-confirm-block-topic-p1 = Ziur zaude gai hau blokeatu nahi duzula?
newtab-section-confirm-block-topic-p2 = Blokeatutako gaiak ez dira gehiago azalduko zure jarioan.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Blokeatu { $topic }
newtab-section-block-cancel-button = Utzi

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Gaiak
newtab-section-manage-topics-button-v2 =
    .label = Kudeatu gaiak
newtab-section-mangage-topics-followed-topics = Jarraituta
newtab-section-mangage-topics-followed-topics-empty-state = Ez duzu inongo gairik jarraitu oraindik.
newtab-section-mangage-topics-blocked-topics = Blokeatuta
newtab-section-mangage-topics-blocked-topics-empty-state = Ez duzu inongo gairik blokeatu oraindik.
newtab-custom-wallpaper-title = Horma-paper pertsonalizatuak hemen dira
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Igo zure horma-papera edo aukeratu kolore pertsonalizatua { -brand-product-name } zure egiteko.
newtab-custom-wallpaper-cta = Probatu

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Aukeratu horma-paper bat { -brand-product-name } zure egiteko
newtab-new-user-custom-wallpaper-subtitle = Molda ezazu fitxa berri bakoitza zure modura horma-paper eta kolore pertsonalizatuekin.
newtab-new-user-custom-wallpaper-cta = Probatu orain

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Horma-paper berriak heldu berri dira
newtab-wallpaper-feature-highlight-subtitle = Aukeratu zure gogokoena eta sentitu etxean bezala fitxa berri bakoitzean.
newtab-wallpaper-feature-highlight-cta = Aukeratu horma-papera

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Deskargatu mugikorrerako { -brand-product-name }
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Eskaneatu kodea modu seguruan nabigatzeko edonon zaudela ere.
newtab-download-mobile-highlight-body-variant-b = Jarraitu utzi zenuen tokitik zure fitxak, pasahitzak eta gehiago sinkronizatzen dituzunean.
newtab-download-mobile-highlight-body-variant-c = Badakizu { -brand-product-name } aldean eraman dezakezula? Nabigatzaile berdina. Patrikan.
newtab-download-mobile-highlight-image =
    .aria-label = Mugikorrerako { -brand-product-name } deskargatzeko QR kodea

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Zure gogokoak esku-eskura
newtab-shortcuts-highlight-subtitle = Gehitu lasterbidea zure gogoko guneak klik bakarrera mantentzeko.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Zergatik ari zara honen berri ematen?
newtab-report-ads-reason-not-interested =
    .label = Ez zait interesatzen
newtab-report-ads-reason-inappropriate =
    .label = Desegokia da
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Gehiegitan ikusi dut
newtab-report-content-wrong-category =
    .label = Kategoria okerra
newtab-report-content-outdated =
    .label = Zaharkituta
newtab-report-content-inappropriate-offensive =
    .label = Desegokia edo iraingarria
newtab-report-content-spam-misleading =
    .label = Spama edo gezurretakoa
newtab-report-content-requires-payment-subscription =
    .label = Ordainketa edo harpidetza behar du
newtab-report-content-requires-payment-subscription-learn-more = Argibide gehiago
newtab-report-cancel = Utzi
newtab-report-submit = Bidali
newtab-toast-thanks-for-reporting =
    .message = Eskerrik asko hau jakinarazteagatik.
newtab-toast-widgets-hidden =
    .message = Hautatu arkatzaren ikonoa edonoiz widgetak berriz gehitzeko.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = { $topic } jarraitzen ari zara orain.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Ez zara { $topic } jarraitzen ari gehiago.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Ez duzu { $topic } gaiaren inguruko istorio gehiagorik ikusiko.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Aukerak mugagabeak dira. Gehitu bat.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Berria
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Osatuta ({ $number })
newtab-widget-lists-celebration-headline = Lan ona
newtab-widget-lists-celebration-subhead = Dena burututa
newtab-widget-task-list-menu-copy = Kopiatu
newtab-widget-lists-menu-edit = Editatu zerrendaren izena
newtab-widget-lists-menu-edit2 =
    .aria-label = Editatu zerrendaren izena
newtab-widget-lists-menu-create = Sortu zerrenda berria
newtab-widget-lists-menu-delete = Ezabatu zerrenda hau
newtab-widget-lists-menu-copy = Kopiatu zerrenda arbelean
newtab-widget-lists-menu-learn-more = Argibide gehiago
newtab-widget-lists-button-add-item = Gehitu elementua
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Gehitu elementua
    .aria-label = Gehitu elementua
newtab-widget-lists-input-error = Idatzi testua elementua gehitu ahal izateko.
newtab-widget-lists-input-menu-open-link = Ireki lotura
newtab-widget-lists-input-menu-move-up = Eraman gora
newtab-widget-lists-input-menu-move-down = Eraman behera
newtab-widget-lists-input-menu-delete = Ezabatu
newtab-widget-lists-input-menu-edit = Editatu
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Editatu elementua
newtab-widget-lists-edit-clear =
    .aria-label = Utzi
    .title = Utzi
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Sortu zerrenda berria
newtab-widget-lists-name-label-default =
    .label = Zereginen zerrenda
newtab-widget-lists-name-label-checklist =
    .label = Zerrenda
newtab-widget-lists-name-placeholder-default =
    .placeholder = Zereginen zerrenda
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Zerrenda
    .aria-label = Editatu zerrendaren izena
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Zerrenda berria
    .aria-label = Editatu zerrendaren izena
newtab-widget-section-title = Widgetak
newtab-widget-menu-hide = Ezkutatu widgeta
newtab-widget-menu-change-size = Aldatu tamaina
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Aldatu lekuz
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Ezkerrera
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Eskuinera
newtab-widget-size-small = Txikia
newtab-widget-size-medium = Ertaina
newtab-widget-size-large = Handia
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Ezkutatu widgetak
    .aria-label = Ezkutatu widget guztiak
newtab-widget-section-maximize =
    .title = Zabaldu widgetak
    .aria-label = Zabaldu widget guztiak tamaina osora
newtab-widget-section-minimize =
    .title = Minimizatu widgetak
    .aria-label = Tolestu widget guztiak tamaina trinkora
newtab-widget-section-menu-button =
    .title = Widgeten menua
    .aria-label = Ireki widgeten menua
newtab-widget-add-widgets-button =
    .aria-label = Gehitu widgeta
    .title = Gehitu widgeta
newtab-widget-section-menu-manage = Kudeatu widgetak
newtab-widget-section-menu-hide-all = Ezkutatu widgetak
newtab-widget-section-menu-learn-more = Argibide gehiago
newtab-widget-section-feedback = Emaguzu zure iritzia
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Erakutsi widget gehiago
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Erakutsi widget gutxiago
newtab-widget-lists-name-default = Zerrenda

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Tenporizadorea
newtab-widget-timer-notification-focus = Kontzentratzeko denbora amaitu da. Ondo egina. Atsedena behar duzu?
newtab-widget-timer-notification-break = Atsedena amaitu da. Kontzentratzeko prest?
newtab-widget-timer-notification-warning = Jakinarazpenak desaktibatuta daude
newtab-widget-timer-mode-focus =
    .label = Kontzentratzeko denbora
newtab-widget-timer-mode-break =
    .label = Atsedena
newtab-widget-timer-label-play =
    .label = Erreproduzitu
newtab-widget-timer-label-pause =
    .label = Pausatu
newtab-widget-timer-reset =
    .title = Berrezarri
newtab-widget-timer-menu-notifications = Desaktibatu jakinarazpenak
newtab-widget-timer-menu-notifications-on = Aktibatu jakinarazpenak
newtab-widget-timer-menu-learn-more = Argibide gehiago
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Lerroburu garrantzitsuenak
newtab-daily-briefing-card-menu-dismiss = Baztertu
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Duela { $minutes }m eguneratuta
newtab-widget-message-title = Mantendu kontzentratuta zerrendekin eta tenporizadorearekin
# to-dos stands for "things to do".
newtab-widget-message-copy = Abisu azkarretatik egunaren egitekoetara, saio zentratuetatik luzatzeko hutsuneetara — izan zereginen gainean eta garaiz.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Toki bakarra kontzentrazio, iragarpen eta gehiagorako
newtab-widget-message-focus-forecasts-body = Hartu eguna lasai { -brand-product-name }(r)en widget-ekin. Begiratu eguraldiaren iragarpena, egon atazen gainean edo egin mundu osoko orduaren jarraipena.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Moldatu { -brand-product-name } zure gustura
newtab-promo-card-body-addons = Hautatu horma-papera gure bildumatik edo sortu zurea.
newtab-promo-card-cta-addons = Probatu orain
newtab-promo-card-title = Lagundu { -brand-product-name }
newtab-promo-card-body = Gure babesleek web hobeagoa eraikitzeko misioan laguntzen gaituzte
newtab-promo-card-cta = Argibide gehiago
newtab-promo-card-dismiss-button =
    .title = Baztertu
    .aria-label = Baztertu

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Hasi minutu { $minutes }eko tenporizadorea
           *[other] Hasi { $minutes } minutuko tenporizadorea
        }
newtab-widget-timer-pause-aria =
    .aria-label = Pausatu tenporizadorea
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] Minutu { $minutes }
           *[other] { $minutes } minutu
        }
newtab-widget-timer-decrease-min =
    .title = Kendu minutu bat
newtab-widget-timer-increase-min =
    .title = Gehitu minutu bat
newtab-widget-timer-mode-group =
    .aria-label = Tenporizadorearen modua
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Kontzentrazioa
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Atsedena
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Ezkutatu tenporizadorea
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Lan bikaina
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Atsedeneko denbora amaitu da
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Atsedenaldia behar duzu?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Kontzentratzeko prest?

##

newtab-sports-widget-menu-follow-teams = Jarraitu taldeak
newtab-sports-widget-menu-view-schedule = Ikusi ordutegia
newtab-sports-widget-menu-view-upcoming = Ikusi hurrengoak
newtab-sports-widget-menu-view-results = Ikusi emaitzak
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Data garrantzitsuak
newtab-sports-widget-menu-learn-more = Argibide gehiago
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Adi-adi jarraitu Munduko Kopa
newtab-sports-widget-get-updates = Jaso partiden zuzeneko eguneraketak eta gehiago.
newtab-sports-widget-view-schedule =
    .label = Ikusi ordutegia
newtab-sports-widget-follow-teams =
    .label = Jarraitu taldeak
newtab-sports-widget-view-matches =
    .label = Ikusi partidak
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Jarraitu talde { $number } arte
       *[other] Jarraitu { $number } talde arte
    }
newtab-sports-widget-choose-wallpaper =
    .label = Aukeratu horma-papera
newtab-sports-widget-skip = Saltatu
newtab-sports-widget-search-country =
    .placeholder = Bilatu herrialdea
    .aria-label = Bilatu herrialdea
newtab-sports-widget-cancel = Utzi
newtab-sports-widget-back-button =
    .aria-label = Atzera
newtab-sports-widget-done-button =
    .label = Eginda
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (kanporatua)
newtab-sports-widget-view-all =
    .label = Ikusi dena
newtab-sports-widget-show-less =
    .label = Erakutsi gutxiago
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Jarraitzen ditudan taldeak soilik
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Ikusi
    .title = Ikusi zuzenean
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Ikusi zuzenean
    .title = Ikusi zuzenean
newtab-sports-widget-watch-dialog-close =
    .aria-label = Itxi
    .title = Itxi
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Doan
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Doako proba
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Doakoa eta ordainpekoa
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Ordainpekoa
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Zenbait partida soilik
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Zure eskualdean erabilgarri
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Beste eskualdeak
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Ireki zuzeneko transmisioa
    .title = Ireki zuzeneko transmisioa
newtab-sports-widget-group-stage = Multzokako fasea
newtab-sports-widget-group-a = A Multzoa
newtab-sports-widget-group-b = B Multzoa
newtab-sports-widget-group-c = C Multzoa
newtab-sports-widget-group-d = D Multzoa
newtab-sports-widget-group-e = E Multzoa
newtab-sports-widget-group-f = F Multzoa
newtab-sports-widget-group-g = G Multzoa
newtab-sports-widget-group-h = H Multzoa
newtab-sports-widget-group-i = I Multzoa
newtab-sports-widget-group-j = J Multzoa
newtab-sports-widget-group-k = K Multzoa
newtab-sports-widget-group-l = L Multzoa
newtab-sports-widget-round-32 = Final hogeita hamabirenak
newtab-sports-widget-round-16 = Final hamaseirenak
newtab-sports-widget-quarter-finals = Final laurdenak
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = ZUZENEAN
newtab-custom-widget-live-refresh =
    .title = Berritu emaitzak
    .aria-label = Berritu emaitzak
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Data garrantzitsuak
newtab-sports-widget-upcoming = Hurrengoak
# Used for a match currently ongoing
newtab-sports-widget-now = Orain
newtab-sports-widget-results = Emaitzak
newtab-sports-widget-semi-finals = Finalerdiak
newtab-sports-widget-bronze-finals = Brontzerako finala
# Final is the final match for 1st place.
newtab-sports-widget-final = Finala
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Atzeratuta
newtab-sports-widget-postponed = Atzeratuta
newtab-sports-widget-suspended = Bertan behera utzita
newtab-sports-widget-cancelled = Bertan behera utzita
newtab-sports-widget-information = Partidari buruzko informazioa
newtab-sports-widget-no-live-data = Partiden zuzeneko informazioa ez da eguneratzen ari une honetan
newtab-sports-widget-view-results-link = Ikusi emaitzak
newtab-sports-widget-third-place = Hirugarren postua
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Txapeldunordea
newtab-sports-widget-champions = Txapeldunak
newtab-sports-widget-world-cup-champions = 2026ko Munduko Koparen Txapeldunak
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Partidaren amaiera
newtab-sports-widget-match-halftime = Atsedenaldia
newtab-sports-widget-match-extra-time = Luzapena
newtab-sports-widget-match-penalties = Penaltiak
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = -
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Adi egon hurrengo partiden xehetasunetara

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Aurrekoa
    .title = Aurrekoa
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Hurrengoa
    .title = Hurrengoa
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Zuzeneko partida { $index }/{ $total }
    .title = Zuzeneko partida { $index }/{ $total }

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
    .aria-label = { $homeTeam }, { $homeScore } - { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) - { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Zuzenean: { $homeTeam }, { $homeScore } - { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } - { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } - { $awayTeam }, atzeratuta
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } - { $awayTeam }, atzeratuta
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } - { $awayTeam }, bertan behera
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } - { $awayTeam }, bertan behera

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnia eta Herzegovina
newtab-sports-widget-team-name-label-civ =
    .label = Boli Kosta
newtab-sports-widget-team-name-label-cod =
    .label = Kongoko Errepublika Demokratikoa
newtab-sports-widget-team-name-label-eng =
    .label = Ingalaterra
newtab-sports-widget-team-name-label-sco =
    .label = Eskozia
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Zehazteke

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Hasi Munduko Kopa horma-paper berriekin
newtab-sports-widget-message-wallpapers-body = Jarri txapelketarako partida-eguneko energia zure nabigatzailean.
newtab-sports-widget-message-wallpapers-cta = Aukeratu horma-papera
newtab-sports-widget-message-add-widgets-cta =
    .label = Gehitu widgetak
newtab-sports-widget-message-day-in-play-title = Izan eguna jokoan { -brand-product-name }(r)en widgetekin
newtab-sports-widget-message-day-in-play-body = Jarraitu Munduko Kopa, egon zereginen gainean, egin mundu osoko orduaren jarraipena eta gehiago.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Arakatu widgetak

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Baztertu
    .aria-label = Baztertu
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Molda ezazu txoko hau zure erara
newtab-activation-window-message-customization-focus-message = Aukeratu horma-paper berri bat, gehitu zure gogoko guneetarako lasterbideak eta mantendu egunean zure interesekoak diren gaietan.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Hasi pertsonalizatzen
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Zuk agintzen duzu txoko honetan
newtab-activation-window-message-values-focus-message = Nahi duzun erara nabigatzen uzten dizu { -brand-product-name }(e)k, zure online eguna hasteko modu pertsonalago batekin. Moldatu { -brand-product-name } zure erara.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Ezkutatu erlojua
newtab-clock-widget-menu-learn-more = Argibide gehiago
newtab-clock-widget-menu-edit = Editatu erlojuak
newtab-clock-widget-menu-switch-to-12h = Aldatu 12 orduko formatura
newtab-clock-widget-menu-switch-to-24h = Aldatu 24 orduko formatura
newtab-clock-widget-label-your-clocks = Zure erlojuak
newtab-clock-widget-search-location-input =
    .label = Kokapena
    .placeholder = Bilatu hiria
    .aria-label = Bilatu hiria
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Ezizena (aukerakoa)
    .placeholder = Gehitu ezizena
    .aria-label = Ezizena (aukerakoa)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Gehitu erloju berria
    .aria-label = Gehitu erloju berria
newtab-clock-widget-button-add-clock = Gehitu
newtab-clock-widget-button-cancel = Utzi
newtab-clock-widget-button-back =
    .title = Atzera
    .aria-label = Atzera
newtab-clock-widget-button-edit-clock =
    .title = Editatu erlojua
    .aria-label = Editatu erlojua
newtab-clock-widget-button-save = Gorde
newtab-clock-widget-button-remove-clock =
    .title = Kendu erlojua
    .aria-label = Kendu erlojua
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
    .aria-label = { $city }, ezizena: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Gehitu erlojua
newtab-clock-widget-edit-clock-form =
    .aria-label = Editatu erlojua
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Bilaketaren emaitzak
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Bat datorrenik ez
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Ireki erlojuaren menua
    .aria-label = Ireki erlojuaren menua
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Ezizena: { $nickname }

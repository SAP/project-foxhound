# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Tendayke Pyahu
newtab-settings-button =
    .title = Eñemomba’e ne Tendayke Pyahu roguére
newtab-customize-panel-icon-button =
    .title = Emboava ko kuatiarogue
newtab-customize-panel-icon-button-label = Ñemomba’ete
newtab-personalize-settings-icon-label =
    .title = Eñemomba’e tendayke pyahúre
    .aria-label = Ñemboheko
newtab-settings-dialog-label =
    .aria-label = Ñemboheko
newtab-personalize-icon-label =
    .title = Eñemomba’e tendayke pyahúre
    .aria-label = Eñemomba’e tendayke pyahúre
newtab-personalize-dialog-label =
    .aria-label = Ñemomba’e
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Mboyke
    .aria-label = Mboyke

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Eheka
    .aria-label = Eheka
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Eheka { $engine } ndive térã emoinge kundaharape
newtab-search-box-handoff-text-no-engine = Eheka térã ehai kundaharape
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Eheka { $engine } ndive térã emoinge kundaharape
    .title = Eheka { $engine } ndive térã emoinge kundaharape
    .aria-label = Eheka { $engine } ndive térã emoinge kundaharape
newtab-search-box-handoff-input-no-engine =
    .placeholder = Eheka térã ehai kundaharape
    .title = Eheka térã ehai kundaharape
    .aria-label = Eheka térã ehai kundaharape
newtab-search-box-text = Eheka ñandutípe
newtab-search-box-input =
    .placeholder = Eheka ñandutípe
    .aria-label = Eheka ñandutípe

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = Embojuaju hekaha
newtab-topsites-add-shortcut-header = Mbopya’eha pyahu
newtab-topsites-edit-topsites-header = Tenda Ojeikevéva Mbosako’i
newtab-topsites-edit-shortcut-header = Mbopya’eha mbosako’i
newtab-topsites-add-shortcut-label = Embojuaju jeike pya’eha
newtab-topsites-add-shortcut-title =
    .title = Embojuaju jeike pya’eha
    .aria-label = Embojuaju jeike pya’eha
newtab-topsites-title-label = Teratee
newtab-topsites-title-input =
    .placeholder = Ehai herarã
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Ehai térã emboja peteĩ URL
newtab-topsites-url-validation = Oñeikotevẽ URL oiko porãva
newtab-topsites-image-url-label = URL ra’ãnga ñemomba’etepyre
newtab-topsites-use-image-link = Ta’ãnga ñemomba’etepyre…
newtab-topsites-image-validation = Ta’ãnga nehenyhẽkuái. Eiporu peteĩ URL iñambuéva.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Heja
newtab-topsites-delete-history-button = Tembiasakue Rysýigui Ñeguenohẽ
newtab-topsites-save-button = Ñongatu
newtab-topsites-preview-button = Jehecha ypy
newtab-topsites-add-button = Embojoapy

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Añetehápepa renohẽse oimeraẽva mba’e ko toguepegua tembiasakue rysýigui?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Ko ojejapóva ndaikatuvéima oñemboguevi.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Pytyvõpyréva

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (mbojapyre)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Eike poravorãme
    .aria-label = Eike poravorãme
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Mboguete
    .aria-label = Mboguete
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Eike poravorãme
    .aria-label = Embojuruja poravorã { $title } peg̃uarã
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Embosako’i ko tenda
    .aria-label = Embosako’i ko tenda

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Mbosako’i
newtab-menu-open-new-window = Jeike Ovetã Pyahúpe
newtab-menu-open-new-private-window = Jeike Ovetã Ñemi Pyahúpe
newtab-menu-dismiss = Emboyke
newtab-menu-pin = Mboja
newtab-menu-unpin = Mboja’ỹ
newtab-menu-delete-history = Tembiasakue Rysýigui Ñeguenohẽ
newtab-menu-save-to-pocket = Eñongatu { -pocket-brand-name }-pe
newtab-menu-delete-pocket = Embogue { -pocket-brand-name }-pe
newtab-menu-archive-pocket = Eñongatu { -pocket-brand-name }-pe
newtab-menu-show-privacy-info = Ore pytyvõhára ha iñemigua
newtab-menu-about-fakespot = { -fakespot-brand-name } rehegua
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Momarandu
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Joko
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Anive ehapykueho téma

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Emboguata tetepy ykekopyre
newtab-menu-our-sponsors-and-your-privacy = Ore pytyvõhára ha nemigua
newtab-menu-report-this-ad = Emomarandu ko ñemurã rehegua

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Oĩma
newtab-privacy-modal-button-manage = Ema’ẽ tetepy mboheko tepyme’ẽpyre
newtab-privacy-modal-header = Ne ñemigua tuichamba’e.
newtab-privacy-modal-paragraph-2 =
    Ome’ẽse avei tembiasakue oporombovy’áva, avei rohechauka marandu iporãva,
    tetepy pytyvõhára poravopyre ohechajeypyre. Ani ejepy’apy, <strong>nde kundaha mba’ekuaarã tekorosã
     araka’eve ndohejái mbohasarã mba’eteéva { -brand-product-name } rehegua</strong>: ore ndorohechái ha ore pytyvõhára avei.
newtab-privacy-modal-link = Eikuaa mba’éicha omba’apo ñemigua tendayke pyahúpe

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Techaukaha Mboguete
# Bookmark is a verb here.
newtab-menu-bookmark = Techaukaha

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Emonguatia juajuha kundaharape
newtab-menu-go-to-download-page = Eho ñemboguejyha kuatiaroguépe
newtab-menu-remove-download = Emboguepa tembiasakuégui

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Ehechauka Finder-pe
       *[other] Embojuruja ñongatuha guerekopy
    }
newtab-menu-open-file = Embojuruja marandurenda

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Jeikepyre
newtab-label-bookmarked = Oñeñongatuva’ekue techaukaháramo
newtab-label-removed-bookmark = Techaukaha mboguepyre
newtab-label-recommended = Ojehechajepíva
newtab-label-saved = { -pocket-brand-name }-pe ñongatupyre
newtab-label-download = Mboguejypyre
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Tepyme’ẽmbyre
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Ohepyme’ẽva { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Pytyvõpyréva

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Emboguete vore
newtab-section-menu-collapse-section = Embopytupa vore
newtab-section-menu-expand-section = Emoasãi vore
newtab-section-menu-manage-section = Eñangareko vorére
newtab-section-menu-manage-webext = Emongu’e jepysokue
newtab-section-menu-add-topsite = Embojuaju Tenda ojeikeveha
newtab-section-menu-add-search-engine = Embojuaju hekaha
newtab-section-menu-move-up = Jupi
newtab-section-menu-move-down = Guejy
newtab-section-menu-privacy-notice = Marandu’i ñemiguáva

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Emonichĩ vore
newtab-section-expand-section-label =
    .aria-label = Emoasãi vore

## Section Headers.

newtab-section-header-topsites = Tenda Ojehechavéva
newtab-section-header-recent-activity = Tembiapo ramovegua
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } he’i ndéve reike hag̃ua
newtab-section-header-stories = Tembiasakue nemoakãngetáva
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Poravopyre ko arapegua ndéve g̃uarã

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Eñepyrũ eikundaha ha rohechaukáta ndéve mba’ehai, mba’erecharã oĩva ha ambue ñandutirenda reikeva’ekue ýrõ rembotechaukava’ekue.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Ko’ág̃a reikuaapáma ipyahúva. Eikejey ag̃ave ápe eikuaávo mombe’upy pyahu { $provider } oikuave’ẽva ndéve. Ndaikatuvéima reha’ãrõ? Eiporavo peteĩ ñe’ẽmbyrã ha emoñe’ẽve oĩvéva ñande yvy ape ári.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Ko’ág̃a reikuaapáma. Eikejey ag̃ave ápe eikuaave hag̃ua. ¿Nereha’ãrõkuaavéima? Eiporavo ñe’ẽrã ejuhu hag̃ua tembiasakue yvy ape arigua.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = ¡Rejejokóma!
newtab-discovery-empty-section-topstories-content = Ejujey ag̃ave tembiasaverã.
newtab-discovery-empty-section-topstories-try-again-button = Eha’ã jey
newtab-discovery-empty-section-topstories-loading = Henyhẽhína…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = ¡Háke! Haimete ñamyanyhẽ ko pehẽ’i, hákatu nahenyhẽmbamo’ãi.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Ñe’ẽmbyrã Ojehayhuvéva:
newtab-pocket-new-topics-title = ¿Eipotavépa tembiasakue? Ehecha téma ojehechavéva { -pocket-brand-name } rehegua
newtab-pocket-more-recommendations = Hetave je’eporã
newtab-pocket-learn-more = Kuaave
newtab-pocket-cta-button = Eguereko { -pocket-brand-name }
newtab-pocket-cta-text = Eñongatu umi eipotáva tembiasakue { -pocket-brand-name }-pe ha emombarete ne akã ñemoñe’ẽ ha’evévape.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } ha’e { -brand-product-name } pehẽngue
newtab-pocket-save = Ñongatu
newtab-pocket-saved = Ñongatupyre

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Koichaguave
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ndacheveg̃uarãi
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Aguyje. Nde jehai ore pytyvõta iporãve hag̃ua ne marandurã.
newtab-toast-dismiss-button =
    .title = Emboyke
    .aria-label = Emboyke

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Ehecha ñandutigua iporãvéva
newtab-pocket-onboarding-cta = { -pocket-brand-name } ohecha hetaichagua ñemomarandu oguerukuaa hag̃ua tetepy maranduverã, py’aho ha jerovia añete ne kundahára rehe { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Ema’ẽ, mba’épa osẽvai henyhẽnguévo ko tetepy.
newtab-error-fallback-refresh-link = Kuatiarogue mbopiro’y eñepyrũjey hag̃ua

## Customization Menu

newtab-custom-shortcuts-title = Jeike pya’eha
newtab-custom-shortcuts-subtitle = Tenda eñongatúva térã eikeha
newtab-custom-shortcuts-toggle =
    .label = Jeike pya’eha
    .description = Tenda eñongatúva térã eikeha
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } Mba’erysýi
       *[other] { $num } Mba’erysyikuéra
    }
newtab-custom-sponsored-sites = Jeike pya’eha jehepyme’ẽpyre
newtab-custom-pocket-title = { -pocket-brand-name } oñe’ẽporãha
newtab-custom-pocket-subtitle = Tetepy iporãva { -pocket-brand-name } oiporavopyre, { -brand-product-name } mba’éva pegua
newtab-custom-stories-toggle =
    .label = Tembiasakue momba’epyre
    .description = Tetepy iporãva oiporavóva { -brand-product-name } reheguáva
newtab-custom-stories-personalized-toggle =
    .label = Tembiasakue
newtab-custom-stories-personalized-checkbox-label = Tembiasakueita teéva ipyendáva ne rembiapóre
newtab-custom-pocket-sponsored = Tembiasakue jehepyme’ẽguáva
newtab-custom-pocket-show-recent-saves = Ehechauka eñongaturamóva
newtab-custom-recent-title = Tembiapo ramovegua
newtab-custom-recent-subtitle = Tenda jeporavo ha tetepy ramovegua
newtab-custom-weather-toggle =
    .label = Arapytu
    .description = Ko árape g̃uara ára
newtab-custom-widget-weather-toggle =
    .label = Arapytu
newtab-custom-widget-lists-toggle =
    .label = Tysýi
newtab-custom-widget-timer-toggle =
    .label = Aravojere
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Eñangareko widgets
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Mboty
    .aria-label = Poravorã mboty
newtab-custom-close-button = Mboty
newtab-custom-settings = Eñangareko hetave ñembohekóre

## New Tab Wallpapers

newtab-wallpaper-title = Mba’erechaha rugua
newtab-wallpaper-reset = Emoñerũjey ypyguáramo
newtab-wallpaper-upload-image = Ehupi peteĩ ta’ãnga
newtab-wallpaper-custom-color = Eiporavo peteĩ sa’y
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Ta’ãnga ohasáma tuichakuépe { $file_size } MB rehegua. Eñeha’ã ehupi marandurenda michĩvéva.
newtab-wallpaper-error-upload-file-type = Ndaikatúi rohupi marandurenda. Eha’ã jey marandurenda ambuéva reheve.
newtab-wallpaper-error-file-type = Ndaikatúi rohupi marandurenda. Eha’ã jey marandurenda ambuéva reheve.
newtab-wallpaper-light-red-panda = Panda pytã
newtab-wallpaper-light-mountain = Yvyty morotĩ
newtab-wallpaper-light-sky = Ára taijarai pytãũ ha pytãngy
newtab-wallpaper-light-color = Ysaja hovy, pytãngy ja sa’yju
newtab-wallpaper-light-landscape = Yvyty jehecha tatatina hovýva ndive
newtab-wallpaper-light-beach = Yrembe’y jata’i ndive
newtab-wallpaper-dark-aurora = Kuarahyresẽ yvategua
newtab-wallpaper-dark-color = Ysaja pytã ha hovy
newtab-wallpaper-dark-panda = Pánda pytã okañýva ñañandýpe
newtab-wallpaper-dark-sky = Táva jehecha ára pytũmby ndive
newtab-wallpaper-dark-mountain = Yvyty jehecha
newtab-wallpaper-dark-city = Táva jehecha pytãũva
newtab-wallpaper-dark-fox-anniversary = Peteĩ aguara ka’aguy mboypýri
newtab-wallpaper-light-fox-anniversary = Aguara ñu mbyte ikapi’ipéva ojehechahápe yvyty hatatĩnáva

## Solid Colors

newtab-wallpaper-category-title-colors = Sa’y ipeteĩva
newtab-wallpaper-blue = Hovy
newtab-wallpaper-light-blue = Hovy kamgy
newtab-wallpaper-light-purple = Pytãũ kangy
newtab-wallpaper-light-green = Hovyũ kangy
newtab-wallpaper-green = Hovyũ
newtab-wallpaper-beige = Morotĩngy
newtab-wallpaper-yellow = Sa’yju
newtab-wallpaper-orange = Naraha
newtab-wallpaper-pink = Pytãngy
newtab-wallpaper-light-pink = Pytãngy kangy
newtab-wallpaper-red = Ñanduti
newtab-wallpaper-dark-blue = Hovy pytũva
newtab-wallpaper-dark-purple = Pytãũ pytũva
newtab-wallpaper-dark-green = Hovyũ pytũva
newtab-wallpaper-brown = Marrõ

## Abstract

newtab-wallpaper-category-title-abstract = Hecha’ỹva
newtab-wallpaper-abstract-green = Hovyũva rehegua
newtab-wallpaper-abstract-blue = Hovýva rehegua
newtab-wallpaper-abstract-purple = Pytãũva rehegua
newtab-wallpaper-abstract-orange = Ñarã rehegua
newtab-wallpaper-gradient-orange = Oguejýva narãgui pytãngýpe
newtab-wallpaper-abstract-blue-purple = Hovy ha pytãũva rehegua
newtab-wallpaper-abstract-white-curves = Morotĩ mba’ekarẽ hi’ãva ndive
newtab-wallpaper-abstract-purple-green = Sa’ykuéra pytãũ ha hovyũ rehegua
newtab-wallpaper-abstract-blue-purple-waves = Hovy ha pytãũva rehegua
newtab-wallpaper-abstract-black-waves = Hũ ikarẽkarẽva

## Firefox

newtab-wallpaper-category-title-photographs = Ta’ãnga
newtab-wallpaper-beach-at-sunrise = Jejahuha ko’ẽmbotávo
newtab-wallpaper-beach-at-sunset = Jejahuha ka’arupytũvo
newtab-wallpaper-storm-sky = Ára vai
newtab-wallpaper-sky-with-pink-clouds = Ára arai pytãngy ndive
newtab-wallpaper-red-panda-yawns-in-a-tree = Pánda pytã hopehýi yvyráre
newtab-wallpaper-white-mountains = Yvytysyry morotĩ
newtab-wallpaper-hot-air-balloons = Globo aerostático sa’ykuéra arakuépe.
newtab-wallpaper-starry-canyon = Pyhare mbyjaita hovývareve
newtab-wallpaper-suspension-bridge = Jehasaha osãingóva ra’ãnga isa’y tanimbúva arakuépe
newtab-wallpaper-sand-dunes = Yvyku’i morotĩ atýra
newtab-wallpaper-palm-trees = Jata’i ra’ãnga aravo itajúva aja
newtab-wallpaper-blue-flowers = Yvoty hovy ra’ãnga ag̃uietégui ipotyjeráva
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Ta’ãnga <a data-l10n-name="name-link">{ $author_string }</a> <a data-l10n-name="webpage-link">{ $webpage_string }</a>-pe
newtab-wallpaper-feature-highlight-header = Eiporukuaa sa’y sa’imi
newtab-wallpaper-feature-highlight-content = Eme’ẽ ne rendayke pyahúpe jehecharã ipyahúva.
newtab-wallpaper-feature-highlight-button = Aikũmby
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Mboyke
    .aria-label = Emboty mba’e iñapysẽva
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Araregua
newtab-wallpaper-celestial-lunar-eclipse = Jasy ñemo’ã
newtab-wallpaper-celestial-earth-night = Ta’ãnga pyharegua yvyguasu ikarapeveha guive
newtab-wallpaper-celestial-starry-sky = Ára imbyjapáva
newtab-wallpaper-celestial-eclipse-time-lapse = Aravo jasy ñemo’ã aja
newtab-wallpaper-celestial-black-hole = Galaxia peteĩ kuára hũva reheve
newtab-wallpaper-celestial-river = Ysyryguasu ra’ãnga satélite guive

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Ehecha ára rehegua { $provider }-pe
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Oykekóva
newtab-weather-menu-change-location = Emoambue tendatee
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Eheka tendatee
    .aria-label = Eheka tendatee
newtab-weather-menu-weather-display = Ára jehechaha
newtab-weather-todays-forecast = Arareko ko árape g̃uarã
newtab-weather-see-full-forecast = Ehechapaite arareko
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Simple
newtab-weather-menu-change-weather-display-simple = Eva simple jehechápe
newtab-weather-menu-weather-display-option-detailed = Mba’emimi
newtab-weather-menu-change-weather-display-detailed = Eva mba’emimi jehechápe
newtab-weather-menu-temperature-units = Arareko ñeha’ãha
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Eva Fahrenheit ndive
newtab-weather-menu-change-temperature-units-celsius = Eva Celsius ndive
newtab-weather-menu-hide-weather-v2 = Eñomi arapytu
newtab-weather-menu-hide-weather = Eñomi arareko Tendayke Pyahúpe
newtab-weather-menu-learn-more = Eikuaave
newtab-weather-menu-detect-my-location = Ehecha che rendaite
# This message is shown if user is working offline
newtab-weather-error-not-available = Marandu ára rehegua ndaipóri ko’ag̃aite.
newtab-weather-opt-in-see-weather = ¿Ehechasépa ne rendaitepegua arareko?
newtab-weather-opt-in-not-now =
    .label = Ani ko’ág̃a
newtab-weather-opt-in-yes =
    .label = Héẽ
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Táva Nueva York
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Ehecha ára rehegua { $provider }-pe
    .aria-description = { $provider } ∙ Oykekóva

## Topic Labels

newtab-topic-label-business = Ñemuha
newtab-topic-label-career = Mba’apoha
newtab-topic-label-education = Tekombo’e
newtab-topic-label-arts = Mbovy’aha
newtab-topic-label-food = Tembi’u
newtab-topic-label-health = Tesãi
newtab-topic-label-hobbies = Ñembosarái
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Viru
newtab-topic-label-society-parenting = Tuvakuéra
newtab-topic-label-government = Porureko
newtab-topic-label-education-science = Tembikuaaty
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Kuaarã tekovépe g̃uarã
newtab-topic-label-sports = Tetemongu’e
newtab-topic-label-tech = Tembiporupyahu
newtab-topic-label-travel = jehomombyry
newtab-topic-label-home = Óga ha yvotyty

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Eiporavo téma emoporãve hag̃ua ne canal
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Eiporavo mokõi térã hetave téma. Ore irũ katupyry omotenonde tembiasakue ojokupytyýva eipotavéva rehe. Embohekopyahu ejapose vove.
newtab-topic-selection-save-button = Ñongatu
newtab-topic-selection-cancel-button = Heja
newtab-topic-selection-button-maybe-later = Ikatu ag̃amieve
newtab-topic-selection-privacy-link = Ehecha mba’éichapa romo’ã ha romboguata ne mba’ekuaarã
newtab-topic-selection-button-update-interests = Embohekopyahu eipotáva
newtab-topic-selection-button-pick-interests = Eiporavo eipotáva

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Tapykueho
newtab-section-following-button = Ahapykueho
newtab-section-unfollow-button = Ndahapykuehovéima
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Eiporuporã nde feed
newtab-section-follow-highlight-subtitle = Ehapykueho ndegustáva ehecha hag̃ua hetave mbaʼe.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Joko
newtab-section-blocked-button = Jokopyre
newtab-section-unblock-button = Mbojera

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ani ko’ág̃a
newtab-section-confirm-block-topic-p1 = ¿Ejokose añetehápe ko téma?
newtab-section-confirm-block-topic-p2 = Umi téma jokopyre nosẽmo’ãvéima canal-kuérape.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Ejoko { $topic }

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Téma
newtab-section-manage-topics-button-v2 =
    .label = Eñangareko témare
newtab-section-mangage-topics-followed-topics = Tapykueho
newtab-section-mangage-topics-followed-topics-empty-state = Ndohapykuehói gueteri téma.
newtab-section-mangage-topics-blocked-topics = Bloqueado
newtab-section-mangage-topics-blocked-topics-empty-state = Ndojokói gueteri mba’evéichagua téma.
newtab-custom-wallpaper-title = Ko’ápe oĩ mba’erechaha rugua
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Ehupi ne mba’erechaha teéva térã eiporavo sa’yete embohéra hag̃ua ne { -brand-product-name }.
newtab-custom-wallpaper-cta = Eha’ã jey

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Eiporavo mba’erechaha rugua ejapo hag̃ua { -brand-product-name } nemba’erã.
newtab-new-user-custom-wallpaper-subtitle = Pe tendayke pyahu toñeñandu porã mba’erechaha rugua ha sa’y eipotáva ndive.
newtab-new-user-custom-wallpaper-cta = Eiporu ko’ág̃a

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Emboguejy { -brand-product-name } ne pumbyrýpe
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Emoha’ãnga pe ayvu eikundaha hag̃ua tekorosãme ehokuévo.
newtab-download-mobile-highlight-body-variant-b = Eku’ejey eheja haguégui embojuehe rire tendayke, ñe’ẽñemi ha hetave.
newtab-download-mobile-highlight-body-variant-c = ¿Eikuaápa ikatuha eraha { -brand-product-name } nendive? Pe kundaharaite. Ne kasõ vokópe.
newtab-download-mobile-highlight-image =
    .aria-label = QR ayvu emboguejy hag̃ua { -brand-product-name } pumbyrýpe

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Eguerohoryvéva ne kuã ykerete
newtab-shortcuts-highlight-subtitle = Embojuaju jeike pya’eha ereko hag̃ua erohoryvéva nde ykére.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = ¿Mba’ére emombe’u kóva rehegua?
newtab-report-ads-reason-not-interested =
    .label = Ndaipotái mba’eve
newtab-report-ads-reason-inappropriate =
    .label = Péva nahendái
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Ahecha hetaitereirasa jey
newtab-report-content-wrong-category =
    .label = Mboja’opy oĩvaíva
newtab-report-content-outdated =
    .label = Hekopyahu’ỹva
newtab-report-content-inappropriate-offensive =
    .label = Nahendái térã oporoja’óva
newtab-report-content-spam-misleading =
    .label = Spam térã japúva
newtab-report-content-requires-payment-subscription =
    .label = Oikotevẽ jehepyme’ẽ térã ñemboheraguapy
newtab-report-content-requires-payment-subscription-learn-more = Eikuaave
newtab-report-cancel = Heja
newtab-report-submit = Mondo
newtab-toast-thanks-for-reporting =
    .message = Aguyje emomarandu haguére.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Eha’ãkuaa heta jey. Embojuaju peteĩ.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Pyahu
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Opapyre ({ $number })
newtab-widget-task-list-menu-copy = Monguatia
newtab-widget-lists-menu-edit = Embosako’i tysýi réra
newtab-widget-lists-menu-create = Emoheñói tysýi pyahu
newtab-widget-lists-menu-delete = Embogue ko tysýi
newtab-widget-lists-menu-copy = Embohasa tysýi kuatiajokohápe
newtab-widget-lists-menu-hide = Eñomimba umi tysýi
newtab-widget-lists-menu-learn-more = Eikuaave
newtab-widget-lists-input-add-an-item =
    .placeholder = Embojuaju jehaipy
newtab-widget-lists-input-error = Emoinge moñe’ẽrã embojuaju hag̃ua mba’eporurã.
newtab-widget-lists-input-menu-open-link = Joajuha ijurujáva
newtab-widget-lists-input-menu-move-up = Jehupi
newtab-widget-lists-input-menu-move-down = Emongu’e yvy gotyo
newtab-widget-lists-input-menu-delete = Mboguete
newtab-widget-lists-input-menu-edit = Mbosako’i
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Emoheñói tysýi pyahu
newtab-widget-lists-name-label-default =
    .label = Tembiaporã rysýi
newtab-widget-lists-name-placeholder-default =
    .placeholder = Tembiaporã rysýi
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = Tysýi pyahu
newtab-widget-section-title = Widgets
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Eñomi widgets
    .aria-label = Eñomimbaite widgets
newtab-widget-section-maximize =
    .title = Emyasãi widgets
    .aria-label = Emyasãimbaite widgets tuichaháicha
newtab-widget-section-minimize =
    .title = Emomichĩ widgets
    .aria-label = Emomichĩmbaite widgets tuichaháicha

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

newtab-widget-timer-notification-title = Aravojere
newtab-widget-timer-notification-focus = Opáma nde aravo. Ejapo porã. ¿Epytu’usépa?
newtab-widget-timer-notification-break = Opáma nde jepytu’u. ¿Eñepyrũ jeýkatu?
newtab-widget-timer-notification-warning = Umi ñemomarandu ojeíma
newtab-widget-timer-mode-focus =
    .label = Focus
newtab-widget-timer-mode-break =
    .label = Pytu’u
newtab-widget-timer-label-play =
    .label = Mbopu
newtab-widget-timer-label-pause =
    .label = Mombyta
newtab-widget-timer-reset =
    .title = Mbojevyjey
newtab-widget-timer-menu-notifications = Eipe’a ñemomarandu
newtab-widget-timer-menu-notifications-on = Emyandy marandu’i
newtab-widget-timer-menu-hide = Eñomi aravopapaha
newtab-widget-timer-menu-learn-more = Kuaave
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Marandu mba’eguasuvéva
newtab-daily-briefing-card-menu-dismiss = Mokañy
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Hekopyahu ojapo { $minutes }m
newtab-widget-message-title = Epyta umi tysýi ndive ha aravopapaha reheve
# to-dos stands for "things to do".
newtab-widget-message-copy = Mandu’arã guive tembiaporã peve, ñamindu’u ha jepytu’u jehetetirarã, ema’ẽ ne rembiapo ha aravo rehe.
newtab-promo-card-title = Eipytyvõ { -brand-product-name }
newtab-promo-card-body = Ore ykekohára oipytyvõ romombareteve hag̃ua ñanduti rogue
newtab-promo-card-cta = Eikuaave
newtab-promo-card-dismiss-button =
    .title = Mboyke
    .aria-label = Mboyke

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Mosẽ
    .aria-label = Mosẽ
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Eñemomba’e ko pa’ũre
newtab-activation-window-message-customization-focus-message = Eiporavo mba’erechaha rugua pyahu, embojuaju jeike pya’eha tendaita ehayhuvévape ha eikuaameme tembiasakue erohorýva
newtab-activation-window-message-customization-focus-primary-button =
    .label = Eñepyrũ emboava
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Ko pa’ũ ohuga ambue tekoguatarãme

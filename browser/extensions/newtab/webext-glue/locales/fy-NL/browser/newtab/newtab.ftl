# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nij ljepblêd
newtab-settings-button =
    .title = Jo side foar nije ljepblêden oanpasse
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Dizze side oanpasse
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Oanpasse
newtab-customize-panel-label =
    .label = Oanpasse
newtab-personalize-settings-icon-label =
    .title = Nij ljepblêd personalisearje
    .aria-label = Ynstellingen
newtab-settings-dialog-label =
    .aria-label = Ynstellingen
newtab-personalize-icon-label =
    .title = Nij ljepblêd personalisearje
    .aria-label = Nij ljepblêd personalisearje
newtab-personalize-dialog-label =
    .aria-label = Personalisearje
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Slute
    .aria-label = Slute

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Startside
home-homepage-new-windows =
    .label = Nije finsters
home-homepage-new-tabs =
    .label = Nije ljepblêden
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Kies in spesifike website

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Websiteadres(sen)
home-custom-homepage-address =
    .placeholder = Fier adres yn
home-custom-homepage-address-button =
    .label = Adres tafoegje
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Noch gjin websites tafoege.
home-custom-homepage-delete-address-button =
    .aria-label = Adres fuortsmite
    .title = Adres fuortsmite
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Ferfange troch
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Aktuele iepene siden
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Blêdwizers…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Sykje
home-prefs-stories-header2 =
    .label = Ferhalen
    .description = Utsûnderlike ynhâld, sammele troch de { -brand-product-name }-famylje
home-prefs-widgets-header =
    .label = Widgets
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listen
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Timer
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Klok
home-prefs-mission-message2 =
    .message = Us sponsors stypje ús misje om in better web te bouwen.
home-prefs-manage-topics-link2 =
    .label = Underwerpen beheare
home-prefs-choose-wallpaper-link2 =
    .label = Kies in eftergrûn
home-prefs-firefox-logo-header =
    .label = { -brand-short-name }-logo
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Stel nije ljepblêden of nije finsters yn op { -firefox-home-brand-name } om dizze funksjes te brûken.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } rige
           *[other] { $num } rigen
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Utwreiding ({ $extension })
home-restore-defaults-srd =
    .label = Standert werstelle
    .accesskey = w
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (standert)
home-mode-choice-custom-srd =
    .label = Oanpaste URL’s
home-mode-choice-blank-srd =
    .label = Lege side
home-prefs-shortcuts-header-srd =
    .label = Fluchkeppelingen
home-prefs-shortcuts-select =
    .aria-label = Fluchkeppelingen
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponsore fluchkeppelingen
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponsore ferhalen
home-prefs-highlights-option-visited-pages-srd =
    .label = Besochte siden
home-prefs-highlights-options-bookmarks-srd =
    .label = Blêdwizers
home-prefs-highlights-option-most-recent-download-srd =
    .label = Meast resinte download
home-prefs-recent-activity-header-srd =
    .label = Resinte aktiviteit
home-prefs-recent-activity-select =
    .aria-label = Resinte aktiviteit
home-prefs-weather-header-srd =
    .label = It waar
home-prefs-support-firefox-header-srd =
    .label = { -brand-product-name } stypje
home-prefs-mission-message-learn-more-link-srd = Lês hjir hoe

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Sykje
    .aria-label = Sykje
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Mei { $engine } sykje of fier adres yn
newtab-search-box-handoff-text-no-engine = Fier sykterm of adres yn
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Mei { $engine } sykje of fier adres yn
    .title = Mei { $engine } sykje of fier adres yn
    .aria-label = Mei { $engine } sykje of fier adres yn
newtab-search-box-handoff-input-no-engine =
    .placeholder = Fier sykterm of adres yn
    .title = Fier sykterm of adres yn
    .aria-label = Fier sykterm of adres yn
newtab-search-box-text = Sykje op it web
newtab-search-box-input =
    .placeholder = Sykje op it web
    .aria-label = Sykje op it web

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Sykmasine tafoegje
newtab-topsites-add-shortcut-header = Nije fluchkeppeling
newtab-topsites-edit-topsites-header = Topwebsite tafoegje
newtab-topsites-edit-shortcut-header = Fluchkeppeling bewurkje
newtab-topsites-add-shortcut-label = Fluchkeppeling tafoegje
newtab-topsites-add-shortcut-title =
    .title = Fluchkeppeling tafoegje
    .aria-label = Fluchkeppeling tafoegje
newtab-topsites-title-label = Titel
newtab-topsites-title-input =
    .placeholder = Titel ynfiere
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Typ of plak in URL
newtab-topsites-url-validation = Jildige URL fereaske
newtab-topsites-image-url-label = URL fan oanpaste ôfbylding
newtab-topsites-use-image-link = In oanpaste ôfbylding brûke…
newtab-topsites-image-validation = Ofbylding koe net laden wurde. Probearje in oare URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Tekst wiskje

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Annulearje
newtab-topsites-delete-history-button = Fuortsmite út skiednis
newtab-topsites-save-button = Bewarje
newtab-topsites-preview-button = Foarbyld
newtab-topsites-add-button = Tafoegje

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Binne jo wis dat jo elke ferwizing fan dizze side út jo skiednis fuortsmite wolle?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Dizze aksje kin net ûngedien makke wurde.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsore

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (fêstset)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Menu iepenje
    .aria-label = Menu iepenje
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Fuortsmite
    .aria-label = Fuortsmite
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Menu iepenje
    .aria-label = Kontekstmenu foar { $title } iepenje
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Dizze side bewurkje
    .aria-label = Dizze side bewurkje

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Bewurkje
newtab-menu-open-new-window = Iepenje yn in nij finster
newtab-menu-open-new-private-window = Iepenje yn in nij priveefinster
newtab-menu-dismiss = Fuortsmite
newtab-menu-pin = Fêstsette
newtab-menu-unpin = Losmeitsje
newtab-menu-delete-history = Fuortsmite út skiednis
newtab-menu-save-to-pocket = Bewarje nei { -pocket-brand-name }
newtab-menu-delete-pocket = Fuortsmite út { -pocket-brand-name }
newtab-menu-archive-pocket = Argivearje yn { -pocket-brand-name }
newtab-menu-show-privacy-info = Us sponsors en jo privacy
newtab-menu-about-fakespot = Oer { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Rapportearje
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Blokkearje
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Untfolgje
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Mear ynfo
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Underwerp net mear folgje

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Sponsore ynhâld beheare
newtab-menu-our-sponsors-and-your-privacy = Us sponsors en jo privacy
newtab-menu-report-this-ad = Dizze advertinsje rapportearje

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Dien
newtab-privacy-modal-button-manage = Ynstellingen foar sponsore ynhâld beheare
newtab-privacy-modal-header = Jo privacy is wichtich.
newtab-privacy-modal-paragraph-2 =
    Neist it fertellen fan boeiende ferhalen, toane wy jo ek relevante,
    goed trochljochte ynhâld fan selektearre sponsors. Wês gerêst, <strong>jo navigaasjegegevens
    ferlitte nea jo persoanlike eksimplaar fan { -brand-product-name }</strong> – wy krije se net te sjen,
    en ús sponsors ek net.
newtab-privacy-modal-link = Untdek hoe’t privacy wurket op it nije ljepblêd

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Blêdwizer fuortsmite
# Bookmark is a verb here.
newtab-menu-bookmark = Blêdwizer

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Downloadkeppeling kopiearje
newtab-menu-go-to-download-page = Nei downloadside gean
newtab-menu-remove-download = Fuortsmite út skiednis

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Toane yn Finder
       *[other] Byhearrende map iepenje
    }
newtab-menu-open-file = Bestân iepenje

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Besocht
newtab-label-bookmarked = Blêdwizer makke
newtab-label-removed-bookmark = Blêdwizer fuortsmiten
newtab-label-recommended = Trending
newtab-label-saved = Bewarre nei { -pocket-brand-name }
newtab-label-download = Download
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsore
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsore troch { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min.
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsore

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Seksje fuortsmite
newtab-section-menu-collapse-section = Seksje ynklappe
newtab-section-menu-expand-section = Seksje útklappe
newtab-section-menu-manage-section = Seksje beheare
newtab-section-menu-manage-webext = Utwreiding beheare
newtab-section-menu-add-topsite = Topwebsite tafoegje
newtab-section-menu-add-search-engine = Sykmasine tafoegje
newtab-section-menu-move-up = Omheech ferpleatse
newtab-section-menu-move-down = Omleech ferpleatse
newtab-section-menu-privacy-notice = Privacyferklearring

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Seksje ynklappe
newtab-section-expand-section-label =
    .aria-label = Seksje útklappe

## Section Headers.

newtab-section-header-topsites = Topwebsites
newtab-section-header-recent-activity = Resinte aktiviteit
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Oanrekommandearre troch { $provider }
newtab-section-header-stories = Ferhalen dy’t ta neitinken stimme
# "picks" refers to recommended articles
newtab-section-header-todays-picks = De karren fan hjoed foar jo

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Start mei sneupen en wy toane jo guon moaie artikelen, fideo’s en oare siden dy’t jo resint besocht hawwe of in blêdwizer fan makke hawwe.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Jo binne by. Kom letter werom foar mear ferhalen fan { $provider }. Kin jo net wachtsje? Selektearje in populêr ûnderwerp om mear ferhalen fan it ynternet te finen.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Jo binne wer by. Kom letter werom foar mear ferhalen. Kin jo net wachtsje? Selektearje in populêr ûnderwerp om mear bjusterbaarlike ferhalen fan it hiele web te finen.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Jo binne folslein by!
newtab-discovery-empty-section-topstories-content = Kom letter werom foar mear ferhalen.
newtab-discovery-empty-section-topstories-try-again-button = Opnij probearje
newtab-discovery-empty-section-topstories-loading = Lade…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Oeps! Wy hiene dizze seksje hast laden, mar dochs net hielendal.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Populêre ûnderwerpen:
newtab-pocket-new-topics-title = Wolle jo noch mear ferhalen? Besjoch dizze populêre ûnderwerpen fan { -pocket-brand-name }
newtab-pocket-more-recommendations = Mear oanrekommandaasjes
newtab-pocket-learn-more = Mear ynfo
newtab-pocket-cta-button = { -pocket-brand-name } brûke
newtab-pocket-cta-text = Bewarje de ferhalen dy’t jo ynteressant fine yn { -pocket-brand-name }, en stimulearje jo tinzen mei boeiende lêsstof.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } is ûnderdiel fan de { -brand-product-name }-famylje
newtab-pocket-save = Bewarje
newtab-pocket-saved = Bewarre

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Mear lykas dit
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Neat foar my
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Tank. Jo feedback sil ús helpe om jo feed te ferbetterjen.
newtab-toast-dismiss-button =
    .title = Slute
    .aria-label = Slute

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Untdek it bêste fan ynternet
newtab-pocket-onboarding-cta = { -pocket-brand-name } ferkent in breed skala oan publikaasjes om de meast ynformative, ynspirearjende en betroubere ynhâld streekrjocht nei jo { -brand-product-name }-browser te bringen.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Oeps, der is wat misgien by it laden fan dizze ynhâld.
newtab-error-fallback-refresh-link = Fernij de side om it opnij te probearjen.

## Customization Menu

newtab-custom-shortcuts-title = Fluchkeppelingen
newtab-custom-shortcuts-subtitle = Bewarre of besochte websites
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Fluchkeppelingen
    .description = Bewarre of besochte websites
newtab-custom-shortcuts-nova =
    .label = Fluchkeppelingen
newtab-custom-row-description =
    .description = Oantal rigen
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } rige
           *[other] { $num } rigen
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } rige
       *[other] { $num } rigen
    }
newtab-custom-sponsored-sites = Sponsore fluchkeppelingen
newtab-custom-pocket-title = Oanrekommandearre troch { -pocket-brand-name }
newtab-custom-pocket-subtitle = Utsûnderlike ynhâld, gearstald troch { -pocket-brand-name }, ûnderdiel fan de { -brand-product-name }-famylje
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Oanrekommandearre ferhalen
    .description = Utsûnderlike ynhâld, sammele troch de { -brand-product-name }-famylje
newtab-recommended-stories-toggle =
    .label = Oanrekommandearre ferhalen
newtab-custom-stories-personalized-toggle =
    .label = Ferhalen
newtab-custom-stories-personalized-checkbox-label = Personalisearre ferhalen op basis fan jo aktiviteit
newtab-custom-pocket-sponsored = Sponsore ferhalen
newtab-custom-pocket-show-recent-saves = Koartlyn bewarre items toane
newtab-custom-recent-title = Resinte aktiviteit
newtab-custom-recent-subtitle = In seleksje fan resinte websites en ynhâld
newtab-custom-weather-toggle =
    .label = It waar
    .description = De waarsferwachting fan hjoed yn ien eachopslach
newtab-custom-widget-weather-toggle =
    .label = It waar
newtab-custom-widget-lists-toggle =
    .label = Listen
newtab-custom-widget-timer-toggle =
    .label = Timer
newtab-custom-widget-sports-toggle =
    .label = Wrâldkampioenskip
newtab-custom-widget-clock-toggle =
    .label = Klok
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Widgets beheare
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Slute
    .aria-label = Menu slute
newtab-custom-close-button = Slute
newtab-custom-settings = Mear ynstellingen beheare

## New Tab Wallpapers

newtab-wallpaper-title = Eftergrûnen
newtab-wallpaper-reset = Standertwearden
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = In ôfbylding oplade
newtab-wallpaper-add-an-image = Ofbylding tafoegje
newtab-wallpaper-custom-color = Kies in kleur
newtab-wallpaper-toggle-title =
    .label = Eftergrûnen
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = De ôfbylding giet oer de limyt fan { $file_size } MB. Probearje in lytser bestân op te laden.
newtab-wallpaper-error-upload-file-type = Wy koene jo bestân net oplade. Probearje it opnij mei in ôfbyldingsbestân.
newtab-wallpaper-error-file-type = Wy koene jo bestân net oplade. Probearje it nochris mei in oar bestânstype.
newtab-wallpaper-light-red-panda = Reade panda
newtab-wallpaper-light-mountain = Wite berch
newtab-wallpaper-light-sky = Himel mei pearze en rôze wolken
newtab-wallpaper-light-color = Blauwe, rôze en giele foarmen
newtab-wallpaper-light-landscape = Berch lânskip mei blauwe mist
newtab-wallpaper-light-beach = Strân mei palmbeam
newtab-wallpaper-dark-aurora = Noarderljocht
newtab-wallpaper-dark-color = Reade en blauwe foarmen
newtab-wallpaper-dark-panda = Reade panda ferburgen yn bosk
newtab-wallpaper-dark-sky = Stedslânskip mei in nachthimel
newtab-wallpaper-dark-mountain = Lânskip mei berch
newtab-wallpaper-dark-city = Pears stêdslânskip
newtab-wallpaper-dark-fox-anniversary = In foks op de stoepe by in bosk
newtab-wallpaper-light-fox-anniversary = In foks yn in gersfjild mei in mistich berchlânskip

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Effen kleuren
newtab-wallpaper-colors = Kleuren
newtab-wallpaper-blue = Blau
newtab-wallpaper-light-blue = Ljochtblau
newtab-wallpaper-light-purple = Ljochtpears
newtab-wallpaper-light-green = Ljochtgrien
newtab-wallpaper-green = Grien
newtab-wallpaper-beige = Bêzje
newtab-wallpaper-yellow = Giel
newtab-wallpaper-orange = Oranje
newtab-wallpaper-pink = Rôze
newtab-wallpaper-light-pink = Ljochtrôze
newtab-wallpaper-red = Read
newtab-wallpaper-dark-blue = Donkerblau
newtab-wallpaper-dark-purple = Donkerpears
newtab-wallpaper-dark-green = Donkergrien
newtab-wallpaper-brown = Brún

## Abstract

newtab-wallpaper-category-title-abstract = Abstrakt
newtab-wallpaper-abstract-green = Griene foarmen
newtab-wallpaper-abstract-blue = Blauwe foarmen
newtab-wallpaper-abstract-purple = Pearze foarmen
newtab-wallpaper-abstract-orange = Oranje foarmen
newtab-wallpaper-gradient-orange = Ferrin oranje en rôze
newtab-wallpaper-abstract-blue-purple = Blauwe en pearze foarmen
newtab-wallpaper-abstract-white-curves = Wyt mei arsearre rûningen
newtab-wallpaper-abstract-purple-green = Pears en griene ljochtgradiïnt
newtab-wallpaper-abstract-blue-purple-waves = Blauwe en pearze golvjende foarmen
newtab-wallpaper-abstract-black-waves = Swarte golvjende foarmen

## Firefox

newtab-wallpaper-category-title-photographs = Foto’s
newtab-wallpaper-beach-at-sunrise = Strân by sinneopgong
newtab-wallpaper-beach-at-sunset = Strân by sinneûndergong
newtab-wallpaper-storm-sky = Tongerloft
newtab-wallpaper-sky-with-pink-clouds = Loft mei rôze wolken
newtab-wallpaper-red-panda-yawns-in-a-tree = Reade panda gappet yn in beam
newtab-wallpaper-white-mountains = Wite bergen
newtab-wallpaper-hot-air-balloons = Hjitteluchtballonnen in ferskate kleuren oerdeis
newtab-wallpaper-starry-canyon = Blauwe stjerrenacht
newtab-wallpaper-suspension-bridge = Foto’s fan in folsleine hingbrêge oerdeis
newtab-wallpaper-sand-dunes = Wite sândunen
newtab-wallpaper-palm-trees = Silhûet fan kokospalms wylst gouden oere
newtab-wallpaper-blue-flowers = Close-upfotografy fan blauwe blommen yn bloei
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto troch <a data-l10n-name="name-link">{ $author_string }</a> op <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Probearje in bytsje kleur
newtab-wallpaper-feature-highlight-content = Jou jo Nije-ljepblêdside in frisse útstrieling mei eftergrûnen.
newtab-wallpaper-feature-highlight-button = Begrepen
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Slute
    .aria-label = Pop-up slute
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Kosmysk
newtab-wallpaper-celestial-lunar-eclipse = Moannefertsjustering
newtab-wallpaper-celestial-earth-night = Nachtfoto fan in lege baan om de ierde út
newtab-wallpaper-celestial-starry-sky = Stjerrehimel
newtab-wallpaper-celestial-eclipse-time-lapse = Time-lapse fan moannefertsjustering
newtab-wallpaper-celestial-black-hole = Yllustraasje fan in swart-gatstjerrestelsel
newtab-wallpaper-celestial-river = Satellytfoto fan rivier

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = It waar besjen foar { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsore
newtab-weather-menu-change-location = Lokaasje wizigje
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Lokaasje sykje
    .aria-label = Lokaasje sykje
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Aktuele lokaasje brûke
newtab-weather-menu-weather-display = Waarwerjefte
newtab-weather-todays-forecast = Waarfoarsizzing foar hjoed
newtab-weather-see-full-forecast = Folsleine waarfoarsizzing besjen
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Ienfâldich
newtab-weather-menu-change-weather-display-simple = Wikselje nei ienfâldige werjefte
newtab-weather-menu-weather-display-option-detailed = Detaillearre
newtab-weather-menu-change-weather-display-detailed = Wikselje nei detaillearre werjefte
newtab-weather-menu-temperature-units = Temperatuerienheden
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Wikselje nei Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Wikselje nei Celsius
newtab-weather-menu-hide-weather = It waar op nij ljepblêd ferstopje
newtab-weather-menu-learn-more = Mear ynfo
newtab-weather-menu-detect-my-location = Myn lokaasje detektearje
# This message is shown if user is working offline
newtab-weather-error-not-available = Waargegevens binne op dit stuit net beskikber.
newtab-weather-opt-in-see-weather = Wolle jo it waar foar jo lokaasje sjen?
newtab-weather-opt-in-not-now =
    .label = No net
newtab-weather-opt-in-yes =
    .label = Ja
newtab-weather-opt-in-headline = Jo lokale waarsfoarútsjoch opfreegje
newtab-weather-opt-in-use-location =
    .label = Lokaasje brûke
newtab-weather-opt-in-choose-location = Lokaasje kieze
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Heech
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Leech
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = It waar besjen foar { $provider }
    .aria-description = { $provider } ∙ Sponsore

## Topic Labels

newtab-topic-label-business = Saaklik
newtab-topic-label-career = Karriêren
newtab-topic-label-education = Underwiis
newtab-topic-label-arts = Ferdivedaasje
newtab-topic-label-food = Iten
newtab-topic-label-health = Sûnens
newtab-topic-label-hobbies = Gaming
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Jild
newtab-topic-label-society-parenting = Alderskip en opfieding
newtab-topic-label-government = Polityk
newtab-topic-label-education-science = Wittenskip
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Lifehacks
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Technology
newtab-topic-label-travel = Reizgjen
newtab-topic-label-home = Hûs en tún

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Selektearje ûnderwerpen om jo feed te ferfynjen
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Kies twa of mear ûnderwerpen. Us saakkundige kurators prioritearje ferhalen ôfstimd op jo ynteressen. Wurkje op elk momint by.
newtab-topic-selection-save-button = Bewarje
newtab-topic-selection-cancel-button = Annulearje
newtab-topic-selection-button-maybe-later = Miskien letter
newtab-topic-selection-privacy-link = Lês hoe’t wy gegevens beskermje en beheare
newtab-topic-selection-button-update-interests = Wurkje jo ynteressen by
newtab-topic-selection-button-pick-interests = Kies jo ynteressen

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Folgje
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = { $topic } folgje
newtab-section-following-button = Folgjend
newtab-section-unfollow-button = Untfolgje
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Folgjend: { $topic } net mear folgje
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Jo feed ferfynje
newtab-section-follow-highlight-subtitle = Folgje jo ynteressen om mear te sjen fan dêr’t jo wol oer meie.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Blokkearje
newtab-section-blocked-button = Blokkearre
newtab-section-unblock-button = Blokkearring opheffe
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = { $topic } folgje
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = { $topic } net mear folgje
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = { $topic } blokkearje
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Blokkearring { $topic } opheffe

## Confirmation modal for blocking a section

newtab-section-cancel-button = No net
newtab-section-confirm-block-topic-p1 = Binne jo wis dat jo dit ûnderwerp blokkearje wolle?
newtab-section-confirm-block-topic-p2 = Blokkearre ûnderwerpen ferskine net mear yn jo feed.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } blokkearje
newtab-section-block-cancel-button = Annulearje

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Underwerpen
newtab-section-manage-topics-button-v2 =
    .label = Underwerpen beheare
newtab-section-mangage-topics-followed-topics = Folge
newtab-section-mangage-topics-followed-topics-empty-state = Jo hawwe noch gjin ûnderwerpen folge.
newtab-section-mangage-topics-blocked-topics = Blokkearre
newtab-section-mangage-topics-blocked-topics-empty-state = Jo hawwe noch gjin ûnderwerpen blokkearre.
newtab-custom-wallpaper-title = Hjir fine jo oanpaste eftergrûnen
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Laad jo eigen eftergrûn op of kies in oanpaste kleur om { -brand-product-name } fan josels te meitsjen.
newtab-custom-wallpaper-cta = Probearje

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Kies in eftergrûn om { -brand-product-name } fan jo te meitsjen
newtab-new-user-custom-wallpaper-subtitle = Lit elk nij ljepblêd as thús fiele mei oanpaste eftergrûnen en kleuren.
newtab-new-user-custom-wallpaper-cta = No probearje

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Der binne frisse nije eftergrûnen binnen
newtab-wallpaper-feature-highlight-subtitle = Kies jo favoryt en lit elk nij ljepblêd as thús fiele.
newtab-wallpaper-feature-highlight-cta = Eftergrûn kieze

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = { -brand-product-name } foar mobyl downloade
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Scan de koade om feilich ûnderweis te navigearjen.
newtab-download-mobile-highlight-body-variant-b = Gean troch wêr’t jo bleaun wiene wannear’t jo jo ljepblêden, wachtwurden en mear syngronisearje.
newtab-download-mobile-highlight-body-variant-c = Wisten jo dat jo { -brand-product-name } ek ûnderweis meinimme kinne? Deselde browser. Yn jo bûse.
newtab-download-mobile-highlight-image =
    .aria-label = QR-koade om { -brand-product-name } foar mobyl te downloaden

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Jo favoriten foar de hân
newtab-shortcuts-highlight-subtitle = Foegje in fluchkeppeling ta om jo favorite websites op ien klik ôfstân te hâlden.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Wêrom melde jo dit?
newtab-report-ads-reason-not-interested =
    .label = Ik bin net ynteressearre
newtab-report-ads-reason-inappropriate =
    .label = It is net geskikt
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Ik haw it te faak sjoen
newtab-report-content-wrong-category =
    .label = Ferkearde kategory
newtab-report-content-outdated =
    .label = Ferâldere
newtab-report-content-inappropriate-offensive =
    .label = Unpaslik of beledigjend
newtab-report-content-spam-misleading =
    .label = Spam of misliedend
newtab-report-content-requires-payment-subscription =
    .label = Fereasket betelling of abonnemint
newtab-report-content-requires-payment-subscription-learn-more = Mear ynfo
newtab-report-cancel = Annulearje
newtab-report-submit = Yntsjinje
newtab-toast-thanks-for-reporting =
    .message = Tank foar it melden.
newtab-toast-widgets-hidden =
    .message = Selektearje it potleadpiktogram om op elk momint widgets wer ta te foegjen.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Jo folgje no { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Jo folgje { $topic } net mear.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Jo sjogge gjin ferhalen oer { $topic } mear.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = De mooglikheden binne einleas. Foegje der ien ta.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nij
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Foltôge ({ $number })
newtab-widget-lists-celebration-headline = Goed wurk
newtab-widget-lists-celebration-subhead = Alles dien
newtab-widget-task-list-menu-copy = Kopiearje
newtab-widget-lists-menu-edit = Listnamme bewurkje
newtab-widget-lists-menu-edit2 =
    .aria-label = Listnamme bewurkje
newtab-widget-lists-menu-create = Nije list oanmeitsje
newtab-widget-lists-menu-delete = Dizze list fuortsmite?
newtab-widget-lists-menu-copy = List nei klamboerd kopiearje
newtab-widget-lists-menu-learn-more = Mear ynfo
newtab-widget-lists-button-add-item = In item tafoegje
newtab-widget-lists-input-add-an-item2 =
    .placeholder = In item tafoegje
    .aria-label = In item tafoegje
newtab-widget-lists-input-error = Foegje tekst ta om in item ta te foegjen.
newtab-widget-lists-input-menu-open-link = Keppeling iepenje
newtab-widget-lists-input-menu-move-up = Omheech ferpleatse
newtab-widget-lists-input-menu-move-down = Omleech ferpleatse
newtab-widget-lists-input-menu-delete = Fuortsmite
newtab-widget-lists-input-menu-edit = Bewurkje
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Item bewurkje
newtab-widget-lists-edit-clear =
    .aria-label = Annulearje
    .title = Annulearje
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + In nije list oanmeitsje
newtab-widget-lists-name-label-default =
    .label = Takelist
newtab-widget-lists-name-label-checklist =
    .label = Kontrôlelist
newtab-widget-lists-name-placeholder-default =
    .placeholder = Takelist
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Kontrôlelist
    .aria-label = Listnamme bewurkje
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nije list
    .aria-label = Listnamme bewurkje
newtab-widget-section-title = Widgets
newtab-widget-menu-hide = Widget ferstopje
newtab-widget-menu-change-size = Grutte wizigje
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Ferpleatse
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Links
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Rjochts
newtab-widget-size-small = Lyts
newtab-widget-size-medium = Normaal
newtab-widget-size-large = Grut
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Widgets ferstopje
    .aria-label = Alle widgets ferstopje
newtab-widget-section-maximize =
    .title = Widgets útklappe
    .aria-label = Alle widgets oant folsleine ôfmjitting útklappe
newtab-widget-section-minimize =
    .title = Widgets minimalisearje
    .aria-label = Alle widgets ynklappe oant kompakte ôfmjitting
newtab-widget-section-menu-button =
    .title = Menu Widgets
    .aria-label = Menu Widgets iepenje
newtab-widget-add-widgets-button =
    .aria-label = Widget tafoegje
    .title = Widget tafoegje
newtab-widget-section-menu-manage = Widgets beheare
newtab-widget-section-menu-hide-all = Widgets ferstopje
newtab-widget-section-menu-learn-more = Mear ynfo
newtab-widget-section-feedback = Fertel ús wat jo tinke
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Mear widgets toane
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Minder widgets toane
newtab-widget-lists-name-default = Kontrôlelist

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Timer
newtab-widget-timer-notification-focus = De fokustiid is foarby. Goed dien. Skoft?
newtab-widget-timer-notification-break = Jo skoft is foarby. Ree om te fokusjen?
newtab-widget-timer-notification-warning = Notifikaasjes stean út
newtab-widget-timer-mode-focus =
    .label = Fokus
newtab-widget-timer-mode-break =
    .label = Skoft
newtab-widget-timer-label-play =
    .label = Ofspylje
newtab-widget-timer-label-pause =
    .label = Pauzearje
newtab-widget-timer-reset =
    .title = Opnij inisjalisearje
newtab-widget-timer-menu-notifications = Notifikaasjes útskeakelje
newtab-widget-timer-menu-notifications-on = Notifikaasjes ynskeakelje
newtab-widget-timer-menu-learn-more = Mear ynfo
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Topberjochten
newtab-daily-briefing-card-menu-dismiss = Slute
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = { $minutes } min. lyn bywurke
newtab-widget-message-title = Bliuw fokust mei listen en in ynboude timer
# to-dos stands for "things to do".
newtab-widget-message-copy = Fan rappe yn ’t sin bringers oant deistige taken, fokussesjes oant stretchskoft – bliuw by de taak en op tiid.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Ien plak foar fokus, waarfoarsizzingen en mear
newtab-widget-message-focus-forecasts-body = Hâld jo dei soepel mei { -brand-product-name }-widgets. Kontrolearje de waarfoarsizzing, bliuw by de les, of folgje de tiid oer de hiele wrâld.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Meitsje { -brand-product-name } fan josels
newtab-promo-card-body-addons = Kies in eftergrûn út ús kolleksje, of meitsje jo eigen.
newtab-promo-card-cta-addons = No probearje
newtab-promo-card-title = { -brand-product-name } stypje
newtab-promo-card-body = Us sponsors stypje ús misje om in better web te bouwen
newtab-promo-card-cta = Mear ynfo
newtab-promo-card-dismiss-button =
    .title = Slute
    .aria-label = Slute

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] { $minutes }-minút-timer starte
           *[other] { $minutes }-minuten-timer starte
        }
newtab-widget-timer-pause-aria =
    .aria-label = Timer pauzearje
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minút
           *[other] { $minutes } minuten
        }
newtab-widget-timer-decrease-min =
    .title = Mei 1 minút ferminderje
newtab-widget-timer-increase-min =
    .title = Mei 1 minút ferlingje
newtab-widget-timer-mode-group =
    .aria-label = Timermodus
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Fokus
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Skoft
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Timer ferstopje
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Moai wurk
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Jo skoft is foarby
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Skoft nedich?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Klear om te fokusjen?

##

newtab-sports-widget-menu-follow-teams = Teams folgje
newtab-sports-widget-menu-view-schedule = Tiidskema besjen
newtab-sports-widget-menu-view-upcoming = Folgjende toane
newtab-sports-widget-menu-view-results = Resultaten besjen
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Wichtige datums
newtab-sports-widget-menu-learn-more = Mear ynfo
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Hâld it WK yn ’e gaten
newtab-sports-widget-get-updates = Untfang live wedstriidupdates en mear.
newtab-sports-widget-view-schedule =
    .label = Tiidskema besjen
newtab-sports-widget-follow-teams =
    .label = Teams folgje
newtab-sports-widget-view-matches =
    .label = Wedstriden besjen
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Folgje maksimaal { $number } team
       *[other] Folgje maksimaal { $number } teams
    }
newtab-sports-widget-choose-wallpaper =
    .label = Kies in eftergrûn
newtab-sports-widget-skip = Oerslaan
newtab-sports-widget-search-country =
    .placeholder = Lân sykje
    .aria-label = Lân sykje
newtab-sports-widget-cancel = Annulearje
newtab-sports-widget-back-button =
    .aria-label = Tebek
newtab-sports-widget-done-button =
    .label = Dien
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (útskeakele)
newtab-sports-widget-view-all =
    .label = Alles besjen
newtab-sports-widget-show-less =
    .label = Minder toane
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Allinnich folge teams
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Besjen
    .title = Live besjen
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Live besjen
    .title = Live besjen
newtab-sports-widget-watch-dialog-close =
    .aria-label = Slute
    .title = Slute
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Fergees
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Fergeze proefperioade
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Fergees en betelle
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Betelle
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Allinnich bepaalde wedstriden
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Beskikber yn jo regio
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Oare regio’s
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Stream iepenje
    .title = Stream iepenje
newtab-sports-widget-group-stage = Groepsfase
newtab-sports-widget-group-a = Groep A
newtab-sports-widget-group-b = Groep B
newtab-sports-widget-group-c = Groep C
newtab-sports-widget-group-d = Groep D
newtab-sports-widget-group-e = Groep E
newtab-sports-widget-group-f = Groep F
newtab-sports-widget-group-g = Groep G
newtab-sports-widget-group-h = Groep H
newtab-sports-widget-group-i = Groep I
newtab-sports-widget-group-j = Groep J
newtab-sports-widget-group-k = Groep K
newtab-sports-widget-group-l = Groep L
newtab-sports-widget-round-32 = Ronde fan 32
newtab-sports-widget-round-16 = Ronde fan 16
newtab-sports-widget-quarter-finals = Kwartfinalen
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = LIVE
newtab-custom-widget-live-refresh =
    .title = Skoares ferfarskje
    .aria-label = Skoares ferfarskje
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Wichtige datums
newtab-sports-widget-upcoming = Ynkoarten
# Used for a match currently ongoing
newtab-sports-widget-now = No
newtab-sports-widget-results = Resultaten
newtab-sports-widget-semi-finals = Heale finalen
newtab-sports-widget-bronze-finals = Treastfinale
# Final is the final match for 1st place.
newtab-sports-widget-final = Finale
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, day: "numeric", month: "short") } – { DATETIME($end, day: "numeric", month: "short") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, day: "numeric", month: "short") }
newtab-sports-widget-delayed = Fertrage
newtab-sports-widget-postponed = Utsteld
newtab-sports-widget-suspended = Underbrutsen
newtab-sports-widget-cancelled = Annulearre
newtab-sports-widget-information = Ynformaasje oer de wedstriid
newtab-sports-widget-no-live-data = Livewedstriidgegevens wurde op dit stuit net bywurke
newtab-sports-widget-view-results-link = Resultaten besjen
newtab-sports-widget-third-place = Tredde plak
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Twadde plak
newtab-sports-widget-champions = Kampioen
newtab-sports-widget-world-cup-champions = Wrâldkampioen 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Wedstriid ôfrûn
newtab-sports-widget-match-halftime = Skoft
newtab-sports-widget-match-extra-time = Ferlinging
newtab-sports-widget-match-penalties = Strafskoppen
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = tsjin
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Sjoch regelmjittich foar details fan oankommende wedstriden

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Foarige
    .title = Foarige
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Folgjende
    .title = Folgjende
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Livewedstriid { $index } fan { $total }
    .title = Livewedstriid { $index } fan { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } tsjin { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) tsjin { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Live: { $homeTeam }, { $homeScore } tsjin { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } - { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } - { $awayTeam }, fertrage
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } - { $awayTeam }, útsteld
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } - { $awayTeam }, ûnderbrutsen
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } - { $awayTeam }, annulearre

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnje en Herzgovina
newtab-sports-widget-team-name-label-civ =
    .label = Ivoarkust
newtab-sports-widget-team-name-label-cod =
    .label = DR Kongo
newtab-sports-widget-team-name-label-eng =
    .label = Ingelân
newtab-sports-widget-team-name-label-sco =
    .label = Skotlân
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Noch te bepalen

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Begjin it WK mei nije eftergrûnen
newtab-sports-widget-message-wallpapers-body = Bring wat wedstriiddei-enerzjy nei jo browser foar it toernoai.
newtab-sports-widget-message-wallpapers-cta = Eftergrûn kieze
newtab-sports-widget-message-add-widgets-cta =
    .label = Widgets tafoegje
newtab-sports-widget-message-day-in-play-title = Hâld jo dei yn beweging mei { -brand-product-name }-widgets
newtab-sports-widget-message-day-in-play-body = Folgje it WK, bliuw by it wurk, hâld de tiid oer de hiele wrâld by, en mear.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Widgets ferkenne

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Slute
    .aria-label = Slute
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Dizze romte oan jo winsken oanpasse
newtab-activation-window-message-customization-focus-message = Kies in nije eftergrûn, foegje fluchkeppelingen nei jo favorite websites ta en bliuw op de hichte fan ferhalen dy’t jo ynteressearje.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Begjinne mei oanpassen
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Dizze romte spilet neffens jo regels
newtab-activation-window-message-values-focus-message = Mei { -brand-product-name } kinne jo sneupe lykas jo dat wolle, mei in mear persoanlike manier om jo dei online te begjinnen. Meitsje { -brand-product-name } jo eigen.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Klok ferstopje
newtab-clock-widget-menu-learn-more = Mear ynfo
newtab-clock-widget-menu-edit = Klokken bewurkje
newtab-clock-widget-menu-switch-to-12h = Omskeakelje nei 12-oersformaat
newtab-clock-widget-menu-switch-to-24h = Omskeakelje nei 24-oersformaat
newtab-clock-widget-label-your-clocks = Jo klokken
newtab-clock-widget-search-location-input =
    .label = Lokaasje
    .placeholder = Stêd sykje
    .aria-label = Stêd sykje
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Bynamme (opsjoneel)
    .placeholder = Foegje in bynamme ta
    .aria-label = Bynamme (opsjoneel)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Nije klok tafoegje
    .aria-label = Nije klok tafoegje
newtab-clock-widget-button-add-clock = Tafoegje
newtab-clock-widget-button-cancel = Annulearje
newtab-clock-widget-button-back =
    .title = Tebek
    .aria-label = Tebek
newtab-clock-widget-button-edit-clock =
    .title = Klok bewurkje
    .aria-label = Klok bewurkje
newtab-clock-widget-button-save = Bewarje
newtab-clock-widget-button-remove-clock =
    .title = Klok fuortsmite
    .aria-label = Klok fuortsmite
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
    .aria-label = { $city }, bynamme: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Klok tafoegje
newtab-clock-widget-edit-clock-form =
    .aria-label = Klok bewurkje
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Sykresultaten
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Gjin oerienkomsten
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Menu foar klok iepenje
    .aria-label = Menu foar klok iepenje
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Bynamme: { $nickname }

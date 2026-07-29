# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nyt faneblad
newtab-settings-button =
    .title = Tilpas siden Nyt faneblad
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Tilpas denne side
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Tilpas
newtab-customize-panel-label =
    .label = Tilpas
newtab-personalize-settings-icon-label =
    .title = Tilpas nyt faneblad
    .aria-label = Indstillinger
newtab-settings-dialog-label =
    .aria-label = Indstillinger
newtab-personalize-icon-label =
    .title = Tilpas nyt faneblad
    .aria-label = Tilpas nyt faneblad
newtab-personalize-dialog-label =
    .aria-label = Tilpas
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Afvis
    .aria-label = Afvis

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Startside
home-homepage-new-windows =
    .label = Nye vinduer
home-homepage-new-tabs =
    .label = Nye faneblade
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Vælg et specifik websted

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Websteds-adresse(r)
home-custom-homepage-address =
    .placeholder = Indtast adresse
home-custom-homepage-address-button =
    .label = Tilføj adresse
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Ingen websteder tilføjet endnu.
home-custom-homepage-delete-address-button =
    .aria-label = Slet adresse
    .title = Slet adresse
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Erstat med
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Aktuelt åbnede sider
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Bogmærker…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Søg
home-prefs-stories-header2 =
    .label = Historier
    .description = Interessant indhold udvalgt af { -brand-product-name }-holdet
home-prefs-widgets-header =
    .label = Widgets
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Lister
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Timer
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Ur
home-prefs-mission-message2 =
    .message = Vores sponsorer støtter vores mission om at bygge et bedre internet.
home-prefs-manage-topics-link2 =
    .label = Håndter emner
home-prefs-choose-wallpaper-link2 =
    .label = Vælg en baggrund
home-prefs-firefox-logo-header =
    .label = { -brand-short-name }-logo
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } række
           *[other] { $num } rækker
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Udvidelse ({ $extension })
home-restore-defaults-srd =
    .label = Gendan standarder
    .accesskey = G
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Standard)
home-mode-choice-custom-srd =
    .label = Tilpassede URL'er…
home-mode-choice-blank-srd =
    .label = Tom side
home-prefs-shortcuts-header-srd =
    .label = Genveje
home-prefs-shortcuts-select =
    .aria-label = Genveje
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Sponsorerede genveje
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Sponsorerede historier
home-prefs-highlights-option-visited-pages-srd =
    .label = Besøgte sider
home-prefs-highlights-options-bookmarks-srd =
    .label = Bogmærker
home-prefs-highlights-option-most-recent-download-srd =
    .label = Seneste filhentninger
home-prefs-recent-activity-header-srd =
    .label = Seneste aktivitet
home-prefs-recent-activity-select =
    .aria-label = Seneste aktivitet
home-prefs-weather-header-srd =
    .label = Vejr
home-prefs-support-firefox-header-srd =
    .label = Støt { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Find ud af hvordan

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Søg
    .aria-label = Søg
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Søg med { $engine } eller indtast adresse
newtab-search-box-handoff-text-no-engine = Søg eller indtast adresse
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Søg med { $engine } eller indtast adresse
    .title = Søg med { $engine } eller indtast adresse
    .aria-label = Søg med { $engine } eller indtast adresse
newtab-search-box-handoff-input-no-engine =
    .placeholder = Søg eller indtast adresse
    .title = Søg eller indtast adresse
    .aria-label = Søg eller indtast adresse
newtab-search-box-text = Søg på nettet
newtab-search-box-input =
    .placeholder = Søg på nettet
    .aria-label = Søg på nettet

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Tilføj søgetjeneste
newtab-topsites-add-shortcut-header = Ny genvej
newtab-topsites-edit-topsites-header = Rediger mest besøgte webside
newtab-topsites-edit-shortcut-header = Rediger genvej
newtab-topsites-add-shortcut-label = Tilføj genvej
newtab-topsites-add-shortcut-title =
    .title = Tilføj genvej
    .aria-label = Tilføj genvej
newtab-topsites-title-label = Titel
newtab-topsites-title-input =
    .placeholder = Indtast en titel
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Indtast eller indsæt en URL
newtab-topsites-url-validation = Gyldig URL påkrævet
newtab-topsites-image-url-label = URL til selvvalgt billede
newtab-topsites-use-image-link = Brug selvvalgt billede…
newtab-topsites-image-validation = Kunne ikke indlæse billede. Prøv en anden URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Ryd tekst

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Annuller
newtab-topsites-delete-history-button = Slet fra historik
newtab-topsites-save-button = Gem
newtab-topsites-preview-button = Vis prøve
newtab-topsites-add-button = Tilføj

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Er du sikker på, at du vil slette alle forekomster af denne side fra din historik?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Denne handling kan ikke fortrydes.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsoreret

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (fastgjort)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Åbn menu
    .aria-label = Åbn menu
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Fjern
    .aria-label = Fjern
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Åbn menu
    .aria-label = Åbn genvejsmenuen for { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Rediger denne webside
    .aria-label = Rediger denne webside

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Rediger
newtab-menu-open-new-window = Åbn i et nyt vindue
newtab-menu-open-new-private-window = Åbn i et nyt privat vindue
newtab-menu-dismiss = Afvis
newtab-menu-pin = Fastgør
newtab-menu-unpin = Frigør
newtab-menu-delete-history = Slet fra historik
newtab-menu-save-to-pocket = Gem til { -pocket-brand-name }
newtab-menu-delete-pocket = Slet fra { -pocket-brand-name }
newtab-menu-archive-pocket = Arkiver i { -pocket-brand-name }
newtab-menu-show-privacy-info = Vores sponsorer og dit privatliv
newtab-menu-about-fakespot = Om { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Rapporter
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Bloker
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Stop med at følge
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Læs mere
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Stop med at følge emne

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Håndter sponsoreret indhold
newtab-menu-our-sponsors-and-your-privacy = Vores sponsorer og dit privatliv
newtab-menu-report-this-ad = Rapporter reklamen

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Færdig
newtab-privacy-modal-button-manage = Håndter indstillinger for sponsoreret indhold
newtab-privacy-modal-header = Du har ret til et privatliv
newtab-privacy-modal-paragraph-2 =
    Udover at servere fængslende historier viser vi dig også relevant
    og grundigt undersøgt indhold fra udvalgte sponsorer. Du kan være 
    sikker på, at <strong>dine data aldrig kommer videre end den version af 
    { -brand-product-name }, du har på din computer </strong> — Vi ser ikke dine data, 
    og det gør vores sponsorer heller ikke.
newtab-privacy-modal-link = Læs mere om, hvordan sikring af dit privatliv fungerer i nyt faneblad

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Fjern bogmærke
# Bookmark is a verb here.
newtab-menu-bookmark = Bogmærk

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Kopier linkadresse
newtab-menu-go-to-download-page = Gå til siden, filen blev hentet fra
newtab-menu-remove-download = Fjern fra historik

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Vis i Finder
       *[other] Åbn hentningsmappe
    }
newtab-menu-open-file = Åbn fil

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Besøgt
newtab-label-bookmarked = Bogmærket
newtab-label-removed-bookmark = Bogmærke fjernet
newtab-label-recommended = Populært
newtab-label-saved = Gemt til { -pocket-brand-name }
newtab-label-download = Hentet
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsoreret
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsoreret af { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsoreret

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Fjern afsnit
newtab-section-menu-collapse-section = Sammenfold afsnit
newtab-section-menu-expand-section = Udvid afsnit
newtab-section-menu-manage-section = Håndter afsnit
newtab-section-menu-manage-webext = Håndter udvidelse
newtab-section-menu-add-topsite = Tilføj ny webside
newtab-section-menu-add-search-engine = Tilføj søgetjeneste
newtab-section-menu-move-up = Flyt op
newtab-section-menu-move-down = Flyt ned
newtab-section-menu-privacy-notice = Privatlivserklæring

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Sammenfold afsnit
newtab-section-expand-section-label =
    .aria-label = Udvid afsnit

## Section Headers.

newtab-section-header-topsites = Mest besøgte websider
newtab-section-header-recent-activity = Seneste aktivitet
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Anbefalet af { $provider }
newtab-section-header-stories = Tankevækkende historier
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Dagens valg til dig

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Gå i gang med at browse, så vil vi vise dig nogle af de artikler, videoer og andre sider, du har besøgt eller gemt et bogmærke til for nylig.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Der er ikke flere nye historier. Kom tilbage senere for at se flere tophistorier fra { $provider }. Kan du ikke vente? Vælg et populært emne og find flere spændende historier fra hele verden.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Der er ikke flere nye historier. Kom tilbage senere for at se flere. Kan du ikke vente? Vælg et populært emne og find flere spændende historier fra hele verden.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Du har læst det hele!
newtab-discovery-empty-section-topstories-content = Kom tilbage senere for at se flere historier.
newtab-discovery-empty-section-topstories-try-again-button = Prøv igen
newtab-discovery-empty-section-topstories-loading = Indlæser…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Hov. Det lykkedes ikke at indlæse afsnittet.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Populære emner:
newtab-pocket-new-topics-title = Vil du have endnu flere historier? Se disse populære emner fra { -pocket-brand-name }
newtab-pocket-more-recommendations = Flere anbefalinger
newtab-pocket-learn-more = Læs mere
newtab-pocket-cta-button = Hent { -pocket-brand-name }
newtab-pocket-cta-text = Gem dine yndlingshistorier i { -pocket-brand-name } og hav dem altid ved hånden.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } er en del af { -brand-product-name }-familien
newtab-pocket-save = Gem
newtab-pocket-saved = Gemt

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Mere som dette
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Ikke noget for mig
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Tak. Din tilbagemelding hjælper os med at forbedre dit feed.
newtab-toast-dismiss-button =
    .title = Afvis
    .aria-label = Afvis

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Opdag det bedste fra nettet
newtab-pocket-onboarding-cta = { -pocket-brand-name } gennemsøger en lang række forskellige publikationer for at kunne vise dig det mest informative, inspirerende og troværdige indhold direkte i din { -brand-product-name }-browser.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Hovsa. Noget gik galt ved indlæsning af indholdet.
newtab-error-fallback-refresh-link = Prøv igen ved at genindlæse siden.

## Customization Menu

newtab-custom-shortcuts-title = Genveje
newtab-custom-shortcuts-subtitle = Gemte eller besøgte websteder
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Genveje
    .description = Gemte eller besøgte websteder
newtab-custom-shortcuts-nova =
    .label = Genveje
newtab-custom-row-description =
    .description = Antal rækker
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } række
           *[other] { $num } rækker
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } række
       *[other] { $num } rækker
    }
newtab-custom-sponsored-sites = Sponsorerede genveje
newtab-custom-pocket-title = Anbefalet af { -pocket-brand-name }
newtab-custom-pocket-subtitle = Interessant indhold udvalgt af { -pocket-brand-name }, en del af { -brand-product-name }-familien
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Anbefalede historier
    .description = Interessant indhold udvalgt af { -brand-product-name }-holdet
newtab-recommended-stories-toggle =
    .label = Anbefalede historier
newtab-custom-stories-personalized-toggle =
    .label = Historier
newtab-custom-stories-personalized-checkbox-label = Tilpassede historier baseret på din aktivitet
newtab-custom-pocket-sponsored = Sponsorerede historier
newtab-custom-pocket-show-recent-saves = Vis seneste gemte
newtab-custom-recent-title = Seneste aktivitet
newtab-custom-recent-subtitle = Et udvalg af seneste websteder og indhold
newtab-custom-weather-toggle =
    .label = Vejr
    .description = Dagens vejrudsigt
newtab-custom-widget-weather-toggle =
    .label = Vejr
newtab-custom-widget-lists-toggle =
    .label = Lister
newtab-custom-widget-timer-toggle =
    .label = Timer
newtab-custom-widget-sports-toggle =
    .label = VM
newtab-custom-widget-clock-toggle =
    .label = Ur
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Håndter widgets
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Luk
    .aria-label = Luk menu
newtab-custom-close-button = Luk
newtab-custom-settings = Håndter flere indstillinger

## New Tab Wallpapers

newtab-wallpaper-title = Baggrunde
newtab-wallpaper-reset = Nulstil til standard
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Upload et billede
newtab-wallpaper-add-an-image = Tilføj et billede
newtab-wallpaper-custom-color = Vælg en farve
newtab-wallpaper-toggle-title =
    .label = Baggrunde
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Billedet overskrider grænsen for filstørrelse på { $file_size } MB. Prøv at uploade en mindre fil.
newtab-wallpaper-error-upload-file-type = Vi kunne ikke uploade din fil. Prøv igen med en billedfil.
newtab-wallpaper-error-file-type = Vi kunne ikke uploade din fil. Prøv igen med en anden filtype.
newtab-wallpaper-light-red-panda = Rød panda
newtab-wallpaper-light-mountain = Hvidt bjerg
newtab-wallpaper-light-sky = Himmel med lilla og lyserøde skyer
newtab-wallpaper-light-color = Blå, lyserøde og gule former
newtab-wallpaper-light-landscape = Bjerglandskab med blå tåge
newtab-wallpaper-light-beach = Strand med palme
newtab-wallpaper-dark-aurora = Nordlys
newtab-wallpaper-dark-color = Røde og blå former
newtab-wallpaper-dark-panda = Rød panda skjult i en skov
newtab-wallpaper-dark-sky = Udsigt over by med nattehimmel
newtab-wallpaper-dark-mountain = Bjerglandskab
newtab-wallpaper-dark-city = Lilla bylandskab
newtab-wallpaper-dark-fox-anniversary = En ræv på fortovet i nærheden af en skov
newtab-wallpaper-light-fox-anniversary = En ræv på en græsmark i et tåget bjerglandskab

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Ensfarvede
newtab-wallpaper-colors = Farver
newtab-wallpaper-blue = Blå
newtab-wallpaper-light-blue = Lyseblå
newtab-wallpaper-light-purple = Lyslilla
newtab-wallpaper-light-green = Lysegrøn
newtab-wallpaper-green = Grøn
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Gul
newtab-wallpaper-orange = Orange
newtab-wallpaper-pink = Pink
newtab-wallpaper-light-pink = Lyserød
newtab-wallpaper-red = Rød
newtab-wallpaper-dark-blue = Mørkeblå
newtab-wallpaper-dark-purple = Mørklilla
newtab-wallpaper-dark-green = Mørkegrøn
newtab-wallpaper-brown = Brun

## Abstract

newtab-wallpaper-category-title-abstract = Abstrakt
newtab-wallpaper-abstract-green = Grønne former
newtab-wallpaper-abstract-blue = Blå former
newtab-wallpaper-abstract-purple = Lilla former
newtab-wallpaper-abstract-orange = Orange former
newtab-wallpaper-gradient-orange = Farveforløb i orange og pink
newtab-wallpaper-abstract-blue-purple = Blå og lilla former
newtab-wallpaper-abstract-white-curves = Hvid med skraverede kurver
newtab-wallpaper-abstract-purple-green = Gradient med lilla og grønt lys
newtab-wallpaper-abstract-blue-purple-waves = Blå og lilla bølgeformer
newtab-wallpaper-abstract-black-waves = Sorte bølgeformer

## Firefox

newtab-wallpaper-category-title-photographs = Fotografier
newtab-wallpaper-beach-at-sunrise = Strand ved solopgang
newtab-wallpaper-beach-at-sunset = Strand ved solnedgang
newtab-wallpaper-storm-sky = Stormfuld himmel
newtab-wallpaper-sky-with-pink-clouds = Himmel med lyserøde skyer
newtab-wallpaper-red-panda-yawns-in-a-tree = Rød panda gaber i et træ
newtab-wallpaper-white-mountains = Hvide bjerge
newtab-wallpaper-hot-air-balloons = Luftballoner i forskellige farver om dagen
newtab-wallpaper-starry-canyon = Blå stjernehimmel
newtab-wallpaper-suspension-bridge = Fotografi af grå hængebro om dagen
newtab-wallpaper-sand-dunes = Hvide klitter
newtab-wallpaper-palm-trees = Silhuet med kokospalmer i den gyldne time
newtab-wallpaper-blue-flowers = Nærbillede af blomster med blå kronblade.
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto af <a data-l10n-name="name-link">{ $author_string }</a> fra <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Tilføj lidt farve
newtab-wallpaper-feature-highlight-content = Opdater siden Nyt faneblad med baggrundsbilleder.
newtab-wallpaper-feature-highlight-button = Forstået
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Annuller
    .aria-label = Luk pop op
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Rummet
newtab-wallpaper-celestial-lunar-eclipse = Måneformørkelse
newtab-wallpaper-celestial-earth-night = Nattefotografi fra lavt kredsløb om Jorden
newtab-wallpaper-celestial-starry-sky = Stjernehimmel
newtab-wallpaper-celestial-eclipse-time-lapse = Tidsforløb måneformørkelse
newtab-wallpaper-celestial-black-hole = Illustration af galakse med sort hul
newtab-wallpaper-celestial-river = Satellitfotografi af flod

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Se vejrudsigter på { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsoreret
newtab-weather-menu-change-location = Skift sted
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Søg efter sted
    .aria-label = Søg efter sted
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Brug nuværende placering
newtab-weather-menu-weather-display = Visning af vejr
newtab-weather-todays-forecast = Dagens vejrudsigt
newtab-weather-see-full-forecast = Se hele vejrudsigten
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Enkel
newtab-weather-menu-change-weather-display-simple = Skift til enkel visning
newtab-weather-menu-weather-display-option-detailed = Detaljeret
newtab-weather-menu-change-weather-display-detailed = Skift til detaljeret visning
newtab-weather-menu-temperature-units = Temperaturenheder
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Skift til Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Skift til Celsius
newtab-weather-menu-hide-weather = Skjul vejr på Nyt faneblad
newtab-weather-menu-learn-more = Læs mere
newtab-weather-menu-detect-my-location = Registrer min placering
# This message is shown if user is working offline
newtab-weather-error-not-available = Vejrdata er ikke tilgængelige lige nu.
newtab-weather-opt-in-see-weather = Vil du se vejrudsigter for din placering?
newtab-weather-opt-in-not-now =
    .label = Ikke nu
newtab-weather-opt-in-yes =
    .label = Ja
newtab-weather-opt-in-headline = Få din lokale vejrudsigt
newtab-weather-opt-in-use-location =
    .label = Brug placering
newtab-weather-opt-in-choose-location = Vælg placering
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Højeste
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Laveste
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Se vejrudsigter på { $provider }
    .aria-description = { $provider } ∙ Sponsoreret

## Topic Labels

newtab-topic-label-business = Forretning
newtab-topic-label-career = Karriere
newtab-topic-label-education = Uddannelse
newtab-topic-label-arts = Underholdning
newtab-topic-label-food = Mad
newtab-topic-label-health = Sundhed
newtab-topic-label-hobbies = Spil
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Penge
newtab-topic-label-society-parenting = Forældreskab
newtab-topic-label-government = Politik
newtab-topic-label-education-science = Videnskab
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Lifehacks
newtab-topic-label-sports = Sport
newtab-topic-label-tech = Teknologi
newtab-topic-label-travel = Rejser
newtab-topic-label-home = Hus og have

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Vælg emner for at finjustere dit feed
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Vælg to eller flere emner. Vores ekspertkuratorer prioriterer historier målrettet dine interesser. Opdater når som helst.
newtab-topic-selection-save-button = Gem
newtab-topic-selection-cancel-button = Annuller
newtab-topic-selection-button-maybe-later = Måske senere
newtab-topic-selection-privacy-link = Lær, hvordan vi beskytter og håndterer data
newtab-topic-selection-button-update-interests = Opdater dine interesser
newtab-topic-selection-button-pick-interests = Vælg dine interesser

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Følg
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Følg { $topic }
newtab-section-following-button = Følger
newtab-section-unfollow-button = Stop med at følge
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Følger: Stop med at følge { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Finjuster dit feed
newtab-section-follow-highlight-subtitle = Følg dine interesserer for at se mere indhold, der passer dig.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Bloker
newtab-section-blocked-button = Blokeret
newtab-section-unblock-button = Fjern blokering
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Følg { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Stop med at følge { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Bloker { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Fjern blokering af { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Ikke nu
newtab-section-confirm-block-topic-p1 = Er du sikker på, at du vil blokere dette emne?
newtab-section-confirm-block-topic-p2 = Det blokerede emner vil ikke længere blive vist i dit feed.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Bloker { $topic }
newtab-section-block-cancel-button = Annuller

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Emner
newtab-section-manage-topics-button-v2 =
    .label = Håndter emner
newtab-section-mangage-topics-followed-topics = Fulgt
newtab-section-mangage-topics-followed-topics-empty-state = Du har ikke fulgt nogle emner endnu.
newtab-section-mangage-topics-blocked-topics = Blokeret
newtab-section-mangage-topics-blocked-topics-empty-state = Du har ikke blokeret nogen emner endnu.
newtab-custom-wallpaper-title = Nu kan du vælge din egen baggrund
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Upload din egen baggrund eller vælg en farve for at gøre { -brand-product-name } til din egen.
newtab-custom-wallpaper-cta = Prøv det

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Vælg en baggrund for at gøre { -brand-product-name } til din egen
newtab-new-user-custom-wallpaper-subtitle = Føl dig hjemme på alle nye faneblade med tilpassede baggrunde og farver.
newtab-new-user-custom-wallpaper-cta = Prøv det nu

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Så er der nye baggrunde
newtab-wallpaper-feature-highlight-subtitle = Vælg din favorit, og få hvert nyt faneblad til at føles som hjemme.
newtab-wallpaper-feature-highlight-cta = Vælg baggrund

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Hent { -brand-product-name } til mobil
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Skan koden for at surfe sikkert på farten.
newtab-download-mobile-highlight-body-variant-b = Fortsæt, hvor du slap ved at synkronisere faneblade, adgangskoder med mere.
newtab-download-mobile-highlight-body-variant-c = Viste du, at du kan tage { -brand-product-name } med på farten? Samme browser, men i din lomme.
newtab-download-mobile-highlight-image =
    .aria-label = QR-kode til at hente { -brand-product-name } til mobilen

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Dine favoritter lige ved hånden
newtab-shortcuts-highlight-subtitle = Tilføj en genvej for at finde dine foretrukne websteder med et enkelt klik.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Hvorfor rapporterer du dette?
newtab-report-ads-reason-not-interested =
    .label = Jeg er ikke interesseret
newtab-report-ads-reason-inappropriate =
    .label = Det er upassende
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Jeg har set det for mange gange
newtab-report-content-wrong-category =
    .label = Forkert kategori
newtab-report-content-outdated =
    .label = Forældet
newtab-report-content-inappropriate-offensive =
    .label = Upassende eller stødende
newtab-report-content-spam-misleading =
    .label = Spam eller vildledende
newtab-report-content-requires-payment-subscription =
    .label = Kræver betaling eller abonnement
newtab-report-content-requires-payment-subscription-learn-more = Læs mere
newtab-report-cancel = Annuller
newtab-report-submit = Indsend
newtab-toast-thanks-for-reporting =
    .message = Tak for at du rapporterer dette.
newtab-toast-widgets-hidden =
    .message = Vælg blyant-ikonet for at tilføje widgets igen.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Du følger nu { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Du følger ikke længere { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Du vil ikke længere se historier om { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Mulighederne er uendelige. Tilføj en.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Ny
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Afsluttede ({ $number })
newtab-widget-lists-celebration-headline = Godt gået
newtab-widget-task-list-menu-copy = Kopier
newtab-widget-lists-menu-edit = Rediger listens navn
newtab-widget-lists-menu-edit2 =
    .aria-label = Rediger listens navn
newtab-widget-lists-menu-create = Opret en ny liste
newtab-widget-lists-menu-delete = Slet denne liste
newtab-widget-lists-menu-copy = Kopier liste til udklipsholderen
newtab-widget-lists-menu-learn-more = Læs mere
newtab-widget-lists-button-add-item = Tilføj et element
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Tilføj et element
    .aria-label = Tilføj et element
newtab-widget-lists-input-error = Inkluder tekst for at tilføje et element.
newtab-widget-lists-input-menu-open-link = Åbn link
newtab-widget-lists-input-menu-move-up = Flyt op
newtab-widget-lists-input-menu-move-down = Flyt ned
newtab-widget-lists-input-menu-delete = Slet
newtab-widget-lists-input-menu-edit = Rediger
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Rediger element
newtab-widget-lists-edit-clear =
    .aria-label = Annuller
    .title = Annuller
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Opret en ny liste
newtab-widget-lists-name-label-default =
    .label = Opgaveliste
newtab-widget-lists-name-label-checklist =
    .label = Tjekliste
newtab-widget-lists-name-placeholder-default =
    .placeholder = Opgaveliste
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Tjekliste
    .aria-label = Rediger listens navn
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Ny liste
    .aria-label = Rediger listens navn
newtab-widget-section-title = Widgets
newtab-widget-menu-hide = Skjul widgets
newtab-widget-menu-change-size = Skift størrelse
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Flyt
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Venstre
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Højre
newtab-widget-size-small = Lille
newtab-widget-size-medium = Mellem
newtab-widget-size-large = Stor
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Skjul widgets
    .aria-label = Skjul alle widgets
newtab-widget-section-maximize =
    .title = Udvid widgets
    .aria-label = Udvid alle widgets til fuld størrelse
newtab-widget-section-minimize =
    .title = Minimer widgets
    .aria-label = Sammenfold alle widgets til kompakt størrelse
newtab-widget-section-menu-button =
    .title = Widgets-menu
    .aria-label = Åbn widgets-menu
newtab-widget-add-widgets-button =
    .aria-label = Tilføj widget
    .title = Tilføj widget
newtab-widget-section-menu-manage = Håndter widgets
newtab-widget-section-menu-hide-all = Skjul widgets
newtab-widget-section-menu-learn-more = Læs mere
newtab-widget-section-feedback = Fortæl os, hvad du synes
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Vis flere widgets
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Vis færre widgets
newtab-widget-lists-name-default = Tjekliste

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Timer
newtab-widget-timer-notification-focus = Fokus-tiden er slut. Godt gået. Har du brug for en pause?
newtab-widget-timer-notification-break = Pausen er slut. Klar til at tage fat igen?
newtab-widget-timer-notification-warning = Notifikationer er slået fra
newtab-widget-timer-mode-focus =
    .label = Fokus
newtab-widget-timer-mode-break =
    .label = Pause
newtab-widget-timer-label-play =
    .label = Afspil
newtab-widget-timer-label-pause =
    .label = Pause
newtab-widget-timer-reset =
    .title = Nulstil
newtab-widget-timer-menu-notifications = Slå notifikationer fra
newtab-widget-timer-menu-notifications-on = Slå notifikationer til
newtab-widget-timer-menu-learn-more = Læs mere
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Topoverskrifter
newtab-daily-briefing-card-menu-dismiss = Afvis
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Opdateret for { $minutes } m. siden
newtab-widget-message-title = Hold fokus med lister og den indbyggede timer
# to-dos stands for "things to do".
newtab-widget-message-copy = Fra hurtige påmindelser til daglige opgaver — funktionen Fokus hjælper dig med at have styr på tingene og din tid.
newtab-promo-card-body-addons = Vælg en baggrund fra vores samling, eller lav din egen.
newtab-promo-card-cta-addons = Prøv det nu
newtab-promo-card-title = Støt { -brand-product-name }
newtab-promo-card-body = Vores sponsorer støtter vores mission om at bygge et bedre internet
newtab-promo-card-cta = Lær mere
newtab-promo-card-dismiss-button =
    .title = Afvis
    .aria-label = Afvis

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-pause-aria =
    .aria-label = Sæt timer på pause
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minut
           *[other] { $minutes } minutter
        }
newtab-widget-timer-mode-group =
    .aria-label = Timertilstand
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Fokus
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pause
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Skjul timer
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Din pause er slut
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Brug for en pause?

##

newtab-sports-widget-menu-follow-teams = Følg hold
newtab-sports-widget-menu-view-schedule = Se tidsplan
newtab-sports-widget-menu-view-upcoming = Se kommende
newtab-sports-widget-menu-view-results = Vis resultater
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Vigtige datoer
newtab-sports-widget-menu-learn-more = Læs mere
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Hold øje med VM
newtab-sports-widget-get-updates = Få direkte kampopdateringer og meget mere.
newtab-sports-widget-view-schedule =
    .label = Se tidsplan
newtab-sports-widget-follow-teams =
    .label = Følg hold
newtab-sports-widget-view-matches =
    .label = Se kampe
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Følg op til { $number } hold
       *[other] Følg op til { $number } hold
    }
newtab-sports-widget-choose-wallpaper =
    .label = Vælg en baggrund
newtab-sports-widget-skip = Spring over
newtab-sports-widget-search-country =
    .placeholder = Søg efter land
    .aria-label = Søg efter land
newtab-sports-widget-cancel = Annuller
newtab-sports-widget-back-button =
    .aria-label = Tilbage
newtab-sports-widget-done-button =
    .label = Færdig
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (elimineret)
newtab-sports-widget-view-all =
    .label = Vis alle
newtab-sports-widget-show-less =
    .label = Vis mindre
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Kun hold, der følges
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Se
    .title = Se live
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Se live
    .title = Se live
newtab-sports-widget-watch-dialog-close =
    .aria-label = Luk
    .title = Luk
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Gratis
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Gratis prøveperiode
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratis og betalt
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Betalt
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Kun udvalgte kampe
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Tilgængelig i din region
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Andre regioner
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Åben stream
    .title = Åben stream
newtab-sports-widget-group-stage = Gruppespillet
newtab-sports-widget-group-a = Gruppe A
newtab-sports-widget-group-b = Gruppe B
newtab-sports-widget-group-c = Gruppe C
newtab-sports-widget-group-d = Gruppe D
newtab-sports-widget-group-e = Gruppe E
newtab-sports-widget-group-f = Gruppe F
newtab-sports-widget-group-g = Gruppe G
newtab-sports-widget-group-h = Gruppe H
newtab-sports-widget-group-i = Gruppe I
newtab-sports-widget-group-j = Gruppe J
newtab-sports-widget-group-k = Gruppe K
newtab-sports-widget-group-l = Gruppe L
newtab-sports-widget-round-32 = Sekstendedelsfinaler
newtab-sports-widget-round-16 = Ottendedelsfinaler
newtab-sports-widget-quarter-finals = Kvartfinaler
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = LIVE
newtab-custom-widget-live-refresh =
    .title = Opdater scorer
    .aria-label = Opdater scorer
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Vigtige datoer
newtab-sports-widget-upcoming = Kommende
# Used for a match currently ongoing
newtab-sports-widget-now = Nu
newtab-sports-widget-results = Resultater
newtab-sports-widget-semi-finals = Semifinaler
newtab-sports-widget-bronze-finals = Bronzekamp
# Final is the final match for 1st place.
newtab-sports-widget-final = Finale
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Forsinket
newtab-sports-widget-postponed = Udsat
newtab-sports-widget-suspended = Suspenderet
newtab-sports-widget-cancelled = Aflyst
newtab-sports-widget-information = Information om kampen
newtab-sports-widget-no-live-data = Liveopdateringer af kampdata opdateres ikke lige nu
newtab-sports-widget-view-results-link = Vis resultater
newtab-sports-widget-third-place = Tredjeplads
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Andenplads
newtab-sports-widget-champions = Mestre
newtab-sports-widget-world-cup-champions = VM-mestre i 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Færdigspillet
newtab-sports-widget-match-halftime = Halvleg
newtab-sports-widget-match-extra-time = Forlænget spilletid
newtab-sports-widget-match-penalties = Straffe
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = mod

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Forrige
    .title = Forrige
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Næste
    .title = Næste
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Livekamp { $index } af { $total }
    .title = Livekamp { $index } af { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } mod { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) mod { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Live: { $homeTeam }, { $homeScore } mod { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } mod { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } mod { $awayTeam }, forsinket
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } mod { $awayTeam }, udsat
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } mod { $awayTeam }, suspenderet
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } mod { $awayTeam }, aflyst

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnien-Hercegovina
newtab-sports-widget-team-name-label-civ =
    .label = Elfenbenskysten
newtab-sports-widget-team-name-label-cod =
    .label = DR Congo
newtab-sports-widget-team-name-label-eng =
    .label = England
newtab-sports-widget-team-name-label-sco =
    .label = Skotland
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = Ikke fastlagt endnu

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Start VM med nye baggrunde
newtab-sports-widget-message-wallpapers-cta = Vælg baggrund
newtab-sports-widget-message-add-widgets-cta =
    .label = Tilføj widgets
newtab-sports-widget-message-explore-widgets-cta =
    .label = Udforsk widgets

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Afvis
    .aria-label = Afvis
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Gør denne plads til din egen
newtab-activation-window-message-customization-focus-message = Vælg en ny baggrund, tilføj genveje til dine foretrukne websteder, og hold dig opdateret med artikler, som interesserer dig.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Gå i gang med at tilpasse
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Denne plads følger dine regler

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Skjul ur
newtab-clock-widget-menu-learn-more = Læs mere
newtab-clock-widget-menu-edit = Rediger ure
newtab-clock-widget-menu-switch-to-12h = Skift til 12-timers format
newtab-clock-widget-menu-switch-to-24h = Skift til 24-timers format
newtab-clock-widget-label-your-clocks = Dine ure
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Tilføj nyt ur
    .aria-label = Tilføj nyt ur
newtab-clock-widget-button-add-clock = Tilføj
newtab-clock-widget-button-cancel = Annuller
newtab-clock-widget-button-back =
    .title = Tilbage
    .aria-label = Tilbage
newtab-clock-widget-button-edit-clock =
    .title = Rediger ur
    .aria-label = Rediger ur
newtab-clock-widget-button-save = Gem
newtab-clock-widget-button-remove-clock =
    .title = Fjern ur
    .aria-label = Fjern ur
# Accessible name for a clock row in the "Your clocks" management panel
# when the row has no user-provided nickname. Read aloud by screen
# readers when focus lands on the row.
# Variables:
#   $city (string) - The city name displayed in the row.
newtab-clock-widget-edit-item =
    .aria-label = { $city }
newtab-clock-widget-add-clock-form =
    .aria-label = Tilføj ur
newtab-clock-widget-edit-clock-form =
    .aria-label = Rediger ur
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Søgeresultater
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Ingen forekomster

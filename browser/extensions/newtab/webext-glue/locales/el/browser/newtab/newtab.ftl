# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Νέα καρτέλα
newtab-settings-button =
    .title = Προσαρμογή της σελίδας Νέας Καρτέλας
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Προσαρμογή σελίδας
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Προσαρμογή
newtab-customize-panel-label =
    .label = Προσαρμογή
newtab-personalize-settings-icon-label =
    .title = Εξατομίκευση νέας καρτέλας
    .aria-label = Ρυθμίσεις
newtab-settings-dialog-label =
    .aria-label = Ρυθμίσεις
newtab-personalize-icon-label =
    .title = Εξατομίκευση νέας καρτέλας
    .aria-label = Εξατομίκευση νέας καρτέλας
newtab-personalize-dialog-label =
    .aria-label = Εξατομίκευση
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Απόρριψη
    .aria-label = Απόρριψη

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Αρχική σελίδα
home-homepage-new-windows =
    .label = Νέα παράθυρα
home-homepage-new-tabs =
    .label = Νέες καρτέλες
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Επιλογή συγκεκριμένου ιστοτόπου

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Διευθύνσεις ιστοτόπων
home-custom-homepage-address =
    .placeholder = Εισαγάγετε διεύθυνση
home-custom-homepage-address-button =
    .label = Προσθήκη διεύθυνσης
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Δεν έχουν προστεθεί ακόμα ιστότοποι.
home-custom-homepage-delete-address-button =
    .aria-label = Διαγραφή διεύθυνσης
    .title = Διαγραφή διεύθυνσης
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Αντικατάσταση με
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Τρέχουσες ανοικτές σελίδες
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Σελιδοδείκτες…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Αναζήτηση
home-prefs-stories-header2 =
    .label = Άρθρα
    .description = Εξαιρετικό περιεχόμενο από την οικογένεια του { -brand-product-name }
home-prefs-widgets-header =
    .label = Γραφικά στοιχεία
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Λίστες
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Αντίστροφη μέτρηση
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Αθλήματα
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Ρολόι
home-prefs-mission-message2 =
    .message = Οι χορηγοί μας υποστηρίζουν την αποστολή μας για ένα καλύτερο διαδίκτυο.
home-prefs-manage-topics-link2 =
    .label = Διαχείριση θεμάτων
home-prefs-choose-wallpaper-link2 =
    .label = Επιλογή ταπετσαρίας
home-prefs-firefox-logo-header =
    .label = Λογότυπο { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Για να χρησιμοποιήσετε αυτές τις λειτουργίες, ρυθμίστε τις νέες καρτέλες ή τα νέα παράθυρα στην { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } σειρά
           *[other] { $num } σειρές
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Επέκταση ({ $extension })
home-restore-defaults-srd =
    .label = Επαναφορά προεπιλογών
    .accesskey = Ε
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (Προεπιλογή)
home-mode-choice-custom-srd =
    .label = Προσαρμοσμένα URL…
home-mode-choice-blank-srd =
    .label = Κενή σελίδα
home-prefs-shortcuts-header-srd =
    .label = Συντομεύσεις
home-prefs-shortcuts-select =
    .aria-label = Συντομεύσεις
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Χορηγούμενες συντομεύσεις
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Χορηγούμενα άρθρα
home-prefs-highlights-option-visited-pages-srd =
    .label = Σελίδες που έχετε επισκεφθεί
home-prefs-highlights-options-bookmarks-srd =
    .label = Σελιδοδείκτες
home-prefs-highlights-option-most-recent-download-srd =
    .label = Πιο πρόσφατες λήψεις
home-prefs-recent-activity-header-srd =
    .label = Πρόσφατη δραστηριότητα
home-prefs-recent-activity-select =
    .aria-label = Πρόσφατη δραστηριότητα
home-prefs-weather-header-srd =
    .label = Καιρός
home-prefs-support-firefox-header-srd =
    .label = Υποστηρίξτε το { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Μάθετε πώς

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Αναζήτηση
    .aria-label = Αναζήτηση
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Αναζήτηση με { $engine } ή εισαγωγή διεύθυνσης
newtab-search-box-handoff-text-no-engine = Αναζήτηση ή εισαγωγή διεύθυνσης
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Αναζήτηση με { $engine } ή εισαγωγή διεύθυνσης
    .title = Αναζήτηση με { $engine } ή εισαγωγή διεύθυνσης
    .aria-label = Αναζήτηση με { $engine } ή εισαγωγή διεύθυνσης
newtab-search-box-handoff-input-no-engine =
    .placeholder = Αναζήτηση ή εισαγωγή διεύθυνσης
    .title = Αναζήτηση ή εισαγωγή διεύθυνσης
    .aria-label = Αναζήτηση ή εισαγωγή διεύθυνσης
newtab-search-box-text = Αναζήτηση στο διαδίκτυο
newtab-search-box-input =
    .placeholder = Αναζήτηση στο διαδίκτυο
    .aria-label = Αναζήτηση στο διαδίκτυο

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Προσθήκη μηχανής αναζήτησης
newtab-topsites-add-shortcut-header = Νέα συντόμευση
newtab-topsites-edit-topsites-header = Επεξεργασία κορυφαίου ιστοτόπου
newtab-topsites-edit-shortcut-header = Επεξεργασία συντόμευσης
newtab-topsites-add-shortcut-label = Προσθήκη συντόμευσης
newtab-topsites-add-shortcut-title =
    .title = Προσθήκη συντόμευσης
    .aria-label = Προσθήκη συντόμευσης
newtab-topsites-title-label = Τίτλος
newtab-topsites-title-input =
    .placeholder = Εισαγωγή τίτλου
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Εισαγωγή ή επικόλληση URL
newtab-topsites-url-validation = Απαιτείται έγκυρο URL
newtab-topsites-image-url-label = URL προσαρμοσμένης εικόνας
newtab-topsites-use-image-link = Χρήση προσαρμοσμένης εικόνας…
newtab-topsites-image-validation = Αποτυχία φόρτωσης εικόνας. Δοκιμάστε ένα διαφορετικό URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Απαλοιφή κειμένου

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Ακύρωση
newtab-topsites-delete-history-button = Διαγραφή από ιστορικό
newtab-topsites-save-button = Αποθήκευση
newtab-topsites-preview-button = Προεπισκόπηση
newtab-topsites-add-button = Προσθήκη

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Θέλετε σίγουρα να διαγράψετε κάθε παρουσία της σελίδας από το ιστορικό σας;
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Δεν είναι δυνατή η αναίρεση αυτής της ενέργειας.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Χορηγία

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (καρφιτσώθηκε)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Άνοιγμα μενού
    .aria-label = Άνοιγμα μενού
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Αφαίρεση
    .aria-label = Αφαίρεση
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Άνοιγμα μενού
    .aria-label = Άνοιγμα μενού επιλογών για το { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Επεξεργασία ιστοτόπου
    .aria-label = Επεξεργασία ιστοτόπου

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Επεξεργασία
newtab-menu-open-new-window = Άνοιγμα σε νέο παράθυρο
newtab-menu-open-new-private-window = Άνοιγμα σε νέο ιδιωτικό παράθυρο
newtab-menu-dismiss = Απόρριψη
newtab-menu-pin = Καρφίτσωμα
newtab-menu-unpin = Ξεκαρφίτσωμα
newtab-menu-delete-history = Διαγραφή από ιστορικό
newtab-menu-save-to-pocket = Αποθήκευση στο { -pocket-brand-name }
newtab-menu-delete-pocket = Διαγραφή από το { -pocket-brand-name }
newtab-menu-archive-pocket = Αρχειοθέτηση στο { -pocket-brand-name }
newtab-menu-show-privacy-info = Οι χορηγοί μας και το απόρρητό σας
newtab-menu-about-fakespot = Σχετικά με το { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Αναφορά
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Φραγή
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Άρση παρακολούθησης
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = Μάθετε περισσότερα
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Άρση παρακολούθησης θέματος

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Διαχείριση χορηγούμενου περιεχομένου
newtab-menu-our-sponsors-and-your-privacy = Οι χορηγοί μας και το απόρρητό σας
newtab-menu-report-this-ad = Αναφορά διαφήμισης

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Τέλος
newtab-privacy-modal-button-manage = Διαχείριση ρυθμίσεων χορηγούμενου περιεχομένου
newtab-privacy-modal-header = Το απόρρητό σας έχει σημασία.
newtab-privacy-modal-paragraph-2 =
    Εκτός από την παράδοση μαγευτικών ιστοριών, σας εμφανίζουμε σχετικό,
    υψηλής ποιότητας περιεχόμενο από επιλεγμένους χορηγούς. Μην ανησυχείτε, <strong>τα δεδομένα
    περιήγησής σας δεν φεύγουν ποτέ από το προσωπικό σας αντίγραφο του { -brand-product-name }</strong> — δεν τα βλέπουμε ούτε εμείς, ούτε
    οι χορηγοί μας.
newtab-privacy-modal-link = Μάθετε πώς λειτουργεί το απόρρητο στη νέα καρτέλα

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Αφαίρεση σελιδοδείκτη
# Bookmark is a verb here.
newtab-menu-bookmark = Προσθήκη σελιδοδείκτη

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Αντιγραφή συνδέσμου λήψης
newtab-menu-go-to-download-page = Μετάβαση στη σελίδα λήψης
newtab-menu-remove-download = Αφαίρεση από το ιστορικό

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Εμφάνιση στο Finder
       *[other] Άνοιγμα φακέλου λήψης
    }
newtab-menu-open-file = Άνοιγμα αρχείου

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Από ιστορικό
newtab-label-bookmarked = Από σελιδοδείκτες
newtab-label-removed-bookmark = Ο σελιδοδείκτης αφαιρέθηκε
newtab-label-recommended = Τάσεις
newtab-label-saved = Αποθηκεύτηκε στο { -pocket-brand-name }
newtab-label-download = Λήψεις
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Χορηγία
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Χορηγία από { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } λεπ.
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Χορηγία

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Αφαίρεση ενότητας
newtab-section-menu-collapse-section = Σύμπτυξη ενότητας
newtab-section-menu-expand-section = Επέκταση ενότητας
newtab-section-menu-manage-section = Διαχείριση ενότητας
newtab-section-menu-manage-webext = Διαχείριση επέκτασης
newtab-section-menu-add-topsite = Προσθήκη κορυφαίου ιστοτόπου
newtab-section-menu-add-search-engine = Προσθήκη μηχανής αναζήτησης
newtab-section-menu-move-up = Μετακίνηση πάνω
newtab-section-menu-move-down = Μετακίνηση κάτω
newtab-section-menu-privacy-notice = Σημείωση απορρήτου

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Σύμπτυξη ενότητας
newtab-section-expand-section-label =
    .aria-label = Επέκταση ενότητας

## Section Headers.

newtab-section-header-topsites = Κορυφαίοι ιστότοποι
newtab-section-header-recent-activity = Πρόσφατη δραστηριότητα
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Προτάσεις του { $provider }
newtab-section-header-stories = Άρθρα που σας βάζουν σε σκέψεις
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Σημερινές επιλογές για εσάς

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Ξεκινήστε την περιήγηση και θα σας δείξουμε μερικά υπέροχα άρθρα, βίντεο και άλλες σελίδες που έχετε επισκεφθεί πρόσφατα ή έχετε προσθέσει στους σελιδοδείκτες σας.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Δεν υπάρχει κάτι νεότερο. Ελέγξτε αργότερα για περισσότερα άρθρα από το { $provider }. Δεν μπορείτε να περιμένετε; Διαλέξτε κάποιο από τα δημοφιλή θέματα και ανακαλύψτε ενδιαφέροντα άρθρα από όλο το διαδίκτυο.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Δεν υπάρχει κάτι νεότερο. Ελέγξτε αργότερα για περισσότερα άρθρα. Δεν μπορείτε να περιμένετε; Επιλέξτε κάποιο δημοφιλές θέμα και βρείτε ακόμα περισσότερα ενδιαφέροντα άρθρα από όλο το διαδίκτυο.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Τελειώσατε!
newtab-discovery-empty-section-topstories-content = Ελέγξτε ξανά αργότερα για περισσότερα άρθρα.
newtab-discovery-empty-section-topstories-try-again-button = Δοκιμή ξανά
newtab-discovery-empty-section-topstories-loading = Φόρτωση…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Ωχ! Αυτή η ενότητα σχεδόν φορτώθηκε, αλλά όχι πλήρως.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Δημοφιλή θέματα:
newtab-pocket-new-topics-title = Θέλετε περισσότερα άρθρα; Δείτε αυτά τα δημοφιλή θέματα από το { -pocket-brand-name }
newtab-pocket-more-recommendations = Περισσότερες προτάσεις
newtab-pocket-learn-more = Μάθετε περισσότερα
newtab-pocket-cta-button = Αποκτήστε το { -pocket-brand-name }
newtab-pocket-cta-text = Αποθηκεύστε τα άρθρα που σας αρέσουν στο { -pocket-brand-name } και τροφοδοτήστε το μυαλό σας με εκπληκτικά κείμενα.
newtab-pocket-pocket-firefox-family = Το { -pocket-brand-name } ανήκει στην οικογένεια του { -brand-product-name }
newtab-pocket-save = Αποθήκευση
newtab-pocket-saved = Αποθηκεύτηκε

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Περισσότερα σαν κι αυτό
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Όχι για μένα
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Ευχαριστούμε. Τα σχόλιά σας θα μας βοηθήσουν να βελτιώσουμε τη ροή σας.
newtab-toast-dismiss-button =
    .title = Απόρριψη
    .aria-label = Απόρριψη

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Ανακαλύψτε τα καλύτερα του διαδικτύου
newtab-pocket-onboarding-cta = Το { -pocket-brand-name } εξερευνά μια μεγάλη γκάμα εκδόσεων για να μεταφέρει το πιο ενημερωτικό, εμπνευσμένο και αξιόπιστο περιεχόμενο στο πρόγραμμα περιήγησης { -brand-product-name } σας.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Ωχ, κάτι πήγε στραβά κατά τη φόρτωση του περιεχομένου.
newtab-error-fallback-refresh-link = Ανανεώστε τη σελίδα για να δοκιμάσετε ξανά.

## Customization Menu

newtab-custom-shortcuts-title = Συντομεύσεις
newtab-custom-shortcuts-subtitle = Ιστότοποι από σελιδοδείκτες ή ιστορικό
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Συντομεύσεις
    .description = Ιστότοποι από σελιδοδείκτες ή ιστορικό
newtab-custom-shortcuts-nova =
    .label = Συντομεύσεις
newtab-custom-row-description =
    .description = Αριθμός σειρών
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } σειρά
           *[other] { $num } σειρές
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } σειρά
       *[other] { $num } σειρές
    }
newtab-custom-sponsored-sites = Χορηγούμενες συντομεύσεις
newtab-custom-pocket-title = Προτείνεται από το { -pocket-brand-name }
newtab-custom-pocket-subtitle = Εξαιρετικό περιεχόμενο από το { -pocket-brand-name }, μέρος της οικογένειας του { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Προτεινόμενα άρθρα
    .description = Εξαιρετικό περιεχόμενο από την οικογένεια του { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Προτεινόμενα άρθρα
newtab-custom-stories-personalized-toggle =
    .label = Άρθρα
newtab-custom-stories-personalized-checkbox-label = Εξατομικευμένα άρθρα με βάση τη δραστηριότητά σας
newtab-custom-pocket-sponsored = Χορηγούμενα άρθρα
newtab-custom-pocket-show-recent-saves = Εμφάνιση πρόσφατων αποθηκεύσεων
newtab-custom-recent-title = Πρόσφατη δραστηριότητα
newtab-custom-recent-subtitle = Συλλογή πρόσφατων ιστοτόπων και περιεχομένου
newtab-custom-weather-toggle =
    .label = Καιρός
    .description = Σημερινή πρόγνωση με μια ματιά
newtab-custom-widget-weather-toggle =
    .label = Καιρός
newtab-custom-widget-lists-toggle =
    .label = Λίστες
newtab-custom-widget-timer-toggle =
    .label = Αντίστροφη μέτρηση
newtab-custom-widget-sports-toggle =
    .label = Παγκόσμιο Κύπελλο
newtab-custom-widget-clock-toggle =
    .label = Ρολόι
newtab-custom-widget-sports-toggle2 =
    .label = Αθλήματα
newtab-custom-widget-section-title = Γραφικά στοιχεία
newtab-custom-widget-section-toggle =
    .label = Γραφικά στοιχεία
newtab-widget-manage-title = Γραφικά στοιχεία
newtab-widget-manage-widget-button =
    .label = Διαχείριση γραφικών στοιχείων
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Κλείσιμο
    .aria-label = Κλείσιμο μενού
newtab-custom-close-button = Κλείσιμο
newtab-custom-settings = Διαχείριση περισσότερων ρυθμίσεων

## New Tab Wallpapers

newtab-wallpaper-title = Ταπετσαρίες
newtab-wallpaper-reset = Επαναφορά προεπιλογής
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Μεταφόρτωση εικόνας
newtab-wallpaper-add-an-image = Προσθήκη εικόνας
newtab-wallpaper-custom-color = Επιλογή χρώματος
newtab-wallpaper-toggle-title =
    .label = Ταπετσαρίες
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = Η εικόνα υπερέβη το όριο μεγέθους των { $file_size }MB. Δοκιμάστε να μεταφορτώσετε ένα μικρότερο αρχείο.
newtab-wallpaper-error-upload-file-type = Δεν ήταν δυνατή η μεταφόρτωση του αρχείου σας. Δοκιμάστε ξανά με ένα άλλο αρχείο εικόνας.
newtab-wallpaper-error-file-type = Δεν ήταν δυνατή η μεταφόρτωση του αρχείου σας. Δοκιμάστε ξανά με έναν άλλο τύπο αρχείου.
newtab-wallpaper-light-red-panda = Κόκκινο πάντα
newtab-wallpaper-light-mountain = Λευκό βουνό
newtab-wallpaper-light-sky = Ουρανός με μοβ και ροζ σύννεφα
newtab-wallpaper-light-color = Μπλε, ροζ και κίτρινα σχήματα
newtab-wallpaper-light-landscape = Μπλε ορεινό τοπίο ομίχλης
newtab-wallpaper-light-beach = Παραλία με φοίνικα
newtab-wallpaper-dark-aurora = Βόρειο σέλας
newtab-wallpaper-dark-color = Κόκκινα και μπλε σχήματα
newtab-wallpaper-dark-panda = Κόκκινο πάντα στο δάσος
newtab-wallpaper-dark-sky = Αστικό τοπίο με νυχτερινό ουρανό
newtab-wallpaper-dark-mountain = Ορεινό τοπίο
newtab-wallpaper-dark-city = Μοβ αστικό τοπίο
newtab-wallpaper-dark-fox-anniversary = Μια αλεπού στο πεζοδρόμιο κοντά σε ένα δάσος
newtab-wallpaper-light-fox-anniversary = Μια αλεπού μέσα σε γρασίδι, με ένα ομιχλώδες ορεινό τοπίο

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Αμιγή χρώματα
newtab-wallpaper-colors = Χρώματα
newtab-wallpaper-blue = Μπλε
newtab-wallpaper-light-blue = Ανοιχτό μπλε
newtab-wallpaper-light-purple = Ανοιχτό μωβ
newtab-wallpaper-light-green = Ανοιχτό πράσινο
newtab-wallpaper-green = Πράσινο
newtab-wallpaper-beige = Μπεζ
newtab-wallpaper-yellow = Κίτρινο
newtab-wallpaper-orange = Πορτοκαλί
newtab-wallpaper-pink = Ροζ
newtab-wallpaper-light-pink = Ανοιχτό ροζ
newtab-wallpaper-red = Κόκκινο
newtab-wallpaper-dark-blue = Σκούρο μπλε
newtab-wallpaper-dark-purple = Σκούρο μωβ
newtab-wallpaper-dark-green = Σκούρο πράσινο
newtab-wallpaper-brown = Καφέ

## Abstract

newtab-wallpaper-category-title-abstract = Αφηρημένο
newtab-wallpaper-abstract-green = Πράσινα σχήματα
newtab-wallpaper-abstract-blue = Μπλε σχήματα
newtab-wallpaper-abstract-purple = Μοβ σχήματα
newtab-wallpaper-abstract-orange = Πορτοκαλί σχήματα
newtab-wallpaper-gradient-orange = Διαβάθμιση πορτοκαλί και ροζ
newtab-wallpaper-abstract-blue-purple = Μπλε και μοβ σχήματα
newtab-wallpaper-abstract-white-curves = Λευκό με σκιασμένες καμπύλες
newtab-wallpaper-abstract-purple-green = Διαβάθμιση μοβ και πράσινου φωτός
newtab-wallpaper-abstract-blue-purple-waves = Μπλε και μοβ κυματιστές μορφές
newtab-wallpaper-abstract-black-waves = Μαύρες κυματιστές μορφές

## Firefox

newtab-wallpaper-category-title-photographs = Φωτογραφίες
newtab-wallpaper-beach-at-sunrise = Παραλία στην ανατολή του ήλιου
newtab-wallpaper-beach-at-sunset = Παραλία στη δύση του ήλιου
newtab-wallpaper-storm-sky = Ουρανός με καταιγίδα
newtab-wallpaper-sky-with-pink-clouds = Ουρανός με ροζ σύννεφα
newtab-wallpaper-red-panda-yawns-in-a-tree = Κόκκινο πάντα που χασμουριέται σε ένα δέντρο
newtab-wallpaper-white-mountains = Λευκά βουνά
newtab-wallpaper-hot-air-balloons = Αερόστατα διάφορων χρωμάτων στο φως της ημέρας
newtab-wallpaper-starry-canyon = Μπλε έναστρη νύχτα
newtab-wallpaper-suspension-bridge = Γκρι φωτογραφία με μια κρεμαστή γέφυρα κατά τη διάρκεια της ημέρας
newtab-wallpaper-sand-dunes = Λευκοί αμμόλοφοι
newtab-wallpaper-palm-trees = Φιγούρες κοκοφοινίκων κατά τη «χρυσή ώρα»
newtab-wallpaper-blue-flowers = Κοντινή φωτογραφία ανθισμένων λουλουδιών με μπλε πέταλα
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Φωτογραφία από <a data-l10n-name="name-link">{ $author_string }</a> στο <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Δοκιμάστε μια πινελιά χρώματος
newtab-wallpaper-feature-highlight-content = Δώστε νέα εμφάνιση στη νέα σας καρτέλα με ταπετσαρίες.
newtab-wallpaper-feature-highlight-button = Το κατάλαβα
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Απόρριψη
    .aria-label = Κλείσιμο αναδυόμενου παραθύρου
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Ουράνια
newtab-wallpaper-celestial-lunar-eclipse = Έκλειψη Σελήνης
newtab-wallpaper-celestial-earth-night = Νυχτερινή φωτογραφία από τη χαμηλή τροχιά της Γης
newtab-wallpaper-celestial-starry-sky = Έναστρος ουρανός
newtab-wallpaper-celestial-eclipse-time-lapse = Έκλειψη Σελήνης σε βαθμιαία παρέλευση χρόνου
newtab-wallpaper-celestial-black-hole = Εικονογράφηση γαλαξία με μια μαύρη τρύπα
newtab-wallpaper-celestial-river = Δορυφορική εικόνα ποταμού

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Προβολή πρόγνωσης στο { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Χορηγία
newtab-weather-menu-change-location = Αλλαγή τοποθεσίας
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Αναζήτηση τοποθεσίας
    .aria-label = Αναζήτηση τοποθεσίας
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Χρήση τρέχουσας τοποθεσίας
newtab-weather-menu-weather-display = Προβολή καιρού
newtab-weather-todays-forecast = Πρόγνωση ημέρας
newtab-weather-see-full-forecast = Προβολή πλήρους πρόγνωσης
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Απλή
newtab-weather-menu-change-weather-display-simple = Εναλλαγή σε απλή προβολή
newtab-weather-menu-weather-display-option-detailed = Λεπτομερής
newtab-weather-menu-change-weather-display-detailed = Εναλλαγή σε λεπτομερή προβολή
newtab-weather-menu-temperature-units = Μονάδες θερμοκρασίας
newtab-weather-menu-temperature-option-fahrenheit = Φαρενάιτ
newtab-weather-menu-temperature-option-celsius = Κελσίου
newtab-weather-menu-change-temperature-units-fahrenheit = Εναλλαγή σε Φαρενάιτ
newtab-weather-menu-change-temperature-units-celsius = Εναλλαγή σε Κελσίου
newtab-weather-menu-hide-weather = Απόκρυψη καιρού στη νέα καρτέλα
newtab-weather-menu-learn-more = Μάθετε περισσότερα
newtab-weather-menu-detect-my-location = Εντοπισμός τοποθεσίας
# This message is shown if user is working offline
newtab-weather-error-not-available = Τα δεδομένα καιρού δεν είναι διαθέσιμα αυτήν τη στιγμή.
newtab-weather-opt-in-see-weather = Θέλετε να δείτε τον καιρό για την τοποθεσία σας;
newtab-weather-opt-in-not-now =
    .label = Όχι τώρα
newtab-weather-opt-in-yes =
    .label = Ναι
newtab-weather-opt-in-headline = Λάβετε την τοπική πρόγνωση καιρού
newtab-weather-opt-in-use-location =
    .label = Χρήση τοποθεσίας
newtab-weather-opt-in-choose-location = Επιλογή τοποθεσίας
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Νέα Υόρκη
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Υψηλή
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Χαμηλή
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Προβολή πρόγνωσης στο { $provider }
    .aria-description = { $provider } ∙ Χορηγία

## Topic Labels

newtab-topic-label-business = Επιχειρήσεις
newtab-topic-label-career = Καριέρα
newtab-topic-label-education = Εκπαίδευση
newtab-topic-label-arts = Ψυχαγωγία
newtab-topic-label-food = Φαγητό
newtab-topic-label-health = Υγεία
newtab-topic-label-hobbies = Παιχνίδια
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Οικονομικά
newtab-topic-label-society-parenting = Ανατροφή παιδιών
newtab-topic-label-government = Πολιτική
newtab-topic-label-education-science = Επιστήμη
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Αυτοβελτίωση
newtab-topic-label-sports = Αθλήματα
newtab-topic-label-tech = Τεχνολογία
newtab-topic-label-travel = Ταξίδια
newtab-topic-label-home = Σπίτι και κήπος

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Επιλέξτε θέματα για να βελτιώσετε τη ροή σας
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Επιλέξτε δύο ή περισσότερα θέματα. Οι ειδικοί επιμελητές μας δίνουν προτεραιότητα σε άρθρα που ταιριάζουν με τα ενδιαφέροντά σας. Κάντε ενημέρωση ανά πάσα στιγμή.
newtab-topic-selection-save-button = Αποθήκευση
newtab-topic-selection-cancel-button = Ακύρωση
newtab-topic-selection-button-maybe-later = Ίσως αργότερα
newtab-topic-selection-privacy-link = Μάθετε πώς προστατεύουμε και διαχειριζόμαστε τα δεδομένα
newtab-topic-selection-button-update-interests = Ενημερώστε τα ενδιαφέροντά σας
newtab-topic-selection-button-pick-interests = Επιλέξτε τα ενδιαφέροντά σας

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Ακολουθήστε
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Παρακολούθηση του «{ $topic }»
newtab-section-following-button = Ακολουθείται
newtab-section-unfollow-button = Άρση παρακολούθησης
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Ακολουθείτε: Διακοπή παρακολούθησης του «{ $topic }»
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Βελτιστοποιήστε τη ροή σας
newtab-section-follow-highlight-subtitle = Ακολουθήστε τα ενδιαφέροντά σας για να δείτε περισσότερα από αυτά που σας αρέσουν.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Φραγή
newtab-section-blocked-button = Φραγή
newtab-section-unblock-button = Άρση φραγής
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Παρακολούθηση του «{ $topic }»
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Διακοπή παρακολούθησης του «{ $topic }»
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Αποκλεισμός του «{ $topic }»
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Άρση αποκλεισμού του «{ $topic }»

## Confirmation modal for blocking a section

newtab-section-cancel-button = Όχι τώρα
newtab-section-confirm-block-topic-p1 = Θέλετε σίγουρα να αποκλείσετε αυτό το θέμα;
newtab-section-confirm-block-topic-p2 = Τα αποκλεισμένα θέματα δεν θα εμφανίζονται πλέον στη ροή σας.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Αποκλεισμός του «{ $topic }»
newtab-section-block-cancel-button = Ακύρωση

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Θέματα
newtab-section-manage-topics-button-v2 =
    .label = Διαχείριση θεμάτων
newtab-section-mangage-topics-followed-topics = Ακολουθούνται
newtab-section-mangage-topics-followed-topics-empty-state = Δεν έχετε παρακολουθήσει κανένα θέμα ακόμα.
newtab-section-mangage-topics-blocked-topics = Αποκλεισμένα
newtab-section-mangage-topics-blocked-topics-empty-state = Δεν έχετε αποκλείσει κανένα θέμα ακόμα.
newtab-custom-wallpaper-title = Οι προσαρμοσμένες ταπετσαρίες έφτασαν
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Μεταφορτώστε τη δική σας ταπετσαρία ή επιλέξτε ένα προσαρμοσμένο χρώμα για να κάνετε το { -brand-product-name } δικό σας.
newtab-custom-wallpaper-cta = Δοκιμή

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Επιλέξτε μια ταπετσαρία για να κάνετε το { -brand-product-name } δικό σας
newtab-new-user-custom-wallpaper-subtitle = Νιώστε άνετα σε κάθε νέα καρτέλα με προσαρμοσμένες ταπετσαρίες και χρώματα.
newtab-new-user-custom-wallpaper-cta = Δοκιμή τώρα

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = Μόλις κατέφτασαν νέες ταπετσαρίες
newtab-wallpaper-feature-highlight-subtitle = Επιλέξτε την αγαπημένη σας και κάντε κάθε νέα καρτέλα σαν το σπίτι σας.
newtab-wallpaper-feature-highlight-cta = Επιλογή ταπετσαρίας

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Λήψη του { -brand-product-name } για κινητές συσκευές
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Σαρώστε τον κωδικό για ασφαλή περιήγηση εν κινήσει.
newtab-download-mobile-highlight-body-variant-b = Συνεχίστε από εκεί που σταματήσατε με τον συγχρονισμό καρτελών, κωδικών πρόσβασης και άλλων δεδομένων.
newtab-download-mobile-highlight-body-variant-c = Γνωρίζατε ότι μπορείτε να χρησιμοποιείτε το { -brand-product-name } εν κινήσει; Το ίδιο πρόγραμμα περιήγησης, στην τσέπη σας.
newtab-download-mobile-highlight-image =
    .aria-label = Κωδικός QR για τη λήψη του { -brand-product-name } για κινητές συσκευές

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Τα αγαπημένα σας, στα χέρια σας
newtab-shortcuts-highlight-subtitle = Προσθέστε μια συντόμευση για να έχετε κοντά σας τους αγαπημένους ιστοτόπους σας.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Γιατί το αναφέρετε αυτό;
newtab-report-ads-reason-not-interested =
    .label = Δεν ενδιαφέρομαι
newtab-report-ads-reason-inappropriate =
    .label = Είναι ακατάλληλο
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Το έχω δει πάρα πολλές φορές
newtab-report-content-wrong-category =
    .label = Λάθος κατηγορία
newtab-report-content-outdated =
    .label = Παρωχημένο
newtab-report-content-inappropriate-offensive =
    .label = Ακατάλληλο ή προσβλητικό
newtab-report-content-spam-misleading =
    .label = Ανεπιθύμητο ή παραπλανητικό
newtab-report-content-requires-payment-subscription =
    .label = Απαιτεί πληρωμή ή συνδρομή
newtab-report-content-requires-payment-subscription-learn-more = Μάθετε περισσότερα
newtab-report-cancel = Ακύρωση
newtab-report-submit = Υποβολή
newtab-toast-thanks-for-reporting =
    .message = Ευχαριστούμε για την αναφορά σας.
newtab-toast-widgets-hidden =
    .message = Επιλέξτε το εικονίδιο μολυβιού για να προσθέσετε γραφικά στοιχεία ανά πάσα στιγμή.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Ακολουθείτε πλέον το θέμα «{ $topic }».
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Δεν ακολουθείτε πλέον το θέμα «{ $topic }».
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Δεν θα βλέπετε πλέον άρθρα σχετικά με το θέμα «{ $topic }».

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Οι δυνατότητες είναι απεριόριστες. Προσθέστε μια νέα.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Νέο
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Ολοκληρωμένες ({ $number })
newtab-widget-lists-celebration-headline = Καλή δουλειά
newtab-widget-lists-celebration-subhead = Όλα ολοκληρωμένα
newtab-widget-task-list-menu-copy = Αντιγραφή
newtab-widget-lists-menu-edit = Επεξεργασία ονόματος λίστας
newtab-widget-lists-menu-edit2 =
    .aria-label = Επεξεργασία ονόματος λίστας
newtab-widget-lists-menu-create = Δημιουργία νέας λίστας
newtab-widget-lists-menu-delete = Διαγραφή λίστας
newtab-widget-lists-menu-copy = Αντιγραφή λίστας στο πρόχειρο
newtab-widget-lists-menu-learn-more = Μάθετε περισσότερα
newtab-widget-lists-button-add-item = Προσθήκη στοιχείου
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Προσθήκη στοιχείου
    .aria-label = Προσθήκη στοιχείου
newtab-widget-lists-input-error = Συμπεριλάβετε κείμενο για να προσθέσετε ένα στοιχείο.
newtab-widget-lists-input-menu-open-link = Άνοιγμα συνδέσμου
newtab-widget-lists-input-menu-move-up = Μετακίνηση πάνω
newtab-widget-lists-input-menu-move-down = Μετακίνηση κάτω
newtab-widget-lists-input-menu-delete = Διαγραφή
newtab-widget-lists-input-menu-edit = Επεξεργασία
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Επεξεργασία στοιχείου
newtab-widget-lists-edit-clear =
    .aria-label = Ακύρωση
    .title = Ακύρωση
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Δημιουργία νέας λίστας
newtab-widget-lists-name-label-default =
    .label = Λίστα εργασιών
newtab-widget-lists-name-label-checklist =
    .label = Λίστα ελέγχου
newtab-widget-lists-name-placeholder-default =
    .placeholder = Λίστα εργασιών
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Λίστα ελέγχου
    .aria-label = Επεξεργασία ονόματος λίστας
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Νέα λίστα
    .aria-label = Επεξεργασία ονόματος λίστας
newtab-widget-section-title = Γραφικά στοιχεία
newtab-widget-menu-hide = Απόκρυψη γραφικού στοιχείου
newtab-widget-menu-change-size = Αλλαγή μεγέθους
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Μετακίνηση
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = Αριστερά
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = Δεξιά
newtab-widget-size-small = Μικρό
newtab-widget-size-medium = Μεσαίο
newtab-widget-size-large = Μεγάλο
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Απόκρυψη γραφικών στοιχείων
    .aria-label = Απόκρυψη όλων των γραφικών στοιχείων
newtab-widget-section-maximize =
    .title = Ανάπτυξη λίστας widgets
    .aria-label = Ανάπτυξη όλων των widgets σε πλήρη μέγεθος
newtab-widget-section-minimize =
    .title = Ελαχιστοποίηση γραφικών στοιχείων
    .aria-label = Σύμπτυξη όλων των γραφικών στοιχείων σε μικρό μέγεθος
newtab-widget-section-menu-button =
    .title = Μενού γραφικών στοιχείων
    .aria-label = Άνοιγμα μενού γραφικών στοιχείων
newtab-widget-add-widgets-button =
    .aria-label = Προσθήκη γραφικού στοιχείου
    .title = Προσθήκη γραφικού στοιχείου
newtab-widget-section-menu-manage = Διαχείριση γραφικών στοιχείων
newtab-widget-section-menu-hide-all = Απόκρυψη γραφικών στοιχείων
newtab-widget-section-menu-learn-more = Μάθετε περισσότερα
newtab-widget-section-feedback = Πείτε μας τη γνώμη σας
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Εμφάνιση περισσότερων γραφικών στοιχείων
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Εμφάνιση λιγότερων γραφικών στοιχείων
newtab-widget-lists-name-default = Λίστα ελέγχου

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Αντίστροφη μέτρηση
newtab-widget-timer-notification-focus = Ο χρόνος συγκέντρωσης τελείωσε. Πολύ καλή δουλειά! Χρειάζεστε ένα διάλειμμα;
newtab-widget-timer-notification-break = Το διάλειμμά σας τελείωσε. Έτοιμοι για συγκέντρωση;
newtab-widget-timer-notification-warning = Οι ειδοποιήσεις είναι ανενεργές
newtab-widget-timer-mode-focus =
    .label = Συγκέντρωση
newtab-widget-timer-mode-break =
    .label = Διάλειμμα
newtab-widget-timer-label-play =
    .label = Έναρξη
newtab-widget-timer-label-pause =
    .label = Παύση
newtab-widget-timer-reset =
    .title = Επαναφορά
newtab-widget-timer-menu-notifications = Απενεργοποίηση ειδοποιήσεων
newtab-widget-timer-menu-notifications-on = Ενεργοποίηση ειδοποιήσεων
newtab-widget-timer-menu-learn-more = Μάθετε περισσότερα
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Κορυφαίες επικεφαλίδες
newtab-daily-briefing-card-menu-dismiss = Απόρριψη
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Ενημερώθηκε πριν από { $minutes }λ
newtab-widget-message-title = Παραμείνετε συγκεντρωμένοι με τις λίστες και την ενσωματωμένη αντίστροφη μέτρηση
# to-dos stands for "things to do".
newtab-widget-message-copy = Από γρήγορες υπενθυμίσεις έως καθημερινές υποχρεώσεις, συνεδρίες συγκέντρωσης έως διαλείμματα: επικεντρωθείτε και ολοκληρώστε τις εργασίες σας εγκαίρως.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Ένα μέρος για συγκέντρωση, προγνώσεις καιρού και πολλά άλλα
newtab-widget-message-focus-forecasts-body = Κάντε την ημέρα σας πιο ομαλή με τα γραφικά στοιχεία του { -brand-product-name }. Δείτε τον καιρό, μείνετε προσηλωμένοι στις υποχρεώσεις σας ή παρακολουθήστε την ώρα σε όλο τον κόσμο.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Κάντε το { -brand-product-name } δικό σας
newtab-promo-card-body-addons = Επιλέξτε μια ταπετσαρία από τη συλλογή μας ή δημιουργήστε τη δική σας.
newtab-promo-card-cta-addons = Δοκιμή τώρα
newtab-promo-card-title = Υποστηρίξτε το { -brand-product-name }
newtab-promo-card-body = Οι χορηγοί μας υποστηρίζουν την αποστολή μας για ένα καλύτερο διαδίκτυο
newtab-promo-card-cta = Μάθετε περισσότερα
newtab-promo-card-dismiss-button =
    .title = Απόρριψη
    .aria-label = Απόρριψη

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Έναρξη αντίστροφης μέτρησης { $minutes } λεπτού
           *[other] Έναρξη αντίστροφης μέτρησης { $minutes } λεπτών
        }
newtab-widget-timer-pause-aria =
    .aria-label = Παύση αντίστροφης μέτρησης
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } λεπτό
           *[other] { $minutes } λεπτά
        }
newtab-widget-timer-decrease-min =
    .title = Μείωση κατά 1 λεπτό
newtab-widget-timer-increase-min =
    .title = Αύξηση κατά 1 λεπτό
newtab-widget-timer-mode-group =
    .aria-label = Λειτουργία αντίστροφης μέτρησης
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Συγκέντρωση
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Διάλειμμα
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Απόκρυψη αντίστροφης μέτρησης
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Καλή δουλειά
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Το διάλειμμά σας τελείωσε
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Χρειάζεστε διάλειμμα;
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Έτοιμοι για συγκέντρωση;

##

newtab-sports-widget-menu-follow-teams = Παρακολούθηση ομάδων
newtab-sports-widget-menu-view-schedule = Προβολή προγράμματος
newtab-sports-widget-menu-view-upcoming = Προβολή επερχόμενων
newtab-sports-widget-menu-view-results = Προβολή αποτελεσμάτων
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Σημαντικές ημερομηνίες
newtab-sports-widget-menu-learn-more = Μάθετε περισσότερα
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Παρακολουθήστε το Παγκόσμιο Κύπελλο
newtab-sports-widget-get-updates = Λάβετε ενημερώσεις αγώνων σε πραγματικό χρόνο και πολλά άλλα.
newtab-sports-widget-view-schedule =
    .label = Προβολή προγράμματος
newtab-sports-widget-follow-teams =
    .label = Παρακολούθηση ομάδων
newtab-sports-widget-view-matches =
    .label = Προβολή αγώνων
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
       *[other] Ακολουθήστε έως και { $number } ομάδες
    }
newtab-sports-widget-choose-wallpaper =
    .label = Επιλογή ταπετσαρίας
newtab-sports-widget-skip = Παράλειψη
newtab-sports-widget-search-country =
    .placeholder = Αναζήτηση χώρας
    .aria-label = Αναζήτηση χώρας
newtab-sports-widget-cancel = Ακύρωση
newtab-sports-widget-back-button =
    .aria-label = Πίσω
newtab-sports-widget-done-button =
    .label = Τέλος
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (αποκλείστηκε)
newtab-sports-widget-view-all =
    .label = Προβολή όλων
newtab-sports-widget-show-less =
    .label = Εμφάνιση λιγότερων
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Μόνο ομάδες που ακολουθείτε
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Παρακολούθηση
    .title = Παρακολούθηση ζωντανά
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Παρακολούθηση ζωντανά
    .title = Παρακολούθηση ζωντανά
newtab-sports-widget-watch-dialog-close =
    .aria-label = Κλείσιμο
    .title = Κλείσιμο
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Δωρεάν
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Δωρεάν δοκιμή
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Δωρεάν και επί πληρωμή
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Επί πληρωμή
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Επιλογή ορισμένων αγώνων
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Διαθέσιμο στην περιοχή σας
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Άλλες περιοχές
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Άνοιγμα μετάδοσης
    .title = Άνοιγμα μετάδοσης
newtab-sports-widget-group-stage = Φάση ομίλων
newtab-sports-widget-group-a = Όμιλος Α
newtab-sports-widget-group-b = Όμιλος Β
newtab-sports-widget-group-c = Όμιλος Γ
newtab-sports-widget-group-d = Όμιλος Δ
newtab-sports-widget-group-e = Όμιλος Ε
newtab-sports-widget-group-f = Όμιλος ΣΤ
newtab-sports-widget-group-g = Όμιλος Ζ
newtab-sports-widget-group-h = Όμιλος Η
newtab-sports-widget-group-i = Όμιλος Θ
newtab-sports-widget-group-j = Όμιλος Ι
newtab-sports-widget-group-k = Όμιλος Κ
newtab-sports-widget-group-l = Όμιλος Λ
newtab-sports-widget-round-32 = Φάση των 32
newtab-sports-widget-round-16 = Φάση των 16
newtab-sports-widget-quarter-finals = Προημιτελικοί
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = ΖΩΝΤΑΝΑ
newtab-custom-widget-live-refresh =
    .title = Ανανέωση βαθμολογιών
    .aria-label = Ανανέωση βαθμολογιών
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Σημαντικές ημερομηνίες
newtab-sports-widget-upcoming = Επερχόμενοι
# Used for a match currently ongoing
newtab-sports-widget-now = Τώρα
newtab-sports-widget-results = Αποτελέσματα
newtab-sports-widget-semi-finals = Ημιτελικοί
newtab-sports-widget-bronze-finals = Αγώνας τρίτης θέσης
# Final is the final match for 1st place.
newtab-sports-widget-final = Τελικός
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Καθυστέρησε
newtab-sports-widget-postponed = Αναβλήθηκε
newtab-sports-widget-suspended = Διακόπηκε
newtab-sports-widget-cancelled = Ακυρώθηκε
newtab-sports-widget-information = Πληροφορίες για τον αγώνα
newtab-sports-widget-no-live-data = Τα δεδομένα ζωντανού αγώνα δεν ενημερώνονται αυτήν τη στιγμή
newtab-sports-widget-view-results-link = Προβολή αποτελεσμάτων
newtab-sports-widget-third-place = Τρίτη θέση
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Φιναλίστ
newtab-sports-widget-champions = Πρωταθλητές
newtab-sports-widget-world-cup-champions = Πρωταθλητές Παγκοσμίου Κυπέλλου 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Κανονική διάρκεια
newtab-sports-widget-match-halftime = Ημίχρονο
newtab-sports-widget-match-extra-time = Παράταση
newtab-sports-widget-match-penalties = Πέναλτι

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Προηγούμενο
    .title = Προηγούμενο
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Επόμενο
    .title = Επόμενο
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Ζωντανός αγώνας { $index } από { $total }
    .title = Ζωντανός αγώνας { $index } από { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } εναντίον { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) εναντίον { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = Ζωντανά: { $homeTeam }, { $homeScore } εναντίον { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } εναντίον { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } εναντίον { $awayTeam }, καθυστέρησε
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } εναντίον { $awayTeam }, αναβλήθηκε
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } εναντίον { $awayTeam }, ανεστάλη
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } εναντίον { $awayTeam }, ακυρώθηκε

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Βοσνία και Ερζεγοβίνη
newtab-sports-widget-team-name-label-civ =
    .label = Ακτή Ελεφαντοστού
newtab-sports-widget-team-name-label-cod =
    .label = Λ.Δ. Κονγκό
newtab-sports-widget-team-name-label-eng =
    .label = Αγγλία
newtab-sports-widget-team-name-label-sco =
    .label = Σκωτία

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Ξεκινήστε το Παγκόσμιο Κύπελλο με νέες ταπετσαρίες
newtab-sports-widget-message-wallpapers-body = Φέρτε λίγη από την ατμόσφαιρα των αγώνων στο πρόγραμμα περιήγησής σας, καθ' όλη τη διάρκεια του τουρνουά.
newtab-sports-widget-message-wallpapers-cta = Επιλογή ταπετσαρίας
newtab-sports-widget-message-add-widgets-cta =
    .label = Προσθήκη γραφικών στοιχείων
newtab-sports-widget-message-day-in-play-title = Διατηρήστε την ημέρα σας γεμάτη δράση με τα γραφικά στοιχεία του { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Ακολουθήστε το Παγκόσμιο Κύπελλο, μείνετε προσηλωμένοι στις υποχρεώσεις σας, παρακολουθήστε την ώρα σε όλο τον κόσμο και πολλά άλλα.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Εξερεύνηση γραφικών στοιχείων

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Απόρριψη
    .aria-label = Απόρριψη
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Κάντε αυτόν τον χώρο δικό σας
newtab-activation-window-message-customization-focus-message = Επιλέξτε μια νέα ταπετσαρία, προσθέστε συντομεύσεις για αγαπημένους σας ιστοτόπους και ενημερωθείτε για άρθρα που σας ενδιαφέρουν.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Έναρξη προσαρμογής
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Αυτός ο χώρος ακολουθεί τους δικούς σας κανόνες
newtab-activation-window-message-values-focus-message = Το { -brand-product-name } σάς επιτρέπει να περιηγείστε όπως σας αρέσει, με έναν πιο προσωπικό τρόπο για να ξεκινήσετε τη μέρα σας στο διαδίκτυο. Κάντε το { -brand-product-name } δικό σας.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Απόκρυψη ρολογιού
newtab-clock-widget-menu-learn-more = Μάθετε περισσότερα
newtab-clock-widget-menu-edit = Επεξεργασία ρολογιών
newtab-clock-widget-menu-switch-to-12h = Εναλλαγή σε 12ωρη μορφή
newtab-clock-widget-menu-switch-to-24h = Εναλλαγή σε 24ωρη μορφή
newtab-clock-widget-label-your-clocks = Τα ρολόγια σας
newtab-clock-widget-search-location-input =
    .label = Τοποθεσία
    .placeholder = Αναζήτηση πόλης
    .aria-label = Αναζήτηση πόλης
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Ψευδώνυμο (προαιρετικό)
    .placeholder = Προσθήκη ψευδώνυμου
    .aria-label = Ψευδώνυμο (προαιρετικό)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Προσθήκη νέου ρολογιού
    .aria-label = Προσθήκη νέου ρολογιού
newtab-clock-widget-button-add-clock = Προσθήκη
newtab-clock-widget-button-cancel = Ακύρωση
newtab-clock-widget-button-back =
    .title = Πίσω
    .aria-label = Πίσω
newtab-clock-widget-button-edit-clock =
    .title = Επεξεργασία ρολογιού
    .aria-label = Επεξεργασία ρολογιού
newtab-clock-widget-button-save = Αποθήκευση
newtab-clock-widget-button-remove-clock =
    .title = Αφαίρεση ρολογιού
    .aria-label = Αφαίρεση ρολογιού
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
    .aria-label = { $city }, ψευδώνυμο: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Προσθήκη ρολογιού
newtab-clock-widget-edit-clock-form =
    .aria-label = Επεξεργασία ρολογιού
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Αποτελέσματα αναζήτησης
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Καμία αντιστοιχία
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Άνοιγμα μενού για ρολόι
    .aria-label = Άνοιγμα μενού για ρολόι
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Ψευδώνυμο: { $nickname }

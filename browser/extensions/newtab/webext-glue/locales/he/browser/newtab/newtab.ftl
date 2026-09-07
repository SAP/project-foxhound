# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = לשונית חדשה
newtab-settings-button =
    .title = התאמה אישית של דף הלשונית החדשה שלך
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = התאמה אישית של דף זה
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = התאמה אישית
newtab-customize-panel-label =
    .label = התאמה אישית
newtab-personalize-settings-icon-label =
    .title = התאמה אישית של דף הלשונית החדשה
    .aria-label = הגדרות
newtab-settings-dialog-label =
    .aria-label = הגדרות
newtab-personalize-icon-label =
    .title = התאמה אישית של דף הלשונית החדשה
    .aria-label = התאמה אישית של דף הלשונית החדשה
newtab-personalize-dialog-label =
    .aria-label = התאמה אישית
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = סגירה
    .aria-label = סגירה

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = דף הבית
home-homepage-new-windows =
    .label = חלונות חדשים
home-homepage-new-tabs =
    .label = לשוניות חדשות
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = בחירה באתר מסוים

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = כתובות אתרי אינטרנט
home-custom-homepage-address =
    .placeholder = נא להכניס כתובת
home-custom-homepage-address-button =
    .label = הוספת כתובת
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = עדיין לא נוספו אתרים.
home-custom-homepage-delete-address-button =
    .aria-label = מחיקת כתובת
    .title = מחיקת כתובת
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = החלפה עם
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = הדפים הפתוחים הנוכחיים
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = סימניות…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = חיפוש
home-prefs-stories-header2 =
    .label = סיפורים
    .description = תוכן יוצא דופן שנבחר בקפידה על־ידי משפחת { -brand-product-name }
home-prefs-widgets-header =
    .label = ווידג’טים
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = רשימות
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = שעון עצר
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = ספורט
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = שעון
home-prefs-mission-message2 =
    .message = נותני החסות שלנו תומכים במשימה שלנו לבנות אינטרנט טוב יותר.
home-prefs-manage-topics-link2 =
    .label = ניהול נושאים
home-prefs-choose-wallpaper-link2 =
    .label = בחירת תמונת רקע
home-prefs-firefox-logo-header =
    .label = הסמל של { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = כדי להשתמש באפשרויות אלה, יש להגדיר את הלשונית החדשה או חלונות חדשים כ{ -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] שורה אחת
           *[other] { $num } שורות
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = הרחבה ({ $extension })
home-restore-defaults-srd =
    .label = שחזור ברירות מחדל
    .accesskey = ש
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (ברירת מחדל)
home-mode-choice-custom-srd =
    .label = כתובות מותאמות אישית…
home-mode-choice-blank-srd =
    .label = דף ריק
home-prefs-shortcuts-header-srd =
    .label = קיצורי דרך
home-prefs-shortcuts-select =
    .aria-label = קיצורי דרך
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = קיצורי דרך ממומנים
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = סיפורים ממומנים
home-prefs-highlights-option-visited-pages-srd =
    .label = עמודים בהם ביקרת
home-prefs-highlights-options-bookmarks-srd =
    .label = סימניות
home-prefs-highlights-option-most-recent-download-srd =
    .label = ההורדות האחרונות
home-prefs-recent-activity-header-srd =
    .label = פעילות אחרונה
home-prefs-recent-activity-select =
    .aria-label = פעילות אחרונה
home-prefs-weather-header-srd =
    .label = מזג אוויר
home-prefs-support-firefox-header-srd =
    .label = תמיכה ב־{ -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = כיצד?

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = חיפוש
    .aria-label = חיפוש
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = ‏ניתן לחפש עם { $engine } או להקליד כתובת
newtab-search-box-handoff-text-no-engine = חיפוש או הכנסת כתובת
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = ‏ניתן לחפש עם { $engine } או להקליד כתובת
    .title = ‏ניתן לחפש עם { $engine } או להקליד כתובת
    .aria-label = ‏ניתן לחפש עם { $engine } או להקליד כתובת
newtab-search-box-handoff-input-no-engine =
    .placeholder = חיפוש או הכנסת כתובת
    .title = חיפוש או הכנסת כתובת
    .aria-label = חיפוש או הכנסת כתובת
newtab-search-box-text = חיפוש ברשת
newtab-search-box-input =
    .placeholder = חיפוש ברשת
    .aria-label = חיפוש ברשת

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = הוספת מנוע חיפוש
newtab-topsites-add-shortcut-header = קיצור דרך חדש
newtab-topsites-edit-topsites-header = עריכת אתר מוביל
newtab-topsites-edit-shortcut-header = עריכת קיצור דרך
newtab-topsites-add-shortcut-label = הוספת קיצור דרך
newtab-topsites-add-shortcut-title =
    .title = הוספת קיצור דרך
    .aria-label = הוספת קיצור דרך
newtab-topsites-title-label = כותרת
newtab-topsites-title-input =
    .placeholder = נא להזין כותרת
newtab-topsites-url-label = כתובת
newtab-topsites-url-input =
    .placeholder = נא להקליד או להזין כתובת
newtab-topsites-url-validation = נדרשת כתובת תקינה
newtab-topsites-image-url-label = כתובת תמונה מותאמת אישית
newtab-topsites-use-image-link = שימוש בתמונה מותאמת אישית…
newtab-topsites-image-validation = טעינת התמונה נכשלה. נא לנסות כתובת שונה.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = ניקוי טקסט

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = ביטול
newtab-topsites-delete-history-button = מחיקה מההיסטוריה
newtab-topsites-save-button = שמירה
newtab-topsites-preview-button = תצוגה מקדימה
newtab-topsites-add-button = הוספה

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = למחוק כל עותק של העמוד הזה מההיסטוריה שלך?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = לא ניתן לבטל פעולה זו.

## Top Sites - Sponsored label

newtab-topsite-sponsored = ממומן

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = ‏{ $title } (נעוץ)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = פתיחת תפריט
    .aria-label = פתיחת תפריט
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = הסרה
    .aria-label = הסרה
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = פתיחת תפריט
    .aria-label = פתיחת תפריט ההקשר עבור { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = עריכת אתר זה
    .aria-label = עריכת אתר זה

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = עריכה
newtab-menu-open-new-window = פתיחה בחלון חדש
newtab-menu-open-new-private-window = פתיחה בחלון פרטי חדש
newtab-menu-dismiss = הסרה
newtab-menu-pin = נעיצה
newtab-menu-unpin = ביטול נעיצה
newtab-menu-delete-history = מחיקה מההיסטוריה
newtab-menu-save-to-pocket = שמירה אל { -pocket-brand-name }
newtab-menu-delete-pocket = מחיקה מ־{ -pocket-brand-name }
newtab-menu-archive-pocket = העברה לארכיון ב־{ -pocket-brand-name }
newtab-menu-about-fakespot = על אודות { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = דיווח
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = חסימה
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = ביטול המעקב
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = מידע נוסף
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = ביטול המעקב אחרי הנושא

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = ניהול תוכן ממומן
newtab-menu-our-sponsors-and-your-privacy = נותני החסות שלנו והפרטיות שלך
newtab-menu-report-this-ad = דיווח על פרסומת זו

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = סיום
newtab-privacy-modal-button-manage = ניהול הגדרות תוכן ממומן
newtab-privacy-modal-header = הפרטיות שלך חשובה.
newtab-privacy-modal-link = הסבר על האופן בו עובדת הפרטיות שלך בלשונית החדשה

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = הסרת סימנייה
# Bookmark is a verb here.
newtab-menu-bookmark = הוספת סימנייה

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = העתקת קישור ההורדה
newtab-menu-go-to-download-page = מעבר לעמוד ההורדה
newtab-menu-remove-download = הסרה מההיסטוריה

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] הצגה ב־Finder
       *[other] פתיחת תיקייה מכילה
    }
newtab-menu-open-file = פתיחת הקובץ

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = ביקורים קודמים
newtab-label-bookmarked = שמור כסימנייה
newtab-label-removed-bookmark = הסימנייה הוסרה
newtab-label-recommended = פופולרי
newtab-label-saved = נשמר ל־{ -pocket-brand-name }
newtab-label-download = התקבל
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · ממומן
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = בחסות { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time =
    { $timeToRead ->
        [1] ‏{ $source }  · דקה אחת
       *[other] ‏{ $source } · { $timeToRead } דקות
    }
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = ממומן

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = הסרת מדור
newtab-section-menu-collapse-section = צמצום מדור
newtab-section-menu-expand-section = הרחבת מדור
newtab-section-menu-manage-section = ניהול מדור
newtab-section-menu-manage-webext = ניהול הרחבה
newtab-section-menu-add-topsite = הוספת אתר מוביל
newtab-section-menu-add-search-engine = הוספת מנוע חיפוש
newtab-section-menu-move-up = העברה למעלה
newtab-section-menu-move-down = העברה למטה
newtab-section-menu-privacy-notice = הצהרת פרטיות

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = צמצום מדור
newtab-section-expand-section-label =
    .aria-label = הרחבת מדור

## Section Headers.

newtab-section-header-topsites = אתרים מובילים
newtab-section-header-recent-activity = פעילות אחרונה
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = מומלץ על־ידי { $provider }
newtab-section-header-stories = סיפורים מעוררי מחשבה
# "picks" refers to recommended articles
newtab-section-header-todays-picks = המאמרים של היום בשבילך

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = ניתן להתחיל בגלישה ואנו נציג בפניך מספר כתבות, סרטונים ועמודים שונים מעולים בהם ביקרת לאחרונה או שהוספת לסימניות.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = התעדכנת בכל הסיפורים. כדאי לנסות שוב מאוחר יותר כדי לקבל עוד סיפורים מובילים מאת { $provider }. לא רוצה לחכות? ניתן לבחור נושא נפוץ כדי למצוא עוד סיפורים נפלאים מרחבי הרשת.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = התעדכנת בכל הסיפורים. כדאי לנסות שוב מאוחר יותר כדי לקבל עוד סיפורים. לא רוצה לחכות? ניתן לבחור נושא נפוץ כדי למצוא עוד סיפורים נפלאים מרחבי הרשת.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-try-again-button = ניסיון חוזר
newtab-discovery-empty-section-topstories-loading = בטעינה…

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = נושאים פופולריים:
newtab-pocket-new-topics-title = רוצה אפילו עוד סיפורים? ניתן לעיין בנושאים הנפוצים האלו מ־{ -pocket-brand-name }
newtab-pocket-more-recommendations = המלצות נוספות
newtab-pocket-learn-more = מידע נוסף
newtab-pocket-cta-button = קבלת { -pocket-brand-name }
newtab-pocket-cta-text = שמירת הסיפורים שאהבת ב־{ -pocket-brand-name } על מנת למלא את מחשבתך בקריאה מרתקת.
newtab-pocket-pocket-firefox-family = ‏{ -pocket-brand-name } הוא חלק ממשפחת { -brand-product-name }
newtab-pocket-save = שמירה
newtab-pocket-saved = נשמר

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = ארצה עוד כאלה
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = לא בשבילי
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = תודה. המשוב שלך יעזור לנו לשפר את הפיד שלך.
newtab-toast-dismiss-button =
    .title = סגירה
    .aria-label = סגירה

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = לגלות את המיטב של האינטרנט
newtab-pocket-onboarding-cta = ‏{ -pocket-brand-name } חוקר מגוון רחב של פרסומים כדי להביא את התוכן האינפורמטיבי, מעורר ההשראה והאמין ביותר ישירות לדפדפן ה־{ -brand-product-name } שלך.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = אופס, משהו השתבש בעת טעינת התוכן הזה.
newtab-error-fallback-refresh-link = נא לרענן את הדף כדי לנסות שוב.

## Customization Menu

newtab-custom-shortcuts-title = קיצורי דרך
newtab-custom-shortcuts-subtitle = אתרים ששמרת או ביקרת בהם
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = קיצורי דרך
    .description = אתרים ששמרת או ביקרת בהם
newtab-custom-shortcuts-nova =
    .label = קיצורי דרך
newtab-custom-row-description =
    .description = מספר שורות
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] שורה אחת
           *[other] { $num } שורות
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] שורה אחת
       *[other] { $num } שורות
    }
newtab-custom-sponsored-sites = קיצורי דרך ממומנים
newtab-custom-pocket-title = מומלץ על־ידי { -pocket-brand-name }
newtab-custom-pocket-subtitle = תוכן יוצא דופן שנבחר בקפידה על־ידי { -pocket-brand-name }, חלק ממשפחת { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = סיפורים מומלצים
    .description = תוכן יוצא דופן שנבחר בקפידה על־ידי משפחת { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = סיפורים מומלצים
newtab-custom-stories-personalized-toggle =
    .label = סיפורים
newtab-custom-stories-personalized-checkbox-label = סיפורים מותאמים אישית המבוססים על הפעילות שלך
newtab-custom-pocket-sponsored = סיפורים ממומנים
newtab-custom-pocket-show-recent-saves = הצגת שמירות אחרונות
newtab-custom-recent-title = פעילות אחרונה
newtab-custom-recent-subtitle = מבחר של אתרים ותכנים אחרונים
newtab-custom-weather-toggle =
    .label = מזג אוויר
    .description = התחזית של היום
newtab-custom-widget-weather-toggle =
    .label = מזג אוויר
newtab-custom-widget-lists-toggle =
    .label = רשימות
newtab-custom-widget-timer-toggle =
    .label = שעון עצר
newtab-custom-widget-sports-toggle =
    .label = מונדיאל
newtab-custom-widget-clock-toggle =
    .label = שעון
newtab-custom-widget-sports-toggle2 =
    .label = ספורט
newtab-custom-widget-section-title = ווידג’טים
newtab-custom-widget-section-toggle =
    .label = ווידג’טים
newtab-widget-manage-title = ווידג’טים
newtab-widget-manage-widget-button =
    .label = ניהול ווידג’טים
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = סגירה
    .aria-label = סגירת תפריט
newtab-custom-close-button = סגירה
newtab-custom-settings = ניהול הגדרות נוספות

## New Tab Wallpapers

newtab-wallpaper-title = תמונות רקע
newtab-wallpaper-reset = איפוס לברירת מחדל
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = העלאת תמונה
newtab-wallpaper-add-an-image = הוספת תמונה
newtab-wallpaper-custom-color = בחירת צבע
newtab-wallpaper-toggle-title =
    .label = תמונות רקע
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = התמונה חרגה ממגבלת גודל הקובץ של { $file_size } מ״ב. נא לנסות להעלות קובץ קטן יותר.
newtab-wallpaper-error-upload-file-type = לא הצלחנו להעלות את הקובץ שלך. נא לנסות שוב עם קובץ תמונה.
newtab-wallpaper-error-file-type = לא הצלחנו להעלות את הקובץ שלך. נא לנסות שוב עם סוג קובץ אחר.
newtab-wallpaper-light-red-panda = פנדה אדומה
newtab-wallpaper-light-mountain = הר לבן
newtab-wallpaper-light-sky = שמיים עם עננים סגולים וורודים
newtab-wallpaper-light-color = צורות כחולות, ורודות וצהובות
newtab-wallpaper-light-landscape = נוף הררי עם ערפל כחול
newtab-wallpaper-light-beach = חוף עם עץ דקל
newtab-wallpaper-dark-aurora = זוהר צפוני
newtab-wallpaper-dark-color = צורות אדומות וכחולות
newtab-wallpaper-dark-panda = פנדה אדומה חבויה ביער
newtab-wallpaper-dark-sky = נוף עיר עם שמי לילה
newtab-wallpaper-dark-mountain = נוף הררי
newtab-wallpaper-dark-city = נוף עירוני סגול
newtab-wallpaper-dark-fox-anniversary = שועל על המדרכה ליד יער
newtab-wallpaper-light-fox-anniversary = שועל בשדה עשב עם נוף הררי ערפילי

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = צבעים אחידים
newtab-wallpaper-colors = צבעים
newtab-wallpaper-blue = כחול
newtab-wallpaper-light-blue = כחול בהיר
newtab-wallpaper-light-purple = סגול בהיר
newtab-wallpaper-light-green = ירוק בהיר
newtab-wallpaper-green = ירוק
newtab-wallpaper-beige = בז’
newtab-wallpaper-yellow = צהוב
newtab-wallpaper-orange = כתום
newtab-wallpaper-pink = ורוד
newtab-wallpaper-light-pink = ורוד בהיר
newtab-wallpaper-red = אדום
newtab-wallpaper-dark-blue = כחול כהה
newtab-wallpaper-dark-purple = סגול כהה
newtab-wallpaper-dark-green = ירוק כהה
newtab-wallpaper-brown = חום

## Abstract

newtab-wallpaper-category-title-abstract = מופשט
newtab-wallpaper-abstract-green = צורות ירוקות
newtab-wallpaper-abstract-blue = צורות כחולות
newtab-wallpaper-abstract-purple = צורות סגולות
newtab-wallpaper-abstract-orange = צורות כתומות
newtab-wallpaper-gradient-orange = מעברי צבע כתום וורוד
newtab-wallpaper-abstract-blue-purple = צורות כחולות וסגולות
newtab-wallpaper-abstract-white-curves = לבן עם קימורים מוצללים
newtab-wallpaper-abstract-purple-green = מעברי צבע סגול וירוק
newtab-wallpaper-abstract-blue-purple-waves = צורות גליות בצבע כחול וסגול
newtab-wallpaper-abstract-black-waves = צורות גליות בצבע שחור

## Firefox

newtab-wallpaper-category-title-photographs = תצלומים
newtab-wallpaper-beach-at-sunrise = זריחה בחוף הים
newtab-wallpaper-beach-at-sunset = שקיעה בחוף הים
newtab-wallpaper-storm-sky = שמיים סוערים
newtab-wallpaper-sky-with-pink-clouds = שמיים עם עננים ורודים
newtab-wallpaper-red-panda-yawns-in-a-tree = פנדה אדומה מפהקת בעץ
newtab-wallpaper-white-mountains = הרים לבנים
newtab-wallpaper-hot-air-balloons = מגוון צבעים של בלוני אוויר חם במהלך שעות היום
newtab-wallpaper-starry-canyon = ליל כוכבים כחול
newtab-wallpaper-suspension-bridge = תצלום של גשר תלוי אפור במהלך שעות היום
newtab-wallpaper-sand-dunes = דיונות חול לבן
newtab-wallpaper-palm-trees = צללית של עצי דקל קוקוס במהלך שעת הזהב
newtab-wallpaper-blue-flowers = צילום תקריב של פרחים כחולי כותרת בפריחה
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = תמונה מאת <a data-l10n-name="name-link">{ $author_string }</a> ב־<a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = אולי איזה מגע של צבע
newtab-wallpaper-feature-highlight-content = תנו ללשונית החדשה שלכם מראה רענן עם תמונות רקע.
newtab-wallpaper-feature-highlight-button = הבנתי
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = סגירה
    .aria-label = סגירת ההודעה הקופצת
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = שמימי
newtab-wallpaper-celestial-lunar-eclipse = ליקוי ירח
newtab-wallpaper-celestial-earth-night = צילום לילה ממסלול לווייני נמוך של כדור הארץ
newtab-wallpaper-celestial-starry-sky = שמי כוכבים
newtab-wallpaper-celestial-eclipse-time-lapse = ליקוי ירח בהילוך מהיר
newtab-wallpaper-celestial-black-hole = איור של גלקסיית חור שחור
newtab-wallpaper-celestial-river = תמונת לוויין של נהר

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = הצגת התחזית ב־{ $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = ‏{ $provider } ∙ ממומן
newtab-weather-menu-change-location = שינוי מקום
newtab-weather-change-location-search-input-placeholder =
    .placeholder = חיפוש מקום
    .aria-label = חיפוש מקום
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = שימוש במיקום הנוכחי
newtab-weather-menu-weather-display = תצוגת מזג אוויר
newtab-weather-todays-forecast = תחזית היום
newtab-weather-see-full-forecast = הצגת תחזית מלאה
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = פשוטה
newtab-weather-menu-change-weather-display-simple = מעבר לתצוגה פשוטה
newtab-weather-menu-weather-display-option-detailed = מפורטת
newtab-weather-menu-change-weather-display-detailed = מעבר לתצוגה מפורטת
newtab-weather-menu-temperature-units = יחידות טמפרטורה
newtab-weather-menu-temperature-option-fahrenheit = פרנהייט
newtab-weather-menu-temperature-option-celsius = צלזיוס
newtab-weather-menu-change-temperature-units-fahrenheit = מעבר לפרנהייט
newtab-weather-menu-change-temperature-units-celsius = מעבר לצלזיוס
newtab-weather-menu-hide-weather = הסתרת מזג האוויר בלשונית החדשה
newtab-weather-menu-learn-more = מידע נוסף
newtab-weather-menu-detect-my-location = זיהוי המיקום שלי
# This message is shown if user is working offline
newtab-weather-error-not-available = נתוני מזג האוויר אינם זמינים כעת.
newtab-weather-opt-in-see-weather = האם ברצונך לראות את מזג האוויר עבור המיקום שלך?
newtab-weather-opt-in-not-now =
    .label = לא כעת
newtab-weather-opt-in-yes =
    .label = כן
newtab-weather-opt-in-headline = קבלת תחזית מזג האוויר המקומית שלך
newtab-weather-opt-in-use-location =
    .label = שימוש במיקום
newtab-weather-opt-in-choose-location = בחירת מיקום
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = גבוה
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = נמוך
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = הצגת התחזית ב־{ $provider }
    .aria-description = ‏{ $provider } ∙ ממומן

## Topic Labels

newtab-topic-label-business = עסקים
newtab-topic-label-career = קריירה
newtab-topic-label-education = חינוך
newtab-topic-label-arts = בידור
newtab-topic-label-food = אוכל
newtab-topic-label-health = בְּרִיאוּת
newtab-topic-label-hobbies = משחקים
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = כסף
newtab-topic-label-society-parenting = הורות
newtab-topic-label-government = פוליטיקה
newtab-topic-label-education-science = מדע
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = טיפים לחיים
newtab-topic-label-sports = ספורט
newtab-topic-label-tech = טכנולוגיה
newtab-topic-label-travel = טיולים
newtab-topic-label-home = בית וגן

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = נא לבחור בנושאים כדי לכוונן את הפיד שלך
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = נא לבחור בשני נושאים או יותר. המומחים שלנו נותנים עדיפות לסיפורים המותאמים לתחומי העניין שלך. ניתן לעדכן אותם בכל עת.
newtab-topic-selection-save-button = שמירה
newtab-topic-selection-cancel-button = ביטול
newtab-topic-selection-button-maybe-later = אולי אחר כך
newtab-topic-selection-privacy-link = כיצד אנו מגנים על נתונים ומנהלים אותם
newtab-topic-selection-button-update-interests = עדכון תחומי העניין שלך
newtab-topic-selection-button-pick-interests = בחירת תחומי העניין שלך

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = לעקוב
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = מעקב אחרי { $topic }
newtab-section-following-button = במעקב
newtab-section-unfollow-button = ביטול המעקב
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = במעקב: ביטול מעקב אחרי { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = כיוונון הפיד שלך
newtab-section-follow-highlight-subtitle = ניתן לעקוב אחר תחומי העניין שלך כדי לראות עוד ממה שאהוב עליך.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = חסימה
newtab-section-blocked-button = חסום
newtab-section-unblock-button = הסרת חסימה
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = מעקב אחרי { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = ביטול מעקב אחרי { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = חסימת { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = ביטול חסימת { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = לא כעת
newtab-section-confirm-block-topic-p1 = האם ברצונך לחסום נושא זה?
newtab-section-confirm-block-topic-p2 = נושאים חסומים לא יופיעו יותר בפיד שלך.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = חסימת { $topic }
newtab-section-block-cancel-button = ביטול

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = נושאים
newtab-section-manage-topics-button-v2 =
    .label = ניהול נושאים
newtab-section-mangage-topics-followed-topics = במעקב
newtab-section-mangage-topics-followed-topics-empty-state = עדיין לא עקבת אחר אף נושא.
newtab-section-mangage-topics-blocked-topics = חסום
newtab-section-mangage-topics-blocked-topics-empty-state = עדיין לא חסמת אף נושא.
newtab-custom-wallpaper-title = טפטים מותאמים אישית נמצאים כאן
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = ניתן להעלות טפט משלך או לבחור בצבע מותאם אישית כדי להפוך את { -brand-product-name } לשלך.
newtab-custom-wallpaper-cta = בואו ננסה

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = ניתן לבחור בטפט כדי להפוך את { -brand-product-name } לשלך
newtab-new-user-custom-wallpaper-subtitle = כל לשונית חדשה יכולה לקבל תחושה של בית עם טפטים וצבעים מותאמים אישית.
newtab-new-user-custom-wallpaper-cta = לנסות עכשיו

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = תמונות רקע חדשות ורעננות זה עתה הגיעו
newtab-wallpaper-feature-highlight-subtitle = ניתן לבחור במועדף עליך ולגרום לכל לשונית חדשה להרגיש כמו בית.
newtab-wallpaper-feature-highlight-cta = בחירת תמונת רקע

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = הורדת { -brand-product-name } לנייד
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = יש לסרוק את הקוד כדי לגלוש בבטחה בדרכים.
newtab-download-mobile-highlight-body-variant-b = ניתן להמשיך מאיפה שהפסקת על־ידי סנכרון הלשוניות, הססמאות ועוד.
newtab-download-mobile-highlight-body-variant-c = ידעת שניתן לקחת את { -brand-product-name } לדרכים? אותו הדפדפן, בכיס שלך.
newtab-download-mobile-highlight-image =
    .aria-label = קוד QR להורדת { -brand-product-name } לנייד

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = המועדפים שלך בקצות האצבעות
newtab-shortcuts-highlight-subtitle = ניתן להוסיף קיצור דרך כדי לשמור את האתרים המועדפים עליך במרחק קליק אחד.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = על מה הדיווח?
newtab-report-ads-reason-not-interested =
    .label = אין לי עניין בזה
newtab-report-ads-reason-inappropriate =
    .label = זה לא הולם
newtab-report-ads-reason-seen-it-too-many-times =
    .label = ראיתי את זה יותר מדי פעמים
newtab-report-content-wrong-category =
    .label = קטגוריה שגויה
newtab-report-content-outdated =
    .label = מיושן
newtab-report-content-inappropriate-offensive =
    .label = בלתי הולם או פוגעני
newtab-report-content-spam-misleading =
    .label = ספאם או הטעיה
newtab-report-content-requires-payment-subscription =
    .label = דורש תשלום או מינוי
newtab-report-content-requires-payment-subscription-learn-more = מידע נוסף
newtab-report-cancel = ביטול
newtab-report-submit = שליחה
newtab-toast-thanks-for-reporting =
    .message = תודה שדיווחת על זה.
newtab-toast-widgets-hidden =
    .message = ניתן ללחוץ על סמל העיפרון כדי להוסיף ווידג’טים בחזרה בכל עת.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = התחלת לעקוב אחרי { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = הפסקת לעקוב אחרי { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = לא יוצגו יותר סיפורים בנושא { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = האפשרויות הן אינסופיות. בואו ונוסיף אחת כזאת.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = חדש
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = הושלמו ({ $number })
newtab-widget-lists-celebration-headline = עבודה יפה
newtab-widget-lists-celebration-subhead = אין משימות פתוחות
newtab-widget-task-list-menu-copy = העתקה
newtab-widget-lists-menu-edit = עריכת שם הרשימה
newtab-widget-lists-menu-edit2 =
    .aria-label = עריכת שם הרשימה
newtab-widget-lists-menu-create = יצירת רשימה חדשה
newtab-widget-lists-menu-delete = מחיקת רשימה זו
newtab-widget-lists-menu-copy = העתקת הרשימה ללוח העריכה
newtab-widget-lists-menu-learn-more = מידע נוסף
newtab-widget-lists-button-add-item = הוספת פריט
newtab-widget-lists-input-add-an-item2 =
    .placeholder = הוספת פריט
    .aria-label = הוספת פריט
newtab-widget-lists-input-error = נא לכלול טקסט כדי להוסיף פריט.
newtab-widget-lists-input-menu-open-link = פתיחת קישור
newtab-widget-lists-input-menu-move-up = להזיז מעלה
newtab-widget-lists-input-menu-move-down = להזיז מטה
newtab-widget-lists-input-menu-delete = מחיקה
newtab-widget-lists-input-menu-edit = עריכה
newtab-widget-lists-input-menu-edit2 =
    .aria-label = עריכת פריט
newtab-widget-lists-edit-clear =
    .aria-label = ביטול
    .title = ביטול
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + יצירת רשימה חדשה
newtab-widget-lists-name-label-default =
    .label = רשימת משימות
newtab-widget-lists-name-label-checklist =
    .label = רשימת תיוג
newtab-widget-lists-name-placeholder-default =
    .placeholder = רשימת משימות
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = רשימת תיוג
    .aria-label = עריכת שם הרשימה
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = רשימה חדשה
    .aria-label = עריכת שם הרשימה
newtab-widget-section-title = ווידג’טים
newtab-widget-menu-hide = הסתרת הווידג׳ט
newtab-widget-menu-change-size = שינוי גודל
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = העברה
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = שמאלה
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = ימינה
newtab-widget-size-small = קטן
newtab-widget-size-medium = בינוני
newtab-widget-size-large = גדול
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = הסתרת ווידג׳טים
    .aria-label = הסתרת כל הווידג׳טים
newtab-widget-section-maximize =
    .title = הרחבת ווידג׳טים
    .aria-label = הרחבת כל הווידג׳טים לגודל מלא
newtab-widget-section-minimize =
    .title = מזעור ווידג׳טים
    .aria-label = צמצום כל הווידג׳טים לגודל קומפקטי
newtab-widget-section-menu-button =
    .title = תפריט ווידג’טים
    .aria-label = פתיחת תפריט ווידג’טים
newtab-widget-add-widgets-button =
    .aria-label = הוספת ווידג׳ט
    .title = הוספת ווידג׳ט
newtab-widget-section-menu-manage = ניהול ווידג’טים
newtab-widget-section-menu-hide-all = הסתרת ווידג׳טים
newtab-widget-section-menu-learn-more = מידע נוסף
newtab-widget-section-feedback = ספרו לנו מה דעתכם
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = להציג יותר ווידג’טים
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = להציג פחות ווידג’טים
newtab-widget-lists-name-default = רשימת תיוג

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = שעון עצר
newtab-widget-timer-notification-focus = זמן הריכוז נגמר. עבודה יפה. יש לך צורך בהפסקה?
newtab-widget-timer-notification-break = ההפסקה שלך הסתיימה. נחזור בחזרה להתרכז?
newtab-widget-timer-notification-warning = ההתרעות כבויות
newtab-widget-timer-mode-focus =
    .label = ריכוז
newtab-widget-timer-mode-break =
    .label = הפסקה
newtab-widget-timer-label-play =
    .label = הפעלה
newtab-widget-timer-label-pause =
    .label = השהייה
newtab-widget-timer-reset =
    .title = איפוס
newtab-widget-timer-menu-notifications = כיבוי התרעות
newtab-widget-timer-menu-notifications-on = הפעלת התרעות
newtab-widget-timer-menu-learn-more = מידע נוסף
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = כותרות מובילות
newtab-daily-briefing-card-menu-dismiss = סגירה
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp =
    { $minutes ->
        [one] עודכן לפני דקה אחת
       *[other] עודכן לפני { $minutes } דקות
    }
newtab-widget-message-title = להישאר מרוכז בעזרת רשימות ושעון עצר מובנה
# to-dos stands for "things to do".
newtab-widget-message-copy = מתזכורות מהירות ועד למשימות יומיות, מזמני התמקדות ועד להפסקות להתמתחות - כך ניתן להספיק את המשימות בזמן.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = מקום אחד למיקוד, תחזיות ועוד
newtab-widget-message-focus-forecasts-body = תנו ליום שלכם לזרום עם הווידג’טים של { -brand-product-name }. בדקו את התחזית, הישארו ממוקדים במשימות, או עקבו אחרי השעה ברחבי העולם.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = להפוך את { -brand-product-name } לשלך
newtab-promo-card-body-addons = ניתן לבחור תמונת רקע מהאוסף שלנו, או ליצור אחד משלך.
newtab-promo-card-cta-addons = לנסות עכשיו
newtab-promo-card-title = תמיכה ב־{ -brand-product-name }
newtab-promo-card-body = נותני החסות שלנו תומכים במשימה שלנו לבנות אינטרנט טוב יותר
newtab-promo-card-cta = מידע נוסף
newtab-promo-card-dismiss-button =
    .title = סגירה
    .aria-label = סגירה

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] הפעלת שעון עצר של דקה אחת
           *[other] הפעלת שעון עצר של { $minutes } דקות
        }
newtab-widget-timer-pause-aria =
    .aria-label = השהיית שעון עצר
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] דקה אחת
           *[other] { $minutes } דקות
        }
newtab-widget-timer-decrease-min =
    .title = הפחתה של דקה אחת
newtab-widget-timer-increase-min =
    .title = הוספה של דקה אחת
newtab-widget-timer-mode-group =
    .aria-label = מצב שעון עצר
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = ריכוז
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = הפסקה
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = הסתרת שעון עצר
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = עבודה טובה
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = ההפסקה שלך הסתיימה
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = יש לך צורך בהפסקה?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = נחזור להתרכז?

##

newtab-sports-widget-menu-follow-teams = מעקב אחרי נבחרות
newtab-sports-widget-menu-view-schedule = הצגת לוח זמנים
newtab-sports-widget-menu-view-upcoming = הצגת המשחקים הבאים
newtab-sports-widget-menu-view-results = הצגת תוצאות
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = תאריכי מפתח
newtab-sports-widget-menu-learn-more = מידע נוסף
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = מעקב אחרי המונדיאל
newtab-sports-widget-get-updates = קבלת עדכונים חיים על משחקים ועוד.
newtab-sports-widget-view-schedule =
    .label = הצגת לוח זמנים
newtab-sports-widget-follow-teams =
    .label = מעקב אחרי נבחרות
newtab-sports-widget-view-matches =
    .label = הצגת משחקים
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] מעקב אחר נבחרת אחת
       *[other] מעקב אחר עד { $number } נבחרות
    }
newtab-sports-widget-choose-wallpaper =
    .label = בחירת תמונת רקע
newtab-sports-widget-skip = דילוג
newtab-sports-widget-search-country =
    .placeholder = חיפוש מדינה
    .aria-label = חיפוש מדינה
newtab-sports-widget-cancel = ביטול
newtab-sports-widget-back-button =
    .aria-label = חזרה
newtab-sports-widget-done-button =
    .label = סיום
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (הודח)
newtab-sports-widget-view-all =
    .label = להציג הכל
newtab-sports-widget-show-less =
    .label = להציג פחות
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = רק נבחרות במעקב
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = צפייה
    .title = צפייה בשידור חי
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = צפייה בשידור חי
    .title = צפייה בשידור חי
newtab-sports-widget-watch-dialog-close =
    .aria-label = סגירה
    .title = סגירה
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = חינמי
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = תקופות ניסיון חינמית
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = חינמי ובתשלום
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = בתשלום
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = משחקים נבחרים בלבד
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = זמין באזור שלך
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = אזורים אחרים
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = פתיחת השידור
    .title = פתיחת השידור
newtab-sports-widget-group-stage = שלב הבתים
newtab-sports-widget-group-a = קבוצה A
newtab-sports-widget-group-b = קבוצה B
newtab-sports-widget-group-c = קבוצה C
newtab-sports-widget-group-d = קבוצה D
newtab-sports-widget-group-e = קבוצה E
newtab-sports-widget-group-f = קבוצה F
newtab-sports-widget-group-g = קבוצה G
newtab-sports-widget-group-h = קבוצה H
newtab-sports-widget-group-i = קבוצה I
newtab-sports-widget-group-j = קבוצה J
newtab-sports-widget-group-k = קבוצה K
newtab-sports-widget-group-l = קבוצה L
newtab-sports-widget-round-32 = סיבוב 32 האחרונות
newtab-sports-widget-round-16 = שמינית הגמר
newtab-sports-widget-quarter-finals = רבע גמר
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = חי
newtab-custom-widget-live-refresh =
    .title = ריענון תוצאות
    .aria-label = ריענון תוצאות
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = תאריכי מפתח
newtab-sports-widget-upcoming = המשחקים הבאים
# Used for a match currently ongoing
newtab-sports-widget-now = עכשיו
newtab-sports-widget-results = תוצאות
newtab-sports-widget-semi-finals = חצי גמר
newtab-sports-widget-bronze-finals = משחק על מדליית הארד
# Final is the final match for 1st place.
newtab-sports-widget-final = גמר
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = מתעכב
newtab-sports-widget-postponed = נדחה
newtab-sports-widget-suspended = מושהה
newtab-sports-widget-cancelled = בוטל
newtab-sports-widget-information = מידע על המשחק
newtab-sports-widget-no-live-data = נתוני המשחק החי אינם מתעדכנים כרגע
newtab-sports-widget-view-results-link = הצגת תוצאות
newtab-sports-widget-third-place = מקום שלישי
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = סגנית האלופה
newtab-sports-widget-champions = אלופים
newtab-sports-widget-world-cup-champions = אלופי המונדיאל 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = המשחק הסתיים
newtab-sports-widget-match-halftime = מחצית
newtab-sports-widget-match-extra-time = הארכה
newtab-sports-widget-match-penalties = פנדלים
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = נגד
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = הישארו מעודכנים לפרטים על המשחקים הקרובים

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = הקודם
    .title = הקודם
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = הבא
    .title = הבא
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = משחק חי { $index } מתוך { $total }
    .title = משחק חי { $index } מתוך { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } נגד { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) נגד { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = חי: { $homeTeam }, { $homeScore } נגד { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } נגד { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } נגד { $awayTeam }, מתעכב
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } נגד { $awayTeam }, נדחה
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } נגד { $awayTeam }, מושהה
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } נגד { $awayTeam }, בוטל

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = בוסניה-הרצגובינה
newtab-sports-widget-team-name-label-civ =
    .label = חוף השנהב
newtab-sports-widget-team-name-label-cod =
    .label = הרפובליקה הדמוקרטית של קונגו
newtab-sports-widget-team-name-label-eng =
    .label = אנגליה
newtab-sports-widget-team-name-label-sco =
    .label = סקוטלנד
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = טרם נקבע

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = חגגו את פתיחת המונדיאל עם תמונות רקע חדשות
newtab-sports-widget-message-wallpapers-body = הכניסו לדפדפן שלכם אווירת יום משחק לטורניר.
newtab-sports-widget-message-wallpapers-cta = בחירת תמונת רקע
newtab-sports-widget-message-add-widgets-cta =
    .label = הוספת ווידג'טים
newtab-sports-widget-message-day-in-play-title = להישאר במשחק עם הווידג’טים של { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = מעקב אחרי המונדיאל, להישאר ממוקד במשימות, מעקב אחרי השעה ברחבי העולם ועוד.
newtab-sports-widget-message-explore-widgets-cta =
    .label = צפייה בווידג’טים

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = סגירה
    .aria-label = סגירה
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = התאמה אישית של הדף הזה
newtab-activation-window-message-customization-focus-message = ניתן לבחור בטפט חדש, להוסיף קיצורי דרך לאתרים המועדפים עליך ולהישאר מעודכנים בסיפורים שמעניינים אותך.
newtab-activation-window-message-customization-focus-primary-button =
    .label = להתחיל להתאים אישית
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = המרחב הזה פועל לפי הכללים שלך
newtab-activation-window-message-values-focus-message = ‏{ -brand-product-name } מאפשר לך לגלוש בדרך שלך, עם דרך אישית יותר להתחיל את היום שלך באינטרנט. ניתן להפוך את { -brand-product-name } לשלך.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = הסתרת השעון
newtab-clock-widget-menu-learn-more = מידע נוסף
newtab-clock-widget-menu-edit = עריכת שעונים
newtab-clock-widget-menu-switch-to-12h = מעבר לתבנית של 12 שעות
newtab-clock-widget-menu-switch-to-24h = מעבר לתבנית של 24 שעות
newtab-clock-widget-label-your-clocks = השעונים שלך
newtab-clock-widget-search-location-input =
    .label = מיקום
    .placeholder = חיפוש אחר עיר
    .aria-label = חיפוש אחר עיר
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = כינוי (אופציונלי)
    .placeholder = הוספת כינוי
    .aria-label = כינוי (אופציונלי)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = הוספת שעון חדש
    .aria-label = הוספת שעון חדש
newtab-clock-widget-button-add-clock = הוספה
newtab-clock-widget-button-cancel = ביטול
newtab-clock-widget-button-back =
    .title = חזרה
    .aria-label = חזרה
newtab-clock-widget-button-edit-clock =
    .title = עריכת שעון
    .aria-label = עריכת שעון
newtab-clock-widget-button-save = שמירה
newtab-clock-widget-button-remove-clock =
    .title = הסרת שעון
    .aria-label = הסרת שעון
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
    .aria-label = { $city }, כינוי: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = הוספת שעון
newtab-clock-widget-edit-clock-form =
    .aria-label = עריכת שעון
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = תוצאות חיפוש
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = אין התאמות
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = פתיחת תפריט עבור השעון
    .aria-label = פתיחת תפריט עבור השעון
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = כינוי: { $nickname }

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = לשונית חדשה
newtab-settings-button =
    .title = התאמה אישית של דף הלשונית החדשה שלך
newtab-customize-panel-icon-button =
    .title = התאמה אישית של דף זה
newtab-customize-panel-icon-button-label = התאמה אישית
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

## Top Sites - General form dialog.

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
newtab-custom-shortcuts-toggle =
    .label = קיצורי דרך
    .description = אתרים ששמרת או ביקרת בהם
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
newtab-custom-stories-toggle =
    .label = סיפורים מומלצים
    .description = תוכן יוצא דופן שנבחר בקפידה על־ידי משפחת { -brand-product-name }
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
newtab-wallpaper-upload-image = העלאת תמונה
newtab-wallpaper-custom-color = בחירת צבע
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

newtab-wallpaper-category-title-colors = צבעים אחידים
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
newtab-weather-menu-hide-weather-v2 = הסתרת מזג האוויר
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
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York City
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
newtab-section-following-button = במעקב
newtab-section-unfollow-button = ביטול המעקב
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = כיוונון הפיד שלך
newtab-section-follow-highlight-subtitle = ניתן לעקוב אחר תחומי העניין שלך כדי לראות עוד ממה שאהוב עליך.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = חסימה
newtab-section-blocked-button = חסום
newtab-section-unblock-button = הסרת חסימה

## Confirmation modal for blocking a section

newtab-section-cancel-button = לא כעת
newtab-section-confirm-block-topic-p1 = האם ברצונך לחסום נושא זה?
newtab-section-confirm-block-topic-p2 = נושאים חסומים לא יופיעו יותר בפיד שלך.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = חסימת { $topic }

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
newtab-widget-task-list-menu-copy = העתקה
newtab-widget-lists-menu-edit = עריכת שם הרשימה
newtab-widget-lists-menu-create = יצירת רשימה חדשה
newtab-widget-lists-menu-delete = מחיקת רשימה זו
newtab-widget-lists-menu-copy = העתקת הרשימה ללוח העריכה
newtab-widget-lists-menu-hide = הסתרת כל הרשימות
newtab-widget-lists-menu-learn-more = מידע נוסף
newtab-widget-lists-input-add-an-item =
    .placeholder = הוספת פריט
newtab-widget-lists-input-error = נא לכלול טקסט כדי להוסיף פריט.
newtab-widget-lists-input-menu-open-link = פתיחת קישור
newtab-widget-lists-input-menu-move-up = להזיז מעלה
newtab-widget-lists-input-menu-move-down = להזיז מטה
newtab-widget-lists-input-menu-delete = מחיקה
newtab-widget-lists-input-menu-edit = עריכה
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + יצירת רשימה חדשה
newtab-widget-lists-name-label-default =
    .label = רשימת משימות
newtab-widget-lists-name-placeholder-default =
    .placeholder = רשימת משימות
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = רשימה חדשה
newtab-widget-section-title = ווידג’טים
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

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

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
newtab-widget-timer-menu-hide = הסתרת שעון עצר
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
newtab-promo-card-title = תמיכה ב־{ -brand-product-name }
newtab-promo-card-body = נותני החסות שלנו תומכים במשימה שלנו לבנות אינטרנט טוב יותר
newtab-promo-card-cta = מידע נוסף
newtab-promo-card-dismiss-button =
    .title = סגירה
    .aria-label = סגירה

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

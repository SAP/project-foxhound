# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = لسان جديد
newtab-settings-button =
    .title = خصص صفحة اللسان الجديد
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = خصّص هذه الصفحة
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = خصّص
newtab-customize-panel-label =
    .label = خصّص
newtab-personalize-settings-icon-label =
    .title = خصّص صفحة اللسان الجديد
    .aria-label = إعدادات
newtab-settings-dialog-label =
    .aria-label = الإعدادات
newtab-personalize-icon-label =
    .title = خصّص صفحة اللسان الجديد
    .aria-label = خصّص صفحة اللسان الجديد
newtab-personalize-dialog-label =
    .aria-label = خصّص
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = ارفض
    .aria-label = ارفض

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = صفحة البداية
home-homepage-new-windows =
    .label = نوافذ جديدة
home-homepage-new-tabs =
    .label = الألسنة الجديدة
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = اختر موقعًا محددًا

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = عنوان(عناوين) الموقع الإلكتروني
home-custom-homepage-address =
    .placeholder = أدخل العنوان
home-custom-homepage-address-button =
    .label = أضف عنوانًا
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = لم تُضاف أي مواقع إلكترونية حتى الآن.
home-custom-homepage-delete-address-button =
    .aria-label = احذف العنوان
    .title = احذف العنوان
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = استبدل ب
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = الصفحات المفتوحة حاليًا
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = العلامات…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = ابحث
home-prefs-stories-header2 =
    .label = القصص
    .description = محتوى استثنائي برعاية عائلة { -brand-product-name }
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = قوائم
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = المؤقت
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = الرياضة
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = ساعة
home-prefs-mission-message2 =
    .message = يدعم رعاتنا مهمتنا في بناء شبكة إنترنت أفضل.
home-prefs-manage-topics-link2 =
    .label = أدِر المواضيع
home-prefs-choose-wallpaper-link2 =
    .label = اختر خلفية
home-prefs-firefox-logo-header =
    .label = شعار { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = لاستخدام هذه الميزات، عيّن ألسنة جديدة أو نوافذ جديدة إلى { -firefox-home-brand-name }.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [zero] لا صفوف
            [one] صف واحد
            [two] صفان
            [few] { $num } صفوف
            [many] { $num } صفا
           *[other] { $num } صف
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = الامتداد ({ $extension })
home-restore-defaults-srd =
    .label = استعد المبدئيات
    .accesskey = س
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (افتراضي)
home-mode-choice-custom-srd =
    .label = عناوين مخصصة…
home-mode-choice-blank-srd =
    .label = صفحة فارغة
home-prefs-shortcuts-header-srd =
    .label = الاختصارات
home-prefs-shortcuts-select =
    .aria-label = الاختصارات
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = الاختصارات المموّلة
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = الأخبار الممولة
home-prefs-highlights-option-visited-pages-srd =
    .label = الصفحات المزارة
home-prefs-highlights-options-bookmarks-srd =
    .label = العلامات
home-prefs-highlights-option-most-recent-download-srd =
    .label = آخر ما نُزّل
home-prefs-recent-activity-header-srd =
    .label = أحدث الأنشطة
home-prefs-recent-activity-select =
    .aria-label = أحدث الأنشطة
home-prefs-weather-header-srd =
    .label = الطقس
home-prefs-support-firefox-header-srd =
    .label = ادعم { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = اكتشف كيف

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = ابحث
    .aria-label = ابحث
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = ‫ابحث ب { $engine } أو أدخِل عنوانا
newtab-search-box-handoff-text-no-engine = ابحث أو أدخِل عنوانا
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = ‫ابحث ب { $engine } أو أدخِل عنوانا
    .title = ‫ابحث ب { $engine } أو أدخِل عنوانا
    .aria-label = ‫ابحث ب { $engine } أو أدخِل عنوانا
newtab-search-box-handoff-input-no-engine =
    .placeholder = ابحث أو أدخِل عنوانا
    .title = ابحث أو أدخِل عنوانا
    .aria-label = ابحث أو أدخِل عنوانا
newtab-search-box-text = ابحث في الوِب
newtab-search-box-input =
    .placeholder = ابحث في الوِب
    .aria-label = ابحث في الوِب

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = أضِف محرك بحث
newtab-topsites-add-shortcut-header = اختصار جديد
newtab-topsites-edit-topsites-header = حرّر الموقع الشائع
newtab-topsites-edit-shortcut-header = حرّر الاختصار
newtab-topsites-add-shortcut-label = أضِف اختصارًا
newtab-topsites-add-shortcut-title =
    .title = أضِف اختصارًا
    .aria-label = أضِف اختصارًا
newtab-topsites-title-label = العنوان
newtab-topsites-title-input =
    .placeholder = أدخل عنوانًا
newtab-topsites-url-label = المسار
newtab-topsites-url-input =
    .placeholder = اكتب أو ألصق مسارًا
newtab-topsites-url-validation = مطلوب مسار صالح
newtab-topsites-image-url-label = مسار الصورة المخصصة
newtab-topsites-use-image-link = استخدم صورة مخصصة…
newtab-topsites-image-validation = فشل تحميل الصورة. جرّب مسارا آخر.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = امحُ النص

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = ألغِ
newtab-topsites-delete-history-button = احذف من التأريخ
newtab-topsites-save-button = احفظ
newtab-topsites-preview-button = عايِن
newtab-topsites-add-button = أضِفْ

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = هل أنت متأكد أنك تريد حذف كل وجود لهذه الصفحة من تأريخك؟
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = لا يمكن التراجع عن هذا الإجراء.

## Top Sites - Sponsored label

newtab-topsite-sponsored = نتيجة مموّلة

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (مثبت)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = افتح القائمة
    .aria-label = افتح القائمة
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = أزِل
    .aria-label = أزِل
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = افتح القائمة
    .aria-label = افتح قائمة { $title } السياقية
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = حرّر هذا الموقع
    .aria-label = حرّر هذا الموقع

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = حرِّر
newtab-menu-open-new-window = افتح في نافذة جديدة
newtab-menu-open-new-private-window = افتح في نافذة خاصة جديدة
newtab-menu-dismiss = ألغِ
newtab-menu-pin = ثبّت
newtab-menu-unpin = أزل
newtab-menu-delete-history = احذف من التأريخ
newtab-menu-save-to-pocket = احفظ في { -pocket-brand-name }
newtab-menu-delete-pocket = احذف من { -pocket-brand-name }
newtab-menu-archive-pocket = أرشِف في { -pocket-brand-name }
newtab-menu-show-privacy-info = رُعاتنا الرسميّون وخصوصيّتك
newtab-menu-about-fakespot = عن { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = أبلِغ
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = احجب
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = ألغِ المتابعة
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = اطّلع على المزيد
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = ألغِ متابعة الموضوع

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = أدر المحتوى المموّل
newtab-menu-our-sponsors-and-your-privacy = ممولّينا وخصوصيتك
newtab-menu-report-this-ad = أبلغ عن هذا الإعلان

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = تمّ
newtab-privacy-modal-button-manage = أدِر إعدادات المحتوى المرعيّ
newtab-privacy-modal-header = خصوصيتك فوق كل شيء.
newtab-privacy-modal-paragraph-2 = نعرض عليكم محتوى مفحوصًا بحذر من رُعاة مُختارين بعناية، بالإضافة للقصص الآسرة التي نقدّمها. اطمئن <strong>فبياناتك وأنت تتصفّح لا تخرج مطلقًا خارج نسختك من { -brand-product-name }</strong> — إذ لا نحن نراها، ولا رُعاتنا يرونَها.
newtab-privacy-modal-link = تعرّف على طريقة عمل الخصوصية في الألسنة الجديدة

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = أزل العلامة
# Bookmark is a verb here.
newtab-menu-bookmark = علّم

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = انسخ رابط التنزيل
newtab-menu-go-to-download-page = انتقل إلى صفحة التنزيل
newtab-menu-remove-download = احذف من التأريخ

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] أظهِر في فايندر
       *[other] افتح المجلد المحتوي
    }
newtab-menu-open-file = افتح الملف

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = مُزارة
newtab-label-bookmarked = معلّمة
newtab-label-removed-bookmark = أُزيلت العلامة
newtab-label-recommended = مُتداول
newtab-label-saved = حُفِظت في { -pocket-brand-name }
newtab-label-download = نُزّل
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = برعاية · { $sponsorOrSource }
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = برعاية { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } دقيقة
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = مموّل

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = أزِل القسم
newtab-section-menu-collapse-section = اطوِ القسم
newtab-section-menu-expand-section = وسّع القسم
newtab-section-menu-manage-section = أدِر القسم
newtab-section-menu-manage-webext = أدِر الامتداد
newtab-section-menu-add-topsite = أضف موقعًا شائعًا
newtab-section-menu-add-search-engine = أضِف محرك بحث
newtab-section-menu-move-up = انقل لأعلى
newtab-section-menu-move-down = انقل لأسفل
newtab-section-menu-privacy-notice = تنويه الخصوصية

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = اطوِ القسم
newtab-section-expand-section-label =
    .aria-label = وسّع القسم

## Section Headers.

newtab-section-header-topsites = المواقع الأكثر زيارة
newtab-section-header-recent-activity = أحدث الأنشطة
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = ينصح به { $provider }
newtab-section-header-stories = قصص تدعو للتأمل
# "picks" refers to recommended articles
newtab-section-header-todays-picks = اختياراتنا لك اليوم

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = ابدأ التصفح وسنعرض أمامك بعض المقالات والفيديوهات والمواقع الأخرى التي زرتها حديثا أو أضفتها إلى العلامات هنا.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = لا جديد. تحقق لاحقًا للحصول على مزيد من أهم الأخبار من { $provider }. لا يمكنك الانتظار؟ اختر موضوعًا شائعًا للعثور على المزيد من القصص الرائعة من جميع أنحاء الوِب.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = لقد اطلعت على آخر الأخبار. تابعنا لاحقًا للمزيد من القصص. هل أنت متشوق لمعرفة المزيد؟ اختر موضوعًا شائعًا لتجد المزيد من القصص الرائعة من مختلف أنحاء الوِب.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = بِتّ تعلم كل شيء!
newtab-discovery-empty-section-topstories-content = عُد فيما بعد لترى قصص أخرى.
newtab-discovery-empty-section-topstories-try-again-button = أعِد المحاولة
newtab-discovery-empty-section-topstories-loading = يحمّل…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = آخ. أوشكنا على تحميل هذا القسم، لكن للأسف لم يكتمل.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = المواضيع الشائعة:
newtab-pocket-new-topics-title = أتريد المزيد من القصص؟ اطلع على هذه المواضيع الشائعة من { -pocket-brand-name }
newtab-pocket-more-recommendations = مقترحات أخرى
newtab-pocket-learn-more = اطّلع على المزيد
newtab-pocket-cta-button = نزِّل { -pocket-brand-name }
newtab-pocket-cta-text = احفظ القصص التي تحبّها في { -pocket-brand-name }، وزوّد عقلك بمقالات رائعة.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } هو جزء من عائلة { -brand-product-name }
newtab-pocket-save = احفظ
newtab-pocket-saved = حُفظت

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = المزيد من هذا القبيل
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = ليس لي
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = شكرًا لك. ستساعدنا تعليقاتك في تحسين خلاصتك.
newtab-toast-dismiss-button =
    .title = أهمِل
    .aria-label = أهمِل

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = اكتشف أفضل ما في الويب
newtab-pocket-onboarding-cta = يستكشف { -pocket-brand-name } مجموعة متنوعة من المنشورات لتجد المحتوى الأكثر إطلاعا وإلهاما وموثوقا به في متصفحك { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = أخ! حدث خطب ما أثناء تحميل المحتوى.
newtab-error-fallback-refresh-link = أنعِش الصفحة لإعادة المحاولة.

## Customization Menu

newtab-custom-shortcuts-title = الاختصارات
newtab-custom-shortcuts-subtitle = المواقع التي حفظتها أو زرتها
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = الاختصارات
    .description = المواقع التي حفظتها أو زرتها
newtab-custom-shortcuts-nova =
    .label = الاختصارات
newtab-custom-row-description =
    .description = عدد الصفوف
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [zero] ما من صفوف
            [one] صف واحد
            [two] صفّان اثنان
            [few] { $num } صفوف
            [many] { $num } صفًا
           *[other] { $num } صف
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [zero] ما من صفوف
        [one] صف واحد
        [two] صفّان اثنان
        [few] { $num } صفوف
        [many] { $num } صفًا
       *[other] { $num } صف
    }
newtab-custom-sponsored-sites = الاختصارات الممولة
newtab-custom-pocket-title = مُقترح من { -pocket-brand-name }
newtab-custom-pocket-subtitle = محتوى مميّز جمعه لك { -pocket-brand-name }، وهو جزء من عائلة { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = القصص المُقترحة
newtab-custom-stories-personalized-toggle =
    .label = القصص
newtab-custom-stories-personalized-checkbox-label = قصص مخصّصة بناءً على نشاطك
newtab-custom-pocket-sponsored = قصص مموّلة
newtab-custom-pocket-show-recent-saves = أظهِر عمليات الحفظ الأخيرة
newtab-custom-recent-title = أحدث الأنشطة
newtab-custom-recent-subtitle = مختارات من المواقع والمحتويات الحديثة
newtab-custom-widget-weather-toggle =
    .label = الطقس
newtab-custom-widget-lists-toggle =
    .label = قوائم
newtab-custom-widget-timer-toggle =
    .label = المؤقت
newtab-widget-manage-widget-button =
    .label = أدر الويدجات
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = أغلق
    .aria-label = أغلق القائمة
newtab-custom-close-button = أغلِق
newtab-custom-settings = أدِر المزيد من الإعدادات

## New Tab Wallpapers

newtab-wallpaper-title = الخلفيات
newtab-wallpaper-reset = صفّر إلى المبدئي
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = ارفع صورة
newtab-wallpaper-add-an-image = أضِف صورة
newtab-wallpaper-custom-color = اختر لونًا
newtab-wallpaper-toggle-title =
    .label = الخلفيات
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = تجاوزت الصورة الحد الأقصى لحجم الملف وهو { $file_size } ميجابايت. يُرجى محاولة رفع ملف أصغر حجمًا.
newtab-wallpaper-error-upload-file-type = لم نتمكن من رفع ملفك. يُرجى المحاولة مرة أخرى باستخدام ملف صورة.
newtab-wallpaper-error-file-type = لم نتمكن من رفع ملفك. يُرجى المحاولة مرة أخرى باستخدام نوع ملف مختلف.
newtab-wallpaper-light-red-panda = باندا أحمر
newtab-wallpaper-light-mountain = جبل ابيض
newtab-wallpaper-light-sky = سماء مع غيوم أرجوانية ووردية
newtab-wallpaper-light-color = الأشكال الزرقاء والوردية والصفراء
newtab-wallpaper-light-landscape = منظر جبلي ضبابي أزرق
newtab-wallpaper-light-beach = شاطئ مع شجرة نخيل
newtab-wallpaper-dark-aurora = شفق قطبي
newtab-wallpaper-dark-color = أشكال حمراء وزرقاء
newtab-wallpaper-dark-panda = باندا حمراء مختبئة في الغابة
newtab-wallpaper-dark-sky = منظر المدينة مع سماء الليل
newtab-wallpaper-dark-mountain = منظر جبلي
newtab-wallpaper-dark-city = منظر المدينة الأرجواني
newtab-wallpaper-dark-fox-anniversary = ثعلب على الرصيف بالقرب من الغابة
newtab-wallpaper-light-fox-anniversary = ثعلب في حقل عشبي مع منظر جبلي ضبابي

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = الألوان الصلبة
newtab-wallpaper-colors = الألوان
newtab-wallpaper-blue = أزرق
newtab-wallpaper-light-blue = أزرق فاتح
newtab-wallpaper-light-purple = ارجواني فاتح
newtab-wallpaper-light-green = اخضر فاتح
newtab-wallpaper-green = أخضر
newtab-wallpaper-beige = بيج
newtab-wallpaper-yellow = أصفر
newtab-wallpaper-orange = برتقالي
newtab-wallpaper-pink = وردي
newtab-wallpaper-light-pink = وردي فاتح
newtab-wallpaper-red = أحمر
newtab-wallpaper-dark-blue = أزرق غامق
newtab-wallpaper-dark-purple = أرجواني داكن
newtab-wallpaper-dark-green = أخضر غامق
newtab-wallpaper-brown = بني

## Abstract

newtab-wallpaper-category-title-abstract = مجرّدة
newtab-wallpaper-abstract-green = أشكال خضراء
newtab-wallpaper-abstract-blue = أشكال زرقاء
newtab-wallpaper-abstract-purple = أشكال أرجوانية
newtab-wallpaper-abstract-orange = أشكال برتقالية
newtab-wallpaper-gradient-orange = تدرج اللون البرتقالي والوردي
newtab-wallpaper-abstract-blue-purple = الأشكال الزرقاء والأرجوانية
newtab-wallpaper-abstract-white-curves = أبيض مع منحنيات مظللة
newtab-wallpaper-abstract-purple-green = تدرج الضوء الأرجواني والأخضر
newtab-wallpaper-abstract-blue-purple-waves = أشكال متموجة باللون الأزرق والأرجواني
newtab-wallpaper-abstract-black-waves = أشكال متموجة سوداء

## Firefox

newtab-wallpaper-storm-sky = سماء العاصفة
newtab-wallpaper-sky-with-pink-clouds = سماء مع غيوم وردية
newtab-wallpaper-red-panda-yawns-in-a-tree = الباندا الحمراء تتثاءب في شجرة
newtab-wallpaper-white-mountains = جبال بيضاء
newtab-wallpaper-hot-air-balloons = مجموعة متنوعة من ألوان البالونات الهوائية الساخنة خلال النهار
newtab-wallpaper-starry-canyon = ليلة زرقاء مليئة بالنجوم
newtab-wallpaper-suspension-bridge = تصوير جسر رمادي معلق بالكامل خلال النهار
newtab-wallpaper-sand-dunes = كثبان رملية بيضاء
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = صورة من <a data-l10n-name="name-link">{ $author_string }</a> على <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = جرب دفقة من الألوان
newtab-wallpaper-feature-highlight-content = امنح صفحة لسانك الجديدة مظهرًا جديدًا باستخدام الخلفيات.
newtab-wallpaper-feature-highlight-button = فهمت
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = أهمِل
    .aria-label = أغلق النافذة المنبثقة
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = سماوي
newtab-wallpaper-celestial-lunar-eclipse = خسوف القمر

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = أظهِر التوقعات في { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ مموّل
newtab-weather-menu-change-location = غيّر المكان
newtab-weather-change-location-search-input-placeholder =
    .placeholder = ابحث عن الموقع
    .aria-label = ابحث عن الموقع
newtab-weather-menu-weather-display = عرض الطقس
newtab-weather-todays-forecast = توقعات الطقس اليوم
newtab-weather-see-full-forecast = اطّلع على التوقعات كاملة
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = بسيط
newtab-weather-menu-change-weather-display-simple = بدّل إلى العرض البسيط
newtab-weather-menu-weather-display-option-detailed = مفصل
newtab-weather-menu-change-weather-display-detailed = بدّل إلى العرض التفصيلي
newtab-weather-menu-temperature-units = وحدات قياس درجة الحرارة
newtab-weather-menu-temperature-option-fahrenheit = فهرنهايت
newtab-weather-menu-temperature-option-celsius = درجة مئوية
newtab-weather-menu-change-temperature-units-fahrenheit = بدّل إلى فهرنهايت
newtab-weather-menu-change-temperature-units-celsius = بدّل إلى درجة مئوية
newtab-weather-menu-hide-weather = أخفِ الطقس في اللسان الجديد
newtab-weather-menu-learn-more = اطّلع على المزيد
newtab-weather-menu-detect-my-location = حدِّد موقعي
# This message is shown if user is working offline
newtab-weather-error-not-available = البيانات الجوية غير متوفرة حاليًا.
newtab-weather-opt-in-see-weather = أترغب في معرفة حالة الطقس في موقعك؟
newtab-weather-opt-in-not-now =
    .label = ليس الآن
newtab-weather-opt-in-yes =
    .label = نعم
newtab-weather-opt-in-use-location =
    .label = استخدم الموقع
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = مرتفعة
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = منخفضة

## Topic Labels

newtab-topic-label-education = تعليم
newtab-topic-label-health = صحة
newtab-topic-label-hobbies = الألعاب
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = مال
newtab-topic-label-society-parenting = تربية الأبناء
newtab-topic-label-government = سياسة
newtab-topic-label-education-science = علوم

## Topic Selection Modal

newtab-topic-selection-save-button = احفظ
newtab-topic-selection-cancel-button = ألغِ
newtab-topic-selection-button-maybe-later = ربما لاحقا
newtab-topic-selection-privacy-link = تعرّف على كيف نحمي بياناتك وإدارة البيانات
newtab-topic-selection-button-update-interests = حدِّث اهتماماتك
newtab-topic-selection-button-pick-interests = اختر اهتماماتك

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = تابع
newtab-section-following-button = يتابع
newtab-section-unfollow-button = ألغِ المتابعة

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = احجب
newtab-section-blocked-button = حُجبت
newtab-section-unblock-button = ألغِ الحظر

## Confirmation modal for blocking a section

newtab-section-cancel-button = ليس الآن
newtab-section-confirm-block-topic-p1 = أمتأكد أنك تريد حظر هذا الموضوع؟
newtab-section-confirm-block-topic-p2 = لن تظهر المواضيع المحظورة في خلاصتك بعد الآن.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = احظر { $topic }
newtab-section-block-cancel-button = ألغِ

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = المواضيع
newtab-section-manage-topics-button-v2 =
    .label = أدِر المواضيع
newtab-section-mangage-topics-followed-topics-empty-state = لم تتابع أي مواضيع بعد.
newtab-section-mangage-topics-blocked-topics = محظور
newtab-section-mangage-topics-blocked-topics-empty-state = لم تحظر أي موضوع بعد.
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = ارفع خلفية شاشتك أو اختر لونًا مخصصًا لجعل { -brand-product-name } خاصًا بك.
newtab-custom-wallpaper-cta = جربه

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = اختر خلفية شاشة لتجعل { -brand-product-name } خاصًا بك
newtab-new-user-custom-wallpaper-subtitle = اجعل كل لسان جديد يشعرك وكأنك في بيتك مع خلفيات وألوان مخصّصة.
newtab-new-user-custom-wallpaper-cta = جرّبه الآن

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = نزّل { -brand-product-name } للجوّال
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = افحص الرمز للتصفح بشكل آمن أثناء التنقل.
newtab-download-mobile-highlight-body-variant-b = استكمل من حيث توقفت عند مزامنة ألسنتك وكلمات سرك والمزيد.
newtab-download-mobile-highlight-body-variant-c = أتعلم أنه يمكنك اصطحاب { -brand-product-name } معك أينما ذهبت؟ نفس المتصفح. في جيبك.
newtab-download-mobile-highlight-image =
    .aria-label = رمز QR لتنزيل { -brand-product-name } للجوال

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = مفضلاتك في متناول يديك
newtab-shortcuts-highlight-subtitle = أضف اختصارًا لتتمكن من الوصول إلى مواقعك المفضلة بنقرة واحدة.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = لماذا تُبلِّغ عن هذا؟
newtab-report-ads-reason-not-interested =
    .label = أنا لست مهتم
newtab-report-ads-reason-inappropriate =
    .label = غير مناسب
newtab-report-ads-reason-seen-it-too-many-times =
    .label = لقد رأيت ذلك مرات كثيرة جدًا
newtab-report-content-wrong-category =
    .label = فئة خاطئة
newtab-report-content-outdated =
    .label = قديم
newtab-report-content-inappropriate-offensive =
    .label = غير ملائم أو بذيء
newtab-report-content-spam-misleading =
    .label = سخام أو المضلل
newtab-report-content-requires-payment-subscription =
    .label = يتطلب الدفع أو الاشتراك
newtab-report-content-requires-payment-subscription-learn-more = اطّلع على المزيد
newtab-report-cancel = ألغِ
newtab-report-submit = أرسِل
newtab-toast-thanks-for-reporting =
    .message = شكرا لك على الإبلاغ عن هذا.
newtab-toast-widgets-hidden =
    .message = حدّد رمز القلم لإضافة الأدوات مرة أخرى في أي وقت.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = أنت الآن تتابع { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = لم تعد تتابع { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = لن ترى قصصًا عن { $topic } بعد الآن.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = الاحتمالات لا حصر لها. أضف واحدًا.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = جديد
newtab-widget-lists-label-beta =
    .label = تجريبي
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = اكتمل ({ $number })
newtab-widget-lists-celebration-headline = عمل جيد
newtab-widget-lists-celebration-subhead = انتهى الكل
newtab-widget-task-list-menu-copy = انسخ
newtab-widget-lists-menu-edit = حرّر اسم القائمة
newtab-widget-lists-menu-edit2 =
    .aria-label = حرّر اسم القائمة
newtab-widget-lists-menu-create = أنشئ قائمة جديدة
newtab-widget-lists-menu-delete = احذف هذه القائمة
newtab-widget-lists-menu-copy = انسخ القائمة إلى الحافظة
newtab-widget-lists-menu-learn-more = اطّلع على المزيد
newtab-widget-lists-button-add-item = أضف عنصر
newtab-widget-lists-input-add-an-item2 =
    .placeholder = أضف عنصر
    .aria-label = أضف عنصر
newtab-widget-lists-input-error = يُرجى إدخال نص لإضافة عنصر.
newtab-widget-lists-input-menu-open-link = افتح الرابط
newtab-widget-lists-input-menu-move-up = انقل لأعلى
newtab-widget-lists-input-menu-move-down = انقل لأسفل
newtab-widget-lists-input-menu-delete = احذف
newtab-widget-lists-input-menu-edit = حرّر
newtab-widget-lists-input-menu-edit2 =
    .aria-label = حرِّر العنصر
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = +أنشئ قائمة جديدة
newtab-widget-lists-name-label-default =
    .label = قائمة المهام
newtab-widget-lists-name-label-checklist =
    .label = قائمة التحقق
newtab-widget-lists-name-placeholder-default =
    .placeholder = قائمة المهام
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = قائمة التحقق
    .aria-label = حرِّر اسم القائمة
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = قائمة جديدة
    .aria-label = حرّر اسم القائمة
newtab-widget-menu-hide = أخفِ الويدجت
newtab-widget-menu-change-size = غيّر الحجم
newtab-widget-size-small = صغير
newtab-widget-size-medium = متوسط
newtab-widget-size-large = كبير
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = أخف الويدجات
    .aria-label = أخف الويدجات
newtab-widget-section-menu-button =
    .title = قائمة الويدجات
    .aria-label = افتح قائمة الويدجات
newtab-widget-section-menu-manage = أدر الويدجات
newtab-widget-section-menu-hide-all = أخفِ الويدجات
newtab-widget-section-menu-learn-more = اطّلع على المزيد
newtab-widget-section-feedback = أخبرنا برأيك
newtab-widget-lists-name-default = قائمة التحقق

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = المؤقت
newtab-widget-timer-notification-break = انتهت استراحتك. هل أنت مستعد للتركيز؟
newtab-widget-timer-notification-warning = الإشعارات معطّلة
newtab-widget-timer-mode-focus =
    .label = ركّز
newtab-widget-timer-mode-break =
    .label = استراحة
newtab-widget-timer-label-play =
    .label = شغّل
newtab-widget-timer-label-pause =
    .label = ألبِث
newtab-widget-timer-reset =
    .title = صفّر
newtab-widget-timer-menu-notifications = عطّل الإشعارات
newtab-widget-timer-menu-notifications-on = فعّل الإشعارات
newtab-widget-timer-menu-learn-more = اطّلع على المزيد
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = أهم العناوين
newtab-daily-briefing-card-menu-dismiss = أهمِل
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = حُدِّث منذ { $minutes }د
newtab-widget-message-title = حافظ على تركيزك باستخدام القوائم والمؤقت المدمج
# to-dos stands for "things to do".
newtab-widget-message-copy = من التذكيرات السريعة إلى المهام اليومية، ومن جلسات التركيز إلى فترات الراحة القصيرة - حافظ على إنجاز مهامك وفي الوقت المحدّد.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = اجعل { -brand-product-name } ملكك
newtab-promo-card-body-addons = اختر خلفية من مجموعتنا، أو صمّم خلفيتك.
newtab-promo-card-cta-addons = جرّبه الآن
newtab-promo-card-title = ادعم { -brand-product-name }
newtab-promo-card-body = يدعم رعاتنا مهمتنا في بناء شبكة إنترنت أفضل
newtab-promo-card-cta = اطّلع على المزيد
newtab-promo-card-dismiss-button =
    .title = أهمِل
    .aria-label = أهمِل

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-pause-aria =
    .aria-label = ألبِث المؤقت
newtab-widget-timer-decrease-min =
    .title = قلّل دقيقة واحدة
newtab-widget-timer-increase-min =
    .title = زد دقيقة واحدة
newtab-widget-timer-mode-group =
    .aria-label = وضع المؤقت
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = ركّز
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = أخفِ المؤقت
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = عمل رائع
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = انتهت استراحتك
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = أتحتاج إلى استراحة؟
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = أمستعد للتركيز؟

##

newtab-sports-widget-menu-learn-more = اطّلع على المزيد
newtab-sports-widget-skip = تخطَّ

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = أهمِل
    .aria-label = أهمِل
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = اجعل هذه المساحة خاصة بك
newtab-activation-window-message-customization-focus-message = اختر خلفية جديدة، وأضف اختصارات لمواقعك المفضلة، وابقَ على اطلاع دائم بالقصص التي تهمك.
newtab-activation-window-message-customization-focus-primary-button =
    .label = ابدأ بالتخصيص
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = هذه المساحة تلتزم بقواعدك
newtab-activation-window-message-values-focus-message = يتيح لك { -brand-product-name } التصفح بالطريقة التي تُفضّلها، مع تجربة شخصية أكثر لبدء يومك على الإنترنت. اجعل { -brand-product-name } خاصًا بك.

## Strings for the Clock widget

newtab-clock-widget-menu-edit = حرّر الساعات
newtab-clock-widget-menu-switch-to-12h = بدّل إلى نظام الـ 12 ساعة
newtab-clock-widget-menu-switch-to-24h = بدّل إلى نظام الـ 24 ساعة
newtab-clock-widget-label-your-clocks = ساعاتك
newtab-clock-widget-search-location-input =
    .label = الموقع
    .placeholder = ابحث عن مدينة
    .aria-label = ابحث عن مدينة
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = الاسم المستعار (اختياري)
    .placeholder = أضف اسم مستعار
    .aria-label = الاسم المستعار (اختياري)
newtab-clock-widget-button-save = احفظ
newtab-clock-widget-button-remove-clock =
    .title = أزِل الساعة
    .aria-label = أزِل الساعة
newtab-clock-widget-add-clock-form =
    .aria-label = أضف ساعة
newtab-clock-widget-edit-clock-form =
    .aria-label = حرّر الساعة
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = نتائج البحث
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = افتح قائمة الساعة
    .aria-label = افتح قائمة الساعة
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = الاسم المستعار: { $nickname }

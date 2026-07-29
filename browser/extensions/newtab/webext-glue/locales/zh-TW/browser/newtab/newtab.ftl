# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = 新分頁
newtab-settings-button =
    .title = 自訂您的新分頁頁面
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = 自訂此頁面
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = 自訂
newtab-customize-panel-label =
    .label = 自訂
newtab-personalize-settings-icon-label =
    .title = 個人化新分頁
    .aria-label = 設定
newtab-settings-dialog-label =
    .aria-label = 設定
newtab-personalize-icon-label =
    .title = 個人化新分頁
    .aria-label = 個人化新分頁
newtab-personalize-dialog-label =
    .aria-label = 個人化
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = 知道了！
    .aria-label = 知道了！

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = 首頁
home-homepage-new-windows =
    .label = 新視窗
home-homepage-new-tabs =
    .label = 新分頁
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = 選擇特定網站

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = 網站網址
home-custom-homepage-address =
    .placeholder = 請輸入網址
home-custom-homepage-address-button =
    .label = 新增網址
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = 尚未加入任何網站。
home-custom-homepage-delete-address-button =
    .aria-label = 刪除地址
    .title = 刪除地址
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = 取代為
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = 目前開啟的頁面
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = 書籤…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = 搜尋
home-prefs-stories-header2 =
    .label = 文章
    .description = 由 { -brand-product-name } 產品家族精選的內容文章
home-prefs-widgets-header =
    .label = 小工具
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = 清單
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = 計時器
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = 運動賽事
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = 時鐘
home-prefs-mission-message2 =
    .message = 贊助商支持我們打造出一個更好的網路環境的使命。
home-prefs-manage-topics-link2 =
    .label = 管理主題
home-prefs-choose-wallpaper-link2 =
    .label = 挑選一張背景圖
home-prefs-firefox-logo-header =
    .label = { -brand-short-name } 圖示
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = 若要使用這些功能，請將新分頁或新視窗設定為 { -firefox-home-brand-name }。
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } 行
           *[other] { $num } 行
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = 擴充套件（{ $extension }）
home-restore-defaults-srd =
    .label = 回復為預設值
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name }（預設）
home-mode-choice-custom-srd =
    .label = 自訂網址…
home-mode-choice-blank-srd =
    .label = 空白頁
home-prefs-shortcuts-header-srd =
    .label = 捷徑
home-prefs-shortcuts-select =
    .aria-label = 捷徑
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = 贊助捷徑
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = 贊助內容
home-prefs-highlights-option-visited-pages-srd =
    .label = 造訪過的頁面
home-prefs-highlights-options-bookmarks-srd =
    .label = 書籤
home-prefs-highlights-option-most-recent-download-srd =
    .label = 最新下載
home-prefs-recent-activity-header-srd =
    .label = 近期動態
home-prefs-recent-activity-select =
    .aria-label = 近期動態
home-prefs-weather-header-srd =
    .label = 天氣
home-prefs-support-firefox-header-srd =
    .label = 支持 { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = 看看是如何達成的

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = 搜尋
    .aria-label = 搜尋
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = 使用 { $engine } 搜尋或輸入網址
newtab-search-box-handoff-text-no-engine = 搜尋或輸入網址
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = 使用 { $engine } 搜尋或輸入網址
    .title = 使用 { $engine } 搜尋或輸入網址
    .aria-label = 使用 { $engine } 搜尋或輸入網址
newtab-search-box-handoff-input-no-engine =
    .placeholder = 搜尋或輸入網址
    .title = 搜尋或輸入網址
    .aria-label = 搜尋或輸入網址
newtab-search-box-text = 搜尋 Web
newtab-search-box-input =
    .placeholder = 搜尋 Web
    .aria-label = 搜尋 Web

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = 新增搜尋引擎
newtab-topsites-add-shortcut-header = 新增捷徑
newtab-topsites-edit-topsites-header = 編輯熱門網站
newtab-topsites-edit-shortcut-header = 編輯捷徑
newtab-topsites-add-shortcut-label = 新增捷徑
newtab-topsites-add-shortcut-title =
    .title = 新增捷徑
    .aria-label = 新增捷徑
newtab-topsites-title-label = 標題
newtab-topsites-title-input =
    .placeholder = 輸入標題
newtab-topsites-url-label = 網址
newtab-topsites-url-input =
    .placeholder = 輸入或貼上網址
newtab-topsites-url-validation = 請輸入有效的網址
newtab-topsites-image-url-label = 自訂圖片網址
newtab-topsites-use-image-link = 使用自訂圖片…
newtab-topsites-image-validation = 圖片載入失敗，請改用不同網址。

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = 清除文字

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = 取消
newtab-topsites-delete-history-button = 從瀏覽紀錄刪除
newtab-topsites-save-button = 儲存
newtab-topsites-preview-button = 預覽
newtab-topsites-add-button = 新增

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = 您確定要刪除此頁面的所有瀏覽紀錄？
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = 此動作無法復原。

## Top Sites - Sponsored label

newtab-topsite-sponsored = 贊助項目

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title }（已釘選）
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = 開啟選單
    .aria-label = 開啟選單
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = 移除
    .aria-label = 移除
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = 開啟選單
    .aria-label = 開啟 { $title } 的右鍵選單
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = 編輯此網站
    .aria-label = 編輯此網站

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = 編輯
newtab-menu-open-new-window = 用新視窗開啟
newtab-menu-open-new-private-window = 用新隱私視窗開啟
newtab-menu-dismiss = 隱藏
newtab-menu-pin = 釘選
newtab-menu-unpin = 取消釘選
newtab-menu-delete-history = 從瀏覽紀錄刪除
newtab-menu-save-to-pocket = 儲存至 { -pocket-brand-name }
newtab-menu-delete-pocket = 從 { -pocket-brand-name } 刪除
newtab-menu-archive-pocket = 在 { -pocket-brand-name } 裡封存
newtab-menu-show-privacy-info = 我們的贊助商與您的隱私權
newtab-menu-about-fakespot = 關於 { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = 檢舉
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = 封鎖
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = 取消關注
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = 更多資訊
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = 取消追蹤主題

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = 管理贊助內容
newtab-menu-our-sponsors-and-your-privacy = 我們的贊助商與您的隱私權
newtab-menu-report-this-ad = 檢舉此廣告

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = 完成
newtab-privacy-modal-button-manage = 管理贊助內容設定
newtab-privacy-modal-header = 您的隱私相當重要。
newtab-privacy-modal-paragraph-2 = 除了提供吸引人的文章之外，我們還與贊助商合作提供與您相關，且經精挑細選的內容。請放心，<strong>您的上網資料絕對不會流出於您電腦上的 { -brand-product-name } 之外</strong>— 我們跟我們的贊助商都不會看到。
newtab-privacy-modal-link = 了解我們如何在提供新分頁內容的同時確保您的隱私

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = 移除書籤
# Bookmark is a verb here.
newtab-menu-bookmark = 書籤

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = 複製下載鏈結
newtab-menu-go-to-download-page = 前往下載頁面
newtab-menu-remove-download = 自下載記錄移除

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] 顯示於 Finder
       *[other] 開啟所在資料夾
    }
newtab-menu-open-file = 開啟檔案

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = 造訪過的網站
newtab-label-bookmarked = 已加入書籤
newtab-label-removed-bookmark = 已移除書籤
newtab-label-recommended = 熱門
newtab-label-saved = 已儲存至 { -pocket-brand-name }
newtab-label-download = 已下載
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · 贊助
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = 由 { $sponsor } 贊助
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } 分鐘
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = 贊助項目

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = 移除段落
newtab-section-menu-collapse-section = 摺疊段落
newtab-section-menu-expand-section = 展開段落
newtab-section-menu-manage-section = 管理段落
newtab-section-menu-manage-webext = 管理擴充套件
newtab-section-menu-add-topsite = 新增熱門網站
newtab-section-menu-add-search-engine = 新增搜尋引擎
newtab-section-menu-move-up = 上移
newtab-section-menu-move-down = 下移
newtab-section-menu-privacy-notice = 隱私權公告

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = 摺疊段落
newtab-section-expand-section-label =
    .aria-label = 展開段落

## Section Headers.

newtab-section-header-topsites = 熱門網站
newtab-section-header-recent-activity = 近期動態
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } 推薦
newtab-section-header-stories = 發人深省的文章
# "picks" refers to recommended articles
newtab-section-header-todays-picks = 本日精選文章

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = 開始上網，我們就會把您在網路上發現的好文章、影片、剛加入書籤的頁面顯示於此。
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = 所有文章都讀完啦！晚點再來，{ $provider } 將提供更多推薦故事。等不及了？選擇熱門主題，看看 Web 上各式精采資訊。
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = 所有文章都讀完啦！晚點再來看看更多推薦故事。等不及了？選擇熱門主題，看看 Web 上各式精采資訊。

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = 都讀完了！
newtab-discovery-empty-section-topstories-content = 晚點再回來看看有沒有新鮮事。
newtab-discovery-empty-section-topstories-try-again-button = 重試
newtab-discovery-empty-section-topstories-loading = 載入中…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = 唉呀，暫時無法載入此區塊。

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = 熱門主題:
newtab-pocket-new-topics-title = 想要更多文章嗎？看這些來自 { -pocket-brand-name } 的熱門主題
newtab-pocket-more-recommendations = 更多推薦項目
newtab-pocket-learn-more = 了解更多
newtab-pocket-cta-button = 取得 { -pocket-brand-name }
newtab-pocket-cta-text = 將您喜愛的故事儲存到 { -pocket-brand-name }，閱讀一篇篇好文章。
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } 是 { -brand-product-name } 產品家族的一部份
newtab-pocket-save = 儲存
newtab-pocket-saved = 已儲存

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = 更多這樣的內容
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = 我沒興趣
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = 感謝您。您的意見可幫助我們改善顯示的內容。
newtab-toast-dismiss-button =
    .title = 知道了！
    .aria-label = 知道了！

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = 探索網路精華內容
newtab-pocket-onboarding-cta = { -pocket-brand-name } 為您探索不同的線上內容，將最豐富、最有啟發性、最可靠的內容帶來您的 { -brand-product-name } 瀏覽器。

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = 唉唷，載入內容時發生錯誤。
newtab-error-fallback-refresh-link = 請重新整理頁面再試一次。

## Customization Menu

newtab-custom-shortcuts-title = 捷徑
newtab-custom-shortcuts-subtitle = 您儲存或造訪過的網站
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = 捷徑
    .description = 您儲存或造訪過的網站
newtab-custom-shortcuts-nova =
    .label = 捷徑
newtab-custom-row-description =
    .description = 資料列數
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } 行
           *[other] { $num } 行
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } 行
       *[other] { $num } 行
    }
newtab-custom-sponsored-sites = 贊助捷徑
newtab-custom-pocket-title = 由 { -pocket-brand-name } 推薦
newtab-custom-pocket-subtitle = 由 { -brand-product-name } 的姊妹作 { -pocket-brand-name } 精心策展的內容
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = 推薦的文章
    .description = 由 { -brand-product-name } 產品家族精選的內容文章
newtab-recommended-stories-toggle =
    .label = 推薦的文章
newtab-custom-stories-personalized-toggle =
    .label = 文章
newtab-custom-stories-personalized-checkbox-label = 依照您的上網行為，提供個人化文章推薦
newtab-custom-pocket-sponsored = 贊助內容
newtab-custom-pocket-show-recent-saves = 顯示近期儲存項目
newtab-custom-recent-title = 近期動態
newtab-custom-recent-subtitle = 近期造訪過的網站與內容精選
newtab-custom-weather-toggle =
    .label = 天氣
    .description = 快速了解本日天氣
newtab-custom-widget-weather-toggle =
    .label = 天氣
newtab-custom-widget-lists-toggle =
    .label = 清單
newtab-custom-widget-timer-toggle =
    .label = 計時器
newtab-custom-widget-sports-toggle =
    .label = 世界盃足球賽
newtab-custom-widget-clock-toggle =
    .label = 時鐘
newtab-custom-widget-sports-toggle2 =
    .label = 體育
newtab-custom-widget-section-title = 小工具
newtab-custom-widget-section-toggle =
    .label = 小工具
newtab-widget-manage-title = 小工具
newtab-widget-manage-widget-button =
    .label = 管理小工具
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = 關閉
    .aria-label = 關閉選單
newtab-custom-close-button = 關閉
newtab-custom-settings = 管理更多設定

## New Tab Wallpapers

newtab-wallpaper-title = 背景圖
newtab-wallpaper-reset = 還原為預設值
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = 上傳圖片
newtab-wallpaper-add-an-image = 新增圖片
newtab-wallpaper-custom-color = 選擇色彩
newtab-wallpaper-toggle-title =
    .label = 背景圖
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = 圖片超過 { $file_size }MB 的檔案大小限制。請嘗試上傳小一點的檔案。
newtab-wallpaper-error-upload-file-type = 無法上傳您的檔案，請稍後再重新上傳圖片。
newtab-wallpaper-error-file-type = 無法上傳您的檔案，請稍後再以不同格式檔案上傳。
newtab-wallpaper-light-red-panda = 小貓熊
newtab-wallpaper-light-mountain = 白色山脈
newtab-wallpaper-light-sky = 紫色與粉紅色的天空
newtab-wallpaper-light-color = 藍色、粉紅與黃色圖型
newtab-wallpaper-light-landscape = 藍霧山景
newtab-wallpaper-light-beach = 棕櫚樹海灘
newtab-wallpaper-dark-aurora = 極光
newtab-wallpaper-dark-color = 紅色與藍色圖型
newtab-wallpaper-dark-panda = 隱藏在森林中的小貓熊
newtab-wallpaper-dark-sky = 城市的夜空景觀
newtab-wallpaper-dark-mountain = 山景
newtab-wallpaper-dark-city = 紫色城市風景
newtab-wallpaper-dark-fox-anniversary = 一隻在森林附近人行道上的狐狸
newtab-wallpaper-light-fox-anniversary = 一隻在迷霧山景中的草原上的狐狸

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = 純色
newtab-wallpaper-colors = 色彩
newtab-wallpaper-blue = 藍色
newtab-wallpaper-light-blue = 淺藍色
newtab-wallpaper-light-purple = 淺紫色
newtab-wallpaper-light-green = 淺綠色
newtab-wallpaper-green = 綠色
newtab-wallpaper-beige = 米色
newtab-wallpaper-yellow = 黃色
newtab-wallpaper-orange = 橘色
newtab-wallpaper-pink = 粉紅色
newtab-wallpaper-light-pink = 淺粉紅色
newtab-wallpaper-red = 紅色
newtab-wallpaper-dark-blue = 深藍色
newtab-wallpaper-dark-purple = 深紫色
newtab-wallpaper-dark-green = 深綠色
newtab-wallpaper-brown = 棕色

## Abstract

newtab-wallpaper-category-title-abstract = 抽象圖片
newtab-wallpaper-abstract-green = 綠色造型
newtab-wallpaper-abstract-blue = 藍色造型
newtab-wallpaper-abstract-purple = 紫色造型
newtab-wallpaper-abstract-orange = 橘色造型
newtab-wallpaper-gradient-orange = 橘色粉紅色漸層
newtab-wallpaper-abstract-blue-purple = 藍色紫色造型
newtab-wallpaper-abstract-white-curves = 白色的曲線圖案
newtab-wallpaper-abstract-purple-green = 紫色與綠色漸層
newtab-wallpaper-abstract-blue-purple-waves = 藍色與紫色波浪圖
newtab-wallpaper-abstract-black-waves = 黑色波浪圖

## Firefox

newtab-wallpaper-category-title-photographs = 相片
newtab-wallpaper-beach-at-sunrise = 海邊日出
newtab-wallpaper-beach-at-sunset = 海邊日落
newtab-wallpaper-storm-sky = 暴風雨的天空
newtab-wallpaper-sky-with-pink-clouds = 有粉紅色雲朵的天空
newtab-wallpaper-red-panda-yawns-in-a-tree = 在樹上打呵欠的小貓熊
newtab-wallpaper-white-mountains = 白色山脈
newtab-wallpaper-hot-air-balloons = 於白天有各種色彩的熱氣球
newtab-wallpaper-starry-canyon = 藍色星空
newtab-wallpaper-suspension-bridge = 白天的灰色吊橋照片
newtab-wallpaper-sand-dunes = 白色沙丘
newtab-wallpaper-palm-trees = 在魔術光下的椰子樹剪影
newtab-wallpaper-blue-flowers = 盛開的藍色花朵特寫
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = 相片由 <a data-l10n-name="name-link">{ $author_string }</a> 於 <a data-l10n-name="webpage-link">{ $webpage_string }</a> 提供
newtab-wallpaper-feature-highlight-header = 試用新色彩
newtab-wallpaper-feature-highlight-content = 讓您的「新分頁」耳目一新！
newtab-wallpaper-feature-highlight-button = 知道了！
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = 隱藏
    .aria-label = 關閉彈出視窗
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = 天空
newtab-wallpaper-celestial-lunar-eclipse = 月食
newtab-wallpaper-celestial-earth-night = 從低地球軌道拍攝的夜晚照片
newtab-wallpaper-celestial-starry-sky = 星空
newtab-wallpaper-celestial-eclipse-time-lapse = 月食縮時攝影
newtab-wallpaper-celestial-black-hole = 黑洞銀河插圖
newtab-wallpaper-celestial-river = 河流的衛星照片

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = 到 { $provider } 檢視天氣預報
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ 贊助資訊
newtab-weather-menu-change-location = 更改位置
newtab-weather-change-location-search-input-placeholder =
    .placeholder = 搜尋位置
    .aria-label = 搜尋位置
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = 使用目前所在位置
newtab-weather-menu-weather-display = 顯示天氣
newtab-weather-todays-forecast = 本日天氣預報
newtab-weather-see-full-forecast = 檢視完整天氣預報
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = 簡潔
newtab-weather-menu-change-weather-display-simple = 切換為簡潔畫面
newtab-weather-menu-weather-display-option-detailed = 詳細
newtab-weather-menu-change-weather-display-detailed = 切換為詳細畫面
newtab-weather-menu-temperature-units = 溫度單位
newtab-weather-menu-temperature-option-fahrenheit = 華氏
newtab-weather-menu-temperature-option-celsius = 攝氏
newtab-weather-menu-change-temperature-units-fahrenheit = 切換為華氏溫度
newtab-weather-menu-change-temperature-units-celsius = 切換為攝氏溫度
newtab-weather-menu-hide-weather = 隱藏新分頁的天氣資訊
newtab-weather-menu-learn-more = 更多資訊
newtab-weather-menu-detect-my-location = 偵測我的所在位置
# This message is shown if user is working offline
newtab-weather-error-not-available = 目前暫時無法提供天氣資訊。
newtab-weather-opt-in-see-weather = 您想看到目前所在位置的天氣資訊嗎？
newtab-weather-opt-in-not-now =
    .label = 現在不要
newtab-weather-opt-in-yes =
    .label = 好的
newtab-weather-opt-in-headline = 取得您所在地區的天氣預報
newtab-weather-opt-in-use-location =
    .label = 使用位置資訊
newtab-weather-opt-in-choose-location = 選擇位置
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = 紐約市
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = 高溫
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = 低溫
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = 到 { $provider } 檢視天氣預報
    .aria-description = { $provider } ∙ 贊助資訊

## Topic Labels

newtab-topic-label-business = 商業
newtab-topic-label-career = 職涯
newtab-topic-label-education = 教育
newtab-topic-label-arts = 娛樂
newtab-topic-label-food = 美食
newtab-topic-label-health = 健康
newtab-topic-label-hobbies = 遊戲
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = 個人財務
newtab-topic-label-society-parenting = 育兒
newtab-topic-label-government = 政治
newtab-topic-label-education-science = 科學
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = 自我成長
newtab-topic-label-sports = 體育
newtab-topic-label-tech = 科技
newtab-topic-label-travel = 旅遊
newtab-topic-label-home = 家庭與園藝

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = 請選擇主題來調整您的資訊來源
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = 選擇兩組以上的主題，我們的策展專家會依照您的興趣優先顯示。內容隨時更新。
newtab-topic-selection-save-button = 儲存
newtab-topic-selection-cancel-button = 取消
newtab-topic-selection-button-maybe-later = 之後再說
newtab-topic-selection-privacy-link = 了解我們如何保護與管理資料
newtab-topic-selection-button-update-interests = 更新您有興趣的項目
newtab-topic-selection-button-pick-interests = 挑選您有興趣的項目

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = 追蹤
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = 關注 { $topic }
newtab-section-following-button = 追蹤中
newtab-section-unfollow-button = 取消追蹤
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = 關注中：取消關注 { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = 微調您的資訊來源
newtab-section-follow-highlight-subtitle = 追蹤您有興趣的項目，看更多想看的內容。

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = 封鎖
newtab-section-blocked-button = 已封鎖
newtab-section-unblock-button = 解除封鎖
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = 關注 { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = 取消關注 { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = 封鎖 { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = 取消封鎖 { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = 現在不要
newtab-section-confirm-block-topic-p1 = 您確定要封鎖這個主題的內容嗎？
newtab-section-confirm-block-topic-p2 = 將主題封鎖後就不會再顯示於資訊來源中。
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = 封鎖 { $topic }
newtab-section-block-cancel-button = 取消

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = 主題
newtab-section-manage-topics-button-v2 =
    .label = 管理主題
newtab-section-mangage-topics-followed-topics = 已追蹤
newtab-section-mangage-topics-followed-topics-empty-state = 您並未關注任何主題。
newtab-section-mangage-topics-blocked-topics = 已封鎖
newtab-section-mangage-topics-blocked-topics-empty-state = 您並未封鎖任何主題。
newtab-custom-wallpaper-title = 可以在這裡自訂背景圖片
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = 上傳您自己的背景圖，或挑選一組色彩，讓 { -brand-product-name } 有您的風格。
newtab-custom-wallpaper-cta = 試試看

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = 挑選一套背景圖，讓 { -brand-product-name } 有您的風格
newtab-new-user-custom-wallpaper-subtitle = 使用自訂背景圖與色彩，讓每個新分頁感覺都像在家一樣習慣。
newtab-new-user-custom-wallpaper-cta = 立刻試試

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = 全新背景圖正式推出
newtab-wallpaper-feature-highlight-subtitle = 選擇您的最愛項目，讓每個分頁都有像家一樣的感覺。
newtab-wallpaper-feature-highlight-cta = 挑選背景圖

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = 下載 { -brand-product-name } 行動版
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = 掃描 QR Code 隨時隨地安全上網。
newtab-download-mobile-highlight-body-variant-b = 同步分頁標籤、網站密碼與更多資訊，讓您隨時切換裝置繼續上網。
newtab-download-mobile-highlight-body-variant-c = 您知道 { -brand-product-name } 可以隨身帶著走嗎？把同一套瀏覽器，放進口袋。
newtab-download-mobile-highlight-image =
    .aria-label = { -brand-product-name } 行動版的下載 QR Code

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = 手指輕鬆一點就開啟最愛網站
newtab-shortcuts-highlight-subtitle = 新增捷徑，輕鬆一點就能開啟您的最愛網站。

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = 為什麼您會如此回報？
newtab-report-ads-reason-not-interested =
    .label = 我對此資訊沒興趣
newtab-report-ads-reason-inappropriate =
    .label = 此資訊不適當
newtab-report-ads-reason-seen-it-too-many-times =
    .label = 我看到此資訊太多次
newtab-report-content-wrong-category =
    .label = 分類不正確
newtab-report-content-outdated =
    .label = 已過時
newtab-report-content-inappropriate-offensive =
    .label = 不正當或者冒犯人
newtab-report-content-spam-misleading =
    .label = 是垃圾內容或誤導性內容
newtab-report-content-requires-payment-subscription =
    .label = 必需付款或訂閱
newtab-report-content-requires-payment-subscription-learn-more = 更多資訊
newtab-report-cancel = 取消
newtab-report-submit = 送出
newtab-toast-thanks-for-reporting =
    .message = 感謝您檢舉此問題。
newtab-toast-widgets-hidden =
    .message = 選擇鉛筆圖示，即可隨時新增小工具。
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = 您已開始關注 { $topic }。
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = 您已停止關注 { $topic }。
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = 您不會再看到有關 { $topic } 的文章。

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = 有無限可能，請新增看看。
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = 新功能
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = 已完成（{ $number }）
newtab-widget-lists-celebration-headline = 做得好
newtab-widget-lists-celebration-subhead = 沒有任務了！
newtab-widget-task-list-menu-copy = 複製
newtab-widget-lists-menu-edit = 編輯清單名稱
newtab-widget-lists-menu-edit2 =
    .aria-label = 編輯清單名稱
newtab-widget-lists-menu-create = 新增清單
newtab-widget-lists-menu-delete = 刪除此清單
newtab-widget-lists-menu-copy = 複製清單到剪貼簿
newtab-widget-lists-menu-learn-more = 更多資訊
newtab-widget-lists-button-add-item = 新增項目
newtab-widget-lists-input-add-an-item2 =
    .placeholder = 新增項目
    .aria-label = 新增項目
newtab-widget-lists-input-error = 請加入文字來新增項目。
newtab-widget-lists-input-menu-open-link = 開啟鏈結
newtab-widget-lists-input-menu-move-up = 上移
newtab-widget-lists-input-menu-move-down = 下移
newtab-widget-lists-input-menu-delete = 刪除
newtab-widget-lists-input-menu-edit = 編輯
newtab-widget-lists-input-menu-edit2 =
    .aria-label = 編輯項目
newtab-widget-lists-edit-clear =
    .aria-label = 取消
    .title = 取消
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + 新增清單
newtab-widget-lists-name-label-default =
    .label = 任務清單
newtab-widget-lists-name-label-checklist =
    .label = 檢查清單
newtab-widget-lists-name-placeholder-default =
    .placeholder = 任務清單
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = 檢查清單
    .aria-label = 編輯清單名稱
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = 新增清單
    .aria-label = 編輯清單名稱
newtab-widget-section-title = 小工具
newtab-widget-menu-hide = 隱藏小工具
newtab-widget-menu-change-size = 更改大小
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = 移動
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = 置左
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = 置右
newtab-widget-size-small = 小
newtab-widget-size-medium = 中
newtab-widget-size-large = 大
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = 隱藏小工具
    .aria-label = 隱藏所有小工具
newtab-widget-section-maximize =
    .title = 展開小工具
    .aria-label = 將所有小工具展開成完整大小
newtab-widget-section-minimize =
    .title = 最小化小工具
    .aria-label = 將所有小工具摺疊成精簡大小
newtab-widget-section-menu-button =
    .title = 小工具選單
    .aria-label = 開啟小工具選單
newtab-widget-add-widgets-button =
    .aria-label = 新增小工具
    .title = 新增小工具
newtab-widget-section-menu-manage = 管理小工具
newtab-widget-section-menu-hide-all = 隱藏小工具
newtab-widget-section-menu-learn-more = 更多資訊
newtab-widget-section-feedback = 告訴我們您的想法
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = 顯示更多小工具
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = 顯示更少小工具
newtab-widget-lists-name-default = 檢查清單

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = 計時器
newtab-widget-timer-notification-focus = 專注時間已結束，做得好！要休息一下嗎？
newtab-widget-timer-notification-break = 休息時間結束，準備好繼續專注了嗎？
newtab-widget-timer-notification-warning = 通知已關閉
newtab-widget-timer-mode-focus =
    .label = 專注
newtab-widget-timer-mode-break =
    .label = 休息
newtab-widget-timer-label-play =
    .label = 播放
newtab-widget-timer-label-pause =
    .label = 暫停
newtab-widget-timer-reset =
    .title = 重設
newtab-widget-timer-menu-notifications = 關閉通知
newtab-widget-timer-menu-notifications-on = 開啟通知
newtab-widget-timer-menu-learn-more = 更多資訊
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = 頭條新聞
newtab-daily-briefing-card-menu-dismiss = 知道了！
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = { $minutes } 分鐘前更新
newtab-widget-message-title = 使用清單與內建的計時器，讓您保持專注
# to-dos stands for "things to do".
newtab-widget-message-copy = 從快速提醒到每日待辦事項，或是在專注時間之後休息一下伸伸懶腰，讓您及時完成工作。
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = 在同一個位置專注、獲得氣象預報與更多資訊
newtab-widget-message-focus-forecasts-body = 使用 { -brand-product-name } 小工具讓您每天都能保持流暢。確認天氣、關注工作，或確認各地時間。
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = 讓 { -brand-product-name } 有您的風格
newtab-promo-card-body-addons = 從我們的收藏集中挑選一張背景，或自行建立一張。
newtab-promo-card-cta-addons = 立刻試試
newtab-promo-card-title = 支持 { -brand-product-name }
newtab-promo-card-body = 贊助商支持我們打造出一個更好的網路環境的使命
newtab-promo-card-cta = 更多資訊
newtab-promo-card-dismiss-button =
    .title = 知道了！
    .aria-label = 知道了！

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label = 開始計時 { $minutes } 分鐘
newtab-widget-timer-pause-aria =
    .aria-label = 暫停計時器
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label = { $minutes } 分鐘
newtab-widget-timer-decrease-min =
    .title = 減少 1 分鐘
newtab-widget-timer-increase-min =
    .title = 增加 1 分鐘
newtab-widget-timer-mode-group =
    .aria-label = 計時器模式
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = 專注
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = 休息
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = 隱藏計時器
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = 做得好！
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = 休息時間結束
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = 需要休息一下嗎？
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = 準備好要專注了嗎？

##

newtab-sports-widget-menu-follow-teams = 關注球隊
newtab-sports-widget-menu-view-schedule = 檢視賽程
newtab-sports-widget-menu-view-upcoming = 檢視即將到來的賽事
newtab-sports-widget-menu-view-results = 看比賽結果
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = 重要日期
newtab-sports-widget-menu-learn-more = 更多資訊
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = 獲得世界盃賽事的最新資訊
newtab-sports-widget-get-updates = 獲得即時比賽資訊與更多資訊。
newtab-sports-widget-view-schedule =
    .label = 檢視賽程
newtab-sports-widget-follow-teams =
    .label = 關注球隊
newtab-sports-widget-view-matches =
    .label = 檢視比賽分數
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title = 關注最多 { $number } 個隊伍
newtab-sports-widget-choose-wallpaper =
    .label = 挑選一張背景圖
newtab-sports-widget-skip = 略過
newtab-sports-widget-search-country =
    .placeholder = 搜尋國家
    .aria-label = 搜尋國家
newtab-sports-widget-cancel = 取消
newtab-sports-widget-back-button =
    .aria-label = 返回
newtab-sports-widget-done-button =
    .label = 完成
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName }（被淘汰）
newtab-sports-widget-view-all =
    .label = 檢視全部
newtab-sports-widget-show-less =
    .label = 顯示更少
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = 僅關注中的隊伍
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = 觀賞
    .title = 觀賞賽事轉播
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = 觀賞賽事轉播
    .title = 觀賞賽事轉播
newtab-sports-widget-watch-dialog-close =
    .aria-label = 關閉
    .title = 關閉
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = 免費
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = 免費試看
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = 免費與付費
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = 付費
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = 僅部分賽事
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = 於您的地區可使用
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = 其他地區
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = 開啟串流
    .title = 開啟串流
newtab-sports-widget-group-stage = 小組賽
newtab-sports-widget-group-a = A 組
newtab-sports-widget-group-b = B 組
newtab-sports-widget-group-c = C 組
newtab-sports-widget-group-d = D 組
newtab-sports-widget-group-e = E 組
newtab-sports-widget-group-f = F 組
newtab-sports-widget-group-g = G 組
newtab-sports-widget-group-h = H 組
newtab-sports-widget-group-i = I 組
newtab-sports-widget-group-j = J 組
newtab-sports-widget-group-k = K 組
newtab-sports-widget-group-l = L 組
newtab-sports-widget-round-32 = 32 強賽
newtab-sports-widget-round-16 = 16 強賽
newtab-sports-widget-quarter-finals = 8 強賽
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = 進行中
newtab-custom-widget-live-refresh =
    .title = 重新整理分數
    .aria-label = 重新整理分數
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = 重要日期
newtab-sports-widget-upcoming = 即將到來
# Used for a match currently ongoing
newtab-sports-widget-now = 進行中
newtab-sports-widget-results = 結果
newtab-sports-widget-semi-finals = 準決賽
newtab-sports-widget-bronze-finals = 銅牌戰
# Final is the final match for 1st place.
newtab-sports-widget-final = 決賽
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = 延後開賽
newtab-sports-widget-postponed = 延期
newtab-sports-widget-suspended = 比賽暫停
newtab-sports-widget-cancelled = 已取消
newtab-sports-widget-information = 競賽資訊
newtab-sports-widget-no-live-data = 目前無法更新即時比賽資料
newtab-sports-widget-view-results-link = 看比賽結果
newtab-sports-widget-third-place = 季軍
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = 亞軍
newtab-sports-widget-champions = 冠軍
newtab-sports-widget-world-cup-champions = 2026 年世界盃足球賽冠軍
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = 終場
newtab-sports-widget-match-halftime = 中場休息
newtab-sports-widget-match-extra-time = 加時
newtab-sports-widget-match-penalties = PK 大戰
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = vs
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = 別走開，在此處繼續獲得即將到來的賽事詳情

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = 上一頁
    .title = 上一頁
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = 下一頁
    .title = 下一頁
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = 第 { $index } 場即時賽事，共 { $total } 場
    .title = 第 { $index } 場即時賽事，共 { $total } 場

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
    .aria-label = { $homeTeam }，{ $homeScore } 分，對上 { $awayTeam }，{ $awayScore } 分
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }，{ $homeScore } 分（罰球得 { $homePenalty } 分），對上 { $awayTeam }，{ $awayScore } 分（罰球得 { $awayPenalty } 分）
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = 進行中：{ $homeTeam }，{ $homeScore } 分，對上 { $awayTeam }，{ $awayScore } 分
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } vs. { $awayTeam }，{ DATETIME($date, day: "numeric", month: "long") } { DATETIME($date, hour: "numeric", minute: "numeric") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } vs. { $awayTeam }，延後開賽
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } vs. { $awayTeam }，延期
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } vs. { $awayTeam }，比賽暫停
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } vs. { $awayTeam }，取消

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = 波士尼亞與赫塞哥維納
newtab-sports-widget-team-name-label-civ =
    .label = 象牙海岸
newtab-sports-widget-team-name-label-cod =
    .label = 剛果民主共和國
newtab-sports-widget-team-name-label-eng =
    .label = 英格蘭
newtab-sports-widget-team-name-label-sco =
    .label = 蘇格蘭
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = 尚未決定

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = 使用新的背景圖片，為世足賽拉開序幕
newtab-sports-widget-message-wallpapers-body = 將賽事的活力帶進您的瀏覽器。
newtab-sports-widget-message-wallpapers-cta = 挑選背景圖
newtab-sports-widget-message-add-widgets-cta =
    .label = 新增小工具
newtab-sports-widget-message-day-in-play-title = 使用 { -brand-product-name } 小工具隨時關注最新足球賽事
newtab-sports-widget-message-day-in-play-body = 關注足球世界盃，同時專注工作、追蹤各地時間與更多功能。
newtab-sports-widget-message-explore-widgets-cta =
    .label = 探索小工具

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = 知道了！
    .aria-label = 知道了！
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = 讓這塊空間有您的風格
newtab-activation-window-message-customization-focus-message = 選擇全新的背景圖、加入您最愛網站的捷徑，並且隨時取得您有興趣的文章的最新資訊。
newtab-activation-window-message-customization-focus-primary-button =
    .label = 開始自訂
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = 這個空間可以用您想要的方式安排
newtab-activation-window-message-values-focus-message = { -brand-product-name } 讓您可以用自己想要的方式上網，用更個人化的方式開啟每一天。讓 { -brand-product-name } 有您獨特的風格。

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = 隱藏時鐘
newtab-clock-widget-menu-learn-more = 更多資訊
newtab-clock-widget-menu-edit = 編輯時鐘
newtab-clock-widget-menu-switch-to-12h = 切換為 12 小時格式
newtab-clock-widget-menu-switch-to-24h = 切換為 24 小時格式
newtab-clock-widget-label-your-clocks = 您的時鐘
newtab-clock-widget-search-location-input =
    .label = 位置
    .placeholder = 搜尋城市
    .aria-label = 搜尋城市
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = 暱稱（選填）
    .placeholder = 新增暱稱
    .aria-label = 暱稱（選填）
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = 新增時鐘
    .aria-label = 新增時鐘
newtab-clock-widget-button-add-clock = 新增
newtab-clock-widget-button-cancel = 取消
newtab-clock-widget-button-back =
    .title = 返回
    .aria-label = 返回
newtab-clock-widget-button-edit-clock =
    .title = 編輯時鐘
    .aria-label = 編輯時鐘
newtab-clock-widget-button-save = 儲存
newtab-clock-widget-button-remove-clock =
    .title = 移除時鐘
    .aria-label = 移除時鐘
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
    .aria-label = { $city }，暱稱：{ $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = 新增時鐘
newtab-clock-widget-edit-clock-form =
    .aria-label = 編輯時鐘
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = 搜尋結果
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = 沒有符合的城市
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = 開啟時鐘選單
    .aria-label = 開啟時鐘選單
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = 暱稱：{ $nickname }

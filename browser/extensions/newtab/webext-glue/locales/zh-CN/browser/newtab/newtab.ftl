# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = 新标签页
newtab-settings-button =
    .title = 定制您的新标签页
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = 定制此页面
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = 定制
newtab-customize-panel-label =
    .label = 定制
newtab-personalize-settings-icon-label =
    .title = 个性化新标签页
    .aria-label = 设置
newtab-settings-dialog-label =
    .aria-label = 设置
newtab-personalize-icon-label =
    .title = 个性化标签页
    .aria-label = 个性化标签页
newtab-personalize-dialog-label =
    .aria-label = 个性化
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = 知道了
    .aria-label = 知道了

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = 主页
home-homepage-new-windows =
    .label = 新窗口
home-homepage-new-tabs =
    .label = 新标签页
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = 选择特定网站

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = 网址
home-custom-homepage-address =
    .placeholder = 输入地址
home-custom-homepage-address-button =
    .label = 添加地址
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = 未添加网站。
home-custom-homepage-delete-address-button =
    .aria-label = 删除地址
    .title = 删除地址
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = 替换为
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = 当前打开的页面
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = 书签…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = 搜索
home-prefs-stories-header2 =
    .label = 文章
    .description = 由 { -brand-product-name } 系列产品推荐的精选内容
home-prefs-widgets-header =
    .label = 小组件
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = 清单
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = 计时器
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = 体育
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = 时钟
home-prefs-mission-message2 =
    .message = 建设一个更好的互联网的使命，离不开我们赞助商的支持。
home-prefs-manage-topics-link2 =
    .label = 管理主题
home-prefs-choose-wallpaper-link2 =
    .label = 选择壁纸
home-prefs-firefox-logo-header =
    .label = { -brand-short-name } 徽标
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = 将新标签页或新窗口设置为 { -firefox-home-brand-name }以使用此功能。
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label = { $num } 行
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = 扩展（{ $extension }）
home-restore-defaults-srd =
    .label = 恢复默认设置
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name }（默认）
home-mode-choice-custom-srd =
    .label = 自定义网址…
home-mode-choice-blank-srd =
    .label = 空白页
home-prefs-shortcuts-header-srd =
    .label = 快捷方式
home-prefs-shortcuts-select =
    .aria-label = 快捷方式
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = 赞助商网站
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = 赞助内容
home-prefs-highlights-option-visited-pages-srd =
    .label = 访问过的页面
home-prefs-highlights-options-bookmarks-srd =
    .label = 书签
home-prefs-highlights-option-most-recent-download-srd =
    .label = 最近下载
home-prefs-recent-activity-header-srd =
    .label = 近期动态
home-prefs-recent-activity-select =
    .aria-label = 近期动态
home-prefs-weather-header-srd =
    .label = 天气
home-prefs-support-firefox-header-srd =
    .label = 支持 { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = 了解其方式

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = 搜索
    .aria-label = 搜索
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = 使用 { $engine } 搜索，或者输入网址
newtab-search-box-handoff-text-no-engine = 搜索或输入网址
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = 使用 { $engine } 搜索，或者输入网址
    .title = 使用 { $engine } 搜索，或者输入网址
    .aria-label = 使用 { $engine } 搜索，或者输入网址
newtab-search-box-handoff-input-no-engine =
    .placeholder = 搜索或输入网址
    .title = 搜索或输入网址
    .aria-label = 搜索或输入网址
newtab-search-box-text = 网上搜索
newtab-search-box-input =
    .placeholder = 网上搜索
    .aria-label = 网上搜索

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = 添加搜索引擎
newtab-topsites-add-shortcut-header = 新建快捷方式
newtab-topsites-edit-topsites-header = 编辑常用网站
newtab-topsites-edit-shortcut-header = 编辑快捷方式
newtab-topsites-add-shortcut-label = 添加快捷方式
newtab-topsites-add-shortcut-title =
    .title = 添加快捷方式
    .aria-label = 添加快捷方式
newtab-topsites-title-label = 标题
newtab-topsites-title-input =
    .placeholder = 输入标题
newtab-topsites-url-label = 网址
newtab-topsites-url-input =
    .placeholder = 输入或粘贴网址
newtab-topsites-url-validation = 需要有效的网址
newtab-topsites-image-url-label = 自定义图像网址
newtab-topsites-use-image-link = 使用自定义图像…
newtab-topsites-image-validation = 图像加载失败。请尝试其他网址。

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = 清除文本

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = 取消
newtab-topsites-delete-history-button = 从历史记录中删除
newtab-topsites-save-button = 保存
newtab-topsites-preview-button = 预览
newtab-topsites-add-button = 添加

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = 您确定要删除此页面在您的历史记录中的所有记录吗？
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = 此操作无法撤销。

## Top Sites - Sponsored label

newtab-topsite-sponsored = 赞助推广

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title }（已固定）
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = 打开菜单
    .aria-label = 打开菜单
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = 移除
    .aria-label = 移除
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = 打开菜单
    .aria-label = 打开 { $title } 的快捷菜单
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = 编辑此网站
    .aria-label = 编辑此网站

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = 编辑
newtab-menu-open-new-window = 新建窗口打开
newtab-menu-open-new-private-window = 新建隐私浏览窗口打开
newtab-menu-dismiss = 隐藏
newtab-menu-pin = 固定
newtab-menu-unpin = 取消固定
newtab-menu-delete-history = 从历史记录中删除
newtab-menu-save-to-pocket = 保存到 { -pocket-brand-name }
newtab-menu-delete-pocket = 从 { -pocket-brand-name } 删除
newtab-menu-archive-pocket = 在 { -pocket-brand-name } 中存档
newtab-menu-show-privacy-info = 我们的赞助商＆您的隐私
newtab-menu-about-fakespot = 关于 { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = 反馈
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = 屏蔽
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = 取消关注
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = 详细了解
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = 取消关注主题

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = 管理赞助内容
newtab-menu-our-sponsors-and-your-privacy = 我们的赞助商与您的隐私
newtab-menu-report-this-ad = 举报此广告

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = 完成
newtab-privacy-modal-button-manage = 管理赞助内容设置
newtab-privacy-modal-header = 隐私是公民的基本权利。
newtab-privacy-modal-paragraph-2 = 除了提供引人入胜的文章之外，我们还与赞助商合作展示有价值，且经甄选的内容。请放心，<strong>您的浏览数据永远只会留在本机 { -brand-product-name }</strong> 中 — 我们看不到，我们的赞助商亦然。
newtab-privacy-modal-link = 了解新标签页如何保障您的隐私

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = 删除书签
# Bookmark is a verb here.
newtab-menu-bookmark = 添加书签

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = 复制下载链接
newtab-menu-go-to-download-page = 前往下载页面
newtab-menu-remove-download = 从历史记录中移除

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] 在访达中显示
       *[other] 打开所在文件夹
    }
newtab-menu-open-file = 打开文件

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = 曾经访问
newtab-label-bookmarked = 已加书签
newtab-label-removed-bookmark = 书签已移除
newtab-label-recommended = 趋势
newtab-label-saved = 已保存到 { -pocket-brand-name }
newtab-label-download = 已下载
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · 赞助
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = 由 { $sponsor } 赞助
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } 分钟
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = 赞助推广

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = 移除版块
newtab-section-menu-collapse-section = 折叠版块
newtab-section-menu-expand-section = 展开版块
newtab-section-menu-manage-section = 管理版块
newtab-section-menu-manage-webext = 管理扩展
newtab-section-menu-add-topsite = 添加常用网站
newtab-section-menu-add-search-engine = 添加搜索引擎
newtab-section-menu-move-up = 上移
newtab-section-menu-move-down = 下移
newtab-section-menu-privacy-notice = 隐私声明

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = 折叠版块
newtab-section-expand-section-label =
    .aria-label = 展开版块

## Section Headers.

newtab-section-header-topsites = 常用网站
newtab-section-header-recent-activity = 近期动态
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } 推荐
newtab-section-header-stories = 精选文章
# "picks" refers to recommended articles
newtab-section-header-todays-picks = 今日专属荐读

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = 开始网上冲浪之旅吧，之后这里会显示您最近看过或加了书签的精彩文章、视频与其他页面。
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = 所有文章都读完啦！晚点再来，{ $provider } 将推荐更多精彩文章。等不及了？选择热门主题，找到更多网上的好文章。
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = 所有文章都读完了。待会再来看是否有新文章。等不及？那么请选择热门主题，从网上找到更多好文章。

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = 都读完了！
newtab-discovery-empty-section-topstories-content = 待会再来看是否有新文章。
newtab-discovery-empty-section-topstories-try-again-button = 重试
newtab-discovery-empty-section-topstories-loading = 正在加载…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = 哎呀！无法完全加载此版块。

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = 热门主题：
newtab-pocket-new-topics-title = 想刷到更多文章？看看这些 { -pocket-brand-name } 上的热门主题
newtab-pocket-more-recommendations = 更多推荐
newtab-pocket-learn-more = 详细了解
newtab-pocket-cta-button = 获取 { -pocket-brand-name }
newtab-pocket-cta-text = 将您喜爱的故事保存到 { -pocket-brand-name }，用精彩的读物为思想注入活力。
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } 是 { -brand-product-name } 系列产品的一部分
newtab-pocket-save = 保存
newtab-pocket-saved = 已保存

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = 再多来点
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = 不感兴趣
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = 谢谢，您的反馈有助于我们改进为您提供的推送。
newtab-toast-dismiss-button =
    .title = 知道了
    .aria-label = 知道了

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = 发现最好的网络
newtab-pocket-onboarding-cta = { -pocket-brand-name } 探索各种各样的出版物，为您的 { -brand-product-name } 浏览器带来最翔实、最鼓舞人心和最值得信赖的内容。

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = 哎呀，加载内容时发生错误。
newtab-error-fallback-refresh-link = 刷新页面以重试。

## Customization Menu

newtab-custom-shortcuts-title = 快捷方式
newtab-custom-shortcuts-subtitle = 您保存或访问过的网站
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = 快捷方式
    .description = 您保存或访问过的网站
newtab-custom-shortcuts-nova =
    .label = 快捷方式
newtab-custom-row-description =
    .description = 行数
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
           *[other] { $num } 行
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
       *[other] { $num } 行
    }
newtab-custom-sponsored-sites = 赞助商网站
newtab-custom-pocket-title = 由 { -pocket-brand-name } 推荐
newtab-custom-pocket-subtitle = 由 { -brand-product-name } 旗下 { -pocket-brand-name } 策划的特别内容
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = 推荐文章
    .description = 由 { -brand-product-name } 推荐的精选内容
newtab-recommended-stories-toggle =
    .label = 推荐文章
newtab-custom-stories-personalized-toggle =
    .label = 文章
newtab-custom-stories-personalized-checkbox-label = 根据您的阅读记录为您推荐文章
newtab-custom-pocket-sponsored = 赞助内容
newtab-custom-pocket-show-recent-saves = 显示近期保存内容
newtab-custom-recent-title = 近期动态
newtab-custom-recent-subtitle = 近期访问的网站与内容精选
newtab-custom-weather-toggle =
    .label = 天气
    .description = 速览今日天气预报
newtab-custom-widget-weather-toggle =
    .label = 天气
newtab-custom-widget-lists-toggle =
    .label = 清单
newtab-custom-widget-timer-toggle =
    .label = 计时器
newtab-custom-widget-sports-toggle =
    .label = 世界杯
newtab-custom-widget-clock-toggle =
    .label = 时钟
newtab-custom-widget-sports-toggle2 =
    .label = 体育
newtab-custom-widget-section-title = 小组件
newtab-custom-widget-section-toggle =
    .label = 小组件
newtab-widget-manage-title = 小组件
newtab-widget-manage-widget-button =
    .label = 管理小组件
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = 关闭
    .aria-label = 关闭菜单
newtab-custom-close-button = 关闭
newtab-custom-settings = 管理更多设置

## New Tab Wallpapers

newtab-wallpaper-title = 壁纸
newtab-wallpaper-reset = 重置为默认设置
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = 上传图像
newtab-wallpaper-add-an-image = 添加图像
newtab-wallpaper-custom-color = 选择颜色
newtab-wallpaper-toggle-title =
    .label = 壁纸
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = 图像超出文件大小上限（{ $file_size }MB），请尝试上传较小的文件。
newtab-wallpaper-error-upload-file-type = 无法上传文件，请尝试使用图像文件。
newtab-wallpaper-error-file-type = 无法上传文件，请尝试使用其他文件类型。
newtab-wallpaper-light-red-panda = 小熊猫
newtab-wallpaper-light-mountain = 白山山脉
newtab-wallpaper-light-sky = 漂浮着粉紫色云的天空
newtab-wallpaper-light-color = 蓝色、粉色和黄色的形状
newtab-wallpaper-light-landscape = 淡蓝薄雾笼罩下的山地景观
newtab-wallpaper-light-beach = 生长着棕榈树的海滩
newtab-wallpaper-dark-aurora = 极光
newtab-wallpaper-dark-color = 红色和蓝色的形状
newtab-wallpaper-dark-panda = 躲在森林里的小熊猫
newtab-wallpaper-dark-sky = 夜空下的城市景观
newtab-wallpaper-dark-mountain = 山地景观
newtab-wallpaper-dark-city = 紫色城市景观
newtab-wallpaper-dark-fox-anniversary = 树林旁边人行道上的狐狸
newtab-wallpaper-light-fox-anniversary = 迷蒙山景中草地上的狐狸

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = 纯色
newtab-wallpaper-colors = 颜色
newtab-wallpaper-blue = 蓝色
newtab-wallpaper-light-blue = 淡蓝色
newtab-wallpaper-light-purple = 淡紫色
newtab-wallpaper-light-green = 淡绿色
newtab-wallpaper-green = 绿色
newtab-wallpaper-beige = 米色
newtab-wallpaper-yellow = 黄色
newtab-wallpaper-orange = 橙色
newtab-wallpaper-pink = 粉色
newtab-wallpaper-light-pink = 淡粉色
newtab-wallpaper-red = 红色
newtab-wallpaper-dark-blue = 深蓝色
newtab-wallpaper-dark-purple = 深紫色
newtab-wallpaper-dark-green = 深绿色
newtab-wallpaper-brown = 棕色

## Abstract

newtab-wallpaper-category-title-abstract = 抽象
newtab-wallpaper-abstract-green = 绿色形状
newtab-wallpaper-abstract-blue = 蓝色形状
newtab-wallpaper-abstract-purple = 紫色形状
newtab-wallpaper-abstract-orange = 橙色形状
newtab-wallpaper-gradient-orange = 橙粉渐变
newtab-wallpaper-abstract-blue-purple = 蓝紫渐变
newtab-wallpaper-abstract-white-curves = 白色带阴影曲线
newtab-wallpaper-abstract-purple-green = 紫绿光渐变
newtab-wallpaper-abstract-blue-purple-waves = 蓝色和紫色的波浪形状
newtab-wallpaper-abstract-black-waves = 黑色波浪形状

## Firefox

newtab-wallpaper-category-title-photographs = 摄影
newtab-wallpaper-beach-at-sunrise = 海滩日出
newtab-wallpaper-beach-at-sunset = 海滩日落
newtab-wallpaper-storm-sky = 电闪雷鸣
newtab-wallpaper-sky-with-pink-clouds = 飘着粉色云朵的天空
newtab-wallpaper-red-panda-yawns-in-a-tree = 在树上打哈欠的小熊猫
newtab-wallpaper-white-mountains = 皑白山脉
newtab-wallpaper-hot-air-balloons = 白天各种颜色的热气球
newtab-wallpaper-starry-canyon = 蓝色星空
newtab-wallpaper-suspension-bridge = 白天时的灰色全悬索桥照片
newtab-wallpaper-sand-dunes = 白色沙丘
newtab-wallpaper-palm-trees = 魔术光下的椰子树侧影
newtab-wallpaper-blue-flowers = 蓝瓣花绽放的近景照片
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = 照片由 <a data-l10n-name="name-link">{ $author_string }</a> 发布于 <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = 试用新色彩
newtab-wallpaper-feature-highlight-content = 选张壁纸，给新标签页加点新鲜感。
newtab-wallpaper-feature-highlight-button = 知道了
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = 知道了
    .aria-label = 关闭弹窗
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = 天体
newtab-wallpaper-celestial-lunar-eclipse = 月食
newtab-wallpaper-celestial-earth-night = 从近地轨道拍摄的夜晚照片
newtab-wallpaper-celestial-starry-sky = 星空
newtab-wallpaper-celestial-eclipse-time-lapse = 月食延时照片
newtab-wallpaper-celestial-black-hole = 黑洞星空图
newtab-wallpaper-celestial-river = 河流卫星图

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = 在“{ $provider }”上查看天气预报
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ 赞助
newtab-weather-menu-change-location = 更改位置
newtab-weather-change-location-search-input-placeholder =
    .placeholder = 搜索位置
    .aria-label = 搜索位置
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = 使用当前位置
newtab-weather-menu-weather-display = 天气信息显示方式
newtab-weather-todays-forecast = 今日预报
newtab-weather-see-full-forecast = 查看完整预报
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = 简明
newtab-weather-menu-change-weather-display-simple = 切换到简明视图
newtab-weather-menu-weather-display-option-detailed = 详细
newtab-weather-menu-change-weather-display-detailed = 切换到详细视图
newtab-weather-menu-temperature-units = 温度单位
newtab-weather-menu-temperature-option-fahrenheit = 华氏度
newtab-weather-menu-temperature-option-celsius = 摄氏度
newtab-weather-menu-change-temperature-units-fahrenheit = 切换为华氏度
newtab-weather-menu-change-temperature-units-celsius = 切换为摄氏度
newtab-weather-menu-hide-weather = 隐藏新标签页上的天气信息
newtab-weather-menu-learn-more = 详细了解
newtab-weather-menu-detect-my-location = 检测我的位置
# This message is shown if user is working offline
newtab-weather-error-not-available = 目前无法获取天气数据。
newtab-weather-opt-in-see-weather = 您想看到当前位置的天气信息吗？
newtab-weather-opt-in-not-now =
    .label = 暂时不要
newtab-weather-opt-in-yes =
    .label = 好的
newtab-weather-opt-in-headline = 获取您当地的天气预报
newtab-weather-opt-in-use-location =
    .label = 使用位置信息
newtab-weather-opt-in-choose-location = 选择位置
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = 纽约市
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = 最高
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = 最低
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = 在“{ $provider }”上查看天气预报
    .aria-description = { $provider } ∙ 赞助

## Topic Labels

newtab-topic-label-business = 商业
newtab-topic-label-career = 职场
newtab-topic-label-education = 教育
newtab-topic-label-arts = 娱乐
newtab-topic-label-food = 饮食
newtab-topic-label-health = 健康
newtab-topic-label-hobbies = 游戏
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = 理财
newtab-topic-label-society-parenting = 育儿
newtab-topic-label-government = 政治
newtab-topic-label-education-science = 科学
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = 自我提升
newtab-topic-label-sports = 体育
newtab-topic-label-tech = 科技
newtab-topic-label-travel = 旅行
newtab-topic-label-home = 家庭与园艺

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = 选择主题，让推送内容更合您胃口
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = 请选择两个或更多主题。我们的专业采编团队会按照您的喜好，优先呈上专属推荐，您还可以随时刷新。
newtab-topic-selection-save-button = 保存
newtab-topic-selection-cancel-button = 取消
newtab-topic-selection-button-maybe-later = 以后再说
newtab-topic-selection-privacy-link = 了解我们保护和管理数据的方式
newtab-topic-selection-button-update-interests = 更新您感兴趣的主题
newtab-topic-selection-button-pick-interests = 选择您感兴趣的主题

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = 关注
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = 关注“{ $topic }”
newtab-section-following-button = 正在关注
newtab-section-unfollow-button = 取消关注
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = 正在关注：取消关注“{ $topic }”
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = 优化推荐内容
newtab-section-follow-highlight-subtitle = 随心所好，悦见更多。

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = 屏蔽
newtab-section-blocked-button = 已屏蔽
newtab-section-unblock-button = 取消屏蔽
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = 关注“{ $topic }”
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = 取消关注“{ $topic }”
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = 屏蔽“{ $topic }”
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = 取消屏蔽“{ $topic }”

## Confirmation modal for blocking a section

newtab-section-cancel-button = 暂时不要
newtab-section-confirm-block-topic-p1 = 确定要屏蔽此主题吗？
newtab-section-confirm-block-topic-p2 = 将不再向您推送被屏蔽的主题。
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = 屏蔽“{ $topic }”
newtab-section-block-cancel-button = 取消

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = 主题
newtab-section-manage-topics-button-v2 =
    .label = 管理主题
newtab-section-mangage-topics-followed-topics = 已关注
newtab-section-mangage-topics-followed-topics-empty-state = 没有已关注的主题。
newtab-section-mangage-topics-blocked-topics = 已屏蔽
newtab-section-mangage-topics-blocked-topics-empty-state = 没有已屏蔽的主题
newtab-custom-wallpaper-title = 在此处自定义壁纸
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = 自行上传壁纸或选取自定义颜色，让 { -brand-product-name } 更有个性。
newtab-custom-wallpaper-cta = 试试看

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = 选张壁纸，让 { -brand-product-name } 独具个性
newtab-new-user-custom-wallpaper-subtitle = 自定义壁纸和颜色，让新标签页亲切如家。
newtab-new-user-custom-wallpaper-cta = 现在就试试

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = 新鲜壁纸到货
newtab-wallpaper-feature-highlight-subtitle = 选择您最爱的壁纸，让每次打开新标签页都亲切如归家。
newtab-wallpaper-feature-highlight-cta = 选择壁纸

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = 下载移动版 { -brand-product-name }
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = 扫码下载移动版本，随时随地安全浏览。
newtab-download-mobile-highlight-body-variant-b = 同步标签页、密码等信息，随时从上次看到的地方继续浏览。
newtab-download-mobile-highlight-body-variant-c = 您还可以将 { -brand-product-name } 随身带着走。相同体验，装入口袋。
newtab-download-mobile-highlight-image =
    .aria-label = 移动版 { -brand-product-name } 的下载二维码

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = 顺手就能打开常用网站
newtab-shortcuts-highlight-subtitle = 添加快捷方式，一键打开常用网站。

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = 此内容存在什么问题？
newtab-report-ads-reason-not-interested =
    .label = 不感兴趣
newtab-report-ads-reason-inappropriate =
    .label = 内容不当
newtab-report-ads-reason-seen-it-too-many-times =
    .label = 推荐次数过多
newtab-report-content-wrong-category =
    .label = 分类错误
newtab-report-content-outdated =
    .label = 过时
newtab-report-content-inappropriate-offensive =
    .label = 不适宜或具有冒犯性
newtab-report-content-spam-misleading =
    .label = 垃圾信息或具有误导性
newtab-report-content-requires-payment-subscription =
    .label = 需要付款或订阅
newtab-report-content-requires-payment-subscription-learn-more = 详细了解
newtab-report-cancel = 取消
newtab-report-submit = 提交
newtab-toast-thanks-for-reporting =
    .message = 感谢反馈。
newtab-toast-widgets-hidden =
    .message = 选择铅笔图标，随时重新添加小组件。
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = 您现已关注{ $topic }。
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = 您已不再关注{ $topic }。
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = 将不再显示{ $topic }文章。

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = 立即添加任务，开启无限可能。
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = 新功能
newtab-widget-lists-label-beta =
    .label = 测试版
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = 已完成（{ $number }）
newtab-widget-lists-celebration-headline = 真棒
newtab-widget-lists-celebration-subhead = 已全部完成
newtab-widget-task-list-menu-copy = 复制
newtab-widget-lists-menu-edit = 编辑清单名称
newtab-widget-lists-menu-edit2 =
    .aria-label = 编辑清单名称
newtab-widget-lists-menu-create = 创建新清单
newtab-widget-lists-menu-delete = 删除此清单
newtab-widget-lists-menu-copy = 复制清单到剪贴板
newtab-widget-lists-menu-learn-more = 详细了解
newtab-widget-lists-button-add-item = 添加项目
newtab-widget-lists-input-add-an-item2 =
    .placeholder = 添加项目
    .aria-label = 添加项目
newtab-widget-lists-input-error = 请输入项目名称
newtab-widget-lists-input-menu-open-link = 打开链接
newtab-widget-lists-input-menu-move-up = 上移
newtab-widget-lists-input-menu-move-down = 下移
newtab-widget-lists-input-menu-delete = 删除
newtab-widget-lists-input-menu-edit = 编辑
newtab-widget-lists-input-menu-edit2 =
    .aria-label = 编辑项目
newtab-widget-lists-edit-clear =
    .aria-label = 取消
    .title = 取消
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + 创建新清单
newtab-widget-lists-name-label-default =
    .label = 任务清单
newtab-widget-lists-name-label-checklist =
    .label = 核对清单
newtab-widget-lists-name-placeholder-default =
    .placeholder = 任务清单
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = 核对清单
    .aria-label = 编辑清单名称
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = 新清单
    .aria-label = 编辑清单名称
newtab-widget-section-title = 小组件
newtab-widget-menu-hide = 隐藏小组件
newtab-widget-menu-change-size = 更改大小
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = 移动到
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = 左侧
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = 右侧
newtab-widget-size-small = 小
newtab-widget-size-medium = 中
newtab-widget-size-large = 大
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = 隐藏小组件
    .aria-label = 隐藏所有小组件
newtab-widget-section-maximize =
    .title = 展开小组件
    .aria-label = 将所有小组件展开为完整大小
newtab-widget-section-minimize =
    .title = 最小化小组件
    .aria-label = 将所有小组件收缩为紧凑大小
newtab-widget-section-menu-button =
    .title = 小组件菜单
    .aria-label = 打开小组件菜单
newtab-widget-add-widgets-button =
    .aria-label = 添加小组件
    .title = 添加小组件
newtab-widget-section-menu-manage = 管理小组件
newtab-widget-section-menu-hide-all = 隐藏小组件
newtab-widget-section-menu-learn-more = 详细了解
newtab-widget-section-feedback = 告诉我们您的想法
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = 显示更多小组件
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = 折叠小组件
newtab-widget-lists-name-default = 核对清单

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = 计时器
newtab-widget-timer-notification-focus = 专注时间结束，真棒！要休息一下吗？
newtab-widget-timer-notification-break = 休息时间结束。准备好继续专注了吗？
newtab-widget-timer-notification-warning = 通知已关闭
newtab-widget-timer-mode-focus =
    .label = 专注
newtab-widget-timer-mode-break =
    .label = 休息
newtab-widget-timer-label-play =
    .label = 开始
newtab-widget-timer-label-pause =
    .label = 暂停
newtab-widget-timer-reset =
    .title = 重置
newtab-widget-timer-menu-notifications = 关闭通知
newtab-widget-timer-menu-notifications-on = 开启通知
newtab-widget-timer-menu-learn-more = 详细了解
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = 头条新闻
newtab-daily-briefing-card-menu-dismiss = 知道了
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = { $minutes } 分钟前更新
newtab-widget-message-title = 借助清单和内置计时器，聚焦重点、保持专注。
# to-dos stands for "things to do".
newtab-widget-message-copy = 从快捷提醒到日常待办，从专注时段到放松片刻，既能帮您管理任务，又可助您把握时间。
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = 凝神专注、查看天气预报，尽在一处。另有更多实用功能。
newtab-widget-message-focus-forecasts-body = 借助 { -brand-product-name } 小组件，顺畅完成每日工作。查看天气预报、记录任务、掌握世界各地时间，尽在一处。
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = 让 { -brand-product-name } 更具个性
newtab-promo-card-body-addons = 从我们的精选壁纸中挑选一张，也可以自己创作。
newtab-promo-card-cta-addons = 现在就试试
newtab-promo-card-title = 支持 { -brand-product-name }
newtab-promo-card-body = 建设一个更好的互联网的使命，离不开我们赞助商的支持
newtab-promo-card-cta = 详细了解
newtab-promo-card-dismiss-button =
    .title = 知道了
    .aria-label = 知道了

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label = 启动 { $minutes } 分钟计时器
newtab-widget-timer-pause-aria =
    .aria-label = 暂停计时器
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label = { $minutes } 分钟
newtab-widget-timer-decrease-min =
    .title = 减少 1 分钟
newtab-widget-timer-increase-min =
    .title = 增加 1 分钟
newtab-widget-timer-mode-group =
    .aria-label = 计时器模式
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = 专注
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = 休息
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = 隐藏计时器
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = 辛苦了
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = 休息时间结束
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = 需要休息吗？
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = 准备好专注了吗？

##

newtab-sports-widget-menu-follow-teams = 关注球队
newtab-sports-widget-menu-view-schedule = 查看赛程
newtab-sports-widget-menu-view-upcoming = 查看即将进行的比赛
newtab-sports-widget-menu-view-results = 查看比赛结果
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = 重要日期
newtab-sports-widget-menu-learn-more = 详细了解
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = 全程关注世界杯
newtab-sports-widget-get-updates = 获取实时赛况等信息。
newtab-sports-widget-view-schedule =
    .label = 查看赛程
newtab-sports-widget-follow-teams =
    .label = 关注球队
newtab-sports-widget-view-matches =
    .label = 查看比赛
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title = 最多可关注 { $number } 支球队
newtab-sports-widget-choose-wallpaper =
    .label = 选择壁纸
newtab-sports-widget-skip = 跳过
newtab-sports-widget-search-country =
    .placeholder = 搜索国家/地区
    .aria-label = 搜索国家/地区
newtab-sports-widget-cancel = 取消
newtab-sports-widget-back-button =
    .aria-label = 返回
newtab-sports-widget-done-button =
    .label = 完成
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName }（已淘汰）
newtab-sports-widget-view-all =
    .label = 查看全部
newtab-sports-widget-show-less =
    .label = 收起
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = 仅显示关注的球队
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = 观看
    .title = 观看直播
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = 观看直播
    .title = 观看直播
newtab-sports-widget-watch-dialog-close =
    .aria-label = 关闭
    .title = 关闭
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = 免费
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = 免费试看
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = 免费和付费
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = 付费
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = 仅特定比赛
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = 您所在地区的观看方式
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = 其他地区
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = 在线观看
    .title = 在线观看
newtab-sports-widget-group-stage = 小组赛阶段
newtab-sports-widget-group-a = A 组
newtab-sports-widget-group-b = B 组
newtab-sports-widget-group-c = C 组
newtab-sports-widget-group-d = D 组
newtab-sports-widget-group-e = E 组
newtab-sports-widget-group-f = F 组
newtab-sports-widget-group-g = G 组
newtab-sports-widget-group-h = H 组
newtab-sports-widget-group-i = I 组
newtab-sports-widget-group-j = J 组
newtab-sports-widget-group-k = K 组
newtab-sports-widget-group-l = L 组
newtab-sports-widget-round-32 = 十六分之一决赛
newtab-sports-widget-round-16 = 八分之一决赛
newtab-sports-widget-quarter-finals = 四分之一决赛
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = 进行中
newtab-custom-widget-live-refresh =
    .title = 刷新比分
    .aria-label = 刷新比分
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = 重要日期
newtab-sports-widget-upcoming = 即将进行
# Used for a match currently ongoing
newtab-sports-widget-now = 进行中
newtab-sports-widget-results = 比赛结果
newtab-sports-widget-semi-finals = 半决赛
newtab-sports-widget-bronze-finals = 三四名决赛
# Final is the final match for 1st place.
newtab-sports-widget-final = 决赛
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = 推迟
newtab-sports-widget-postponed = 改期
newtab-sports-widget-suspended = 中断
newtab-sports-widget-cancelled = 取消
newtab-sports-widget-information = 本场比赛信息
newtab-sports-widget-no-live-data = 目前未在更新实时比赛数据
newtab-sports-widget-view-results-link = 查看比赛结果
newtab-sports-widget-third-place = 季军
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = 亚军
newtab-sports-widget-champions = 冠军
newtab-sports-widget-world-cup-champions = 2026 年世界杯冠军
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = 全场
newtab-sports-widget-match-halftime = 中场
newtab-sports-widget-match-extra-time = 加时赛
newtab-sports-widget-match-penalties = 点球决胜
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = vs

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = 上一页
    .title = 上一页
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = 下一页
    .title = 下一页
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = 进行中的比赛（第 { $index }/{ $total } 场）
    .title = 进行中的比赛（第 { $index }/{ $total } 场）

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
    .aria-label = { $homeTeam }对{ $awayTeam }，{ $homeScore } 比 { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }对{ $awayTeam }，{ $homeScore } 比 { $awayScore }，点球决胜 { $homePenalty } 比 { $awayPenalty }
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = 进行中：{ $homeTeam }对{ $awayTeam }，{ $homeScore } 比 { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam }对{ $awayTeam }，{ DATETIME($date, day: "numeric", month: "long") } { DATETIME($date, hour: "numeric", minute: "numeric") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } 对 { $awayTeam }，推迟
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } 对 { $awayTeam }，改期
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } 对 { $awayTeam }，中断
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } 对 { $awayTeam }，取消

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = 波黑
newtab-sports-widget-team-name-label-civ =
    .label = 科特迪瓦
newtab-sports-widget-team-name-label-cod =
    .label = 刚果
newtab-sports-widget-team-name-label-eng =
    .label = 英格兰
newtab-sports-widget-team-name-label-sco =
    .label = 苏格兰
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = 待定

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = 换上新壁纸，迎接世界杯
newtab-sports-widget-message-wallpapers-body = 赛事期间，将赛场活力注入浏览器
newtab-sports-widget-message-wallpapers-cta = 选择壁纸
newtab-sports-widget-message-add-widgets-cta =
    .label = 添加小组件
newtab-sports-widget-message-day-in-play-title = 使用 { -brand-product-name } 小组件，全天候关注精彩赛事
newtab-sports-widget-message-day-in-play-body = 关注世界杯、记录任务、掌握世界各地时间，另有更多实用功能。
newtab-sports-widget-message-explore-widgets-cta =
    .label = 探索小组件

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = 知道了
    .aria-label = 知道了
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = 定制这片空间，打造专属天地
newtab-activation-window-message-customization-focus-message = 挑选新壁纸、添加常用网站的快捷方式、随时关注您感兴趣的文章。
newtab-activation-window-message-customization-focus-primary-button =
    .label = 开始定制
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = 这片空间，由您做主
newtab-activation-window-message-values-focus-message = { -brand-product-name } 可让您以更具个性的方式开启网络上的新一天，按自己喜欢的方式来浏览。让 { -brand-product-name } 有您的个性。

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = 隐藏时钟
newtab-clock-widget-menu-learn-more = 详细了解
newtab-clock-widget-menu-edit = 编辑时钟
newtab-clock-widget-menu-switch-to-12h = 切换为 12 小时制
newtab-clock-widget-menu-switch-to-24h = 切换为 24 小时制
newtab-clock-widget-label-your-clocks = 您的时钟
newtab-clock-widget-search-location-input =
    .label = 位置
    .placeholder = 搜索城市
    .aria-label = 搜索城市
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = 别名（选填）
    .placeholder = 添加别名
    .aria-label = 别名（选填）
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = 添加新时钟
    .aria-label = 添加新时钟
newtab-clock-widget-button-add-clock = 添加
newtab-clock-widget-button-cancel = 取消
newtab-clock-widget-button-back =
    .title = 返回
    .aria-label = 返回
newtab-clock-widget-button-edit-clock =
    .title = 编辑时钟
    .aria-label = 编辑时钟
newtab-clock-widget-button-save = 保存
newtab-clock-widget-button-remove-clock =
    .title = 移除时钟
    .aria-label = 移除时钟
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
    .aria-label = { $city }，别名：{ $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = 添加时钟
newtab-clock-widget-edit-clock-form =
    .aria-label = 编辑时钟
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = 搜索结果
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = 无匹配结果
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = 打开时钟菜单
    .aria-label = 打开时钟菜单
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = 别名：{ $nickname }

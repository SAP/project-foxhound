# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = 新規タブ
newtab-settings-button =
    .title = 新規タブページをカスタマイズ
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = このページをカスタマイズ
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = カスタマイズ
newtab-customize-panel-label =
    .label = カスタマイズ
newtab-personalize-settings-icon-label =
    .title = 新規タブをパーソナライズ
    .aria-label = 設定
newtab-settings-dialog-label =
    .aria-label = 設定
newtab-personalize-icon-label =
    .title = 新規タブをパーソナライズ
    .aria-label = 新規タブをパーソナライズ
newtab-personalize-dialog-label =
    .aria-label = パーソナライズ
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = 閉じる
    .aria-label = 閉じる

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = ホームページ
home-homepage-new-windows =
    .label = 新規ウインドウ
home-homepage-new-tabs =
    .label = 新規タブ
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = 特定のサイトを選択

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = ウェブサイトのアドレス
home-custom-homepage-address =
    .placeholder = アドレスを入力してください
home-custom-homepage-address-button =
    .label = アドレスを追加
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = ウェブサイトがまだ追加されていません。
home-custom-homepage-delete-address-button =
    .aria-label = アドレスを削除
    .title = アドレスを削除します
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = 置き換え:
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = 現在開いているページ
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = ブックマーク...

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = 検索
home-prefs-stories-header2 =
    .label = ストーリー
    .description = { -brand-product-name } ファミリーに選ばれた優良コンテンツ
home-prefs-widgets-header =
    .label = ウィジェット
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = ToDo リスト
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = タイマー
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = スポーツ
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = 時計
home-prefs-mission-message2 =
    .message = スポンサーは、より良いウェブを構築するという私たちの使命を支援しています。
home-prefs-manage-topics-link2 =
    .label = トピックを管理
home-prefs-choose-wallpaper-link2 =
    .label = 壁紙を選択
home-prefs-firefox-logo-header =
    .label = { -brand-short-name } ロゴ
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = これらの機能を使用するには、新規タブまたは新規ウインドウを { -firefox-home-brand-name } に設定してください。
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label = { $num } 行
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = 拡張機能 ({ $extension })
home-restore-defaults-srd =
    .label = デフォルトに戻す
    .accesskey = R
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (デフォルト)
home-mode-choice-custom-srd =
    .label = カスタム URL...
home-mode-choice-blank-srd =
    .label = 空白ページ
home-prefs-shortcuts-header-srd =
    .label = ショートカット
home-prefs-shortcuts-select =
    .aria-label = ショートカット
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = 広告ショートカット
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = 広告記事
home-prefs-highlights-option-visited-pages-srd =
    .label = 訪れたページ
home-prefs-highlights-options-bookmarks-srd =
    .label = ブックマーク
home-prefs-highlights-option-most-recent-download-srd =
    .label = 最近のダウンロード
home-prefs-recent-activity-header-srd =
    .label = 最近のアクティビティ
home-prefs-recent-activity-select =
    .aria-label = 最近のアクティビティ
home-prefs-weather-header-srd =
    .label = 天気予報
home-prefs-support-firefox-header-srd =
    .label = { -brand-product-name } を支援
home-prefs-mission-message-learn-more-link-srd = 支援の詳細情報

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = 検索
    .aria-label = 検索
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = { $engine } で検索、または URL を入力します
newtab-search-box-handoff-text-no-engine = 検索語句、または URL を入力します
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = { $engine } で検索、または URL を入力します
    .title = { $engine } で検索、または URL を入力します
    .aria-label = { $engine } で検索、または URL を入力
newtab-search-box-handoff-input-no-engine =
    .placeholder = 検索語句、または URL を入力します
    .title = 検索語句、または URL を入力します
    .aria-label = 検索語句、または URL を入力
newtab-search-box-text = ウェブを検索
newtab-search-box-input =
    .placeholder = ウェブを検索します
    .aria-label = ウェブを検索

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = 検索エンジンを追加
newtab-topsites-add-shortcut-header = 新規ショートカット
newtab-topsites-edit-topsites-header = トップサイトを編集
newtab-topsites-edit-shortcut-header = ショートカットを編集
newtab-topsites-add-shortcut-label = ショートカットを追加
newtab-topsites-add-shortcut-title =
    .title = ショートカットを追加します
    .aria-label = ショートカットを追加
newtab-topsites-title-label = タイトル
newtab-topsites-title-input =
    .placeholder = タイトルを入力
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = URL を入力するかペースト
newtab-topsites-url-validation = 正しい URL を入力してください
newtab-topsites-image-url-label = カスタム画像 URL
newtab-topsites-use-image-link = カスタム画像を使用...
newtab-topsites-image-validation = 画像を読み込めませんでした。別の URL を試してください。

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = テキストを消去

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = キャンセル
newtab-topsites-delete-history-button = 履歴から削除
newtab-topsites-save-button = 保存
newtab-topsites-preview-button = プレビュー
newtab-topsites-add-button = 追加

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = 本当にこのページに関して保存されているあらゆる情報を履歴から削除しますか？
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = この操作は取り消せません。

## Top Sites - Sponsored label

newtab-topsite-sponsored = 広告

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (ピン留め)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = メニューを開きます
    .aria-label = メニューを開く
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = 削除
    .aria-label = 削除
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = メニューを開きます
    .aria-label = { $title } のコンテキストメニューを開く
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = このサイトを編集します
    .aria-label = このサイトを編集

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = 編集
newtab-menu-open-new-window = 新規ウインドウで開く
newtab-menu-open-new-private-window = 新規プライベートウインドウで開く
newtab-menu-dismiss = 閉じる
newtab-menu-pin = ピン留め
newtab-menu-unpin = ピン留めを外す
newtab-menu-delete-history = 履歴から削除
newtab-menu-save-to-pocket = { -pocket-brand-name } に保存
newtab-menu-delete-pocket = { -pocket-brand-name } から削除
newtab-menu-archive-pocket = { -pocket-brand-name } にアーカイブ
newtab-menu-show-privacy-info = 私たちのスポンサーとあなたのプライバシー
newtab-menu-about-fakespot = { -fakespot-brand-name } について
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = 報告
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = ブロック
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = フォローを解除
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = 詳細情報
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = トピックのフォローを解除

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = 広告コンテンツを管理
newtab-menu-our-sponsors-and-your-privacy = 私たちのスポンサーとユーザーのプライバシー
newtab-menu-report-this-ad = この広告を報告

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = 完了
newtab-privacy-modal-button-manage = 広告コンテンツの設定を管理
newtab-privacy-modal-header = プライバシーは重要です。
newtab-privacy-modal-paragraph-2 =
    盛り上がる魅力あるストーリーに加えて、選ばれたスポンサーからあなたの興味を引きそうな厳選コンテンツを提供します。
    <strong>閲覧データに { -brand-product-name } の個人情報のコピーが残ることはありません。</strong>私たちとスポンサーのどちらもその情報を見ることはありませんので、ご安心ください。
newtab-privacy-modal-link = 新規タブページでのプライバシーの仕組みついて

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = ブックマークを削除
# Bookmark is a verb here.
newtab-menu-bookmark = ブックマーク

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = ダウンロード元の URL をコピー
newtab-menu-go-to-download-page = ダウンロード元のページを開く
newtab-menu-remove-download = 履歴から削除

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Finder に表示
       *[other] 保存フォルダーを開く
    }
newtab-menu-open-file = ファイルを開く

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = 訪問済み
newtab-label-bookmarked = ブックマーク済み
newtab-label-removed-bookmark = 削除済みブックマーク
newtab-label-recommended = 話題の記事
newtab-label-saved = { -pocket-brand-name } に保存しました
newtab-label-download = ダウンロード済み
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = 提供: { $sponsorOrSource }
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = 提供: { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } 分
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = 広告

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = セクションを削除
newtab-section-menu-collapse-section = セクションを折りたたむ
newtab-section-menu-expand-section = セクションを広げる
newtab-section-menu-manage-section = セクションを管理
newtab-section-menu-manage-webext = 拡張機能を管理
newtab-section-menu-add-topsite = トップサイトを追加
newtab-section-menu-add-search-engine = 検索エンジンを追加
newtab-section-menu-move-up = 上へ移動
newtab-section-menu-move-down = 下へ移動
newtab-section-menu-privacy-notice = プライバシー通知

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = セクションを折りたたむ
newtab-section-expand-section-label =
    .aria-label = セクションを広げる

## Section Headers.

newtab-section-header-topsites = トップサイト
newtab-section-header-recent-activity = 最近のアクティビティ
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = { $provider } のおすすめ
newtab-section-header-stories = 示唆に富むストーリー
# "picks" refers to recommended articles
newtab-section-header-todays-picks = 本日のおすすめ

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = ブラウジング中にあなたが最近訪れたりブックマークしたりした、優れた記事、動画、その他ページの一部をここに表示します。
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = すべて既読です。また後で { $provider } からのおすすめ記事をチェックしてください。待ちきれない場合は、人気のトピックを選択してウェブ上の他の優れた記事を見つけてください。
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = すべて既読です。また後でおすすめ記事をチェックしてください。待ちきれない場合は、人気のトピックを選択してウェブ上の他の優れた記事を見つけてください。

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = すべて既読です！
newtab-discovery-empty-section-topstories-content = また後で戻っておすすめ記事をチェックしてください。
newtab-discovery-empty-section-topstories-try-again-button = 再試行
newtab-discovery-empty-section-topstories-loading = 読み込み中...
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = おおっと、このセクションはほぼ読み込みましたが、完全ではありません。

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = 人気のトピック:
newtab-pocket-new-topics-title = 他の記事も読みたいですか？ { -pocket-brand-name } からの人気記事も見てみましょう
newtab-pocket-more-recommendations = 他のおすすめ
newtab-pocket-learn-more = 詳細
newtab-pocket-cta-button = { -pocket-brand-name } を入手
newtab-pocket-cta-text = お気に入りに記事を { -pocket-brand-name } に保存して、魅力的な読み物を思う存分楽しみましょう。
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } は { -brand-product-name } ファミリーの一員です
newtab-pocket-save = 保存
newtab-pocket-saved = 保存しました

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = お気に入り
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = 興味なし
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = ありがとうございます。あなたのフィードバックがフィードを改善する助けになります。
newtab-toast-dismiss-button =
    .title = 閉じる
    .aria-label = 閉じる

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = ウェブのベストコンテンツを見つけましょう
newtab-pocket-onboarding-cta = { -pocket-brand-name } は、さまざまな出版物の中から最も有益で、感動的な、信頼できるコンテンツをあなたの { -brand-product-name } ブラウザーにもたらします。

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = このコンテンツの読み込み中に何か問題が発生しました。
newtab-error-fallback-refresh-link = ページを再読み込みしてもう一度試してください。

## Customization Menu

newtab-custom-shortcuts-title = ショートカット
newtab-custom-shortcuts-subtitle = 保存または訪問したサイト
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = ショートカット
    .description = 保存または訪問したサイト
newtab-custom-shortcuts-nova =
    .label = ショートカット
newtab-custom-row-description =
    .description = 行数
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label = { $num } 行
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector = { $num } 行
newtab-custom-sponsored-sites = 広告ショートカット
newtab-custom-pocket-title = { -pocket-brand-name } のおすすめ
newtab-custom-pocket-subtitle = { -brand-product-name } ファミリーを構成する { -pocket-brand-name } が厳選した注目のコンテンツ
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = おすすめのストーリー
    .description = { -brand-product-name } ファミリーに選ばれた優良コンテンツです
newtab-recommended-stories-toggle =
    .label = おすすめのストーリー
newtab-custom-stories-personalized-toggle =
    .label = ストーリー
newtab-custom-stories-personalized-checkbox-label = ユーザーのアクティビティに基づいて選ばれたストーリー
newtab-custom-pocket-sponsored = 広告記事
newtab-custom-pocket-show-recent-saves = 最近保存したものを表示
newtab-custom-recent-title = 最近のアクティビティ
newtab-custom-recent-subtitle = 最近のサイトとコンテンツの抜粋
newtab-custom-weather-toggle =
    .label = 天気予報
    .description = 一目でわかる今日の天気
newtab-custom-widget-weather-toggle =
    .label = 天気予報
newtab-custom-widget-lists-toggle =
    .label = ToDo リスト
newtab-custom-widget-timer-toggle =
    .label = タイマー
newtab-custom-widget-sports-toggle =
    .label = ワールドカップ
newtab-custom-widget-clock-toggle =
    .label = 時計
newtab-custom-widget-sports-toggle2 =
    .label = スポーツ
newtab-custom-widget-section-title = ウィジェット
newtab-custom-widget-section-toggle =
    .label = ウィジェット
newtab-widget-manage-title = ウィジェット
newtab-widget-manage-widget-button =
    .label = ウィジェットを管理
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = 閉じる
    .aria-label = メニューを閉じる
newtab-custom-close-button = 閉じる
newtab-custom-settings = 他の設定を管理

## New Tab Wallpapers

newtab-wallpaper-title = 壁紙
newtab-wallpaper-reset = デフォルトにリセット
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = 画像をアップロード
newtab-wallpaper-add-an-image = 画像を追加
newtab-wallpaper-custom-color = カラーを選択
newtab-wallpaper-toggle-title =
    .label = 壁紙
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = 画像がファイルサイズの上限を超えています。{ $file_size } MB より小さなファイルをアップロードしてください。
newtab-wallpaper-error-upload-file-type = ファイルをアップロードできませんでした。画像ファイルで再度試してください。
newtab-wallpaper-error-file-type = ファイルをアップロードできませんでした。別のファイル形式で再度試してください。
newtab-wallpaper-light-red-panda = レッサーパンダ
newtab-wallpaper-light-mountain = 白い雪山
newtab-wallpaper-light-sky = 紫色の雲と空
newtab-wallpaper-light-color = 黄色、ピンク色、青色の模様
newtab-wallpaper-light-landscape = 空色の雲海と山の景色
newtab-wallpaper-light-beach = ヤシの木のある砂浜
newtab-wallpaper-dark-aurora = 北極のオーロラ
newtab-wallpaper-dark-color = 赤色と青色の模様
newtab-wallpaper-dark-panda = 森に隠れるレッサーパンダ
newtab-wallpaper-dark-sky = 夜空と街の景色
newtab-wallpaper-dark-mountain = 山の景色
newtab-wallpaper-dark-city = 紫色の街の景色
newtab-wallpaper-dark-fox-anniversary = 森林の道路に座るキツネ
newtab-wallpaper-light-fox-anniversary = 霧がかかった山を背景に草原にたたずむキツネ

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = 無地
newtab-wallpaper-colors = 無地
newtab-wallpaper-blue = 空色
newtab-wallpaper-light-blue = 白藍色
newtab-wallpaper-light-purple = 紅藤
newtab-wallpaper-light-green = 白緑
newtab-wallpaper-green = 若緑
newtab-wallpaper-beige = 肌色
newtab-wallpaper-yellow = 女郎花
newtab-wallpaper-orange = 柑子色
newtab-wallpaper-pink = 牡丹色
newtab-wallpaper-light-pink = 桜色
newtab-wallpaper-red = 茜色
newtab-wallpaper-dark-blue = 紺色
newtab-wallpaper-dark-purple = 小紫
newtab-wallpaper-dark-green = 深緑
newtab-wallpaper-brown = 栗色

## Abstract

newtab-wallpaper-category-title-abstract = 抽象的
newtab-wallpaper-abstract-green = 緑色の形状
newtab-wallpaper-abstract-blue = 青色の形状
newtab-wallpaper-abstract-purple = 紫色の形状
newtab-wallpaper-abstract-orange = オレンジ色の形状
newtab-wallpaper-gradient-orange = オレンジとピンクのグラデーション
newtab-wallpaper-abstract-blue-purple = 青色と紫色の形状
newtab-wallpaper-abstract-white-curves = 影のついた白色の曲線
newtab-wallpaper-abstract-purple-green = 紫色と緑色の明るいグラデーション
newtab-wallpaper-abstract-blue-purple-waves = 青色と紫色の波形の形状
newtab-wallpaper-abstract-black-waves = 黒色の波形の形状

## Firefox

newtab-wallpaper-category-title-photographs = 写真
newtab-wallpaper-beach-at-sunrise = 早朝の砂浜
newtab-wallpaper-beach-at-sunset = 夕暮れの砂浜
newtab-wallpaper-storm-sky = 嵐の空
newtab-wallpaper-sky-with-pink-clouds = ピンク色に染まる雲
newtab-wallpaper-red-panda-yawns-in-a-tree = あくびをするレッサーパンダ
newtab-wallpaper-white-mountains = 白い雪山
newtab-wallpaper-hot-air-balloons = 昼空に浮かぶさまざまな色の熱気球
newtab-wallpaper-starry-canyon = 青い星夜
newtab-wallpaper-suspension-bridge = 昼の灰色の吊橋
newtab-wallpaper-sand-dunes = 白砂の砂丘
newtab-wallpaper-palm-trees = 朝焼けに照らされたココヤシの木々のシルエット
newtab-wallpaper-blue-flowers = 咲き誇る青い花のクローズアップ写真
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = 写真提供: <a data-l10n-name="name-link">{ $author_string }</a> (<a data-l10n-name="webpage-link">{ $webpage_string }</a>)
newtab-wallpaper-feature-highlight-header = カラフルな壁紙を試しましょう
newtab-wallpaper-feature-highlight-content = 壁紙で新規タブをカラフルに彩りましょう。
newtab-wallpaper-feature-highlight-button = 了解
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = 閉じる
    .aria-label = ポップアップを閉じる
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = 宇宙
newtab-wallpaper-celestial-lunar-eclipse = 月食
newtab-wallpaper-celestial-earth-night = 地球低軌道からの夜景
newtab-wallpaper-celestial-starry-sky = 星空
newtab-wallpaper-celestial-eclipse-time-lapse = 月食のタイムラプス
newtab-wallpaper-celestial-black-hole = ブラックホール銀河のイラスト
newtab-wallpaper-celestial-river = 河川の衛星画像

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = { $provider } による天気予報を表示します
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = 提供: { $provider }
newtab-weather-menu-change-location = 予報地点を変更
newtab-weather-change-location-search-input-placeholder =
    .placeholder = 場所を検索します
    .aria-label = 場所を検索
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = 現在地を使用する
newtab-weather-menu-weather-display = 天気表示
newtab-weather-todays-forecast = 今日の天気予報
newtab-weather-see-full-forecast = 天気予報の詳細を表示
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = シンプル
newtab-weather-menu-change-weather-display-simple = シンプル表示に切り替える
newtab-weather-menu-weather-display-option-detailed = 詳細
newtab-weather-menu-change-weather-display-detailed = 詳細表示に切り替える
newtab-weather-menu-temperature-units = 温度の単位
newtab-weather-menu-temperature-option-fahrenheit = 華氏 (℉)
newtab-weather-menu-temperature-option-celsius = 摂氏 (℃)
newtab-weather-menu-change-temperature-units-fahrenheit = ファーレンハイト度に切り替える
newtab-weather-menu-change-temperature-units-celsius = セルシウス度に切り替える
newtab-weather-menu-hide-weather = 新規タブの天気表示を隠す
newtab-weather-menu-learn-more = 詳細情報
newtab-weather-menu-detect-my-location = 現在地を検出
# This message is shown if user is working offline
newtab-weather-error-not-available = 現在、天気データが利用できません。
newtab-weather-opt-in-see-weather = 現在地の天気を表示しますか？
newtab-weather-opt-in-not-now =
    .label = 後で
newtab-weather-opt-in-yes =
    .label = はい
newtab-weather-opt-in-headline = ローカルの天気予報を利用
newtab-weather-opt-in-use-location =
    .label = 位置情報を利用する
newtab-weather-opt-in-choose-location = 場所を選択してください
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = ニューヨーク
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = 最高気温
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = 最低気温
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = { $provider } による天気予報を表示します
    .aria-description = 提供: { $provider }

## Topic Labels

newtab-topic-label-business = 仕事
newtab-topic-label-career = 経歴
newtab-topic-label-education = 教育
newtab-topic-label-arts = 娯楽
newtab-topic-label-food = 食品
newtab-topic-label-health = 健康
newtab-topic-label-hobbies = ゲーム
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = 金融
newtab-topic-label-society-parenting = 育児
newtab-topic-label-government = 政治
newtab-topic-label-education-science = 科学
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = ライフハック
newtab-topic-label-sports = スポーツ
newtab-topic-label-tech = 技術
newtab-topic-label-travel = 旅行
newtab-topic-label-home = 家庭

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = あなたのフィードに最適なトピックを選択
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = 複数のトピックを選んでください。専門のキュレーターがあなたの関心事に合わせてストーリーに優先順位を付けます。いつでも更新できます。
newtab-topic-selection-save-button = 保存
newtab-topic-selection-cancel-button = キャンセル
newtab-topic-selection-button-maybe-later = 後で選ぶ
newtab-topic-selection-privacy-link = ユーザーデータの保護と管理について
newtab-topic-selection-button-update-interests = 関心事を更新
newtab-topic-selection-button-pick-interests = 関心事を選ぶ

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = フォローする
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = { $topic } をフォロー
newtab-section-following-button = フォロー中
newtab-section-unfollow-button = フォロー解除
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = フォロー中: { $topic } のフォローを解除
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = フィードを微調整
newtab-section-follow-highlight-subtitle = 興味のあることをフォローして、お好みのコンテンツを多く表示します

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = ブロックする
newtab-section-blocked-button = ブロック中
newtab-section-unblock-button = ブロック解除
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = { $topic } をフォロー
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = { $topic } のフォローを解除
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = { $topic } をブロック
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = { $topic } のブロックを解除

## Confirmation modal for blocking a section

newtab-section-cancel-button = 後で
newtab-section-confirm-block-topic-p1 = 本当にこのトピックをブロックしますか？
newtab-section-confirm-block-topic-p2 = ブロックしたトピックはフィードに表示されません。
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = { $topic } をブロック
newtab-section-block-cancel-button = キャンセル

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = トピック
newtab-section-manage-topics-button-v2 =
    .label = トピックを管理
newtab-section-mangage-topics-followed-topics = フォロー中
newtab-section-mangage-topics-followed-topics-empty-state = フォローしているトピックはありません。
newtab-section-mangage-topics-blocked-topics = ブロック中
newtab-section-mangage-topics-blocked-topics-empty-state = ブロックしているトピックはありません。
newtab-custom-wallpaper-title = カスタム壁紙が利用できます
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = 壁紙をアップロードするかお好みのカラーを選んで、あなただけの { -brand-product-name } にカスタマイズしましょう。
newtab-custom-wallpaper-cta = 壁紙を試す

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = 壁紙を選んであなただけの { -brand-product-name } に彩りましょう
newtab-new-user-custom-wallpaper-subtitle = お好みの壁紙とカラーですべての新規タブを自宅のようにカスタマイズできます。
newtab-new-user-custom-wallpaper-cta = 今すぐ試す

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = 新しい壁紙が追加されました
newtab-wallpaper-feature-highlight-subtitle = お気に入りの壁紙ですべての新規タブをマイホームのようにしましょう。
newtab-wallpaper-feature-highlight-cta = 壁紙を選ぶ

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = モバイル版 { -brand-product-name } をダウンロード
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = QR コードをスキャンして安全にダウンロード。
newtab-download-mobile-highlight-body-variant-b = タブやパスワード、他のデータを同期しておけば、中断したところからピックアップできます。
newtab-download-mobile-highlight-body-variant-c = 同じ { -brand-product-name } ブラウザーをポケットに入れてを持ち出せることをご存じですか？
newtab-download-mobile-highlight-image =
    .aria-label = モバイル版 { -brand-product-name } をダウンロードするための QR コード

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = 指先一つでお気に入りに追加
newtab-shortcuts-highlight-subtitle = ショートカットを追加してお気に入りのサイトに 1 クリックでアクセスできます。

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = この広告を報告した理由を教えてください。
newtab-report-ads-reason-not-interested =
    .label = 興味がない
newtab-report-ads-reason-inappropriate =
    .label = 不適切
newtab-report-ads-reason-seen-it-too-many-times =
    .label = 表示回数が多すぎる
newtab-report-content-wrong-category =
    .label = カテゴリーが誤っている
newtab-report-content-outdated =
    .label = 古くなっている
newtab-report-content-inappropriate-offensive =
    .label = 不適切または攻撃的
newtab-report-content-spam-misleading =
    .label = スパムまたはミスリード
newtab-report-content-requires-payment-subscription =
    .label = 支払いまたは購読が必要
newtab-report-content-requires-payment-subscription-learn-more = 詳細情報
newtab-report-cancel = キャンセル
newtab-report-submit = 送信
newtab-toast-thanks-for-reporting =
    .message = ご報告ありがとうございます。
newtab-toast-widgets-hidden =
    .message = 鉛筆アイコンを選択して、いつでもウィジェットを追加できます。
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = { $topic } トピックをフォローしました。
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = { $topic } トピックのフォローを解除しました。
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = { $topic } トピックについてのストーリーは今後表示されません。

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = 可能性は限りなく。リストを作りましょう。
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = 新機能
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = 完了 ({ $number })
newtab-widget-lists-celebration-headline = よくできました
newtab-widget-lists-celebration-subhead = すべて消去
newtab-widget-task-list-menu-copy = コピー
newtab-widget-lists-menu-edit = リスト名を編集
newtab-widget-lists-menu-edit2 =
    .aria-label = リスト名を編集
newtab-widget-lists-menu-create = 新規リストを作成
newtab-widget-lists-menu-delete = このリストを削除
newtab-widget-lists-menu-copy = リストをクリップボードにコピー
newtab-widget-lists-menu-learn-more = 詳細情報
newtab-widget-lists-button-add-item = アイテムを追加
newtab-widget-lists-input-add-an-item2 =
    .placeholder = アイテムを追加します
    .aria-label = アイテムを追加
newtab-widget-lists-input-error = 追加するアイテムにテキストを含めてください
newtab-widget-lists-input-menu-open-link = リンクを開く
newtab-widget-lists-input-menu-move-up = 上へ移動
newtab-widget-lists-input-menu-move-down = 下へ移動
newtab-widget-lists-input-menu-delete = 削除
newtab-widget-lists-input-menu-edit = 編集
newtab-widget-lists-input-menu-edit2 =
    .aria-label = アイテムを編集
newtab-widget-lists-edit-clear =
    .aria-label = キャンセル
    .title = キャンセル
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + 新規リストを作成
newtab-widget-lists-name-label-default =
    .label = ToDo リスト
newtab-widget-lists-name-label-checklist =
    .label = チェックリスト
newtab-widget-lists-name-placeholder-default =
    .placeholder = ToDo リスト
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = チェックリスト
    .aria-label = リスト名を編集
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = 新規リスト
    .aria-label = リスト名を編集
newtab-widget-section-title = ウィジェット
newtab-widget-menu-hide = ウィジェットを隠す
newtab-widget-menu-change-size = サイズを変更
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = 移動
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = 左側
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = 右側
newtab-widget-size-small = 小
newtab-widget-size-medium = 中
newtab-widget-size-large = 大
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = ウィジェットを隠します
    .aria-label = すべてのウィジェットを隠す
newtab-widget-section-maximize =
    .title = ウィジェットを展開します
    .aria-label = すべてのウィジェットを最大サイズに展開する
newtab-widget-section-minimize =
    .title = ウィジェットを最小化します
    .aria-label = すべてのウィジェットをコンパクトサイズに折りたたむ
newtab-widget-section-menu-button =
    .title = ウィジェットメニューを開きます
    .aria-label = ウィジェットメニューを開く
newtab-widget-add-widgets-button =
    .title = ウィジェットを追加します
    .aria-label = ウィジェットを追加
newtab-widget-section-menu-manage = ウィジェットを管理
newtab-widget-section-menu-hide-all = ウィジェットを隠す
newtab-widget-section-menu-learn-more = 詳細情報
newtab-widget-section-feedback = ご感想をお寄せください
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = ウィジェットの表示を増やす
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = ウィジェットの表示を減らす
newtab-widget-lists-name-default = チェックリスト

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = タイマー
newtab-widget-timer-notification-focus = 時間内に良い仕事をしましょう。休憩はいかが？
newtab-widget-timer-notification-break = 休憩時間が終わりました。準備はよいですか？
newtab-widget-timer-notification-warning = 通知がオフになっています
newtab-widget-timer-mode-focus =
    .label = 集中
newtab-widget-timer-mode-break =
    .label = 休憩
newtab-widget-timer-label-play =
    .label = 開始
newtab-widget-timer-label-pause =
    .label = 一時停止
newtab-widget-timer-reset =
    .title = リセット
newtab-widget-timer-menu-notifications = 通知をオフにする
newtab-widget-timer-menu-notifications-on = 通知をオンにする
newtab-widget-timer-menu-learn-more = 詳細情報
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = トップニュース
newtab-daily-briefing-card-menu-dismiss = 閉じる
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = { $minutes } 分前に更新
newtab-widget-message-title = リストへの集中と組み込みタイマー
# to-dos stands for "things to do".
newtab-widget-message-copy = クイック通知から毎日の ToDo リストまで、時間内によく集中して休憩を取れるように、あなたの作業を支援します。
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = 注目、天気、その他のワンスポット
newtab-widget-message-focus-forecasts-body = { -brand-product-name } ウィジェットを日常に活かしましょう。その日の天気や作業リスト、世界の時刻を確認できます。
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = { -brand-product-name } を自分だけのブラウザーにしましょう
newtab-promo-card-body-addons = コレクションから壁紙を選ぶか、自分だけの壁紙を設定してください。
newtab-promo-card-cta-addons = 今すぐ試す
newtab-promo-card-title = { -brand-product-name } を支援
newtab-promo-card-body = 私たちのスポンサーはより良いウェブを作り上げるという私たちの使命を支援します
newtab-promo-card-cta = 詳細情報
newtab-promo-card-dismiss-button =
    .title = 閉じる
    .aria-label = 閉じる

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
           *[other] { $minutes } 分タイマーを開始
        }
newtab-widget-timer-pause-aria =
    .aria-label = タイマーを一時停止
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label = { $minutes } 分
newtab-widget-timer-decrease-min =
    .title = 1 分減らします
newtab-widget-timer-increase-min =
    .title = 1 分増やします
newtab-widget-timer-mode-group =
    .aria-label = タイマーモード
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = 集中
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = 休憩
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = タイマーを隠す
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = よくできました
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = 休憩時間終了
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = 休憩しますか？
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = 再開しますか？

##

newtab-sports-widget-menu-follow-teams = チームをフォロー
newtab-sports-widget-menu-view-schedule = スケジュールを見る
newtab-sports-widget-menu-view-upcoming = 最新情報を見る
newtab-sports-widget-menu-view-results = 結果を見る
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = 重要な日
newtab-sports-widget-menu-learn-more = 詳細情報
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = ワールドカップのタブを保持
newtab-sports-widget-get-updates = 試合の最新情報などをリアルタイムでお届けします。
newtab-sports-widget-view-schedule =
    .label = スケジュールを見る
newtab-sports-widget-follow-teams =
    .label = チームをフォロー
newtab-sports-widget-view-matches =
    .label = 対戦相手を見る
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
       *[other] { $number } チームまでフォローできます
    }
newtab-sports-widget-choose-wallpaper =
    .label = 壁紙を選ぶ
newtab-sports-widget-skip = スキップ
newtab-sports-widget-search-country =
    .placeholder = 参加国を検索
    .aria-label = 参加国を検索
newtab-sports-widget-cancel = キャンセル
newtab-sports-widget-back-button =
    .aria-label = 戻る
newtab-sports-widget-done-button =
    .label = 完了
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (敗退)
newtab-sports-widget-view-all =
    .label = すべて表示
newtab-sports-widget-show-less =
    .label = 表示を減らす
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = フォローしたチームのみ
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = 観戦
    .title = ライブ観戦
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = ライブ観戦
    .title = ライブ観戦
newtab-sports-widget-watch-dialog-close =
    .aria-label = 閉じる
    .title = 閉じる
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = 無料
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = 無料トライアル
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = 無料および有料
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = 有料
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = 選択した試合のみ
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = ユーザーの地域で観戦可能
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = 他の地域
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = ストリームを開く
    .title = 動画ストリームを開きます
newtab-sports-widget-group-stage = グループステージ
newtab-sports-widget-group-a = グループ A
newtab-sports-widget-group-b = グループ B
newtab-sports-widget-group-c = グループ C
newtab-sports-widget-group-d = グループ D
newtab-sports-widget-group-e = グループ E
newtab-sports-widget-group-f = グループ F
newtab-sports-widget-group-g = グループ G
newtab-sports-widget-group-h = グループ H
newtab-sports-widget-group-i = グループ I
newtab-sports-widget-group-j = グループ J
newtab-sports-widget-group-k = グループ K
newtab-sports-widget-group-l = グループ L
newtab-sports-widget-round-32 = ラウンド 32
newtab-sports-widget-round-16 = ラウンド 16
newtab-sports-widget-quarter-finals = 準々決勝
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = ライブ
newtab-custom-widget-live-refresh =
    .title = スコアを更新します
    .aria-label = スコアを更新
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = 重要な日
newtab-sports-widget-upcoming = 最新情報
# Used for a match currently ongoing
newtab-sports-widget-now = 試合中
newtab-sports-widget-results = 結果
newtab-sports-widget-semi-finals = 準決勝
newtab-sports-widget-bronze-finals = 3 位決定戦
# Final is the final match for 1st place.
newtab-sports-widget-final = 決勝
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = 遅延
newtab-sports-widget-postponed = 延期
newtab-sports-widget-suspended = 一時中断
newtab-sports-widget-cancelled = 中止
newtab-sports-widget-information = 試合についての情報
newtab-sports-widget-no-live-data = 現在、ライブの試合データが更新されていません
newtab-sports-widget-view-results-link = 結果を見る
newtab-sports-widget-third-place = 3 位
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = 準優勝
newtab-sports-widget-champions = 優勝
newtab-sports-widget-world-cup-champions = 2026 ワールドカップ優勝者
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = フルタイム
newtab-sports-widget-match-halftime = ハーフタイム
newtab-sports-widget-match-extra-time = 延長
newtab-sports-widget-match-penalties = ペナルティー

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = 前へ
    .title = 前のページへ
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = 次へ
    .title = 次のページへ
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = ライブ試合 { $index } / { $total }
    .title = ライブ試合 { $index } / { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } 対 { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) 対 { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = ライブ: { $homeTeam }, { $homeScore } 対 { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } vs. { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } vs. { $awayTeam }, 遅延
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } vs. { $awayTeam }, 延期
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } vs. { $awayTeam }, 中断
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } vs. { $awayTeam }, 中止

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = ボスニア・ヘルツェゴヴィナ
newtab-sports-widget-team-name-label-civ =
    .label = アイボリーコースト
newtab-sports-widget-team-name-label-cod =
    .label = DR コンゴ
newtab-sports-widget-team-name-label-eng =
    .label = イングランド
newtab-sports-widget-team-name-label-sco =
    .label = スコットランド

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = 新しい壁紙でワールドカップをキックオフ
newtab-sports-widget-message-wallpapers-body = トーナメント試合の日に備えてブラウザーにエネルギー注入
newtab-sports-widget-message-wallpapers-cta = 壁紙を選ぶ
newtab-sports-widget-message-add-widgets-cta =
    .label = ウィジェットを追加
newtab-sports-widget-message-day-in-play-title = { -brand-product-name } ウィジェットで試合の日に備えましょう
newtab-sports-widget-message-day-in-play-body = ワールドカップをフォロー、作業に集中、世界中の時刻を確認できます
newtab-sports-widget-message-explore-widgets-cta =
    .label = ウィジェットを探す

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = 閉じる
    .aria-label = 閉じる
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = あなただけのスペースにカスタマイズ
newtab-activation-window-message-customization-focus-message = 新しい壁紙を選び、お気に入りのサイトのショートカットを追加し、興味のある最新のストーリーを追いかけましょう。
newtab-activation-window-message-customization-focus-primary-button =
    .label = カスタマイズを開始
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = ここはあなただけのスペースです
newtab-activation-window-message-values-focus-message = { -brand-product-name } でブラウジングすると、お好みの方法でオンラインの一日を始められます。あなただけの { -brand-product-name } にしましょう。

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = 時計を隠す
newtab-clock-widget-menu-learn-more = 詳細情報
newtab-clock-widget-menu-edit = 時計を編集
newtab-clock-widget-menu-switch-to-12h = 12 時間形式に切り替え
newtab-clock-widget-menu-switch-to-24h = 24 時間形式に切り替え
newtab-clock-widget-label-your-clocks = あなたの時計
newtab-clock-widget-search-location-input =
    .label = 場所
    .placeholder = 都市を検索します
    .aria-label = 都市を検索します
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = ラベル (任意)
    .placeholder = ラベルを追加
    .aria-label = ラベル (任意)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = 新規時計を追加します
    .aria-label = 新規時計を追加
newtab-clock-widget-button-add-clock = 追加
newtab-clock-widget-button-cancel = キャンセル
newtab-clock-widget-button-back =
    .title = 戻る
    .aria-label = 戻る
newtab-clock-widget-button-edit-clock =
    .title = 時計を編集します
    .aria-label = 時計を編集
newtab-clock-widget-button-save = 保存
newtab-clock-widget-button-remove-clock =
    .title = 時計を削除します
    .aria-label = 時計を削除
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
    .aria-label = { $city }、ラベル: { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = 時計を追加
newtab-clock-widget-edit-clock-form =
    .aria-label = 時計を編集
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = 検索結果
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = 検索に一致するものがありません
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = 時計のメニューを開きます
    .aria-label = 時計のメニューを開く
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = ラベル: { $nickname }

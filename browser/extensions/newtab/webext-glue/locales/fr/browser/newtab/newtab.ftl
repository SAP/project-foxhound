# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nouvel onglet
newtab-settings-button =
    .title = Personnaliser la page Nouvel onglet
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button =
    .title = Personnaliser cette page
#  (developer note): @nova-cleanup(remove-string): Remove newtab-customize-panel-icon-button-label once Nova lands, will be using newtab-customize-panel-label instead
newtab-customize-panel-icon-button-label = Personnaliser
newtab-customize-panel-label =
    .label = Personnaliser
newtab-personalize-settings-icon-label =
    .title = Personnaliser la page Nouvel onglet
    .aria-label = Paramètres
newtab-settings-dialog-label =
    .aria-label = Paramètres
newtab-personalize-icon-label =
    .title = Personnaliser la page de nouvel onglet
    .aria-label = Personnaliser la page de nouvel onglet
newtab-personalize-dialog-label =
    .aria-label = Personnaliser
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Ignorer
    .aria-label = Ignorer

## Strings for "Homepage" and "Firefox Home" sections of about:settings#home.
## Homepage panel

home-homepage-title =
    .label = Page d’accueil
home-homepage-new-windows =
    .label = Nouvelles fenêtres
home-homepage-new-tabs =
    .label = Nouveaux onglets
# This option leads to the "Custom Homepage" subpage
home-homepage-custom-homepage-button =
    .label = Choisir un site en particulier

## Custom URLs subpage

# Subheader on the Custom Homepage subpage. Followed by a form to enter URLs and a list of URLs already saved, if any.
home-custom-homepage-card-header =
    .label = Adresse(s) de site web
home-custom-homepage-address =
    .placeholder = Saisissez une adresse
home-custom-homepage-address-button =
    .label = Ajouter une adresse
# Shown when no custom websites/URLs to use as a homepage have been added yet
home-custom-homepage-no-results =
    .label = Aucun site web ajouté pour l’instant.
home-custom-homepage-delete-address-button =
    .aria-label = Supprimer l’adresse
    .title = Supprimer l’adresse
# Further options to use when setting the home page. Two action buttons are placed in line with this prompt
# to replace the current home page with a currently open page or bookmark.
home-custom-homepage-replace-with-prompt =
    .label = Remplacer par
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-current-pages-button =
    .label = Pages ouvertes actuellement
# Button that appears in-line after text "Replace with" (home-custom-homepage-replace-with-prompt)
home-custom-homepage-bookmarks-button =
    .label = Marque-pages…

## Firefox Home content

home-prefs-content-header =
    .label = { -firefox-home-brand-name }
home-prefs-search-header2 =
    .label = Recherche
home-prefs-stories-header2 =
    .label = Articles
    .description = Contenu exceptionnel sélectionné par les membres de la gamme de produits { -brand-product-name }
home-prefs-widgets-header =
    .label = Widgets
# Lists is a widget on New Tab, similar to a to-do widget
home-prefs-lists-header =
    .label = Listes
# Timer is a widget on New Tab, similar to the Pomodoro timer.
home-prefs-timer-header =
    .label = Minuteur
# Sports is a widget on New Tab showing sports scores and schedules.
home-prefs-sports-widget-header =
    .label = Sport
# Clock is a widget on New Tab that displays time zones around the world.
home-prefs-clocks-header =
    .label = Horloge
home-prefs-mission-message2 =
    .message = Nos sponsors soutiennent notre mission de créer un meilleur Web.
home-prefs-manage-topics-link2 =
    .label = Gérer les sujets
home-prefs-choose-wallpaper-link2 =
    .label = Choisir un fond d’écran
home-prefs-firefox-logo-header =
    .label = Logo de { -brand-short-name }
# Informational message bar that appears in the Firefox Home section when the options are disabled.
# The user must select Firefox Home as their homepage for either new tabs or new windows to enable
# the features in settings.
home-prefs-firefox-home-disabled-notice =
    .message = Pour utiliser ces fonctionnalités, choisissez la { -firefox-home-brand-name } pour les nouveaux onglets ou les nouvelles fenêtres.
# Variables:
#   $num (number) - Number of rows displayed
home-prefs-sections-rows-option-srd =
    .label =
        { $num ->
            [one] { $num } ligne
           *[other] { $num } lignes
        }
# Dropdown option shown when an extension replaces the contents of new windows or tabs.
# Variables:
#   $extension (string) - Name of the extension
home-prefs-homepage-extension-option =
    .label = Extension ({ $extension })
home-restore-defaults-srd =
    .label = Configuration par défaut
    .accesskey = C
home-mode-choice-default-fx-srd =
    .label = { -firefox-home-brand-name } (par défaut)
home-mode-choice-custom-srd =
    .label = Adresses web personnalisées…
home-mode-choice-blank-srd =
    .label = Page vide
home-prefs-shortcuts-header-srd =
    .label = Raccourcis
home-prefs-shortcuts-select =
    .aria-label = Raccourcis
home-prefs-shortcuts-by-option-sponsored-srd =
    .label = Raccourcis sponsorisés
home-prefs-recommended-by-option-sponsored-stories-srd =
    .label = Articles sponsorisés
home-prefs-highlights-option-visited-pages-srd =
    .label = Pages visitées
home-prefs-highlights-options-bookmarks-srd =
    .label = Marque-pages
home-prefs-highlights-option-most-recent-download-srd =
    .label = Dernier téléchargement
home-prefs-recent-activity-header-srd =
    .label = Activité récente
home-prefs-recent-activity-select =
    .aria-label = Activité récente
home-prefs-weather-header-srd =
    .label = Météo
home-prefs-support-firefox-header-srd =
    .label = Soutenir { -brand-product-name }
home-prefs-mission-message-learn-more-link-srd = Découvrir comment

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Rechercher
    .aria-label = Rechercher
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Rechercher avec { $engine } ou saisir une adresse
newtab-search-box-handoff-text-no-engine = Rechercher ou saisir une adresse
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Rechercher avec { $engine } ou saisir une adresse
    .title = Rechercher avec { $engine } ou saisir une adresse
    .aria-label = Rechercher avec { $engine } ou saisir une adresse
newtab-search-box-handoff-input-no-engine =
    .placeholder = Rechercher ou saisir une adresse
    .title = Rechercher ou saisir une adresse
    .aria-label = Rechercher ou saisir une adresse
newtab-search-box-text = Rechercher sur le Web
newtab-search-box-input =
    .placeholder = Rechercher sur le Web
    .aria-label = Rechercher sur le Web

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-add-search-engine-header = Ajouter un moteur de recherche
newtab-topsites-add-shortcut-header = Nouveau raccourci
newtab-topsites-edit-topsites-header = Modifier le site populaire
newtab-topsites-edit-shortcut-header = Modifier le raccourci
newtab-topsites-add-shortcut-label = Ajouter un raccourci
newtab-topsites-add-shortcut-title =
    .title = Ajouter un raccourci
    .aria-label = Ajouter un raccourci
newtab-topsites-title-label = Titre
newtab-topsites-title-input =
    .placeholder = Saisir un titre
newtab-topsites-url-label = Adresse web
newtab-topsites-url-input =
    .placeholder = Saisir ou coller une adresse web
newtab-topsites-url-validation = Adresse web valide requise
newtab-topsites-image-url-label = URL de l’image personnalisée
newtab-topsites-use-image-link = Utiliser une image personnalisée…
newtab-topsites-image-validation = Échec du chargement de l’image. Essayez avec une autre URL.

## Clear text button for the URL and image URL input fields in the Top Sites form.

newtab-topsites-clear-input =
    .aria-label = Effacer le texte

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Annuler
newtab-topsites-delete-history-button = Supprimer de l’historique
newtab-topsites-save-button = Enregistrer
newtab-topsites-preview-button = Aperçu
newtab-topsites-add-button = Ajouter

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Voulez-vous vraiment supprimer de l’historique toutes les occurrences de cette page ?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Cette action est irréversible.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Sponsorisé

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (épinglé)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Ouvrir le menu
    .aria-label = Ouvrir le menu
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Supprimer
    .aria-label = Supprimer
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Ouvrir le menu
    .aria-label = Ouvrir le menu contextuel pour { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Modifier ce site
    .aria-label = Modifier ce site

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Modifier
newtab-menu-open-new-window = Ouvrir dans une nouvelle fenêtre
newtab-menu-open-new-private-window = Ouvrir dans une nouvelle fenêtre privée
newtab-menu-dismiss = Retirer
newtab-menu-pin = Épingler
newtab-menu-unpin = Désépingler
newtab-menu-delete-history = Supprimer de l’historique
newtab-menu-save-to-pocket = Enregistrer dans { -pocket-brand-name }
newtab-menu-delete-pocket = Supprimer de { -pocket-brand-name }
newtab-menu-archive-pocket = Archiver dans { -pocket-brand-name }
newtab-menu-show-privacy-info = Nos sponsors et votre vie privée
newtab-menu-about-fakespot = À propos de { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Signaler
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Bloquer
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow-topic = Ne plus suivre
# Context menu option to open a support page explaining the New Tab personalization features and privacy controls.
newtab-menu-section-learn-more = En savoir plus
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Ne plus suivre ce sujet

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gérer le contenu sponsorisé
newtab-menu-our-sponsors-and-your-privacy = Nos sponsors et votre vie privée
newtab-menu-report-this-ad = Signaler cette annonce

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Terminé
newtab-privacy-modal-button-manage = Gérer les paramètres de contenu sponsorisé
newtab-privacy-modal-header = Votre vie privée compte pour nous.
newtab-privacy-modal-paragraph-2 = En plus de partager des histoires captivantes, nous vous montrons également des contenus pertinents et soigneusement sélectionnés de sponsors triés sur le volet. Rassurez-vous, <strong>vos données de navigation ne quittent jamais votre copie personnelle de { -brand-product-name }</strong> — nous ne les voyons pas, et nos sponsors non plus.
newtab-privacy-modal-link = En savoir plus sur le respect de la vie privée dans le nouvel onglet

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Supprimer le marque-page
# Bookmark is a verb here.
newtab-menu-bookmark = Marquer cette page

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copier l’adresse d’origine du téléchargement
newtab-menu-go-to-download-page = Aller à la page de téléchargement
newtab-menu-remove-download = Retirer de l’historique

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Afficher dans le Finder
       *[other] Ouvrir le dossier contenant le fichier
    }
newtab-menu-open-file = Ouvrir le fichier

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Visité
newtab-label-bookmarked = Ajouté aux marque-pages
newtab-label-removed-bookmark = Marque-page supprimé
newtab-label-recommended = Tendance
newtab-label-saved = Enregistré dans { -pocket-brand-name }
newtab-label-download = Téléchargé
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Sponsorisé
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Sponsorisé par { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Sponsorisé

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Supprimer la section
newtab-section-menu-collapse-section = Réduire la section
newtab-section-menu-expand-section = Développer la section
newtab-section-menu-manage-section = Gérer la section
newtab-section-menu-manage-webext = Gérer l’extension
newtab-section-menu-add-topsite = Ajouter un site populaire
newtab-section-menu-add-search-engine = Ajouter un moteur de recherche
newtab-section-menu-move-up = Déplacer vers le haut
newtab-section-menu-move-down = Déplacer vers le bas
newtab-section-menu-privacy-notice = Politique de confidentialité

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Réduire la section
newtab-section-expand-section-label =
    .aria-label = Développer la section

## Section Headers.

newtab-section-header-topsites = Sites les plus visités
newtab-section-header-recent-activity = Activité récente
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Recommandations par { $provider }
newtab-section-header-stories = Des articles qui font réfléchir
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Notre sélection du jour

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Commencez à naviguer puis nous afficherons des articles, des vidéos ou d’autres pages que vous avez récemment visités ou ajoutés aux marque-pages.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Il n’y en a pas d’autres. Revenez plus tard pour plus d’articles de { $provider }. Vous ne voulez pas attendre ? Choisissez un sujet parmi les plus populaires pour découvrir d’autres articles intéressants sur le Web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Il n’y en a pas d’autres. Revenez plus tard pour plus d’articles. Vous ne voulez pas attendre ? Choisissez un sujet parmi les plus populaires pour découvrir d’autres articles intéressants sur le Web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Il n’y a rien d’autre.
newtab-discovery-empty-section-topstories-content = Revenez plus tard pour découvrir d’autres articles.
newtab-discovery-empty-section-topstories-try-again-button = Réessayer
newtab-discovery-empty-section-topstories-loading = Chargement…
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Oups, il semblerait que la section ne se soit pas chargée complètement.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Sujets populaires :
newtab-pocket-new-topics-title = Vous voulez encore plus d’articles ? Parcourez ces sujets populaires de { -pocket-brand-name }
newtab-pocket-more-recommendations = Plus de recommandations
newtab-pocket-learn-more = En savoir plus
newtab-pocket-cta-button = Installer { -pocket-brand-name }
newtab-pocket-cta-text = Enregistrez les articles que vous aimez dans { -pocket-brand-name }, et stimulez votre imagination avec des lectures fascinantes.
newtab-pocket-pocket-firefox-family = { -pocket-brand-name } fait partie de la famille { -brand-product-name }
newtab-pocket-save = Enregistrer
newtab-pocket-saved = Enregistrée

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Plus comme celui-ci
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Pas pour moi
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Merci. Votre retour nous aide à améliorer votre flux.
newtab-toast-dismiss-button =
    .title = Ignorer
    .aria-label = Ignorer

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Découvrez le meilleur du Web
newtab-pocket-onboarding-cta = { -pocket-brand-name } explore une grande palette de publications pour vous apporter les contenus les plus instructifs, enthousiasmants et fiables directement dans votre navigateur { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Oups, une erreur s’est produite lors du chargement du contenu.
newtab-error-fallback-refresh-link = Actualisez la page pour réessayer.

## Customization Menu

newtab-custom-shortcuts-title = Raccourcis
newtab-custom-shortcuts-subtitle = Sites que vous enregistrez ou visitez
#  (developer note): @nova-cleanup(remove-string): Remove old string once Nova lands. The newtab-custom-shortcuts-nova string will take over
newtab-custom-shortcuts-toggle =
    .label = Raccourcis
    .description = Sites que vous enregistrez ou visitez
newtab-custom-shortcuts-nova =
    .label = Raccourcis
newtab-custom-row-description =
    .description = Nombre de lignes
# Variables
#   $num (number) - Number of rows to display
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be using "row"/"rows" anymore for the dropdown
newtab-custom-row-selector2 =
    .label =
        { $num ->
            [one] { $num } ligne
           *[other] { $num } lignes
        }
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } ligne
       *[other] { $num } lignes
    }
newtab-custom-sponsored-sites = Raccourcis sponsorisés
newtab-custom-pocket-title = Recommandé par { -pocket-brand-name }
newtab-custom-pocket-subtitle = Contenu exceptionnel sélectionné par { -pocket-brand-name }, membre de la famille { -brand-product-name }
#  (developer note): @nova-cleanup(remove-string): Remove string once Nova lands. We won't be having a description under "Recommended stories" anymore
newtab-custom-stories-toggle =
    .label = Articles recommandés
    .description = Contenu exceptionnel sélectionné par les membres de la gamme de produits { -brand-product-name }
newtab-recommended-stories-toggle =
    .label = Articles recommandés
newtab-custom-stories-personalized-toggle =
    .label = Articles
newtab-custom-stories-personalized-checkbox-label = Articles personnalisés en fonction de votre activité
newtab-custom-pocket-sponsored = Articles sponsorisés
newtab-custom-pocket-show-recent-saves = Afficher les éléments enregistrés récemment
newtab-custom-recent-title = Activité récente
newtab-custom-recent-subtitle = Une sélection de sites et de contenus récents
newtab-custom-weather-toggle =
    .label = Météo
    .description = Les prévisions du jour en un coup d’œil
newtab-custom-widget-weather-toggle =
    .label = Météo
newtab-custom-widget-lists-toggle =
    .label = Listes
newtab-custom-widget-timer-toggle =
    .label = Minuteur
newtab-custom-widget-sports-toggle =
    .label = Coupe du monde
newtab-custom-widget-clock-toggle =
    .label = Horloge
newtab-custom-widget-sports-toggle2 =
    .label = Sport
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Gérer les widgets
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Fermer
    .aria-label = Fermer le menu
newtab-custom-close-button = Fermer
newtab-custom-settings = Gérer plus de paramètres

## New Tab Wallpapers

newtab-wallpaper-title = Fonds d’écran
newtab-wallpaper-reset = Réinitialiser
#  (developer note): @nova-cleanup(remove-string): Remove old "Upload an image" string once Nova lands. The new "Add an image"  string will take over
newtab-wallpaper-upload-image = Envoyer une image
newtab-wallpaper-add-an-image = Ajouter une image
newtab-wallpaper-custom-color = Choisir une couleur
newtab-wallpaper-toggle-title =
    .label = Fonds d’écran
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = La taille de l’image dépasse la limite de { $file_size } Mo. Veuillez essayer d’envoyer un fichier plus petit.
newtab-wallpaper-error-upload-file-type = Nous n’avons pas pu envoyer votre fichier. Veuillez réessayer avec un fichier image.
newtab-wallpaper-error-file-type = Nous n’avons pas pu envoyer votre fichier. Veuillez réessayer avec un type de fichier différent.
newtab-wallpaper-light-red-panda = Panda roux
newtab-wallpaper-light-mountain = Montagne blanche
newtab-wallpaper-light-sky = Ciel avec des nuages violets et roses
newtab-wallpaper-light-color = Formes bleues, roses et jaunes
newtab-wallpaper-light-landscape = Paysage de montagne avec une brume bleue
newtab-wallpaper-light-beach = Plage avec palmier
newtab-wallpaper-dark-aurora = Aurores boréales
newtab-wallpaper-dark-color = Formes rouges et bleues
newtab-wallpaper-dark-panda = Panda roux caché dans la forêt
newtab-wallpaper-dark-sky = Paysage de ville avec un ciel nocturne
newtab-wallpaper-dark-mountain = Paysage de montagne
newtab-wallpaper-dark-city = Paysage de ville avec une teinte violette
newtab-wallpaper-dark-fox-anniversary = Un renard sur des pavés près d’une forêt
newtab-wallpaper-light-fox-anniversary = Un renard dans un pré avec un paysage montagneux embrumé

## Solid Colors

#  (developer note): @nova-cleanup(remove-string): Remove old "Solid colors" string once Nova lands. The simplified "Colors" string will take over
newtab-wallpaper-category-title-colors = Couleurs unies
newtab-wallpaper-colors = Couleurs
newtab-wallpaper-blue = Bleu
newtab-wallpaper-light-blue = Bleu clair
newtab-wallpaper-light-purple = Violet clair
newtab-wallpaper-light-green = Vert clair
newtab-wallpaper-green = Vert
newtab-wallpaper-beige = Beige
newtab-wallpaper-yellow = Jaune
newtab-wallpaper-orange = Orange
newtab-wallpaper-pink = Rose
newtab-wallpaper-light-pink = Rose clair
newtab-wallpaper-red = Rouge
newtab-wallpaper-dark-blue = Bleu foncé
newtab-wallpaper-dark-purple = Violet foncé
newtab-wallpaper-dark-green = Vert foncé
newtab-wallpaper-brown = Marron

## Abstract

newtab-wallpaper-category-title-abstract = Abstrait
newtab-wallpaper-abstract-green = Formes vertes
newtab-wallpaper-abstract-blue = Formes bleues
newtab-wallpaper-abstract-purple = Formes violettes
newtab-wallpaper-abstract-orange = Formes oranges
newtab-wallpaper-gradient-orange = Dégradé d’orange et de rose
newtab-wallpaper-abstract-blue-purple = Formes bleues et violettes
newtab-wallpaper-abstract-white-curves = Blanc avec des courbes ombrées
newtab-wallpaper-abstract-purple-green = Dégradé violet et vert clair
newtab-wallpaper-abstract-blue-purple-waves = Formes ondulées bleues et violettes
newtab-wallpaper-abstract-black-waves = Formes ondulées noires

## Firefox

newtab-wallpaper-category-title-photographs = Photos
newtab-wallpaper-beach-at-sunrise = Plage au lever du soleil
newtab-wallpaper-beach-at-sunset = Plage au coucher du soleil
newtab-wallpaper-storm-sky = Ciel orageux
newtab-wallpaper-sky-with-pink-clouds = Ciel avec des nuages roses
newtab-wallpaper-red-panda-yawns-in-a-tree = Un panda roux qui baille sur un arbre
newtab-wallpaper-white-mountains = Montagnes blanches
newtab-wallpaper-hot-air-balloons = Diverses montgolfières colorées en plein jour
newtab-wallpaper-starry-canyon = Nuit étoilée bleue
newtab-wallpaper-suspension-bridge = Photographie diurne en noir et blanc d’un pont suspendu
newtab-wallpaper-sand-dunes = Dunes de sable blanc
newtab-wallpaper-palm-trees = Silhouette de cocotiers pendant un crépuscule doré
newtab-wallpaper-blue-flowers = Macrophotographie d’une fleur éclose aux pétales bleus
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Photo de <a data-l10n-name="name-link">{ $author_string }</a> sur <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Essayez une touche de couleur
newtab-wallpaper-feature-highlight-content = Donnez un nouveau look à votre page Nouvel onglet avec des fonds d’écran.
newtab-wallpaper-feature-highlight-button = J’ai compris
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Ignorer
    .aria-label = Fermer la pop-up
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Céleste
newtab-wallpaper-celestial-lunar-eclipse = Éclipse de lune
newtab-wallpaper-celestial-earth-night = Photo de nuit depuis une orbite terrestre basse
newtab-wallpaper-celestial-starry-sky = Ciel étoilé
newtab-wallpaper-celestial-eclipse-time-lapse = Phases d’éclipse de lune superposées
newtab-wallpaper-celestial-black-hole = Illustration d’une galaxie avec un trou noir
newtab-wallpaper-celestial-river = Image satellite d’une rivière

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Voir les prévisions sur { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Sponsorisé
newtab-weather-menu-change-location = Changer de lieu
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Rechercher un lieu
    .aria-label = Rechercher un lieu
# "Current" refers to the user's physical/geographic location detected via geolocation.
newtab-weather-change-location-search-use-current =
    .label = Utiliser l’emplacement actuel
newtab-weather-menu-weather-display = Affichage météo
newtab-weather-todays-forecast = Prévisions du jour
newtab-weather-see-full-forecast = Voir les prévisions complètes
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Vue simplifiée
newtab-weather-menu-change-weather-display-simple = Afficher la vue simplifiée
newtab-weather-menu-weather-display-option-detailed = Vue détaillée
newtab-weather-menu-change-weather-display-detailed = Afficher la vue détaillée
newtab-weather-menu-temperature-units = Unité des températures
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Passer en Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Passer en Celsius
newtab-weather-menu-hide-weather = Masquer la météo sur la page Nouvel onglet
newtab-weather-menu-learn-more = En savoir plus
newtab-weather-menu-detect-my-location = Détecter ma localisation
# This message is shown if user is working offline
newtab-weather-error-not-available = Les données météo ne sont pas disponibles pour le moment.
newtab-weather-opt-in-see-weather = Voulez-vous voir la météo pour votre localisation ?
newtab-weather-opt-in-not-now =
    .label = Plus tard
newtab-weather-opt-in-yes =
    .label = Oui
newtab-weather-opt-in-headline = Obtenez les prévisions météo locales
newtab-weather-opt-in-use-location =
    .label = Utiliser la localisation
newtab-weather-opt-in-choose-location = Choisir l’emplacement
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = New York
# "Highest" here refers to the highest temperature of the day
newtab-weather-high =
    .aria-label = Maximale
# "Lowest" here refers to the lowest temperature of the day
newtab-weather-low =
    .aria-label = Minimale
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Voir les prévisions sur { $provider }
    .aria-description = { $provider } ∙ Sponsorisé

## Topic Labels

newtab-topic-label-business = Économie
newtab-topic-label-career = Carrière
newtab-topic-label-education = Enseignement
newtab-topic-label-arts = Divertissement
newtab-topic-label-food = Cuisine
newtab-topic-label-health = Santé
newtab-topic-label-hobbies = Jeux vidéo
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Argent
newtab-topic-label-society-parenting = Parentalité
newtab-topic-label-government = Politique
newtab-topic-label-education-science = Science
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Astuces du quotidien
newtab-topic-label-sports = Sports
newtab-topic-label-tech = Technologie
newtab-topic-label-travel = Voyage
newtab-topic-label-home = Maison et jardin

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Sélectionnez des sujets pour affiner votre flux
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Choisissez au moins deux sujets. Nos spécialistes en sélection d’articles donnent la priorité aux articles qui correspondent à vos centres d’intérêt. Vous pouvez modifier vos choix à tout moment.
newtab-topic-selection-save-button = Enregistrer
newtab-topic-selection-cancel-button = Annuler
newtab-topic-selection-button-maybe-later = Peut-être plus tard
newtab-topic-selection-privacy-link = Découvrez comment nous protégeons et gérons les données
newtab-topic-selection-button-update-interests = Mettre à jour vos centres d’intérêt
newtab-topic-selection-button-pick-interests = Choisir vos centres d’intérêt

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Suivre
# Variables:
#   $topic (string) - Topic that the user can follow
newtab-section-follow-button-label =
    .aria-label = Suivre { $topic }
newtab-section-following-button = Suivi
newtab-section-unfollow-button = Ne plus suivre
# Variables:
#   $topic (string) - Topic that the user is following and can unfollow
newtab-section-unfollow-button-label =
    .aria-label = Suivi : ne plus suivre { $topic }
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Personnalisez votre fil
newtab-section-follow-highlight-subtitle = Suivez vos centres d’intérêt pour découvrir davantage de contenus qui vous plaisent.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Bloquer
newtab-section-blocked-button = Bloqué
newtab-section-unblock-button = Débloquer
# Variables:
#   $topic (string) - Name of topic that user is following
newtab-section-follow-topic =
    .aria-label = Suivre { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unfollowing
newtab-section-unfollow-topic =
    .aria-label = Ne plus suivre { $topic }
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic =
    .aria-label = Bloquer { $topic }
# Variables:
#   $topic (string) - Name of topic that user is unblocking
newtab-section-unblock-topic =
    .aria-label = Débloquer { $topic }

## Confirmation modal for blocking a section

newtab-section-cancel-button = Plus tard
newtab-section-confirm-block-topic-p1 = Voulez-vous vraiment bloquer ce sujet ?
newtab-section-confirm-block-topic-p2 = Les sujets bloqués n’apparaîtront plus dans votre flux.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Bloquer { $topic }
newtab-section-block-cancel-button = Annuler

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Sujets
newtab-section-manage-topics-button-v2 =
    .label = Gérer les sujets
newtab-section-mangage-topics-followed-topics = Suivis
newtab-section-mangage-topics-followed-topics-empty-state = Vous n’avez pas encore suivi de sujet.
newtab-section-mangage-topics-blocked-topics = Bloqués
newtab-section-mangage-topics-blocked-topics-empty-state = Vous n’avez pas encore bloqué de sujet.
newtab-custom-wallpaper-title = Les fonds d’écran personnalisés sont disponibles
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Téléchargez votre propre fond d’écran ou choisissez votre couleur, et appropriez-vous { -brand-product-name }.
newtab-custom-wallpaper-cta = Essayer

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Choisissez un fond d’écran pour personnaliser { -brand-product-name }
newtab-new-user-custom-wallpaper-subtitle = Personnalisez chaque nouvel onglet pour qu’il vous ressemble en choisissant vos propres fonds d’écran et couleurs.
newtab-new-user-custom-wallpaper-cta = Essayer

## Strings for Nova wallpaper feature highlight

newtab-wallpaper-feature-highlight-title = De nouveaux fonds d’écran viennent d’arriver
newtab-wallpaper-feature-highlight-subtitle = Sélectionnez votre préféré et donnez à chaque nouvel onglet une touche personnelle.
newtab-wallpaper-feature-highlight-cta = Choisir un fond d’écran

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Téléchargez { -brand-product-name } pour mobile
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Scannez le code pour naviguer en sécurité où que vous soyez.
newtab-download-mobile-highlight-body-variant-b = Reprenez là où vous en étiez lorsque vous synchronisez vos onglets, mots de passe, et bien plus.
newtab-download-mobile-highlight-body-variant-c = Saviez-vous que vous pouvez emporter { -brand-product-name } avec vous ? Le même navigateur, dans votre poche.
newtab-download-mobile-highlight-image =
    .aria-label = Code QR pour télécharger { -brand-product-name } pour mobile

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Vos sites préférés à portée de main
newtab-shortcuts-highlight-subtitle = Ajoutez un raccourci pour accéder à vos sites préférés en un clic.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Pourquoi signalez-vous ce contenu ?
newtab-report-ads-reason-not-interested =
    .label = Je ne suis pas intéressé·e
newtab-report-ads-reason-inappropriate =
    .label = Il est inapproprié
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Je l’ai vu trop de fois
newtab-report-content-wrong-category =
    .label = Mauvaise catégorie
newtab-report-content-outdated =
    .label = Obsolète
newtab-report-content-inappropriate-offensive =
    .label = Inapproprié ou choquant
newtab-report-content-spam-misleading =
    .label = Spam ou trompeur
newtab-report-content-requires-payment-subscription =
    .label = Nécessite un paiement ou un abonnement
newtab-report-content-requires-payment-subscription-learn-more = En savoir plus
newtab-report-cancel = Annuler
newtab-report-submit = Envoyer
newtab-toast-thanks-for-reporting =
    .message = Merci pour votre signalement.
newtab-toast-widgets-hidden =
    .message = Cliquez sur l’icône en forme de crayon pour rajouter des widgets à tout moment.
# Variables:
#   $topic (string) - Topic that the user has followed
newtab-section-toast-follow =
    .message = Vous suivez désormais { $topic }.
# Variables:
#   $topic (string) - Topic that the user has unfollowed
newtab-section-toast-unfollow =
    .message = Vous ne suivez plus { $topic }.
# Variables:
#   $topic (string) - Topic that the user has blocked
newtab-section-toast-block =
    .message = Vous ne verrez plus d’articles sur { $topic }.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = Les possibilités sont infinies. Ajoutez une tâche.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Nouveau
newtab-widget-lists-label-beta =
    .label = Bêta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Achevées ({ $number })
newtab-widget-lists-celebration-headline = Bien joué
newtab-widget-lists-celebration-subhead = Aucune tâche restante
newtab-widget-task-list-menu-copy = Copier
newtab-widget-lists-menu-edit = Modifier le nom de la liste
newtab-widget-lists-menu-edit2 =
    .aria-label = Modifier le nom de la liste
newtab-widget-lists-menu-create = Créer une nouvelle liste
newtab-widget-lists-menu-delete = Supprimer cette liste
newtab-widget-lists-menu-copy = Copier la liste dans le presse-papiers
newtab-widget-lists-menu-learn-more = En savoir plus
newtab-widget-lists-button-add-item = Ajouter un élément
newtab-widget-lists-input-add-an-item2 =
    .placeholder = Ajouter un élément
    .aria-label = Ajouter un élément
newtab-widget-lists-input-error = Veuillez saisir du texte pour ajouter un élément.
newtab-widget-lists-input-menu-open-link = Ouvrir le lien
newtab-widget-lists-input-menu-move-up = Déplacer vers le haut
newtab-widget-lists-input-menu-move-down = Déplacer vers le bas
newtab-widget-lists-input-menu-delete = Supprimer
newtab-widget-lists-input-menu-edit = Modifier
newtab-widget-lists-input-menu-edit2 =
    .aria-label = Modifier l’élément
newtab-widget-lists-edit-clear =
    .aria-label = Annuler
    .title = Annuler
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Créer une nouvelle liste
newtab-widget-lists-name-label-default =
    .label = Liste de tâches
newtab-widget-lists-name-label-checklist =
    .label = Liste de tâches
newtab-widget-lists-name-placeholder-default =
    .placeholder = Liste de tâches
newtab-widget-lists-name-placeholder-checklist2 =
    .placeholder = Liste de tâches
    .aria-label = Modifier le nom de la liste
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new2 =
    .placeholder = Nouvelle liste
    .aria-label = Modifier le nom de la liste
newtab-widget-section-title = Widgets
newtab-widget-menu-hide = Masquer le widget
newtab-widget-menu-change-size = Modifier la taille
# Parent label for a submenu in the widget menu that reorders the widget
# among its siblings. "Left" and "Right" appear as items inside this submenu.
newtab-widget-menu-move = Déplacer
# Submenu item under "Move"; moves the widget one position to the left.
# RTL locales should translate this as "Right".
newtab-widget-menu-move-left = À gauche
# Submenu item under "Move"; moves the widget one position to the right.
# RTL locales should translate this as "Left".
newtab-widget-menu-move-right = À droite
newtab-widget-size-small = Petite
newtab-widget-size-medium = Moyenne
newtab-widget-size-large = Grande
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Masquer les widgets
    .aria-label = Masquer tous les widgets
newtab-widget-section-maximize =
    .title = Développer les widgets
    .aria-label = Développer tous les widgets à leur taille réelle
newtab-widget-section-minimize =
    .title = Réduire les widgets
    .aria-label = Réduire tous les widgets au format compact
newtab-widget-section-menu-button =
    .title = Menu Widgets
    .aria-label = Ouvrir le menu des widgets
newtab-widget-add-widgets-button =
    .aria-label = Ajouter le widget
    .title = Ajouter le widget
newtab-widget-section-menu-manage = Gérer les widgets
newtab-widget-section-menu-hide-all = Masquer les widgets
newtab-widget-section-menu-learn-more = En savoir plus
newtab-widget-section-feedback = Donnez-nous votre avis
# Button shown when additional widgets are hidden beyond the
# first row, allowing users to show them.
newtab-widget-section-show-more =
    .label = Afficher plus de widgets
# Button shown when the widgets row is expanded to multiple rows,
# allowing users to collapse it back to one row.
newtab-widget-section-show-less =
    .label = Afficher moins de widgets
newtab-widget-lists-name-default = Liste de tâches

## Strings introduced by the Nova redesign of the Timer widget

newtab-widget-timer-notification-title = Minuteur
newtab-widget-timer-notification-focus = La période de concentration est terminée. Bien joué. Besoin de faire une pause ?
newtab-widget-timer-notification-break = Votre pause est terminée. Prêt·e à se concentrer à nouveau ?
newtab-widget-timer-notification-warning = Notifications désactivées
newtab-widget-timer-mode-focus =
    .label = Concentration
newtab-widget-timer-mode-break =
    .label = Pause
newtab-widget-timer-label-play =
    .label = Démarrer
newtab-widget-timer-label-pause =
    .label = Pause
newtab-widget-timer-reset =
    .title = Réinitialiser
newtab-widget-timer-menu-notifications = Désactiver les notifications
newtab-widget-timer-menu-notifications-on = Activer les notifications
newtab-widget-timer-menu-learn-more = En savoir plus
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Principaux titres
newtab-daily-briefing-card-menu-dismiss = Ignorer
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Mis à jour il y a { $minutes } min
newtab-widget-message-title = Gardez votre concentration grâce aux listes et au minuteur intégré
# to-dos stands for "things to do".
newtab-widget-message-copy = Qu’il s’agisse de rappels rapides ou de tâches quotidiennes, de sessions de réflexion ou de pauses détente, gardez le cap et respectez vos horaires.
# One spot refers to a dedicated section on new tab to manage and use widgets
newtab-widget-message-focus-forecasts-title = Un espace dédié pour la concentration, les prévisions météo et bien plus
newtab-widget-message-focus-forecasts-body = Gardez le rythme avec les widgets { -brand-product-name }. Consultez les prévisions météo, concentrez-vous sur une tâche ou suivez l’heure partout dans le monde.
# "Make Firefox yours" refers to about:newtab. The call to action here ("Try it now")
# is to customize the new tab page with a background image or color from
# the built-in wallpaper collection or uploading your own image.
newtab-promo-card-title-addons = Personnalisez { -brand-product-name }
newtab-promo-card-body-addons = Choisissez un fond d’écran dans notre collection ou créez le vôtre.
newtab-promo-card-cta-addons = Essayer maintenant
newtab-promo-card-title = Apportez votre soutien à { -brand-product-name }
newtab-promo-card-body = Nos sponsors soutiennent notre mission de créer un meilleur Web
newtab-promo-card-cta = En apprendre davantage
newtab-promo-card-dismiss-button =
    .title = Ignorer
    .aria-label = Ignorer

## Strings introduced by the Nova redesign of the Timer widget

# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-start-aria =
    .aria-label =
        { $minutes ->
            [one] Démarrer le chronomètre de { $minutes } minute
           *[other] Démarrer le chronomètre de { $minutes } minutes
        }
newtab-widget-timer-pause-aria =
    .aria-label = Mettre en pause le minuteur
# Variables:
#   $minutes (number) - The currently selected timer duration in minutes
newtab-widget-timer-spinbutton-name =
    .aria-label =
        { $minutes ->
            [one] { $minutes } minute
           *[other] { $minutes } minutes
        }
newtab-widget-timer-decrease-min =
    .title = Diminuer d’une minute
newtab-widget-timer-increase-min =
    .title = Augmenter d’une minute
newtab-widget-timer-mode-group =
    .aria-label = Mode minuteur
# Small label shown beneath the live time while the focus timer is running or paused.
newtab-widget-timer-running-focus = Concentration
# Small label shown beneath the live time while the break timer is running or paused.
newtab-widget-timer-running-break = Pause
# Context-menu item to hide the Timer widget. Replaces the shared "Hide widget"
# copy with a widget-specific string per the Nova design.
newtab-widget-timer-menu-hide = Masquer le minuteur
# Heading shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-heading-focus = Bien joué
# Heading shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-heading-break = Votre pause est terminée
# Message shown inside the Timer widget after a focus session ends.
newtab-widget-timer-celebration-message-focus = Besoin de faire une pause ?
# Message shown inside the Timer widget after a break session ends.
newtab-widget-timer-celebration-message-break = Prêt·e à vous concentrer ?

##

newtab-sports-widget-menu-follow-teams = Suivre des équipes
newtab-sports-widget-menu-view-schedule = Voir le calendrier
newtab-sports-widget-menu-view-upcoming = Voir les matchs à venir
newtab-sports-widget-menu-view-results = Voir les résultats
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-menu-key-dates = Dates clés
newtab-sports-widget-menu-learn-more = En savoir plus
# “Keep tabs on” is an informal expression meaning to stay updated on, stay informed on, or regularly follow something (in this case, World Cup matches and updates).
newtab-sports-widget-keep-tabs = Gardez un œil sur la Coupe du monde
newtab-sports-widget-get-updates = Recevez les dernières infos en direct sur les matchs et bien plus encore.
newtab-sports-widget-view-schedule =
    .label = Voir le calendrier
newtab-sports-widget-follow-teams =
    .label = Suivre des équipes
newtab-sports-widget-view-matches =
    .label = Voir les matchs
# Variables:
#   $number (number) - Maximum number of teams a user can choose to follow in the team selection state
newtab-sports-widget-follow-teams-title =
    { $number ->
        [one] Suivez jusqu’à { $number } équipe
       *[other] Suivez jusqu’à { $number } équipes
    }
newtab-sports-widget-choose-wallpaper =
    .label = Choisir un fond d’écran
newtab-sports-widget-skip = Ignorer
newtab-sports-widget-search-country =
    .placeholder = Rechercher un pays
    .aria-label = Rechercher un pays
newtab-sports-widget-cancel = Annuler
newtab-sports-widget-back-button =
    .aria-label = Retour
newtab-sports-widget-done-button =
    .label = Terminé
# Shown in the follow-teams list for a team that has been knocked out of the tournament.
# Variables:
#   $teamName (string) - the localized team name (e.g. "Canada").
newtab-sports-widget-team-name-eliminated = { $teamName } (éliminé)
newtab-sports-widget-view-all =
    .label = Tout afficher
newtab-sports-widget-show-less =
    .label = Afficher moins
# Toggle that filters the list of teams the user follows
newtab-sports-widget-followed-only-toggle =
    .label = Seules les équipes suivies
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch =
    .label = Regarder
    .title = Regarder en direct
# Watch is a verb (as in watch matches online).
newtab-sports-widget-watch-icon =
    .aria-label = Regarder en direct
    .title = Regarder en direct
newtab-sports-widget-watch-dialog-close =
    .aria-label = Fermer
    .title = Fermer
# Tag: user can watch without paying (sign-in may still be required).
newtab-sports-widget-watch-stream-free = Gratuit
# Tag: user can start watching via a trial; continued access may require payment after it ends.
newtab-sports-widget-watch-stream-free-trial = Essai gratuit
# Tag: provider offers both a no-cost or trial path and a paid path.
newtab-sports-widget-watch-stream-free-paid = Gratuit ou payant
# Tag: user must pay to watch (subscription, TV provider, premium plan, or add-on).
newtab-sports-widget-watch-stream-paid = Payant
# Note: provider only streams some matches, not the full tournament.
newtab-sports-widget-watch-stream-select-games-only = Certains matchs uniquement
# Heading for the list of streaming services available in the user’s country/region.
newtab-sports-widget-watch-available-region = Disponibles dans votre région
# Heading for the list of streaming services available outside the user’s country/region.
newtab-sports-widget-watch-available-other-regions = Autres régions
# Button that opens the provider’s stream page in a new tab.
newtab-sports-widget-watch-play =
    .aria-label = Accéder au direct
    .title = Accéder au direct
newtab-sports-widget-group-stage = Phase de groupes
newtab-sports-widget-group-a = Groupe A
newtab-sports-widget-group-b = Groupe B
newtab-sports-widget-group-c = Groupe C
newtab-sports-widget-group-d = Groupe D
newtab-sports-widget-group-e = Groupe E
newtab-sports-widget-group-f = Groupe F
newtab-sports-widget-group-g = Groupe G
newtab-sports-widget-group-h = Groupe H
newtab-sports-widget-group-i = Groupe I
newtab-sports-widget-group-j = Groupe J
newtab-sports-widget-group-k = Groupe K
newtab-sports-widget-group-l = Groupe L
newtab-sports-widget-round-32 = 16es de finale
newtab-sports-widget-round-16 = 8es de finale
newtab-sports-widget-quarter-finals = Quarts de finale
# The "LIVE" string is meant to be uppercase in English, but other languages and locales may vary in how they handle this.
newtab-sports-widget-live = EN DIRECT
newtab-custom-widget-live-refresh =
    .title = Actualiser les scores
    .aria-label = Actualiser les scores
# Milestone dates (e.g. group stage, semifinals, etc.). Refers to calendar dates.
newtab-sports-widget-key-dates = Dates clés
newtab-sports-widget-upcoming = À venir
# Used for a match currently ongoing
newtab-sports-widget-now = Maintenant
newtab-sports-widget-results = Résultats
newtab-sports-widget-semi-finals = Demi-finale
newtab-sports-widget-bronze-finals = Petite finale
# Final is the final match for 1st place.
newtab-sports-widget-final = Finale
# Variables:
#   $start (Date) - Start date of a tournament stage
#   $end (Date) - End date of a tournament stage
newtab-sports-widget-key-date-range = { DATETIME($start, month: "short", day: "numeric") } – { DATETIME($end, month: "short", day: "numeric") }
# Variables:
#   $date (Date) - Date of a single tournament event
newtab-sports-widget-key-date = { DATETIME($date, month: "short", day: "numeric") }
newtab-sports-widget-delayed = Retardé
newtab-sports-widget-postponed = Reporté
newtab-sports-widget-suspended = Suspendu
newtab-sports-widget-cancelled = Annulé
newtab-sports-widget-information = Informations à propos du match
newtab-sports-widget-no-live-data = Les informations des matchs en direct ne sont pas actualisées pour le moment
newtab-sports-widget-view-results-link = Voir les résultats
newtab-sports-widget-third-place = Troisième place
# Runner-up is the team in 2nd place.
newtab-sports-widget-runner-up = Finaliste
newtab-sports-widget-champions = Champions
newtab-sports-widget-world-cup-champions = Champions du monde 2026
# Variables:
#   $date (Date) - The match start time
newtab-sports-widget-match-time = { DATETIME($date, hour: "2-digit", minute: "2-digit") }
newtab-sports-widget-match-full-time = Match terminé
newtab-sports-widget-match-halftime = Mi-temps
newtab-sports-widget-match-extra-time = Prolongations
newtab-sports-widget-match-penalties = Tirs au but
# Separator shown between two teams in a placeholder match row when no upcoming
# match details are available yet.
newtab-sports-widget-match-vs = contre
# Note shown in the Upcoming tab when no match details are available yet.
newtab-sports-widget-no-upcoming-matches = Les détails des prochains matchs seront bientôt disponibles

## Sports widget live-games pagination. Shown when 2+ matches are live at the same time

# arrow button that goes to the previous page of live matches.
newtab-sports-widget-pagination-previous =
    .aria-label = Précédent
    .title = Précédent
# arrow button that goes to the next page of live matches.
newtab-sports-widget-pagination-next =
    .aria-label = Suivant
    .title = Suivant
# Dot indicator that jumps directly to a given live match.
# $index (number) - 1-based position of this dot in the list.
# $total (number) - Total number of live matches.
newtab-sports-widget-pagination-dot =
    .aria-label = Match en direct { $index } sur { $total }
    .title = Match en direct { $index } sur { $total }

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
    .aria-label = { $homeTeam }, { $homeScore } contre { $awayTeam }, { $awayScore }
# A finished match row that went to a penalty shootout.
# Parenthesized values are the shootout score.
# Variables:
#   $homeScore (number) - The home team's regular-time score
#   $awayScore (number) - The away team's regular-time score
#   $homePenalty (number) - The home team's penalty shootout score
#   $awayPenalty (number) - The away team's penalty shootout score
newtab-sports-widget-match-aria-label-results-penalties =
    .aria-label = { $homeTeam }, { $homeScore } ({ $homePenalty }) contre { $awayTeam }, { $awayScore } ({ $awayPenalty })
# A match that is currently in progress.
# Variables:
#   $homeScore (number) - The home team's current score
#   $awayScore (number) - The away team's current score
newtab-sports-widget-match-aria-label-now =
    .aria-label = En direct : { $homeTeam }, { $homeScore } contre { $awayTeam }, { $awayScore }
# An upcoming scheduled match row. Announces kickoff time and date.
# Variables:
#   $date (Date) - The scheduled kickoff date/time
newtab-sports-widget-match-aria-label-upcoming =
    .aria-label = { $homeTeam } contre { $awayTeam }, { DATETIME($date, hour: "numeric", minute: "numeric") }, { DATETIME($date, day: "numeric", month: "long") }
# An upcoming match row whose status is "delayed".
newtab-sports-widget-match-aria-label-upcoming-delayed =
    .aria-label = { $homeTeam } contre { $awayTeam }, retardé
# An upcoming match row whose status is "postponed".
newtab-sports-widget-match-aria-label-upcoming-postponed =
    .aria-label = { $homeTeam } contre { $awayTeam }, reporté
# An upcoming match row whose status is "suspended".
newtab-sports-widget-match-aria-label-upcoming-suspended =
    .aria-label = { $homeTeam } contre { $awayTeam }, suspendu
# An upcoming match row whose status is "cancelled".
newtab-sports-widget-match-aria-label-upcoming-cancelled =
    .aria-label = { $homeTeam } contre { $awayTeam }, annulé

## Sports widget — team names (FIFA country codes)
## Only includes names not adequately covered by standard country-code
## internationalization tooling.

newtab-sports-widget-team-name-label-bih =
    .label = Bosnie-Herzégovine
newtab-sports-widget-team-name-label-civ =
    .label = Côte d’Ivoire
newtab-sports-widget-team-name-label-cod =
    .label = République démocratique du Congo
newtab-sports-widget-team-name-label-eng =
    .label = Angleterre
newtab-sports-widget-team-name-label-sco =
    .label = Écosse
# Placeholder used in a match row's aria-label for an undecided team (shown visually as "--").
newtab-sports-widget-team-tbd = À déterminer

## Sports widget OMC messages
## Shown as on-screen messages promoting the Sports widget and World Cup wallpapers.

newtab-sports-widget-message-wallpapers-title = Célébrez le début de la Coupe du monde avec de nouveaux fonds d’écran
newtab-sports-widget-message-wallpapers-body = Ajoutez une touche d’ambiance de jour de match à votre navigateur pendant le tournoi.
newtab-sports-widget-message-wallpapers-cta = Choisir un fond d’écran
newtab-sports-widget-message-add-widgets-cta =
    .label = Ajouter des widgets
newtab-sports-widget-message-day-in-play-title = Restez dans l’ambiance avec les widgets { -brand-product-name }
newtab-sports-widget-message-day-in-play-body = Suivez la Coupe du monde, concentrez-vous sur une tâche, suivez l’heure partout dans le monde et bien plus.
newtab-sports-widget-message-explore-widgets-cta =
    .label = Découvrir les widgets

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Ignorer
    .aria-label = Ignorer
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Personnalisez cet espace
newtab-activation-window-message-customization-focus-message = Choisissez un nouveau fond d’écran, ajoutez des raccourcis vers vos sites préférés et restez au courant des sujets qui vous intéressent.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Commencer la personnalisation
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Cet espace suit vos règles
newtab-activation-window-message-values-focus-message = { -brand-product-name } vous permet de naviguer comme bon vous semble, de commencer votre journée en ligne de façon plus personnelle. Personnalisez { -brand-product-name }.

## Strings for the Clock widget

# Context menu item: toggle the clock card off.
newtab-clock-widget-menu-hide = Masquer l’horloge
newtab-clock-widget-menu-learn-more = En savoir plus
newtab-clock-widget-menu-edit = Modifier les horloges
newtab-clock-widget-menu-switch-to-12h = Passer au format 12 heures
newtab-clock-widget-menu-switch-to-24h = Passer au format 24 heures
newtab-clock-widget-label-your-clocks = Vos horloges
newtab-clock-widget-search-location-input =
    .label = Emplacement
    .placeholder = Rechercher une ville
    .aria-label = Rechercher une ville
# "Nickname (optional)" refers to a custom, user-defined label for a saved location
# (e.g., "Home", "Office", or "School") to make it easier to recognize.
# Not to be translated as a legal name, username, or alias used for identity verification.
newtab-clock-widget-input-nickname =
    .label = Nom personnalisé (facultatif)
    .placeholder = Ajouter un nom personnalisé
    .aria-label = Nom personnalisé (facultatif)
# "Add new clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-button-add =
    .title = Ajouter une horloge
    .aria-label = Ajouter une horloge
newtab-clock-widget-button-add-clock = Ajouter
newtab-clock-widget-button-cancel = Annuler
newtab-clock-widget-button-back =
    .title = Retour
    .aria-label = Retour
newtab-clock-widget-button-edit-clock =
    .title = Modifier l’horloge
    .aria-label = Modifier l’horloge
newtab-clock-widget-button-save = Enregistrer
newtab-clock-widget-button-remove-clock =
    .title = Supprimer l’horloge
    .aria-label = Supprimer l’horloge
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
    .aria-label = { $city }, nom personnalisé : { $nickname }
newtab-clock-widget-add-clock-form =
    .aria-label = Ajouter une horloge
newtab-clock-widget-edit-clock-form =
    .aria-label = Modifier l’horloge
# "Search results" is the accessible label for the listbox dropdown that appears
# below the location search field, listing matching cities as the user types.
# It means "results of the search", not "search within the results".
newtab-clock-widget-search-results =
    .aria-label = Résultats de la recherche
# Shown in place of the search results when the user's query does not match any
# supported city — e.g. typing a misspelled name or a place not in the IANA
# time zone list.
newtab-clock-widget-search-no-results = Aucune correspondance
# "Open menu for clock" is an icon-only button in the widget toolbar — the
# attributes are consumed as tooltip/screen-reader label only. The button
# never renders visible text.
newtab-clock-widget-menu-button =
    .title = Ouvrir le menu de l’horloge
    .aria-label = Ouvrir le menu de l’horloge
# $nickname (String) - The user-defined nickname for a saved clock location (e.g., "Home", "Office").
newtab-clock-widget-label-nickname-with-value = Nom personnalisé : { $nickname }

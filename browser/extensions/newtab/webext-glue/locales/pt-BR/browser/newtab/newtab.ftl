# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


### Firefox Home / New Tab strings for about:home / about:newtab.

newtab-page-title = Nova aba
newtab-settings-button =
    .title = Personalizar sua página de nova aba
newtab-customize-panel-icon-button =
    .title = Personalizar esta página
newtab-customize-panel-icon-button-label = Personalizar
newtab-personalize-settings-icon-label =
    .title = Personalizar página de nova aba
    .aria-label = Configurações
newtab-settings-dialog-label =
    .aria-label = Configurações
newtab-personalize-icon-label =
    .title = Personalizar página de nova aba
    .aria-label = Personalizar página de nova aba
newtab-personalize-dialog-label =
    .aria-label = Personalizar
newtab-logo-and-wordmark =
    .aria-label = { -brand-full-name }
newtab-card-dismiss-button =
    .title = Descartar
    .aria-label = Descartar

## Search box component.

# "Search" is a verb/action
newtab-search-box-search-button =
    .title = Pesquisar
    .aria-label = Pesquisar
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-text = Pesquise com { $engine } ou digite um endereço
newtab-search-box-handoff-text-no-engine = Pesquise ou digite um endereço
# Variables:
#   $engine (string) - The name of the user's default search engine
newtab-search-box-handoff-input =
    .placeholder = Pesquise com { $engine } ou digite um endereço
    .title = Pesquise com { $engine } ou digite um endereço
    .aria-label = Pesquise com { $engine } ou digite um endereço
newtab-search-box-handoff-input-no-engine =
    .placeholder = Pesquise ou digite um endereço
    .title = Pesquise ou digite um endereço
    .aria-label = Pesquise ou digite um endereço
newtab-search-box-text = Pesquisar na internet
newtab-search-box-input =
    .placeholder = Pesquisar na web
    .aria-label = Pesquisar na web

## Top Sites - General form dialog.

newtab-topsites-add-search-engine-header = Adicionar mecanismo de pesquisa
newtab-topsites-add-shortcut-header = Novo atalho
newtab-topsites-edit-topsites-header = Editar site preferido
newtab-topsites-edit-shortcut-header = Editar atalho
newtab-topsites-add-shortcut-label = Adicionar atalho
newtab-topsites-add-shortcut-title =
    .title = Adicionar atalho
    .aria-label = Adicionar atalho
newtab-topsites-title-label = Título
newtab-topsites-title-input =
    .placeholder = Digite um título
newtab-topsites-url-label = URL
newtab-topsites-url-input =
    .placeholder = Digite ou cole uma URL
newtab-topsites-url-validation = É necessário uma URL válida
newtab-topsites-image-url-label = URL de imagem personalizada
newtab-topsites-use-image-link = Usar uma imagem personalizada…
newtab-topsites-image-validation = Não foi possível carregar a imagem. Tente uma URL diferente.

## Top Sites - General form dialog buttons. These are verbs/actions.

newtab-topsites-cancel-button = Cancelar
newtab-topsites-delete-history-button = Excluir do histórico
newtab-topsites-save-button = Salvar
newtab-topsites-preview-button = Visualizar
newtab-topsites-add-button = Adicionar

## Top Sites - Delete history confirmation dialog.

newtab-confirm-delete-history-p1 = Você tem certeza que quer excluir todas as instâncias desta página do seu histórico?
# "This action" refers to deleting a page from history.
newtab-confirm-delete-history-p2 = Essa ação não pode ser desfeita.

## Top Sites - Sponsored label

newtab-topsite-sponsored = Patrocinado

## Label used by screen readers for pinned top sites

# Variables:
#   $title (string) - The label or hostname of the site.
topsite-label-pinned =
    .aria-label = { $title } (fixado)
    .title = { $title }

## Context Menu - Action Tooltips.

# General tooltip for context menus.
newtab-menu-section-tooltip =
    .title = Abrir menu
    .aria-label = Abrir menu
# Tooltip for dismiss button
newtab-dismiss-button-tooltip =
    .title = Remover
    .aria-label = Remover
# This tooltip is for the context menu of Pocket cards or Topsites
# Variables:
#   $title (string) - The label or hostname of the site. This is for screen readers when the context menu button is focused/active.
newtab-menu-content-tooltip =
    .title = Abrir menu
    .aria-label = Abrir menu de contexto para { $title }
# Tooltip on an empty topsite box to open the New Top Site dialog.
newtab-menu-topsites-placeholder-tooltip =
    .title = Editar este site
    .aria-label = Editar este site

## Context Menu: These strings are displayed in a context menu and are meant as a call to action for a given page.

newtab-menu-edit-topsites = Editar
newtab-menu-open-new-window = Abrir em nova janela
newtab-menu-open-new-private-window = Abrir em nova janela privativa
newtab-menu-dismiss = Dispensar
newtab-menu-pin = Fixar
newtab-menu-unpin = Desafixar
newtab-menu-delete-history = Excluir do histórico
newtab-menu-save-to-pocket = Salvar no { -pocket-brand-name }
newtab-menu-delete-pocket = Excluir do { -pocket-brand-name }
newtab-menu-archive-pocket = Arquivar no { -pocket-brand-name }
newtab-menu-show-privacy-info = Nossos patrocinadores e sua privacidade
newtab-menu-about-fakespot = Informações sobre o { -fakespot-brand-name }
# Report is a verb (i.e. report issue with the content).
newtab-menu-report = Relatar
# Context menu option to personalize New Tab recommended stories by blocking a section of stories,
# e.g. "Sports". "Block" is a verb here.
newtab-menu-section-block = Bloquear
# "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
# e.g. Following the travel section of stories.
newtab-menu-section-unfollow = Deixar de seguir o tópico

## Context menu options for sponsored stories and new ad formats on New Tab.

newtab-menu-manage-sponsored-content = Gerenciar conteúdo patrocinado
newtab-menu-our-sponsors-and-your-privacy = Nossos patrocinadores e sua privacidade
newtab-menu-report-this-ad = Relatar este anúncio

## Message displayed in a modal window to explain privacy and provide context for sponsored content.

newtab-privacy-modal-button-done = Concluído
newtab-privacy-modal-button-manage = Gerenciar configurações de conteúdo patrocinado
newtab-privacy-modal-header = Sua privacidade é importante.
newtab-privacy-modal-paragraph-2 = Além de mostrar histórias cativantes, exibimos também conteúdos relevantes e altamente avaliados de patrocinadores selecionados. Fique tranquilo, <strong>seus dados de navegação nunca saem da sua cópia pessoal do { -brand-product-name }</strong> — nós não vemos esses dados, nem nossos patrocinadores.
newtab-privacy-modal-link = Saiba como a privacidade funciona na página de nova aba

##

# Bookmark is a noun in this case, "Remove bookmark".
newtab-menu-remove-bookmark = Remover favorito
# Bookmark is a verb here.
newtab-menu-bookmark = Adicionar aos favoritos

## Context Menu - Downloaded Menu. "Download" in these cases is not a verb,
## it is a noun. As in, "Copy the link that belongs to this downloaded item".

newtab-menu-copy-download-link = Copiar link do download
newtab-menu-go-to-download-page = Abrir página de download
newtab-menu-remove-download = Remover do histórico

## Context Menu - Download Menu: These are platform specific strings found in the context menu of an item that has
## been downloaded. The intention behind "this action" is that it will show where the downloaded file exists on the file
## system for each operating system.

newtab-menu-show-file =
    { PLATFORM() ->
        [macos] Mostrar no Finder
       *[other] Abrir pasta
    }
newtab-menu-open-file = Abrir arquivo

## Card Labels: These labels are associated to pages to give
## context on how the element is related to the user, e.g. type indicates that
## the page is bookmarked, or is currently open on another device.

newtab-label-visited = Visitado
newtab-label-bookmarked = Adicionado aos favoritos
newtab-label-removed-bookmark = Favorito removido
newtab-label-recommended = Em alta
newtab-label-saved = Salvo no { -pocket-brand-name }
newtab-label-download = Baixado
# This string is used in the story cards to indicate sponsored content
# Variables:
#   $sponsorOrSource (string) - The name of a company or their domain
newtab-label-sponsored = { $sponsorOrSource } · Patrocinado
# This string is used at the bottom of story cards to indicate sponsored content
# Variables:
#   $sponsor (string) - The name of a sponsor
newtab-label-sponsored-by = Patrocinado por { $sponsor }
# This string is used under the image of story cards to indicate source and time to read
# Variables:
#   $source (string) - The name of a company or their domain
#   $timeToRead (number) - The estimated number of minutes to read this story
newtab-label-source-read-time = { $source } · { $timeToRead } min
# This string is used under fixed size ads to indicate sponsored content
newtab-label-sponsored-fixed = Patrocinado

## Section Menu: These strings are displayed in the section context menu and are
## meant as a call to action for the given section.

newtab-section-menu-remove-section = Remover seção
newtab-section-menu-collapse-section = Recolher seção
newtab-section-menu-expand-section = Expandir seção
newtab-section-menu-manage-section = Gerenciar seção
newtab-section-menu-manage-webext = Gerenciar extensão
newtab-section-menu-add-topsite = Adicionar site preferido
newtab-section-menu-add-search-engine = Adicionar mecanismo de pesquisa
newtab-section-menu-move-up = Mover para cima
newtab-section-menu-move-down = Mover para baixo
newtab-section-menu-privacy-notice = Aviso de privacidade

## Section aria-labels

newtab-section-collapse-section-label =
    .aria-label = Recolher seção
newtab-section-expand-section-label =
    .aria-label = Expandir seção

## Section Headers.

newtab-section-header-topsites = Sites preferidos
newtab-section-header-recent-activity = Atividade recente
# Variables:
#   $provider (string) - Name of the corresponding content provider.
newtab-section-header-pocket = Recomendado pelo { $provider }
newtab-section-header-stories = Histórias que instigam o pensamento
# "picks" refers to recommended articles
newtab-section-header-todays-picks = Escolhas de hoje para você

## Empty Section States: These show when there are no more items in a section. Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.

newtab-empty-section-highlights = Comece a navegar e mostraremos aqui alguns ótimos artigos, vídeos e outras páginas que você visitou recentemente ou adicionou aos favoritos.
# Ex. When there are no more Pocket story recommendations, in the space where there would have been stories, this is shown instead.
# Variables:
#   $provider (string) - Name of the content provider for this section, e.g "Pocket".
newtab-empty-section-topstories = Você já viu tudo. Volte mais tarde para mais histórias do { $provider }. Não consegue esperar? Escolha um assunto popular para encontrar mais grandes histórias através da web.
# Ex. When there are no more story recommendations, in the space where there would have been stories, this is shown instead.
newtab-empty-section-topstories-generic = Você já viu tudo. Volte mais tarde para ver mais histórias. Não quer esperar? Escolha um assunto popular para encontrar mais grandes histórias na web.

## Empty Section (Content Discovery Experience). These show when there are no more stories or when some stories fail to load.

newtab-discovery-empty-section-topstories-header = Você está em dia!
newtab-discovery-empty-section-topstories-content = Volte mais tarde para ver mais histórias.
newtab-discovery-empty-section-topstories-try-again-button = Tentar novamente
newtab-discovery-empty-section-topstories-loading = Carregando...
# Displays when a layout in a section took too long to fetch articles.
newtab-discovery-empty-section-topstories-timed-out = Opa! Nós quase carregamos esta seção, mas não completamente.

## Pocket Content Section.

# This is shown at the bottom of the trending stories section and precedes a list of links to popular topics.
newtab-pocket-read-more = Tópicos populares:
newtab-pocket-new-topics-title = Quer ainda mais histórias? Veja esses tópicos populares do { -pocket-brand-name }
newtab-pocket-more-recommendations = Mais recomendações
newtab-pocket-learn-more = Saiba mais
newtab-pocket-cta-button = Adicionar o { -pocket-brand-name }
newtab-pocket-cta-text = Salve as histórias que você gosta no { -pocket-brand-name } e abasteça sua mente com leituras fascinantes.
newtab-pocket-pocket-firefox-family = O { -pocket-brand-name } faz parte da família { -brand-product-name }
newtab-pocket-save = Salvar
newtab-pocket-saved = Salvo

## Thumbs up and down buttons that shows over a newtab stories card thumbnail on hover.

# Clicking the thumbs up button for this story will result in more stories like this one being recommended
newtab-pocket-thumbs-up-tooltip =
    .title = Mais conteúdo como este
# Clicking the thumbs down button for this story informs us that the user does not feel like the story is interesting for them
newtab-pocket-thumbs-down-tooltip =
    .title = Não me interessa
# Used to show the user a message upon clicking the thumbs up or down buttons
newtab-toast-thumbs-up-or-down2 =
    .message = Obrigado. Sua opinião nos ajudará a melhorar seu canal de informações.
newtab-toast-dismiss-button =
    .title = Descartar
    .aria-label = Descartar

## Pocket content onboarding experience dialog and modal for new users seeing the Pocket section for the first time, shown as the first item in the Pocket section.

newtab-pocket-onboarding-discover = Conheça o melhor da web
newtab-pocket-onboarding-cta = O { -pocket-brand-name } explora uma ampla variedade de publicações para trazer os conteúdos mais informativos, inspiradores e confiáveis direto para seu navegador { -brand-product-name }.

## Error Fallback Content.
## This message and suggested action link are shown in each section of UI that fails to render.

newtab-error-fallback-info = Opa, algo deu errado ao carregar esse conteúdo.
newtab-error-fallback-refresh-link = Atualize a página para tentar novamente.

## Customization Menu

newtab-custom-shortcuts-title = Atalhos
newtab-custom-shortcuts-subtitle = Sites que você salva ou visita
newtab-custom-shortcuts-toggle =
    .label = Atalhos
    .description = Sites que você salva ou visita
# Variables
#   $num (number) - Number of rows to display
newtab-custom-row-selector =
    { $num ->
        [one] { $num } linha
       *[other] { $num } linhas
    }
newtab-custom-sponsored-sites = Atalhos patrocinados
newtab-custom-pocket-title = Recomendado pelo { -pocket-brand-name }
newtab-custom-pocket-subtitle = Conteúdo excepcional selecionado pelo { -pocket-brand-name }, parte da família { -brand-product-name }
newtab-custom-stories-toggle =
    .label = Histórias recomendadas
    .description = Conteúdo excepcional escolhido pela família { -brand-product-name }
newtab-custom-stories-personalized-toggle =
    .label = Histórias
newtab-custom-stories-personalized-checkbox-label = Histórias personalizadas com base na sua atividade
newtab-custom-pocket-sponsored = Histórias patrocinadas
newtab-custom-pocket-show-recent-saves = Mostrar salvamentos recentes
newtab-custom-recent-title = Atividade recente
newtab-custom-recent-subtitle = Uma seleção de sites e conteúdos recentes
newtab-custom-weather-toggle =
    .label = Tempo
    .description = Visão geral da previsão para hoje
newtab-custom-widget-weather-toggle =
    .label = Tempo
newtab-custom-widget-lists-toggle =
    .label = Listas
newtab-custom-widget-timer-toggle =
    .label = Temporizador
newtab-custom-widget-section-title = Widgets
newtab-custom-widget-section-toggle =
    .label = Widgets
newtab-widget-manage-title = Widgets
newtab-widget-manage-widget-button =
    .label = Gerenciar widgets
# Tooltip for close button
newtab-custom-close-menu-button =
    .title = Fechar
    .aria-label = Fechar menu
newtab-custom-close-button = Fechar
newtab-custom-settings = Gerenciar mais configurações

## New Tab Wallpapers

newtab-wallpaper-title = Fundo de tela
newtab-wallpaper-reset = Restaurar padrão
newtab-wallpaper-upload-image = Enviar uma imagem
newtab-wallpaper-custom-color = Escolher uma cor
# Variables
#   $file_size (number) - The number of the maximum image file size (in MB) that may be uploaded
newtab-wallpaper-error-max-file-size = A imagem excedeu o limite de tamanho de arquivo de { $file_size }MB. Tente enviar um arquivo menor.
newtab-wallpaper-error-upload-file-type = Não foi possível enviar o arquivo. Tente novamente com um arquivo de imagem.
newtab-wallpaper-error-file-type = Não foi possível enviar o arquivo. Tente novamente com outro tipo de arquivo.
newtab-wallpaper-light-red-panda = Panda vermelho
newtab-wallpaper-light-mountain = Montanha branca
newtab-wallpaper-light-sky = Céu com nuvens violeta e rosa
newtab-wallpaper-light-color = Formas azul, rosa e amarelo
newtab-wallpaper-light-landscape = Paisagem azul montanhosa com neblina
newtab-wallpaper-light-beach = Praia com palmeira
newtab-wallpaper-dark-aurora = Aurora boreal
newtab-wallpaper-dark-color = Formas vermelho e azul
newtab-wallpaper-dark-panda = Panda vermelho escondido na floresta
newtab-wallpaper-dark-sky = Paisagem de cidade com céu noturno
newtab-wallpaper-dark-mountain = Paisagem com montanhas
newtab-wallpaper-dark-city = Paisagem de cidade em tonalidade violeta
newtab-wallpaper-dark-fox-anniversary = Uma raposa na rua perto de uma floresta
newtab-wallpaper-light-fox-anniversary = Uma raposa em um campo gramado com uma paisagem montanhosa enevoada

## Solid Colors

newtab-wallpaper-category-title-colors = Cores sólidas
newtab-wallpaper-blue = Azul
newtab-wallpaper-light-blue = Azul claro
newtab-wallpaper-light-purple = Roxo claro
newtab-wallpaper-light-green = Verde claro
newtab-wallpaper-green = Verde
newtab-wallpaper-beige = Bege
newtab-wallpaper-yellow = Amarelo
newtab-wallpaper-orange = Laranja
newtab-wallpaper-pink = Rosa
newtab-wallpaper-light-pink = Rosa claro
newtab-wallpaper-red = Vermelho
newtab-wallpaper-dark-blue = Azul escuro
newtab-wallpaper-dark-purple = Roxo escuro
newtab-wallpaper-dark-green = Verde escuro
newtab-wallpaper-brown = Marrom

## Abstract

newtab-wallpaper-category-title-abstract = Abstrato
newtab-wallpaper-abstract-green = Formas em tons de verde
newtab-wallpaper-abstract-blue = Formas em tons de azul
newtab-wallpaper-abstract-purple = Formas em tons de roxo
newtab-wallpaper-abstract-orange = Formas em tons de laranja
newtab-wallpaper-gradient-orange = Gradiente laranja e rosa
newtab-wallpaper-abstract-blue-purple = Formas em tons de azul e roxo
newtab-wallpaper-abstract-white-curves = Branco com curvas sombreadas
newtab-wallpaper-abstract-purple-green = Gradiente de luz roxo e verde
newtab-wallpaper-abstract-blue-purple-waves = Formas onduladas em azul e roxo
newtab-wallpaper-abstract-black-waves = Formas onduladas pretas

## Firefox

newtab-wallpaper-category-title-photographs = Fotos
newtab-wallpaper-beach-at-sunrise = Praia ao ao nascer do sol
newtab-wallpaper-beach-at-sunset = Praia ao pôr do sol
newtab-wallpaper-storm-sky = Céu de tempestade
newtab-wallpaper-sky-with-pink-clouds = Céu com nuvens cor-de-rosa.
newtab-wallpaper-red-panda-yawns-in-a-tree = Panda vermelho boceja em uma árvore
newtab-wallpaper-white-mountains = Montanhas brancas
newtab-wallpaper-hot-air-balloons = Cores variadas de balões de ar quente durante o dia
newtab-wallpaper-starry-canyon = Noite estrelada azul
newtab-wallpaper-suspension-bridge = Fotografia de ponte totalmente suspensa cinza durante o dia
newtab-wallpaper-sand-dunes = Dunas de areia branca
newtab-wallpaper-palm-trees = Silhueta de coqueiros durante o entardecer
newtab-wallpaper-blue-flowers = Fotografia de perto de flores de pétalas azuis a desabrochar
# Variables
#   $author_string (String) - The name of the creator of the photo.
#   $webpage_string (String) - The name of the webpage where the photo is located.
newtab-wallpaper-attribution = Foto de <a data-l10n-name="name-link">{ $author_string }</a> em <a data-l10n-name="webpage-link">{ $webpage_string }</a>
newtab-wallpaper-feature-highlight-header = Experimente um toque de cores
newtab-wallpaper-feature-highlight-content = Dê um novo visual à página de nova aba com fundos de tela.
newtab-wallpaper-feature-highlight-button = OK
# Tooltip for dismiss button
feature-highlight-dismiss-button =
    .title = Descartar
    .aria-label = Fechar aviso
feature-highlight-wallpaper =
    .title = { -newtab-wallpaper-feature-highlight-header }
    .aria-label = { -newtab-wallpaper-feature-highlight-content }

## Firefox

newtab-wallpaper-category-title-firefox = { -brand-product-name }

## Celestial

# “Celestial” referring to astronomy; positioned in or relating to the sky,
# or outer space as observed in astronomy.
# Not to be confused with religious definition of the word.
newtab-wallpaper-category-title-celestial = Celestial
newtab-wallpaper-celestial-lunar-eclipse = Eclipse lunar
newtab-wallpaper-celestial-earth-night = Foto noturna de órbita baixa da Terra
newtab-wallpaper-celestial-starry-sky = Céu estrelado
newtab-wallpaper-celestial-eclipse-time-lapse = Lapso de tempo de eclipse lunar
newtab-wallpaper-celestial-black-hole = Ilustração de galáxia com buraco negro
newtab-wallpaper-celestial-river = Imagem de satélite de rio

## New Tab Weather

# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast =
    .title = Ver previsão do tempo em { $provider }
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-sponsored = { $provider } ∙ Patrocinado
newtab-weather-menu-change-location = Mudar local
newtab-weather-change-location-search-input-placeholder =
    .placeholder = Pesquisar local
    .aria-label = Pesquisar local
newtab-weather-menu-weather-display = Exibição do tempo
newtab-weather-todays-forecast = Previsão de hoje
newtab-weather-see-full-forecast = Ver previsão completa
# Display options are:
# - Simple: Displays a current weather condition icon and the current temperature
# - Detailed: Include simple information plus a short text summary: e.g. "Mostly cloudy"
newtab-weather-menu-weather-display-option-simple = Simples
newtab-weather-menu-change-weather-display-simple = Mudar para exibição simples
newtab-weather-menu-weather-display-option-detailed = Detalhada
newtab-weather-menu-change-weather-display-detailed = Mudar para exibição detalhada
newtab-weather-menu-temperature-units = Unidades de temperatura
newtab-weather-menu-temperature-option-fahrenheit = Fahrenheit
newtab-weather-menu-temperature-option-celsius = Celsius
newtab-weather-menu-change-temperature-units-fahrenheit = Mudar para Fahrenheit
newtab-weather-menu-change-temperature-units-celsius = Mudar para Celsius
newtab-weather-menu-hide-weather-v2 = Ocultar previsão do tempo
newtab-weather-menu-hide-weather = Ocultar tempo em nova aba
newtab-weather-menu-learn-more = Saiba mais
newtab-weather-menu-detect-my-location = Detectar minha localização
# This message is shown if user is working offline
newtab-weather-error-not-available = Dados sobre o tempo não estão disponíveis no momento.
newtab-weather-opt-in-see-weather = Quer ver a previsão do tempo na sua localização?
newtab-weather-opt-in-not-now =
    .label = Agora não
newtab-weather-opt-in-yes =
    .label = Sim
# We'll be showing static (fake) weather data if the user has not opted in to using their location
newtab-weather-static-city = Cidade de Nova York
# Variables:
#   $provider (string) - Service provider for weather data
newtab-weather-see-forecast-description =
    .title = Ver previsão do tempo em { $provider }
    .aria-description = { $provider } ∙ Patrocinado

## Topic Labels

newtab-topic-label-business = Negócios
newtab-topic-label-career = Carreira
newtab-topic-label-education = Educação
newtab-topic-label-arts = Entretenimento
newtab-topic-label-food = Alimentação
newtab-topic-label-health = Saúde
newtab-topic-label-hobbies = Jogos
# ”Money” = “Personal Finance”, refers to articles and stories that help readers better manage
# and understand their personal finances – from saving money to buying a home. See the
# “Curated by our editors“ section at the top of https://getpocket.com/explore/personal-finance for more context
newtab-topic-label-finance = Dinheiro
newtab-topic-label-society-parenting = Criação dos filhos
newtab-topic-label-government = Política
newtab-topic-label-education-science = Ciências
# ”Life Hacks” = “Self Improvement”, refers to articles and stories aimed at helping readers improve various
# aspects of their lives – from mental health to  productivity. See the “Curated by our editors“ section
# at the top of https://getpocket.com/explore/self-improvement for more context.
newtab-topic-label-society = Aperfeiçoamento pessoal
newtab-topic-label-sports = Esportes
newtab-topic-label-tech = Tecnologia
newtab-topic-label-travel = Viagens
newtab-topic-label-home = Casa e jardim

## Topic Selection Modal

# “fine-tune” refers to the process of making small adjustments to something to get
# the best or desired experience or performance.
newtab-topic-selection-title = Selecione tópicos para ajustar seu feed
# “tailored” refers to process of (a tailor) making (clothes) to fit individual customers.
# In other words, “Our expert curators prioritize stories to fit your selected interests”
newtab-topic-selection-subtitle = Escolha dois ou mais tópicos. Nossos consultores especializados priorizam histórias adaptadas aos seus interesses. Atualize quando quiser.
newtab-topic-selection-save-button = Salvar
newtab-topic-selection-cancel-button = Cancelar
newtab-topic-selection-button-maybe-later = Talvez mais tarde
newtab-topic-selection-privacy-link = Saiba como protegemos e gerenciamos dados
newtab-topic-selection-button-update-interests = Atualize seus interesses
newtab-topic-selection-button-pick-interests = Escolha seus interesses

## Content Feed Sections
## "Follow", "unfollow", and "following" are social media terms that refer to subscribing to or unsubscribing from a section of stories.
## e.g. Following the travel section of stories.

newtab-section-follow-button = Seguir
newtab-section-following-button = Seguindo
newtab-section-unfollow-button = Parar de seguir
# A modal may appear next to the Follow button, directing users to try out the feature
newtab-section-follow-highlight-title = Personalize seu canal de notícias
newtab-section-follow-highlight-subtitle = Siga o que você se interessa para aparecer mais do que você gosta.

## Button to block/unblock listed topics
## "Block", "unblocked", and "blocked" are social media terms that refer to hiding a section of stories.
## e.g. Blocked the politics section of stories.

newtab-section-block-button = Bloquear
newtab-section-blocked-button = Bloqueado
newtab-section-unblock-button = Desbloquear

## Confirmation modal for blocking a section

newtab-section-cancel-button = Agora não
newtab-section-confirm-block-topic-p1 = Tem certeza que quer bloquear este tópico?
newtab-section-confirm-block-topic-p2 = Tópicos bloqueados não aparecerão mais no seu canal de informações.
# Variables:
#   $topic (string) - Name of topic that user is blocking
newtab-section-block-topic-button = Bloquear { $topic }

## Strings for custom wallpaper highlight

newtab-section-mangage-topics-title = Tópicos
newtab-section-manage-topics-button-v2 =
    .label = Gerenciar tópicos
newtab-section-mangage-topics-followed-topics = Seguido
newtab-section-mangage-topics-followed-topics-empty-state = Você ainda não seguiu nenhum tópico.
newtab-section-mangage-topics-blocked-topics = Bloqueado
newtab-section-mangage-topics-blocked-topics-empty-state = Você ainda não bloqueou nenhum tópico.
newtab-custom-wallpaper-title = Agora você pode usar fundos de tela personalizados
# 'Make firefox yours" means to customize or personalize
newtab-custom-wallpaper-subtitle = Envie seu próprio fundo de tela ou escolha uma cor personalizada para deixar o { -brand-product-name } do seu jeito.
newtab-custom-wallpaper-cta = Experimentar

## Strings for new user activation custom wallpaper highlight

newtab-new-user-custom-wallpaper-title = Escolha um fundo de tela para deixar o { -brand-product-name } do seu jeito
newtab-new-user-custom-wallpaper-subtitle = Sinta-se em casa em cada nova aba, com fundos de tela e cores personalizados.
newtab-new-user-custom-wallpaper-cta = Experimentar agora

## Strings for download mobile highlight

newtab-download-mobile-highlight-title = Instale o { -brand-product-name } para dispositivos móveis
# "Scan the code" refers to scanning the QR code that appears above the body text that leads to Firefox for mobile download.
newtab-download-mobile-highlight-body-variant-a = Capture o código para navegar com segurança em qualquer lugar.
newtab-download-mobile-highlight-body-variant-b = Continue de onde parou ao sincronizar suas abas, senhas e muito mais.
newtab-download-mobile-highlight-body-variant-c = Sabia que você pode levar o { -brand-product-name } para qualquer lugar? O mesmo navegador. No seu bolso.
newtab-download-mobile-highlight-image =
    .aria-label = Código QR para instalar o { -brand-product-name } de dispositivos móveis

## Strings for shortcuts highlight

newtab-shortcuts-highlight-title = Seus preferidos na ponta dos dedos.
newtab-shortcuts-highlight-subtitle = Adicione um atalho para manter seus sites preferidos a um clique de distância.

## Strings for reporting issues with ads and content

newtab-report-content-why-reporting-this =
    .label = Por que você está relatando isto?
newtab-report-ads-reason-not-interested =
    .label = Não estou interessado
newtab-report-ads-reason-inappropriate =
    .label = É inapropriado
newtab-report-ads-reason-seen-it-too-many-times =
    .label = Já vi isso demais.
newtab-report-content-wrong-category =
    .label = Categoria errada
newtab-report-content-outdated =
    .label = Desatualizado
newtab-report-content-inappropriate-offensive =
    .label = Impróprio ou ofensivo
newtab-report-content-spam-misleading =
    .label = Spam ou enganoso
newtab-report-content-requires-payment-subscription =
    .label = Requer pagamento ou assinatura
newtab-report-content-requires-payment-subscription-learn-more = Saiba mais
newtab-report-cancel = Cancelar
newtab-report-submit = Enviar
newtab-toast-thanks-for-reporting =
    .message = Obrigado por informar isto.

## Strings for task / to-do list productivity widget

# "Add one" means adding a new task to the list (e.g., "Walk the dog")
newtab-widget-lists-empty-cta = As possibilidades são infinitas. Adicione uma tarefa.
# A simple label next to the default list name letting users know this is a new / beta feature
newtab-widget-lists-label-new =
    .label = Novidade
newtab-widget-lists-label-beta =
    .label = Beta
# When tasks have been previous marked as complete, they will appear in their own separate list beneath incomplete items
# Variables:
#   $number (number) - Amount of list items marked complete
newtab-widget-lists-completed-list = Tarefas concluídas { $number }
newtab-widget-task-list-menu-copy = Copiar
newtab-widget-lists-menu-edit = Editar nome da lista
newtab-widget-lists-menu-create = Criar nova lista
newtab-widget-lists-menu-delete = Excluir esta lista
newtab-widget-lists-menu-copy = Copiar lista para a área de transferência
newtab-widget-lists-menu-hide = Ocultar todas as listas
newtab-widget-lists-menu-learn-more = Saiba mais
newtab-widget-lists-input-add-an-item =
    .placeholder = Adicionar um item
newtab-widget-lists-input-error = Inclua texto para adicionar um item.
newtab-widget-lists-input-menu-open-link = Abrir link
newtab-widget-lists-input-menu-move-up = Para cima
newtab-widget-lists-input-menu-move-down = Para baixo
newtab-widget-lists-input-menu-delete = Excluir
newtab-widget-lists-input-menu-edit = Editar
# the + symbol emphasises the functionality of adding a new list
newtab-widget-lists-dropdown-create =
    .label = + Criar nova lista
newtab-widget-lists-name-label-default =
    .label = Lista de tarefas
newtab-widget-lists-name-placeholder-default =
    .placeholder = Lista de tarefas
# The placeholder value of the name field for a newly created list
newtab-widget-lists-name-placeholder-new =
    .placeholder = Nova lista
newtab-widget-section-title = Widgets
# Tooltip for hide all widgets button
newtab-widget-section-hide-all-button =
    .title = Ocultar widgets
    .aria-label = Ocultar todos os widgets
newtab-widget-section-maximize =
    .title = Expandir widgets
    .aria-label = Expandir todos os widgets para tamanho completo
newtab-widget-section-minimize =
    .title = Minimizar widgets
    .aria-label = Reduzir todos os widgets para tamanho compacto

## Strings for timer productivity widget
## When the timer ends, a system notification may be shown. Depending on which mode the timer is in, that message would be shown

newtab-widget-timer-notification-title = Temporizador
newtab-widget-timer-notification-focus = O período de concentração acabou. Bom trabalho. Precisa de um intervalo?
newtab-widget-timer-notification-break = O intervalo acabou. Pronto para se concentrar novamente?
newtab-widget-timer-notification-warning = As notificações estão desativadas
newtab-widget-timer-mode-focus =
    .label = Foco
newtab-widget-timer-mode-break =
    .label = Intervalo
newtab-widget-timer-label-play =
    .label = Iniciar
newtab-widget-timer-label-pause =
    .label = Pausar
newtab-widget-timer-reset =
    .title = Redefinir
newtab-widget-timer-menu-notifications = Desativar notificações
newtab-widget-timer-menu-notifications-on = Ativar notificações
newtab-widget-timer-menu-hide = Esconder o temporizador
newtab-widget-timer-menu-learn-more = Saiba mais
# The title displays above a set of top news headlines.
newtab-daily-briefing-card-title = Principais notícias
newtab-daily-briefing-card-menu-dismiss = Descartar
# Variables:
#   $minutes (number) - Time since the feed has been refreshed
newtab-daily-briefing-card-timestamp = Atualizado há { $minutes } minutos
newtab-widget-message-title = Mantenha a concentração com listas e um temporizador integrado
# to-dos stands for "things to do".
newtab-widget-message-copy = Desde lembretes rápidos a tarefas diárias, com sessões de concentração e intervalos para estivar as pernas — cumpra tarefas e prazos.
newtab-promo-card-title = Apoie o { -brand-product-name }
newtab-promo-card-body = Nossos patrocinadores apoiam nossa missão de construir uma web melhor
newtab-promo-card-cta = Saiba mais
newtab-promo-card-dismiss-button =
    .title = Descartar
    .aria-label = Descartar

## Strings for activation window message variants. In certain experiment configurations,
## the strings from these variants may be displayed in a message below the search input
## for the first 48 hours of a new profile's lifetime. Some messages include buttons with
## labels, but not all.

newtab-activation-window-message-dismiss-button =
    .title = Descartar
    .aria-label = Descartar
# "This space" refers to about:newtab. The call to action here ("make it your own")
# is to customize newtab with a background image or colour, or by tweaking the
# existing widgetry that appears on it.
newtab-activation-window-message-customization-focus-header = Deixe este espaço do seu jeito
newtab-activation-window-message-customization-focus-message = Escolha um novo fundo de tela, adicione atalhos para seus sites preferidos e mantenha-se atualizado sobre histórias do seu interesse.
newtab-activation-window-message-customization-focus-primary-button =
    .label = Iniciar personalização
# "This space" refers to about:newtab. The sentiment of "plays by your rules" is
# meant to evoke the idea that newtab is malleable and customizable. The call to
# action is to customize newtab with a background image or colour, or by tweaking
# the existing widgetry that appears on it.
newtab-activation-window-message-values-focus-header = Este espaço segue suas regras
newtab-activation-window-message-values-focus-message = O { -brand-product-name } permite navegar do jeito que você quiser, com uma maneira mais pessoal de iniciar o dia online. Deixe o { -brand-product-name } do seu jeito.

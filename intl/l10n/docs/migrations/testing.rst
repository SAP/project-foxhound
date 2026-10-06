.. role:: bash(code)
   :language: bash

.. role:: js(code)
   :language: javascript

.. role:: python(code)
   :language: python

=============================
How to Test Migration Recipes
=============================

To test migration recipes, use the following mach command:

.. code-block:: bash

  ./mach fluent-migration-test python/l10n/fluent_migrations/bug_1485002_newtab.py

This will analyze your migration recipe to check that the :python:`migrate`
function exists, and interacts correctly with the migration context. Once that
passes, it clones :bash:`firefox-l10n-source` into :bash:`$OBJDIR/python/l10n`, creates a
reference localization by adding your local Fluent strings to the ones in
:bash:`firefox-l10n-source`. It then runs the migration recipe, both as dry run and
as actual migration. Finally it analyzes the generated commits and the migrated
strings, and prints a summary of any problems it finds.

In most cases, a successful execution will only output the script execution,
with no summary:

.. code-block:: bash

  Running migration fluent_migrations.bug_1994180_fix_manage_extensions_reference for en-US
  Writing to /path/to/gecko/python/l10n/bug_1994180_fix_manage_extensions_reference/en-US/browser/browser/unifiedExtensions.ftl
  Committing changeset: Bug 1994180 - Change unified-extensions-item-message-manage reference to unified-extensions-manage-extensions.label, part 1
  Writing to /path/to/gecko/python/l10n/bug_1994180_fix_manage_extensions_reference/en-US/browser/browser/unifiedExtensions.ftl
  Committing changeset: Bug 1994180 - Change unified-extensions-item-message-manage reference to unified-extensions-manage-extensions.label, part 2

Reading the diff
----------------

When there are differences between the migrated files and the reference content,
the command prints a unified diff for each affected file (blank lines are
automatically ignored). The diff is a visual aid only; the classification of each
difference is in the summary described below.

There are cases where a diff is expected, even if the recipe is correct:

- If the patch includes new strings that are not being migrated, the diff
  output will show these as removals. This occurs because the migration recipe
  test contains the latest version of strings from :bash:`firefox-l10n-source` with
  only migrations applied, while the reference file contains all string changes
  being introduced by the patch.
- If there are pending changes to FTL files included in the recipe that landed
  in the last few days, and haven't been pushed to :bash:`firefox-l10n-source` yet
  (they're in the :bash:`update` branch of :bash:`firefox-l10n-source`), these will
  show up as additions.

Both cases involve messages that are not migrated by the recipe, so they are
reported as ignorable :bash:`INFO` notes in the summary.

Test summary
------------

After the script execution and any diff, the command prints a summary grouping
all findings by severity, with ignorable notes first and errors last, for
example:

.. code-block:: bash

  Fluent migration test summary:
    INFO: browser/browser/preferences/containers.ftl: the following messages differ but are not part of the migration recipe, so they can be ignored: containers-name-text2
    WARNING: toolkit/toolkit/global/contextual-identity.ftl: migrated message user-context-color-blue differs from the reference only in capitalization
    ERROR: toolkit/toolkit/global/contextual-identity.ftl: message user-context-color-turquoise is part of the migration recipe but was not migrated

The severity levels are:

- :bash:`INFO`: messages that differ in the diff but are not migrated by the
  recipe. These should be safe to ignore, and cover the expected-diff cases above
  (new strings in the patch, or pending strings still in quarantine).
- :bash:`WARNING`: a migrated message that differs from the reference only in
  capitalization. These are often acceptable but worth reviewing.
- :bash:`ERROR`: a problem with the recipe. The command exits with a non-zero
  status whenever any error is reported. Errors include:

  - A message that is part of the recipe but was not migrated.
  - A migrated message whose value differs from the reference beyond
    capitalization.
  - An attempt to migrate a message from the same ID in the same file.
  - A missing or wrong bug number, or commit messages without :bash:`part {index}`.

The example output below highlights an instance where a migration failed to
migrate a change to a string reference from
:bash:`{ unified-extensions-item-message-manage }` to
:bash:`{ unified-extensions-manage-extensions.label }`. The diff shows the
difference, and the summary reports it as an error:

.. code-block:: bash

    Running migration fluent_migrations.bug_1994180_fix_manage_extensions_reference for en-US
    Writing to /path/to/gecko/python/l10n/bug_1994180_fix_manage_extensions_reference/en-US/browser/browser/unifiedExtensions.ftl
    Committing changeset: Bug 1994180 - Change unified-extensions-item-message-manage reference to unified-extensions-manage-extensions.label, part 1
    Writing to /path/to/gecko/python/l10n/bug_1994180_fix_manage_extensions_reference/en-US/browser/browser/unifiedExtensions.ftl
    Committing changeset: Bug 1994180 - Change unified-extensions-item-message-manage reference to unified-extensions-manage-extensions.label, part 2
  --- /path/to/gecko/python/l10n/bug_1994180_fix_manage_extensions_reference/reference/browser/browser/unifiedExtensions.ftl
  +++ /path/to/gecko/python/l10n/bug_1994180_fix_manage_extensions_reference/en-US/browser/browser/unifiedExtensions.ftl
  @@ -17,8 +17,8 @@
    unified-extensions-empty-reason-extension-not-enabled = You have extensions installed, but not enabled
    # In this headline, “Level up” means to enhance your browsing experience.
    unified-extensions-empty-reason-zero-extensions-onboarding = Level up your browsing with extensions
    -unified-extensions-empty-content-explain-enable2 = Select “{ unified-extensions-manage-extensions.label }” to enable them in settings.
    -unified-extensions-empty-content-explain-manage2 = Select “{ unified-extensions-manage-extensions.label }” to manage them in settings.
    +unified-extensions-empty-content-explain-enable2 = Select “{ unified-extensions-item-message-manage }” to enable them in settings.
    +unified-extensions-empty-content-explain-manage2 = Select “{ unified-extensions-item-message-manage }” to manage them in settings.
    unified-extensions-empty-content-explain-extensions-onboarding = Personalize { -brand-short-name } by changing how it looks and performs or boosting privacy and safety.

  Fluent migration test summary:
    ERROR: browser/browser/unifiedExtensions.ftl: migrated message unified-extensions-empty-content-explain-enable2 differs from the reference
    ERROR: browser/browser/unifiedExtensions.ftl: migrated message unified-extensions-empty-content-explain-manage2 differs from the reference

This indicates that the string value being generated by the migration
(:bash:`Select “{ unified-extensions-item-message-manage }” to enable them in settings.`)
differs from the intended string value included in the Fluent file of the patch
(:bash:`{ unified-extensions-manage-extensions.label }`), so the recipe needs to be fixed.

You can inspect the generated repository further by looking at

.. code-block:: bash

  ls $OBJDIR/python/l10n/bug_1485002_newtab/en-US

Caveats
-------

Be aware of hard-coded English context in migration. Consider for example:


.. code-block:: python

  ctx.add_transforms(
          "browser/browser/preferences/siteDataSettings.ftl",
          "browser/browser/preferences/siteDataSettings.ftl",
          transforms_from(
  """
  site-usage-persistent = { site-usage-pattern } (Persistent)
  """)
  )


This Transform will pass a manual comparison, since the two files are identical,
but will result in :js:`(Persistent)` being hard-coded in English for all
languages.

firefox-l10n-source repository
------------------------------

`firefox-l10n-source`_ is a unified repository including strings for all
shipping versions of Firefox, and is also used as a buffer before exposing strings
to localizers. There are typically two branches available, :bash:`main` and
:bash:`update`. The :bash:`main` branch acts as the source of truth for all
available strings exposed for localizaiton, while :bash:`update` acts as a
string quarantine. Migrations are run at the same time that strings are exposed
to localizers, that is when strings in :bash:`update` are merged into :bash:`main`.

When testing fluent recipes, the :bash:`fluent-migration-test` script relies on a
local clone of :bash:`firefox-l10n-source` located in :bash:`~/.mozbuild/l10n-source`.
When the mach command is run, the script either clones the remote repo if it doesn't
exist or pulls the latest changesets if :bash:`.git/l10n_pull_marker` is older than
2 days. Otherwise the current version is used.

Some advanced testing can be done by making changes in :bash:`~/.mozbuild/l10n-source`
such as checking out previous commits or adding strings manually. You can also force
sync to get the latest strings (if some have merged into :bash:`main` within the
2 day window) by manually pulling updates with git or by removing
:bash:`.git/l10n_pull_marker`.

.. _firefox-l10n-source: https://github.com/mozilla-l10n/firefox-l10n-source/

Ruff
====

`Ruff <https://github.com/charliermarsh/ruff>`_ is an extremely fast Python
linter and formatter, written in Rust. It can process all of mozilla-central in
under a second, and implements rule sets from a large array of Python linters
and formatters, including:

* flake8 (pycodestyle, pyflakes and mccabe)
* isort
* pylint
* pyupgrade
* and many many more!

Run Locally
-----------

The mozlint integration of ruff can be run using mach:

.. parsed-literal::

   $ mach lint --linter ruff <file paths>


Configuration
-------------

Ruff is configured in the root :searchfox:`pyproject.toml` file. Additionally, ruff will
pick up any ``pyproject.toml`` or ``ruff.toml`` files in subdirectories. The
settings in these files will only apply to files contained within these
subdirs. For more details on configuration discovery, see the `configuration
documentation`_.

For a list of options, see the `settings documentation`_.

Sources
-------

* :searchfox:`Configuration (YAML) <tools/lint/ruff.yml>`
* :searchfox:`Source <tools/lint/python/ruff.py>`

.. _configuration documentation: https://beta.ruff.rs/docs/configuration/
.. _settings documentation: https://beta.ruff.rs/docs/settings/

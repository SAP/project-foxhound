Enabling Rules and Adding Plugins to Stylelint
==============================================

This guide is intended to give helpful pointers on how to enable rules and add
plugins to our Stylelint configuration.

.. contents::
    :local:

General Notes
=============

* Enabling of new rules and adding plugins should happen in agreement with the
  `Desktop Theme module owner and peers </mots/index.html#desktop-theme>`_.

Enabling a New Rule
===================

The general process for enabling new rules is to file a bug under the
``Developer Infrastructure`` product in the ``Lint and Formatting`` component.

The rule should then be added to the relevant configurations and existing issues
fixed. For large amounts of existing issues, we may do a staged roll-out
as discussed below.

Options for Roll-Outs
---------------------

For rolling out new rules, we prefer that there is a plan and owner for ensuring
the existing failures are resolved over time. They do not always need to be fixed
immediately, but there should be some agreement as to how existing failures
are addressed, so that we do not end up with a large, potentially complicated
set of exclusions, or significant amounts of warnings that never get addressed.

This is not to say the developer adding the rule needs to be the owner of the
plan, but they should ensure that there is an agreed way forward.

There are several options available for roll-outs, depending on how many
errors are found and how much work it is to fix existing issues.

* Fix any issues and enable the rule everywhere

    * This is most suited to cases where there are a small amount of errors which
      are easy to fix up-front

* Enable the rule everywhere, selectively disabling the rule on existing failures

    * This may be appropriate for cases where fixing the failures may take
      a bit longer.

* Enable the rule as a warning

    * This will raise issues as warnings, which will not prevent patches from
      landing with issues, but should at least highlight them during code review.
    * This may be more appropriate in situations where there are a large amount
      of issues that are non-critical, such as preferring use of one method over
      another.

* Enable the rule as an error on passing code, but a warning on code with failures

    * This is a hybrid approach which is suited to cases where there is an issue
      that is more critical, and we want to stop new cases making it into the tree,
      and highlight the existing cases if the code gets touched.

The options here are not firmly set, the list should be used as a guide.

Where to Add
------------

Custom rules should be added in
:searchfox:`stylelint-plugin-mozilla/rules <tools/lint/stylelint/stylelint-plugin-mozilla/rules>`
and exported through the :searchfox:`index.mjs <tools/lint/stylelint/stylelint-plugin-mozilla/rules/index.mjs>`
file. When naming a custom rule, be sure to use the
:searchfox:`namespace helper function <tools/lint/stylelint/stylelint-plugin-mozilla/helpers.mjs>`
to prefix the rule name properly.

Where existing failures are disabled/turned to warnings, these should be handled
in the :searchfox:`top-level stylelint-rollouts.config.js <stylelint-rollouts.config.js>`,
and follow-up bugs must be filed before landing and referenced in the appropriate
sections. The follow-up bugs should block
`bug 1762027 <https://bugzilla.mozilla.org/show_bug.cgi?id=1762027>`_

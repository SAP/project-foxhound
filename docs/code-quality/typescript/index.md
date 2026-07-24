# TypeScript
In firefox-main, we are introducing the use of [TypeScript](https://www.typescriptlang.org/)
to help provide type autocompletion, static analysis and type checking of our
JavaScript code.

:::{note}
At the moment we are in the bootstrap/experimentation phase, there are various
parts of infrastructure that have not yet been created, and incomplete type
definitions which may cause issues for projects. Hence TypeScript is not
recommended for all projects for the time being.

We are currently prioritising enabling type autocompletion across the code base,
before we proceed to more work on type checking.

You can work towards enabling TypeScript by ensuring your code passes the
[ESLint jsdoc rules](https://searchfox.org/firefox-main/search?q=jsdoc%2F&path=eslint-plugin-mozilla%2Flib%2Fconfigs&case=false&regexp=false).

If you are interested, please ask in the Lint and Formatting channel (#lint:mozilla.org)
on Matrix.
:::

## Where TypeScript is Currently Enabled

TypeScript is currently only enabled on a [limited set of directories](https://searchfox.org/firefox-main/source/tools/lint/typescript.yml).

## Editor Support
VS Code has TypeScript support built-in and should work "out of the box".

For other editors, see this [TypeScript Wiki Page](https://github.com/Microsoft/TypeScript/wiki/TypeScript-Editor-Support).

## Running TypeScript Locally

The TypeScript linter may be run on the directories where it is enabled using:

```
./mach lint -l typescript path/to/file # (or to the directory)
```

## Updating Gecko Type Definitions

Updating types currently happens manually, although [we are in the process of
automating it](https://bugzilla.mozilla.org/show_bug.cgi?id=1975513).

In the meantime, developers using TypeScript must update the type definitions
[manually using some scripts](updatingTypes.md).

## Frequently Asked Questions

* Why does running TypeScript check and report errors in other files?
  * Changes in one file may impact on another, and TypeScript can detect this.
  * Additionally, the way that TypeScript works means that it will run across
    the whole project regardless, so we report all the issues that it reports.
* Will my patches get backed out due to TypeScript failures?
  * Currently no. Whilst we have a [TypeScript Linter on CI](../lint/linters/typescript.rst)
    it is currently tier-3 which is hidden from the sheriffs view.
  * Failures will however, be reported on reviews on Phabricator.
  * We will promote the linter to tier-2 and tier-1 once we have more automation
    in place for type generation.
* Why isn't this being encouraged for everyone?
  * As discussed in the note at the top of the page, we are still in the set-up
    and experimentation phase. There is a lot of infrastructure that is required
    to make TypeScript usable on a day to day basis.
* Are we planning to allow using TypeScript files and compiling directly from
  TypeScript?
  * No. In the past we've worked to avoid processing or compilation steps,
    wherever possible when developing JavaScript. This helps to reduce code-test
    cycle times and make debugging simpler.
  * Whilst it is possible we could change the approach in future, it is not an
    objective of enabling TypeScript over the firefox-main code base.
* Something isn't working as I would expect, where should I look/ask?
  * We have a [meta bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1945456)
    for TypeScript issues in firefox-main. We work through them over time, though
    we appreciate help as well.
  * See the [Getting Help](#getting-help) section.

## Getting Help

The Lint & Formatting channel (#lint:mozilla.org) on Matrix is the best place
    to ask questions.

## Further Reading

* The [TypeScript documentation](https://www.typescriptlang.org/docs/) is very
  useful in understanding how TypeScript works and how types may be set up.
  * The [JavaScript section starting here](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html),
    is especially useful for firefox-main development.

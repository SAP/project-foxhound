# Firefox AI Coding Policy

This policy applies to anyone contributing to the Firefox project. It defines expectations and requirements for any usage of AI or AI-adjacent tools when authoring production code for the browser. These guidelines may evolve as the Mozilla community gains experience.

## Philosophy

AI-assisted tools are evolving quickly, but it's clear that they present both opportunities and risks when used by developers to explore, understand, and create code. They can accelerate work and help catch issues earlier, but they also make it easy to generate code that looks right without being right.

For contributors who choose to use these tools, we trust them to do so with care, just as we trust them with every other part of Firefox's development. AI can assist, but responsibility always stays with the human behind the change.

## Responsibilities

AI-assisted contributions must meet the same standards of correctness, security, and maintainability as any other patch.

### When using AI tools:

* **Maintain quality and scope.** You are responsible for the technical excellence of your work, regardless of the tools you used. Keep patches small and focused so they're easy to review and clearly justified.
* **Understand what you submit.** You're expected to understand and be able to explain every change you make. The role of the [reviewer](./Code_Review_FAQ.rst) is to double-check the work of a human, not the output of a tool.
* **Protect sensitive data.** Do not include private, security-sensitive, or otherwise confidential information in prompts to external AI tools.

At the end of the day you are accountable for all changes you submit, regardless of the tools you use.

::: {admonition} For new contributors

"Good First" and "Good Next" bugs exist to help new contributors learn the Firefox codebase. Take these only if you intend to learn and continue contributing. Fixing a large number of these with AI tools alone is counterproductive to that goal.

:::

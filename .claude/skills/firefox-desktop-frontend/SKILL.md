---
description: You MUST use this skill when working with HTML, JS, CSS and other front-end code.
---


## Workflow
- Whenever you're building, if `./mach build` was previously run and you have not made any changes to C++ or Rust code (nor rebased past incoming changes to such code), you can use `./mach build faster` to skip the compilation and linking steps and only build the front-end code. This can save a lot of time when you're only working on the browser/ or toolkit/ code.
- CSS should use reusable tokens from the design system (in `toolkit/themes/shared/design-system`) wherever possible, to ensure consistent UI and to make it easy to change styles across the board.
- Use reusable components for common UI patterns. These components live in `toolkit/content/widgets/`. A storybook instance for these components can be accessed on https://firefoxux.github.io/firefox-desktop-components/. It is fine to use in-development components.
- Use semantic HTML elements whenever possible. For example, use `<a>` for links, `<moz-button>` or `<button>` for buttons, etc. This helps accessibility and makes the code easier to understand.
- When writing JavaScript, prefer using modern ES6+ syntax and features. For example, use `let` instead of `var`, and use arrow functions where appropriate.
- Firefox has special XUL elements specifically for floating panels (`<panel>`), tooltips (`<tooltip>`) and menus (`<menupopup>`, `<menuitem>`, `<menu>` and `<menuseparator>`). Use these elements when appropriate, as they provide built-in behavior and accessibility features.
- Firefox for Desktop needs to run successfully on Windows 10, Windows 11, macOS 10.15+, and Linux.
- Toolkit code may be shared with Android, as well as desktop versions of Thunderbird, so do not assume that code from the `browser/` directory is available for use from there - if it must be used, make sure that the `toolkit/` code can recover if it is not available.
- Ensure that your changes are accessible and work well with assistive technologies. Use semantic HTML elements, ARIA attributes, and test with screen readers and keyboard navigation.
- Ensure that your changes are performant and do not cause jank or slow down the browser. Use performance profiling tools to identify and fix any performance issues.

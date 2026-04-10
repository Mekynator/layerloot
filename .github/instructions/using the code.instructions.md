IMPORTANT RULES

* Preserve the existing LayerLoot project structure, coding style, languages, naming, and file conventions already used in the app.
* Do not introduce loose code outside React components, hooks, utilities, providers, or existing structured modules.
* Do not leave unused imports, dead code, placeholder code, broken TODOs, or partial implementations.
* Do not break existing storefront behavior outside editor mode.
* Do not break existing admin functionality.
* Do not replace working internal data-fetch patterns with broken or unnecessary `/api` routes.
* Keep database types aligned with the current schema and existing generated Database types.
* Avoid unsupported modules or patterns already known to cause issues in this project.
* Reuse existing shared helpers, providers, state patterns, UI primitives, and utility functions where possible.
* Keep TypeScript strict and clean.
* Prevent regressions in rendering, navigation, product flows, and page editor flows.
* Keep UI premium, clean, minimal, and consistent with the current project design.
* Fix spell-check issues in labels/messages you touch.
* Do not overengineer; implement the cleanest maintainable solution that fits the current architecture.

CODE QUALITY REQUIREMENTS

* Use clean TypeScript types for all new props, config objects, and helper functions.
* Add proper null/undefined guards where needed.
* Avoid duplicated logic; extract reusable helpers when appropriate.
* Prefer small maintainable components over large messy files.
* Keep state predictable and avoid unnecessary rerenders.
* Remove unused imports and variables.
* Ensure ESLint/TypeScript errors are not introduced.
* Keep code readable and production-safe.

VALIDATION REQUIREMENTS

Before finishing:

* verify no TypeScript errors in touched files
* verify no obvious ESLint issues in touched files
* verify imports are correct and used
* verify no broken JSX/TSX structure
* verify mobile and desktop behavior are still safe
* verify editor mode and storefront mode both behave correctly
* verify new UI controls actually save and render correctly
* verify no regression to existing block rendering
* verify hidden/inactive states still work correctly
* verify routing behavior remains correct outside editor mode

OUTPUT REQUIREMENTS

* Apply the changes directly in the relevant files
* Keep the implementation complete and connected end-to-end
* Do not answer with high-level theory only
* Do not leave the feature half-implemented
* At the end, summarize:

  1. files changed
  2. what was implemented
  3. validations performed
  4. any remaining manual follow-up if truly required

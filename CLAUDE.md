# Project: Node-Based Prompt Builder

## Project structure

All source code lives in src/. Never create files outside this
structure without discussing it first and explaining why.

## Key rules
- One node type per file inside src/nodes/
- All CSS in src/styles.css only, never inline styles
- All API communication in src/api/ only
- Prompt assembly logic only in src/assembly/promptAssembler.js
- Helper functions shared across multiple files go in src/utils/
- Never put logic in index.html — it is just the entry point

## When adding a new file
Tell me where you are putting it, what folder it belongs in,
and why before creating it.

## Naming conventions
- Node files: PascalCase ending in Node — e.g. CameraNode.js
- Panel files: PascalCase ending in Panel — e.g. CostPanel.js
- Utility files: camelCase ending in Utils — e.g. imageUtils.js
- Everything else: camelCase

## Comment style — mandatory on every file

Function comments:
/**
 * What this does in one plain sentence.
 * Why it exists and what problem it solves.
 */

Inline comments: written above the line they describe,
in plain English for a non-developer reader.

## Living documents — update after every meaningful step
- HOW_THIS_WORKS.md after each completed feature
- DECISIONS.md after each technical decision
- BUGS_AND_FIXES.md after each bug is resolved
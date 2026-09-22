# Handoff: Closure `goog.getMsg` variable names do not match ngc

Found 2026-09-22 while working on `t3code/fix-angular-i18n-bugs`. Deliberately left unfixed
there to keep that PR to the two i18n bugs it set out to fix. Nothing in this document is
speculative: every claim below was reproduced against the compiler as built on that branch.

## Symptom

`i18NUseExternalIds` (the N-API option, note the capital N) only takes effect for messages that
carry an explicit `@@id`. For messages with an auto-generated id, oxc emits the local-style name
in both modes, where ngc always emits the external form.

Reproduce from `napi/angular-compiler` after `pnpm run build:native`:

```js
const { transformAngularFileSync } = require('./index.js')
const src = `import {Component} from '@angular/core';
@Component({selector:'app-x', standalone:true, template:'<div i18n="@@myId">Hello</div><p i18n>Bye</p>'})
export class XComponent {}`
const r = transformAngularFileSync(src, 'src/app/x.component.ts', {})
console.log([...new Set([...r.code.matchAll(/MSG_[A-Za-z0-9_$]+/g)].map((m) => m[0]))])
```

Actual:

```
MSG_EXTERNAL_myId$$SRC_APP_X_COMPONENT_TS__0
MSG_SRC_APP_X_COMPONENT_TS__1
```

Expected (what ngc 21.x/22.x emits for the same input):

```
MSG_EXTERNAL_myId$$SRC_APP_X_COMPONENT_TS_0
MSG_EXTERNAL_<decimalDigest of "Bye">$$SRC_APP_X_COMPONENT_TS_1
```

Two defects: the missing `EXTERNAL_<id>$$` for auto-generated ids, and an extra underscore
before the counter in every name.

## Who this affects

Only builds that run the emitted `goog.getMsg` branch through the Closure Compiler, where the
`MSG_EXTERNAL_<id>` name is how Angular's message id reaches Closure's translation extraction.
With the wrong name, XTB translations keyed by Angular's message ids are not applied.

It does not affect `$localize` / `@angular/localize`, which is what the Angular CLI and the Vite
plugin use: those ids live in the `$localize` metadata block and are correct. `ngI18nClosureMode`
is undefined in a CLI build, so the `goog.getMsg` branch is dead code there.

## Root cause

`generate_closure_var_name` in `crates/oxc_angular_compiler/src/pipeline/phases/i18n_closure.rs:426`
takes the id from the call site in
`crates/oxc_angular_compiler/src/pipeline/phases/i18n_const_collection.rs:534`:

```rust
msg_info.message_id.as_deref().or(msg_info.custom_id.as_deref()),
```

`message_id` traces back to `I18nMessage::id`, which is only ever set to the empty string:
`crates/oxc_angular_compiler/src/transform/html_to_r3.rs:4998` (`id: Ident::from("")`).
Nothing ever computes it, so the `use_external_ids` branch falls through to the same format
string as the local branch.

The extra underscore is in the format strings themselves: `generate_file_based_i18n_suffix`
(`i18n_closure.rs:456`) already appends `_`, as Angular's `fileBasedI18nSuffix` does, and then
both branches of `generate_closure_var_name` append another `_` before the counter.

## What Angular does

Reference: `node_modules/@angular/compiler/fesm2022/compiler.mjs` (21.2.6 line numbers).

- `18290`: `message.id = meta instanceof Message && meta.id || decimalDigest(message)` - every
  message gets an id at meta-visit time, custom id if present, otherwise the decimal digest.
- `431`: `decimalDigest(message)` is `computeMsgId(serializedParts.join(''), message.meaning)`.
- `18648`: `i18nGenerateClosureVar`, external mode is
  `MSG_EXTERNAL_${sanitizeIdentifier(messageId)}$$${pool.uniqueName(suffix)}`, local mode is
  `pool.uniqueName(getTranslationConstPrefix(suffix))`.
- `18503`: `fileBasedI18nSuffix` is the relative path uppercased with non-alphanumerics replaced,
  plus a trailing `_`.
- `2215`: `ConstantPool.uniqueName` appends the count unconditionally, so the counter contributes
  `0`, `1`, ... with no separator of its own.

## Suggested fix

1. Populate the id. oxc already has the port of `decimalDigest`:
   `compute_decimal_digest` in `crates/oxc_angular_compiler/src/i18n/digest.rs:34`, and
   `decimal_digest` at `:29` which already implements "custom id if set, else compute". Call it
   where the i18n `Message` exists, i.e. in `html_to_r3.rs` alongside the existing
   `compute_msg_id` call at `:1316`, and store the result in `I18nMessage::id` instead of `""`.
   The three message factories to cover are `create_message` (`html_to_r3.rs:435`),
   `create_icu_message` (`:1309`) and `create_attribute_message` (`:3294`).
2. Drop the extra `_` from both format strings in `generate_closure_var_name`.
3. Confirm the counter still lines up with ngc when a file mixes custom-id and auto-id messages
   (Angular keys its counter on the suffix in external mode and on `MSG_<SUFFIX>` in local mode;
   oxc uses one counter per file, which should be equivalent, but it is worth a fixture).

### Why this is low risk

The `$localize` path does not read `message_id`. It uses `custom_id` only:
`i18n_const_collection.rs:568`, `:720` and `serialize_i18n_head` at `:836`. Populating
`message_id` therefore changes the Closure variable name and nothing else. Verify that claim
holds after the change by re-running the compare fixtures, which compare the `$localize` output
in full.

## The coverage trap

The compare tool cannot currently catch any of this. `canonicalizeNode` in
`napi/angular-compiler/e2e/compare/src/compare.ts:2804` rewrites every identifier starting with
`MSG_` to `MSG_0`, `MSG_1`, ... before comparing, and the behaviour is documented as intentional
at `:2713`. So all 262 i18n fixtures pass today with the wrong names, and would keep passing if
the fix were wrong.

To get real coverage, canonicalize only the file-derived part and keep the id, e.g. map
`MSG_EXTERNAL_<id>$$<FILE><n>` to `MSG_EXTERNAL_<id>` and leave local-mode names normalized by
ordinal. Expect the first run after that change to surface differences that were previously
hidden; triage them before assuming the fix is wrong.

A second gap sits next to this one: `i18nUseExternalIds` is never passed to either compiler by
the compare harness, so the local-id mode has no fixture coverage at all. Wiring it means
per-fixture ngtsc compiler options, which defeats the shared `NgtscProgram` cache in
`fixtures/runner.ts` (see the comment at `:29`). A Rust-level test in
`crates/oxc_angular_compiler/tests/integration_test.rs` is the cheaper way to pin both modes.

## Test plan

- Rust: extend `crates/oxc_angular_compiler/tests/integration_test.rs` with cases asserting the
  exact variable names for an auto-id message, a custom-id message, and both modes of
  `i18n_use_external_ids`. The existing `compile_i18n_component` helper wraps a template in a
  component and returns the emitted code.
- Compare: tighten `canonicalizeNode` as above, then `pnpm --filter @oxc-angular/compare compare
  --fixtures --category i18n`.
- Full check before landing: `cargo test`, `cargo run -p oxc_angular_conformance` (expect
  1252/1252 with no snapshot churn), and the full `compare --fixtures` run (933 fixtures, 0
  mismatched, 51 known differences).

## Related known gaps

- Legacy message IDs (`enableI18nLegacyMessageIdFormat`) are not implemented at all; documented
  in the root README. Translations keyed only by legacy ids are not applied.
- `useDomOnlyMode` is an internal compilation mode with no N-API option, despite what older
  README revisions claimed.

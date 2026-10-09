/**
 * The HMR update module that `compileForHmrSync` returns, applied to a real
 * compiled component with the real `@angular/core`.
 *
 * Each test compiles a component with this compiler, loads it, and hands the
 * update module to Angular's own `ɵɵreplaceMetadata`. Two things must hold for
 * the definition that results:
 *
 * - every field the template decides (`decls`, `vars`, `consts`,
 *   `ngContentSelectors`) is the new template's, checked against a fresh
 *   compile of the same component with that template;
 * - nothing else changes. `ɵɵdefineComponent` converts `inputs` and `outputs`
 *   and derives `onPush`, so a definition passed through it a second time
 *   comes out wrong.
 *
 * Rendering after a swap is covered by `e2e/tests/hmr-update-definition.spec.ts`.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import * as core from '@angular/core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { compileForHmrSync, transformAngularFileSync } from '../index.js'

const TMP = join(fileURLToPath(new URL('.', import.meta.url)), '.hmr-update-module-tmp')
let nextFile = 0

beforeAll(() => {
  mkdirSync(TMP, { recursive: true })
  // i18n constants call `$localize` when the definition's `consts` are read.
  ;(globalThis as any).$localize ??= (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values)
})

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true })
})

interface ComponentSource {
  /** Extra names to import from `@angular/core`. */
  imports?: string
  /** Extra `@Component` metadata, e.g. `changeDetection: ...,`. */
  metadata?: string
  /** The class body. */
  members?: string
}

/** Compiles a component named `X` with `template` and loads the class. */
async function component(template: string, source: ComponentSource = {}): Promise<any> {
  const code = `import { Component${source.imports ? `, ${source.imports}` : ''} } from '@angular/core';

@Component({
  selector: 'x-cmp',
  ${source.metadata ?? ''}
  template: ${JSON.stringify(template)},
})
export class X {
  ${source.members ?? ''}
}
`
  const result = transformAngularFileSync(code, '/x/a.ts', {})
  expect(result.errors).toEqual([])
  const file = join(TMP, `component-${nextFile++}.mjs`)
  writeFileSync(file, result.code)
  return (await import(/* @vite-ignore */ pathToFileURL(file).href)).X
}

/** Loads an update module the way the browser does: as a module, by its default export. */
async function loadUpdateModule(code: string): Promise<(...args: unknown[]) => void> {
  const file = join(TMP, `update-${nextFile++}.mjs`)
  writeFileSync(file, code)
  return (await import(/* @vite-ignore */ pathToFileURL(file).href)).default
}

/**
 * A template function's identity for comparison: its source text. A function
 * compiled as a nested function expression carries a trailing `;` that a
 * declaration does not, and that says nothing about the template.
 */
function templateSource(fn: unknown): string {
  return String(fn).replace(/};(\s|$)/g, '}$1')
}

/** Hot-swaps `template` into `type` the way the runtime does. */
async function swap(type: any, template: string, id = '/x/a.ts') {
  const result = compileForHmrSync(template, type.name, id, null, {})
  expect(result.errors).toEqual([])
  // Seed a stale view so `def.tView` can only end up null if the update
  // module wrote `tView: null` — an unrendered component's tView is already
  // null, which would let a missing clear slip through. The sentinel is
  // never a real view's, so ɵɵreplaceMetadata finds nothing to recreate.
  type.ɵcmp.tView ??= {}
  const applyMetadata = await loadUpdateModule(result.hmrModule)
  ;(core as any).ɵɵreplaceMetadata(type, applyMetadata, [core], [])
  // A compiled function's source is what Function#toString returns, so this
  // asserts the definition's template is the freshly compiled one, not a
  // stale function the spread kept.
  expect(templateSource(type.ɵcmp.template)).toBe(templateSource(result.templateJs))
  return result
}

/** The fields of a definition that its template decides. */
function templateFields(type: any) {
  const def = type.ɵcmp
  return {
    decls: def.decls,
    vars: def.vars,
    consts: typeof def.consts === 'function' ? def.consts() : def.consts,
    ngContentSelectors: def.ngContentSelectors,
  }
}

/** Every other field of a definition, as a comparable snapshot. */
function otherFields(type: any) {
  const rest = { ...type.ɵcmp }
  for (const field of ['decls', 'vars', 'consts', 'ngContentSelectors', 'template', 'tView']) {
    delete rest[field]
  }
  return rest
}

/**
 * Swaps `to` into a component compiled with `from` and checks the result
 * against a component compiled with `to` in the first place.
 */
async function expectSwapMatchesFreshCompile(
  from: string,
  to: string,
  source: ComponentSource = {},
): Promise<any> {
  const type = await component(from, source)
  const before = otherFields(type)
  await swap(type, to)
  const fresh = await component(to, source)
  expect(templateFields(type)).toEqual(templateFields(fresh))
  expect(otherFields(type)).toEqual(before)
  expect(type.ɵcmp.tView).toBeNull()
  return type
}

describe('compileForHmrSync update module', () => {
  it('writes the slot counts and projection selectors of the new template', async () => {
    const type = await component('<view></view>', { members: `a = 'A';` })
    const { hmrModule } = await swap(type, '<view><text>{{ a }}</text></view><ng-content select="[x]"/>')

    expect(templateFields(type)).toMatchObject({
      decls: 4,
      vars: 1,
      consts: null,
      ngContentSelectors: ['[x]'],
    })
    // Every constant the module declares is one it uses.
    for (const [, name] of hmrModule.matchAll(/const (_c\d+) =/g)) {
      expect(hmrModule.split(name).length - 1, `${name} is declared and used`).toBeGreaterThan(1)
    }
  })

  describe('slot counts', () => {
    const members = { members: `a = 'A'; b = 'B';` }

    it('follows a template that gains an element', async () => {
      await expectSwapMatchesFreshCompile('<p>one</p>', '<p>one</p><p>two</p><b>three</b>', members)
    })

    it('follows a template that gains a binding', async () => {
      await expectSwapMatchesFreshCompile(
        '<p>one</p>',
        '<p [title]="a">{{ a }} {{ b }}</p>',
        members,
      )
    })

    it('follows a template that loses elements and bindings', async () => {
      await expectSwapMatchesFreshCompile(
        '<p [title]="a">{{ a }}</p><p>{{ b }}</p><i></i>',
        '<p>one</p>',
        members,
      )
    })

    it('follows a template that gains a control-flow block', async () => {
      await expectSwapMatchesFreshCompile(
        '<p>one</p>',
        '@if (a) { <p>{{ a }}</p> } @else { <i>{{ b }}</i> }',
        members,
      )
    })
  })

  describe('projection selectors', () => {
    it('follows a template that gains an <ng-content select>', async () => {
      const type = await expectSwapMatchesFreshCompile(
        '<p>one</p>',
        '<ng-content select="[x]"/><ng-content/>',
      )
      expect(type.ɵcmp.ngContentSelectors).toEqual(['[x]', '*'])
    })

    it('follows a template that loses its <ng-content>', async () => {
      const type = await expectSwapMatchesFreshCompile('<ng-content select="[x]"/>', '<p>one</p>')
      expect(type.ɵcmp.ngContentSelectors).toBeUndefined()
    })

    it('follows a template that changes its <ng-content select>', async () => {
      const type = await expectSwapMatchesFreshCompile(
        '<ng-content select="[x]"/>',
        '<ng-content select="[y]"/><ng-content select="z-el"/>',
      )
      expect(type.ɵcmp.ngContentSelectors).toEqual(['[y]', 'z-el'])
    })
  })

  describe('consts', () => {
    it('follows a template that gains an attribute', async () => {
      const type = await expectSwapMatchesFreshCompile(
        '<p>one</p>',
        '<p class="a" id="b">one</p><input #ref type="text" />',
      )
      expect(type.ɵcmp.consts).not.toBeNull()
    })

    it('clears the consts of a template that no longer needs any', async () => {
      const type = await expectSwapMatchesFreshCompile('<p class="a" id="b">one</p>', '<p>one</p>')
      expect(type.ɵcmp.consts).toBeNull()
    })

    it('follows a template that gains an i18n message', async () => {
      const type = await expectSwapMatchesFreshCompile(
        '<p>one</p>',
        '<p i18n title="t" i18n-title>Hello</p>',
      )
      expect(JSON.stringify(templateFields(type).consts)).toContain('Hello')
    })
  })

  describe('fields the template does not decide', () => {
    const io: ComponentSource = {
      imports: 'input, model, output',
      members: `
        clicked = output();
        renamed = output({ alias: 'renamedAlias' });
        checked = model(false);
        label = input('', { alias: 'labelAlias', transform: (v) => String(v).toUpperCase() });
        plain = input(0);
      `,
    }

    it('leaves outputs as they were, for output(), model() and an alias', async () => {
      const type = await component('<p>one</p>', io)
      const outputs = { ...type.ɵcmp.outputs }
      expect(outputs).toEqual({
        clicked: 'clicked',
        renamedAlias: 'renamed',
        checkedChange: 'checked',
      })

      await swap(type, '<p>one</p><button (click)="clicked.emit()">{{ checked() }}</button>')

      expect(type.ɵcmp.outputs).toEqual(outputs)
    })

    it('leaves inputs as they were, for an alias and a transform', async () => {
      const type = await component('<p>one</p>', io)
      const inputs = { ...type.ɵcmp.inputs }
      const declaredInputs = { ...type.ɵcmp.declaredInputs }
      expect(Object.keys(inputs).sort()).toEqual(['checked', 'labelAlias', 'plain'])
      expect(inputs.labelAlias[0]).toBe('label')

      await swap(type, '<p>{{ label() }} {{ plain() }}</p>')

      expect(type.ɵcmp.inputs).toEqual(inputs)
      expect(type.ɵcmp.declaredInputs).toEqual(declaredInputs)
    })

    it('leaves the change detection strategy as it was', async () => {
      for (const strategy of ['Eager', 'OnPush']) {
        const type = await component('<p>one</p>', {
          imports: 'ChangeDetectionStrategy',
          metadata: `changeDetection: ChangeDetectionStrategy.${strategy},`,
        })
        const onPush = type.ɵcmp.onPush
        expect(onPush).toBe(strategy === 'OnPush')

        await swap(type, '<p>one</p><p>two</p>')

        expect(type.ɵcmp.onPush, strategy).toBe(onPush)
      }
    })

    it('leaves everything else as it was', async () => {
      await expectSwapMatchesFreshCompile('<p>one</p>', '<p>{{ label() }}</p><ng-content/>', {
        ...io,
        metadata: `host: { '(click)': 'clicked.emit()', '[title]': 'label()', role: 'button' }, exportAs: 'xCmp',`,
      })
    })
  })

  it('does not build the definition again from the live one', async () => {
    const type = await component('<p>one</p>')
    const result = compileForHmrSync('<p>two</p>', 'X', '/x/a.ts', null, {})
    const applyMetadata = await loadUpdateModule(result.hmrModule)
    let defined = 0
    const namespace = { ...core, ɵɵdefineComponent: () => (defined++, type.ɵcmp) }

    applyMetadata(type, [namespace])

    expect(defined).toBe(0)
  })

  it('applies two swaps in a row', async () => {
    const source: ComponentSource = {
      imports: 'model, output',
      members: `a = 'A'; clicked = output(); checked = model(false);`,
    }
    const type = await component('<p>one</p>', source)
    const outputs = { ...type.ɵcmp.outputs }
    const other = otherFields(type)

    await swap(type, '<p [title]="a">{{ a }}</p><ng-content select="[x]"/>')
    await swap(type, '<b class="k">{{ a }}</b><i></i><ng-content select="[y]"/>')

    const fresh = await component(
      '<b class="k">{{ a }}</b><i></i><ng-content select="[y]"/>',
      source,
    )
    expect(templateFields(type)).toEqual(templateFields(fresh))
    expect(type.ɵcmp.outputs).toEqual(outputs)
    expect(otherFields(type)).toEqual(other)
  })

  it('handles a component id whose path contains `@`', async () => {
    const id = '/repo/node_modules/@scope/pkg/@x/a.ts'
    const result = compileForHmrSync('<p>one</p>', 'X', id, null, {})
    expect(result.componentId).toBe(`${id}@X`)
    expect(result.hmrModule).toContain('export default function X_UpdateMetadata(X, ɵɵnamespaces)')

    const type = await component('<i></i>')
    await swap(type, '<p>one</p><p>two</p>', id)
    expect(type.ɵcmp.decls).toBe(4)
  })
})

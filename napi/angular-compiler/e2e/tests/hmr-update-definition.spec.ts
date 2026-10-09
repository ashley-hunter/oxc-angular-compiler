import type { Page } from '@playwright/test'

import { test, expect } from '../fixtures/test-fixture.js'

/**
 * A template hot swap must leave the component with the definition a fresh
 * compile of the new template would give it: sized for the new template
 * (`decls`, `vars`, `consts`, `ngContentSelectors`), and otherwise untouched
 * (`inputs`, `outputs`, change detection).
 *
 * The update module used to spread the live definition back through
 * `ɵɵdefineComponent`. That kept the old template's counts and selectors, so a
 * swap that added an element or binding rebuilt a view of the wrong size, and
 * it converted `outputs` a second time, turning them round.
 */

/**
 * The dev server's watcher drops a change that follows another change to the
 * same file within 50ms, and a hot swap can be on screen sooner than that. Wait
 * this long before editing a file a second time.
 */
const WATCHER_THROTTLE_MS = 200

/** The parts of a rendered component's definition these tests care about. */
async function definition(page: Page, selector: string) {
  return await page.evaluate((selector) => {
    const element = document.querySelector(selector)!
    const def = (window as any).ng.getComponent(element).constructor.ɵcmp
    return {
      decls: def.decls as number,
      vars: def.vars as number,
      consts: (def.consts?.length ?? null) as number | null,
      ngContentSelectors: (def.ngContentSelectors ?? null) as string[] | null,
      outputs: { ...def.outputs } as Record<string, string>,
      inputs: Object.fromEntries(
        Object.entries(def.inputs as Record<string, unknown[]>).map(([name, value]) => [
          name,
          value.slice(0, 2),
        ]),
      ),
      onPush: def.onPush as boolean,
    }
  }, selector)
}

test.describe('HMR update definition', () => {
  let errors: string[]

  test.beforeEach(async ({ page }) => {
    errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('a template that gains an element and a binding, then loses both', async ({
    page,
    fileModifier,
    hmrDetector,
  }) => {
    const sentinelId = await hmrDetector.addSentinel()
    await expect(page.locator('app-lab .lab-one')).toHaveText('one')
    expect(await definition(page, 'app-lab')).toMatchObject({ decls: 2, vars: 0 })

    await fileModifier.modifyFile(
      'lab.html',
      () =>
        '<p class="lab-one">one</p><p class="lab-two">{{ a }}</p><b class="lab-three" [title]="b">three</b>\n',
    )

    await expect(page.locator('app-lab .lab-two')).toHaveText('LAB_A')
    await expect(page.locator('app-lab .lab-three')).toHaveAttribute('title', 'LAB_B')
    await expect(page.locator('app-lab .lab-one')).toHaveText('one')
    expect(await definition(page, 'app-lab')).toMatchObject({ decls: 6, vars: 2 })

    // A second swap on the same component, down to less than it started with.
    await page.waitForTimeout(WATCHER_THROTTLE_MS)
    await fileModifier.modifyFile('lab.html', () => '<i class="lab-min">min</i>\n')

    await expect(page.locator('app-lab .lab-min')).toHaveText('min')
    await expect(page.locator('app-lab .lab-two')).toHaveCount(0)
    await expect(page.locator('app-lab .lab-three')).toHaveCount(0)
    expect(await definition(page, 'app-lab')).toMatchObject({ decls: 2, vars: 0 })

    expect(await hmrDetector.sentinelExists(sentinelId)).toBe(true)
    expect(errors).toEqual([])
  })

  test('a template that gains, changes and loses an <ng-content select>', async ({
    page,
    fileModifier,
    hmrDetector,
  }) => {
    const sentinelId = await hmrDetector.addSentinel()
    await expect(page.locator('app-lab .lab-px')).toHaveCount(0)
    expect(await definition(page, 'app-lab')).toMatchObject({ ngContentSelectors: null })

    await fileModifier.modifyFile(
      'lab.html',
      () => '<p class="lab-one">one</p><ng-content select="[x]" />\n',
    )

    await expect(page.locator('app-lab .lab-px')).toHaveText('PX')
    await expect(page.locator('app-lab .lab-py')).toHaveCount(0)
    expect(await definition(page, 'app-lab')).toMatchObject({ ngContentSelectors: ['[x]'] })

    await page.waitForTimeout(WATCHER_THROTTLE_MS)
    await fileModifier.modifyFile(
      'lab.html',
      () => '<ng-content select="[y]" /><p class="lab-one">one</p><ng-content />\n',
    )

    await expect(page.locator('app-lab .lab-py')).toHaveText('PY')
    await expect(page.locator('app-lab .lab-px')).toHaveText('PX')
    await expect(page.locator('app-lab .lab-rest')).toHaveText('REST')
    await expect(page.locator('app-lab')).toHaveText('PYonePXREST')
    expect(await definition(page, 'app-lab')).toMatchObject({ ngContentSelectors: ['[y]', '*'] })

    await page.waitForTimeout(WATCHER_THROTTLE_MS)
    await fileModifier.modifyFile('lab.html', () => '<p class="lab-one">one</p>\n')

    await expect(page.locator('app-lab')).toHaveText('one')
    await expect(page.locator('app-lab .lab-py')).toHaveCount(0)
    expect(await definition(page, 'app-lab')).toMatchObject({ ngContentSelectors: null })

    expect(await hmrDetector.sentinelExists(sentinelId)).toBe(true)
    expect(errors).toEqual([])
  })

  test('a template whose consts change', async ({ page, fileModifier, hmrDetector }) => {
    const sentinelId = await hmrDetector.addSentinel()
    expect(await definition(page, 'app-lab')).toMatchObject({ consts: 1 })

    await fileModifier.modifyFile(
      'lab.html',
      () =>
        '<p class="lab-one" id="lab-id" data-k="v">one</p><input #ref class="lab-input" type="text" value="typed" /><span class="lab-ref">{{ ref.value }}</span>\n',
    )

    await expect(page.locator('app-lab #lab-id')).toHaveAttribute('data-k', 'v')
    await expect(page.locator('app-lab .lab-input')).toHaveAttribute('type', 'text')
    await expect(page.locator('app-lab .lab-ref')).toHaveText('typed')
    expect(await definition(page, 'app-lab')).toMatchObject({ consts: 4 })

    // No attributes at all: the old consts must not linger.
    await page.waitForTimeout(WATCHER_THROTTLE_MS)
    await fileModifier.modifyFile('lab.html', () => '<p>plain</p>\n')

    await expect(page.locator('app-lab p')).toHaveText('plain')
    await expect(page.locator('app-lab p')).not.toHaveAttribute('class')
    expect(await definition(page, 'app-lab')).toMatchObject({ consts: null })

    expect(await hmrDetector.sentinelExists(sentinelId)).toBe(true)
    expect(errors).toEqual([])
  })

  test('outputs and inputs survive a swap and still reach the parent', async ({
    page,
    fileModifier,
    hmrDetector,
  }) => {
    const sentinelId = await hmrDetector.addSentinel()
    const before = await definition(page, 'app-io')
    expect(before.outputs).toEqual({
      clicked: 'clicked',
      renamedAlias: 'renamed',
      checkedChange: 'checked',
    })
    expect(before.inputs.labelAlias[0]).toBe('label')
    await expect(page.locator('.io-emit')).toHaveText('IO')
    await expect(page.locator('.io-result')).toHaveText('|0|false')

    await fileModifier.modifyFile(
      'io.html',
      () =>
        '<button class="io-emit" (click)="emit()">{{ label() }}</button><span class="io-checked">{{ checked() }}</span>\n',
    )

    await expect(page.locator('.io-checked')).toHaveText('false')
    // The aliased input kept its transform.
    await expect(page.locator('.io-emit')).toHaveText('IO')
    let after = await definition(page, 'app-io')
    expect(after.outputs).toEqual(before.outputs)
    expect(after.inputs).toEqual(before.inputs)

    // output(), the aliased output and the model's change event all reach the parent.
    await page.locator('.io-emit').click()
    await expect(page.locator('.io-result')).toHaveText('CLICKED|7|true')
    await expect(page.locator('.io-checked')).toHaveText('true')

    // A second swap.
    await page.waitForTimeout(WATCHER_THROTTLE_MS)
    await fileModifier.modifyFile(
      'io.html',
      () => '<button class="io-emit" (click)="emit()">again {{ label() }}</button>\n',
    )

    await expect(page.locator('.io-emit')).toHaveText('again IO')
    after = await definition(page, 'app-io')
    expect(after.outputs).toEqual(before.outputs)
    expect(after.inputs).toEqual(before.inputs)

    await page.locator('.io-emit').click()
    await expect(page.locator('.io-result')).toHaveText('CLICKED|7|false')

    expect(await hmrDetector.sentinelExists(sentinelId)).toBe(true)
    expect(errors).toEqual([])
  })

  test('the change detection strategy survives a swap', async ({ page, fileModifier }) => {
    expect((await definition(page, 'app-lab')).onPush).toBe(false)
    expect((await definition(page, 'app-io')).onPush).toBe(true)

    await fileModifier.modifyFile('lab.html', () => '<p class="lab-one">swapped</p>\n')
    await fileModifier.modifyFile(
      'io.html',
      () => '<button class="io-emit" (click)="emit()">swapped</button>\n',
    )

    await expect(page.locator('app-lab .lab-one')).toHaveText('swapped')
    await expect(page.locator('.io-emit')).toHaveText('swapped')
    expect((await definition(page, 'app-lab')).onPush).toBe(false)
    expect((await definition(page, 'app-io')).onPush).toBe(true)
    expect(errors).toEqual([])
  })

  test('a component whose path contains `@`', async ({ page, fileModifier, hmrDetector }) => {
    const sentinelId = await hmrDetector.addSentinel()
    await expect(page.locator('.at-text')).toHaveText('AT_ONE')

    await fileModifier.modifyFile(
      '@scoped/at.html',
      () => '<p class="at-text">AT_TWO</p><b class="at-value">{{ value }}</b>\n',
    )

    await expect(page.locator('.at-text')).toHaveText('AT_TWO')
    await expect(page.locator('.at-value')).toHaveText('AT_VALUE')
    expect(await definition(page, 'app-at')).toMatchObject({ decls: 4, vars: 1 })

    expect(await hmrDetector.sentinelExists(sentinelId)).toBe(true)
    expect(errors).toEqual([])
  })
})

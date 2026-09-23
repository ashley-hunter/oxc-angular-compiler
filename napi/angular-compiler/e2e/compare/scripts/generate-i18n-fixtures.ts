/**
 * Generates i18n comparison fixtures from Angular's own i18n tests:
 *
 * - the r3_view_compiler_i18n compliance cases
 *   (packages/compiler-cli/test/compliance/test_cases/r3_view_compiler_i18n), one fixture file
 *   per directory
 * - the templates in the runtime i18n acceptance spec
 *   (packages/core/test/acceptance/i18n_spec.ts)
 *
 * Usage: pnpm generate:i18n-fixtures [path/to/angular]
 * The Angular checkout defaults to the repository's Angular submodule. Re-run after updating it.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const angularDir = resolve(
  process.argv[2] ?? join(here, '../../../../../crates/oxc_angular_compiler/angular'),
)
const outDir = join(here, '../fixtures/i18n')
const complianceDir = join(
  angularDir,
  'packages/compiler-cli/test/compliance/test_cases/r3_view_compiler_i18n',
)
const acceptanceSpec = join(angularDir, 'packages/core/test/acceptance/i18n_spec.ts')
const angularVersion = JSON.parse(readFileSync(join(angularDir, 'package.json'), 'utf8')).version

interface GeneratedFixture {
  name: string
  description: string
  className: string
  sourceCode: string
  skipReason?: string
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function firstComponentClass(source: string): string {
  const match = /@Component\([\s\S]*?\)\s*export\s+class\s+(\w+)/.exec(source)
  return match?.[1] ?? 'MyComponent'
}

/**
 * Oxc compiles one file at a time and does not resolve NgModule scopes, which is not an i18n
 * concern. Make NgModule declarations standalone, importing CommonModule and the module's
 * other declarations, so the fixture compares the i18n output.
 */
function makeStandalone(source: string): string {
  const declarations = [...source.matchAll(/declarations:\s*\[([^\]]*)\]/g)].flatMap((m) =>
    m[1]
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean),
  )
  let result = source.replace(/declarations:\s*\[[^\]]*\],?/g, '')
  if (!result.includes('CommonModule')) {
    result = `import {CommonModule} from '@angular/common';\n${result}`
  }
  result = result.replace(
    /(@Component\(\{[^@]*?)standalone:\s*false/g,
    (match, head: string, offset: number) => {
      const cls = /export class (\w+)/.exec(result.slice(offset + match.length))?.[1]
      const imports = ['CommonModule', ...declarations.filter((d) => d !== cls)]
      return `${head}standalone: true, imports: [${imports.join(', ')}]`
    },
  )
  result = result.replace(
    /(@(?:Pipe|Directive)\(\{[^@]*?)standalone:\s*false/g,
    '$1standalone: true',
  )
  // The NgModules are empty now; drop them so the fixture only compares the i18n components.
  return result
    .replace(/@NgModule\(\{[^}]*\}\)\s*export class \w+\s*\{\s*\}\n?/g, '')
    .replace(/\bNgModule,\s*|,\s*NgModule\b/g, '')
}

/** Angular's test file system turns `\r\n` markers followed by a newline into CRLF. */
function convertLineEndingMarkers(source: string): string {
  return source.replace(/\\r\\n\r?\n/g, '\r\n')
}

function complianceFixtures(testCasesFile: string): GeneratedFixture[] {
  const dir = dirname(testCasesFile)
  const { cases } = JSON.parse(readFileSync(testCasesFile, 'utf8'))
  const fixtures: GeneratedFixture[] = []
  for (const testCase of cases) {
    const inputFiles: string[] =
      testCase.inputFiles ??
      readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    for (const file of inputFiles.filter((f) => f.endsWith('.ts'))) {
      let source = readFileSync(join(dir, file), 'utf8')
      if (dir.includes('line_ending_normalization')) {
        source = convertLineEndingMarkers(source)
      }
      source = makeStandalone(source)
      fixtures.push({
        name: `i18n-compliance-${slug(relative(complianceDir, dir) || 'root')}-${slug(testCase.description)}-${slug(basename(file, '.ts'))}`.slice(
          0,
          150,
        ),
        description: `Angular compliance: ${testCase.description}`,
        className: firstComponentClass(source),
        sourceCode: source,
        skipReason: /templateUrl/.test(source)
          ? 'external templates are not supported by the compare tool'
          : undefined,
      })
    }
  }
  return fixtures
}

const ACCEPTANCE_SKIPS: Record<string, string> = {
  '<div i18n #ref="dir" test="Set" i18n-test="This is also a test"></div>':
    'references a directive declared only inside the spec',
  'Text { count }': 'intentionally invalid template (the spec expects a compile error)',
  '{count, select, 10 {ten} other {other}':
    'intentionally invalid ICU (the spec expects a compile error)',
}

function acceptanceFixtures(): GeneratedFixture[] {
  const source = readFileSync(acceptanceSpec, 'utf8')
  const sf = ts.createSourceFile('i18n_spec.ts', source, ts.ScriptTarget.Latest, true)
  const found: { template: string; preserveWhitespaces: boolean; test: string }[] = []
  const literal = (node: ts.Node | undefined) =>
    node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      ? node.text
      : undefined
  const testName = (node: ts.Node): string => {
    for (let n: ts.Node | undefined = node; n; n = n.parent) {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'it') {
        return literal(n.arguments[0]) ?? 'it'
      }
    }
    return 'top-level'
  }
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'initWithTemplate'
    ) {
      const template = literal(node.arguments[1])
      if (template !== undefined) {
        const preserveWhitespaces = node.arguments[0].getText() === 'AppCompWithWhitespaces'
        found.push({ template, preserveWhitespaces, test: testName(node) })
      }
    }
    if (ts.isPropertyAssignment(node) && node.name.getText() === 'template') {
      const template = literal(node.initializer)
      if (template) {
        const preserveWhitespaces = (node.parent as ts.ObjectLiteralExpression).properties.some(
          (p) =>
            p.name?.getText() === 'preserveWhitespaces' &&
            ts.isPropertyAssignment(p) &&
            p.initializer.kind === ts.SyntaxKind.TrueKeyword,
        )
        found.push({ template, preserveWhitespaces, test: testName(node) })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  const seen = new Set<string>()
  return found
    .filter((c) => c.template.trim() && !seen.has(c.template) && seen.add(c.template))
    .map((c, i) => {
      const escaped = c.template
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${')
      return {
        name: `i18n-acceptance-${String(i).padStart(3, '0')}-${slug(c.test)}`.slice(0, 120),
        description: `Angular i18n acceptance spec: ${c.test}`,
        className: 'AppComp',
        skipReason: ACCEPTANCE_SKIPS[c.template],
        sourceCode: `import {Component, Directive, NO_ERRORS_SCHEMA, TemplateRef, ViewContainerRef} from '@angular/core';
import {CommonModule} from '@angular/common';

@Directive({selector: '[tplRef]'})
export class DirectiveWithTplRef {
  constructor(public vcRef: ViewContainerRef, public tplRef: TemplateRef<{}>) {}
  ngOnInit() { this.vcRef.createEmbeddedView(this.tplRef, {}); }
}

@Component({
  selector: 'app-comp',
  imports: [CommonModule, DirectiveWithTplRef],
  schemas: [NO_ERRORS_SCHEMA],
  preserveWhitespaces: ${c.preserveWhitespaces},
  template: \`${escaped}\`,
})
export class AppComp {
  name = 'Angular';
  description = 'Web Framework';
  visible = true;
  count = 0;
  items = [1, 2, 3];
}
`,
      }
    })
}

function writeFixtureFile(file: string, origin: string, fixtures: GeneratedFixture[]): void {
  const entries = fixtures.map((f) => {
    const fields = [
      `    name: ${JSON.stringify(f.name)},`,
      `    category: 'i18n',`,
      `    description: ${JSON.stringify(f.description)},`,
      `    className: ${JSON.stringify(f.className)},`,
      `    type: 'full-transform',`,
      f.skipReason ? `    skipReason: ${JSON.stringify(f.skipReason)},` : undefined,
      `    sourceCode: ${JSON.stringify(f.sourceCode)},`,
    ]
    return `  {\n${fields.filter(Boolean).join('\n')}\n  },`
  })
  writeFileSync(
    join(outDir, file),
    `/**
 * Generated by scripts/generate-i18n-fixtures.ts from Angular ${angularVersion}:
 * ${origin}
 * Do not edit by hand; re-run the script instead.
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
${entries.join('\n')}
]
`,
  )
}

mkdirSync(outDir, { recursive: true })
const testCaseFiles = readdirSync(complianceDir, { recursive: true })
  .map(String)
  .filter((f) => basename(f) === 'TEST_CASES.json')
  .sort()
for (const file of testCaseFiles) {
  const dir = dirname(file)
  const name = dir === '.' ? 'root' : slug(dir)
  writeFixtureFile(
    `generated-compliance-${name}.fixture.ts`,
    `r3_view_compiler_i18n/${file}`,
    complianceFixtures(join(complianceDir, file)),
  )
}
writeFixtureFile(
  'generated-acceptance.fixture.ts',
  'packages/core/test/acceptance/i18n_spec.ts',
  acceptanceFixtures(),
)
console.log(`Wrote i18n fixtures to ${relative(process.cwd(), outDir)}`)

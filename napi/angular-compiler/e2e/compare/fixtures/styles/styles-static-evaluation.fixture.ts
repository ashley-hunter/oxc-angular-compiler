/**
 * `styles` values that are not string literals: ngtsc evaluates them statically.
 */
import type { Fixture } from '../types.js'

const fixture = (name: string, description: string, declarations: string, styles: string) => ({
  name: `styles-evaluated-${name}`,
  category: 'styles',
  description,
  className: 'StylesComponent',
  type: 'full-transform' as const,
  sourceCode: `
import { Component } from '@angular/core';

const S = '.a { color: red }';
const LIST = ['.l { color: red }'];
${declarations}

@Component({
  selector: 'app-styles',
  standalone: true,
  template: '<p class="a">x</p>',
  styles: ${styles},
})
export class StylesComponent {}
`,
  expectedFeatures: ['ɵɵdefineComponent'],
})

export const fixtures: Fixture[] = [
  fixture('constant', 'A string constant in the array', '', '[S]'),
  fixture('constant-alone', 'A string constant as the styles', '', 'S'),
  fixture('concatenation', 'A concatenation of strings', '', `['.b{}' + '.c{}', S + '.k{}']`),
  fixture('spread', 'A spread of an array constant', '', `['.first{}', ...LIST, S]`),
  fixture('array-constant', 'An array constant as the styles', '', 'LIST'),
  fixture(
    'nested-constants',
    'Constants that are built from other constants',
    `const INNER = ['.i{}']; const OUTER = [...INNER, S]; const A = '.n'; const B = A + '{}';`,
    '[...OUTER, B]',
  ),
  fixture(
    'template-literal',
    'A template literal with a constant substitution',
    `const C = 'red';`,
    '[`.t { color: ${C} }`]',
  ),
  fixture(
    'call-and-member',
    'A same-file function call, a ternary and members of an object constant',
    `function make() { return '.m{}'; } const DEV = true; const C = { s: '.s{}', l: ['.l2{}'] };`,
    `[make(), DEV ? '.d{}' : '.p{}', C.s, ...C.l]`,
  ),
  fixture('blank-entries', 'Empty and blank entries are left out', '', `['', '  ', S]`),
]

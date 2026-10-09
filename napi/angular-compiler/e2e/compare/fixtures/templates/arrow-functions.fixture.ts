/**
 * Arrow functions in template expressions.
 *
 * A name read inside an arrow body resolves to the arrow's own parameter (or
 * an enclosing arrow's) before template variables and the component context.
 *
 * Only event bindings are covered: there the arrow stays in place. Elsewhere
 * Angular hoists it through ɵɵarrowFunction, which is not implemented yet.
 *
 * The `ng-*` fixtures are ported from Angular's compliance suite:
 * packages/compiler-cli/test/compliance/test_cases/r3_view_compiler_arrow_functions
 */
import type { Fixture } from '../types.js'

const MEMBERS = `
  open = signal(false);
  items: any[] = [];
  other = 1;
  fallback() { return true; }
  run(fn: any): any {}
`

function arrow(name: string, description: string, template: string, members = MEMBERS): Fixture {
  const className = `${name.replace(/(^|-)(\w)/g, (_, _dash, c) => c.toUpperCase())}Component`
  return {
    name,
    category: 'templates',
    description,
    className,
    type: 'full-transform',
    sourceCode: `
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-${name}',
  standalone: true,
  template: \`${template}\`,
})
export class ${className} {${members}}
    `.trim(),
    expectedFeatures: [],
  }
}

export const fixtures: Fixture[] = [
  // Event bindings: the arrow stays in place inside the listener.
  arrow(
    'arrow-listener-one-param',
    'Listener arrow reading its own parameter',
    `<button (click)="open.update((o) => !o)"></button>`,
  ),
  arrow(
    'arrow-listener-no-param',
    'Listener arrow reading only the component',
    `<button (click)="open.update(() => !open())"></button>`,
  ),
  arrow(
    'arrow-listener-multiple-params',
    'Listener arrow reading several parameters',
    `<button (click)="run((a, b) => a + b)"></button>`,
  ),
  arrow(
    'arrow-listener-param-shadows-property',
    'Listener arrow parameter named like a component property',
    `<button (click)="open.update((open) => !open)"></button>`,
  ),
  arrow(
    'arrow-listener-param-and-property',
    'Listener arrow reading a parameter and a component property',
    `<button (click)="open.update((o) => o || fallback())"></button>`,
  ),
  arrow(
    'arrow-listener-nested',
    'Nested listener arrow reading the outer parameter',
    `<button (click)="run((a) => (b) => a + b + other)"></button>`,
  ),
  arrow(
    'arrow-listener-param-shadows-let',
    'Listener arrow parameter shadowing an @let',
    `@let v = 1; <button (click)="run((v) => v + other)"></button>{{ v }}`,
  ),
  arrow(
    'arrow-listener-param-shadows-for-item',
    'Listener arrow parameter shadowing a @for item',
    `@for (item of items; track item) { <button (click)="run((item) => item + other)"></button> }`,
  ),
  arrow(
    'arrow-listener-param-shadows-ref',
    'Listener arrow parameter shadowing a template reference',
    `<input #el /><button (click)="run((el) => el + other)"></button>`,
  ),
  arrow(
    'arrow-listener-reads-template-variables',
    'Listener arrow reading a parameter, a @for item, a reference and the component',
    `<input #el />@for (item of items; track item) { <button (click)="run((x) => x + item + el.value + other)"></button> }`,
  ),

  // Ported from Angular's compliance suite.
  arrow(
    'ng-arrow-function-no-context',
    'arrow_function_no_context.ts',
    `
    <button (click)="sigA.update(value => value + 1)">Increment A</button>
    <button (click)="sigA.update(value => value - 1)">Decrement A</button>
    <button (click)="sigB.update(value => value + 1)">Increment B</button>
  `,
    `
  sigA = signal(1);
  sigB = signal(2);
`,
  ),
  arrow(
    'ng-arrow-function-dollar-event',
    'arrow_function_dollar_event.ts',
    `
    @let topLevelLet = 1;
    @if (true) {
      @let innerLet = 2;
      <button (click)="signal.update(prev => $event.type + prev + innerLet + topLevelLet + componentProp)"></button>
    }
  `,
    `
  componentProp = 0;
  result = signal('');
`,
  ),
  arrow(
    'ng-arrow-function-nested-listeners',
    'arrow_function_nested_listeners.ts',
    `
    @let a = 1;
    @if (true) {
      <input #b>
      @if (true) {
        @let c = 3;
        <button (click)="someSignal((prev) => prev + a + b.value + c + componentProp)"></button>
      }
    }
  `,
    `
  someSignal = signal('');
  componentProp = 0;
`,
  ),
  {
    name: 'ng-arrow-function-host-listener',
    category: 'templates',
    description: 'arrow_function_host_listener.ts',
    className: 'TestDir',
    type: 'full-transform',
    sourceCode: `
import { Directive, signal } from '@angular/core';

@Directive({
  selector: '[appTestDir]',
  standalone: true,
  host: {
    '(click)': 'someSignal.update(prev => prev + 1)',
    '(mousedown)': 'someSignal.update(() => componentProp + 1)',
  },
})
export class TestDir {
  someSignal = signal(0);
  componentProp = 1;
}
    `.trim(),
    expectedFeatures: ['ɵɵlistener'],
  },
]

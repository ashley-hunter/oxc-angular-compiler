/**
 * Arrow functions in template expressions.
 *
 * A name read inside an arrow body resolves to the arrow's own parameter (or
 * an enclosing arrow's) before template variables and the component context.
 *
 * In event bindings the arrow stays in place. Everywhere else it is hoisted to
 * a constant and instantiated through ɵɵarrowFunction.
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

  // Property bindings, interpolations and @let: the arrow is hoisted via ɵɵarrowFunction.
  arrow(
    'arrow-property-one-param',
    'Property binding arrow reading its own parameter',
    `<div [title]="run((o) => !o)"></div>`,
  ),
  arrow(
    'arrow-property-no-param',
    'Property binding arrow reading only the component',
    `<div [title]="run(() => !open())"></div>`,
  ),
  arrow(
    'arrow-property-param-shadows-property',
    'Property binding arrow parameter named like a component property',
    `<div [title]="run((open) => !open)"></div>`,
  ),
  arrow(
    'arrow-property-param-and-property',
    'Property binding arrow reading a parameter and a component property',
    `<div [title]="run((o) => o || fallback())"></div>`,
  ),
  arrow(
    'arrow-property-nested',
    'Nested property binding arrow reading the outer parameter',
    `<div [title]="run((a) => (b) => a + b + other)"></div>`,
  ),
  arrow(
    'arrow-property-param-shadows-let',
    'Property binding arrow parameter shadowing an @let',
    `@let v = 1; <div [title]="run((v) => v + other)"></div>{{ v }}`,
  ),
  arrow(
    'arrow-property-param-shadows-for-item',
    'Property binding arrow parameter shadowing a @for item',
    `@for (item of items; track item) { <div [title]="run((item) => item + other)"></div> }`,
  ),
  arrow(
    'arrow-property-param-shadows-ref',
    'Property binding arrow parameter shadowing a template reference',
    `<input #el /><div [title]="run((el) => el + other)"></div>`,
  ),
  arrow(
    'arrow-property-reads-template-variables',
    'Property binding arrow reading a parameter, a @for item, a reference and the component',
    `<input #el />@for (item of items; track item) { <div [title]="run((x) => x + item + el.value + other)"></div> }`,
  ),
  arrow(
    'arrow-property-several-bindings',
    'Arrows in class, style and attribute bindings on one element',
    `<div [class.a]="run((o) => !o)" [style.width.px]="run((w) => w + other)" [attr.x]="run((x) => x)"></div>`,
  ),
  arrow(
    'arrow-control-flow-expressions',
    'Arrows in @if, @for and @switch expressions',
    `@if (run((o) => !o)) { a } @for (i of run((o) => o); track i) { {{ run((j) => j + i) }} } @switch (run((o) => o)) { @case (run((p) => p)) { b } }`,
  ),
  arrow(
    'arrow-interpolation-one-param',
    'Interpolation arrow reading its own parameter',
    `{{ run((o) => !o) }}`,
  ),
  arrow(
    'arrow-interpolation-multiple-params',
    'Interpolation arrow reading several parameters',
    `{{ run((a, b) => a + b) }}`,
  ),
  arrow(
    'arrow-interpolation-param-and-property',
    'Interpolation arrow reading a parameter and a component property',
    `{{ run((o) => o || fallback()) }}`,
  ),
  arrow(
    'arrow-interpolation-no-param',
    'Interpolation arrow reading only the component',
    `{{ run(() => !open()) }}`,
  ),
  arrow(
    'arrow-interpolation-identical-arrows',
    'Two identical arrows share one hoisted constant',
    `{{ run((o) => !o) }}{{ run((o) => !o) }}`,
  ),
  arrow(
    'arrow-hoisted-root-reference',
    'Hoisted arrow reading a template reference in the root view',
    `<input #el /><div [title]="run(() => el.value)"></div>`,
  ),
  arrow(
    'arrow-hoisted-if-alias',
    'Hoisted arrow reading an @if alias',
    `@if (open(); as alias) { <div [title]="run((o) => o + alias + other)"></div> }`,
  ),
  arrow(
    'arrow-hoisted-ng-template-variables',
    'Hoisted arrow reading ng-template context variables',
    `<ng-template let-item let-i="index"><div [title]="run(() => item + i + other)"></div></ng-template>`,
  ),
  arrow(
    'arrow-hoisted-two-in-one-view',
    'Two hoisted arrows in one embedded view',
    `@for (item of items; track item) { <div [title]="run((a) => a + item)" [id]="run((b) => b + item + other)"></div> }`,
  ),
  arrow(
    'arrow-hoisted-nested-views',
    'Hoisted arrow three views deep reading a @for item and a reference',
    `<input #el />@for (item of items; track item) { @if (other) { @if (open()) { {{ run((p) => p + item + el.value + other) }} } } }`,
  ),
  arrow(
    'arrow-hoisted-same-arrow-in-two-views',
    'Identical arrows in different views share one constant',
    `{{ run((o) => !o) }} @if (other) { {{ run((o) => !o) }} }`,
  ),
  arrow(
    'arrow-hoisted-order',
    'Hoisted constants are numbered in template order across views',
    `<div [title]="run((a) => a)"></div>@if (other) { {{ run((b) => b) }} }<div [id]="run((c) => c + other)"></div>@for (i of items; track i) { {{ run((d) => d + i) }} }`,
  ),
  arrow(
    'arrow-hoisted-i18n',
    'Hoisted arrow in an i18n interpolation',
    `<div i18n>Hello {{ run((o) => o + other) }}</div>`,
  ),
  arrow(
    'arrow-let-reading-let',
    '@let arrow reading another @let',
    `@let base = 2; @let fn = (a) => a + base; {{ fn(1) }}`,
  ),
  arrow(
    'arrow-let-chain',
    '@let arrows calling each other',
    `@let a = other; @let f = () => a; @let g = () => f() + a; {{ g() }}`,
  ),
  arrow(
    'arrow-let-in-for',
    '@let arrow declared in a @for and used in a child view',
    `@for (item of items; track item) { @let f = () => item; {{ f() }} @if (other) { {{ f() }} } }`,
  ),

  // Hoisted cases ported from Angular's compliance suite.
  arrow(
    'ng-arrow-function-top-level-context',
    'arrow_function_top_level_context.ts',
    `{{(param => param + value + 1)('param')}}`,
    `
  value = 0;
`,
  ),
  arrow(
    'ng-arrow-function-this-access',
    'arrow_function_this_access.ts',
    `{{((a, b) => a + this.a + b + this.b)(1, 3)}}`,
    `
  a = 2;
  b = 4;
`,
  ),
  arrow(
    'ng-arrow-function-defined-let',
    'arrow_function_defined_let.ts',
    `
    @let fn = (a, b) => componentValue + a + b;
    One: {{fn(0, 1)}}
    @if (true) {
      Two: {{fn(1, 1)}}
      <button (click)="componentValue = fn(2, 1)"></button>
    }
  `,
    `
  componentValue = 0;
`,
  ),
  arrow(
    'ng-arrow-function-loop-variables',
    'arrow_function_loop_variables.ts',
    `
    @for (item of items; track $index; let outerEven = $even) {
      @for (subitem of item.subItems; track $index) {
        {{(() => outerEven || $even || $index)()}}
      }
    }
  `,
    `
  items = [{ name: 'one', subItems: ['sub one', 'sub two'] }];
`,
  ),
  arrow(
    'ng-arrow-function-let-nested',
    'arrow_function_let_nested.ts',
    `
    @let a = 1;
    @if (true) {
      @let b = 2;
      @if (true) {
        @let c = 3;
        {{(() => a + b + c)()}}
      }
    }
  `,
    `

`,
  ),
  arrow(
    'ng-arrow-function-inside-pure-value',
    'arrow_function_inside_pure_value.ts',
    `
    {{[(a) => a + 1][0](1000)}}
    {{[(a) => a + 1 + componentProp][0](1000)}}
  `,
    `
  componentProp = 0;
`,
  ),
  arrow(
    'ng-arrow-function-pure-return-values',
    'arrow_function_pure_return_values.ts',
    `
    {{(a => ({foo: a, bar: componentProp}))(1).foo}}
  `,
    `
  componentProp = 0;
`,
  ),
  arrow(
    'ng-arrow-function-returning-arrow-function-no-context',
    'arrow_function_returning_arrow_function_no_context.ts',
    `{{(a => b => c => d => a + b + c + d)(1)(2)(3)(4)}}`,
    `

`,
  ),
  arrow(
    'ng-arrow-function-returning-arrow-function-top-level-context',
    'arrow_function_returning_arrow_function_top_level_context.ts',
    `{{(a => b => c => d => a + b + c + d + componentProp)(1)(2)(3)(4)}}`,
    `
  componentProp = 0;
`,
  ),
  arrow(
    'ng-arrow-function-returning-arrow-function-nested-context',
    'arrow_function_returning_arrow_function_nested_context.ts',
    `
    @let topLevelLet = 1;
    @if (true) {
      @let nestedLet = 2;
      @if (true) {
        {{(a => b => c => d => a + b + c + d + componentProp + topLevelLet + nestedLet)(1)(2)(3)(4)}}
      }
    }
  `,
    `
  componentProp = 0;
`,
  ),
  arrow(
    'ng-arrow-function-safe-access',
    'arrow_function_safe_access.ts',
    `
    {{(value => value?.a?.b?.c?.()?.()?.()?.())(componentProp)}}
    <hr>
    {{() => componentProp?.a?.b?.c?.()?.()?.()?.()}}
  `,
    `
  componentProp: {a?: {b?: {c?: () => () => () => () => string}}} = {};
`,
  ),
  arrow(
    'ng-arrow-function-safe-access-nested-views',
    'arrow_function_safe_access_nested_views.ts',
    `
    @if (true) {
      @if (true) {
        @if (true) {
          {{() => componentProp?.a?.b?.c?.()?.()?.()?.()}}
        }
      }
    }
  `,
    `
  componentProp: {a?: {b?: {c?: () => () => () => () => string}}} = {};
`,
  ),
  {
    name: 'ng-arrow-function-pipe',
    category: 'templates',
    description: 'arrow_function_pipe.ts',
    className: 'TestComp',
    type: 'full-transform',
    sourceCode: `
import { Component, Pipe } from '@angular/core';

@Pipe({ name: 'test', standalone: true })
export class TestPipe {
  transform(value: Function) {
    return value;
  }
}

@Component({
  selector: 'app-test-comp',
  standalone: true,
  template: \`
    {{(a, b) => a + b | test}}
    <hr>
    {{(a, b) => a + b + componentProp | test}}
  \`,
  imports: [TestPipe],
})
export class TestComp {
  componentProp = 0;
}
    `.trim(),
    expectedFeatures: ['ɵɵarrowFunction'],
  },
  {
    name: 'ng-arrow-function-host-binding',
    category: 'templates',
    description: 'arrow_function_host_binding.ts',
    className: 'TestDir',
    type: 'full-transform',
    sourceCode: `
import { Directive } from '@angular/core';

@Directive({
  selector: '[appTestDir]',
  standalone: true,
  host: {
    '[attr.no-context]': '((a, b) => a / b)(5, 10)',
    '[attr.with-context]': '((a, b) => a / b + componentProp)(6, 12)',
  },
})
export class TestDir {
  componentProp = 1;
}
    `.trim(),
    expectedFeatures: ['ɵɵarrowFunction'],
  },
]

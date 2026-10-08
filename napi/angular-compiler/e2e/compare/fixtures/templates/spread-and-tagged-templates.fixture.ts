/**
 * Spread call arguments and tagged template literals.
 *
 * Both must keep their shape (`...arg`, the tag) and resolve the names they
 * read like any other expression: template variables first, then the component.
 */
import type { Fixture } from '../types.js'

/** Escapes text so it can sit inside a backtick-quoted string in the generated source. */
function escapeForTemplateLiteral(text: string): string {
  return text.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')
}

function fixture(name: string, description: string, template: string): Fixture {
  const className = `${name.replace(/(^|-)(\w)/g, (_, _dash, c) => c.toUpperCase())}Component`
  return {
    name,
    category: 'templates',
    description,
    className,
    type: 'full-transform',
    sourceCode: `
import { Component } from '@angular/core';
import { JsonPipe, SlicePipe } from '@angular/common';

@Component({
  selector: 'app-${name}',
  standalone: true,
  imports: [JsonPipe, SlicePipe],
  template: \`${escapeForTemplateLiteral(template)}\`,
})
export class ${className} {
  items: any[] = [];
  other: any = 1;
  f(...args: any[]): any {}
  tag(...args: any[]): any {}
}
    `.trim(),
    expectedFeatures: [],
  }
}

export const fixtures: Fixture[] = [
  fixture('spread-argument', 'Spread call argument', '{{ f(...items) }}'),
  fixture(
    'spread-argument-mixed',
    'Spread call argument among other arguments',
    '{{ f(1, ...items, other, ...other) }}',
  ),
  fixture(
    'spread-argument-template-variable',
    'Spread call argument reading a @for item',
    '@for (item of items; track item) { {{ f(1, ...item) }} }',
  ),
  fixture(
    'spread-argument-safe-call',
    'Spread argument of a safe call',
    '@for (item of items; track item) { {{ f?.(...item) }} }',
  ),
  fixture(
    'spread-argument-listener',
    'Spread call argument in a listener',
    '@for (item of items; track item) { <button (click)="f(...item, $event)"></button> }',
  ),
  fixture(
    'spread-argument-arrow-parameter',
    'Spread call argument reading an arrow function parameter',
    '<button (click)="f((o) => f(1, ...o))"></button>{{ f((p) => f(...p, other)) }}',
  ),
  fixture('tagged-template', 'Tagged template literal', '{{ tag`a${other}b` }}'),
  fixture(
    'tagged-template-template-variable',
    'Tagged template literal reading a @for item',
    '@for (item of items; track item) { {{ tag`a${item}b${other}` }} }',
  ),
  fixture(
    'tagged-template-listener',
    'Tagged template literal in a listener',
    '@for (item of items; track item) { <button (click)="f(tag`${item}`)"></button> }',
  ),
  fixture(
    'tagged-template-arrow-parameter',
    'Tagged template literal reading an arrow function parameter',
    '<button (click)="f((o) => (p) => tag`${o}${p}${other}`)"></button>{{ f((q) => tag`${q}`) }}',
  ),
  fixture(
    'spread-argument-pipe',
    'Spread call argument whose operand uses a pipe',
    '{{ f(...(items | slice: 1)) }}',
  ),
  fixture(
    'tagged-template-escapes',
    'Tagged template literal whose text needs escaping',
    '{{ tag`a\\`b\\${c}d\\\\e ${other} $x` }}',
  ),
  fixture(
    'tagged-template-pipe',
    'Tagged template literal whose expression uses a pipe',
    '{{ tag`a${other | json}b` }}',
  ),
  {
    name: 'spread-and-tagged-template-host',
    category: 'templates',
    description: 'Spread arguments and tagged templates in host bindings',
    className: 'SpreadAndTaggedHostDirective',
    type: 'full-transform',
    sourceCode: `
import { Directive } from '@angular/core';

@Directive({
  selector: '[appSpreadAndTaggedHost]',
  standalone: true,
  host: {
    '[attr.a]': 'f(...items)',
    '[attr.b]': 'tag\`a\${other}\`',
    '(click)': 'f((o) => tag\`\${o}\`, (p) => \`\${p}\`, ...items)',
  },
})
export class SpreadAndTaggedHostDirective {
  other: any = 1;
  items: any[] = [];
  f(...args: any[]): any {}
  tag(...args: any[]): any {}
}
    `.trim(),
    expectedFeatures: [],
  },
]

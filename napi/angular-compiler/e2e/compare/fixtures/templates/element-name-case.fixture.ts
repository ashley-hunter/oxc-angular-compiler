/**
 * Element names are case-sensitive and kept as written: `<View>` is an element
 * named "View", not a component reference to resolve later. Known HTML elements
 * written in capitals keep their spelling too, while still behaving like the
 * element they name (void, raw text, implied namespace).
 */
import type { Fixture } from '../types.js'

const MEMBERS = `
  t = '';
  on = true;
  items: any[] = [];
  go(..._args: any[]) {}
`

function fixture(name: string, description: string, template: string, extra = ''): Fixture {
  const className = `${name.replace(/(^|-)(\w)/g, (_, _dash, c) => c.toUpperCase())}Component`
  return {
    name,
    category: 'templates',
    description,
    className,
    type: 'full-transform',
    sourceCode: `
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
${extra}
@Component({
  selector: 'app-${name}',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],${extra ? '\n  imports: [ViewCmp],' : ''}
  template: \`${template}\`,
})
export class ${className} {${MEMBERS}}
    `.trim(),
    expectedFeatures: [],
  }
}

export const fixtures: Fixture[] = [
  fixture(
    'case-root',
    'Capitalised element at the root with a lowercase child',
    '<View><text>hi</text></View>',
  ),
  fixture(
    'case-nested',
    'Capitalised element nested in a lowercase element',
    '<div><View><span>a</span><Text>b</Text></View></div>',
  ),
  fixture(
    'case-mixed',
    'Mixed-case element names',
    '<myWidget>a</myWidget><My-Widget>b</My-Widget><X>d</X><x1>e</x1><X1>f</X1>',
  ),
  fixture(
    'case-attributes',
    'Capitalised element with attributes, bindings, listeners and a reference',
    '<View class="a" id="b" [title]="t" [class.x]="on" [attr.aria-label]="t" [style.width]="t" (press)="go(ref)" #ref>{{ t }}</View>',
  ),
  fixture(
    'case-matches-component',
    'Capitalised element matching a component selector in imports',
    '<View [label]="t" (press)="go()">projected</View>',
    `import { input, output } from '@angular/core';

@Component({ selector: 'View', standalone: true, template: '<ng-content />' })
export class ViewCmp {
  label = input('');
  press = output<void>();
}
`,
  ),
  fixture(
    'case-self-closing',
    'Self-closing capitalised elements',
    '<View /><Row [title]="t" /><div><Cell /></div>',
  ),
  fixture(
    'case-control-flow',
    'Capitalised elements inside @if, @for and ng-template',
    '@if (on) { <View>a</View> } @else { <Other>b</Other> } @for (i of items; track i) { <Row>{{ i }}</Row> } @empty { <None /> } <ng-template><Cell>c</Cell></ng-template><View *ngIf="on">d</View>',
  ),
  fixture(
    'case-html-elements',
    'Known HTML elements written in capitals',
    '<DIV class="a">a</DIV><Span>b</Span><BUTTON (click)="go()">c</BUTTON><UL><LI>d<LI>e</UL><P>p<P>q',
  ),
  fixture(
    'case-html-void-elements',
    'Void HTML elements written in capitals',
    '<INPUT [value]="t"><BR><Img [src]="t"><Hr />after',
  ),
  fixture(
    'case-html-security',
    'Security-sensitive bindings on HTML elements written in capitals',
    '<A [href]="t">a</A><Div [innerHTML]="t"></Div><IFRAME [src]="t"></IFRAME>',
  ),
  fixture(
    'case-svg',
    'Mixed-case names inside and outside svg',
    '<svg><Circle r="1" /><circle [attr.r]="t" /><foreignObject><DIV>x</DIV><View>y</View></foreignObject><linearGradient /></svg><svg:Circle /><SVG><rect /></SVG><MATH><mi>x</mi></MATH>',
  ),
  fixture(
    'case-ng-names',
    'ng-content matches in any case; ng-container and ng-template only as written',
    '<NG-CONTAINER>a</NG-CONTAINER><Ng-Template>b</Ng-Template><NG-CONTENT select="[a]">c</NG-CONTENT><Ng-Content />',
  ),
  fixture(
    'case-raw-text',
    'Raw text elements written in capitals',
    '<STYLE>p > a {}</STYLE><Script>if (a < b) {}</Script><TEXTAREA>{{ t }}</TEXTAREA><Title>{{ t }}</TITLE><p>after</p>',
  ),
  fixture(
    'case-optional-end-tags',
    'Capitalised elements with optional end tags',
    '<UL><LI>a<LI>b</UL><TABLE><TR><TD>a<TD>b<TR><TD>c</TABLE><Select><Option>a<Option>b</Select><P>p<P>q',
  ),
  fixture(
    'case-i18n',
    'Capitalised element with i18n',
    '<View i18n title="x" i18n-title>hello <Bold>there</Bold></View>',
  ),
  fixture(
    'case-lowercase-unchanged',
    'Lowercase elements, custom and standard',
    '<view><text>hi</text></view><my-widget [title]="t" (press)="go()" #r>a</my-widget><div><span>b</span></div>',
  ),
]

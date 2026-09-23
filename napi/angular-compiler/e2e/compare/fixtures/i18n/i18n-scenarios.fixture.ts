/**
 * i18n scenarios checked against Angular's output while fixing oxc's i18n code generation,
 * covering cases that Angular's compliance and acceptance specs do not (generated fixtures).
 */
import type { Fixture } from '../types.js'

export const fixtures: Fixture[] = [
  {
    name: 'i18n-scenario-tag-placeholder',
    category: 'i18n',
    description: 'i18n scenario: <span i18n>Hello <b>world</b>!</span>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<span i18n>Hello <b>world</b>!</span>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-empty-attr',
    category: 'i18n',
    description: 'i18n scenario: <div i18n-title title=""></div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n-title title=\"\"></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-custom-ph',
    category: 'i18n',
    description: 'i18n scenario: <span i18n>Hello {{ name // i18n(ph="PH") }}</span>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<span i18n>Hello {{ name // i18n(ph=\"PH\") }}</span>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-icu-space-tag',
    category: 'i18n',
    description: 'i18n scenario: <div i18n>{count, plural, =1 {one} other {many}} <b>x</b></div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>{count, plural, =1 {one} other {many}} <b>x</b></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-if-else-block',
    category: 'i18n',
    description: 'i18n scenario: <div i18n>@if (count) {<span>yes</span>} @else {no}</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>@if (count) {<span>yes</span>} @else {no}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-bound-prop-i18n',
    category: 'i18n',
    description: 'i18n scenario: <div [title]="name" i18n-title="@@t"></div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div [title]=\"name\" i18n-title=\"@@t\"></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-meta-colon',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n="meaning:A|descA@@idA">Content A</div><div i18n-title="d: x@@t2" title',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n=\"meaning:A|descA@@idA\">Content A</div><div i18n-title=\"d: x@@t2\" title=\"T\">x</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-bare-icu',
    category: 'i18n',
    description:
      'i18n scenario: <div>{gender, select, male {male} female {female} other {other}}</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div>{gender, select, male {male} female {female} other {other}}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-nested-icu',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n>{gender, select, male {m {count, select, 3 {three} other {o}}} female ',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>{gender, select, male {m {count, select, 3 {three} other {o}}} female {f {count, select, 3 {three} other {o}}} other {x}}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-icu-attr-interp',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n>{gender, select, other {<span title="{{name}}-{{name}}">foo</span>}}</',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>{gender, select, other {<span title=\"{{name}}-{{name}}\">foo</span>}}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-icu-keyword-spaces',
    category: 'i18n',
    description: 'i18n scenario: <div i18n>{count, select , 3 {three} other {more}}</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>{count, select , 3 {three} other {more}}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-root-icu-elements',
    category: 'i18n',
    description:
      'i18n scenario: <span i18n="someText1">{gender, select, female {<strong>someText</strong>} other',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<span i18n=\"someText1\">{gender, select, female {<strong>someText</strong>} other {x}}</span>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-void-tag',
    category: 'i18n',
    description: 'i18n scenario: <div i18n><img src="a.png"> is my logo</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n><img src=\"a.png\"> is my logo</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-nested-tag-order',
    category: 'i18n',
    description: 'i18n scenario: <div i18n><span title="x">a<span>inner</span></span></div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n><span title=\"x\">a<span>inner</span></span></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-ng-content',
    category: 'i18n',
    description: 'i18n scenario: <div i18n><ng-content select="x"></ng-content>tail</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n><ng-content select=\"x\"></ng-content>tail</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-ph-spaces',
    category: 'i18n',
    description: 'i18n scenario: <div i18n>Hi {{ name // i18n(ph = "who") }}</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>Hi {{ name // i18n(ph = \"who\") }}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-structural-i18n',
    category: 'i18n',
    description: 'i18n scenario: <div i18n *ngIf="visible">Some <span>{{ name }}</span></div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n *ngIf=\"visible\">Some <span>{{ name }}</span></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-attr-interp-sibling',
    category: 'i18n',
    description: 'i18n scenario: <div i18n>{{ name }}<h1 i18n-title title="{{ name }}"></h1></div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>{{ name }}<h1 i18n-title title=\"{{ name }}\"></h1></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-namespace',
    category: 'i18n',
    description:
      'i18n scenario: <svg xmlns="http://www.w3.org/2000/svg"><foreignObject><xhtml:div xmlns="http://',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<svg xmlns=\"http://www.w3.org/2000/svg\"><foreignObject><xhtml:div xmlns=\"http://www.w3.org/1999/xhtml\" i18n>Count: <span>5</span></xhtml:div></foreignObject></svg>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-svg-in-i18n',
    category: 'i18n',
    description: 'i18n scenario: <div i18n>Save <svg><circle r="1"></circle></svg> now</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>Save <svg><circle r=\"1\"></circle></svg> now</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-entities-text',
    category: 'i18n',
    description: 'i18n scenario: <div i18n>Tom &amp; Jerry &lt;3 &nbsp;&copy; {{ name }}</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>Tom &amp; Jerry &lt;3 &nbsp;&copy; {{ name }}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-entities-attr',
    category: 'i18n',
    description: 'i18n scenario: <div i18n-title title="A &amp; B &quot;q&quot;"></div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n-title title=\"A &amp; B &quot;q&quot;\"></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-entities-icu',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n>{count, plural, =1 {one &amp; only} other {&lt;many&gt;}}</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>{count, plural, =1 {one &amp; only} other {&lt;many&gt;}}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-ngsp',
    category: 'i18n',
    description: 'i18n scenario: <div i18n>a&ngsp;b</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>a&ngsp;b</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-let-in-i18n',
    category: 'i18n',
    description:
      "i18n scenario: @let greeting = 'Hi ' + name;<div i18n>{{ greeting }}, welcome</div>",
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `@let greeting = 'Hi ' + name;<div i18n>{{ greeting }}, welcome</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-listener-in-i18n',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n>Click <button (click)="count = count + 1">here</button> now</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>Click <button (click)=\"count = count + 1\">here</button> now</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-attr-binding-in-i18n',
    category: 'i18n',
    description: 'i18n scenario: <div i18n>Go <a [attr.href]="name" title="t">there</a></div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>Go <a [attr.href]=\"name\" title=\"t\">there</a></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-icu-pipe',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n>{count, plural, =1 {one {{ name | uppercase }}} other {{{ count | numb',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>{count, plural, =1 {one {{ name | uppercase }}} other {{{ count | number }} items}}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-ngif-else-i18n',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n><span *ngIf="visible; else other">yes</span><ng-template #other>no</ng',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n><span *ngIf=\"visible; else other\">yes</span><ng-template #other>no</ng-template></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-ngfor-i18n',
    category: 'i18n',
    description: 'i18n scenario: <ul i18n><li *ngFor="let i of items">Item {{ i }}</li></ul>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<ul i18n><li *ngFor=\"let i of items\">Item {{ i }}</li></ul>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-switch-i18n',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n>@switch (count) { @case (3) {<b>three</b>} @default {other} }</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>@switch (count) { @case (3) {<b>three</b>} @default {other} }</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-deep-nested-i18n',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n><div *ngIf="visible"><span *ngIf="visible">{{ name }} <b>{{ count }}</',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n><div *ngIf=\"visible\"><span *ngIf=\"visible\">{{ name }} <b>{{ count }}</b></span></div></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-ngif-in-i18n',
    category: 'i18n',
    description: 'i18n scenario: <div i18n><span *ngIf="count">x</span></div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n><span *ngIf=\"count\">x</span></div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
  {
    name: 'i18n-scenario-non-bindable',
    category: 'i18n',
    description:
      'i18n scenario: <div i18n>Hi <span ngNonBindable>{{ raw }}</span> {{ name }}</div>',
    className: 'ScenarioComponent',
    type: 'full-transform',
    skipReason: "Angular's compiler crashes on ngNonBindable inside an i18n block",
    sourceCode:
      "import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-scenario',\n  imports: [CommonModule],\n  template: `<div i18n>Hi <span ngNonBindable>{{ raw }}</span> {{ name }}</div>`,\n})\nexport class ScenarioComponent {\n  count = 3;\n  name = 'Bob';\n  gender = 'female';\n  items = [1, 2];\n  visible = true;\n}\n",
  },
]

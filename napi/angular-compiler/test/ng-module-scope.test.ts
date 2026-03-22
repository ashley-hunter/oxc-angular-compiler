import { describe, it, expect } from 'vitest'
import { NgModuleScopeCollector } from '../vite-plugin/ng-module-scope.js'
import type { ResolveAndReadFn } from '../vite-plugin/ng-module-scope.js'
import { extractNgModuleInfoSync } from '#binding'

/**
 * Mock compiled Angular module sources for testing.
 *
 * These simulate the fesm2022 output format that Angular ships in node_modules,
 * using `ɵɵngDeclareNgModule`, `ɵɵngDeclareDirective`, and `ɵɵngDeclarePipe`.
 */
const MOCK_MODULES: Record<string, string> = {
  '@angular/common': `
    import * as i0 from "@angular/core";
    class NgForOf { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgForOf, selector: "[ngFor][ngForOf]" }); }
    class NgIf { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgIf, selector: "[ngIf]" }); }
    class NgSwitch { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgSwitch, selector: "[ngSwitch]" }); }
    class NgSwitchCase { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgSwitchCase, selector: "[ngSwitchCase]" }); }
    class NgSwitchDefault { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgSwitchDefault, selector: "[ngSwitchDefault]" }); }
    class NgTemplateOutlet { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgTemplateOutlet, selector: "[ngTemplateOutlet]" }); }
    class NgComponentOutlet { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgComponentOutlet, selector: "[ngComponentOutlet]" }); }
    class NgClass { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgClass, selector: "[ngClass]" }); }
    class NgStyle { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgStyle, selector: "[ngStyle]" }); }
    class NgPlural { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgPlural, selector: "[ngPlural]" }); }
    class NgPluralCase { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgPluralCase, selector: "[ngPluralCase]" }); }
    class AsyncPipe { static ɵpipe = i0.ɵɵngDeclarePipe({ type: AsyncPipe, name: "async" }); }
    class UpperCasePipe { static ɵpipe = i0.ɵɵngDeclarePipe({ type: UpperCasePipe, name: "uppercase" }); }
    class LowerCasePipe { static ɵpipe = i0.ɵɵngDeclarePipe({ type: LowerCasePipe, name: "lowercase" }); }
    class DatePipe { static ɵpipe = i0.ɵɵngDeclarePipe({ type: DatePipe, name: "date" }); }
    class JsonPipe { static ɵpipe = i0.ɵɵngDeclarePipe({ type: JsonPipe, name: "json" }); }
    class SlicePipe { static ɵpipe = i0.ɵɵngDeclarePipe({ type: SlicePipe, name: "slice" }); }
    class KeyValuePipe { static ɵpipe = i0.ɵɵngDeclarePipe({ type: KeyValuePipe, name: "keyvalue" }); }
    class CommonModule {
      static ɵmod = i0.ɵɵngDeclareNgModule({
        type: CommonModule,
        imports: [NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, NgTemplateOutlet, NgComponentOutlet, NgClass, NgStyle, NgPlural, NgPluralCase, AsyncPipe, UpperCasePipe, LowerCasePipe, DatePipe, JsonPipe, SlicePipe, KeyValuePipe],
        exports: [NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, NgTemplateOutlet, NgComponentOutlet, NgClass, NgStyle, NgPlural, NgPluralCase, AsyncPipe, UpperCasePipe, LowerCasePipe, DatePipe, JsonPipe, SlicePipe, KeyValuePipe]
      });
    }
  `,
  '@angular/platform-browser': `
    import * as i0 from "@angular/core";
    import { CommonModule } from "@angular/common";
    import { ApplicationModule } from "@angular/core";
    class BrowserModule {
      static ɵmod = i0.ɵɵngDeclareNgModule({
        type: BrowserModule,
        exports: [CommonModule, ApplicationModule]
      });
    }
  `,
  '@angular/router': `
    import * as i0 from "@angular/core";
    class RouterOutlet { static ɵdir = i0.ɵɵngDeclareDirective({ type: RouterOutlet, selector: "router-outlet" }); }
    class RouterLink { static ɵdir = i0.ɵɵngDeclareDirective({ type: RouterLink, selector: "[routerLink]" }); }
    class RouterLinkActive { static ɵdir = i0.ɵɵngDeclareDirective({ type: RouterLinkActive, selector: "[routerLinkActive]" }); }
    class RouterModule {
      static ɵmod = i0.ɵɵngDeclareNgModule({
        type: RouterModule,
        imports: [RouterOutlet, RouterLink, RouterLinkActive],
        exports: [RouterOutlet, RouterLink, RouterLinkActive]
      });
    }
  `,
  '@angular/forms': `
    import * as i0 from "@angular/core";
    class NgModel { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgModel, selector: "[ngModel]" }); }
    class NgForm { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgForm, selector: "form:not([ngNoForm])" }); }
    class NgModelGroup { static ɵdir = i0.ɵɵngDeclareDirective({ type: NgModelGroup, selector: "[ngModelGroup]" }); }
    class FormsModule {
      static ɵmod = i0.ɵɵngDeclareNgModule({
        type: FormsModule,
        declarations: [NgModel, NgModelGroup, NgForm],
        exports: [NgModel, NgModelGroup, NgForm]
      });
    }
    class FormControlDirective { static ɵdir = i0.ɵɵngDeclareDirective({ type: FormControlDirective, selector: "[formControl]" }); }
    class FormControlName { static ɵdir = i0.ɵɵngDeclareDirective({ type: FormControlName, selector: "[formControlName]" }); }
    class FormGroupDirective { static ɵdir = i0.ɵɵngDeclareDirective({ type: FormGroupDirective, selector: "[formGroup]" }); }
    class FormGroupName { static ɵdir = i0.ɵɵngDeclareDirective({ type: FormGroupName, selector: "[formGroupName]" }); }
    class FormArrayName { static ɵdir = i0.ɵɵngDeclareDirective({ type: FormArrayName, selector: "[formArrayName]" }); }
    class ReactiveFormsModule {
      static ɵmod = i0.ɵɵngDeclareNgModule({
        type: ReactiveFormsModule,
        declarations: [FormControlDirective, FormControlName, FormGroupDirective, FormGroupName, FormArrayName],
        exports: [FormControlDirective, FormControlName, FormGroupDirective, FormGroupName, FormArrayName]
      });
    }
  `,
}

/**
 * Create a mock resolveAndRead function for tests.
 */
function createMockResolver(): ResolveAndReadFn {
  return (specifier: string) => {
    const source = MOCK_MODULES[specifier]
    if (!source) return undefined
    return { source, filePath: `/node_modules/${specifier}/fesm2022/index.mjs` }
  }
}

describe('NgModuleScopeCollector', () => {
  describe('collectFromSource', () => {
    it('should extract NgModule declarations and imports', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';

        @NgModule({
          declarations: [UserListComponent, UserBadgeComponent],
          imports: [CommonModule],
          exports: [UserListComponent]
        })
        export class UsersModule {}
        `,
        'users.module.ts',
      )

      const scope = collector.getScopeForComponent('UserListComponent')
      expect(scope).toBeDefined()
      expect(scope!.length).toBeGreaterThan(0)

      // Should include CommonModule exports (NgForOf, NgIf, pipes, etc.)
      const names = scope!.map((d) => d.name)
      expect(names).toContain('NgForOf')
      expect(names).toContain('NgIf')
      expect(names).toContain('UpperCasePipe')
      expect(names).toContain('AsyncPipe')
    })

    it('should handle Module.forRoot() imports', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { CommonModule } from '@angular/common';
        import { RouterModule } from '@angular/router';

        @NgModule({
          declarations: [AppComponent],
          imports: [CommonModule, RouterModule.forRoot(routes)]
        })
        export class AppModule {}
        `,
        'app.module.ts',
      )

      const scope = collector.getScopeForComponent('AppComponent')
      expect(scope).toBeDefined()

      const names = scope!.map((d) => d.name)
      // Should include both CommonModule and RouterModule exports
      expect(names).toContain('NgForOf')
      expect(names).toContain('RouterOutlet')
      expect(names).toContain('RouterLink')
    })

    it('should return undefined for unknown components', () => {
      const collector = new NgModuleScopeCollector()

      collector.collectFromSource(
        `
        @NgModule({ declarations: [KnownComponent] })
        export class MyModule {}
        `,
        'my.module.ts',
      )

      expect(collector.getScopeForComponent('UnknownComponent')).toBeUndefined()
    })

    it('should handle multiple NgModules in one file', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { CommonModule } from '@angular/common';
        import { RouterModule } from '@angular/router';

        @NgModule({
          declarations: [CompA],
          imports: [CommonModule]
        })
        export class ModuleA {}

        @NgModule({
          declarations: [CompB],
          imports: [RouterModule]
        })
        export class ModuleB {}
        `,
        'multi.module.ts',
      )

      const scopeA = collector.getScopeForComponent('CompA')
      const scopeB = collector.getScopeForComponent('CompB')

      expect(scopeA).toBeDefined()
      expect(scopeB).toBeDefined()

      const namesA = scopeA!.map((d) => d.name)
      const namesB = scopeB!.map((d) => d.name)

      // CompA should have CommonModule deps
      expect(namesA).toContain('NgForOf')
      expect(namesA).not.toContain('RouterOutlet')

      // CompB should have RouterModule deps
      expect(namesB).toContain('RouterOutlet')
      expect(namesB).not.toContain('NgForOf')
    })

    it('should collect across multiple files', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      // File 1: just the module
      collector.collectFromSource(
        `
        import { CommonModule } from '@angular/common';

        @NgModule({
          declarations: [MyComponent],
          imports: [CommonModule]
        })
        export class MyModule {}
        `,
        'my.module.ts',
      )

      // File 2: just the component (no @NgModule here)
      collector.collectFromSource(
        `
        @Component({
          selector: 'app-my',
          standalone: false,
          template: '<div>hello</div>'
        })
        export class MyComponent {}
        `,
        'my.component.ts',
      )

      // The scope should still be available because the module was collected first
      const scope = collector.getScopeForComponent('MyComponent')
      expect(scope).toBeDefined()
      expect(scope!.map((d) => d.name)).toContain('NgForOf')
    })

    it('should handle BrowserModule (re-exports CommonModule)', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { BrowserModule } from '@angular/platform-browser';

        @NgModule({
          declarations: [AppComponent],
          imports: [BrowserModule]
        })
        export class AppModule {}
        `,
        'app.module.ts',
      )

      const scope = collector.getScopeForComponent('AppComponent')
      expect(scope).toBeDefined()

      const names = scope!.map((d) => d.name)
      // BrowserModule should provide CommonModule exports
      expect(names).toContain('NgForOf')
      expect(names).toContain('NgIf')
      expect(names).toContain('UpperCasePipe')
    })

    it('should detect pipe kind from resolved modules', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { CommonModule } from '@angular/common';

        @NgModule({
          declarations: [MyComponent],
          imports: [CommonModule]
        })
        export class MyModule {}
        `,
        'my.module.ts',
      )

      const scope = collector.getScopeForComponent('MyComponent')!
      const upperCasePipe = scope.find((d) => d.name === 'UpperCasePipe')

      expect(upperCasePipe).toBeDefined()
      expect(upperCasePipe!.kind).toBe('pipe')
      expect(upperCasePipe!.module).toBe('@angular/common')
    })

    it('should detect directive kind from resolved modules', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { CommonModule } from '@angular/common';

        @NgModule({
          declarations: [MyComponent],
          imports: [CommonModule]
        })
        export class MyModule {}
        `,
        'my.module.ts',
      )

      const scope = collector.getScopeForComponent('MyComponent')!
      const ngForOf = scope.find((d) => d.name === 'NgForOf')

      expect(ngForOf).toBeDefined()
      expect(ngForOf!.kind).toBe('directive')
      expect(ngForOf!.module).toBe('@angular/common')
    })
  })

  describe('buildScopeMap', () => {
    it('should return a map of all component scopes', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { CommonModule } from '@angular/common';

        @NgModule({
          declarations: [CompA, CompB],
          imports: [CommonModule]
        })
        export class MyModule {}
        `,
        'my.module.ts',
      )

      const scopeMap = collector.buildScopeMap()
      expect(scopeMap.size).toBe(2)
      expect(scopeMap.has('CompA')).toBe(true)
      expect(scopeMap.has('CompB')).toBe(true)

      // Both should have the same scope (same module)
      expect(scopeMap.get('CompA')!.length).toBe(scopeMap.get('CompB')!.length)
    })
  })

  describe('clear', () => {
    it('should clear all collected data', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { CommonModule } from '@angular/common';

        @NgModule({ declarations: [Comp], imports: [CommonModule] })
        export class Mod {}
        `,
        'mod.ts',
      )

      expect(collector.getScopeForComponent('Comp')).toBeDefined()

      collector.clear()
      expect(collector.getScopeForComponent('Comp')).toBeUndefined()
    })
  })

  describe('nested braces handling', () => {
    it('should handle NgModule with providers containing nested objects', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';

        @NgModule({
          declarations: [MyComponent],
          imports: [CommonModule],
          providers: [
            { provide: 'TOKEN', useValue: { nested: { deep: true } } },
            { provide: 'OTHER', useFactory: () => ({ key: 'value' }) }
          ]
        })
        export class AppModule {}
        `,
        'app.module.ts',
      )

      const scope = collector.getScopeForComponent('MyComponent')
      expect(scope).toBeDefined()
      expect(scope!.map((d) => d.name)).toContain('NgForOf')
    })
  })

  describe('sibling declarations', () => {
    it('should include imported sibling declarations in scope', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';
        import { HighlightDirective } from './highlight.directive';
        import { HeroListComponent } from './hero-list.component';

        @NgModule({
          declarations: [HeroListComponent, HighlightDirective],
          imports: [CommonModule]
        })
        export class HeroModule {}
        `,
        'hero.module.ts',
      )

      const scope = collector.getScopeForComponent('HeroListComponent')
      expect(scope).toBeDefined()

      const names = scope!.map((d) => d.name)
      // Should include the sibling declaration
      expect(names).toContain('HighlightDirective')
      // Should also include CommonModule exports
      expect(names).toContain('NgForOf')

      // HighlightDirective should have its source module
      const highlight = scope!.find((d) => d.name === 'HighlightDirective')
      expect(highlight!.module).toBe('./highlight.directive')
    })
  })

  describe('user-defined module exports', () => {
    it('should resolve exports from user-defined modules', () => {
      const collector = new NgModuleScopeCollector()

      // First file: SharedModule that exports a directive
      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { HighlightDirective } from './highlight.directive';

        @NgModule({
          declarations: [HighlightDirective],
          exports: [HighlightDirective]
        })
        export class SharedModule {}
        `,
        'shared.module.ts',
      )

      // Second file: AppModule that imports SharedModule
      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { SharedModule } from './shared.module';

        @NgModule({
          declarations: [AppComponent],
          imports: [SharedModule]
        })
        export class AppModule {}
        `,
        'app.module.ts',
      )

      const scope = collector.getScopeForComponent('AppComponent')
      expect(scope).toBeDefined()

      const names = scope!.map((d) => d.name)
      expect(names).toContain('HighlightDirective')
    })

    it('should resolve locally-defined exports using file path', () => {
      const collector = new NgModuleScopeCollector()

      // SharedModule defines and exports a directive in the same file
      collector.collectFromSource(
        `
        import { NgModule, Directive } from '@angular/core';

        @Directive({ selector: '[highlight]' })
        export class HighlightDirective {}

        @NgModule({
          declarations: [HighlightDirective],
          exports: [HighlightDirective]
        })
        export class SharedModule {}
        `,
        'shared.module.ts',
      )

      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { SharedModule } from './shared.module';

        @NgModule({
          declarations: [AppComponent],
          imports: [SharedModule]
        })
        export class AppModule {}
        `,
        'app.module.ts',
      )

      const scope = collector.getScopeForComponent('AppComponent')
      expect(scope).toBeDefined()

      const highlight = scope!.find((d) => d.name === 'HighlightDirective')
      expect(highlight).toBeDefined()
      // Locally defined in SharedModule — uses the import specifier from AppModule
      expect(highlight!.module).toBe('./shared.module')
    })
  })

  describe('HMR re-parse cleanup', () => {
    it('should remove stale declarations when a module is re-parsed', () => {
      const collector = new NgModuleScopeCollector(createMockResolver())

      // Initial parse: module with two declarations
      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';

        @NgModule({
          declarations: [CompA, CompB],
          imports: [CommonModule]
        })
        export class MyModule {}
        `,
        'my.module.ts',
      )

      expect(collector.getScopeForComponent('CompA')).toBeDefined()
      expect(collector.getScopeForComponent('CompB')).toBeDefined()

      // Re-parse: CompB removed from declarations
      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';

        @NgModule({
          declarations: [CompA],
          imports: [CommonModule]
        })
        export class MyModule {}
        `,
        'my.module.ts',
      )

      expect(collector.getScopeForComponent('CompA')).toBeDefined()
      expect(collector.getScopeForComponent('CompB')).toBeUndefined()
    })
  })

  describe('pipe kind detection', () => {
    it('should detect pipes and set correct kind for same-file declarations', () => {
      const collector = new NgModuleScopeCollector()

      // File with a pipe
      collector.collectFromSource(
        `
        import { Pipe, PipeTransform } from '@angular/core';

        @Pipe({ name: 'myPipe' })
        export class MyPipe implements PipeTransform {
          transform(value: string): string { return value; }
        }
        `,
        'my.pipe.ts',
      )

      // Module that imports and declares the pipe
      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { MyPipe } from './my.pipe';

        @NgModule({
          declarations: [MyComponent, MyPipe],
          exports: [MyPipe]
        })
        export class SharedModule {}
        `,
        'shared.module.ts',
      )

      // Another module importing SharedModule
      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { SharedModule } from './shared.module';

        @NgModule({
          declarations: [AppComponent],
          imports: [SharedModule]
        })
        export class AppModule {}
        `,
        'app.module.ts',
      )

      const scope = collector.getScopeForComponent('AppComponent')
      expect(scope).toBeDefined()

      const myPipe = scope!.find((d) => d.name === 'MyPipe')
      expect(myPipe).toBeDefined()
      expect(myPipe!.kind).toBe('pipe')
    })

    it('should detect pipes in sibling declarations', () => {
      const collector = new NgModuleScopeCollector()

      // File with a pipe
      collector.collectFromSource(
        `
        import { Pipe } from '@angular/core';

        @Pipe({ name: 'format' })
        export class FormatPipe {}
        `,
        'format.pipe.ts',
      )

      // Module with pipe as sibling declaration
      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { FormatPipe } from './format.pipe';

        @NgModule({
          declarations: [MyComponent, FormatPipe],
          imports: []
        })
        export class MyModule {}
        `,
        'my.module.ts',
      )

      const scope = collector.getScopeForComponent('MyComponent')
      expect(scope).toBeDefined()

      const formatPipe = scope!.find((d) => d.name === 'FormatPipe')
      expect(formatPipe).toBeDefined()
      expect(formatPipe!.kind).toBe('pipe')
    })
  })

  describe('dynamic module resolution', () => {
    it('should resolve third-party modules dynamically', () => {
      const collector = new NgModuleScopeCollector((specifier) => {
        if (specifier === 'ngx-translate') {
          return {
            source: `
              import * as i0 from "@angular/core";
              class TranslatePipe { static ɵpipe = i0.ɵɵngDeclarePipe({ type: TranslatePipe, name: "translate" }); }
              class TranslateDirective { static ɵdir = i0.ɵɵngDeclareDirective({ type: TranslateDirective, selector: "[translate]" }); }
              class TranslateModule {
                static ɵmod = i0.ɵɵngDeclareNgModule({
                  type: TranslateModule,
                  declarations: [TranslatePipe, TranslateDirective],
                  exports: [TranslatePipe, TranslateDirective]
                });
              }
            `,
            filePath: '/node_modules/ngx-translate/fesm2022/index.mjs',
          }
        }
        return undefined
      })

      collector.collectFromSource(
        `
        import { NgModule } from '@angular/core';
        import { TranslateModule } from 'ngx-translate';

        @NgModule({
          declarations: [AppComponent],
          imports: [TranslateModule]
        })
        export class AppModule {}
        `,
        'app.module.ts',
      )

      const scope = collector.getScopeForComponent('AppComponent')
      expect(scope).toBeDefined()

      const names = scope!.map((d) => d.name)
      expect(names).toContain('TranslatePipe')
      expect(names).toContain('TranslateDirective')

      const pipe = scope!.find((d) => d.name === 'TranslatePipe')
      expect(pipe!.kind).toBe('pipe')

      const directive = scope!.find((d) => d.name === 'TranslateDirective')
      expect(directive!.kind).toBe('directive')
    })

    it('should cache resolved modules', () => {
      let resolveCount = 0
      const collector = new NgModuleScopeCollector((specifier) => {
        if (specifier === '@angular/common') {
          resolveCount++
          return {
            source: MOCK_MODULES['@angular/common'],
            filePath: '/node_modules/@angular/common/fesm2022/index.mjs',
          }
        }
        return undefined
      })

      // Parse two modules both importing CommonModule
      collector.collectFromSource(
        `
        import { CommonModule } from '@angular/common';
        @NgModule({ declarations: [CompA], imports: [CommonModule] })
        export class ModA {}
        `,
        'mod-a.ts',
      )

      collector.collectFromSource(
        `
        import { CommonModule } from '@angular/common';
        @NgModule({ declarations: [CompB], imports: [CommonModule] })
        export class ModB {}
        `,
        'mod-b.ts',
      )

      // Build scope for both — should only resolve @angular/common once
      collector.buildScopeMap()
      expect(resolveCount).toBe(1)
    })

    it('should handle external assignment pattern (older Angular)', () => {
      const info = extractNgModuleInfoSync(
        `
        import * as i0 from "@angular/core";
        class MyComponent {}
        class MyModule {}
        MyModule.ɵmod = i0.ɵɵngDeclareNgModule({
          type: MyModule,
          declarations: [MyComponent],
          exports: [MyComponent]
        });
        `,
        'test.mjs',
      )

      expect(info.modules).toHaveLength(1)
      expect(info.modules[0].className).toBe('MyModule')
      expect(info.modules[0].declarations).toEqual(['MyComponent'])
      expect(info.modules[0].exports).toEqual(['MyComponent'])
    })

    it('should detect class kinds from ɵɵngDeclare* calls', () => {
      const info = extractNgModuleInfoSync(
        `
        import * as i0 from "@angular/core";
        class MyDirective { static ɵdir = i0.ɵɵngDeclareDirective({ type: MyDirective, selector: "[my]" }); }
        class MyPipe { static ɵpipe = i0.ɵɵngDeclarePipe({ type: MyPipe, name: "my" }); }
        class MyComponent { static ɵcmp = i0.ɵɵngDeclareComponent({ type: MyComponent }); }
        `,
        'test.mjs',
      )

      expect(info.classKinds['MyDirective']).toBe('directive')
      expect(info.classKinds['MyPipe']).toBe('pipe')
      expect(info.classKinds['MyComponent']).toBe('component')
    })

    it('should work without resolveAndRead callback', () => {
      const collector = new NgModuleScopeCollector()

      collector.collectFromSource(
        `
        @NgModule({
          declarations: [AppComponent],
          imports: [CommonModule]
        })
        export class AppModule {}
        `,
        'app.module.ts',
      )

      // Without resolveAndRead, CommonModule won't be resolved
      // but the collector should still work without errors
      const scope = collector.getScopeForComponent('AppComponent')
      expect(scope).toBeDefined()
      // No CommonModule exports since it can't be resolved
      expect(scope!.length).toBe(0)
    })
  })
})

describe('extractNgModuleInfoSync', () => {
  it('should extract NgModule metadata with proper parsing', () => {
    const info = extractNgModuleInfoSync(
      `
      import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { MyComponent } from './my.component';

      @NgModule({
        declarations: [MyComponent],
        imports: [CommonModule],
        exports: [MyComponent]
      })
      export class AppModule {}
      `,
      'app.module.ts',
    )

    expect(info.modules).toHaveLength(1)
    expect(info.modules[0].className).toBe('AppModule')
    expect(info.modules[0].declarations).toEqual(['MyComponent'])
    expect(info.modules[0].imports).toEqual(['CommonModule'])
    expect(info.modules[0].exports).toEqual(['MyComponent'])
  })

  it('should handle nested braces in providers', () => {
    const info = extractNgModuleInfoSync(
      `
      import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { MyComponent } from './my.component';

      @NgModule({
        declarations: [MyComponent],
        imports: [CommonModule],
        providers: [
          { provide: 'TOKEN', useValue: { nested: { deep: true } } },
          { provide: 'OTHER', useFactory: () => ({ key: 'value' }) }
        ]
      })
      export class AppModule {}
      `,
      'app.module.ts',
    )

    expect(info.modules).toHaveLength(1)
    expect(info.modules[0].declarations).toEqual(['MyComponent'])
    expect(info.modules[0].imports).toEqual(['CommonModule'])
  })

  it('should resolve import sources', () => {
    const info = extractNgModuleInfoSync(
      `
      import { NgModule } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { MyDirective } from './my.directive';

      @NgModule({
        declarations: [MyDirective],
        imports: [CommonModule]
      })
      export class AppModule {}
      `,
      'app.module.ts',
    )

    expect(info.importSources['CommonModule']).toBe('@angular/common')
    expect(info.importSources['MyDirective']).toBe('./my.directive')
  })

  it('should detect class decorator kinds', () => {
    const info = extractNgModuleInfoSync(
      `
      import { Component, Directive, Pipe, NgModule } from '@angular/core';

      @Component({ selector: 'app-root', template: '' })
      export class AppComponent {}

      @Directive({ selector: '[highlight]' })
      export class HighlightDirective {}

      @Pipe({ name: 'format' })
      export class FormatPipe {}

      @NgModule({ declarations: [AppComponent, HighlightDirective, FormatPipe] })
      export class AppModule {}
      `,
      'app.module.ts',
    )

    expect(info.classKinds['AppComponent']).toBe('component')
    expect(info.classKinds['HighlightDirective']).toBe('directive')
    expect(info.classKinds['FormatPipe']).toBe('pipe')
  })

  it('should handle forwardRef and Module.forRoot', () => {
    const info = extractNgModuleInfoSync(
      `
      import { NgModule, forwardRef } from '@angular/core';
      import { RouterModule } from '@angular/router';
      import { LazyModule } from './lazy.module';

      @NgModule({
        imports: [RouterModule.forRoot(routes), forwardRef(() => LazyModule)]
      })
      export class AppModule {}
      `,
      'app.module.ts',
    )

    expect(info.modules[0].imports).toContain('RouterModule')
    expect(info.modules[0].imports).toContain('LazyModule')
    expect(info.modules[0].containsForwardDecls).toBe(true)
  })

  it('should extract from ɵɵngDeclareNgModule static fields', () => {
    const info = extractNgModuleInfoSync(
      `
      import * as i0 from "@angular/core";
      class NgForOf {}
      class NgIf {}
      class AsyncPipe {}
      class CommonModule {
        static ɵmod = i0.ɵɵngDeclareNgModule({
          type: CommonModule,
          imports: [NgForOf, NgIf, AsyncPipe],
          exports: [NgForOf, NgIf, AsyncPipe]
        });
      }
      `,
      'common.mjs',
    )

    expect(info.modules).toHaveLength(1)
    expect(info.modules[0].className).toBe('CommonModule')
    expect(info.modules[0].imports).toEqual(['NgForOf', 'NgIf', 'AsyncPipe'])
    expect(info.modules[0].exports).toEqual(['NgForOf', 'NgIf', 'AsyncPipe'])
  })
})

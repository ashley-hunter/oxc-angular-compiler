import { describe, it, expect } from 'vitest'
import { NgModuleScopeCollector } from '../vite-plugin/ng-module-scope.js'
import { extractNgModuleInfoSync } from '#binding'

describe('NgModuleScopeCollector', () => {
  describe('collectFromSource', () => {
    it('should extract NgModule declarations and imports', () => {
      const collector = new NgModuleScopeCollector()

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
      const collector = new NgModuleScopeCollector()

      collector.collectFromSource(
        `
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
      const collector = new NgModuleScopeCollector()

      collector.collectFromSource(
        `
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
      const collector = new NgModuleScopeCollector()

      // File 1: just the module
      collector.collectFromSource(
        `
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
      const collector = new NgModuleScopeCollector()

      collector.collectFromSource(
        `
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

    it('should include pipe metadata', () => {
      const collector = new NgModuleScopeCollector()

      collector.collectFromSource(
        `
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
      expect(upperCasePipe!.pipeName).toBe('uppercase')
      expect(upperCasePipe!.module).toBe('@angular/common')
    })

    it('should include directive metadata with selectors', () => {
      const collector = new NgModuleScopeCollector()

      collector.collectFromSource(
        `
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
      expect(ngForOf!.selector).toBe('[ngFor][ngForOf]')
      expect(ngForOf!.module).toBe('@angular/common')
    })
  })

  describe('buildScopeMap', () => {
    it('should return a map of all component scopes', () => {
      const collector = new NgModuleScopeCollector()

      collector.collectFromSource(
        `
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
      const collector = new NgModuleScopeCollector()

      collector.collectFromSource(
        `
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
      const collector = new NgModuleScopeCollector()

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
      const collector = new NgModuleScopeCollector()

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
      // Locally defined — falls back to file path as source
      expect(highlight!.module).toBe('shared.module.ts')
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
})

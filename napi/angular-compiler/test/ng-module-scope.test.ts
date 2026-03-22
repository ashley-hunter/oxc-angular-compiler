import { describe, it, expect } from 'vitest'
import { NgModuleScopeCollector } from '../vite-plugin/ng-module-scope.js'

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
})

/**
 * NgModule scope collector for compile-time dependency resolution.
 *
 * This module scans TypeScript files for @NgModule decorators and builds
 * a scope map that maps component class names to their available dependencies
 * (directives and pipes from the NgModule's imports and declarations).
 *
 * This enables the OXC Angular compiler to emit compile-time resolved
 * `dependencies: [NgForOf, UpperCasePipe]` instead of runtime-resolved
 * `ɵɵgetComponentDepsFactory(Component)`.
 *
 * Design choice: We emit ALL directives/pipes visible in the NgModule scope
 * without template selector matching ("full scope" / Option B). Trade-offs:
 *
 * - Pro: Always correct — over-inclusion is safe (Angular ignores non-matching deps)
 * - Pro: No need to reimplement Angular's selector matching (complex, error-prone)
 * - Pro: Matches Angular's local compilation mode behavior for standalone components
 * - Con: Slightly larger output — unused deps appear in the dependency array
 * - Con: No compile-time tree-shaking of unused directives/pipes
 *
 * The runtime cost is negligible: Angular simply skips directives whose selectors
 * don't match any template element.
 */

import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'

/**
 * A dependency from an NgModule's compilation scope.
 */
export interface NgModuleScopeDep {
  /** The class name (e.g., "NgForOf", "UpperCasePipe") */
  name: string
  /** The module path (e.g., "@angular/common") */
  module: string
  /** "directive" or "pipe" */
  kind: string
  /** CSS selector for directives */
  selector?: string
  /** Pipe name for pipes */
  pipeName?: string
}

/**
 * Metadata extracted from an @NgModule decorator.
 */
interface NgModuleInfo {
  /** The NgModule class name */
  className: string
  /** Declared components/directives/pipes */
  declarations: string[]
  /** Imported modules */
  imports: string[]
  /** Exported classes */
  exports: string[]
  /** The file path of the NgModule */
  filePath: string
}

/**
 * Registry of well-known Angular modules and their exported directives/pipes.
 *
 * This provides the exports for standard Angular modules like CommonModule,
 * FormsModule, etc. without needing to parse the Angular source code.
 */
const WELL_KNOWN_MODULES: Record<string, NgModuleScopeDep[]> = {
  CommonModule: [
    // Structural directives
    { name: 'NgForOf', module: '@angular/common', kind: 'directive', selector: '[ngFor][ngForOf]' },
    { name: 'NgIf', module: '@angular/common', kind: 'directive', selector: '[ngIf]' },
    { name: 'NgSwitch', module: '@angular/common', kind: 'directive', selector: '[ngSwitch]' },
    {
      name: 'NgSwitchCase',
      module: '@angular/common',
      kind: 'directive',
      selector: '[ngSwitchCase]',
    },
    {
      name: 'NgSwitchDefault',
      module: '@angular/common',
      kind: 'directive',
      selector: '[ngSwitchDefault]',
    },
    {
      name: 'NgTemplateOutlet',
      module: '@angular/common',
      kind: 'directive',
      selector: '[ngTemplateOutlet]',
    },
    {
      name: 'NgComponentOutlet',
      module: '@angular/common',
      kind: 'directive',
      selector: '[ngComponentOutlet]',
    },
    // Attribute directives
    { name: 'NgClass', module: '@angular/common', kind: 'directive', selector: '[ngClass]' },
    { name: 'NgStyle', module: '@angular/common', kind: 'directive', selector: '[ngStyle]' },
    {
      name: 'NgPlural',
      module: '@angular/common',
      kind: 'directive',
      selector: '[ngPlural]',
    },
    {
      name: 'NgPluralCase',
      module: '@angular/common',
      kind: 'directive',
      selector: '[ngPluralCase]',
    },
    // Pipes
    { name: 'AsyncPipe', module: '@angular/common', kind: 'pipe', pipeName: 'async' },
    { name: 'UpperCasePipe', module: '@angular/common', kind: 'pipe', pipeName: 'uppercase' },
    { name: 'LowerCasePipe', module: '@angular/common', kind: 'pipe', pipeName: 'lowercase' },
    { name: 'TitleCasePipe', module: '@angular/common', kind: 'pipe', pipeName: 'titlecase' },
    { name: 'DatePipe', module: '@angular/common', kind: 'pipe', pipeName: 'date' },
    { name: 'DecimalPipe', module: '@angular/common', kind: 'pipe', pipeName: 'number' },
    { name: 'PercentPipe', module: '@angular/common', kind: 'pipe', pipeName: 'percent' },
    { name: 'CurrencyPipe', module: '@angular/common', kind: 'pipe', pipeName: 'currency' },
    { name: 'SlicePipe', module: '@angular/common', kind: 'pipe', pipeName: 'slice' },
    { name: 'JsonPipe', module: '@angular/common', kind: 'pipe', pipeName: 'json' },
    { name: 'KeyValuePipe', module: '@angular/common', kind: 'pipe', pipeName: 'keyvalue' },
    {
      name: 'I18nPluralPipe',
      module: '@angular/common',
      kind: 'pipe',
      pipeName: 'i18nPlural',
    },
    {
      name: 'I18nSelectPipe',
      module: '@angular/common',
      kind: 'pipe',
      pipeName: 'i18nSelect',
    },
  ],
  BrowserModule: [], // BrowserModule re-exports CommonModule
  FormsModule: [
    { name: 'NgModel', module: '@angular/forms', kind: 'directive', selector: '[ngModel]' },
    { name: 'NgForm', module: '@angular/forms', kind: 'directive', selector: 'form:not([ngNoForm])' },
    {
      name: 'NgModelGroup',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[ngModelGroup]',
    },
    {
      name: 'DefaultValueAccessor',
      module: '@angular/forms',
      kind: 'directive',
      selector: 'input:not([type=checkbox])[formControlName]',
    },
    {
      name: 'CheckboxControlValueAccessor',
      module: '@angular/forms',
      kind: 'directive',
      selector: 'input[type=checkbox][formControlName]',
    },
    {
      name: 'NumberValueAccessor',
      module: '@angular/forms',
      kind: 'directive',
      selector: 'input[type=number][formControlName]',
    },
    {
      name: 'SelectControlValueAccessor',
      module: '@angular/forms',
      kind: 'directive',
      selector: 'select:not([multiple])[formControlName]',
    },
    {
      name: 'SelectMultipleControlValueAccessor',
      module: '@angular/forms',
      kind: 'directive',
      selector: 'select[multiple][formControlName]',
    },
    {
      name: 'RadioControlValueAccessor',
      module: '@angular/forms',
      kind: 'directive',
      selector: 'input[type=radio][formControlName]',
    },
    {
      name: 'RangeValueAccessor',
      module: '@angular/forms',
      kind: 'directive',
      selector: 'input[type=range][formControlName]',
    },
    {
      name: 'RequiredValidator',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[required][formControlName]',
    },
    {
      name: 'MinLengthValidator',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[minlength][formControlName]',
    },
    {
      name: 'MaxLengthValidator',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[maxlength][formControlName]',
    },
    {
      name: 'PatternValidator',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[pattern][formControlName]',
    },
  ],
  ReactiveFormsModule: [
    {
      name: 'FormControlDirective',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[formControl]',
    },
    {
      name: 'FormControlName',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[formControlName]',
    },
    {
      name: 'FormGroupDirective',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[formGroup]',
    },
    {
      name: 'FormGroupName',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[formGroupName]',
    },
    {
      name: 'FormArrayName',
      module: '@angular/forms',
      kind: 'directive',
      selector: '[formArrayName]',
    },
  ],
  RouterModule: [
    {
      name: 'RouterOutlet',
      module: '@angular/router',
      kind: 'directive',
      selector: 'router-outlet',
    },
    { name: 'RouterLink', module: '@angular/router', kind: 'directive', selector: '[routerLink]' },
    {
      name: 'RouterLinkActive',
      module: '@angular/router',
      kind: 'directive',
      selector: '[routerLinkActive]',
    },
  ],
}

// BrowserModule re-exports CommonModule
WELL_KNOWN_MODULES['BrowserModule'] = [...WELL_KNOWN_MODULES['CommonModule']]

/**
 * NgModule scope collector.
 *
 * Collects @NgModule metadata from TypeScript files and builds a scope map
 * for compile-time dependency resolution.
 */
export class NgModuleScopeCollector {
  /** Map of NgModule class name → NgModuleInfo */
  private modules = new Map<string, NgModuleInfo>()

  /** Map of component/directive/pipe class name → declaring NgModule class name */
  private declarationToModule = new Map<string, string>()

  /**
   * Parse a TypeScript file and extract any @NgModule metadata.
   *
   * This uses simple regex-based extraction (not a full parser) since we only
   * need to find @NgModule decorators and extract their metadata properties.
   */
  collectFromSource(source: string, filePath: string): void {
    // Match @NgModule({ ... }) class ClassName
    const ngModuleRegex =
      /@NgModule\s*\(\s*\{([\s\S]*?)\}\s*\)\s*(?:export\s+)?class\s+(\w+)/g
    let match

    while ((match = ngModuleRegex.exec(source)) !== null) {
      const configBody = match[1]
      const className = match[2]

      const info: NgModuleInfo = {
        className,
        declarations: extractIdentifierArray(configBody, 'declarations'),
        imports: extractIdentifierArray(configBody, 'imports'),
        exports: extractIdentifierArray(configBody, 'exports'),
        filePath,
      }

      this.modules.set(className, info)

      // Map each declaration to its module
      for (const decl of info.declarations) {
        this.declarationToModule.set(decl, className)
      }
    }
  }

  /**
   * Build the scope map for all known non-standalone components.
   *
   * Returns a map of component class name → array of available dependencies.
   * This should be passed as `ngModuleScope` in TransformOptions.
   */
  buildScopeMap(): Map<string, NgModuleScopeDep[]> {
    const result = new Map<string, NgModuleScopeDep[]>()

    for (const [componentName, moduleName] of this.declarationToModule) {
      const moduleInfo = this.modules.get(moduleName)
      if (!moduleInfo) continue

      const scope = this.resolveModuleScope(moduleInfo)
      result.set(componentName, scope)
    }

    return result
  }

  /**
   * Get the scope for a specific component by class name.
   */
  getScopeForComponent(componentName: string): NgModuleScopeDep[] | undefined {
    const moduleName = this.declarationToModule.get(componentName)
    if (!moduleName) return undefined

    const moduleInfo = this.modules.get(moduleName)
    if (!moduleInfo) return undefined

    return this.resolveModuleScope(moduleInfo)
  }

  /**
   * Resolve the compilation scope for an NgModule.
   *
   * The scope includes:
   * - All declarations from the module itself
   * - All exported directives/pipes from imported modules (recursively)
   */
  private resolveModuleScope(moduleInfo: NgModuleInfo): NgModuleScopeDep[] {
    const scope: NgModuleScopeDep[] = []
    const seen = new Set<string>()

    // Add declarations from the module itself (other directives/pipes declared alongside)
    // These are local to the project, we don't know their module path
    // The compiler handles local refs without module path
    for (const decl of moduleInfo.declarations) {
      if (seen.has(decl)) continue
      seen.add(decl)
      // We don't include local declarations as deps for now
      // since we don't know their selectors/pipe names without type info
    }

    // Add exports from imported modules
    for (const importName of moduleInfo.imports) {
      this.addImportedModuleExports(importName, scope, seen)
    }

    return scope
  }

  /**
   * Add the exported directives/pipes from an imported module to the scope.
   */
  private addImportedModuleExports(
    moduleName: string,
    scope: NgModuleScopeDep[],
    seen: Set<string>,
  ): void {
    // Check well-known modules first
    const wellKnown = WELL_KNOWN_MODULES[moduleName]
    if (wellKnown) {
      for (const dep of wellKnown) {
        if (seen.has(dep.name)) continue
        seen.add(dep.name)
        scope.push(dep)
      }
      return
    }

    // Check user-defined modules
    const moduleInfo = this.modules.get(moduleName)
    if (!moduleInfo) return

    // A module's exports are what it makes available to importers
    for (const exportName of moduleInfo.exports) {
      if (seen.has(exportName)) continue

      // Check if the export is a module itself (re-export pattern)
      if (this.modules.has(exportName) || WELL_KNOWN_MODULES[exportName]) {
        this.addImportedModuleExports(exportName, scope, seen)
      }
      // Otherwise it's a directive/pipe - but without type info we can't
      // create proper NgModuleScopeDep entries for user-defined exports
    }
  }

  /**
   * Clear all collected data.
   */
  clear(): void {
    this.modules.clear()
    this.declarationToModule.clear()
  }
}

/**
 * Extract an array of identifiers from a property in an @NgModule config.
 *
 * Handles patterns like:
 * - `declarations: [Foo, Bar]`
 * - `imports: [CommonModule, RouterModule.forRoot(routes)]`
 * - `imports: [CommonModule, forwardRef(() => LazyModule)]`
 */
function extractIdentifierArray(configBody: string, propertyName: string): string[] {
  // Match the property and its array value
  const regex = new RegExp(
    `${propertyName}\\s*:\\s*\\[([^\\]]*?)\\]`,
    's',
  )
  const match = regex.exec(configBody)
  if (!match) return []

  const arrayContent = match[1]
  const identifiers: string[] = []

  // Split by comma and extract identifier names
  const items = arrayContent.split(',')
  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed) continue

    // Simple identifier: Foo
    const simpleMatch = /^([A-Z]\w*)$/.exec(trimmed)
    if (simpleMatch) {
      identifiers.push(simpleMatch[1])
      continue
    }

    // Method call: Module.forRoot(...) or Module.forChild(...)
    const methodMatch = /^([A-Z]\w*)\.(?:forRoot|forChild|forFeature)\b/.exec(trimmed)
    if (methodMatch) {
      identifiers.push(methodMatch[1])
      continue
    }

    // Forward ref: forwardRef(() => Foo)
    const forwardRefMatch = /forwardRef\s*\(\s*\(\)\s*=>\s*([A-Z]\w*)/.exec(trimmed)
    if (forwardRefMatch) {
      identifiers.push(forwardRefMatch[1])
      continue
    }
  }

  return identifiers
}

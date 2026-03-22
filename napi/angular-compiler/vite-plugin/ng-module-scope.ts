/**
 * NgModule scope collector for compile-time dependency resolution.
 *
 * This module collects @NgModule metadata from TypeScript files and builds
 * a scope map that maps component class names to their available dependencies
 * (directives and pipes from the NgModule's imports and declarations).
 *
 * This enables the OXC Angular compiler to emit compile-time resolved
 * `dependencies: [NgForOf, UpperCasePipe]` instead of runtime-resolved
 * `ɵɵgetComponentDepsFactory(Component)`.
 *
 * Design choice: We emit ALL directives/pipes visible in the NgModule scope
 * without template selector matching. Trade-offs:
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

import { extractNgModuleInfoSync } from '#binding'

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
  /** Import source map: identifier name → source module path */
  importSources: Record<string, string>
  /** Angular decorator kinds for classes in the NgModule's file: class name → "pipe" | "directive" | "component" */
  classKinds: Record<string, string>
}

/**
 * Callback to resolve and read a module file from node_modules.
 *
 * Given a module specifier (e.g., "@angular/common"), returns
 * the file contents and resolved path, or undefined if not found.
 */
export type ResolveAndReadFn = (
  specifier: string,
) => { source: string; filePath: string } | undefined

/**
 * NgModule scope collector.
 *
 * Collects @NgModule metadata from TypeScript files and builds a scope map
 * for compile-time dependency resolution.
 *
 * Uses OXC's Rust-based parser via NAPI for robust TypeScript parsing,
 * correctly handling nested objects, complex expressions, and all TS syntax.
 *
 * Dynamically resolves imported modules (including Angular built-ins and
 * third-party libraries) by parsing their actual source files from node_modules.
 */
export class NgModuleScopeCollector {
  /** Map of NgModule class name → NgModuleInfo */
  private modules = new Map<string, NgModuleInfo>()

  /** Map of component/directive/pipe class name → declaring NgModule class name */
  private declarationToModule = new Map<string, string>()

  /** Map of class name → Angular decorator kind ("pipe", "directive", "component"), accumulated across all files */
  private classKindsByName = new Map<string, string>()

  /** Cache of resolved module specifiers to avoid re-parsing */
  private resolvedModuleCache = new Map<string, boolean>()

  constructor(private resolveAndRead?: ResolveAndReadFn) {}

  /**
   * Parse a TypeScript file and extract any @NgModule metadata.
   *
   * Uses OXC's Rust-based parser via NAPI for robust parsing that correctly
   * handles nested braces, complex expressions, and all TypeScript syntax.
   */
  collectFromSource(source: string, filePath: string): void {
    // Remove stale data from any previous parse of this file.
    // This is critical for HMR: if a declaration was removed from a module,
    // the old declarationToModule mapping must be cleaned up.
    for (const [moduleName, moduleInfo] of this.modules) {
      if (moduleInfo.filePath === filePath) {
        for (const decl of moduleInfo.declarations) {
          this.declarationToModule.delete(decl)
        }
        this.modules.delete(moduleName)
      }
    }

    const fileInfo = extractNgModuleInfoSync(source, filePath)

    // Accumulate class decorator kinds across all files
    for (const [className, kind] of Object.entries(fileInfo.classKinds)) {
      this.classKindsByName.set(className, kind)
    }

    for (const mod of fileInfo.modules) {
      const info: NgModuleInfo = {
        className: mod.className,
        declarations: mod.declarations,
        imports: mod.imports,
        exports: mod.exports,
        filePath,
        importSources: fileInfo.importSources,
        classKinds: fileInfo.classKinds,
      }

      this.modules.set(mod.className, info)

      // Map each declaration to its module
      for (const decl of mod.declarations) {
        this.declarationToModule.set(decl, mod.className)
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
   * - All declarations from the module itself (that have known import sources)
   * - All exported directives/pipes from imported modules (recursively)
   */
  private resolveModuleScope(moduleInfo: NgModuleInfo): NgModuleScopeDep[] {
    const scope: NgModuleScopeDep[] = []
    const seen = new Set<string>()

    // Add sibling declarations from the module that have known import sources.
    // If a declaration was imported from another file, we know its source module
    // and can include it. If it's defined in the same file as the NgModule,
    // the Rust compiler handles same-file references directly.
    for (const decl of moduleInfo.declarations) {
      if (seen.has(decl)) continue
      seen.add(decl)

      const sourceModule = moduleInfo.importSources[decl]
      if (sourceModule) {
        scope.push({
          name: decl,
          module: sourceModule,
          kind: this.getClassKind(decl),
        })
      }
    }

    // Add exports from imported modules
    for (const importName of moduleInfo.imports) {
      this.addImportedModuleExports(importName, scope, seen, moduleInfo)
    }

    return scope
  }

  /**
   * Add the exported directives/pipes from an imported module to the scope.
   *
   * For user-defined modules, uses the already-collected metadata.
   * For external modules (e.g., @angular/common), dynamically resolves and
   * parses the actual source file from node_modules.
   */
  private addImportedModuleExports(
    moduleName: string,
    scope: NgModuleScopeDep[],
    seen: Set<string>,
    importingModule: NgModuleInfo,
  ): void {
    // Check user-defined modules first
    let moduleInfo = this.modules.get(moduleName)

    // If not found, try to resolve from node_modules
    if (!moduleInfo) {
      this.resolveExternalModule(moduleName, importingModule)
      moduleInfo = this.modules.get(moduleName)
    }

    if (!moduleInfo) return

    // A module's exports are what it makes available to importers
    for (const exportName of moduleInfo.exports) {
      if (seen.has(exportName)) continue

      // Check if the export is a module itself (re-export pattern)
      if (this.modules.has(exportName)) {
        this.addImportedModuleExports(exportName, scope, seen, moduleInfo)
        continue
      }

      // Try to resolve the export as an external module if we haven't seen it
      if (!this.modules.has(exportName)) {
        this.resolveExternalModule(exportName, moduleInfo)
        if (this.modules.has(exportName)) {
          this.addImportedModuleExports(exportName, scope, seen, moduleInfo)
          continue
        }
      }

      // It's a directive/pipe — look up its source module
      seen.add(exportName)
      const kind = this.getClassKind(exportName)
      const sourceModule = moduleInfo.importSources[exportName]
      if (sourceModule) {
        // Imported from another file — use the import source
        scope.push({ name: exportName, module: sourceModule, kind })
      } else {
        // Defined locally in the module's file — use the original package specifier
        // Look up how the importing module imported this module to get the npm specifier
        const specifier = importingModule.importSources[moduleName]
        if (specifier) {
          scope.push({ name: exportName, module: specifier, kind })
        } else {
          scope.push({ name: exportName, module: moduleInfo.filePath, kind })
        }
      }
    }
  }

  /**
   * Resolve an external module by reading and parsing its source from node_modules.
   *
   * Uses the `resolveAndRead` callback to locate the file, then parses it with
   * the same OXC parser to extract NgModule metadata. Results are cached.
   */
  private resolveExternalModule(
    moduleName: string,
    importingModule: NgModuleInfo,
  ): void {
    if (!this.resolveAndRead) return

    // Look up the npm specifier for this module name
    const specifier = importingModule.importSources[moduleName]
    if (!specifier) return

    // Check cache — don't re-parse the same specifier
    if (this.resolvedModuleCache.has(specifier)) return
    this.resolvedModuleCache.set(specifier, true)

    const resolved = this.resolveAndRead(specifier)
    if (!resolved) return

    const fileInfo = extractNgModuleInfoSync(resolved.source, resolved.filePath)

    // Accumulate class kinds from the resolved file
    for (const [className, kind] of Object.entries(fileInfo.classKinds)) {
      this.classKindsByName.set(className, kind)
    }

    // Store all modules found in the resolved file
    for (const mod of fileInfo.modules) {
      if (this.modules.has(mod.className)) continue

      const info: NgModuleInfo = {
        className: mod.className,
        declarations: mod.declarations,
        imports: mod.imports,
        exports: mod.exports,
        filePath: resolved.filePath,
        importSources: fileInfo.importSources,
        classKinds: fileInfo.classKinds,
      }

      this.modules.set(mod.className, info)
    }
  }

  /**
   * Look up the Angular decorator kind for a class name.
   * Returns "pipe", "directive", or "component" if known from a previously parsed file,
   * otherwise defaults to "directive" (safe — Angular resolves at runtime from ɵdir/ɵpipe).
   */
  private getClassKind(className: string): string {
    return this.classKindsByName.get(className) === 'pipe' ? 'pipe' : 'directive'
  }

  /**
   * Clear all collected data.
   */
  clear(): void {
    this.modules.clear()
    this.declarationToModule.clear()
    this.classKindsByName.clear()
    this.resolvedModuleCache.clear()
  }
}

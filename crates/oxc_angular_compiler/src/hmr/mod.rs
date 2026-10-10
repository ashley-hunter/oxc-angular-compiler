//! Hot Module Replacement (HMR) support for Angular components.
//!
//! This module provides functionality to generate HMR code for Angular components,
//! enabling fast refresh during development.
//!
//! ## HMR Architecture
//!
//! Angular's HMR works through several stages:
//!
//! 1. **Initialization**: Each component gets a `Cmp_HmrLoad()` function call
//!    that sets up listeners for hot updates.
//!
//! 2. **Update Detection**: When a component file changes, the Vite dev server
//!    sends an `angular:component-update` event.
//!
//! 3. **Module Replacement**: The component's metadata is replaced at runtime
//!    using `ɵɵreplaceMetadata()`.
//!
//! ## Generated Code Pattern
//!
//! ```javascript
//! // HMR Initialization (added after component class)
//! Cmp_HmrLoad(Date.now());
//! import.meta.hot?.on("angular:component-update", async (timestamp) => {
//!   const m = await import(/* @vite-ignore */ `/@ng/component?c=${componentId}&t=${timestamp}`);
//!   ɵɵreplaceMetadata(ComponentClass, m.default);
//! });
//!
//! // HMR Update Module (served by Vite middleware)
//! export default function Cmp_UpdateMetadata(Cmp, ɵɵnamespaces) {
//!   const i0 = ɵɵnamespaces[0];
//!   Cmp.ɵcmp = {
//!     ...Cmp.ɵcmp,
//!     decls: /* new template's slot count */,
//!     vars: /* new template's binding count */,
//!     consts: /* new template's consts, or null */,
//!     ngContentSelectors: /* new template's selectors, or undefined */,
//!     template: /* new template function */,
//!     tView: null,
//!   };
//! }
//! ```

mod dependencies;
mod initializer;
mod styles;
mod update_module;

pub use dependencies::{
    ExtractedHmrDependencies, HmrDependencies, HmrDependencyCollector, HmrLocalDependency,
    HmrMetadata, HmrNamespaceDependency, LocalDependency, extract_compiled_dependencies,
    extract_hmr_dependencies,
};
pub use initializer::{HmrDefinition, compile_hmr_initializer, compile_hmr_update_callback};
pub use styles::generate_style_update_module;
pub use update_module::{
    HmrTemplateFields, HmrUpdateModuleOptions, generate_hmr_update_module,
    generate_hmr_update_module_from_js,
};

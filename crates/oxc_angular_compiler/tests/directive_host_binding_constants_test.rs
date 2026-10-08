//! Constants pooled while compiling a `@Directive`'s host bindings must be declared in
//! the output: `'[attr.x]': 'f([a, b])'` emits `ɵɵpureFunction2(1, _c0, ...)`, and
//! `_c0` has to exist. Components already declared theirs.

use oxc_allocator::Allocator;
use oxc_angular_compiler::{CompilationMode, TransformOptions, transform_angular_file};

#[test]
fn directive_host_binding_pure_function_is_declared() {
    let allocator = Allocator::default();
    let options =
        TransformOptions { compilation_mode: CompilationMode::Full, ..Default::default() };
    let source = "import {Directive} from '@angular/core';
@Directive({selector: '[d]', host: {'[attr.x]': 'f([a, b])'}})
export class D {
  a = 1;
  b = 2;
  f(x: unknown) { return x; }
}
";
    let result = transform_angular_file(&allocator, "test.ts", source, Some(&options), None);
    assert!(!result.has_errors(), "should not have errors, got: {:?}", result.diagnostics);
    let code: String = result.code.chars().filter(|c| !c.is_whitespace()).collect();
    assert!(code.contains("i0.ɵɵpureFunction2(1,_c0,ctx.a,ctx.b)"), "got:\n{code}");
    assert!(code.contains("const_c0=(a0,a1)=>[a0,a1];exportclassD{"), "got:\n{code}");
}

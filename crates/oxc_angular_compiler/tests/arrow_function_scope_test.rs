//! A name read inside a template arrow function resolves to the arrow's own
//! parameter (or an enclosing arrow's) before template variables and the
//! component context: `open.update((o) => !o)` must not emit `(o) => !ctx.o`.
//!
//! Ported from Angular's `updateParameterReferences` in
//! `template/pipeline/src/ingest.ts`. The expected strings are ngtsc's output
//! for the same templates, in this emitter's spelling (parenthesized params
//! and binary operands).

use oxc_allocator::Allocator;
use oxc_angular_compiler::{
    CompilationMode, TransformOptions,
    output::emitter::JsEmitter,
    parser::html::HtmlParser,
    pipeline::{emit::compile_template, ingest::ingest_component},
    transform::html_to_r3::{HtmlToR3Transform, TransformOptions as HtmlTransformOptions},
    transform_angular_file,
};
use oxc_str::Ident;

/// Compile a template through the IR pipeline, with whitespace removed.
fn compile_tpl(template: &str) -> String {
    let allocator = Allocator::default();
    let parser = HtmlParser::with_expansion_forms(&allocator, template, "test.html");
    let html_result = parser.parse();
    assert!(html_result.errors.is_empty());
    let transformer = HtmlToR3Transform::new(
        &allocator,
        template,
        HtmlTransformOptions { angular_version: None, ..HtmlTransformOptions::default() },
    );
    let r3_result = transformer.transform(&html_result.nodes);
    assert!(r3_result.errors.is_empty());
    let mut job = ingest_component(&allocator, Ident::from("TestComponent"), r3_result.nodes);
    let result = compile_template(&mut job);
    let emitter = JsEmitter::new();
    let mut output = String::new();
    for decl in &result.declarations {
        output.push_str(&emitter.emit_statement(decl));
    }
    output.push_str(&emitter.emit_statements(&result.template_fn.statements));
    output.chars().filter(|c| !c.is_whitespace()).collect()
}

#[track_caller]
fn assert_emits(template: &str, expected: &str) {
    let code = compile_tpl(template);
    assert!(code.contains(expected), "expected `{expected}` for `{template}`, got:\n{code}");
}

#[test]
fn listener_arrow_reads_its_parameter() {
    assert_emits(
        r#"<pressable (press)="open.update((o) => !o)"></pressable>"#,
        "returnctx.open.update((o)=>!o);",
    );
}

#[test]
fn listener_arrow_without_parameters_reads_the_component() {
    assert_emits(
        r#"<pressable (press)="open.update(() => !open())"></pressable>"#,
        "returnctx.open.update(()=>!ctx.open());",
    );
}

#[test]
fn listener_arrow_reads_several_parameters() {
    assert_emits(
        r#"<button (click)="run((a, b) => a + b)"></button>"#,
        "returnctx.run((a,b)=>(a+b));",
    );
}

#[test]
fn parameter_wins_over_a_component_property_of_the_same_name() {
    assert_emits(
        r#"<button (click)="open.update((open) => !open)"></button>"#,
        "returnctx.open.update((open)=>!open);",
    );
}

#[test]
fn listener_arrow_reads_a_parameter_and_a_component_property() {
    assert_emits(
        r#"<button (click)="open.update((o) => o || fallback())"></button>"#,
        "returnctx.open.update((o)=>(o||ctx.fallback()));",
    );
}

#[test]
fn nested_arrow_reads_the_outer_parameter() {
    assert_emits(
        r#"<button (click)="run((a) => (b) => a + b + other)"></button>"#,
        "returnctx.run((a)=>(b)=>((a+b)+ctx.other));",
    );
}

#[test]
fn parameter_shadows_a_let_declaration() {
    assert_emits(
        r#"@let v = 1; <button (click)="run((v) => v + other)"></button>{{ v }}"#,
        "returnctx.run((v)=>(v+ctx.other));",
    );
}

#[test]
fn parameter_shadows_a_for_item() {
    assert_emits(
        r#"@for (item of items; track item) { <button (click)="run((item) => item + other)"></button> }"#,
        "i0.ɵɵrestoreView(_r1);constctx_r1=i0.ɵɵnextContext();\
         returni0.ɵɵresetView(ctx_r1.run((item)=>(item+ctx_r1.other)));",
    );
}

#[test]
fn parameter_shadows_a_template_reference() {
    assert_emits(
        r#"<input #el /><button (click)="run((el) => el + other)"></button>"#,
        "returnctx.run((el)=>(el+ctx.other));",
    );
}

#[test]
fn listener_arrow_reads_template_variables_that_are_not_parameters() {
    assert_emits(
        r#"<input #el />@for (item of items; track item) { <button (click)="run((x) => x + item + el.value + other)"></button> }"#,
        "constitem_r2=i0.ɵɵrestoreView(_r1).$implicit;constctx_r2=i0.ɵɵnextContext();\
         constel_r4=i0.ɵɵreference(1);\
         returni0.ɵɵresetView(ctx_r2.run((x)=>(((x+item_r2)+el_r4.value)+ctx_r2.other)));",
    );
}

#[test]
fn listener_arrow_reads_dollar_event() {
    assert_emits(
        r#"<button (click)="run((x) => x + $event.type)"></button>"#,
        "listener($event){returnctx.run((x)=>(x+$event.type));}",
    );
}

/// ngtsc adds a nested arrow's parameters to the enclosing arrow's set once it has
/// visited that nested arrow, so a later read of the same name is left as a plain
/// variable while an earlier one still reads the component.
#[test]
fn nested_arrow_parameters_leak_to_later_reads_like_ngtsc() {
    assert_emits(
        r#"<button (click)="run((a) => f((b) => b) + b)"></button>"#,
        "returnctx.run((a)=>(ctx.f((b)=>b)+b));",
    );
    assert_emits(
        r#"<button (click)="run((a) => b + f((b) => b))"></button>"#,
        "returnctx.run((a)=>(ctx.b+ctx.f((b)=>b)));",
    );
}

// Outside listeners ngtsc hoists the arrow through `ɵɵarrowFunction`, which is not
// implemented here: the arrow is emitted in place. Its body must still match the
// body of ngtsc's hoisted function.

#[test]
fn property_binding_arrow_reads_its_parameter() {
    assert_emits(
        r#"<div [title]="run((o) => !o)"></div>"#,
        r#"i0.ɵɵproperty("title",ctx.run((o)=>!o));"#,
    );
    assert_emits(
        r#"<div [title]="run((open) => !open)"></div>"#,
        r#"i0.ɵɵproperty("title",ctx.run((open)=>!open));"#,
    );
    assert_emits(
        r#"<div [title]="run((a) => (b) => a + b + other)"></div>"#,
        r#"i0.ɵɵproperty("title",ctx.run((a)=>(b)=>((a+b)+ctx.other)));"#,
    );
}

#[test]
fn property_binding_arrow_without_parameters_reads_the_component() {
    assert_emits(
        r#"<div [title]="run(() => !open())"></div>"#,
        r#"i0.ɵɵproperty("title",ctx.run(()=>!ctx.open()));"#,
    );
}

#[test]
fn property_binding_parameter_shadows_template_variables() {
    assert_emits(
        r#"@let v = 1; <div [title]="run((v) => v + other)"></div>{{ v }}"#,
        r#"i0.ɵɵproperty("title",ctx.run((v)=>(v+ctx.other)));"#,
    );
    assert_emits(
        r#"@for (item of items; track item) { <div [title]="run((item) => item + other)"></div> }"#,
        r#"i0.ɵɵproperty("title",ctx_r0.run((item)=>(item+ctx_r0.other)));"#,
    );
    assert_emits(
        r#"<input #el /><div [title]="run((el) => el + other)"></div>"#,
        r#"i0.ɵɵproperty("title",ctx.run((el)=>(el+ctx.other)));"#,
    );
}

#[test]
fn property_binding_arrow_reads_template_variables_that_are_not_parameters() {
    assert_emits(
        r#"<input #el />@for (item of items; track item) { <div [title]="run((x) => x + item + el.value + other)"></div> }"#,
        "constitem_r1=ctx.$implicit;constctx_r1=i0.ɵɵnextContext();constel_r3=i0.ɵɵreference(1);",
    );
    assert_emits(
        r#"<input #el />@for (item of items; track item) { <div [title]="run((x) => x + item + el.value + other)"></div> }"#,
        "ctx_r1.run((x)=>(((x+item_r1)+el_r3.value)+ctx_r1.other))",
    );
}

#[test]
fn interpolation_arrow_reads_its_parameters() {
    assert_emits("{{ run((o) => !o) }}", "i0.ɵɵtextInterpolate(ctx.run((o)=>!o));");
    assert_emits("{{ run((a, b) => a + b) }}", "i0.ɵɵtextInterpolate(ctx.run((a,b)=>(a+b)));");
    assert_emits(
        "{{ run((o) => o || fallback()) }}",
        "i0.ɵɵtextInterpolate(ctx.run((o)=>(o||ctx.fallback())));",
    );
    assert_emits("{{ run(() => !open()) }}", "i0.ɵɵtextInterpolate(ctx.run(()=>!ctx.open()));");
}

#[test]
fn let_declaration_arrow_reads_its_parameter() {
    assert_emits("@let fn = (a) => a + other; {{ fn(1) }}", "constfn_r1=(a)=>(a+ctx.other);");
}

#[test]
fn host_listener_arrow_reads_its_parameter() {
    let allocator = Allocator::default();
    let options =
        TransformOptions { compilation_mode: CompilationMode::Full, ..Default::default() };
    let source = "import {Directive, signal} from '@angular/core';
@Directive({
  selector: '[d]',
  host: {
    '(click)': 'someSignal.update(prev => prev + 1)',
    '(mousedown)': 'someSignal.update(() => componentProp + 1)',
  },
})
export class D {
  someSignal = signal(0);
  componentProp = 1;
}
";
    let result = transform_angular_file(&allocator, "test.ts", source, Some(&options), None);
    assert!(!result.has_errors(), "should not have errors, got: {:?}", result.diagnostics);
    let code: String = result.code.chars().filter(|c| !c.is_whitespace()).collect();
    assert!(code.contains("returnctx.someSignal.update((prev)=>(prev+1));"), "got:\n{code}");
    assert!(
        code.contains("returnctx.someSignal.update(()=>(ctx.componentProp+1));"),
        "got:\n{code}"
    );
}

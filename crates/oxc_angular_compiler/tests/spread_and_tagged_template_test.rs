//! Spread call arguments and tagged template literals keep their shape and resolve the
//! names they read: `f(1, ...item)` inside a `@for` must not emit `ctx_r0.f(1, ctx.item)`,
//! and `` tag`a${item}` `` must not read `tag` and `item` off the embedded view's `ctx`.
//!
//! The expected strings are ngtsc's output for the same templates, in this emitter's
//! spelling.

use oxc_allocator::Allocator;
use oxc_angular_compiler::{
    output::emitter::JsEmitter,
    parser::html::HtmlParser,
    pipeline::{emit::compile_template, ingest::ingest_component},
    transform::html_to_r3::{HtmlToR3Transform, TransformOptions as HtmlTransformOptions},
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
fn spread_argument_is_kept() {
    assert_emits("{{ f(...items) }}", "i0.ɵɵtextInterpolate(ctx.f(...ctx.items));");
    assert_emits(
        "{{ f(1, ...items, other, ...other) }}",
        "i0.ɵɵtextInterpolate(ctx.f(1,...ctx.items,ctx.other,...ctx.other));",
    );
}

#[test]
fn spread_argument_reads_a_template_variable() {
    assert_emits(
        "@for (item of items; track item) {{{ f(1, ...item) }}}",
        "constitem_r1=ctx.$implicit;constctx_r1=i0.ɵɵnextContext();\
         i0.ɵɵtextInterpolate(ctx_r1.f(1,...item_r1));",
    );
}

#[test]
fn spread_argument_of_a_safe_call() {
    assert_emits("{{ f?.(...items) }}", "ctx.f(...ctx.items)");
}

#[test]
fn spread_argument_in_a_listener() {
    assert_emits(
        r#"<button (click)="f(...items, $event)"></button>"#,
        "returnctx.f(...ctx.items,$event);",
    );
}

#[test]
fn spread_argument_reads_an_arrow_function_parameter() {
    assert_emits(
        r#"<button (click)="f((o) => f(1, ...o))"></button>"#,
        "returnctx.f((o)=>ctx.f(1,...o));",
    );
}

#[test]
fn tagged_template_is_emitted_natively() {
    assert_emits("{{ tag`a${other}b` }}", "i0.ɵɵtextInterpolate(ctx.tag`a${ctx.other}b`);");
    assert_emits("{{ tag`plain` }}", "i0.ɵɵtextInterpolate(ctx.tag`plain`);");
}

#[test]
fn tagged_template_reads_template_variables() {
    assert_emits(
        "@for (item of items; track item) {{{ tag`a${item}b${other}` }}}",
        "constitem_r1=ctx.$implicit;constctx_r1=i0.ɵɵnextContext();\
         i0.ɵɵtextInterpolate(ctx_r1.tag`a${item_r1}b${ctx_r1.other}`);",
    );
}

#[test]
fn tagged_template_reads_arrow_function_parameters() {
    assert_emits(
        r#"<button (click)="f((o) => (p) => tag`${o}${p}${other}`)"></button>"#,
        "returnctx.f((o)=>(p)=>ctx.tag`${o}${p}${ctx.other}`);",
    );
}

/// The elements hold cooked text, so text that would end the literal or start an
/// interpolation is escaped again when the tagged template is printed.
#[test]
fn tagged_template_text_is_escaped() {
    assert_emits(r"{{ tag`a\`b\${c}d\\e` }}", r"ctx.tag`a\`b\${c}d\\e`");
}

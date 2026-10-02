//! Tests for Angular linker input/output key quoting.

use oxc_allocator::Allocator;
use oxc_angular_compiler::linker::link;

/// Helper to build a ɵɵngDeclareDirective source with a given inputs block.
fn make_directive_source(inputs_block: &str) -> String {
    format!(
        r#"import * as i0 from "@angular/core";
export class MyDir {{}}
MyDir.ɵdir = i0.ɵɵngDeclareDirective({{ minVersion: "14.0.0", version: "17.0.0", type: MyDir, selector: "[myDir]", inputs: {{ {inputs_block} }} }});"#
    )
}

/// Helper to build a ɵɵngDeclareDirective source with a given outputs block.
fn make_directive_source_with_outputs(outputs_block: &str) -> String {
    format!(
        r#"import * as i0 from "@angular/core";
export class MyDir {{}}
MyDir.ɵdir = i0.ɵɵngDeclareDirective({{ minVersion: "14.0.0", version: "17.0.0", type: MyDir, selector: "[myDir]", outputs: {{ {outputs_block} }} }});"#
    )
}

#[test]
fn test_link_inputs_dotted_key() {
    let allocator = Allocator::default();
    let code = make_directive_source(r#""fxFlexAlign.xs": "fxFlexAlignXs""#);
    let result = link(&allocator, &code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

#[test]
fn test_link_inputs_hyphenated_key() {
    let allocator = Allocator::default();
    let code = make_directive_source(r#""fxFlexAlign.lt-sm": "fxFlexAlignLtSm""#);
    let result = link(&allocator, &code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

#[test]
fn test_link_inputs_simple_identifier() {
    let allocator = Allocator::default();
    let code = make_directive_source(r#"fxFlexAlign: "fxFlexAlign""#);
    let result = link(&allocator, &code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

#[test]
fn test_link_inputs_object_format_dotted_key() {
    let allocator = Allocator::default();
    let code = make_directive_source(
        r#""fxFlexAlign.xs": { classPropertyName: "fxFlexAlignXs", publicName: "fxFlexAlign.xs", isRequired: false, isSignal: false }"#,
    );
    let result = link(&allocator, &code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

#[test]
fn test_link_inputs_array_format_dotted_key() {
    let allocator = Allocator::default();
    let code = make_directive_source(r#""fxFlexAlign.xs": ["fxFlexAlign.xs", "fxFlexAlignXs"]"#);
    let result = link(&allocator, &code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

#[test]
fn test_link_outputs_dotted_key() {
    let allocator = Allocator::default();
    let code = make_directive_source_with_outputs(r#""activate.xs": "activateXs""#);
    let result = link(&allocator, &code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

#[test]
fn test_link_outputs_hyphenated_key() {
    let allocator = Allocator::default();
    let code = make_directive_source_with_outputs(r#""activate.lt-sm": "activateLtSm""#);
    let result = link(&allocator, &code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

#[test]
fn test_link_outputs_simple_identifier() {
    let allocator = Allocator::default();
    let code = make_directive_source_with_outputs(r#"activate: "activate""#);
    let result = link(&allocator, &code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

#[test]
fn test_link_inputs_array_format_with_transform_function() {
    let allocator = Allocator::default();
    let code =
        make_directive_source(r#"push: ["cdkConnectedOverlayPush", "push", i0.booleanAttribute]"#);
    let result = link(&allocator, &code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

/// Regression: signal form FormField directive declares
/// `controlCreate: { passThroughInput: "formField" }` in its partial metadata.
/// The linker must emit `ɵɵControlFeature("formField")` in the features array,
/// otherwise `DirectiveDef.controlDef` is never set and the runtime
/// `ɵɵcontrolCreate()` / `ɵɵcontrol()` instructions become no-ops.
/// See voidzero-dev/oxc-angular-compiler#229.
#[test]
fn test_link_control_feature_pass_through_input() {
    let allocator = Allocator::default();
    let code = r#"import * as i0 from "@angular/core";
export class FormField {}
FormField.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "21.2.8", type: FormField, selector: "[formField]", inputs: { field: { classPropertyName: "field", publicName: "formField", isRequired: true, isSignal: true } }, controlCreate: { passThroughInput: "formField" }, isStandalone: true, isSignal: true });"#;
    let result = link(&allocator, code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

#[test]
fn test_link_control_feature_null_pass_through_input() {
    let allocator = Allocator::default();
    let code = r#"import * as i0 from "@angular/core";
export class MyControl {}
MyControl.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "21.2.8", type: MyControl, selector: "[myControl]", controlCreate: { passThroughInput: null }, isStandalone: true, isSignal: true });"#;
    let result = link(&allocator, code, "test.mjs");
    insta::assert_snapshot!(result.code);
}

/// Helper to build a ɵɵngDeclareComponent source with a given `styles` array.
fn make_component_source_with_styles(styles: &str) -> String {
    format!(
        r#"import * as i0 from "@angular/core";
export class MyCmp {{}}
MyCmp.ɵcmp = i0.ɵɵngDeclareComponent({{ minVersion: "14.0.0", version: "17.0.0", type: MyCmp, selector: "my-cmp", template: "<div></div>", styles: [{styles}] }});"#
    )
}

#[test]
fn test_link_styles_template_literal_matches_string_literal() {
    for (template_styles, string_styles) in [
        ("`.a { color: red }`", r#"".a { color: red }""#),
        (r#"`.a { content: "\\f101\n" }`"#, r#"".a { content: \"\\f101\n\" }""#),
    ] {
        let allocator = Allocator::default();
        let template =
            link(&allocator, &make_component_source_with_styles(template_styles), "test.mjs");
        let string =
            link(&allocator, &make_component_source_with_styles(string_styles), "test.mjs");
        assert!(template.code.contains("styles: ["), "styles dropped:\n{}", template.code);
        assert_eq!(template.code, string.code);
    }
}

#[test]
fn test_link_host_bindings_template_literal_matches_string_literal() {
    let make = |prop: &str, listener: &str| {
        format!(
            r#"import * as i0 from "@angular/core";
export class MyDir {{}}
MyDir.ɵdir = i0.ɵɵngDeclareDirective({{ minVersion: "14.0.0", version: "17.0.0", type: MyDir, selector: "[myDir]", host: {{ properties: {{ "id": {prop} }}, listeners: {{ "click": {listener} }} }} }});"#
        )
    };
    let allocator = Allocator::default();
    let template = link(&allocator, &make("`this.dirId`", "`onClick($event)`"), "test.mjs");
    let string = link(&allocator, &make(r#""this.dirId""#, r#""onClick($event)""#), "test.mjs");
    assert!(template.code.contains("dirId"), "host property dropped:\n{}", template.code);
    assert!(template.code.contains("onClick"), "host listener dropped:\n{}", template.code);
    assert_eq!(template.code, string.code);
}

/// Static `host.attributes` values rewritten as template literals keep their
/// cooked value and emit byte-identical hostAttrs to the quoted form.
#[test]
fn test_link_host_attributes_template_literal_matches_string_literal() {
    let make = |value: &str| {
        format!(
            r#"import * as i0 from "@angular/core";
export class MyDir {{}}
MyDir.ɵdir = i0.ɵɵngDeclareDirective({{ minVersion: "14.0.0", version: "17.0.0", type: MyDir, selector: "[myDir]", host: {{ attributes: {{ "aria-label": {value} }} }} }});"#
        )
    };
    let allocator = Allocator::default();
    let template = link(&allocator, &make(r#"`say "hi"`"#), "test.mjs");
    let string = link(&allocator, &make(r#""say \"hi\"""#), "test.mjs");
    assert!(
        template.code.contains(r#"hostAttrs: ["aria-label", "say \"hi\""]"#),
        "host attribute dropped or unescaped:\n{}",
        template.code
    );
    assert_eq!(template.code, string.code);
}

/// `inputs` values rewritten as template literals are treated like string
/// literals. For the aliased array form `[publicName, classPropertyName]` this
/// preserves the declaration-format detection — otherwise the array would be
/// passed through verbatim and the runtime would read the public name as
/// `InputFlags`. Array elements keep their original source spelling, so only
/// the simple and object forms are asserted byte-identical.
#[test]
fn test_link_inputs_template_literal_matches_string_literal() {
    // Simple value form: same emitted output either way.
    let allocator = Allocator::default();
    let template = link(&allocator, &make_directive_source(r#"prop: `publicProp`"#), "test.mjs");
    let string = link(&allocator, &make_directive_source(r#"prop: "publicProp""#), "test.mjs");
    assert_eq!(template.code, string.code);

    // Aliased array form: the first template-literal element must be recognised
    // as a string so the [0, ...] flags element is inserted.
    let allocator = Allocator::default();
    let template =
        link(&allocator, &make_directive_source(r#"prop: [`publicProp`, `prop`]"#), "test.mjs");
    assert!(
        template.code.contains(r#"prop: [0, `publicProp`, `prop`]"#),
        "aliased input lost its InputFlags element:\n{}",
        template.code
    );
    let string =
        link(&allocator, &make_directive_source(r#"prop: ["publicProp", "prop"]"#), "test.mjs");
    assert!(
        string.code.contains(r#"prop: [0, "publicProp", "prop"]"#),
        "quoted input changed behaviour:\n{}",
        string.code
    );

    // Object format: publicName/classPropertyName may also be template literals.
    let allocator = Allocator::default();
    let template = link(
        &allocator,
        &make_directive_source(
            r#"prop: { classPropertyName: `prop`, publicName: `publicProp`, isRequired: false, isSignal: false }"#,
        ),
        "test.mjs",
    );
    let string = link(
        &allocator,
        &make_directive_source(
            r#"prop: { classPropertyName: "prop", publicName: "publicProp", isRequired: false, isSignal: false }"#,
        ),
        "test.mjs",
    );
    assert_eq!(template.code, string.code);
}

/// `deps: "invalid"` rewritten as a template literal still selects the
/// ɵɵinvalidFactory path instead of falling through to `new Type()`.
#[test]
fn test_link_factory_invalid_deps_template_literal() {
    let allocator = Allocator::default();
    let code = r#"
import * as i0 from "@angular/core";
class MyService {
}
MyService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.0", ngImport: i0, type: MyService, deps: `invalid`, target: i0.ɵɵFactoryTarget.Injectable });
"#;
    let result = link(&allocator, code, "test.mjs");
    assert!(result.linked);
    assert!(result.code.contains("ɵɵinvalidFactory"), "deps not invalid:\n{}", result.code);
}

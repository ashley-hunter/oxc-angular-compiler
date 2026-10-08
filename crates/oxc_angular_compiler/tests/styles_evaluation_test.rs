//! `styles` in `@Component` metadata is evaluated statically, as ngtsc's
//! `parseDirectiveStyles` does: a same-file constant, a concatenation, a spread of an
//! array or an array constant gives the same styles as the strings written out. A value
//! that cannot be used is an error on the `styles` expression, never a silent drop.
//!
//! Every expectation is what `@angular/compiler-cli` 22.2.1 produces for the same source
//! (with the chained line of its diagnostics joined by a space, as elsewhere).

use oxc_allocator::Allocator;
use oxc_angular_compiler::{TransformOptions, transform_angular_file};
use oxc_diagnostics::OxcDiagnostic;

/// Declared at the top of every source, as in the report.
const PREAMBLE: &str = "import { Component } from '@angular/core';
import { OTHER } from './other';
const S = '.a { color: red }';
const LIST = ['.l { color: red }'];
";

fn source(preamble: &str, metadata: &str) -> String {
    format!(
        "{PREAMBLE}{preamble}\n@Component({{ selector: 'x', template: '', {metadata} }})\n\
         export class X {{}}\n"
    )
}

fn compile(source: &str) -> (String, Vec<OxcDiagnostic>) {
    let allocator = Allocator::default();
    let result = transform_angular_file(
        &allocator,
        "/x/a.ts",
        source,
        Some(&TransformOptions::default()),
        None,
    );
    (result.code, result.diagnostics)
}

/// The whitespace-free `styles` array of the compiled definition, or `None` when the
/// definition has none.
fn compiled_styles(preamble: &str, metadata: &str) -> Option<String> {
    let (code, diagnostics) = compile(&source(preamble, metadata));
    assert!(diagnostics.is_empty(), "unexpected diagnostics for `{metadata}`: {diagnostics:?}");
    let compact: String = code.chars().filter(|c| !c.is_whitespace()).collect();
    let definition = &compact[compact.find("i0.ɵɵdefineComponent(").expect("definition")..];
    let definition = &definition[..definition.find("(()=>{").unwrap_or(definition.len())];
    let start = definition.find("styles:[")?;
    let end = definition[start..].find("\"]").map(|i| start + i + 2)?;
    Some(definition[start..end].to_string())
}

/// `metadata` compiles to the styles that `literal` compiles to.
#[track_caller]
fn assert_same_as_literal(preamble: &str, metadata: &str, literal: &str) {
    let expected = compiled_styles("", literal);
    assert!(expected.is_some(), "`{literal}` should have styles");
    assert_eq!(
        compiled_styles(preamble, metadata),
        expected,
        "`{metadata}` should compile like `{literal}`"
    );
}

/// Compiling `styles: {value}` reports exactly `message`, on the value.
#[track_caller]
fn assert_error(preamble: &str, value: &str, message: &str) {
    let source = source(preamble, &format!("styles: {value}"));
    let (_, diagnostics) = compile(&source);
    let [diagnostic] = diagnostics.as_slice() else {
        panic!("expected one diagnostic for `styles: {value}`, got {diagnostics:?}");
    };
    assert_eq!(diagnostic.message, message, "for `styles: {value}`");
    let labels: Vec<&str> = diagnostic
        .labels
        .iter()
        .map(|l| &source[l.offset() as usize..(l.offset() + l.len()) as usize])
        .collect();
    assert_eq!(labels, [value], "label for `styles: {value}`");
}

const NOT_STRINGS: &str = "Failed to resolve @Component.styles to a string or an array of strings";

fn at(position: usize) -> String {
    format!("Failed to resolve styles at position {position} to a string")
}

// The rows of the report.

#[test]
fn same_file_constants_already_supported() {
    assert_same_as_literal("", "styles: [S]", "styles: ['.a { color: red }']");
    assert_same_as_literal("", "styles: S", "styles: ['.a { color: red }']");
}

#[test]
fn concatenation_of_strings() {
    assert_same_as_literal("", "styles: ['.b{}' + '.c{}']", "styles: ['.b{}.c{}']");
    assert_same_as_literal(
        "const A = '.n'; const B = A + '{}';",
        "styles: [B, S + '.k{}']",
        "styles: ['.n{}', '.a { color: red }.k{}']",
    );
}

#[test]
fn spread_of_a_same_file_array() {
    assert_same_as_literal("", "styles: [...LIST]", "styles: ['.l { color: red }']");
    assert_same_as_literal(
        "",
        "styles: ['.first{}', ...LIST, S]",
        "styles: ['.first{}', '.l { color: red }', '.a { color: red }']",
    );
}

#[test]
fn same_file_array_constant() {
    assert_same_as_literal("", "styles: LIST", "styles: ['.l { color: red }']");
    assert_same_as_literal("const LISTC = ['.c{}'] as const;", "styles: LISTC", "styles: ['.c{}']");
    assert_same_as_literal(
        "const INNER = ['.i{}']; const OUTER = [...INNER, S];",
        "styles: OUTER",
        "styles: ['.i{}', '.a { color: red }']",
    );
}

// More that ngtsc evaluates.

#[test]
fn constants_that_name_other_constants() {
    assert_same_as_literal("const A = '.n{}'; const B = A;", "styles: [B]", "styles: ['.n{}']");
}

#[test]
fn template_literals() {
    assert_same_as_literal("", "styles: [`.t { color: red }`]", "styles: ['.t { color: red }']");
    assert_same_as_literal(
        "const C = 'red';",
        "styles: [`.t { color: ${C} }`]",
        "styles: ['.t { color: red }']",
    );
    assert_same_as_literal(
        "const C = 'red';",
        "styles: `.t { color: ${C} }`",
        "styles: ['.t { color: red }']",
    );
}

/// ngtsc evaluates these too; none of them is an error.
#[test]
fn other_statically_resolvable_values() {
    for (preamble, metadata, literal) in [
        ("let L = '.let{}';", "styles: [L]", "styles: ['.let{}']"),
        ("function make() { return '.m{}'; }", "styles: [make()]", "styles: ['.m{}']"),
        ("const DEV = true;", "styles: [DEV ? '.d{}' : '.p{}']", "styles: ['.d{}']"),
        (
            "const C = { s: '.s{}', l: ['.l2{}'] };",
            "styles: [C.s, ...C.l]",
            "styles: ['.s{}', '.l2{}']",
        ),
    ] {
        assert_same_as_literal(preamble, metadata, literal);
    }
}

#[test]
fn empty_and_blank_styles() {
    assert_eq!(compiled_styles("", "styles: []"), None);
    assert_eq!(compiled_styles("", "styles: ''"), None);
    assert_eq!(compiled_styles("const NONE: string[] = [];", "styles: NONE"), None);
    assert_same_as_literal("", "styles: ['', '  ', S]", "styles: ['.a { color: red }']");
}

/// A plain literal compiles exactly as it did before styles were evaluated.
#[test]
fn literal_styles_are_unchanged() {
    assert_eq!(
        compiled_styles("", "styles: ['.x { color: blue }', '.y{}']").as_deref(),
        Some(r#"styles:[".x[_ngcontent-%COMP%]{color:blue}",".y[_ngcontent-%COMP%]{}"]"#)
    );
    assert_eq!(
        compiled_styles("", "styles: '.x { color: blue }'").as_deref(),
        Some(r#"styles:[".x[_ngcontent-%COMP%]{color:blue}"]"#)
    );
}

// Errors: what ngtsc reports, on the `styles` expression.

#[test]
fn styles_that_are_not_a_string_or_an_array() {
    for (value, suffix) in [
        ("1", "Value is of type 'number'."),
        ("{}", "Value is of type '{}'."),
        ("undefined", "Value is of type 'undefined'."),
    ] {
        assert_error("", value, &format!("{NOT_STRINGS} {suffix}"));
    }
}

#[test]
fn entry_that_is_not_a_string() {
    for (preamble, value, position, suffix) in [
        ("", "[1]", 0, "Value is of type 'number'."),
        ("", "[null]", 0, "Value is of type 'null'."),
        ("", "[LIST, ['.z{}']]", 0, "Value is of type '[string]'."),
        ("declare const X: string;", "[X]", 0, "Value is a reference to 'X'."),
        (
            "declare function make(): string;",
            "[make()]",
            0,
            "Value could not be determined statically.",
        ),
        ("", "[NOPE]", 0, "Value could not be determined statically."),
        ("", "[...S]", 0, "Value could not be determined statically."),
        ("enum E { A = '.e{}' }", "[E.A]", 0, "Value is of type 'E'."),
        // The first entry that is not a string is the one reported.
        ("", "[S, 1, true]", 1, "Value is of type 'number'."),
    ] {
        assert_error(preamble, value, &format!("{} {suffix}", at(position)));
    }
}

/// ngtsc reads another file to evaluate an import. One file at a time, that is an error
/// that says so, wherever the import appears.
#[test]
fn styles_that_depend_on_an_import() {
    let message = "@Component.styles depends on 'OTHER', which is imported from another module. \
                   OXC compiles one file at a time and cannot evaluate values from other files.";
    for value in ["[OTHER]", "OTHER", "[S, OTHER]", "[OTHER + '.k{}']", "[...OTHER]"] {
        let source = source("", &format!("styles: {value}"));
        let (_, diagnostics) = compile(&source);
        let [diagnostic] = diagnostics.as_slice() else {
            panic!("expected one diagnostic for `styles: {value}`, got {diagnostics:?}");
        };
        assert_eq!(diagnostic.message, message, "for `styles: {value}`");
    }
}

// `styleUrl` and `styleUrls` alongside `styles`.

#[test]
fn style_urls_alongside_evaluated_styles() {
    let source = source("", "styles: [...LIST, S + '.k{}'], styleUrls: ['./a.css']");
    let (code, diagnostics) = compile(&source);
    assert!(diagnostics.is_empty(), "{diagnostics:?}");
    let compact: String = code.chars().filter(|c| !c.is_whitespace()).collect();
    assert!(
        compact.contains(
            r#"styles:[".l[_ngcontent-%COMP%]{color:red}",".a[_ngcontent-%COMP%]{color:red}.k[_ngcontent-%COMP%]{}"]"#
        ),
        "{compact}"
    );
}

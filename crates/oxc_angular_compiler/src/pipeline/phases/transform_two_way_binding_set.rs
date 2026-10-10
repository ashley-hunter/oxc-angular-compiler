//! Transform two-way binding set phase.
//!
//! This phase transforms `TwoWayBindingSet` expressions into the appropriate
//! setter expressions. Two-way binding `[(prop)]="value"` requires generating
//! the setter call `target = $event`.
//!
//! ## Transformation
//!
//! The TwoWayBindingSet expression contains:
//! - `target`: The expression being written to (e.g., `ctx.value`, `ctx.obj[key]`)
//! - `value`: The value being assigned (usually `$event`)
//!
//! This phase walks through all TwoWayListener operations and transforms
//! the TwoWayBindingSet expressions they contain into proper assignment
//! expressions that will be emitted as JavaScript assignment statements.
//!
//! Ported from Angular's `template/pipeline/src/phases/transform_two_way_binding_set.ts`.

use oxc_diagnostics::OxcDiagnostic;
use oxc_span::Span;

use crate::ir::expression::{IrExpression, VisitorContextFlag, transform_expressions_in_update_op};
use crate::ir::ops::CreateOp;
use crate::pipeline::compilation::ComponentCompilationJob;

/// Transforms two-way binding set expressions.
///
/// This phase:
/// 1. Finds all `TwoWayBindingSet` expressions in TwoWayListener handler ops
/// 2. Validates that the target is a settable expression (property read or keyed read)
/// 3. Reports errors for invalid targets
/// 4. Marks the expression for conversion to assignment in the reify phase
///
/// Note: The actual conversion to JavaScript assignment happens in the reify phase.
/// This phase primarily validates the structure and could perform any necessary
/// pre-transformations.
pub fn transform_two_way_binding_set(job: &mut ComponentCompilationJob<'_>) {
    use std::cell::RefCell;

    let diagnostics = RefCell::new(std::vec::Vec::new());

    // Collect view xrefs to avoid borrowing issues
    let view_xrefs: std::vec::Vec<_> = job.all_views().map(|v| v.xref).collect();

    for view_xref in view_xrefs {
        if let Some(view) = job.view_mut(view_xref) {
            for op in view.create.iter_mut() {
                if let CreateOp::TwoWayListener(listener) = op {
                    for handler_op in listener.handler_ops.iter_mut() {
                        transform_expressions_in_update_op(
                            handler_op,
                            &|expr, _flags| {
                                if let Some(diag) = validate_two_way_binding_target(expr) {
                                    diagnostics.borrow_mut().push(diag);
                                }
                            },
                            VisitorContextFlag::NONE,
                        );
                    }
                }
            }
        }
    }

    // Append collected diagnostics to job
    job.diagnostics.extend(diagnostics.into_inner());
}

/// Validates that a TwoWayBindingSet target is a valid settable expression.
///
/// Valid targets are:
/// - PropertyRead (ctx.value, a.b.c)
/// - KeyedRead (ctx[key], a.b[c])
/// - SafePropertyRead (ctx?.value) - will be converted to non-safe for setter
/// - SafeKeyedRead (ctx?.[key]) - will be converted to non-safe for setter
///
/// Returns a diagnostic if the target is invalid.
fn validate_two_way_binding_target(expr: &IrExpression<'_>) -> Option<OxcDiagnostic> {
    if let IrExpression::TwoWayBindingSet(tbs) = expr {
        // Check that the target is a valid settable expression
        match tbs.target.as_ref() {
            // Valid targets - PropertyRead can be set
            IrExpression::Ast(ast_expr) => {
                use crate::ast::expression::AngularExpression;
                match ast_expr.as_ref() {
                    AngularExpression::PropertyRead(_)
                    | AngularExpression::KeyedRead(_)
                    | AngularExpression::SafePropertyRead(_)
                    | AngularExpression::SafeKeyedRead(_) => {
                        // Valid settable targets
                        None
                    }
                    _ => {
                        // Invalid target - report error
                        Some(
                            OxcDiagnostic::error(
                                "Unsupported expression in two-way action binding",
                            )
                            .with_help(
                                "Two-way bindings require a property read or keyed read expression",
                            )
                            .with_label(Span::default()),
                        )
                    }
                }
            }
            // LexicalRead is also valid (e.g., just a variable name)
            IrExpression::LexicalRead(_) => {
                // Valid - simple variable assignment
                None
            }
            // ReadVariable is valid too
            IrExpression::ReadVariable(_) => {
                // Valid - context variable assignment
                None
            }
            // Resolved forms produced by resolve_names, matching upstream's
            // acceptance of `o.ReadPropExpr`/`o.ReadKeyExpr` (property/keyed
            // reads already resolved against the context or a template
            // variable). Safe reads are settable here — the reify arm emits
            // the non-safe write, like the Ast arm allows.
            IrExpression::ResolvedPropertyRead(_)
            | IrExpression::ResolvedKeyedRead(_)
            | IrExpression::ResolvedSafePropertyRead(_) => None,
            // Other IR expression types are not valid for two-way binding
            _ => Some(
                OxcDiagnostic::error("Unsupported expression in two-way action binding")
                    .with_help("Two-way bindings require a property read or keyed read expression")
                    .with_label(Span::default()),
            ),
        }
    } else {
        None
    }
}

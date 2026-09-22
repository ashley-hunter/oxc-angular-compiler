/**
 * Fixtures whose output differs from Angular's in documented ways, keyed by
 * `category/name`. A listed fixture that differs is reported as a known difference rather than
 * a failure; a listed fixture that matches Angular fails, so fixed entries get removed.
 *
 * Each entry lists the differences found when it was added. Remove an entry once the
 * difference is fixed in the compiler.
 */
const FACTORY =
  'ɵfac uses ɵɵgetInheritedFactory where Angular emits a factory that calls the constructor'
const QUERY_CHAINING =
  'viewQuery/contentQuery calls are emitted separately where Angular chains them'
const NG_MODULE_IMPORTS = 'ɵmod includes imports, which Angular omits in full compilation'
const HOST_ATTRS_ORDER = 'hostAttrs are emitted in a different order'
const CUSTOM_DECORATOR =
  'the reference ngtsc compile leaves a class with a non-Angular decorator uncompiled, so only Oxc emits ɵfac/ɵcmp'

export const KNOWN_DIFFERENCES: Record<string, string[]> = {
  'animations/animation-metadata-with-host-bindings': ['hostVars is 2 where Angular emits 3'],
  'class-metadata/class-metadata-ngmodule': [FACTORY, NG_MODULE_IMPORTS],
  'class-metadata/class-metadata-pipe': [FACTORY],
  'class-metadata/class-metadata-with-content-child': [QUERY_CHAINING],
  'class-metadata/class-metadata-with-view-child': [QUERY_CHAINING],
  'component-meta/change-detection-default': ['changeDetection is omitted where Angular emits it'],
  'edge-cases/multiple-custom-decorators': [CUSTOM_DECORATOR],
  'edge-cases/single-custom-decorator': [CUSTOM_DECORATOR],
  'edge-cases/unicode-special-escapes': ['a tab in template text becomes a space'],
  'full-file/component-with-pipes': ['component styles keep a leading newline'],
  'full-transform/full-transform-host-attribute': [HOST_ATTRS_ORDER],
  'host-bindings/host-attribute': [HOST_ATTRS_ORDER],
  'host-directives/host-directives-empty-mappings': [
    'HostDirectivesFeature receives the directive class where Angular passes { directive }',
  ],
  'host-directives/host-directives-with-providers': [FACTORY],
  'i18n/i18n-ng-template-deeply-nested': [FACTORY],
  'injector/basic-injector': [FACTORY],
  'injector/injector-with-both': [FACTORY, NG_MODULE_IMPORTS],
  'injector/injector-with-imports': [FACTORY, NG_MODULE_IMPORTS],
  'injector/injector-with-providers': [FACTORY],
  'pipe-compilation/impure-pipe': [FACTORY],
  'pipe-compilation/minimal-pipe': [FACTORY],
  'pipe-compilation/non-standalone-pipe': [FACTORY],
  'pipe-compilation/pure-pipe': [FACTORY],
  'regressions/contentchild-ordering': [QUERY_CHAINING],
  'regressions/query-chaining-mixed-view-and-content': [QUERY_CHAINING],
  'regressions/query-chaining-multiple-contentchild': [QUERY_CHAINING],
  'regressions/query-chaining-multiple-viewchild': [QUERY_CHAINING],
  'regressions/unused-import-viewchild-decorator': [QUERY_CHAINING],
  'regressions/viewchild-ordering-clickup-pattern': [QUERY_CHAINING],
  'regressions/viewchild-ordering-mixed-selectors': [QUERY_CHAINING],
  'regressions/viewchild-ordering-read-option': [QUERY_CHAINING],
  'regressions/viewchild-static-ordering': [QUERY_CHAINING],
  'regressions/viewchildren-ordering': [QUERY_CHAINING],
  'styles/shadow-css-comments': ['component styles keep newlines left by removed comments'],
  'styles/shadow-css-host-context-triple': [
    ':host-context selector permutations are in a different order',
  ],
  'styles/shadow-css-multiline-selector': ['the newline between selectors in a list is dropped'],
  'styles/shadow-css-ng-deep-basic': ['a leading space is kept before a ::ng-deep selector'],
  'styles/shadow-css-polyfill-next-selector': ['a space is added before an empty rule body'],
  'styles/shadow-css-polyfill-rule': [
    'polyfill-rule output drops a leading ";" from the rule body',
  ],
  'styles/shadow-css-polyfill-unscoped-rule': [
    'polyfill-unscoped-rule is not scoped and rewritten as Angular does',
  ],
}

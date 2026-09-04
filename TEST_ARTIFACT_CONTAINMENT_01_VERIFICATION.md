# TEST-ARTIFACT-CONTAINMENT-01 Verification

## Scope

This report documents the package-safe implementation contract for
TEST-ARTIFACT-CONTAINMENT-01 and its two authorized amendments. It is not a
browser Runtime dependency and does not authorize Product Release.

The immutable accepted base is:

```text
Branch: feature/ir-01-unified-inventory-risks
HEAD:   b23bc461e731828bf64eeb7237ff001fd2af4371
Tree:   6bdf07be52ae468c6bed3f138cb544f594fe94d1
```

Final commit, bundle and machine-specific evidence identities are intentionally
reported outside this manifest-bound file. Embedding the hash of a bundle that
contains this report would create a circular identity. Acceptance requires the
external gate record to verify this report's manifest hash and exact bytes.

## Root Cause And Closure

Fourteen standard Product Smokes wrote 82 PNG files below repository-local
`tests/screenshots/**`. The optional `ex-ux-01-2` smoke used
`OBSOLIQ_SMOKE_SCREENSHOT` as a physical path. Ignoring these files did not
make Source, Candidate or Product Bundle extracts immutable.

All 15 existing writers now call the shared checked output boundary in
`tests/smoke-runtime.cjs`. `OBSOLIQ_TEST_ARTIFACT_ROOT` is the sole configured
physical root. It must be an absolute external dedicated root. Without the
variable, a unique directory under the operating-system temporary root is
created. Logical names remain `screenshots/<suite>/<name>.png`.

`OBSOLIQ_SMOKE_SCREENSHOT` is now only an opt-in switch: unset disables the
optional capture and exact value `1` enables it. Empty, path-like and all other
values fail before capture or write. The optional logical path is fixed:

```text
screenshots/ex-ux-01-2/excess-workspace.png
```

Playwright returns PNG bytes without a disk path. The boundary validates the
PNG signature, revalidates the physical root and ancestors, rejects aliases and
links, and creates the destination exclusively without overwrite.

## Stable Screenshot Catalog

```text
KNOWN_SCREENSHOT_WRITERS: 15
UNKNOWN_SCREENSHOT_WRITERS: 0
STANDARD_SCREENSHOT_SUITES: 14
STANDARD_SCREENSHOT_COUNT: 82
OPTIONAL_SCREENSHOT_WRITERS: 1
OPTIONAL_SCREENSHOT_COUNT_WITHOUT_OPT_IN: 0
OPTIONAL_SCREENSHOT_COUNT_WITH_OPT_IN: 1
TOTAL_WITHOUT_OPT_IN: 82
TOTAL_WITH_OPT_IN: 83
```

The 82 standard logical names, suite assignments and capture counts are equal
between standard and opt-in runs. The optional image never replaces a standard
image. Generated screenshots are neither manifest entries nor bundle inputs.

The focused regression covers traversal, absolute children, Windows drives,
UNC, POSIX absolute paths, file URLs, mixed separators, protected Product
roots, Unicode/space roots, junction escapes, invalid extensions, repeated and
parallel execution, failure after capture, foreign CWD and static writer
bypasses. Tests preserve failed external evidence; they do not delete an
unauthorized product-root write to manufacture PASS.

## Packaged R0B.1 Dependency

R0B.1 is included in the Product Bundle and reads the root `.gitattributes`
policy while creating fresh Git archives. The file is therefore an explicit
transitive test and reproducibility dependency:

```text
CANONICAL_PATH: .gitattributes
ARCHIVE_PATH: .gitattributes
CARDINALITY: 1
FILE_TYPE: regular
MODE: 100644
ENCODING: UTF-8_WITHOUT_BOM
EOL: LF
RUNTIME_ROLE: NONE
PACKAGE_ROLE: SOURCE_REPRODUCIBILITY_METADATA
PROVENANCE_CLASS: repository-reproducibility-policy
```

The file's accepted blob and bytes are unchanged. The package path policy has
one exact exception for `.gitattributes`; it does not permit any other dotfile
or dot-directory. `.git/**`, `.gitignore`, `.github/**`, `.env*`, `.npmrc` and
local editor/OS metadata remain excluded. The builder remains driven only by
the explicit canonical path set.

The accepted policy contains only `text=auto`, explicit LF declarations and
the existing binary declarations. Filters, drivers, custom attribute macros,
working-tree encodings and export substitutions are not accepted.

R0B.1 performs real Git reconstruction under `core.autocrlf=true`, `false` and
`input`. No skip, mock, fallback or conditional PASS exists. Its dynamic typed
count remains:

```text
C = 23 + 7*T + 5*B
```

`.gitattributes` is one text path, so its isolated manifest delta is `T + 1`,
`B + 0`, `C + 7`. Counts are derived from the final manifest, never hardcoded.

## Boundaries

The phase changes only test writers, test-output infrastructure, package
inventory/policy, strict related tests and documentation. It changes no
`prototype.html`, `app.js`, productive `js/**`, CSS, sample/demo data,
calculation, Recovery, Slow/Dead threshold, Registry, upload or export logic.

Existing user worktree changes are not part of this candidate. Commit D may be
created only after read-only Candidate and Extract matrices, two byte-identical
builds, manifest/SHA/provenance/security checks and the frozen staging allowlist
all pass. Phase 2 and Phase 3 remain gated behind that commit.

```text
PRODUCT_RELEASE_GATE: HOLD
AUTHORIZED_RELEASE: NO
PUSH_PERFORMED: NO
TAG_CREATED: NO
MERGE_PERFORMED: NO
DEPLOYMENT_PERFORMED: NO
PUBLICATION_PERFORMED: NO
```

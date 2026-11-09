# PDF reader fixtures

`password-protected.pdf` is a synthetic two-page PDF created from `makePdf()` in
`test/pdf-fixtures.mjs`, encrypted using pypdf 7.0.0 with RC4-128 and the password
`fixture-password`. It contains only fictional evidence labels. pypdf is not an app or
test dependency; the checked-in fixture exercises PDF.js's password rejection state.

Other PDF fixtures are generated locally with valid xrefs: two-page text, an image-only
scan, an embedded Liberation Sans font (from PDF.js's licensed standard fonts), and an
18 MB padded historical PDF. No production files or student responses are used.

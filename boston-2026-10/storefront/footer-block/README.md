# storefront/footer-block/

**Each Footer block built for the Advisor to paste, one Markdown file per build**, so the pasted text is version
controlled and can be ingested whole by Fit AF's KMS: YAML front matter (the build's commit, its version line, the
text's and the fragment's SHA-256, its bytes, the block it replaces, the contract and the proof), then the fragment
itself between two four-backtick fence lines.

- **The fragment is exactly the build's output** (`npm --prefix boston-2026-10 run build:storefront`,
  `dist-storefront/fitaf-handoff.html`), byte for byte: the text between the fences hashes to `fragment_sha256`.
  Copy that text and nothing else; the fences are not part of it.
- **Named** `YYYY-MM-DD-fitaf-handoff-<commit>.md`: the build's date and the seven-character commit its version line
  names. A file is edited once more, when its block is pasted (its `status` and `pasted` lines), and never after; a new
  build is a new file.
- **Not an input**: nothing in this repository reads these files. `watch-baseline.json`'s `expectedFooter` records
  what is pasted; `src/storefront/` is the source.
- ⛔ **Pasted only by the Advisor**, in the store's admin (Custom Scripts, Footer). No agent types into that admin.

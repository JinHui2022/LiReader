# LiReader

<u>A vibe-coding product under the support of Deepseek V4 Pro.</u>

**Immersive, AI-assisted** reading of scientific papers as **web pages**, delivered as a **Chrome/Edge (Manifest V3)** browser extension, with a Python sidecar for offline text processing and (future) vision/OCR.

## What LiReader does today

Load it as an unpacked extension, open a journal article, and click the toolbar
icon to switch the page into a clean reading view. The reader:

- **Extracts the article body** with Mozilla Readability and trims it to the
  **Abstract → References** range (references excluded), so front matter, sidebars,
  and promotional content stay out.
- **Bionic reading** — bolds the first syllable of each word while skipping
  function words, for faster skimming.
- **Spotlight** — a reading line centered on screen; the current paragraph stays
  bright while neighbors and the rest dim as you scroll.
- **XSnow keyboard mode** — arrow keys move a word cursor (Shift+arrows select a
  range), and single-key hotkeys act on the selection: `Y`/`U`/`I` highlight
  (yellow/blue/pink), `Q`/`W`/`E` translate / Wikipedia / dictionary, `R` bionic,
  `T` spotlight, `A`/`D` font smaller/larger, `Enter` opens a link under the
  cursor, `Esc` exits.
- **Editing tools** — three highlight colors, bold, underline, font family/size,
  and a continuous page-margin slider (50–90%).
- **A collapsible, hierarchical outline** with jump links, built from the paper's
  section headings.
- **Lookup cards** on any word: a **dictionary** (Free Dictionary, Wiktionary, or
  Datamuse — phonetic + definitions), a **Wikipedia** card (~500-word lead +
  thumbnail), and **translation** (Microsoft, Google, or Lingva, target language
  configurable).
- **Citation styling** — reference markers are superscripted and colored, with
  their links preserved.
- **PDF export** — File → Save as PDF captures the text, your marks, and a
  clickable outline.
- **Custom theming** — a background image and a matching `#C3C4D6` toolbar.

The ribbon has five tabs: **File**, **Edit**, **Focus**, **Layout**, and
**Settings**.

## Repository structure

```
LiReader/
├── README.md
├── extension/                     # Chrome/Edge MV3 extension (plain JS, no build step)
│   ├── manifest.json              # permissions, host_permissions, icons
│   ├── background.js              # MV3 service worker: toolbar click + fetch proxy
│   ├── content.js                 # the reader overlay (all features)
│   ├── lib/
│   │   └── Readability.js         # Mozilla Readability — article extraction
│   └── imgs/                      # icon16/48/128.png + background.png
```

## Getting started — load the extension in Edge

1. Open `edge://extensions/`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder (the one containing
   `manifest.json`).
4. Open or refresh a journal article, then click the LiReader icon in the toolbar.

Notes:

- Content scripts only inject into pages opened **after** loading the extension,
  so refresh the article page once.
- After changing the manifest, accept any new permission prompt and reload.
- Set up translation under **Settings** → choose an engine and (for Microsoft)
  paste your key. Google and Lingva need no key.
- Annotations currently live for the session only; toggling bionic re-renders the
  text and clears them — a known v0.x limitation.

## Roadmap — what's coming next

- **AI summarization in the extension** — batch-by-batch text summarization and a
  per-section "PPT" summary, wired through the same provider-routing pattern used
  for translation.
- **Figure & vision OCR** — split multi-panel figures into subfigures, OCR each,
  and caption each (RapidOCR + Qwen2.5-VL via Ollama in the sidecar). This was
  deliberately deferred until the text features were stable.
- **Dictionary audio** — play pronunciation audio (the Free Dictionary API
  provides an MP3 URL).
- **Persistent annotations** — save highlights/bold/underline across sessions
  (keyed by page URL) so they survive re-renders and page reloads.
- **Provider routing for summarization** — user-supplied API keys per LLM, with a
  local Ollama fallback for privacy.
- **AI-generated outline** — complement the structural (heading-based) outline
  with an AI-generated one that summarizes each section.

## Core concepts

- **Document model.** One extracted content tree drives every feature; stable
  heading IDs keep the outline, jump links, and PDF export consistent.
- **Bionic reading.** First syllable of each content word; function words are
  skipped. The current syllable splitter is a vowel-group heuristic — swap in
  `pyphen` for production accuracy.
- **Provider adapters.** Dictionary, translation, and (future) summarization all
  use a small adapter layer so engines can be swapped without UI changes.

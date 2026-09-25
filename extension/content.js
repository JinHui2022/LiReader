// LiReader content script.
// Extracts the main article text and renders an immersive reader overlay with
// an Office-style ribbon (File / Edit / Focus / Layout), bionic reading,
// spotlight focus, colored highlighting, and PDF export with a linked outline.
(() => {
  "use strict";
  if (window.__lireader) return;
  window.__lireader = true;

  // ---------------------------------------------------------------------------
  // Styles (injected once into <head>)
  // ---------------------------------------------------------------------------
  const CSS = `
    #lireader-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background-color: #fcfbfa; color: #1f1f1f; color-scheme: light;
      display: none; flex-direction: column;
      font-family: var(--lr-family, Georgia, serif);
    }
    /* ---- Ribbon ---- */
    #lireader-overlay .lr-ribbon {
      background: #C3C4D6; border-bottom: 1px solid #b0b1c4; flex: 0 0 auto;
    }
    #lireader-overlay .lr-tabstrip {
      display: flex; align-items: center; gap: 2px;
      padding: 4px 8px 0; border-bottom: 1px solid #b0b1c4;
    }
    #lireader-overlay .lr-title {
      flex: 1 1 200px; font: 600 13px system-ui, sans-serif;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      padding: 0 10px; color: #1f1f1f !important;
      -webkit-text-fill-color: #1f1f1f !important;
    }
    #lireader-overlay .lr-tab {
      border: 1px solid transparent; border-bottom: none; background: transparent;
      padding: 8px 14px; font: 13px system-ui, sans-serif; cursor: pointer;
      border-radius: 4px 4px 0 0; color: #333 !important;
      -webkit-text-fill-color: #333 !important; text-transform: none !important;
      letter-spacing: normal !important; opacity: 1 !important; visibility: visible !important;
    }
    #lireader-overlay .lr-tab.active {
      background: #eceef8; border-color: #b0b1c4; color: #1f6feb !important;
      -webkit-text-fill-color: #1f6feb !important; font-weight: 600;
    }
    #lireader-overlay .lr-panel {
      display: none; align-items: center; gap: 10px; padding: 10px 16px; flex-wrap: wrap;
    }
    #lireader-overlay .lr-panel.active { display: flex; }
    #lireader-overlay .lr-label {
      font: 12px system-ui, sans-serif; color: #666 !important;
      -webkit-text-fill-color: #666 !important;
    }
    #lireader-overlay .lr-hint {
      font: 12px system-ui, sans-serif; color: #888 !important;
      -webkit-text-fill-color: #888 !important;
    }
    #lireader-overlay .lr-size {
      font: 13px system-ui, sans-serif; color: #333 !important;
      -webkit-text-fill-color: #333 !important; min-width: 24px; text-align: center;
    }
    /* ---- Buttons / selects ---- */
    #lireader-overlay .lr-btn {
      border: 1px solid #ddd; background: #fff; border-radius: 6px;
      padding: 5px 10px; font: 13px system-ui, sans-serif; cursor: pointer;
      color: #1f1f1f !important; -webkit-text-fill-color: #1f1f1f !important;
      text-transform: none !important; letter-spacing: normal !important;
      opacity: 1 !important; visibility: visible !important;
    }
    #lireader-overlay .lr-btn.active {
      background: #1f6feb; color: #fff !important;
      -webkit-text-fill-color: #fff !important; border-color: #1f6feb;
    }
    #lireader-overlay .lr-btn-primary {
      background: #1f6feb; color: #fff !important;
      -webkit-text-fill-color: #fff !important; border-color: #1f6feb;
      font-weight: 600;
    }
    #lireader-overlay .lr-select {
      border: 1px solid #ddd; border-radius: 6px; padding: 5px;
      font: 13px system-ui, sans-serif; background: #fff;
      color: #1f1f1f !important; -webkit-text-fill-color: #1f1f1f !important;
    }
    #lireader-overlay .lr-input {
      border: 1px solid #ddd; border-radius: 6px; padding: 5px 8px;
      font: 13px system-ui, sans-serif; background: #fff; min-width: 180px;
      color: #1f1f1f !important; -webkit-text-fill-color: #1f1f1f !important;
    }
    #lireader-overlay .lr-close {
      border: none; background: transparent; font-size: 15px; padding: 8px 10px;
    }
    /* ---- Reading line / content ---- */
    #lireader-overlay .lr-reading-line {
      position: fixed; top: 50vh; left: 0; right: 0;
      border-top: 3px dashed rgba(0,0,0,.18); pointer-events: none; display: none;
    }
    #lireader-overlay .lr-content {
      flex: 1; overflow-y: auto; padding: 32px 24px;
      width: var(--lr-width, 70%); max-width: none;
      margin: 0 auto; box-sizing: border-box;
    }
    #lireader-overlay .lr-range { width: 180px; accent-color: #1f6feb; }
    #lireader-overlay .lr-para, #lireader-overlay .lr-heading { transition: opacity .18s ease; }
    #lireader-overlay .lr-para, #lireader-overlay .lr-heading {
      color: #1f1f1f; -webkit-text-fill-color: #1f1f1f;
    }
    #lireader-overlay .lr-para { font-size: var(--lr-font-size, 18px); line-height: 1.75; margin: 0 0 1.1em; }
    #lireader-overlay .lr-heading {
      font-size: calc(var(--lr-font-size, 18px) * 1.35); line-height: 1.3;
      margin: 1.5em 0 .6em; font-family: var(--lr-family, Georgia, serif);
      scroll-margin-top: 110px;
    }
    #lireader-overlay .lr-bionic { font-weight: 700; }
    /* ---- Citation markers (distinct from body text, links preserved) ---- */
    #lireader-overlay .lr-para sup.lr-cite, #lireader-overlay .lr-para sub.lr-cite {
      font-size: 0.68em; font-weight: 400; line-height: 0;
      color: #3b6fc0 !important; -webkit-text-fill-color: #3b6fc0 !important;
      vertical-align: super;
    }
    #lireader-overlay .lr-para a.lr-cite-link {
      color: #3b6fc0 !important; -webkit-text-fill-color: #3b6fc0 !important;
      text-decoration: none; font-weight: 400;
    }
    #lireader-overlay .lr-para a.lr-cite-link:hover { text-decoration: underline; }
    #lireader-overlay .lr-para a:not(.lr-cite-link) {
      color: #3b6fc0; text-decoration: underline dotted rgba(59,111,192,.45);
    }
    #lireader-overlay .lr-figure { margin: 1.2em 0; text-align: center; }
    #lireader-overlay .lr-figure img { max-width: 100%; height: auto; border-radius: 4px; }
    #lireader-overlay .lr-figcaption { font: 13px/1.5 system-ui, sans-serif; color: #666; margin-top: 6px; }
    #lireader-overlay .lr-math { margin: 0.8em 0; }
    #lireader-overlay .lr-math-display { text-align: center; overflow-x: auto; }
    #lireader-overlay .lr-math math { font-size: 1.05em; }
    #lireader-overlay .lr-xsnow-hint {
      display: none; padding: 6px 16px; font: 12px system-ui, sans-serif;
      color: #333; background: #eef0f8; border-top: 1px solid #d9dbe8;
    }
    /* ---- Outline (jump links) ---- */
    #lireader-overlay .lr-outline {
      border: 1px solid #e5e5e5; border-radius: 8px; background: #fff;
      padding: 14px 18px; margin: 0 0 1.6em;
    }
    #lireader-overlay .lr-outline-title {
      font: 700 12px system-ui, sans-serif; text-transform: uppercase;
      letter-spacing: .04em; color: #666; margin-bottom: 6px;
    }
    #lireader-overlay .lr-outline ul { margin: 0; padding-left: 1.3em; list-style: none; }
    #lireader-overlay .lr-outline li { font: 15px system-ui, sans-serif; margin: 3px 0; }
    #lireader-overlay .lr-outline details { margin: 2px 0; }
    #lireader-overlay .lr-outline details > summary { cursor: pointer; user-select: none; }
    #lireader-overlay .lr-outline details[open] > summary { margin-bottom: 2px; }
    #lireader-overlay .lr-outline a {
      color: #1f6feb !important; -webkit-text-fill-color: #1f6feb !important;
      text-decoration: none;
    }
    #lireader-overlay .lr-outline a:hover { text-decoration: underline; }
    /* ---- Spotlight states ---- */
    #lireader-overlay .lr-focus { opacity: 1; }
    #lireader-overlay .lr-near  { opacity: .55; }
    #lireader-overlay .lr-dim   { opacity: .15; }
    /* ---- Selection bar ---- */
    #lireader-overlay .lr-selection-bar {
      position: fixed; display: none; align-items: center; gap: 6px; background: #fff;
      border: 1px solid #ddd; border-radius: 8px; padding: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,.14); z-index: 2147483647;
    }
    #lireader-overlay .lr-color {
      width: 22px; height: 22px; border-radius: 4px; padding: 0; border: 1px solid #bbb;
    }
    #lireader-overlay .lr-sep { width: 1px; height: 22px; background: #e0e0e0; }
    #lireader-overlay mark.lr-hl { color: inherit; }
    /* ---- Lookup card (dictionary / Wikipedia / translate) ---- */
    #lireader-overlay .lr-card {
      position: fixed; display: none; width: 380px; max-width: 90vw; max-height: 62vh;
      overflow-y: auto; background: #fff; border: 1px solid #ddd; border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,.18); padding: 14px 16px; z-index: 2147483647;
      font: 14px/1.55 system-ui, sans-serif; color: #1f1f1f;
    }
    #lireader-overlay .lr-card-title { font-weight: 700; font-size: 17px; margin-bottom: 4px; }
    #lireader-overlay .lr-card-phonetic { color: #666; margin-bottom: 8px; }
    #lireader-overlay .lr-card-pos { font-style: italic; color: #1f6feb; margin: 8px 0 2px; }
    #lireader-overlay .lr-card-def { margin: 3px 0; }
    #lireader-overlay .lr-card-example { color: #777; margin: 2px 0 6px; }
    #lireader-overlay .lr-card-thumb { max-width: 100%; border-radius: 6px; margin: 6px 0; }
    #lireader-overlay .lr-card-body { margin-top: 6px; }
    #lireader-overlay .lr-card-link { color: #1f6feb; text-decoration: none; display: inline-block; margin-top: 10px; }
    #lireader-overlay .lr-card-source { color: #666; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 8px; }
    #lireader-overlay .lr-card-translated { font-size: 15px; }
    #lireader-overlay .lr-card-empty { color: #888; }
    #lireader-overlay .lr-card-close {
      position: absolute; top: 8px; right: 10px; border: none; background: transparent;
      font-size: 15px; cursor: pointer; color: #888;
    }
    #lireader-overlay .lr-card-loading { display: flex; align-items: center; gap: 8px; color: #888; padding: 8px 0; }
    #lireader-overlay .lr-spinner {
      width: 16px; height: 16px; border: 2px solid #ddd; border-top-color: #1f6feb;
      border-radius: 50%; animation: lr-spin .8s linear infinite; display: inline-block;
    }
    @keyframes lr-spin { to { transform: rotate(360deg); } }
  `;

  // ---------------------------------------------------------------------------
  // Bionic reading helpers
  // ---------------------------------------------------------------------------
  const FUNCTION_WORDS = new Set([
    // prepositions
    "about","above","across","after","against","along","among","around","at","before",
    "behind","below","beneath","beside","between","beyond","by","down","during","except",
    "for","from","in","inside","into","near","of","off","on","onto","out","over","past",
    "since","through","to","toward","under","until","up","upon","with","within","without",
    // conjunctions
    "and","but","or","nor","so","yet","because","although","though","while","whereas",
    "if","unless","than","as","whether","either","neither",
    // articles / determiners
    "a","an","the","this","that","these","those","each","every","some","any","no",
    "many","much","more","most","few","several","such","both","all",
    // pronouns
    "i","you","he","she","it","we","they","me","him","her","us","them","my","your",
    "his","its","our","their","mine","yours","hers","ours","theirs","who","whom",
    "whose","which","what","one",
    // auxiliaries / copula
    "is","am","are","was","were","be","been","being","have","has","had","do","does",
    "did","will","would","shall","should","can","could","may","might","must","ought",
  ]);

  const VOWELS = "aeiouy";

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function firstSyllable(word) {
    const w = word.toLowerCase();
    let i = 0;
    while (i < w.length && !VOWELS.includes(w[i])) i++;
    if (i >= w.length) return Math.max(1, Math.floor(w.length / 2));
    let j = i;
    while (j < w.length && VOWELS.includes(w[j])) j++;
    while (j < w.length && !VOWELS.includes(w[j])) j++;
    return j;
  }

  function bionicWord(word) {
    const core = word.replace(/^[^A-Za-z]+/, "").replace(/[^A-Za-z]+$/, "");
    if (!/^[A-Za-z]+$/.test(core)) return null;
    if (core.length < 3 || FUNCTION_WORDS.has(core.toLowerCase())) return null;
    const idx = firstSyllable(core);
    if (idx <= 0 || idx >= core.length) return null;
    const start = word.indexOf(core);
    return {
      lead: word.slice(0, start),
      prefix: core.slice(0, idx),
      rest: core.slice(idx),
      trail: word.slice(start + core.length),
    };
  }

  function bionicHtml(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(/[A-Za-z][A-Za-z'-]*/g, (word) => {
      const r = bionicWord(word);
      if (!r) return word;
      return `${r.lead}<b class="lr-bionic">${r.prefix}</b>${r.rest}${r.trail}`;
    });
  }

  // ---- DOM-based paragraph rendering: citations + bionic on real text only ----

  const BRACKET_CITE_RE = /\[\s*\d+(?:\s*[-,–]\s*\d+)*(?:\s*,\s*\d+(?:\s*[-,–]\s*\d+)*)*\s*\]/g;

  function bionicTextToNodes(text) {
    const frag = document.createDocumentFragment();
    const re = /[A-Za-z][A-Za-z'-]*/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const word = m[0];
      const r = bionicWord(word);
      if (r) {
        const b = document.createElement("b");
        b.className = "lr-bionic";
        b.textContent = r.lead + r.prefix;
        frag.appendChild(b);
        frag.appendChild(document.createTextNode(r.rest + r.trail));
      } else {
        frag.appendChild(document.createTextNode(word));
      }
      last = m.index + word.length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }

  // Bold first syllables of text nodes, but leave links and citation markers
  // (which are not body prose) untouched.
  function bionicize(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      let p = walker.currentNode.parentElement;
      let skip = false;
      while (p && p !== root) {
        const t = p.tagName;
        if (t === "A" || t === "SUP" || t === "SUB" || t === "MATH") { skip = true; break; }
        p = p.parentElement;
      }
      if (!skip) nodes.push(walker.currentNode);
    }
    for (const n of nodes) {
      const frag = bionicTextToNodes(n.nodeValue);
      n.parentNode.replaceChild(frag, n);
    }
  }

  // Turn bracketed citations like [1,2] or [1-3] into styled superscripts.
  function wrapBracketCitations(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const p = walker.currentNode.parentElement;
      if (p && (p.tagName === "A" || p.tagName === "SUP" || p.tagName === "SUB" || p.tagName === "MATH")) continue;
      nodes.push(walker.currentNode);
    }
    for (const n of nodes) {
      const text = n.nodeValue;
      BRACKET_CITE_RE.lastIndex = 0;
      if (!BRACKET_CITE_RE.test(text)) continue;
      BRACKET_CITE_RE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = BRACKET_CITE_RE.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const sup = document.createElement("sup");
        sup.className = "lr-cite";
        sup.textContent = m[0];
        frag.appendChild(sup);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    }
  }

  // Style existing <sup>/<sub> and any anchor that is a citation link.
  function styleCitationLinks(root) {
    root.querySelectorAll("sup, sub").forEach((el) => el.classList.add("lr-cite"));
    root.querySelectorAll("a").forEach((a) => {
      const t = (a.textContent || "").trim();
      if (/^\[?\s*\d/.test(t) || a.closest("sup, sub")) a.classList.add("lr-cite-link");
    });
  }

  function renderParagraph(el, html, bionic) {
    el.innerHTML = html;
    wrapBracketCitations(el);
    styleCitationLinks(el);
    if (bionic) bionicize(el);
  }

  // ---------------------------------------------------------------------------
  // Article extraction (Readability-lite)
  // ---------------------------------------------------------------------------
  const NOISE_SELECTOR =
    "script,style,nav,footer,aside,header,form,button,svg,iframe,figure,noscript," +
    "select,textarea,img,video,audio,input,ins";

  const BLOCK_TAGS = new Set([
    "P", "DIV", "SECTION", "ARTICLE", "LI", "BLOCKQUOTE", "UL", "OL", "TABLE",
    "PRE", "H1", "H2", "H3", "H4", "H5", "H6",
  ]);

  function extractImg(el) {
    let img = null, container = null;
    if (el.tagName === "IMG") { img = el; }
    else { img = el.querySelector("img"); container = el; }
    if (!img) return null;
    let src = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("src") || "";
    if (!src && img.getAttribute("srcset")) {
      const cands = img.getAttribute("srcset").split(",");
      const best = cands[cands.length - 1].trim().split(/\s+/)[0];
      if (best) src = best;
    }
    if (!src || /^(data:|about:blank)/i.test(src)) return null;
    const fig = (container || img).closest ? (container || img).closest("figure") : null;
    const capEl = fig ? fig.querySelector("figcaption") : null;
    const caption = capEl ? capEl.innerText.trim() : "";
    return { type: "img", src, alt: img.getAttribute("alt") || "", caption };
  }

  function collectBlocks(root) {
    const out = [];
    function isImg(el) {
      return el.tagName === "IMG" || el.tagName === "PICTURE" || el.tagName === "FIGURE";
    }
    function walk(el) {
      if (el.nodeType !== 1) return;
      if (isImg(el)) {
        const im = extractImg(el);
        if (im) out.push(im);
        return;
      }
      if (el.tagName === "MATH") {
        out.push({ type: "math", html: el.outerHTML, display: el.getAttribute("display") === "block" });
        return;
      }
      const text = (el.innerText || "").trim();
      if (!text) return;
      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag)) {
        out.push({ type: "h", level: Number(tag[1]), text, html: el.innerHTML });
        return;
      }
      const kids = Array.from(el.children);
      const hasBlockChild = kids.some((c) => BLOCK_TAGS.has(c.tagName) || isImg(c));
      if (!hasBlockChild) {
        out.push({ type: "p", text, html: el.innerHTML });
        return;
      }
      kids.forEach(walk);
    }
    walk(root);
    return out;
  }

  // Keep only the content between the "Abstract" heading and the "References"
  // heading (exclusive of References). Papers reliably have both, so this is a
  // safe way to drop front matter and the citation list.
  function trimToAbstractReference(blocks) {
    const norm = (b) => (b.type === "h" && b.text ? b.text.trim().toLowerCase() : "");
    let start = blocks.findIndex((b) => norm(b).startsWith("abstract"));
    let end = blocks.findIndex((b) => norm(b).startsWith("reference"));
    if (start === -1) start = 0;
    if (end === -1) end = blocks.length;
    if (end < start) end = start;
    return blocks.slice(start, end);
  }

  function hasAbstractHeading(blocks) {
    return blocks.some((b) => b.type === "h" && /^abstract/i.test(b.text.trim()));
  }

  function extractAbstractFromOriginal() {
    let abs = document.querySelector('[id*="abstract" i], [class*="abstract" i], [id*="Abs1"], [class*="Abs1"]');
    if (!abs) {
      const heads = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
      const h = heads.find((x) => /^abstract$/i.test(x.innerText.trim()));
      abs = h ? h.parentElement : null;
    }
    if (!abs) return [];
    const clone = abs.cloneNode(true);
    clone.querySelectorAll("script,style,nav,sup,sub,svg,img,button,a").forEach((n) => n.remove());
    const text = (clone.innerText || "").trim().replace(/^abstract\s*:?\s*/i, "").trim();
    if (!text) return [];
    const paras = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean).slice(0, 6);
    return paras.map((t) => ({ type: "p", text: t, html: escapeHtml(t) }));
  }

  function extractArticle() {
    const h1 = document.querySelector("h1");
    let title = (h1 && h1.innerText.trim()) || document.title || "Untitled";

    let blocks = [];
    // Prefer Mozilla Readability (the Firefox Reader View / Simpread engine)
    // when available — it filters promotional and boilerplate content far
    // better than a naive densest-text heuristic.
    try {
      if (typeof Readability !== "undefined") {
        const article = new Readability(document.cloneNode(true), { charThreshold: 500 }).parse();
        if (article && article.content) {
          if (article.title) title = article.title;
          const holder = document.createElement("div");
          holder.innerHTML = article.content;
          blocks = collectBlocks(holder);
        }
      }
    } catch (e) { /* fall through to the heuristic below */ }

    // Fallback: densest-text heuristic for pages Readability can't handle.
    if (blocks.length < 2) {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll(NOISE_SELECTOR).forEach((n) => n.remove());
      let best = null;
      let bestScore = -1;
      clone.querySelectorAll("article,main,section,div").forEach((el) => {
        const txt = (el.innerText || "").trim();
        const score = txt.length + 60 * el.querySelectorAll("p").length;
        if (score > bestScore) { bestScore = score; best = el; }
      });
      blocks = collectBlocks(best || clone);
    }

    // Drop a leading heading that duplicates the article title.
    if (blocks[0] && blocks[0].type === "h" &&
        blocks[0].text.trim().toLowerCase() === title.trim().toLowerCase()) {
      blocks.shift();
    }
    // If the abstract was dropped (no "Abstract" heading and the body starts
    // with a section heading), recover it from the original page.
    if (blocks.length && blocks[0].type === "h" && !hasAbstractHeading(blocks)) {
      const abs = extractAbstractFromOriginal();
      if (abs.length) {
        blocks = [{ type: "h", level: 2, text: "Abstract", html: "Abstract" }].concat(abs, blocks);
      }
    }
    blocks = trimToAbstractReference(blocks);
    return { title, blocks };
  }

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
  }

  function resolveUrl(src) {
    try { return new URL(src, location.href).href; } catch (e) { return src; }
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const state = {
    tab: "file",
    bionic: false,
    spotlight: false,
    fontSize: 20,
    fontFamily: "serif",
    margin: 75,
    translateTo: "zh-Hans",
    translateEngine: "microsoft",
    dictEngine: "freedictionary",
    msKey: "",
    title: "",
    blocks: [],
    selectedText: "",
    selRect: null,
    xsnow: false,
    xsnowWords: null,
    xsnowIndex: -1,
    xsnowAnchor: -1,
    xsnowSavedIndex: -1,
    cardType: null,
  };
  let overlay = null;
  let content = null;

  // ---------------------------------------------------------------------------
  // Overlay construction
  // ---------------------------------------------------------------------------
  function ensureOverlay() {
    if (overlay) return overlay;
    let style = document.getElementById("lireader-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "lireader-style";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    overlay = document.createElement("div");
    overlay.id = "lireader-overlay";
    // Use the bundled background image for the reading view.
    try {
      const bg = chrome.runtime.getURL("imgs/background.png");
      overlay.style.backgroundImage = 'url("' + bg + '")';
      overlay.style.backgroundSize = "cover";
      overlay.style.backgroundPosition = "center";
      overlay.style.backgroundRepeat = "no-repeat";
      overlay.style.backgroundAttachment = "fixed";
    } catch (e) { /* keep the fallback background color */ }
    overlay.innerHTML = `
      <div class="lr-ribbon">
        <div class="lr-tabstrip">
          <span class="lr-title"></span>
          <button class="lr-tab active" data-tab="file">File</button>
          <button class="lr-tab" data-tab="edit">Edit</button>
          <button class="lr-tab" data-tab="focus">Focus</button>
          <button class="lr-tab" data-tab="layout">Layout</button>
          <button class="lr-tab" data-tab="settings">Settings</button>
          <button class="lr-btn lr-close" data-act="close">✕</button>
        </div>
        <div class="lr-panel active" data-panel="file">
          <button class="lr-btn lr-btn-primary" data-act="export-pdf">Save as PDF</button>
          <span class="lr-hint">Saves the text, your highlights, and a linked outline.</span>
        </div>
        <div class="lr-panel" data-panel="edit">
          <span class="lr-label">Font</span>
          <button class="lr-btn" data-act="font-">A−</button>
          <span class="lr-size">20</span>
          <button class="lr-btn" data-act="font+">A+</button>
          <select class="lr-select" data-act="family">
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans</option>
            <option value="monospace">Mono</option>
          </select>
        </div>
        <div class="lr-panel" data-panel="focus">
          <button class="lr-btn" data-act="bionic">Bionic</button>
          <button class="lr-btn" data-act="spotlight">Spotlight</button>
          <button class="lr-btn" data-act="xsnow">XSnow</button>
        </div>
        <div class="lr-panel" data-panel="layout">
          <span class="lr-label">Margin</span>
          <input type="range" class="lr-range" data-act="margin" min="50" max="90" step="1" value="75">
          <span class="lr-size lr-margin-value">75%</span>
        </div>
        <div class="lr-panel" data-panel="settings">
          <span class="lr-label">Dictionary</span>
          <select class="lr-select" data-act="dictEngine">
            <option value="freedictionary">Free Dictionary</option>
            <option value="wiktionary">Wiktionary</option>
            <option value="datamuse">Datamuse</option>
          </select>
          <span class="lr-label">Translator</span>
          <select class="lr-select" data-act="translateEngine">
            <option value="microsoft">Microsoft</option>
            <option value="google">Google</option>
            <option value="lingva">Lingva</option>
          </select>
          <span class="lr-label">Translate to</span>
          <select class="lr-select" data-act="translateTo">
            <option value="zh-Hans">Chinese (Simplified)</option>
            <option value="zh-Hant">Chinese (Traditional)</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
          </select>
          <span class="lr-label">MS key</span>
          <input type="password" class="lr-input" data-act="msKey" placeholder="Microsoft Translator key">
        </div>
        <div class="lr-xsnow-hint">XSnow: ←→↑↓ move · Shift select · Enter link · Y/U/I highlight · J bold · K italic · Q/W/E lookup · R bionic · T spotlight · Esc exit</div>
      </div>
      <div class="lr-reading-line"></div>
      <div class="lr-content"></div>
      <div class="lr-selection-bar">
        <button class="lr-btn lr-color" data-edit="hl" data-color="#ffe08a" title="Highlight yellow" style="background:#ffe08a"></button>
        <button class="lr-btn lr-color" data-edit="hl" data-color="#aad4ff" title="Highlight blue" style="background:#aad4ff"></button>
        <button class="lr-btn lr-color" data-edit="hl" data-color="#ffb6d9" title="Highlight pink" style="background:#ffb6d9"></button>
        <span class="lr-sep"></span>
        <button class="lr-btn" data-edit="b" title="Bold">B</button>
        <button class="lr-btn" data-edit="u" title="Underline">U</button>
        <span class="lr-sep"></span>
        <button class="lr-btn" data-lookup="dictionary" title="Dictionary">Dict</button>
        <button class="lr-btn" data-lookup="wiki" title="Wikipedia">Wiki</button>
        <button class="lr-btn" data-lookup="translate" title="Translate">Translate</button>
      </div>
      <div class="lr-card"></div>
    `;
    document.documentElement.appendChild(overlay);
    content = overlay.querySelector(".lr-content");

    // Tab switching + ribbon actions.
    overlay.querySelector(".lr-ribbon").addEventListener("click", (e) => {
      const tab = e.target.closest(".lr-tab");
      if (tab) { switchTab(tab.dataset.tab); return; }
      const actEl = e.target.closest("[data-act]");
      if (!actEl) return;
      const act = actEl.dataset.act;
      if (act === "close") toggleReader(false);
      else if (act === "bionic") toggleBionic();
      else if (act === "spotlight") toggleSpotlight();
      else if (act === "xsnow") toggleXSnow();
      else if (act === "font+") { setFontSize(1); }
      else if (act === "font-") { setFontSize(-1); }
      else if (act === "export-pdf") exportPDF();
    });

    overlay.querySelector(".lr-ribbon").addEventListener("change", (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === "family") { state.fontFamily = e.target.value; applyFont(); saveSettings(); }
      else if (act === "margin") { state.margin = Number(e.target.value); applyMargin(); saveSettings(); }
      else if (act === "dictEngine") { state.dictEngine = e.target.value; saveSettings(); }
      else if (act === "translateEngine") { state.translateEngine = e.target.value; saveSettings(); }
      else if (act === "translateTo") { state.translateTo = e.target.value; saveSettings(); }
      else if (act === "msKey") { state.msKey = e.target.value.trim(); saveSettings(); }
    });

    // Live-update the margin while the slider is being dragged.
    overlay.querySelector(".lr-ribbon").addEventListener("input", (e) => {
      if (e.target.dataset && e.target.dataset.act === "margin") {
        state.margin = Number(e.target.value);
        applyMargin();
      }
    });

    overlay.querySelector(".lr-selection-bar").addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      if (edit) { applyEdit(edit.dataset.edit, edit.dataset.color); return; }
      const lookup = e.target.closest("[data-lookup]");
      if (lookup) { hideSelectionBar(); doLookup(lookup.dataset.lookup); }
    });

    content.addEventListener("scroll", updateSpotlight, { passive: true });
    content.addEventListener("mouseup", onSelection);
    content.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href").slice(1);
      const target = content.querySelector('[id="' + id.replace(/"/g, '\\"') + '"]');
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    document.addEventListener("keydown", handleKey);

    const card = overlay.querySelector(".lr-card");
    card.addEventListener("click", (e) => {
      if (e.target.closest(".lr-card-close")) { card.style.display = "none"; state.cardType = null; }
    });
    document.addEventListener("mousedown", (e) => {
      if (overlay.style.display !== "flex") return;
      if (card.style.display === "block" &&
          !card.contains(e.target) && !e.target.closest(".lr-selection-bar")) {
        card.style.display = "none";
        state.cardType = null;
      }
    });
    return overlay;
  }

  function switchTab(tab) {
    state.tab = tab;
    overlay.querySelectorAll(".lr-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
    overlay.querySelectorAll(".lr-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === tab));
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  function computeHeadingIds() {
    const used = new Map();
    return state.blocks.filter((b) => b.type === "h").map((h) => {
      const base = slug(h.text);
      const n = (used.get(base) || 0) + 1;
      used.set(base, n);
      return n === 1 ? base : base + "-" + n;
    });
  }

  // Build a nested heading tree from a flat heading list + their ids.
  function buildHeadingTree(heads, ids) {
    const nodes = heads.map((h, i) => ({
      text: h.text, level: h.level, id: ids[i], children: [],
    }));
    if (!nodes.length) return [];
    const base = Math.min(...nodes.map((n) => n.level));
    const root = { level: base - 1, children: [] };
    const stack = [root];
    for (const n of nodes) {
      while (stack.length > 1 && stack[stack.length - 1].level >= n.level) stack.pop();
      stack[stack.length - 1].children.push(n);
      stack.push(n);
    }
    return root.children;
  }

  function renderOutlineTree(nodes) {
    return "<ul>" + nodes.map(renderOutlineNode).join("") + "</ul>";
  }

  function renderOutlineNode(node) {
    const link = `<a href="#${node.id}">${escapeHtml(node.text)}</a>`;
    if (!node.children.length) return `<li>${link}</li>`;
    return `<li><details open><summary>${link}</summary>${renderOutlineTree(node.children)}</details></li>`;
  }

  function renderContent() {
    overlay.querySelector(".lr-title").textContent = state.title;
    content.innerHTML = "";
    const frag = document.createDocumentFragment();

    const heads = state.blocks.filter((b) => b.type === "h");
    const ids = computeHeadingIds();
    if (heads.length) {
      const nav = document.createElement("nav");
      nav.className = "lr-outline";
      nav.innerHTML =
        '<div class="lr-outline-title">Outline</div>' +
        renderOutlineTree(buildHeadingTree(heads, ids));
      frag.appendChild(nav);
    }

    let hi = 0;
    for (const b of state.blocks) {
      if (b.type === "h") {
        const el = document.createElement("h" + Math.min(b.level + 1, 6));
        el.className = "lr-block lr-heading";
        el.id = ids[hi++];
        el.innerHTML = state.bionic ? bionicHtml(b.text) : escapeHtml(b.text);
        frag.appendChild(el);
      } else if (b.type === "img") {
        const fig = document.createElement("figure");
        fig.className = "lr-block lr-figure";
        const img = document.createElement("img");
        img.src = resolveUrl(b.src);
        img.alt = b.alt || "";
        img.loading = "lazy";
        fig.appendChild(img);
        if (b.caption) {
          const cap = document.createElement("figcaption");
          cap.className = "lr-figcaption";
          cap.textContent = b.caption;
          fig.appendChild(cap);
        }
        frag.appendChild(fig);
      } else if (b.type === "math") {
        const wrap = document.createElement("div");
        wrap.className = "lr-block lr-math" + (b.display ? " lr-math-display" : "");
        wrap.innerHTML = b.html;
        frag.appendChild(wrap);
      } else {
        const el = document.createElement("p");
        el.className = "lr-block lr-para";
        renderParagraph(el, b.html || escapeHtml(b.text), state.bionic);
        frag.appendChild(el);
      }
    }
    content.appendChild(frag);
    updateSpotlight();
  }

  function applyFont() {
    overlay.style.setProperty("--lr-font-size", state.fontSize + "px");
    overlay.style.setProperty("--lr-family", state.fontFamily);
    overlay.querySelector(".lr-size").textContent = state.fontSize;
    overlay.querySelector("[data-act='family']").value = state.fontFamily;
  }

  function applyMargin() {
    overlay.style.setProperty("--lr-width", state.margin + "%");
    const range = overlay.querySelector("[data-act='margin']");
    if (range) range.value = state.margin;
    const val = overlay.querySelector(".lr-margin-value");
    if (val) val.textContent = state.margin + "%";
  }

  function applySettingsUI() {
    const dict = overlay.querySelector("[data-act='dictEngine']");
    if (dict) dict.value = state.dictEngine;
    const engine = overlay.querySelector("[data-act='translateEngine']");
    if (engine) engine.value = state.translateEngine;
    const sel = overlay.querySelector("[data-act='translateTo']");
    if (sel) sel.value = state.translateTo;
    const inp = overlay.querySelector("[data-act='msKey']");
    if (inp) inp.value = state.msKey || "";
  }

  function updateSpotlight() {
    if (!overlay) return;
    const paras = Array.from(content.querySelectorAll(".lr-para"));
    if (!state.spotlight) {
      paras.forEach((p) => p.classList.remove("lr-focus", "lr-near", "lr-dim"));
      return;
    }
    const lineY = window.innerHeight * 0.5;
    let bestIdx = 0;
    let bestDist = Infinity;
    paras.forEach((p, i) => {
      const r = p.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - lineY);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    paras.forEach((p, i) => {
      p.classList.remove("lr-focus", "lr-near", "lr-dim");
      if (i === bestIdx) p.classList.add("lr-focus");
      else if (Math.abs(i - bestIdx) === 1) p.classList.add("lr-near");
      else p.classList.add("lr-dim");
    });
  }

  // ---------------------------------------------------------------------------
  // Selection + editing
  // ---------------------------------------------------------------------------
  function onSelection(e) {
    if (e.target.closest(".lr-selection-bar")) return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !content.contains(sel.anchorNode)) { hideSelectionBar(); return; }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      state.selectedText = sel.toString().trim();
      state.selRect = rect;
      const bar = overlay.querySelector(".lr-selection-bar");
      bar.style.display = "flex";
      const bw = bar.offsetWidth;
      bar.style.left = Math.max(8, Math.min(rect.left + rect.width / 2 - bw / 2, window.innerWidth - bw - 8)) + "px";
      bar.style.top = Math.max(8, rect.top - 44) + "px";
    }, 0);
  }

  function hideSelectionBar() {
    if (overlay) overlay.querySelector(".lr-selection-bar").style.display = "none";
  }

  function applyEdit(kind, color) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { hideSelectionBar(); return; }
    const range = sel.getRangeAt(0);
    let el;
    if (kind === "hl") {
      el = document.createElement("mark");
      el.className = "lr-hl";
      el.style.backgroundColor = color || "#ffe08a";
      el.style.color = "inherit";
    } else if (kind === "b") el = document.createElement("strong");
    else if (kind === "u") el = document.createElement("u");
    try { range.surroundContents(el); } catch (err) { /* partial cross-block selection */ }
    sel.removeAllRanges();
    hideSelectionBar();
  }

  // ---- XSnow: keyboard-driven word navigation & hotkey actions ----

  function setFontSize(delta) {
    state.fontSize = Math.max(12, Math.min(32, state.fontSize + delta));
    applyFont();
    saveSettings();
  }

  function toggleBionic() {
    state.bionic = !state.bionic;
    const btn = overlay.querySelector("[data-act='bionic']");
    if (btn) btn.classList.toggle("active", state.bionic);
    renderContent();
  }

  function toggleSpotlight() {
    state.spotlight = !state.spotlight;
    const btn = overlay.querySelector("[data-act='spotlight']");
    if (btn) btn.classList.toggle("active", state.spotlight);
    overlay.querySelector(".lr-reading-line").style.display = state.spotlight ? "block" : "none";
    updateSpotlight();
  }

  function setXsnowHint(on) {
    const hint = overlay.querySelector(".lr-xsnow-hint");
    if (hint) hint.style.display = on ? "block" : "none";
  }

  // Locate the segment (text node + offset) containing a character index.
  function segAt(segs, charIndex) {
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segs[mid].start <= charIndex) lo = mid; else hi = mid - 1;
    }
    return segs[lo];
  }

  // Build an ordered list of words with their DOM range boundaries. Text inside
  // citations (sup/sub) and links is skipped; inline markup (<b>, <mark>, etc.)
  // is treated as transparent so a word is never split by bionic/edits.
  function collectWordRanges(root) {
    const ranges = [];
    const paras = root.querySelectorAll(".lr-para");
    const blocks = paras.length ? Array.from(paras) : [root];
    const re = /[A-Za-z][A-Za-z'-]*/g;
    for (const block of blocks) {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      const segs = [];
      let full = "";
      while (walker.nextNode()) {
        const n = walker.currentNode;
        let p = n.parentElement, skip = false;
        while (p && p !== block) {
          const t = p.tagName;
          if (t === "SUP" || t === "SUB" || t === "MATH") { skip = true; break; }
          p = p.parentElement;
        }
        if (skip) continue;
        const text = n.nodeValue;
        segs.push({ node: n, start: full.length, len: text.length });
        full += text;
      }
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(full))) {
        const s = m.index, e = m.index + m[0].length;
        const sSeg = segAt(segs, s);
        const eSeg = segAt(segs, e - 1);
        ranges.push({
          text: m[0],
          startContainer: sSeg.node,
          startOffset: s - sSeg.start,
          endContainer: eSeg.node,
          endOffset: (e - 1) - eSeg.start + 1,
        });
      }
    }
    return ranges;
  }

  function wordRect(w) {
    const r = document.createRange();
    r.setStart(w.startContainer, w.startOffset);
    r.setEnd(w.endContainer, w.endOffset);
    const rects = r.getClientRects();
    return rects.length ? rects[0] : null;
  }

  function firstVisibleWordIndex() {
    if (!state.xsnowWords || !state.xsnowWords.length) return -1;
    const ctop = content.getBoundingClientRect().top;
    for (let i = 0; i < state.xsnowWords.length; i++) {
      const r = wordRect(state.xsnowWords[i]);
      if (r && r.bottom >= ctop) return i;
    }
    return state.xsnowWords.length - 1;
  }

  function openLinkUnderCursor() {
    const w = state.xsnowWords && state.xsnowWords[state.xsnowIndex];
    if (!w) return;
    const el = w.startContainer.nodeType === 1 ? w.startContainer : w.startContainer.parentElement;
    const a = el && el.closest ? el.closest("a[href]") : null;
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href) return;
    if (href.startsWith("#")) {
      const target = content.querySelector('[id="' + href.slice(1).replace(/"/g, '\\"') + '"]');
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.open(href, "_blank", "noopener");
    }
  }

  function selectWordRange(w) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    const r = document.createRange();
    r.setStart(w.startContainer, w.startOffset);
    r.setEnd(w.endContainer, w.endOffset);
    sel.addRange(r);
  }

  function selectRange(a, b) {
    if (!state.xsnowWords || !state.xsnowWords.length) return;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const wl = state.xsnowWords[lo], wr = state.xsnowWords[hi];
    const sel = window.getSelection();
    sel.removeAllRanges();
    const r = document.createRange();
    r.setStart(wl.startContainer, wl.startOffset);
    r.setEnd(wr.endContainer, wr.endOffset);
    sel.addRange(r);
  }

  function scrollWordToReadingLine(w) {
    const r = wordRect(w);
    if (!r) return;
    const lineY = window.innerHeight * 0.5;
    const delta = (r.top + r.height / 2) - lineY;
    content.scrollBy({ top: delta, behavior: "smooth" });
  }

  function setXsnowIndex(i, shift) {
    if (!shift) state.xsnowAnchor = i;
    state.xsnowIndex = i;
    const w = state.xsnowWords[i];
    if (!w) return;
    selectRange(state.xsnowAnchor, state.xsnowIndex);
    scrollWordToReadingLine(w);
  }

  function moveVertical(dir, shift) {
    const cur = wordRect(state.xsnowWords[state.xsnowIndex]);
    if (!cur) return;
    const cx = cur.left + cur.width / 2;
    let best = null, bestKey = Infinity;
    for (let i = 0; i < state.xsnowWords.length; i++) {
      if (i === state.xsnowIndex) continue;
      const r = wordRect(state.xsnowWords[i]);
      if (!r) continue;
      const horiz = Math.abs((r.left + r.width / 2) - cx);
      if (dir === 1) { // down
        if (r.top <= cur.bottom) continue;
        const key = (r.top - cur.bottom) * 10000 + horiz;
        if (key < bestKey) { bestKey = key; best = i; }
      } else { // up
        if (r.bottom >= cur.top) continue;
        const key = (cur.top - r.bottom) * 10000 + horiz;
        if (key < bestKey) { bestKey = key; best = i; }
      }
    }
    if (best != null) setXsnowIndex(best, shift);
  }

  function toggleXSnow() {
    if (state.xsnow) { deactivateXSnow(); return; }
    state.xsnow = true;
    setXsnowHint(true);
    const btn = overlay.querySelector("[data-act='xsnow']");
    if (btn) btn.classList.add("active");
    state.xsnowWords = collectWordRanges(content);
    if (!state.xsnowWords.length) {
      state.xsnowIndex = -1;
      state.xsnowAnchor = -1;
      return;
    }
    let startIdx = state.xsnowSavedIndex;
    if (!(startIdx >= 0 && startIdx < state.xsnowWords.length)) startIdx = firstVisibleWordIndex();
    state.xsnowIndex = startIdx;
    state.xsnowAnchor = startIdx;
    setXsnowIndex(startIdx);
  }

  function deactivateXSnow() {
    state.xsnowSavedIndex = state.xsnowIndex;
    state.xsnow = false;
    state.xsnowWords = null;
    state.xsnowIndex = -1;
    state.xsnowAnchor = -1;
    setXsnowHint(false);
    const btn = overlay.querySelector("[data-act='xsnow']");
    if (btn) btn.classList.remove("active");
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }

  function highlightWord(color) {
    if (!state.xsnowWords || !state.xsnowWords.length) return;
    const lo = Math.min(state.xsnowAnchor, state.xsnowIndex);
    const hi = Math.max(state.xsnowAnchor, state.xsnowIndex);
    const wl = state.xsnowWords[lo], wr = state.xsnowWords[hi];
    const r = document.createRange();
    r.setStart(wl.startContainer, wl.startOffset);
    r.setEnd(wr.endContainer, wr.endOffset);
    const text = r.toString();
    r.deleteContents();
    const mark = document.createElement("mark");
    mark.className = "lr-hl";
    mark.style.backgroundColor = color;
    mark.style.color = "inherit";
    mark.textContent = text;
    r.insertNode(mark);
    // The DOM changed — rebuild word ranges and keep the cursor/selection.
    state.xsnowWords = collectWordRanges(content);
    state.xsnowIndex = Math.min(state.xsnowIndex, state.xsnowWords.length - 1);
    state.xsnowAnchor = Math.min(state.xsnowAnchor, state.xsnowWords.length - 1);
    if (state.xsnowIndex >= 0) selectRange(state.xsnowAnchor, state.xsnowIndex);
  }

  // Wrap the current selection (single word or Shift-selected range) in a tag.
  function wrapSelection(tagName) {
    if (!state.xsnowWords || !state.xsnowWords.length) return;
    const lo = Math.min(state.xsnowAnchor, state.xsnowIndex);
    const hi = Math.max(state.xsnowAnchor, state.xsnowIndex);
    const wl = state.xsnowWords[lo], wr = state.xsnowWords[hi];
    const r = document.createRange();
    r.setStart(wl.startContainer, wl.startOffset);
    r.setEnd(wr.endContainer, wr.endOffset);
    const text = r.toString();
    if (!text) return;
    r.deleteContents();
    const el = document.createElement(tagName);
    el.textContent = text;
    r.insertNode(el);
    // The DOM changed — rebuild word ranges and keep the cursor/selection.
    state.xsnowWords = collectWordRanges(content);
    state.xsnowIndex = Math.min(state.xsnowIndex, state.xsnowWords.length - 1);
    state.xsnowAnchor = Math.min(state.xsnowAnchor, state.xsnowWords.length - 1);
    if (state.xsnowIndex >= 0) selectRange(state.xsnowAnchor, state.xsnowIndex);
  }

  function toggleInline(tagName) {
    const w = state.xsnowWords && state.xsnowWords[state.xsnowIndex];
    if (!w) return;
    const el = w.startContainer.nodeType === 1 ? w.startContainer : w.startContainer.parentElement;
    // If the current word is already wrapped in this tag, unwrap it (toggle off).
    if (el && el.tagName === tagName.toUpperCase() && el.textContent.trim() === w.text.trim()) {
      el.replaceWith(document.createTextNode(el.textContent));
      state.xsnowWords = collectWordRanges(content);
      state.xsnowIndex = Math.min(state.xsnowIndex, state.xsnowWords.length - 1);
      state.xsnowAnchor = Math.min(state.xsnowAnchor, state.xsnowWords.length - 1);
      if (state.xsnowIndex >= 0) selectRange(state.xsnowAnchor, state.xsnowIndex);
      return;
    }
    wrapSelection(tagName);
  }

  function lookupWord(type) {
    if (!state.xsnowWords || !state.xsnowWords.length) return;
    const lo = Math.min(state.xsnowAnchor, state.xsnowIndex);
    const hi = Math.max(state.xsnowAnchor, state.xsnowIndex);
    const cur = state.xsnowWords[state.xsnowIndex];
    if (!cur) return;
    let text;
    if (type === "translate") {
      text = state.xsnowWords.slice(lo, hi + 1).map((w) => w.text).join(" ");
    } else {
      text = cur.text;
    }
    state.selectedText = text;
    state.selRect = wordRect(cur);
    doLookup(type);
  }

  function toggleLookup(type) {
    const card = overlay.querySelector(".lr-card");
    if (state.cardType === type && card && card.style.display === "block") {
      card.style.display = "none";
      state.cardType = null;
      return;
    }
    state.cardType = type;
    lookupWord(type);
  }

  function handleKey(e) {
    if (e.key === "Escape" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (state.xsnow) { e.preventDefault(); deactivateXSnow(); }
      else { toggleReader(false); }
      return;
    }
    if (!state.xsnow) return;
    // Let browser shortcuts (Ctrl / Meta / Alt) pass through untouched.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) return;
    const k = e.key;
    if (k === "Enter") {
      e.preventDefault();
      openLinkUnderCursor();
      return;
    }
    if (k === "ArrowRight" || k === "ArrowLeft" || k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      if (!state.xsnowWords || !state.xsnowWords.length) return;
      if (k === "ArrowRight") setXsnowIndex(Math.min(state.xsnowIndex + 1, state.xsnowWords.length - 1), e.shiftKey);
      else if (k === "ArrowLeft") setXsnowIndex(Math.max(0, state.xsnowIndex - 1), e.shiftKey);
      else if (k === "ArrowDown") moveVertical(1, e.shiftKey);
      else if (k === "ArrowUp") moveVertical(-1, e.shiftKey);
      return;
    }
    const code = e.code || "";
    if (code === "KeyY") { e.preventDefault(); highlightWord("#ffe08a"); }
    else if (code === "KeyU") { e.preventDefault(); highlightWord("#aad4ff"); }
    else if (code === "KeyI") { e.preventDefault(); highlightWord("#ffb6d9"); }
    else if (code === "KeyQ") { e.preventDefault(); toggleLookup("translate"); }
    else if (code === "KeyW") { e.preventDefault(); toggleLookup("wiki"); }
    else if (code === "KeyE") { e.preventDefault(); toggleLookup("dictionary"); }
    else if (code === "KeyA") { e.preventDefault(); setFontSize(-1); }
    else if (code === "KeyD") { e.preventDefault(); setFontSize(1); }
    else if (code === "KeyR") { e.preventDefault(); toggleBionic(); }
    else if (code === "KeyT") { e.preventDefault(); toggleSpotlight(); }
    else if (code === "KeyJ") { e.preventDefault(); toggleInline("strong"); }
    else if (code === "KeyK") { e.preventDefault(); toggleInline("em"); }
  }

  // ---- Lookup: dictionary / Wikipedia / translate ----

  function bgFetch(url, opts) {
    return new Promise((resolve, reject) => {
      try {
        const msg = Object.assign({ type: "lireader-fetch", url }, opts || {});
        chrome.runtime.sendMessage(msg, (resp) => {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          if (resp && resp.ok) resolve(resp.text);
          else if (resp && resp.status) reject(new Error("HTTP " + resp.status));
          else reject(new Error((resp && resp.error) || "fetch failed"));
        });
      } catch (e) { reject(e); }
    });
  }

  function getCache(key) {
    return new Promise((resolve) => {
      try { chrome.storage.local.get(key, (r) => resolve(r && r[key])); }
      catch (e) { resolve(null); }
    });
  }
  function setCache(key, val) {
    try { chrome.storage.local.set({ [key]: val }); } catch (e) { /* ignore */ }
  }

  function renderDictionaryCard(data) {
    const e = data && data[0];
    if (!e) return '<div class="lr-card-empty">No definition found.</div>';
    const ph = e.phonetic || ((e.phonetics || []).find((p) => p.text) || {}).text || "";
    let html = '<div class="lr-card-title">' + escapeHtml(e.word) + "</div>";
    if (ph) html += '<div class="lr-card-phonetic">' + escapeHtml(ph) + "</div>";
    (e.meanings || []).slice(0, 2).forEach((m) => {
      html += '<div class="lr-card-pos">' + escapeHtml(m.partOfSpeech) + "</div>";
      (m.definitions || []).slice(0, 3).forEach((d) => {
        html += '<div class="lr-card-def">' + escapeHtml(d.definition) + "</div>";
        if (d.example) html += '<div class="lr-card-example">“' + escapeHtml(d.example) + "”</div>";
      });
    });
    return html;
  }

  function renderWiktionaryCard(word, extract) {
    // Try to surface the IPA pronunciation line if Wiktionary includes one.
    const ipaMatch = extract.match(/\/[^\/\n]{2,40}\//);
    const ipa = ipaMatch ? ipaMatch[0] : "";
    const all = extract.split(/\s+/);
    const body = all.slice(0, 500).join(" ");
    let html = '<div class="lr-card-title">' + escapeHtml(word) + "</div>";
    if (ipa) html += '<div class="lr-card-phonetic">' + escapeHtml(ipa) + "</div>";
    html += '<div class="lr-card-pos">Wiktionary</div>' +
      '<div class="lr-card-body">' + escapeHtml(body) + (all.length > 500 ? "…" : "") + "</div>";
    return html;
  }

  function renderDatamuseCard(word, data) {
    const e = data && data[0];
    if (!e || !(e.defs && e.defs.length)) {
      return '<div class="lr-card-empty">No definition found for “' + escapeHtml(word) + '”.</div>';
    }
    let html = '<div class="lr-card-title">' + escapeHtml(e.word || word) + "</div>";
    html += '<div class="lr-card-pos">Datamuse</div>';
    e.defs.slice(0, 6).forEach((d) => {
      const tab = d.indexOf("\t");
      const pos = tab > -1 ? d.slice(0, tab) : "";
      const def = tab > -1 ? d.slice(tab + 1) : d;
      if (pos) html += '<div class="lr-card-pos">' + escapeHtml(pos) + "</div>";
      html += '<div class="lr-card-def">' + escapeHtml(def) + "</div>";
    });
    return html;
  }

  async function doDictionary(word) {
    // Use a clean single token (strip selection punctuation and extra words).
    const clean = (word.match(/[A-Za-z][A-Za-z'-]*/) || [word])[0];
    const engine = state.dictEngine || "freedictionary";
    try {
      if (engine === "freedictionary") {
        const url = "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(clean);
        return renderDictionaryCard(JSON.parse(await bgFetch(url, { timeout: 0 })));
      }
      if (engine === "wiktionary") {
        const url = "https://en.wiktionary.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&origin=*&titles=" + encodeURIComponent(clean);
        const data = JSON.parse(await bgFetch(url, { timeout: 0 }));
        const pages = data && data.query && data.query.pages;
        const page = pages && Object.values(pages)[0];
        if (page && page.extract && !page.missing) return renderWiktionaryCard(clean, page.extract);
        return '<div class="lr-card-empty">No definition found for “' + escapeHtml(clean) + '”.</div>';
      }
      if (engine === "datamuse") {
        const url = "https://api.datamuse.com/words?sp=" + encodeURIComponent(clean) + "&md=d&max=1";
        const data = JSON.parse(await bgFetch(url, { timeout: 0 }));
        return renderDatamuseCard(clean, data);
      }
      return '<div class="lr-card-empty">Unknown dictionary engine.</div>';
    } catch (err) {
      return '<div class="lr-card-empty">Lookup failed: ' + escapeHtml(String((err && err.message) || err)) + "</div>";
    }
  }

  function renderWikiCard(data) {
    const pages = data && data.query && data.query.pages;
    const page = pages && Object.values(pages)[0];
    if (!page || page.missing) return '<div class="lr-card-empty">No Wikipedia article found.</div>';
    let html = '<div class="lr-card-title">' + escapeHtml(page.title) + "</div>";
    if (page.thumbnail && page.thumbnail.source) {
      html += '<img class="lr-card-thumb" src="' + escapeHtml(page.thumbnail.source) + '" alt="">';
    }
    const words = (page.extract || "").trim().split(/\s+/);
    const body = words.slice(0, 500).join(" ");
    html += '<div class="lr-card-body">' + escapeHtml(body) + (words.length > 500 ? "…" : "") + "</div>";
    html += '<a class="lr-card-link" target="_blank" rel="noopener" href="https://en.wikipedia.org/wiki/' +
      encodeURIComponent(page.title) + '">Open in Wikipedia →</a>';
    return html;
  }

  function renderTranslateCard(text, source) {
    if (!text) return '<div class="lr-card-empty">Translation failed.</div>';
    return '<div class="lr-card-title">Translate</div>' +
      '<div class="lr-card-source">' + escapeHtml(source) + "</div>" +
      '<div class="lr-card-translated">' + escapeHtml(text) + "</div>";
  }

  function setCard(html) {
    const card = overlay.querySelector(".lr-card");
    card.innerHTML = html + '<button class="lr-card-close" title="Close">✕</button>';
    positionCard();
    card.style.display = "block";
  }

  function showCard(html) {
    setCard(html);
  }

  function showCardLoading(word) {
    setCard(
      '<div class="lr-card-title">' + escapeHtml(word) + "</div>" +
      '<div class="lr-card-loading"><span class="lr-spinner"></span> Loading…</div>'
    );
  }

  function positionCard() {
    const card = overlay.querySelector(".lr-card");
    const r = state.selRect;
    const w = 380;
    let left, top;
    if (r) {
      left = Math.min(r.left, window.innerWidth - w - 16);
      top = r.bottom + 10;
      if (top + 320 > window.innerHeight) top = Math.max(8, r.top - 330);
    } else {
      left = Math.max(8, (window.innerWidth - w) / 2);
      top = Math.max(8, window.innerHeight * 0.25);
    }
    card.style.left = Math.max(8, left) + "px";
    card.style.top = top + "px";
  }

  async function doLookup(type) {
    const word = (state.selectedText || "").trim();
    if (!word) return;
    const key = "lrlookup:" + type +
      (type === "dictionary" ? ":" + (state.dictEngine || "freedictionary") : "") +
      ":" + word.toLowerCase();
    // Cached results render instantly — no spinner.
    const cached = await getCache(key);
    if (cached) { showCard(cached); return; }
    showCardLoading(word);
    try {
      let html;
      if (type === "dictionary") {
        html = await doDictionary(word);
      } else if (type === "wiki") {
        const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts%7Cpageimages&exintro=1&explaintext=1&redirects=1&piprop=thumbnail&pithumbsize=220&origin=*&titles=" + encodeURIComponent(word);
        html = renderWikiCard(JSON.parse(await bgFetch(url)));
      } else if (type === "translate") {
        html = await doTranslate(word);
      }
      if (html && html.indexOf("lr-card-empty") === -1 && html.length < 8000) setCache(key, html);
      showCard(html || '<div class="lr-card-empty">Nothing found.</div>');
    } catch (err) {
      showCard('<div class="lr-card-empty">Lookup failed: ' + escapeHtml(String((err && err.message) || err)) + "</div>");
    }
  }

  const LINGVA_BASE = "https://lingva.ml/api/v1";

  // Canonical language id → engine-specific code.
  const ENGINE_LANGS = {
    microsoft: { "zh-Hans": "zh-Hans", "zh-Hant": "zh-Hant", ja: "ja", ko: "ko", fr: "fr", de: "de", es: "es" },
    google:    { "zh-Hans": "zh-CN", "zh-Hant": "zh-TW", ja: "ja", ko: "ko", fr: "fr", de: "de", es: "es" },
    lingva:    { "zh-Hans": "zh", "zh-Hant": "zh_HANT", ja: "ja", ko: "ko", fr: "fr", de: "de", es: "es" },
  };

  function engineLang(engine, lang) {
    const m = ENGINE_LANGS[engine] || {};
    return m[lang] || lang;
  }

  async function translateViaGoogle(word, tl) {
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
      encodeURIComponent(tl) + "&dt=t&q=" + encodeURIComponent(word);
    const data = JSON.parse(await bgFetch(url));
    const t = Array.isArray(data && data[0]) ? data[0].map((seg) => seg && seg[0]).join("") : "";
    return renderTranslateCard(t, word);
  }

  async function doTranslate(word) {
    const engine = state.translateEngine || "microsoft";
    const tl = engineLang(engine, state.translateTo);
    if (engine === "microsoft") {
      if (!state.msKey) {
        // No key configured — fall back to Google so translate always works.
        return translateViaGoogle(word, engineLang("google", state.translateTo));
      }
      try {
        const url = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=" + encodeURIComponent(tl);
        const data = JSON.parse(await bgFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": state.msKey,
          },
          body: JSON.stringify([{ Text: word }]),
        }));
        const t = data && data[0] && data[0].translations && data[0].translations[0] && data[0].translations[0].text;
        return renderTranslateCard(t, word);
      } catch (e) {
        // Microsoft failed (e.g. region-scoped key) — fall back to Google.
        return translateViaGoogle(word, engineLang("google", state.translateTo));
      }
    }
    if (engine === "google") return translateViaGoogle(word, tl);
    if (engine === "lingva") {
      const url = LINGVA_BASE + "/auto/" + encodeURIComponent(tl) + "/" + encodeURIComponent(word);
      const data = JSON.parse(await bgFetch(url));
      return renderTranslateCard(data && data.translation, word);
    }
    return '<div class="lr-card-empty">Unknown translation engine.</div>';
  }

  // ---------------------------------------------------------------------------
  // PDF export (linked outline + marks survive Edge's "Save as PDF")
  // ---------------------------------------------------------------------------
  function buildPrintHTML() {
    const heads = state.blocks.filter((b) => b.type === "h");
    const ids = computeHeadingIds();
    const items = heads.map((h, i) =>
      `<li><a href="#${ids[i]}">${escapeHtml(h.text)}</a></li>`).join("");
    const clone = content.cloneNode(true);
    const outlineEl = clone.querySelector(".lr-outline");
    if (outlineEl) outlineEl.remove();
    const bodyHTML = clone.innerHTML;
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(state.title)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.65; margin: 2.2rem; }
  h1.doc-title { font-size: 1.6em; margin-bottom: .4em; }
  .outline { border: 1px solid #bbb; border-radius: 6px; padding: 1rem 1.2rem; margin: 1rem 0 1.6rem; }
  .outline h2 { font-size: 1em; text-transform: uppercase; letter-spacing: .04em; color: #555; margin: 0 0 .5rem; }
  .outline ol { margin: 0; padding-left: 1.4rem; }
  .outline a { color: #0645ad; text-decoration: none; }
  .content h2 { font-size: 1.25em; margin-top: 1.6em; }
  .content h3 { font-size: 1.1em; margin-top: 1.3em; }
  .content h4 { font-size: 1em; }
  .content p { margin: 0 0 1em; }
  mark { color: inherit; padding: 0 1px; }
  sup.lr-cite, sub.lr-cite { font-size: .68em; color: #3b6fc0; }
  a.lr-cite-link { color: #3b6fc0; text-decoration: none; }
  @page { margin: 2cm; }
</style></head>
<body>
<h1 class="doc-title">${escapeHtml(state.title)}</h1>
<div class="outline"><h2>Outline</h2><ol>${items}</ol></div>
<hr>
<div class="content">${bodyHTML}</div>
<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 150); });<\/script>
</body></html>`;
  }

  function exportPDF() {
    const w = window.open("", "_blank");
    if (!w) { alert("Popup blocked. Please allow popups for this site to save the PDF."); return; }
    w.document.open();
    w.document.write(buildPrintHTML());
    w.document.close();
  }

  // ---------------------------------------------------------------------------
  // Settings + toggle
  // ---------------------------------------------------------------------------
  function saveSettings() {
    try {
      chrome.storage && chrome.storage.local && chrome.storage.local.set({
        lireader: {
          fontSize: state.fontSize,
          fontFamily: state.fontFamily,
          margin: state.margin,
          translateTo: state.translateTo,
          translateEngine: state.translateEngine,
          dictEngine: state.dictEngine,
          msKey: state.msKey,
        },
      });
    } catch (e) { /* storage unavailable */ }
  }

  function loadSettings() {
    try {
      chrome.storage && chrome.storage.local && chrome.storage.local.get("lireader", (r) => {
        if (r && r.lireader) {
          state.fontSize = r.lireader.fontSize || 20;
          state.fontFamily = r.lireader.fontFamily || "serif";
          state.margin = (typeof r.lireader.margin === "number") ? r.lireader.margin : 75;
          state.translateTo = r.lireader.translateTo || "zh-Hans";
          state.translateEngine = r.lireader.translateEngine || "microsoft";
          state.dictEngine = r.lireader.dictEngine || "freedictionary";
          state.msKey = r.lireader.msKey || "";
        }
      });
    } catch (e) { /* storage unavailable */ }
  }

  function toggleReader(force) {
    const show = force !== undefined ? force : !(overlay && overlay.style.display === "flex");
    if (show) {
      const o = ensureOverlay();
      const art = extractArticle();
      state.title = art.title;
      state.blocks = art.blocks;
      if (state.blocks.length === 0) {
        state.blocks = [{ type: "p", text: "(No readable article text found on this page. If this is a full-text article, refresh the page and try again.)" }];
      }
      o.style.display = "flex";
      o.querySelector("[data-act='bionic']").classList.toggle("active", state.bionic);
      o.querySelector("[data-act='spotlight']").classList.toggle("active", state.spotlight);
      o.querySelector(".lr-reading-line").style.display = state.spotlight ? "block" : "none";
      applyFont();
      applyMargin();
      applySettingsUI();
      switchTab(state.tab);
      renderContent();
    } else if (overlay) {
      overlay.style.display = "none";
      hideSelectionBar();
      if (state.xsnow) deactivateXSnow();
      const card = overlay.querySelector(".lr-card");
      if (card) { card.style.display = "none"; state.cardType = null; }
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "toggle-reader") {
      toggleReader();
      sendResponse({ ok: true });
    }
  });

  loadSettings();
})();

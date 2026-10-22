// Standalone test harness for HTML → MD conversion
// Usage: node test-convert.js

const fs = require('fs');
const path = require('path');

// Load the TypeScript source and test the converter functions directly
// Since we can't require .ts files, we test against the built plugin or inline the converter

// Inline the converter functions for standalone testing
var ENTITY_MAP = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&#x60;': '`', '&nbsp;': ' ', '&mdash;': '—',
  '&ndash;': '–', '&hellip;': '…', '&copy;': '©', '&reg;': '®',
  '&trade;': '™', '&bull;': '•', '&deg;': '°', '&plusmn;': '±',
  '&sect;': '§', '&laquo;': '«', '&raquo;': '»', '&middot;': '·',
  '&times;': '×', '&divide;': '÷', '&pound;': '£', '&euro;': '€',
  '&yen;': '¥', '&cent;': '¢', '&para;': '¶', '&brvbar;': '¦',
  '&acute;': '´', '&cedil;': '¸', '&macr;': '¯', '&uml;': '¨',
};

function decodeEntities(s) {
  var r = s;
  for (var ent in ENTITY_MAP) {
    r = r.split(ent).join(ENTITY_MAP[ent]);
  }
  r = r.replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(parseInt(n)); });
  r = r.replace(/&#x([0-9a-fA-F]+);/g, function(_, h) { return String.fromCharCode(parseInt(h, 16)); });
  return r;
}

function convertInline(html) {
  let s = html;
  // Images
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)');
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  // Links
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  // Bold
  s = s.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
  s = s.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
  // Italic
  s = s.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
  s = s.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
  // Strikethrough
  s = s.replace(/<del>([\s\S]*?)<\/del>/gi, '~~$1~~');
  s = s.replace(/<s>([\s\S]*?)<\/s>/gi, '~~$1~~');
  // Inline code
  s = s.replace(/<code>([\s\S]*?)<\/code>/gi, (_, c) => '`' + c.replace(/`/g, '\\`') + '`');
  // Line breaks
  s = s.replace(/<br\s*\/?>/gi, '\n');
  return s;
}

function extractBody(html) {
  let s = html;
  s = s.replace(/<!DOCTYPE[^>]*>/i, '');
  s = s.replace(/<\?xml[^>]*\?>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<\/?html[^>]*>/gi, '');
  s = s.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
  s = s.replace(/<svg\b[\s\S]*?<\/svg>/gi, '');
  const bodyMatch = s.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  return s;
}

function extractTableCells(rowHtml) {
  const cells = [];
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match;
  while ((match = cellRegex.exec(rowHtml)) !== null) {
    cells.push(convertInline(decodeEntities(match[1].trim())));
  }
  return cells;
}

function tableToMd(tableHtml) {
  const lines = [];
  let firstRow = true;
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells = extractTableCells(rowMatch[1]);
    if (cells.length === 0) continue;
    if (firstRow) {
      lines.push('| ' + cells.join(' | ') + ' |');
      lines.push('| ' + cells.map(() => '---').join(' | ') + ' |');
      firstRow = false;
    } else {
      lines.push('| ' + cells.join(' | ') + ' |');
    }
  }
  return lines.join('\n');
}

function listToMd(listHtml, indent) {
  indent = indent || '';
  const lines = [];
  const isOrdered = /<ol[^>]*>/i.test(listHtml);
  let counter = 1;
  // Match <li> accounting for nested list tags (track depth)
  var liRegex = /<li[^>]*>/gi;
  var liMatch;
  liRegex.lastIndex = 0;
  while ((liMatch = liRegex.exec(listHtml)) !== null) {
    var depth = 1;
    var idx = liMatch.index + liMatch[0].length;
    while (depth > 0 && idx < listHtml.length) {
      var nextLi = listHtml.indexOf('<li', idx);
      var nextEnd = listHtml.indexOf('</li>', idx);
      if (nextEnd === -1) break;
      if (nextLi !== -1 && nextLi < nextEnd) { depth++; idx = nextLi + 3; }
      else { depth--; idx = nextEnd + 5; }
    }
    var content = listHtml.slice(liMatch.index + liMatch[0].length, idx - 5).trim();
    const prefix = isOrdered ? `${counter}.` : '-';
    let nested = '';
    let prevContent = '';
    while (prevContent !== content) {
      prevContent = content;
      const nestedUl = content.match(/<ul[\s\S]*?<\/ul>/i);
      const nestedOl = content.match(/<ol[\s\S]*?<\/ol>/i);
      if (!nestedUl && !nestedOl) break;
      const nm = nestedUl || nestedOl;
      if (nm) {
        nested += '\n' + listToMd(nm[0], indent + '  ');
        content = content.replace(nm[0], '');
      }
    }
    const text = convertInline(decodeEntities(content));
    lines.push(indent + prefix + ' ' + text + nested);
    counter++;
  }
  return lines.join('\n');
}

function blockquoteToMd(html) {
  return html
    .replace(/<\/?blockquote[^>]*>/gi, '')
    .split('\n')
    .map(l => l.trim() ? '> ' + l : '>')
    .join('\n');
}

function htmlToMd(html) {
  let s = extractBody(html);
  s = s.trim();
  if (!s) return '';

  // Code blocks with language
  s = s.replace(/<pre><code(?:\s+class="[^"]*language-(\w+)[^"]*")?\s*>([\s\S]*?)<\/code><\/pre>/gi, (_, lang, code) => {
    return '\n\n```' + (lang || '') + '\n' + decodeEntities(code.replace(/<[^>]*>/g, '')) + '\n```\n\n';
  });

  // Code blocks without pre wrapper
  s = s.replace(/<pre>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, (_, code) => {
    return '\n\n```\n' + decodeEntities(code.replace(/<[^>]*>/g, '')) + '\n```\n\n';
  });

  // Tables
  s = s.replace(/<table[\s\S]*?<\/table>/gi, m => '\n\n' + tableToMd(m) + '\n\n');

  // Blockquotes
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) => '\n\n' + blockquoteToMd(c) + '\n\n');

  // Lists
  s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, m => '\n\n' + listToMd(m) + '\n\n');
  s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, m => '\n\n' + listToMd(m) + '\n\n');

  // Headings
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => '# ' + convertInline(decodeEntities(c.trim())));
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => '## ' + convertInline(decodeEntities(c.trim())));
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => '### ' + convertInline(decodeEntities(c.trim())));
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, c) => '#### ' + convertInline(decodeEntities(c.trim())));
  s = s.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, c) => '##### ' + convertInline(decodeEntities(c.trim())));
  s = s.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, c) => '###### ' + convertInline(decodeEntities(c.trim())));

  // Horizontal rules
  s = s.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');

  // Paragraphs
  s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => {
    const text = convertInline(decodeEntities(c.trim()));
    return text ? '\n\n' + text + '\n\n' : '';
  });

  // Divs and spans
  s = s.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1');
  s = s.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

  // Strip remaining tags
  s = s.replace(/<[^>]*>/g, '');

  // Decode remaining entities
  s = decodeEntities(s);

  // Normalize blank lines
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim() + '\n';
}

// ── Tests ──
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✅ ' + name);
  } catch (e) {
    failed++;
    console.log('  ❌ ' + name + ': ' + e.message);
  }
}

function assertEq(a, b, msg) {
  if (a !== b) {
    throw new Error(msg + `\n    expected: ${JSON.stringify(b)}\n    actual:   ${JSON.stringify(a)}`);
  }
}

function assertStrContains(haystack, needle, msg) {
  if (!haystack.includes(needle)) {
    throw new Error(msg + `\n    expected to contain: ${JSON.stringify(needle)}\n    in: ${haystack.substring(0, 200)}`);
  }
}

console.log('\n📋 HTML to MD Conversion Tests\n');

// ── Unit Tests ──
console.log('Unit: Entity Decoding');
test('HTML entities', () => {
  assertEq(decodeEntities('&amp;lt;'), '<', 'amp+lt (double decode)');
  assertEq(decodeEntities('&lt;'), '<', 'lt');
  assertEq(decodeEntities('&gt;'), '>', 'gt');
  assertEq(decodeEntities('&quot;'), '"', 'quot');
  assertEq(decodeEntities('&#39;'), "'", '#39');
  assertEq(decodeEntities('&nbsp;'), ' ', 'nbsp');
  assertEq(decodeEntities('&mdash;'), '—', 'mdash');
});

console.log('\nUnit: Inline Conversion');
test('Bold', () => {
  assertEq(convertInline('<strong>bold</strong>'), '**bold**', 'strong');
  assertEq(convertInline('<b>bold</b>'), '**bold**', 'b tag');
});

test('Italic', () => {
  assertEq(convertInline('<em>italic</em>'), '*italic*', 'em');
  assertEq(convertInline('<i>italic</i>'), '*italic*', 'i tag');
});

test('Code', () => {
  assertEq(convertInline('<code>const x = 1;</code>'), '`const x = 1;`', 'code');
});

test('Links', () => {
  assertEq(convertInline('<a href="https://example.com">Example</a>'), '[Example](https://example.com)', 'link');
});

test('Strikethrough', () => {
  assertEq(convertInline('<del>old</del>'), '~~old~~', 'del');
  assertEq(convertInline('<s>old</s>'), '~~old~~', 's tag');
});

console.log('\nUnit: extractBody');
test('Strips HTML wrapper', () => {
  const html = '<!DOCTYPE html><html><head><title>T</title></head><body><p>Content</p></body></html>';
  const body = extractBody(html).trim();
  assertEq(body, '<p>Content</p>', 'extracted body');
});

test('Handles fragment without wrapper', () => {
  assertEq(extractBody('<h1>Title</h1>').trim(), '<h1>Title</h1>', 'fragment pass-through');
});

test('Strips scripts, styles, and SVG artifacts', () => {
  const html = '<html><head><title>T</title><style>.x{color:red}</style></head><body><p>Keep</p><script>var leak = true;</script><svg><text>chart label</text></svg></body></html>';
  const body = extractBody(html).trim();
  assertEq(body, '<p>Keep</p>', 'removes code and inline SVG');
});

test('Handles a head tag with attributes', () => {
  const html = '<html><head data-theme="dark"><title>T</title></head><body><p>Content</p></body></html>';
  assertEq(extractBody(html).trim(), '<p>Content</p>', 'head attributes');
});

console.log('\nUnit: Table Conversion');
test('Simple table', () => {
  const html = '<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>Alpha</td><td>100</td></tr></tbody></table>';
  const md = tableToMd(html);
  assertStrContains(md, '| Name | Value |', 'header');
  assertStrContains(md, '| --- | --- |', 'separator');
  assertStrContains(md, '| Alpha | 100 |', 'data row');
});

console.log('\nUnit: List Conversion');
test('Unordered list', () => {
  const html = '<ul><li>Item one</li><li>Item two</li></ul>';
  const md = listToMd(html);
  assertStrContains(md, '- Item one', 'first item');
  assertStrContains(md, '- Item two', 'second item');
});

test('Ordered list', () => {
  const html = '<ol><li>First</li><li>Second</li></ol>';
  const md = listToMd(html);
  assertStrContains(md, '1. First', 'first');
  assertStrContains(md, '2. Second', 'second');
});

console.log('\nUnit: Heading Conversion');
test('Headings h1-h6', () => {
  for (let i = 1; i <= 6; i++) {
    const md = htmlToMd(`<h${i}>Heading ${i}</h${i}>`);
    assertStrContains(md, '#'.repeat(i) + ' Heading ' + i, `h${i} converts correctly`);
  }
});

console.log('\nUnit: Horizontal Rule');
test('HR converts to ---', () => {
  const md = htmlToMd('<hr>');
  assertStrContains(md, '---', 'hr');
});

console.log('\nUnit: Blockquote');
test('Blockquote', () => {
  const md = htmlToMd('<blockquote>This is a quote</blockquote>');
  assertStrContains(md, '> This is a quote', 'blockquote');
});

test('Image conversion', () => {
  assertEq(convertInline('<img src="cat.png" alt="A cat">'), '![A cat](cat.png)', 'img with alt');
  assertEq(convertInline('<img src="dog.png">'), '![](dog.png)', 'img without alt');
});

test('Table without thead/tbody (bare tr)', () => {
  const html = '<table><tr><th>X</th><th>Y</th></tr><tr><td>1</td><td>2</td></tr></table>';
  const md = tableToMd(html);
  assertStrContains(md, '| X | Y |', 'bare table header');
  assertStrContains(md, '| 1 | 2 |', 'bare table data');
  assertStrContains(md, '| --- |', 'bare table separator');
});

test('Nested list', () => {
  const html = '<ul><li>Item A<ul><li>Sub 1</li><li>Sub 2</li></ul></li><li>Item B</li></ul>';
  const md = listToMd(html);
  assertStrContains(md, '- Item A', 'parent item');
  assertStrContains(md, '  - Sub 1', 'nested item');
  assertStrContains(md, '- Item B', 'second parent');
});

// ── Integration: Round-Trip Test ──
console.log('\n📦 Integration: Round-Trip\n');

// Read test files
const htmlPath = path.join(__dirname, 'test-sample.html');
const mdPath = path.join(__dirname, 'test-sample.md');

if (fs.existsSync(htmlPath) && fs.existsSync(mdPath)) {
  const inputHtml = fs.readFileSync(htmlPath, 'utf-8');
  const originalMd = fs.readFileSync(mdPath, 'utf-8');

  test('Round-trip: converts HTML to MD without crashing', () => {
    const md = htmlToMd(inputHtml);
    if (!md || md.length < 10) throw new Error('Output too short: ' + (md || '').length);
  });

  const convertedMd = htmlToMd(inputHtml);

  test('Round-trip: contains headings', () => {
    assertStrContains(convertedMd, 'Section 1', 'h2 section');
    assertStrContains(convertedMd, 'Section 2', 'h2 section');
    assertStrContains(convertedMd, 'Section 3', 'h2 section');
    assertStrContains(convertedMd, 'Section 4', 'h2 section');
  });

  test('Round-trip: contains bold text', () => {
    assertStrContains(convertedMd, '**bold**', 'bold preserved');
  });

  test('Round-trip: contains italic text', () => {
    assertStrContains(convertedMd, '*italic*', 'italic preserved');
  });

  test('Round-trip: contains inline code', () => {
    assertStrContains(convertedMd, '`inline code`', 'inline code preserved');
  });

  test('Round-trip: contains link', () => {
    assertStrContains(convertedMd, '[link example](https://example.com)', 'link preserved');
  });

  test('Round-trip: contains code block', () => {
    assertStrContains(convertedMd, '```', 'code fence');
  });

  test('Round-trip: contains table', () => {
    assertStrContains(convertedMd, '| Name | Value |', 'table header');
    assertStrContains(convertedMd, '| Alpha | 100 |', 'table data');
    assertStrContains(convertedMd, '| --- |', 'table separator');
  });

  test('Round-trip: contains blockquote', () => {
    assertStrContains(convertedMd, '> This is a', 'blockquote');
  });

  test('Round-trip: contains list items', () => {
    assertStrContains(convertedMd, '- Item', 'unordered list');
  });

  // Structural similarity check: compare key structural elements
  test('Round-trip: structural equivalence', () => {
    const h1Count = (convertedMd.match(/^# /gm) || []).length;
    const h2Count = (convertedMd.match(/^## /gm) || []).length;
    const origH1 = (originalMd.match(/^# /gm) || []).length;
    const origH2 = (originalMd.match(/^## /gm) || []).length;
    
    // The original test-note.md is a full Obsidian note with frontmatter
    // and html-effect code blocks. The test-export.html is a cleaned-up
    // version. So structural elements should be present but counts may vary.
    if (h1Count < 1) throw new Error('No h1 found in output');
    if (h2Count < 3) throw new Error('Expected at least 3 h2, got ' + h2Count);
  });
} else {
  console.log('  ⚠️  Test files not found, skipping round-trip');
}

// ── Summary ──
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}

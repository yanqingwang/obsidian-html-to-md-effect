import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, Platform } from 'obsidian';

// ── HTML Entity Decoding ──
const ENTITY_MAP: Record<string, string> = {
	'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
	'&#39;': "'", '&#x60;': '`', '&nbsp;': ' ', '&mdash;': '—',
	'&ndash;': '–', '&hellip;': '…', '&copy;': '©', '&reg;': '®',
	'&trade;': '™', '&bull;': '•', '&deg;': '°', '&plusmn;': '±',
	'&sect;': '§', '&laquo;': '«', '&raquo;': '»', '&middot;': '·',
	'&times;': '×', '&divide;': '÷', '&pound;': '£', '&euro;': '€',
	'&yen;': '¥', '&cent;': '¢', '&para;': '¶', '&brvbar;': '¦',
	'&acute;': '´', '&cedil;': '¸', '&macr;': '¯', '&uml;': '¨',
};

function decodeEntities(s: string): string {
	let r = s;
	for (const [ent, ch] of Object.entries(ENTITY_MAP)) {
		r = r.replace(new RegExp(ent.replace('&', '&'), 'g'), ch);
	}
	r = r.replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n)));
	r = r.replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
	return r;
}

// ── Inline Conversion ──
function convertInline(html: string): string {
	let s = html;
	// Images first (before links, since ![] is a subset of [])
	s = s.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
	s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)');
	s = s.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
	// Links
	s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
	// Bold/strong
	s = s.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
	s = s.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
	// Italic/emphasis
	s = s.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
	s = s.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
	// Strikethrough
	s = s.replace(/<del>([\s\S]*?)<\/del>/gi, '~~$1~~');
	s = s.replace(/<s>([\s\S]*?)<\/s>/gi, '~~$1~~');
	// Inline code
	s = s.replace(/<code>([\s\S]*?)<\/code>/gi, (_m, c) => '`' + c.replace(/`/g, '\\`') + '`');
	// Line breaks
	s = s.replace(/<br\s*\/?>/gi, '\n');
	return s;
}

// ── Extract Body ──
function extractBody(html: string): string {
	let s = html;
	// Remove DOCTYPE
	s = s.replace(/<!DOCTYPE[^>]*>/i, '');
	// Remove XML declarations
	s = s.replace(/<\?xml[^>]*\?>/gi, '');
	// Remove <!-- comments -->
	s = s.replace(/<!--[\s\S]*?-->/g, '');
	// Remove <html> and </html>
	s = s.replace(/<\/?html[^>]*>/gi, '');
	// Remove <head>...</head>
	s = s.replace(/<head>[\s\S]*?<\/head>/gi, '');
	// Extract body content
	const bodyMatch = s.match(/<body[^>]*>([\s\S]*)<\/body>/i);
	if (bodyMatch) return bodyMatch[1];
	return s;
}

// ── Table Conversion ──
function tableToMd(tableHtml: string): string {
	const lines: string[] = [];
	let firstRow = true;

	// Parse all <tr> rows (handle both wrapped in thead/tbody and bare)
	const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
	let rowMatch: RegExpExecArray | null;
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

function extractTableCells(rowHtml: string): string[] {
	const cells: string[] = [];
	const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
	let match: RegExpExecArray | null;
	while ((match = cellRegex.exec(rowHtml)) !== null) {
		cells.push(convertInline(decodeEntities(match[1].trim())));
	}
	return cells;
}

// ── List Conversion ──
function listToMd(listHtml: string, indent: string = ''): string {
	const lines: string[] = [];
	const isOrdered = /<ol[^>]*>/i.test(listHtml);
	let counter = 1;
	// Match <li> accounting for nested list tags (track depth)
	const itemRegex = /<li[^>]*>/gi;
	const endRegex = /<\/li>/gi;
	let liMatch: RegExpExecArray | null;
	let prevIdx = 0;
	itemRegex.lastIndex = 0;
	while ((liMatch = itemRegex.exec(listHtml)) !== null) {
		let depth = 1;
		let idx = liMatch.index + liMatch[0].length;
		// Find matching </li> accounting for nested <li> tags
		while (depth > 0 && idx < listHtml.length) {
			const nextLi = listHtml.indexOf('<li', idx);
			const nextEnd = listHtml.indexOf('</li>', idx);
			if (nextEnd === -1) break;
			if (nextLi !== -1 && nextLi < nextEnd) {
				depth++;
				idx = nextLi + 3;
			} else {
				depth--;
				idx = nextEnd + 5;
			}
		}
		let content = listHtml.slice(liMatch.index + liMatch[0].length, idx - 5).trim();
		const prefix = isOrdered ? `${counter}.` : '-';
		// Check for nested lists (handle all occurrences)
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
		const text = convertInline(decodeEntities(content.trim()));
		lines.push(indent + prefix + ' ' + text + nested);
		counter++;
	}
	return lines.join('\n');
}

// ── Blockquote Conversion ──
function blockquoteToMd(html: string): string {
	return html
		.replace(/<\/?blockquote[^>]*>/gi, '')
		.split('\n')
		.map(l => l.trim() ? '> ' + l : '>')
		.join('\n');
}

// ── Main HTML → MD Conversion ──
function htmlToMd(html: string): string {
	let s = extractBody(html);
	s = s.trim();
	if (!s) return '';

	// Handle code blocks first (they contain other HTML-like content)
	s = s.replace(/<pre><code(?:\s+class="[^"]*language-([^"]+)[^"]*")?\s*>([\s\S]*?)<\/code><\/pre>/gi, (_m, lang, code) => {
		const fence = '```' + (lang || '') + '\n' + decodeEntities(code.replace(/<[^>]*>/g, '')) + '\n```';
		return '\n\n' + fence + '\n\n';
	});

	// Code blocks without pre wrapper (just <code> in <pre>)
	s = s.replace(/<pre>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, (_m, code) => {
		return '\n\n```\n' + decodeEntities(code.replace(/<[^>]*>/g, '')) + '\n```\n\n';
	});

	// Tables
	s = s.replace(/<table[\s\S]*?<\/table>/gi, (m) => {
		return '\n\n' + tableToMd(m) + '\n\n';
	});

	// Blockquotes
	s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, content) => {
		return '\n\n' + blockquoteToMd(content) + '\n\n';
	});

	// Lists (handle nested from inside out)
	s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (m) => '\n\n' + listToMd(m) + '\n\n');
	s = s.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (m) => '\n\n' + listToMd(m) + '\n\n');

	// Headings
	s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, c) => '# ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => '## ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => '### ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, c) => '#### ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_m, c) => '##### ' + convertInline(decodeEntities(c.trim())));
	s = s.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_m, c) => '###### ' + convertInline(decodeEntities(c.trim())));

	// Horizontal rules
	s = s.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');

	// Paragraphs (only if they contain text, not just whitespace)
	s = s.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, c) => {
		const text = convertInline(decodeEntities(c.trim()));
		return text ? '\n\n' + text + '\n\n' : '';
	});

	// Divs and spans (convert inline content, remove tags)
	s = s.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1');
	s = s.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

	// Strip remaining HTML tags
	s = s.replace(/<[^>]*>/g, '');

	// Decode any remaining entities
	s = decodeEntities(s);

	// Normalize multiple blank lines
	s = s.replace(/\n{3,}/g, '\n\n');

	// Trim leading/trailing whitespace
	s = s.trim();

	return s + '\n';
}

// ── Frontmatter helper ──
function buildFrontmatter(title?: string, source?: string): string {
	if (!title) return '';
	return `---\ntitle: "${title.replace(/"/g, '\\"')}"\nsource: "${(source || 'html').replace(/"/g, '\\"')}"\n---\n\n`;
}

// ── Plugin ──
interface HTML2MDSettings {
	overwrite: boolean;
	addFrontmatter: boolean;
}
const DEFAULT_SETTINGS: HTML2MDSettings = { overwrite: false, addFrontmatter: false };

export default class HTML2MDPlugin extends Plugin {
	settings: HTML2MDSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addCommand({
			id: 'convert-html-to-md',
			name: 'Convert HTML file to Markdown',
			checkCallback: (checking: boolean) => {
				const f = this.app.workspace.getActiveFile();
				if (f?.extension === 'html') {
					if (!checking) {
						void this.convertFile(f);
					}
					return true;
				}
				return false;
			}
		});

		this.addCommand({
			id: 'convert-batch-html-to-md',
			name: 'Convert all HTML in folder to Markdown',
			callback: () => void this.convertBatch()
		});

		this.addSettingTab(new HTML2MDSettingTab(this.app, this));
	}

	async convertFile(file: TFile): Promise<void> {
		const content = await this.app.vault.read(file);
		const md = htmlToMd(content);
		const outPath = (file.parent ? file.parent.path + '/' : '') + file.basename + '.md';

		const existing = this.app.vault.getFileByPath(outPath);
		if (existing && !this.settings.overwrite) {
			new Notice('Skipped: ' + outPath + ' (file exists, enable overwrite in settings)');
			return;
		}

		let finalMd = md;
		if (this.settings.addFrontmatter) {
			finalMd = buildFrontmatter(file.basename, file.path) + md;
		}

		if (existing) {
			await this.app.vault.modify(existing, finalMd);
		} else {
			await this.app.vault.create(outPath, finalMd);
		}
		new Notice('Converted: ' + outPath);
	}

	async convertBatch(): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(
			this.app.workspace.getActiveFile()?.parent?.path || '/'
		);
		if (!folder || !('children' in folder)) return;

		const htmlFiles = (folder as unknown as { children: unknown[] }).children.filter(
			(c): c is TFile => c instanceof TFile && c.extension === 'html'
		);
		if (htmlFiles.length === 0) {
			new Notice('No HTML files found in current folder');
			return;
		}

		let count = 0;
		for (const f of htmlFiles) {
			try {
				await this.convertFile(f);
				count++;
			} catch (e) {
				console.error('Failed to convert', f.path, e);
			}
		}
		new Notice(`Converted ${count}/${htmlFiles.length} HTML files`);
	}

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		if (data) {
			Object.assign(this.settings, data);
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

class HTML2MDSettingTab extends PluginSettingTab {
	plugin: HTML2MDPlugin;
	constructor(app: App, plugin: HTML2MDPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'HTML to MD Effectiveness Settings' });

		new Setting(containerEl)
			.setName('Overwrite existing .md files')
			.setDesc('If enabled, will overwrite existing Markdown files with converted content')
			.addToggle(t => t.setValue(this.plugin.settings.overwrite)
				.onChange(async v => { this.plugin.settings.overwrite = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName('Add YAML frontmatter')
			.setDesc('Add title and source metadata to converted files')
			.addToggle(t => t.setValue(this.plugin.settings.addFrontmatter)
				.onChange(async v => { this.plugin.settings.addFrontmatter = v; await this.plugin.saveSettings(); }));
	}
}

// ── Export for testing ──
export { htmlToMd, convertInline, decodeEntities, extractBody, tableToMd, listToMd };

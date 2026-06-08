/**
 * Minimal HTML -> Markdown converter for Zotero note content.
 *
 * Runs in Zotero's JS engine using the global `DOMParser` (no Node built-ins).
 * Highlight / background colors are not representable in plain markdown, so they
 * are dropped while the highlighted text is preserved.
 */

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return convertChildren(doc.body)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function convertChildren(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    out += convertNode(child);
  });
  return out;
}

function convertNode(node: Node): string {
  if (node.nodeType === TEXT_NODE) {
    return (node.textContent || '').replace(/\s+/g, ' ');
  }
  if (node.nodeType !== ELEMENT_NODE) return '';

  const el = node as Element;
  const inner = convertChildren(el);

  switch (el.tagName.toLowerCase()) {
    case 'h1':
      return `\n\n# ${inner}\n\n`;
    case 'h2':
      return `\n\n## ${inner}\n\n`;
    case 'h3':
      return `\n\n### ${inner}\n\n`;
    case 'h4':
      return `\n\n#### ${inner}\n\n`;
    case 'h5':
      return `\n\n##### ${inner}\n\n`;
    case 'h6':
      return `\n\n###### ${inner}\n\n`;
    case 'p':
      return `\n\n${inner}\n\n`;
    case 'br':
      return '\n';
    case 'strong':
    case 'b':
      return inner.trim() ? `**${inner}**` : inner;
    case 'em':
    case 'i':
      return inner.trim() ? `*${inner}*` : inner;
    case 'code':
      return inner.trim() ? `\`${inner}\`` : inner;
    case 'pre':
      return `\n\n\`\`\`\n${inner}\n\`\`\`\n\n`;
    case 'a': {
      const href = el.getAttribute('href');
      return href ? `[${inner}](${href})` : inner;
    }
    case 'ul':
      return `\n\n${convertList(el, false)}\n\n`;
    case 'ol':
      return `\n\n${convertList(el, true)}\n\n`;
    case 'blockquote':
      return `\n\n${inner
        .trim()
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')}\n\n`;
    default:
      return inner;
  }
}

function convertList(listEl: Element, ordered: boolean): string {
  return Array.from(listEl.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((li, index) => {
      const marker = ordered ? `${index + 1}.` : '-';
      const content = convertChildren(li)
        .trim()
        .replace(/\s*\n\s*/g, ' ');
      return `${marker} ${content}`;
    })
    .join('\n');
}

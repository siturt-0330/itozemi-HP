// Shared by the published profile and the unsaved CMS preview.
const memberEscape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
function memberSafeURL(value, image = false) {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (/^https:\/\//i.test(url)) {
    try { const parsed = new URL(url); return parsed.username || parsed.password ? '' : parsed.href; } catch { return ''; }
  }
  if (image && /^(?:\/?assets\/[a-zA-Z0-9._-]+|\/uploads\/[a-zA-Z0-9._-]+)$/.test(url)) return url;
  if (!image && /^(?:\/?[a-z][a-z0-9-]*\.html(?:[?#][a-zA-Z0-9_./?=&%#-]*)?|#[a-zA-Z0-9_-]+|\/)$/i.test(url)) return url;
  return '';
}
function memberLink(url, label, className = '') {
  const href = memberSafeURL(url);
  if (!href) return memberEscape(label || url);
  const external = /^https:\/\//i.test(href);
  return `<a${className ? ` class="${className}"` : ''} href="${memberEscape(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${memberEscape(label || url)}</a>`;
}
function memberInline(text) {
  let html = '', cursor = 0;
  for (const match of String(text || '').matchAll(/https:\/\/[^\s<>"「」『』]+/giu)) {
    const url = match[0].replace(/[、。！？）)\].,!?]+$/u, '');
    html += memberEscape(text.slice(cursor, match.index)) + memberLink(url, url);
    cursor = match.index + url.length;
  }
  return (html + memberEscape(String(text || '').slice(cursor))).replace(/\n/g, '<br>');
}
export function initialMemberBlocks(member) {
  if (Array.isArray(member.blocks)) return structuredClone(member.blocks);
  return member.body ? [{type:'paragraph',text:member.body}] : [];
}
export function renderMemberContent(member) {
  return initialMemberBlocks(member).map(block => {
    if (block.type === 'paragraph') return String(block.text || '').split(/\n\s*\n/).filter(text => text.trim()).map(text => `<p>${memberInline(text)}</p>`).join('');
    if (block.type === 'heading') return block.text ? `<h2>${memberEscape(block.text)}</h2>` : '';
    if (block.type === 'image') {
      const src = memberSafeURL(block.src, true);
      return src ? `<figure class="member-document-photo"><img src="${memberEscape(src)}" alt="${memberEscape(block.alt || member.name || '')}" loading="lazy" decoding="async">${block.caption ? `<figcaption>${memberEscape(block.caption)}</figcaption>` : ''}</figure>` : '';
    }
    if (block.type === 'link') return block.url ? `<p class="member-document-link">${memberLink(block.url, block.label, 'member-document-anchor')}</p>` : '';
    return '';
  }).join('');
}

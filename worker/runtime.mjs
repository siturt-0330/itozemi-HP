import { renderMemberContent } from '../site/member-content.js';
const DOC_KEY = 'cms/content.json';
const DEFAULT_MEMBERS = [{"id": "student-05", "name": "丹治璃空", "image": "assets/member-introductions-grid.jpg", "group": "ゼミ長", "intro": "", "body": "", "tags": [], "status": "published"}, {"id": "student-03", "name": "川口聖也", "image": "assets/member-introductions-grid.jpg", "group": "副ゼミ長", "intro": "", "body": "", "tags": [], "status": "published"}, {"id": "student-01", "name": "齋藤稜太", "image": "assets/member-saito.jpg", "group": "人材開発部長", "intro": "", "body": "", "tags": [], "status": "published"}, {"id": "student-04", "name": "中澤莉胡", "image": "assets/member-nakazawa.jpg", "group": "総務部長", "intro": "", "body": "", "tags": [], "status": "published"}, {"id": "student-02", "name": "吉池心子", "image": "assets/member-yoshiike.jpg", "group": "広報部長", "intro": "", "body": "", "tags": [], "status": "published"}];
const MEMBER_PHOTO_UPDATES = {"student-01": {"name": "齋藤稜太", "image": "assets/member-saito.jpg"}, "student-02": {"name": "吉池心子", "image": "assets/member-yoshiike.jpg"}, "student-04": {"name": "中澤莉胡", "image": "assets/member-nakazawa.jpg"}, "student-03": {"name": "川口聖也", "image": "assets/member-introductions-grid.jpg"}, "student-05": {"name": "丹治璃空", "image": "assets/member-introductions-grid.jpg"}};
const CATEGORIES = { about: 'ゼミ紹介', daily: 'ゼミの日常', join: '入ゼミ案内', awards: '受賞・実績', projects: 'プロジェクト' };
const STATUS = new Set(['draft', 'published']);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lines = value => escape(value).replace(/\n/g, '<br>');
const paragraphs = value => String(value || '').split(/\n\s*\n/).filter(Boolean).map(p => `<p>${lines(p)}</p>`).join('');
const PROJECT_COPY_LINES = new Map(Object.entries({
  "実際の企業が抱える課題に向き合い、新事業などを提案するプロジェクトです": "実際の企業が抱える課題に向き合い\n新事業などを提案するプロジェクトです",
  "企業や地域の方々との対話を通じて、経営戦略やマーケティングの理論を活用していきます": "企業や地域の方々との対話を通じて\n経営戦略やマーケティングの理論を\n活用していきます",
  "自分たちの着想をもとに、新しい事業の開発や起業に挑戦": "自分たちの着想をもとに\n新しい事業の開発や起業に挑戦",
  "ビジネスコンテストなども、構想を磨き、社会へ伝える機会になります": "ビジネスコンテストなども\n構想を磨き社会へ伝える機会になります"
}));
const projectParagraphs = value => String(value || '').split(/。|\n\s*\n/).map(part => part.trim()).filter(Boolean).map(part => `<p>${lines(PROJECT_COPY_LINES.get(part) || part)}</p>`).join('');
const clone = value => structuredClone(value);

function normalizeTerminology(value) {
  const doc = clone(value);
  const migrateMemberProfiles = doc.memberProfileVersion !== 1;
  if (doc.members === undefined) doc.members = clone(DEFAULT_MEMBERS);
  if (Array.isArray(doc.members)) for (const member of doc.members) {
    if (!member || typeof member !== 'object') continue;
    if (member.id === 'student-04' && member.name === '中澤莉子') member.name = '中澤莉胡';
    if (member.id === 'student-03' && member.name === '川口惺也') member.name = '川口聖也';
    const update = MEMBER_PHOTO_UPDATES[member.id];
    if (migrateMemberProfiles && update && member.name === update.name && !member.image) member.image = update.image;
  }
  if (migrateMemberProfiles && Array.isArray(doc.members)) {
    const order = ["student-05", "student-03", "student-01", "student-04", "student-02"];
    doc.members.sort((a,b) => (order.indexOf(a?.id) < 0 ? order.length : order.indexOf(a.id)) - (order.indexOf(b?.id) < 0 ? order.length : order.indexOf(b.id)));
  }
  doc.memberProfileVersion = 1;
  if (doc.memberLeadershipVersion !== 1 && Array.isArray(doc.members)) {
    const roles = {"student-05": "ゼミ長", "student-03": "副ゼミ長", "student-01": "人材開発部長", "student-04": "総務部長", "student-02": "広報部長"};
    for (const member of doc.members) if (roles[member?.id]) member.group = roles[member.id];
  }
  doc.memberLeadershipVersion = 1;
  for (const list of ['slides', 'posts', 'projects']) {
    if (!Array.isArray(doc[list])) continue;
    for (const item of doc[list]) {
      if (!item || typeof item !== 'object') continue;
      if (list === 'posts' && item.id === 'about-ito' && item.date === '2023-07-05' && item.title === '伊藤ゼミの学びとベンチャリング・ラボについて') item.status = 'draft';
      for (const key of ['href', 'link']) if (item[key] === 'people.html#venturing-lab' || item[key] === '/people.html#venturing-lab') item[key] = 'lab.html';
      for (const key of ['title', 'summary', 'body', 'description', 'cta']) {
        if (typeof item[key] === 'string') item[key] = item[key].replaceAll('ビジネスクリエーション', '新規事業立案');
      }
      if (list === 'projects' && item.category === 'BUSINESS CREATION') item.category = 'NEW BUSINESS PLANNING';
      if (list === 'projects') {
        const imagePath = typeof item.image === 'string' ? item.image.replace(/^\//, '') : '';
        if (item.id === 'collaboration' && ['assets/kameda-meeting.jpg', 'assets/projects-2026.png'].includes(imagePath)) item.image = 'assets/masuya-meeting.jpg';
        if (item.id === 'creation' && ['assets/thesis-newface.png', 'assets/projects-2026.png'].includes(imagePath)) item.image = 'assets/open-gate-07.jpg';
      }
      if (list === 'slides') {
        const imagePath = typeof item.image === 'string' ? item.image.replace(/^\//, '') : '';
        if (item.id === 'slide-learning' && imagePath === 'assets/seminar-2026.jpg') item.image = 'assets/kameda-meeting.jpg';
        if (item.id === 'slide-projects' && ['assets/kameda-meeting.jpg', 'assets/company-visit-team.jpg'].includes(imagePath)) item.image = 'assets/masuya-meeting.jpg';
        if (item.title === '企業と、ともに。\nアイデアを、形に。') item.title = '企業と共に\nアイデアを形に';
        if (['企業コラボレーションと、自分たちの事業づくり。', '企業コラボレーションと、新規事業立案。', '理論と実践を往復し、まだない価値をつくる。'].includes(item.description)) item.description = '';
        if (typeof item.description === 'string') item.description = item.description.replaceAll('、', ' ').replaceAll('。', '');
      }
      if (list === 'posts') {
        const copyUpdates = {"ゼミの見学・座談会・オンライン説明会について。最新情報は公式noteでご確認ください。": "ゼミ見学は10月ごろに開催予定です。最新情報は公式Instagramでご確認ください。", "ゼミの学びや雰囲気を知りたい方に向けて、見学や説明会の情報を発信しています。開催日時などの最新情報は公式noteをご覧ください。": "ゼミ見学は10月ごろに開催予定です。日程や見学方法は公式Instagramでご確認ください。", "学年を超えた交流を深める企画としてスポーツ大会を開催しました。当日の様子は公式noteで紹介しています。": "学年を超えた交流を深める企画としてスポーツ大会を開催しました。"};
        for (const key of ['summary', 'body']) if (Object.hasOwn(copyUpdates, item[key])) item[key] = copyUpdates[item[key]];
      }
      if (typeof item.title === 'string') item.title = item.title.replace(/[、。]/g, '');
    }
  }
  if (doc.about && typeof doc.about.body === 'string') doc.about.body = doc.about.body.replaceAll('ビジネスクリエーション', '新規事業立案');
  return doc;
}

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
function text(value, max, label, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, `${label}を確認してください。`);
  return value.trim();
}
function safeURL(value, image = false) {
  const input = text(value ?? '', 2048, image ? '画像URL' : 'リンク');
  if (!input) return '';
  if (/^https:\/\//i.test(input)) { try { const u = new URL(input); if (u.username || u.password) throw 0; return u.href; } catch { fail(400, 'URLを確認してください。'); } }
  if (image && /^(?:\/?assets\/[a-zA-Z0-9._-]+|\/uploads\/[a-zA-Z0-9._-]+)$/.test(input)) return input;
  if (!image && /^(?:\/?[a-z][a-z0-9-]*\.html(?:[?#][a-zA-Z0-9_./?=&%#-]*)?|#[a-zA-Z0-9_-]+|\/)$/i.test(input)) return input;
  fail(400, image ? '画像にはアップロードした画像かHTTPSのURLを指定してください。' : 'リンクにはサイト内ページかHTTPSのURLを指定してください。');
}
function photoSettings(item) {
  const position = value => {
    if (!value) return '';
    if (typeof value !== 'string' || !/^(?:100|[0-9]{1,2})(?:\.[0-9]+)?% (?:100|[0-9]{1,2})(?:\.[0-9]+)?%$/.test(value) || value.split(' ').some(part => parseFloat(part) > 100)) fail(400, '写真の位置は0〜100%で指定してください。');
    return value;
  };
  return { mobileImage: safeURL(item.mobileImage, true), imagePosition: position(item.imagePosition), imagePositionMobile: position(item.imagePositionMobile) };
}
const PHOTO_DIMENSIONS = {"assets/open-gate-05.jpg":[1035,1280],"assets/open-gate-03.jpg":[960,1280],"assets/venturing-exchange-05.jpg":[235,320],"assets/softball-2026.jpg":[1200,900],"assets/projects-2026.png":[1280,1280],"assets/award.jpg":[480,320],"assets/member-nakazawa.jpg":[1045,1045],"assets/open-gate-01.jpg":[1280,960],"assets/open-gate-07.jpg":[1200,798],"assets/open-gate-02.jpg":[960,1280],"assets/seminar-sports-03.jpg":[1280,960],"assets/sports-2026.jpg":[1374,719],"assets/thesis-farewell.jpg":[1200,628],"assets/seminar-interview.jpg":[1108,1477],"assets/seminar-sports-02.jpg":[1280,960],"assets/venturing-exchange-06.jpg":[235,320],"assets/open-gate-06.jpg":[960,1280],"assets/winery-learning.png":[1200,900],"assets/thesis-mgnet.png":[1200,716],"assets/seminar-sports-01.jpg":[1280,960],"assets/company-visit-team.jpg":[1280,670],"assets/open-gate-04.jpg":[960,1280],"assets/seminar-2026.jpg":[1280,670],"assets/thesis-newface.png":[1200,668],"assets/member-introductions-grid.jpg":[1179,1048],"assets/masuya-meeting.jpg":[1200,628],"assets/member-saito.jpg":[892,892],"assets/ito-conversation.jpg":[1000,667],"assets/ito-community.jpg":[1000,667],"assets/presentation.jpg":[480,320],"assets/seminar-sports-05.jpg":[1280,960],"assets/press-interview.jpg":[1200,628],"assets/seminar-sports-04.jpg":[1280,960],"assets/ito-official-logo.jpg":[1179,1165],"assets/member-yoshiike.jpg":[1080,1080],"assets/thesis-masuya.png":[1200,582],"assets/kameda-meeting.jpg":[1200,675],"assets/business-contest-sanjo.jpg":[820,547],"assets/seminar-sports-06.jpg":[960,1280],"assets/ito-introduction.jpg":[1000,418]};
function photoDimensions(src) {
  const size=PHOTO_DIMENSIONS[String(src||'').replace(/^\//,'')];
  return size?` width="${size[0]}" height="${size[1]}"`:'';
}
function photo(item, alt, attrs = '') {
  const asset = String(item.image || '').replace(/^\//, '');
  const dimensions=photoDimensions(item.image);
  const desktop = item.imagePosition || (asset === 'assets/member-nakazawa.jpg' ? '50% 25%' : asset === 'assets/kameda-meeting.jpg' ? '50% 65%' : '50% 50%');
  const mobile = item.imagePositionMobile || (asset === 'assets/masuya-meeting.jpg' ? '100% 50%' : desktop);
  return `<picture class="responsive-photo" style="--photo-position:${escape(desktop)};--photo-position-mobile:${escape(mobile)}">${item.mobileImage ? `<source media="(max-width:760px)" srcset="${escape(item.mobileImage)}">` : ''}<img src="${escape(item.image)}"${dimensions} alt="${escape(alt)}" style="object-position:var(--photo-current-position)" ${attrs}></picture>`;
}
function validateMemberBlocks(blocks) {
  if (blocks === undefined) return undefined;
  if (!Array.isArray(blocks) || blocks.length > 60) fail(400, '紹介本文は60個以内にしてください。');
  let length = 0;
  return blocks.map((block,index) => {
    if (!block || typeof block !== 'object') fail(400, '紹介本文の形式を確認してください。');
    const label = `紹介本文の${index+1}番目`;
    if (block.type === 'paragraph' || block.type === 'heading') {
      const value = text(block.text ?? '', block.type === 'heading' ? 160 : 20000, label);
      length += value.length;
      if (length > 20000) fail(400, '紹介本文の文章は合計20000文字以内にしてください。');
      return {type:block.type,text:value};
    }
    if (block.type === 'image') {
      const src = safeURL(block.src,true);
      if (!src) fail(400, `${label}の写真を選択してください。`);
      return {type:'image',src,alt:text(block.alt ?? '',240,'写真の説明'),caption:text(block.caption ?? '',500,'写真の下の文章')};
    }
    if (block.type === 'link') {
      const url = safeURL(block.url);
      if (!url) fail(400, `${label}のリンク先URLを入力してください。`);
      return {type:'link',url,label:text(block.label ?? '',240,'リンクの文章')};
    }
    fail(400, '紹介本文に使えない内容が含まれています。');
  });
}
export function validateDocument(input) {
  if (!input || typeof input !== 'object' || input.schemaVersion !== 1) fail(400, '保存データの形式を確認してください。');
  if (!Array.isArray(input.slides) || input.slides.length < 1 || input.slides.length > 6) fail(400, 'トップのスライドは1〜6件にしてください。');
  if (input.members !== undefined && !Array.isArray(input.members)) fail(400, '伊藤ゼミ幹部紹介の形式を確認してください。');
  input = normalizeTerminology(input);
  const seen = new Set();
  const id = value => { const v = text(value, 80, 'ID', true); if (!/^[a-zA-Z0-9_-]+$/.test(v) || seen.has(v)) fail(400, '記事IDが重複しているか、形式が正しくありません。'); seen.add(v); return v; };
  const slides = input.slides.map(s => { if (!s || typeof s !== 'object') fail(400, 'スライドの形式を確認してください。'); return ({ id: id(s.id), title: text(s.title, 150, '見出し', true), description: text(s.description, 240, '説明'), category: text(s.category, 80, '英語ラベル'), cta: text(s.cta, 70, 'ボタン名', true), href: safeURL(s.href), image: safeURL(s.image, true), ...photoSettings(s) }); });
  const entries = (items, kind) => {
    if (!Array.isArray(items) || items.length > 200) fail(400, '記事数は各200件以内にしてください。');
    return items.map(item => {
      if (!item || typeof item !== 'object') fail(400, '記事の形式を確認してください。');
      if (!STATUS.has(item.status)) fail(400, '公開状態を確認してください。');
      const date = text(item.date, 10, '日付', true);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime()) || new Date(date).toISOString().slice(0, 10) !== date) fail(400, '日付を確認してください。');
      const category = text(item.category, 80, 'カテゴリ', true);
      if (kind === 'posts' && !Object.hasOwn(CATEGORIES, category)) fail(400, 'お知らせのカテゴリを選択してください。');
      return { id: id(item.id), title: text(item.title, 160, 'タイトル', true), summary: text(item.summary, 500, '概要'), body: text(item.body, 20000, '本文'), date, category, status: item.status, image: safeURL(item.image, true), ...photoSettings(item), link: safeURL(item.link) };
    });
  };
  if (input.members.length > 200) fail(400, '伊藤ゼミ幹部紹介は200件以内にしてください。');
  const members = input.members.map(member => {
    if (!member || typeof member !== 'object' || !STATUS.has(member.status)) fail(400, '伊藤ゼミ幹部紹介の形式を確認してください。');
    if (!Array.isArray(member.tags) || member.tags.length > 6) fail(400, 'キーワードは6つ以内にしてください。');
    return { id: id(member.id), name: text(member.name, 80, '名前', true), image: safeURL(member.image, true), ...photoSettings(member), group: text(member.group, 80, '学年・担当'), intro: text(member.intro, 240, '一言紹介'), body: member.blocks === undefined ? text(member.body, 20000, '紹介文') : '', ...(member.blocks === undefined ? {} : {blocks:validateMemberBlocks(member.blocks)}), tags: [...new Set(member.tags.map(tag => text(tag, 30, 'キーワード', true)))], status: member.status };
  });
  return { schemaVersion: 1, memberProfileVersion: 1, memberLeadershipVersion: 1, slides, about: { headline: text(input.about?.headline, 200, 'ゼミ紹介の見出し', true), body: text(input.about?.body, 20000, 'ゼミ紹介文', true) }, posts: entries(input.posts, 'posts'), projects: entries(input.projects, 'projects'), members };
}
export function publicDocument(doc) {
  doc = normalizeTerminology(doc);
  return { schemaVersion: doc.schemaVersion, slides: clone(doc.slides), about: clone(doc.about), posts: doc.posts.filter(x => x.status === 'published').sort((a,b) => b.date.localeCompare(a.date)), projects: doc.projects.filter(x => x.status === 'published'), members: doc.members.filter(x => x.status === 'published') };
}
function isRemovedPromotion(href) { return /^https:\/\/(?:www\.)?note\.com(?:\/|$)/i.test(String(href || '')) || /^\/?lab\.html(?:[?#].*)?$/.test(String(href || '')); }
function linkAttrs(href) { return /^https:\/\//i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : ''; }
function postHref(post) { return `article.html?id=${encodeURIComponent(post.id)}`; }
function newsRow(post) { return `<a class="journal-row news-item" data-category="${escape(post.category)}" href="${postHref(post)}"><time datetime="${escape(post.date)}">${escape(post.date.replaceAll('-', '.'))}</time><span class="category">${escape(CATEGORIES[post.category] || post.category)}</span><h3>${escape(post.title)}</h3></a>`; }
function renderHome(html, doc) {
  const imageDescriptions = { 'assets/kameda-meeting.jpg': '企業プロジェクトのミーティングに参加するゼミ生', 'assets/masuya-meeting.jpg': 'スーパーマスヤプロジェクトのメンバー' };
  const slides = doc.slides.map((s,i) => `<article class="hero-slide ${i === 0 ? 'is-current' : ''}" id="slide-${i+1}" aria-label="${i+1} / ${doc.slides.length}" aria-roledescription="スライド"${i ? ' aria-hidden="true" inert' : ''}><div class="slide-image-plane"><div class="slide-mask"><div class="slide-photo">${photo({...s,image:s.image || "assets/seminar-2026.jpg"}, imageDescriptions[s.image] || s.title.replaceAll("\n", " "), i ? 'loading="lazy"' : 'fetchpriority="high"')}</div><div class="slide-shade"></div></div></div><div class="slide-text-plane"><div class="hero-content"><${i ? 'h2' : 'h1'}>${lines(s.title)}</${i ? 'h2' : 'h1'}>${s.description ? `<p>${escape(s.description)}</p>` : ''}${!isRemovedPromotion(s.href) ? `<a href="${escape(s.href || 'about.html')}" class="hero-link"${linkAttrs(s.href)}>${escape(s.cta)}</a>` : ''}</div></div></article>`).join('');
  const dots = doc.slides.map((s,i) => `<button class="slide-dot ${i ? '' : 'selected'}" data-slide="${i}" aria-controls="slide-${i+1}" aria-label="スライド${i+1}を表示"${i ? '' : ' aria-current="true"'}><i class="dot-progress"></i><span class="dot-marker"></span><span class="dot-preview"><img src="${escape(s.image || 'assets/seminar-2026.jpg')}"${photoDimensions(s.image || 'assets/seminar-2026.jpg')} alt=""><span>${escape(s.category)}</span></span></button>`).join('');
  html = html.replace(/<div class="hero-slides">[\s\S]*?<\/div><div class="hero-controls">/, () => `<div class="hero-slides">${slides}</div><div class="hero-controls">`);
  html = html.replace(/<div class="slide-pagination"[^>]*>[\s\S]*?<\/div>/, () => `<div class="slide-pagination" aria-label="スライド選択">${dots}</div>`);
  const rows = doc.posts.filter(p => p.category !== 'awards').slice(0,3).map(newsRow).join('') || '<p class="cms-empty">現在、お知らせはありません。</p>';
  return html.replace(/<div class="home-news-list">[\s\S]*?<\/div><\/section>/, () => `<div class="home-news-list">${rows}</div></section>`);
}

function memberVisual(member, index = 0) {
  const crop = { 'student-03': 'kawaguchi', 'student-05': 'tanji' }[member.id];
  if (crop && String(member.image || '').replace(/^\//, '') === 'assets/member-introductions-grid.jpg') {
    const position = member.imagePosition || (crop === 'tanji' ? '99.873257% 92.401216%' : '49.936629% 92.401216%');
    return `<div class="member-visual member-from-grid member-crop-${crop}" data-member-id="${escape(member.id)}" style="--grid-position:${escape(position)};--grid-position-mobile:${escape(member.imagePositionMobile || position)}" role="img" aria-label="${escape(member.name)}">${member.mobileImage ? `<img class="member-grid-mobile" src="${escape(member.mobileImage)}" alt="" style="object-position:${escape(member.imagePositionMobile || '50% 50%')}">` : ''}</div>`;
  }
  return member.image
    ? `<div class="member-visual" data-member-id="${escape(member.id)}">${photo(member,member.name,'loading="lazy" decoding="async"')}</div>`
    : `<div class="member-visual member-tone-${index % 5}" aria-hidden="true"><span class="member-monogram">${escape(Array.from(member.name)[0])}</span></div>`;
}
function renderMembers(members) {
  const cards = members.map((member, index) => {
    const hasProfile = Boolean(member.image || member.intro || member.body || member.blocks?.length);
    const content = `${memberVisual(member,index)}<div class="member-card-copy">${member.group ? `<p class="member-group">${escape(member.group)}</p>` : ''}<h3>${escape(member.name)}</h3>${member.intro ? `<p class="member-intro">${escape(member.intro)}</p>` : ''}${member.tags.length ? `<div class="member-tags">${member.tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div>` : ''}</div>`;
    return `<article class="member-card">${hasProfile ? `<a class="member-link" href="member.html?id=${encodeURIComponent(member.id)}" aria-label="${escape(member.name)}の紹介を見る">${content}</a>` : content}</article>`;
  }).join('');
  return `<div class="students-heading"><h2 id="students-title">伊藤ゼミ幹部紹介</h2></div><div class="members-grid">${cards || '<p class="cms-empty">現在、公開されている伊藤ゼミ幹部紹介はありません。</p>'}</div>`;
}

export function renderPage(html, path, doc, article, member) {
  if (path === 'index.html') html = renderHome(html, doc);
  if (path === 'people.html') html = html.replace(/<!--members-start-->[\s\S]*?<!--members-end-->/, () => '<!--members-start-->' + renderMembers(doc.members) + '<!--members-end-->');
  if (path === 'about.html') html = html.replace(/<div class="about-intro[^"]*">[\s\S]*?<\/div><\/div>(<div class="fields[^"]*"[^>]*>)/, (_match, fields) => `<div class="about-intro"><div><h1 class="lead" id="learning-title">アントレプレナーのための<br>戦略とマーケティング。</h1>${paragraphs(doc.about.body)}</div></div>${fields}`);
  if (path === 'news.html') {
    const filters = [['all','すべて'], ...Object.entries(CATEGORIES)].map(([key,label],i) => `<button data-filter="${key}" aria-pressed="${i ? 'false' : 'true'}">${escape(label)}</button>`).join('');
    const body = `<section class="section news-list" id="daily"><div class="news-filters" aria-label="記事の絞り込み">${filters}</div><p class="news-count" role="status" aria-live="polite">${doc.posts.length}件の記事</p>${doc.posts.map(newsRow).join('') || '<p class="cms-empty">現在、公開されている記事はありません。</p>'}</section>`;
    html = html.replace(/<section class="section news-list"[\s\S]*?<\/section>/, () => body);
  }
  if (path === 'projects.html') {
    const media = {};
    for (const id of ['collaboration', 'creation']) {
      media[id] = html.match(new RegExp(`<!--project-${id}-media-start-->([\\s\\S]*?)<!--project-${id}-media-end-->`))?.[1] || '';
    }
    const stories = doc.projects.map(p => {
      const copy = p.id === 'collaboration' ? p.body || p.summary : p.summary || p.body;
      return `<article class="project-story section" id="${escape(p.id)}" aria-labelledby="project-${escape(p.id)}-title"><div class="project-story-main"><div class="project-story-copy reveal"><h2 id="project-${escape(p.id)}-title">${escape(p.title)}</h2>${projectParagraphs(copy)}${p.link && !isRemovedPromotion(p.link) ? `<a class="text-link" href="${escape(p.link)}"${linkAttrs(p.link)}>詳しく見る</a>` : ''}</div><figure class="project-story-photo">${photo({...p,image:p.image || "assets/projects-2026.png"},p.title+"の活動",'loading="lazy" decoding="async"')}</figure></div>${media[p.id] || ''}</article>`;
    }).join('');
    html = html.replace(/<!--project-stories-start-->[\s\S]*?<!--project-stories-end-->/, () => `<!--project-stories-start-->${stories || '<p class="section cms-empty">プロジェクトは準備中です</p>'}<!--project-stories-end-->`);
  }
  if (path === 'article.html' && article) {
    const body = `<main id="main"><section class="pagehead"><div class="pagehead-content"><h1>News</h1><p class="pagehead-jp">${escape(CATEGORIES[article.category] || article.category)}</p></div></section><article class="cms-article section"><p class="article-date">${escape(article.date.replaceAll('-', '.'))}</p><h1>${escape(article.title)}</h1><p class="cms-article-summary">${escape(article.summary)}</p>${article.image ? `<figure>${photo(article,article.title)}</figure>` : ''}<div class="cms-article-body">${paragraphs(article.body)}</div>${article.link && !isRemovedPromotion(article.link) ? `<a class="pill-link" href="${escape(article.link)}"${linkAttrs(article.link)}>関連する記事・サイトを見る </a>` : ''}<p><a href="news.html" class="text-link"> 活動報告一覧へ</a></p></article></main>`;
    html = html.replace(/<main id="main">[\s\S]*?<\/main>/, () => body).replace(/<title>.*?<\/title>/, () => `<title>${escape(article.title)}｜伊藤龍史ゼミ</title>`);
  }
  if (path === 'member.html' && member) {
    const image = memberVisual(member, Math.max(0, doc.members.findIndex(item => item.id === member.id))).replace('loading="lazy"', 'loading="eager" fetchpriority="high"');
    const content = renderMemberContent(member);
    const related = doc.members.filter(item => item.id !== member.id && (item.image || item.intro || item.body || item.blocks?.length));
    const body = `<main id="main"><article class="member-profile section"><a class="member-back" href="people.html#students"> 伊藤ゼミ幹部紹介</a><div class="member-profile-top">${image}<div>${member.group ? `<p class="member-group">${escape(member.group)}</p>` : ''}<h1>${escape(member.name)}</h1>${member.intro ? `<p class="member-profile-intro">${escape(member.intro)}</p>` : ''}${member.tags.length ? `<div class="member-tags">${member.tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div>` : ''}</div></div>${content ? `<div class="member-profile-body">${content}</div>` : ''}</article>${related.length ? `<section class="member-related section"><h2>ほかの幹部</h2><div class="member-related-links">${related.map(item => `<a href="member.html?id=${encodeURIComponent(item.id)}">${escape(item.name)} </a>`).join('')}</div></section>` : ''}</main>`;
    html = html.replace(/<main id="main">[\s\S]*?<\/main>/, () => body).replace(/<title>.*?<\/title>/, () => `<title>${escape(member.name)}｜伊藤龍史ゼミ Member</title>`);
  }
  // Keep shared navigation usable when a seeded project is unpublished or removed.
  for (const id of ['collaboration', 'creation']) {
    if (!doc.projects.some(project => project.id === id)) html = html.replaceAll(`href="projects.html#${id}"`, 'href="projects.html"');
  }
  return html;
}
function json(data, status = 200, extra = {}) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } }); }
function identity(request, env) {
  const userId = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  const allowed = String(env.CMS_ADMIN_EMAIL || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!userId || !email) fail(401, '管理者のアカウントでログインしてください。');
  if (!allowed.includes(email.toLowerCase())) fail(403, 'このアカウントには管理権限がありません。');
  return { userId, email };
}
function csrf(request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('X-CMS-Request') !== '1') fail(403, 'ページを開き直してから、もう一度操作してください。');
}
async function loadDocument(env, seed) {
  if (!env.CONTENT) return { document: normalizeTerminology(seed), revision: 'initial', storageReady: false };
  const object = await env.CONTENT.get(DOC_KEY);
  if (!object) return { document: normalizeTerminology(seed), revision: 'initial', storageReady: true };
  return { document: normalizeTerminology(await object.json()), revision: object.etag, storageReady: true };
}
function htmlResponse(body, status = 200) { return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' } }); }
function messagePage(title, message, signin = false) { return `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><body style="font-family:system-ui;margin:12vh auto;padding:24px;max-width:600px;line-height:1.9"><h1>${escape(title)}</h1><p>${escape(message)}</p>${signin ? '<a href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">ChatGPTでログイン</a> · <a href="/signout-with-chatgpt?return_to=%2Fadmin" target="_top">アカウントを切り替える</a>' : ''}<p><a href="/index.html">サイトへ戻る</a></p></body></html>`; }
const SEARCH_PAGES = {
  'index.html': {name:'伊藤龍史ゼミ', title:'伊藤龍史ゼミ｜新潟大学 経済科学部', description:'新潟大学経済科学部 伊藤龍史ゼミのサイトです 経営戦略 マーケティング アントレプレナーシップを学び 企業コラボレーションや新規事業立案に取り組んでいます'},
  'about.html': {name:'ゼミについて', title:'ゼミについて｜伊藤龍史ゼミ', description:'伊藤龍史ゼミの学びと専門分野を紹介します アントレプレナーシップ 経営戦略 マーケティングの理論を学び 企業との活動や事業づくりに取り組んでいます'},
  'projects.html': {name:'プロジェクト', title:'プロジェクト｜伊藤龍史ゼミ', description:'伊藤ゼミの企業コラボレーションと新規事業立案を紹介します スーパーマスヤとの取り組みやビジネスコンテストの活動を掲載しています'},
  'people.html': {name:'先生・幹部紹介', title:'伊藤龍史先生・幹部紹介｜伊藤龍史ゼミ', description:'新潟大学経済科学部の伊藤龍史先生と伊藤ゼミ幹部を紹介します プロフィールや役職 それぞれの活動をご覧いただけます'},
  'news.html': {name:'活動報告', title:'活動報告｜伊藤龍史ゼミ', description:'新潟大学 伊藤龍史ゼミの活動報告です 企業とのプロジェクト ゼミの日常 研究発表や入ゼミ案内などのお知らせを掲載しています'},
  'join.html': {name:'入ゼミ案内', title:'入ゼミ案内｜伊藤龍史ゼミ', description:'伊藤ゼミへの参加を考えている方へ ゼミ見学の案内や活動時間 よくある質問を掲載しています'}
};
const searchSummary = value => String(value || '').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,160);
export function searchMetadata(html,path,doc,origin,article,member) {
  if (['lab.html','sources.html'].includes(path)) return html.replace('</head>','<meta name="robots" content="noindex,follow"></head>');
  let info = SEARCH_PAGES[path];
  if (path === 'article.html' && article) info={name:article.title,title:article.title+'｜伊藤龍史ゼミ',description:searchSummary(article.summary||article.body)||'伊藤龍史ゼミの活動報告です'};
  if (path === 'member.html' && member) info={name:member.name,title:member.name+'｜伊藤ゼミ幹部紹介',description:searchSummary(member.intro)||`伊藤ゼミ幹部 ${member.name}${member.group?' '+member.group:''}の紹介です`};
  if (!info) return html;
  const base=new URL(origin).origin;
  const canonical=new URL(path==='index.html'?'/':path,base+'/');
  if(article)canonical.searchParams.set('id',article.id);
  if(member)canonical.searchParams.set('id',member.id);
  const websiteId=base+'/#website';
  const schema=path==='index.html'?{
    '@context':'https://schema.org','@type':'WebSite','@id':websiteId,url:base+'/',name:'伊藤龍史ゼミ',alternateName:'新潟大学 伊藤龍史ゼミ',inLanguage:'ja',
    publisher:{'@type':'Organization',name:'伊藤龍史ゼミ',url:base+'/',sameAs:['https://www.instagram.com/itoryoji.zemi/']}
  }:{'@context':'https://schema.org','@type':'WebPage',name:info.name,url:canonical.href,description:info.description,inLanguage:'ja',isPartOf:{'@id':websiteId}};
  const jsonLD=JSON.stringify(schema).replace(/</g,'\\u003c');
  html=html.replace(/<title>[\s\S]*?<\/title>/i,()=>`<title>${escape(info.title)}</title>`)
    .replace(/<meta\s+name=["']description["'][^>]*>/ig,'')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/ig,'');
  return html.replace('</head>',`<meta name="description" content="${escape(info.description)}"><link rel="canonical" href="${escape(canonical.href)}"><meta property="og:site_name" content="伊藤龍史ゼミ"><meta property="og:title" content="${escape(info.title)}"><meta property="og:description" content="${escape(info.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(canonical.href)}"><meta property="og:locale" content="ja_JP"><script type="application/ld+json">${jsonLD}</script></head>`);
}
export function searchSitemap(doc,origin) {
  const base=new URL(origin).origin;
  const urls=[...Object.keys(SEARCH_PAGES).map(path=>new URL(path==='index.html'?'/':path,base+'/').href),...doc.posts.map(item=>base+'/article.html?id='+encodeURIComponent(item.id)),...doc.members.map(item=>base+'/member.html?id='+encodeURIComponent(item.id))];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].map(url=>`<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>`;
}
export function renderCMSPreview(files, input, origin) {
  if(!input||typeof input!=='object')fail(400,'プレビューの内容を確認してください。');
  const paths = {home:'index.html',about:'about.html',posts:'article.html',members:'member.html',projects:'projects.html'};
  const path = paths[input.kind];
  if (!path) fail(400, 'プレビューするページを選択してください。');
  const document = clone(input.document);
  if (!document || typeof document !== 'object') fail(400, 'プレビューの内容を確認してください。');
  const cleanURL = (value,image=false) => { try { return safeURL(value,image); } catch { return ''; } };
  const cleanPhoto = item => { item.image=cleanURL(item.image,true);item.mobileImage=cleanURL(item.mobileImage,true); };
  if (input.kind === 'home' && Array.isArray(document.slides)) for (const slide of document.slides) {
    slide.title=slide.title?.trim()||'見出し';slide.cta=slide.cta?.trim()||'詳しく見る';slide.href=cleanURL(slide.href);cleanPhoto(slide);
  }
  if (input.kind === 'about' && document.about) document.about.body=document.about.body?.trim()||'紹介文';
  if (['posts','members','projects'].includes(input.kind)) {
    const item = document[input.kind]?.find(item => item.id === input.id);
    if (!item) fail(404, 'プレビューする項目が見つかりません。');
    item.status='published';cleanPhoto(item);
    if (input.kind === 'members') {
      item.name=item.name?.trim()||'名前';
      if (Array.isArray(item.blocks)) item.blocks=item.blocks.map(block => {
        if (block?.type === 'image') { const src=cleanURL(block.src,true);return src?{...block,src}:{type:'paragraph',text:''}; }
        if (block?.type === 'link') { const url=cleanURL(block.url);return url?{...block,url}:{type:'paragraph',text:''}; }
        return block;
      });
    } else {
      item.title=item.title?.trim()||'タイトル';item.link=cleanURL(item.link);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date||'') || !Number.isFinite(Date.parse(item.date))) item.date=new Date().toISOString().slice(0,10);
      item.category=item.category?.trim()||(input.kind==='posts'?'daily':'PROJECT');
    }
  }
  const doc=publicDocument(validateDocument(document));
  const article=input.kind==='posts'?doc.posts.find(item=>item.id===input.id):undefined;
  const member=input.kind==='members'?doc.members.find(item=>item.id===input.id):undefined;
  const template=path==='article.html'?'news.html':path==='member.html'?'people.html':path;
  const file=files[template];if(!file)fail(404,'プレビューするページがありません。');
  const source=new TextDecoder().decode(Uint8Array.from(atob(file.body),c=>c.charCodeAt(0)));
  let html=renderPage(source,path,doc,article,member);
  if (member && Array.isArray(member.blocks)) {
    const content=renderMemberContent(member);
    const marked=member.blocks.map((block,index)=>renderMemberContent({...member,blocks:[block]}).replace(/<(p|h2|figure)(?=[ >])/g,`<$1 data-cms-block="${index}"`)).join('');
    if(content)html=html.replace(`<div class="member-profile-body">${content}</div>`,`<div class="member-profile-body">${marked}</div>`);
  }
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');
  const style=`<base href="${escape(new URL(origin).origin)}/"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'self'"><style>html{scroll-behavior:auto!important}body{overflow-x:hidden}.page-veil{display:none!important}[data-cms-field]{cursor:pointer}[data-cms-active]{outline:3px solid #3b82f6!important;outline-offset:5px!important;border-radius:2px}.hero-slide{transition:none!important}.cms-preview-label{position:fixed;left:12px;bottom:12px;padding:5px 10px;background:#fff;color:#64748b;border:1px solid #dbe3ec;border-radius:4px;font:11px/1.5 system-ui;z-index:999;pointer-events:none}</style>`;
  html=html.replace('</head>',style+'</head>').replace('</body>','<div class="cms-preview-label">保存前のプレビュー</div></body>');
  return {html};
}
export function createWorker(files, seed) {
  const staticFile = path => {
    const file = files[path];
    if (!file) return null;
    return new Response(Uint8Array.from(atob(file.body), c => c.charCodeAt(0)), { headers: { 'Content-Type': file.type, 'Cache-Control': path.startsWith('assets/') ? 'public, max-age=3600' : 'no-cache', 'X-Content-Type-Options': 'nosniff' } });
  };
  const source = path => new TextDecoder().decode(Uint8Array.from(atob(files[path].body), c => c.charCodeAt(0)));
  return {
    async fetch(request, env, ctx = {}) {
      const url = new URL(request.url);
      let path = url.pathname.replace(/^\//, '') || 'index.html';
      try {
        try { path = decodeURIComponent(path); } catch { fail(400, 'URLを確認してください。'); }
        if (path.startsWith('api/cms/')) {
          const user = identity(request, env);
          if (path === 'api/cms/session' && request.method === 'GET') return json({ email: user.email, userId: user.userId });
          if (path === 'api/cms/document' && request.method === 'GET') return json(await loadDocument(env, seed));
          if (path === 'api/cms/preview' && request.method === 'POST') {
            csrf(request);
            if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail(415, 'プレビューの形式を確認してください。');
            const raw=await request.text();if(raw.length>700000)fail(413,'内容が大きすぎます。');
            let input;try{input=JSON.parse(raw);}catch{fail(400,'プレビューの内容を確認してください。');}
            return json(renderCMSPreview(files,input,url.origin));
          }
          if (path === 'api/cms/document' && request.method === 'PUT') {
            csrf(request);
            if (!env.CONTENT) fail(503, '保存先が準備できていません。しばらくしてから再度お試しください。');
            if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail(415, '保存形式を確認してください。');
            const raw = await request.text(); if (raw.length > 700000) fail(413, '内容が大きすぎます。本文や記事数を減らしてください。');
            let input; try { input = JSON.parse(raw); } catch { fail(400, '保存データを読み取れませんでした。'); }
            const doc = validateDocument(input.document);
            const current = await loadDocument(env, seed);
            if (input.revision !== current.revision) fail(409, '別のタブで内容が更新されています。入力をコピーしてから再読み込みしてください。');
            doc.updatedAt = new Date().toISOString(); doc.lastEditedBy = user.userId;
            const saved = await env.CONTENT.put(DOC_KEY, JSON.stringify(doc), { onlyIf: current.revision === 'initial' ? { etagDoesNotMatch: '*' } : { etagMatches: current.revision }, httpMetadata: { contentType: 'application/json' } });
            if (!saved) fail(409, '別のタブで内容が更新されています。再読み込みして確認してください。');
            const backup = env.CONTENT.put(`cms/history/${Date.now()}-${crypto.randomUUID()}.json`, JSON.stringify(current.document), { httpMetadata: { contentType: 'application/json' } });
            if (ctx.waitUntil) ctx.waitUntil(backup.catch(() => {})); else await backup;
            return json({ document: doc, revision: saved.etag, storageReady: true });
          }
          if (path === 'api/cms/media' && request.method === 'GET') {
            if (!env.CONTENT) fail(503, '画像の保存先が準備できていません。');
            const page = await env.CONTENT.list({ prefix: 'uploads/', limit: 100, cursor: url.searchParams.get('cursor') || undefined, include: ['customMetadata', 'httpMetadata'] });
            return json({ files: page.objects.map(x => ({ url: '/' + x.key, name: x.customMetadata?.name || x.key.split('/').at(-1), size: x.size, uploaded: x.uploaded, type: x.httpMetadata?.contentType })), cursor: page.truncated ? page.cursor : null });
          }
          if (path === 'api/cms/media' && request.method === 'POST') {
            csrf(request);
            if (!env.CONTENT) fail(503, '画像の保存先が準備できていません。');
            if (Number(request.headers.get('Content-Length') || 0) > 5 * 1024 * 1024) fail(413, '画像は5MB以内にしてください。');
            const buffer = await request.arrayBuffer(), bytes = new Uint8Array(buffer);
            if (!bytes.length || bytes.length > 5 * 1024 * 1024) fail(413, '画像は5MB以内にしてください。');
            let extension = '', type = '';
            if (bytes.length > 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) { extension = 'png'; type = 'image/png'; }
            else if (bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) { extension = 'jpg'; type = 'image/jpeg'; }
            else if (bytes.length > 12 && new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP') { extension = 'webp'; type = 'image/webp'; }
            else fail(415, 'JPEG・PNG・WebPの画像を選択してください。');
            const key = `uploads/${crypto.randomUUID()}.${extension}`;
            const name = (url.searchParams.get('name') || 'image').slice(0,150);
            await env.CONTENT.put(key, buffer, { httpMetadata: { contentType: type }, customMetadata: { name } });
            return json({ url: '/' + key, name }, 201);
          }
          return json({ error: '操作を確認してください。' }, 405, { Allow: 'GET, PUT, POST' });
        }
        if (['robots.txt','sitemap.xml'].includes(path)) {
          if (!['GET','HEAD'].includes(request.method)) fail(405,'この操作には対応していません。');
          if (path === 'robots.txt') {
            const robots=`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /signin-with-chatgpt\nDisallow: /signout-with-chatgpt\nSitemap: ${url.origin}/sitemap.xml\n`;
            return new Response(request.method==='HEAD'?null:robots,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
          }
          const state=await loadDocument(env,seed),document=publicDocument(state.document);
          return new Response(request.method==='HEAD'?null:searchSitemap(document,url.origin),{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
        }
        if (path === 'api/content' && request.method === 'GET') {
          const state = await loadDocument(env, seed);
          return json({ content: publicDocument(state.document), storageReady: state.storageReady });
        }
        if (path === 'admin' || path === 'admin.html' || path === 'admin/') {
          try { identity(request, env); } catch (error) { return htmlResponse(messagePage('管理者ログイン', error.message, true), error.status); }
          if (path === 'admin/') return Response.redirect(url.origin + '/admin', 302);
          return htmlResponse(source('admin.html'));
        }
        if (path.startsWith('uploads/')) {
          if (request.method !== 'GET' && request.method !== 'HEAD') fail(405, 'この操作には対応していません。');
          if (!/^uploads\/[a-zA-Z0-9._-]+$/.test(path) || !env.CONTENT) fail(404, '画像が見つかりません。');
          const object = await env.CONTENT.get(path); if (!object) fail(404, '画像が見つかりません。');
          return new Response(request.method === 'HEAD' ? null : object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') fail(405, 'この操作には対応していません。');
        if (path.endsWith('.html') || path === 'index.html') {
          const template = path === 'article.html' ? 'news.html' : path === 'member.html' ? 'people.html' : path;
          if (!files[template]) return htmlResponse(messagePage('ページが見つかりません', 'URLを確認するか、トップページからお探しください。'), 404);
          const state = await loadDocument(env, seed), doc = publicDocument(state.document);
          const article = path === 'article.html' ? doc.posts.find(x => x.id === url.searchParams.get('id')) : null;
          const member = path === 'member.html' ? doc.members.find(x => x.id === url.searchParams.get('id')) : null;
          if (path === 'member.html' && !member) return htmlResponse(messagePage('紹介が見つかりません', 'この紹介は公開されていないか、削除されています。'), 404);
          if (path === 'article.html' && !article) return htmlResponse(messagePage('記事が見つかりません', 'この記事は公開されていないか、削除されています。'), 404);
          return htmlResponse(request.method === 'HEAD' ? null : searchMetadata(renderPage(source(template), path, doc, article, member),path,doc,url.origin,article,member));
        }
        return staticFile(path) || new Response('Not found', { status: 404 });
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 503;
        const message = error instanceof HttpError ? error.message : '現在、保存先に接続できません。時間をおいてお試しください。';
        if (path.startsWith('api/')) return json({ error: message }, status);
        return htmlResponse(messagePage('操作を完了できませんでした', message), status);
      }
    }
  };
}

import {readFile,writeFile,readdir,mkdir,rm,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Window} from 'happy-dom';
import {validateDocument,publicDocument,renderPage,searchMetadata} from '../worker/runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const names=['index.html','about.html','projects.html','people.html','news.html','join.html'];
const publicFiles=['style.css','script.js','motion.js','gallery-rail.js','member-transitions.js','news-filters.js'];
const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export async function exportPages({baseURL,contentFile=path.join(root,'content/public.json'),outDir=path.join(root,'dist-pages'),siteDir=path.join(root,'site')}={}){
  const base=new URL(baseURL);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw new Error('--base-url に公開先のHTTPS URLを指定してください');if(!base.pathname.endsWith('/'))base.pathname+='/';
  const snapshot=JSON.parse(await readFile(contentFile,'utf8').catch(()=>{throw new Error('content/public.json がありません CMSの「公開データを書き出す」から取得したZIPを展開してください');}));
  for(const kind of ['posts','projects','members'])if(snapshot[kind]?.some(item=>item.status!=='published'))throw new Error('下書きを含むデータは公開できません CMSから公開データを書き出してください');
  function relativeUploads(value){
    if(typeof value==='string'&&/^\/uploads\/[a-zA-Z0-9._-]+$/.test(value))return value.slice(1);
    if(Array.isArray(value))return value.map(relativeUploads);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,relativeUploads(item)]));
    return value;
  }
  const doc=publicDocument(validateDocument(snapshot)),raw=relativeUploads(doc);
  const specs=[...names.map(file=>({file,template:file})),...raw.posts.map(article=>({file:'article-'+article.id+'.html',template:'news.html',route:'article.html',article})),...raw.members.map(member=>({file:'member-'+member.id+'.html',template:'people.html',route:'member.html',member}))];
  const exported=new Map(specs.map(spec=>[spec.file,new URL(spec.file==='index.html'?'./':spec.file,base).href]));
  const assets=new Set(['assets/favicon-ito.svg']);
  const contents=new Map();
  const collect=value=>{for(const match of value.matchAll(/(?:assets|uploads)\/[a-zA-Z0-9._-]+/g))assets.add(match[0]);};
  for(const spec of specs){
    const source=await readFile(path.join(siteDir,spec.template),'utf8');
    const pageURL=exported.get(spec.file);
    let html=searchMetadata(renderPage(source,spec.route||spec.file,raw,spec.article,spec.member),spec.route||spec.file,raw,base.origin,spec.article,spec.member);
    const window=new Window({url:pageURL,settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});window.document.write(html);const dom=window.document;
    for(const element of dom.querySelectorAll('[href]')){
      const href=element.getAttribute('href');if(!href)continue;
      const linked=new URL(href,pageURL);
      if(linked.origin===snapshot.sourceOrigin&&/^\/uploads\/[a-zA-Z0-9._-]+$/.test(linked.pathname)){element.setAttribute('href',linked.pathname.slice(1)+linked.hash);if(element.textContent===href)element.textContent=new URL(linked.pathname.slice(1),base).href;continue;}
      if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href))continue;
      const url=new URL(href,pageURL),file=url.pathname.split('/').pop();let next;
      if(['member.html','article.html'].includes(file)){
        next=file.replace('.html','-')+url.searchParams.get('id')+'.html';if(!exported.has(next))throw new Error('公開先がないリンクです: '+href);
        element.setAttribute('href',next+url.hash);
      }else if(href.startsWith('/')&&names.includes(file))element.setAttribute('href',file+url.hash);
    }
    dom.querySelector('link[rel=canonical]')?.setAttribute('href',pageURL);dom.querySelector('meta[property="og:url"]')?.setAttribute('content',pageURL);
    for(const element of dom.querySelectorAll('script[type="application/ld+json"]')){
      const data=JSON.parse(element.textContent);data.url=pageURL;
      if(data['@type']==='WebSite'){data['@id']=new URL('#website',base).href;if(data.publisher)data.publisher.url=base.href;}
      if(data.isPartOf)data.isPartOf['@id']=new URL('#website',base).href;
      element.textContent=JSON.stringify(data).replace(/</g,'\\u003c');
    }
    html='<!doctype html>\n'+dom.documentElement.outerHTML;contents.set(spec.file,html);collect(html);await window.happyDOM.close();
  }
  for(const file of publicFiles){
    let text=await readFile(path.join(siteDir,file),'utf8');
    if(file==='member-transitions.js')text=text.replace('/\\/member\\.html$/','/\\/member(?:-[a-zA-Z0-9_-]+)?\\.html$/').replaceAll("to.searchParams.get('id')","(to.searchParams.get('id')||to.pathname.match(/\\/member-(.+)\\.html$/)?.[1])").replaceAll("from.searchParams.get('id')","(from.searchParams.get('id')||from.pathname.match(/\\/member-(.+)\\.html$/)?.[1])");
    contents.set(file,text);collect(text);
  }
  // Verify every local photo before replacing the previous export.
  for(const asset of assets)await readFile(path.join(siteDir,asset)).catch(()=>{throw new Error('公開用の写真が見つかりません: site/'+asset+' ZIP内のsite/uploadsも展開してください');});
  const out=path.resolve(outDir),site=path.resolve(siteDir);
  if(out===root||root.startsWith(out+path.sep)||out===site||out.startsWith(site+path.sep))throw new Error('書き出し先にはdist-pagesなど専用のフォルダを指定してください');
  await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
  for(const [file,body] of contents)await writeFile(path.join(out,file),body);
  for(const asset of assets){await mkdir(path.dirname(path.join(out,asset)),{recursive:true});await copyFile(path.join(siteDir,asset),path.join(out,asset));}
  await writeFile(path.join(out,'.nojekyll'),'');
  await writeFile(path.join(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...exported.values()].map(url=>'<url><loc>'+xml(url)+'</loc></url>').join('')+'</urlset>');
  await writeFile(path.join(out,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: ${base.pathname}admin\nDisallow: ${base.pathname}api/\nSitemap: ${new URL('sitemap.xml',base).href}\n`);
  await writeFile(path.join(out,'404.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ページが見つかりません｜伊藤龍史ゼミ</title><body style="font-family:system-ui;max-width:640px;margin:15vh auto;padding:24px;line-height:2"><h1>ページが見つかりません</h1><a href="${xml(base.href)}">ホームへ戻る</a></body></html>`);
  return {outDir:out,pages:specs.length,assets:assets.size,baseURL:base.href};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),get=(name,fallback)=>{const index=args.indexOf(name);return index<0?fallback:args[index+1];};
  try{const result=await exportPages({baseURL:get('--base-url'),contentFile:get('--content',path.join(root,'content/public.json')),outDir:get('--out',path.join(root,'dist-pages'))});console.log(`GitHub Pages用: ${result.pages}ページ / ${result.assets}ファイル → ${result.outDir}`);}catch(error){console.error(error.message);process.exitCode=1;}
}

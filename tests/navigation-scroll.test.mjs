import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
const source=await readFile(new URL('../site/script.js',import.meta.url),'utf8');
const windows=[];
afterEach(async()=>{for(const w of windows.splice(0))await w.happyDOM.close();});
async function page({file='projects.html',hash='',type='navigate'}={}){
  const w=new Window({url:'https://example.test/itozemi-HP/'+file+hash,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});windows.push(w);
  w.document.write(await readFile(new URL('../site/'+file,import.meta.url),'utf8'));
  const scrolls=[],frames=[];w.scrollTo=options=>scrolls.push({...options});w.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
  w.performance.getEntriesByType=()=>[{type}];w.eval(source);
  const show=(persisted=false)=>{const event=new w.Event('pageshow');Object.defineProperty(event,'persisted',{value:persisted});w.dispatchEvent(event);};
  const flush=()=>frames.splice(0).forEach(callback=>callback());
  return{w,scrolls,show,flush};
}
test('every bottom navigation destination resets scroll immediately and after page display',async()=>{
  for(const file of ['about.html','projects.html','people.html','news.html','join.html']){
    const p=await page({file});assert.deepEqual(p.scrolls,[{top:0,left:0,behavior:'instant'}]);
    p.show();p.flush();assert.equal(p.scrolls.length,3);assert(p.scrolls.every(s=>s.top===0&&s.behavior==='instant'));
  }
});
test('section links retain the browser anchor position',async()=>{
  const p=await page({hash:'#creation'});p.show();p.flush();assert.equal(p.scrolls.length,0);
});
test('back and forward traversal retain the browser restored scroll position',async()=>{
  const p=await page({type:'back_forward'});p.show();p.flush();assert.equal(p.scrolls.length,0);
});
test('restoring a cached page does not reset its scroll',async()=>{
  const p=await page();p.scrolls.length=0;p.show(true);p.flush();assert.equal(p.scrolls.length,0);
});
test('an anchor selected before the queued reset is preserved',async()=>{
  const p=await page();p.show();p.scrolls.length=0;p.w.location.hash='#creation';p.flush();assert.equal(p.scrolls.length,0);
});

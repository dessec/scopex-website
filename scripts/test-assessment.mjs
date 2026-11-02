import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHtml } from '../lib/assessment.mjs';

const assess = (html,url='https://scopex.co/') => analyzeHtml({html,url,status:200,elapsedMs:120});
const get = (result,id) => result.categories.flatMap(c=>c.checks).find(c=>c.id===id);
const strong = [
  '<!doctype html><html><head><title>ScopeX | Websites and Automation Services</title>',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<meta name="description" content="Business websites and AI services">',
  '<meta name="robots" content="index,follow"></head><body>',
  '<h1>Digital services</h1><a href="/about">About us</a>',
  '<a href="/privacy-policy">Privacy policy</a>',
  '<a href="/contact">Contact us</a><a href="tel:+19055550123">Call</a>',
  '<a href="mailto:hello@scopex.co">Email</a>',
  '<form><input name="email"><button type="submit">Send</button></form>',
  '</body></html>'
].join('');
test('strong page scores 100 with 4 categories and 12 checks',()=>{
  const r=assess(strong);
  assert.equal(r.score,100);
  assert.equal(r.categories.length,4);
  assert.equal(r.categories.flatMap(x=>x.checks).length,12);
  assert.ok(r.categories.every(x=>x.score===100));
  assert.match(r.checkedAt,/^\d{4}-\d\d-\d\dT/);
  assert.equal(r.url,'https://scopex.co/');
  assert.ok(r.limitations.some(x=>/conversion/i.test(x)));
});
test('sparse page fails observable signals, never fabricates a conversion prediction',()=>{
  const r=assess('<html><body><p>Welcome</p></body></html>','http://example.org/');
  assert.equal(r.score,8); // absence of explicit noindex is the sole passing signal
  assert.equal(get(r,'form').passed,false);
  assert.match(get(r,'form').evidence,/may not be needed/i);
  assert.equal(get(r,'https').passed,false);
  assert.doesNotMatch(JSON.stringify(r),/conversion rate: [0-9]+%/i);
});
test('attributes are case-insensitive, reordered, single-quoted and unquoted',()=>{
  const r=assess("<META content='width=device-width' NAME='viewport'><meta CONTENT='fine' name='description'><h1>x</h1><a class=x HREF='/contact'>Get a quote</a><form><input name=x><button>Send</button></form>");
  for(const id of ['viewport','description','h1','cta','destination','form']) assert.equal(get(r,id).passed,true,id);
});
test('comment, script and style content cannot produce false signals',()=>{
  const r=assess('<!-- <h1>Fake</h1><a href="/about">About us</a> --><script>const x="<meta name=viewport content=yes><a href=/contact>Contact us</a>";</script><style>.x{content:"<a href=/privacy>privacy</a>"}</style>');
  for(const id of ['viewport','h1','cta','destination','about','privacy']) assert.equal(get(r,id).passed,false,id);
});
test('noindex is detected and limits optimistic indexing claims',()=>{
  const r=assess('<meta content="nofollow, NOINDEX" name="robots"><h1>Hello</h1>');
  assert.equal(get(r,'indexability').passed,false);
  assert.match(get(r,'indexability').evidence,/noindex/i);
});
test('HTML and potentially malicious text are never echoed into results',()=>{
  const injection='<img src=x onerror=alert(1)>';
  const r=assess('<title>'+injection+' Friendly Website Title</title><h1>'+injection+'</h1><a href="/contact">'+injection+' Contact us</a>');
  const out=JSON.stringify(r);
  assert.ok(!out.includes('<img'));
  assert.ok(!out.includes('onerror'));
  assert.ok(!out.includes('<h1'));
  assert.equal(get(r,'cta').passed,true);
});
test('HTML entities are normalized safely for CTA detection',()=>{
  const r=assess('<a href="/contact">Get in&nbsp;touch</a><h1>Title</h1>');
  assert.equal(get(r,'cta').passed,true);
});
test('empty input and options remain safe and deterministic in scoring',()=>{
  const r=analyzeHtml({});
  assert.ok(Number.isInteger(r.score) && r.score>=0 && r.score<=100);
  assert.equal(r.categories.length,4);
  assert.equal(r.url,'');
});

test('robots none acts as noindex, including mixed-case directives',()=>{
  for (const content of ['none','NoNe','follow, none']) {
    const r=assess('<meta name="robots" content="'+content+'">');
    assert.equal(get(r,'indexability').passed,false,content);
  }
  assert.equal(get(assess('<meta name="robots" content="index,follow">'),'indexability').passed,true);
});
test('form needs a non-hidden enabled field and an enabled submit control',()=>{
  const form=body=>assess('<form>'+body+'</form>');
  const valid=['<input name=email><button>Send</button>',
    '<textarea name=message></textarea><input TYPE=submit value=Send>',
    "<select name=service><option>Web</option></select><button TYPE='SUBMIT'>Go</button>"];
  for(const html of valid) assert.equal(get(form(html),'form').passed,true,html);
  const invalid=[
    '<input type=hidden name=token><button type=submit>Go</button>',
    '<input name=email><button type=reset>Reset</button>',
    '<input name=email><button type=button>Go</button>',
    '<input name=email><button type=submit disabled>Go</button>',
    '<input name=email><input type=submit disabled>',
    '<input name=email><input type=reset>',
    '<input name=email><button disabled>Go</button>',
    '<input disabled name=email><button>Go</button>',
    '<input type=hidden><input type=submit>',
    '<input name=email><button type="button" data-note="submit">Go</button>'
  ];
  for(const html of invalid) assert.equal(get(form(html),'form').passed,false,html);
});
test('about and privacy require navigable href, not text alone',()=>{
  for(const href of ['', 'javascript:void(0)', 'javascript:/about', '#']) {
    const html='<a href="'+href+'">About us</a><a href="'+href+'">Privacy policy</a><a href="'+href+'">Contact us</a>';
    const r=assess(html);
    for(const id of ['about','privacy','destination']) assert.equal(get(r,id).passed,false,id+': '+href);
  }
  const good=assess('<a href="/about">About us</a><a href="/privacy">Privacy policy</a><a href="/contact">Contact us</a>');
  for(const id of ['about','privacy','destination']) assert.equal(get(good,id).passed,true,id);
});

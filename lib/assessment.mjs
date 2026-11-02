// Dependency-free, fetch-free analysis of observable HTML signals.
const decode = s => String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (m, x) => {
  const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  if (x[0] !== '#') return named[x.toLowerCase()] ?? m;
  const n = x[1]?.toLowerCase() === 'x' ? parseInt(x.slice(2),16) : parseInt(x.slice(1),10);
  return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : m;
});
const plain = s => decode(String(s ?? '').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
function attributes(s) {
  const a = Object.create(null);
  const re = /([^\s=/>"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;
  for (const m of s.matchAll(re)) if (!(m[1].toLowerCase() in a))
    a[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return a;
}
function opening(s, tag) {
  const re = new RegExp('<'+tag+'\\b([^>]*?)>', 'gi');
  return [...s.matchAll(re)].map(m=>attributes(m[1]));
}
function paired(s, tag) {
  const re = new RegExp('<'+tag+'\\b([^>]*?)>([\\s\\S]*?)<\\/'+tag+'\\s*>','gi');
  return [...s.matchAll(re)].map(m=>({attrs:attributes(m[1]),text:plain(m[2])}));
}
function test(id,label,passed,evidence,recommendation) {
  return {id,label,passed:!!passed,evidence,recommendation:passed?'':recommendation};
}
function group(id,label,checks) {
  return {id,label,score:Math.round(100*checks.filter(c=>c.passed).length/checks.length),checks};
}
export function analyzeHtml({html='',url='',status,elapsedMs}={}) {
  const clean = (typeof html === 'string' ? html : '')
    .replace(/<!--[\s\S]*?-->/g,'')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
  const metas=opening(clean,'meta'), links=opening(clean,'a'), headings=opening(clean,'h1');
  const title=paired(clean,'title').map(x=>x.text).find(Boolean) ?? '';
  const description=metas.filter(m=>m.name?.toLowerCase()==='description' && m.content?.trim());
  const robots=metas.filter(m=>/^(robots|googlebot|bingbot)$/i.test(m.name ?? ''));
  const noindex=robots.some(m=>/(?:^|[,\s])(?:noindex|none)(?:[,\s]|$)/i.test(m.content ?? ''));
  const anchors=paired(clean,'a'), buttons=paired(clean,'button');
  const ctaRe=/\b(contact|book(?:ing)?|quote|buy|purchase|appointment|schedule|enquir(?:e|y)|inquir(?:e|y)|get in touch|request (?:a |an )?(?:demo|consultation|quote|callback))\b/i;
  const ctas=[...anchors,...buttons].filter(x=>ctaRe.test(x.text));
  const destRe=/(?:^|[/?#_-])(contact|book(?:ing)?|appointment|schedule|quote|enquiry|inquiry)(?:$|[/?#_&=-])/i;
  const destinations=links.filter(a=>a.href?.trim() && !/^(?:javascript:|data:|#)/i.test(a.href.trim()) && (/^(mailto:|tel:)/i.test(a.href)||destRe.test(a.href)));
  const forms=[...clean.matchAll(/<form\b[^>]*>[\s\S]*?<\/form\s*>/gi)].map(m=>m[0]);
  const validForms=forms.filter(f=>{
    const fields=[
      ...opening(f,'input').filter(a=>!['hidden','submit','reset','button','image'].includes((a.type??'text').toLowerCase())),
      ...opening(f,'select'),...opening(f,'textarea')
    ].filter(a=>!('disabled' in a));
    const submitButtons=opening(f,'button').some(a=>
      !('disabled' in a) && ['','submit'].includes((a.type??'').trim().toLowerCase()));
    const submitInputs=opening(f,'input').some(a=>
      !('disabled' in a) && (a.type??'').toLowerCase()==='submit');
    return fields.length>0 && (submitButtons||submitInputs);
  });
  const usableHref=a=>!!a.href?.trim() && !/^(?:javascript:|data:|#)/i.test(a.href.trim());
  const about=links.some(a=>usableHref(a) && /(?:^|[/?#_-])about(?:$|[/?#_&=-])/i.test(a.href)) ||
    anchors.some(a=>usableHref(a.attrs) && /\babout (us|our (team|company))\b/i.test(a.text));
  const privacy=links.some(a=>usableHref(a) && /(?:^|[/?#_-])privacy(?:$|[/?#_&=-])/i.test(a.href)) ||
    anchors.some(a=>usableHref(a.attrs) && /\bprivacy( policy| notice)?\b/i.test(a.text));
  const contact=links.some(a=>/^(mailto:|tel:)/i.test(a.href??'')) ||
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(plain(clean)) ||
    /\+?\d[\d\s().-]{7,}\d/.test(plain(clean));
  const secure=/^https:\/\//i.test(String(url));
  const viewport=metas.some(m=>m.name?.toLowerCase()==='viewport'&&!!m.content?.trim());
  const categories=[
    group('page-basics','Page basics',[
      test('https','HTTPS URL',secure,secure?'Provided URL uses HTTPS.':'Provided URL does not use HTTPS.','Use HTTPS for the public page.'),
      test('viewport','Viewport meta',viewport,viewport?'Viewport meta with content detected.':'No viewport meta with content detected.','Add a responsive viewport meta tag.'),
      test('h1','One H1',headings.length===1,headings.length===1?'Exactly one H1 element detected.':String(headings.length)+' H1 elements detected; expected one.','Review the primary heading.')
    ]),
    group('search-foundations','Search foundations',[
      test('title','Useful title length',title.length>=15&&title.length<=65,title?'Title text detected ('+title.length+' characters); target 15–65.':'No nonempty title text detected.','Use a descriptive title approximately 15–65 characters long.'),
      test('description','Meta description',description.length>0,description.length?String(description.length)+' nonempty description meta tag(s) detected.':'No nonempty description meta tag detected.','Add a descriptive meta description.'),
      test('indexability','No explicit noindex',!noindex,noindex?'Robots meta noindex or none directive detected.':robots.length?'Robots meta detected with no noindex directive.':'No robots meta detected; no explicit noindex directive found.','Review the robots meta directive if indexing is intended.')
    ]),
    group('enquiry-path','Enquiry path',[
      test('cta','Meaningful CTA',ctas.length>0,ctas.length?String(ctas.length)+' qualifying CTA link/button text(s) detected.':'No qualifying contact, booking, quote, buying, or appointment CTA text detected.','Make the next action clear in a link or button.'),
      test('destination','Contact or booking destination',destinations.length>0,destinations.length?String(destinations.length)+' qualifying linked destination(s) detected.':'No contact, booking, quote, telephone, or email link destination detected.','Add a link to a contact, booking, telephone, or email destination.'),
      test('form','Form with fields and submit',validForms.length>0,validForms.length?String(validForms.length)+' form(s) with fields and submit control detected.':forms.length?String(forms.length)+' form(s) detected; none had both fields and a submit control.':'No HTML form detected; a form may not be needed.','Review whether an enquiry form is useful; its absence is not necessarily a defect.')
    ]),
    group('trust-signals','Trust signals',[
      test('about','About link',about,about?'About link detected.':'No About link detected.','Consider linking to business information.'),
      test('privacy','Privacy link',privacy,privacy?'Privacy link detected.':'No Privacy link detected.','Add a discoverable privacy link.'),
      test('contact-details','Business contact details',contact,contact?'Email address, telephone number, or mailto/tel link detected.':'No email address, telephone number, or mailto/tel link detected.','Consider displaying business contact information.')
    ])
  ];
  const checks=categories.flatMap(c=>c.checks), passed=checks.filter(c=>c.passed).length;
  const score=Math.round(100*passed/checks.length);
  return {
    url:String(url),checkedAt:new Date().toISOString(),score,
    summary:String(passed)+' of '+String(checks.length)+' observable signals detected ('+String(score)+'%). Not a conversion rate.',
    categories,
    limitations:[
      'Assessment uses supplied/fetched HTML only; links are not followed.',
      'Actual sales or conversion cannot be measured without analytics and business data.',
      'No rendered mobile, accessibility, or performance audit was performed.',
      'JavaScript-rendered websites may be undercounted.',
      'Missing forms warrant review and are not necessarily defects.'
    ]
  };
}

import { analyzeHtml } from "../lib/assessment.mjs";
import { sampleHtml } from "./sample";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowRight, Check, Plus, Minus, Globe2, Workflow, PenTool, Compass, X, Menu, ShieldCheck, Search, Download, Mail, ChevronDown, CheckCircle2, CircleAlert, LoaderCircle, MousePointer2, MoveUpRight } from "lucide-react";

type CheckItem = { id: string; label: string; passed: boolean; evidence: string; recommendation: string };
type Report = { url: string; checkedAt: string; score: number; summary: string; categories: { id: string; label: string; score: number; checks: CheckItem[] }[]; limitations: string[]; sample?: boolean };
const email = "bdesjardins@scopex.co";
const services = [
  { name: "Websites", verb: "Make a better first impression.", icon: Globe2, copy: "A new website, a thoughtful rebuild, or a landing page with a clear job to do. We connect good design with an easy path from visitor to enquiry.", tags: ["Design & development", "E-commerce", "Hosting & care"], detail: "Clear messaging, responsive layouts, useful content and a considered launch. Hosting, maintenance and ongoing support can be scoped around your business." },
  { name: "AI & automation", verb: "Give your time back to your business.", icon: Workflow, copy: "Connect the tools you already use. Put repetitive enquiries, follow-ups and admin into a workflow that keeps moving, with people in control.", tags: ["Lead follow-up", "AI assistants", "Connected workflows"], detail: "Start with one useful workflow: capture an enquiry, route it to the right place, and prepare the next step. Agree the data access and human review points before building." },
  { name: "Design", verb: "Look like the business you want to be.", icon: PenTool, copy: "A visual identity and digital experience that feel like you. Clear, consistent and considered, from the first impression to the smallest interaction.", tags: ["Brand identity", "UI / UX", "Design systems"], detail: "Translate your positioning into a practical visual system: typography, colour, reusable components and customer journeys your team can carry forward." },
  { name: "Advisory", verb: "Know what is worth doing next.", icon: Compass, copy: "Cut through the options. Find the gaps in your website and workflows, decide what matters, and leave with a practical plan.", tags: ["Website reviews", "AI readiness", "Digital roadmaps"], detail: "An independent look at your goals, current setup and constraints. Prioritise the work, define how to measure it, and make technology decisions with a clear purpose." },
];
const scenarios = [
  { tab: "A local service business", label: "TURN INTEREST INTO AN ENQUIRY", title: "Good work deserves\na better way to be found.", copy: "Show what you do, build trust, and make getting a quote feel effortless. Then make sure every enquiry reaches the right person.", steps: ["A clear service page", "A simple quote request", "A useful follow-up"], note: "Example: a trades business, a studio or a local professional.", badge: "Website + automation", button: "Plan a better enquiry flow" },
  { tab: "A growing team", label: "MAKE ROOM FOR THE WORK THAT MATTERS", title: "Less copying and pasting.\nMore moving forward.", copy: "Bring your forms, inbox and customer records together. Use AI where it helps, and keep a person in the loop where judgement matters.", steps: ["Capture the request", "Prepare & route the task", "Review, approve, respond"], note: "Example: a small team handling repeated customer requests.", badge: "Automation + advisory", button: "Explore a smarter workflow" },
  { tab: "A fresh start", label: "BUILD THE RIGHT FOUNDATIONS", title: "A new business.\nA confident first impression.", copy: "Start with a clear message and a visual identity that fits. Launch a focused website that explains your offer and makes the next step obvious.", steps: ["Clarify your offer", "Build your identity", "Launch with purpose"], note: "Example: a new business launching its first website.", badge: "Design + website", button: "Plan your first website" },
];
function saveText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Home() {
  const [openService, setOpenService] = useState<number | null>(0);
  const [scenario, setScenario] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [project, setProject] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [url, setUrl] = useState("");
  const [goal, setGoal] = useState("More enquiries");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [contactFields, setContactFields] = useState({ name: "", email: "", business: "", service: "A website or redesign", message: "" });
  const [copyState, setCopyState] = useState("");
  const projectDialog = useRef<HTMLDialogElement>(null);
  const privacyDialog = useRef<HTMLDialogElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => { const d = projectDialog.current; if (project) d?.showModal(); else d?.close(); }, [project]);
  useEffect(() => { const d = privacyDialog.current; if (privacy) d?.showModal(); else d?.close(); }, [privacy]);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (!report) return;
    reportRef.current?.focus({ preventScroll: true });
    reportRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }, [report]);
  useEffect(() => {
    const dialogOpen = project || privacy;
    if (dialogOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [project, privacy]);
  const startProject = () => { setDraftReady(false); setCopyState(""); setProject(true); setMobile(false); };
  async function assess(sample = false) {
    if (loading) return;
    setLoading(true); setError(""); setReport(null);
    const abort = new AbortController(); requestRef.current = abort;
    const timeout = setTimeout(() => abort.abort(), 30000);
    try {
      if(sample){setReport({...analyzeHtml({html:sampleHtml,url:"https://example.com/",status:200,elapsedMs:0}),sample:true});return;}
      const config=window.SCOPEX_CONFIG;
      if(!config?.assessmentApiUrl || !config.supabaseAnonKey) throw new Error("The automatic check is being configured. Please send us your website for a manual review.");
      const response = await fetch(config.assessmentApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "apikey":config.supabaseAnonKey, "Authorization":"Bearer "+config.supabaseAnonKey }, body: JSON.stringify({url}), signal: abort.signal });
      const data = await response.json() as Report & { error?: string };
      if (!response.ok) throw new Error(data.error || "We couldn't complete this check. Please try again.");
      if (!Array.isArray(data.categories) || typeof data.score !== "number") throw new Error("The report could not be read. Please try again.");
      setReport(data);
    } catch (err) { setError(err instanceof Error && err.name === "AbortError" ? "This website took too long to respond. Please try again or send us your website for a manual review." : err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { clearTimeout(timeout); setLoading(false); }
  }
  function reportText() {
    if (!report) return "";
    return `${report.sample ? "ILLUSTRATIVE EXAMPLE — not a live website scan\n" : ""}ScopeX — Homepage signal check\n${report.url}\nChecked: ${report.checkedAt}\nBusiness goal: ${goal}\nDetected signal coverage: ${report.score}/100 (not a conversion rate)\n\n${report.summary}\n\n` + report.categories.map(c => `${c.label}: ${c.score}/100\n` + c.checks.map(x => `${x.passed ? "DETECTED" : "REVIEW"}: ${x.label}\n${x.evidence}\n${x.recommendation}`).join("\n\n")).join("\n\n") + "\n\nLimits of this check\n" + report.limitations.join("\n");
  }
  function prepareProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setContactFields({ name: String(data.get("name") || ""), email: String(data.get("email") || ""), business: String(data.get("business") || ""), service: String(data.get("service") || ""), message: String(data.get("message") || "") });
    const text = `Hi ScopeX,\n\nI'd like to discuss a project.\n\nName: ${data.get("name")}\nEmail: ${data.get("email")}\nBusiness: ${data.get("business") || "Not provided"}\nInterested in: ${data.get("service")}\n\nWhat I have in mind:\n${data.get("message")}\n\n${report && !report.sample ? `Website reviewed: ${report.url}\nBusiness goal: ${goal}\n` : ""}`;
    setDraft(text); setDraftReady(true);
  }
  const current = scenarios[scenario];
  const detected = report?.categories.flatMap(c => c.checks).filter(c => c.passed).length || 0;
  const totalChecks = report?.categories.flatMap(c => c.checks).length || 0;
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="header">
      <a className="brand" href="#" aria-label="ScopeX home">scope<span>X</span><span className="brand-mark" aria-hidden="true"><MoveUpRight size={18}/></span><small>CO.</small></a>
      <nav className={mobile ? "nav is-open" : "nav"} aria-label="Main navigation">
        <a onClick={() => setMobile(false)} href="#services">What we do</a><a onClick={() => setMobile(false)} href="#possibilities">The possibilities</a><a onClick={() => setMobile(false)} href="#approach">Our approach</a>
        <a className="nav-audit" onClick={() => setMobile(false)} href="#assessment">Check your website <ArrowUpRight size={15}/></a>
      </nav>
      <button className="button button-dark header-cta" onClick={startProject}>Start a project <ArrowUpRight size={17}/></button>
      <button className="menu-button" onClick={() => setMobile(!mobile)} aria-label={mobile ? "Close menu" : "Open menu"} aria-expanded={mobile}>{mobile ? <X/> : <Menu/>}</button>
    </header>
    <main id="main">
      <section className="hero wrap">
        <div className="hero-top"><span className="eyebrow"><i className="status-dot"/> INDEPENDENT THINKING. CONNECTED SOLUTIONS.</span><span className="hero-edition">WEB · AI · DESIGN</span></div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Your next<br/>chapter.<br/><span className="headline-accent">Built smarter.</span></h1>
            <p>Websites that open doors. Design that builds trust. AI that gives you time back. Let’s make your business work better, together.</p>
            <div className="hero-actions"><a href="#assessment" className="button button-dark">Find your opportunities <ArrowUpRight size={19}/></a><a href="#services" className="text-link">Explore our services <ArrowRight size={17}/></a></div>
          </div>
          <div className="hero-art" role="img" aria-label="Illustrative workflow: a business website connects to an enquiry and a follow-up ready for review.">
            <div className="art-grid"/>
            <div className="art-label"><span className="tiny-cross">+</span> YOUR BUSINESS, CONNECTED <span>01—03</span></div>
            <div className="mini-browser">
              <div className="browser-bar"><span className="browser-dots"><i/><i/><i/></span><span>your next chapter</span><ArrowUpRight size={13}/></div>
              <div className="mini-site"><div className="mini-nav"><b>your business<span>®</span></b><span>ABOUT &nbsp; CONTACT ↗</span></div><div className="mini-heading">A better<br/>kind of<br/><i>business.</i></div><div className="mini-site-bottom"><span>Good things start<br/>with a conversation.</span><span className="mini-cta">Let's talk <ArrowUpRight size={12}/></span></div><div className="mini-star">✳</div></div>
            </div>
            <div className="connector-line line-one"/><div className="connector-line line-two"/>
            <div className="notification enquiry"><span className="notice-icon"><Mail size={20}/></span><div><small>01 / OPPORTUNITY</small><strong>A new enquiry.</strong><span>The right conversation starts here.</span></div><i className="green-dot"/></div>
            <div className="notification followup"><span className="notice-icon light"><Workflow size={21}/></span><div><small>02 / AUTOMATION</small><strong>The next step, ready.</strong><span>Prepared for your review.</span></div><Check size={16}/></div>
            <span className="cursor"><MousePointer2 size={24} fill="currentColor"/><span>You, moving forward</span></span>
            <div className="art-foot"><span>THOUGHTFULLY DESIGNED. PURPOSEFULLY CONNECTED.</span><span>ILLUSTRATIVE WORKFLOW</span></div>
          </div>
        </div>
        <div className="hero-bottom"><span>FOR SMALL BUSINESSES WITH BIG NEXT STEPS.</span><a href="#services">A little further down <span>↓</span></a></div>
      </section>

      <section className="services-section section wrap" id="services">
        <div className="section-heading"><span className="eyebrow">01 / WHAT WE DO</span><div><h2>Different disciplines.<br/>One clear direction.</h2><p>Start with what you need. Connect the rest when it makes sense.</p></div></div>
        <div className="services-list">{services.map((service, i) => <div className={`service ${openService === i ? "active" : ""}`} key={service.name}>
          <button className="service-trigger" onClick={() => setOpenService(openService === i ? null : i)} aria-expanded={openService === i} aria-controls={`service-${i}`}><span className="service-index">0{i + 1}</span><service.icon size={28} strokeWidth={1.25}/><span className="service-name">{service.name}</span><span className="service-verb">{service.verb}</span><span className="expand-icon">{openService === i ? <Minus size={20}/> : <Plus size={20}/>}</span></button>
          <div id={`service-${i}`} className="service-detail" hidden={openService !== i}><p>{service.copy}</p><div><div className="tags">{service.tags.map(tag => <span key={tag}>{tag}</span>)}</div><p className="service-note">{service.detail}</p><button className="text-link" onClick={startProject}>Let’s talk {service.name.toLowerCase()} <ArrowUpRight size={17}/></button></div></div>
        </div>)}</div>
      </section>

      <section className="possibilities-section" id="possibilities"><div className="wrap section">
        <div className="section-heading"><span className="eyebrow">02 / THE POSSIBILITIES</span><div><h2>Technology with<br/>a real-world purpose.</h2><p>Less about the tools. More about what they make possible.</p></div></div>
        <div className="scenario-tabs" role="tablist" aria-label="Business scenarios">{scenarios.map((s, i) => <button role="tab" aria-selected={i === scenario} aria-controls="scenario-panel" id={`scenario-tab-${i}`} tabIndex={i === scenario ? 0 : -1} onKeyDown={e => { if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) { e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? 2 : (scenario + (e.key === "ArrowRight" ? 1 : 2)) % 3; setScenario(next); document.getElementById(`scenario-tab-${next}`)?.focus(); } }} onClick={() => setScenario(i)} key={s.tab}>{s.tab}<ArrowUpRight size={16}/></button>)}</div>
        <div className="scenario-panel" id="scenario-panel" role="tabpanel" aria-labelledby={`scenario-tab-${scenario}`}>
          <div className="scenario-copy"><span className="eyebrow">{current.label}</span><h3>{current.title}</h3><p>{current.copy}</p><button className="text-link" onClick={startProject}>{current.button}<ArrowUpRight size={18}/></button><small>{current.note}</small></div>
          <div className="workflow-visual"><div className="workflow-head"><span>{current.badge}</span><span className="example-tag">EXAMPLE</span></div><div className="workflow-nodes">{current.steps.map((step, i) => <div className="workflow-step" key={step}><div className={`step-icon step-icon-${i}`}>{i === 0 ? <Globe2 size={24}/> : i === 1 ? <Workflow size={24}/> : <CheckCircle2 size={24}/>}</div><div><small>STEP 0{i + 1}</small><strong>{step}</strong></div><span className="workflow-number">0{i+1}</span></div>)}</div><div className="workflow-footer"><i className="green-dot"/> Built around your business. Kept in your control.</div></div>
        </div>
      </div></section>

      <section className="assessment-section section wrap" id="assessment">
        <div className="assessment-shell">
          <div className="assessment-copy"><span className="eyebrow"><span className="small-star">✳</span> THE SCOPEX WEBSITE CHECK</span><h2>What could your<br/>website do<br/><em>better?</em></h2><p>Find the small things that could be standing between a visitor and your next customer.</p><ul className="assessment-points"><li><Check size={16}/> A real check of your public homepage</li><li><Check size={16}/> Clear findings with practical next steps</li><li><Check size={16}/> No email needed. No guesswork about sales.</li></ul></div>
          <div className="assessment-form-card"><div className="form-card-top"><span className="audit-icon"><Search size={24}/></span><span className="eyebrow">A CLEARER STARTING POINT</span></div><h3>Let’s take a look.</h3><p>Enter your website and tell us what you want it to do.</p><form onSubmit={e => { e.preventDefault(); void assess(); }}><label htmlFor="website">Your website</label><div className="url-input"><Globe2 size={18}/><input id="website" name="website" type="text" inputMode="url" autoComplete="url" placeholder="yourbusiness.com" required maxLength={250} value={url} onChange={e => setUrl(e.target.value)} disabled={loading}/></div><label htmlFor="goal">What matters most?</label><select id="goal" value={goal} onChange={e => setGoal(e.target.value)} disabled={loading}><option>More enquiries</option><option>More bookings</option><option>More online sales</option><option>A clearer first impression</option></select><button disabled={loading} className="button button-dark audit-submit" type="submit">{loading ? <><LoaderCircle className="spin" size={18}/> Checking the homepage…</> : <>Check my website <ArrowUpRight size={19}/></>}</button><p className="form-note">We look for technical, search, contact and trust signals in the page’s HTML. This is a starting point, not a full audit or a prediction of sales.</p>{error && <p className="form-error" role="alert"><CircleAlert size={18}/>{error}</p>}<div className="loading-status" role="status" aria-live="polite">{loading ? "Reading the public homepage and checking its signals. Some websites may take a little longer." : ""}</div></form><button className="example-link" disabled={loading} onClick={() => void assess(true)}>Just exploring? See an example report <ArrowRight size={15}/></button></div>
        </div>
        {report && <div className="report" ref={reportRef} tabIndex={-1}>
          <div className="report-top"><div><span className="eyebrow">{report.sample ? "ILLUSTRATIVE EXAMPLE · NOT A LIVE SCAN" : "YOUR HOMEPAGE CHECK"}</span><h3>{report.sample ? "A sample business homepage" : new URL(report.url).hostname}</h3><p>{report.summary}</p></div><div className="score"><strong>{report.score}<small>/100</small></strong><span>Detected signal coverage</span><small>{detected} of {totalChecks} checks detected</small></div></div>
          <div className="report-context"><ShieldCheck size={17}/><span>This score describes detectable page signals. It does not measure your conversion rate or guarantee more customers.</span></div>
          <div className="report-categories">{report.categories.map((cat, i) => <details key={cat.id} open={i === 0}><summary><span>{cat.label}</span><span>{cat.checks.filter(c => c.passed).length}/{cat.checks.length} signals <ChevronDown size={17}/></span></summary><div className="check-list">{cat.checks.map(check => <div key={check.id} className="check-row">{check.passed ? <CheckCircle2 className="check-pass" size={19}/> : <CircleAlert className="check-review" size={19}/>}<div><strong>{check.label} <small>{check.passed ? "Detected" : "Worth a look"}</small></strong><p>{check.evidence}</p>{!check.passed && <p className="recommendation">{check.recommendation}</p>}</div></div>)}</div></details>)}</div>
          <div className="report-next"><div><span className="eyebrow">YOUR GOAL: {goal.toUpperCase()}</span><h4>Turn the findings into a useful next step.</h4><p>{goal === "More enquiries" ? "Review the path from your main service page to a completed enquiry, then track how many visitors finish it." : goal === "More bookings" ? "Test the booking journey on a phone, from choosing a service to receiving confirmation." : goal === "More online sales" ? "Review product clarity, delivery information and checkout friction, then measure completed purchases." : "Ask a first-time visitor to describe your offer and the next step after looking at your homepage."}</p></div><button className="button button-dark" onClick={startProject}>Discuss my website <ArrowUpRight size={18}/></button></div>
          <details className="limitations"><summary>How to read this check <ChevronDown size={16}/></summary><ul>{report.limitations.map(item => <li key={item}>{item}</li>)}</ul><p>Checked {new Date(report.checkedAt).toLocaleString()}. Only the public homepage was requested. No analytics account was connected.</p></details><button className="text-link download-report" onClick={() => saveText(reportText(), "scopex-website-check.txt")}><Download size={16}/> Download this report</button>
        </div>}
      </section>

      <section className="approach-section section wrap" id="approach"><div className="section-heading"><span className="eyebrow">03 / OUR APPROACH</span><div><h2>Clear from the first<br/>conversation.</h2><p>A thoughtful process. A useful outcome. No mystery in between.</p></div></div><div className="process-grid">{[{t:"Understand",d:"We listen to where you are, what’s getting in the way, and where you want to go."},{t:"Map it out",d:"Agree the priorities, scope and investment. Know what we’re building and why."},{t:"Make it real",d:"Design, build and refine with you. See progress and give feedback as it takes shape."},{t:"Move forward",d:"Test, launch and hand over. Agree what to measure and what support comes next."}].map((step,i)=><article key={step.t}><div className="process-number"><span>0{i+1}</span><ArrowRight size={19}/></div><h3>{step.t}</h3><p>{step.d}</p></article>)}</div></section>

      <section className="faq-section wrap"><div><span className="eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</span><h2>Good questions.<br/>Straight answers.</h2></div><div className="faq-list">{[
        ["Do I need to know exactly what I want?", "No. Start with what is frustrating you or what you want to improve. We can help shape a practical first step, whether that is a review, a focused change or a new build."],
        ["Can you work with my existing website?", "Yes. A rebuild is not always the right answer. We can review what you have, identify what is worth keeping, and scope the improvements around your goals and platform."],
        ["Does the website check measure my conversion rate?", "No. It checks signals in your public homepage HTML. Actual conversion rates need visitor and outcome data from your analytics or business systems. A useful next step is defining which enquiries, bookings or purchases to track."],
        ["How much does a project cost?", "Each project is scoped around its requirements, complexity and support needs. We agree the scope and investment before work starts. There are no fixed prices or guaranteed results hidden in this website check."],
        ["What happens after launch?", "We agree a handover and support plan with you. This can include hosting, maintenance, updates or further improvements, with responsibilities and ongoing costs made clear in the project scope."],
      ].map(([q,a]) => <details key={q}><summary>{q}<Plus size={18}/></summary><p>{a}</p></details>)}</div></section>

      <section className="final-cta"><div className="wrap"><span className="eyebrow">YOUR NEXT CHAPTER STARTS WITH A CONVERSATION.</span><div><h2>Let’s make<br/><span>what’s next.</span></h2><button onClick={startProject} className="circle-cta" aria-label="Start a project with ScopeX"><ArrowUpRight size={60} strokeWidth={1.15}/></button></div><p>A clearer website. A smarter workflow. A business ready to move forward.</p><a href={`mailto:${email}`} className="footer-email">{email}<ArrowUpRight size={17}/></a></div></section>
    </main>
    <footer className="footer wrap"><a className="brand" href="#" aria-label="ScopeX home">scope<span>X</span><small>CO.</small></a><span>Independent thinking. Connected solutions.</span><div><button onClick={() => setPrivacy(true)}>Privacy</button><span>© {new Date().getFullYear()} ScopeX Co.</span><a href="#" aria-label="Back to top">↑</a></div></footer>

    <dialog className="project-dialog" ref={projectDialog} onCancel={() => setProject(false)} onClose={() => setProject(false)} aria-labelledby="project-title"><button className="dialog-close" aria-label="Close project enquiry" onClick={() => setProject(false)}><X size={22}/></button><span className="eyebrow">LET’S MAKE WHAT’S NEXT</span><h2 id="project-title">Tell us what<br/>you have in mind.</h2>{!draftReady ? <><p>Share a little about your business. We’ll prepare an email draft for you to review and send.</p><form onSubmit={prepareProject}><div className="form-two"><div><label htmlFor="contact-name">Your name</label><input id="contact-name" name="name" defaultValue={contactFields.name} autoComplete="name" required maxLength={100}/></div><div><label htmlFor="contact-email">Your email</label><input id="contact-email" name="email" defaultValue={contactFields.email} type="email" autoComplete="email" required maxLength={160}/></div></div><label htmlFor="business">Business name <span>(optional)</span></label><input id="business" name="business" defaultValue={contactFields.business} autoComplete="organization" maxLength={150}/><label htmlFor="interest">I’m interested in</label><select id="interest" name="service" defaultValue={contactFields.service}><option>A website or redesign</option><option>AI & automation</option><option>Brand or digital design</option><option>Advisory / website review</option><option>A little of everything</option></select><label htmlFor="message">What would you like to improve?</label><textarea id="message" name="message" defaultValue={contactFields.message} rows={4} required minLength={10} maxLength={2000} placeholder="A little about your business, your goals, and what is getting in the way…"/><button className="button button-dark" type="submit">Prepare my enquiry <ArrowUpRight size={18}/></button><p className="form-note">Nothing is sent when you fill this in. You choose when to send it from your email app.</p></form></> : <div className="draft-result"><span className="notice-icon"><Check size={23}/></span><h3>Your enquiry is ready.</h3><p>Review the draft below, then open your email app and press Send. Your message has not been sent yet.</p><pre>{draft}</pre><a className="button button-dark" href={`mailto:${email}?subject=${encodeURIComponent("A new project with ScopeX")}&body=${encodeURIComponent(draft)}`}>Open email draft <Mail size={18}/></a><div className="draft-actions"><button className="text-link" onClick={() => saveText(draft, "scopex-project-brief.txt")}><Download size={16}/>Save a copy</button><button className="text-link" onClick={async () => { try { await navigator.clipboard.writeText(draft); setCopyState("Copied"); } catch { setCopyState("Use Save a copy to keep your draft."); } }}>{copyState || "Copy enquiry"}</button><button className="text-link" onClick={() => setDraftReady(false)}>Edit details</button></div><p className="form-note">You can also email {email} directly.</p></div>}</dialog>
    <dialog className="privacy-dialog" ref={privacyDialog} onCancel={() => setPrivacy(false)} onClose={() => setPrivacy(false)} aria-labelledby="privacy-title"><button className="dialog-close" aria-label="Close privacy information" onClick={() => setPrivacy(false)}><X size={22}/></button><span className="eyebrow">YOUR INFORMATION</span><h2 id="privacy-title">A clear approach<br/>to privacy.</h2><h3>Website checks</h3><p>Your website address is sent to our Supabase scanner, which retrieves the public homepage. Reports and page content are processed in memory and are not saved to our database. Short-lived, pseudonymous rate-limit counters help prevent abuse. Hosting providers may retain operational request logs. The scan does not access private pages or customer accounts.</p><h3>Project enquiries</h3><p>The enquiry form prepares a draft in your browser. It does not send your details to ScopeX until you send the email through your email app. Your email provider then handles delivery. Do not include passwords or sensitive customer information.</p><h3>Your choices</h3><p>This site adds no advertising trackers or analytics scripts. Download a report if you want to keep it; refreshing clears the report and form state. Questions about information you have emailed to ScopeX can be sent to <a href={`mailto:${email}`}>{email}</a>.</p></dialog>
  </>;
}

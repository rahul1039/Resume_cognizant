const API = location.port === "8000" ? "" : "http://127.0.0.1:8000";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let mode = "paste", file = null, k = 3, lastData = null, listening = false, rec = null;
let lang = "en";
try { lang = localStorage.getItem("lang") === "hi" ? "hi" : "en"; } catch (_) {}
const lastCoach = {};

/* =====================================================
   SECTION ROUTER
   ===================================================== */
function showSection(name) {
  $$(".section").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(name);
  if (target) target.classList.add("active");

  // Update nav active link
  $$(".nav-link").forEach((l) => l.classList.remove("active"));
  if (name === "landing") {
    const homeLink = document.querySelector('.nav-link[onclick*="landing"]');
    if (homeLink) homeLink.classList.add("active");
  } else if (name === "app") {
    const matchLink = document.querySelector('.nav-link[onclick*="app"]');
    if (matchLink) matchLink.classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function loadSampleAndAnalyze() {
  // Sample report removed per user request
}

/* =====================================================
   TRANSLATIONS
   ===================================================== */
const joiner = { en: " and ", hi: " और " };
const listJoin = (a) => a.length > 1 ? a.slice(0, -1).join(", ") + joiner[lang] + a[a.length - 1] : (a[0] || "");

const CAT_HI = {
  ACCOUNTANT: "लेखाकार", ADVOCATE: "अधिवक्ता", AGRICULTURE: "कृषि", APPAREL: "परिधान", ARTS: "कला",
  AUTOMOBILE: "ऑटोमोबाइल", AVIATION: "विमानन", BANKING: "बैंकिंग", BPO: "बीपीओ",
  "BUSINESS-DEVELOPMENT": "बिज़नेस डेवलपमेंट", CHEF: "शेफ", CONSTRUCTION: "निर्माण", CONSULTANT: "सलाहकार",
  DESIGNER: "डिज़ाइनर", "DIGITAL-MEDIA": "डिजिटल मीडिया", ENGINEERING: "इंजीनियरिंग", FINANCE: "वित्त",
  FITNESS: "फिटनेस", HEALTHCARE: "स्वास्थ्य सेवा", HR: "मानव संसाधन", "INFORMATION-TECHNOLOGY": "सूचना प्रौद्योगिकी",
  "PUBLIC-RELATIONS": "जनसंपर्क", SALES: "बिक्री", TEACHER: "शिक्षक",
};

const I18N = {
  en: {
    /* nav */
    navHome: "Home", navMatch: "Match Resume", navAnalytics: "Recruiter Analytics", navHow: "How it Works", navFeatures: "Features", navCta: "Get Started →",
    back: "Back to Home",
    /* landing */
    pillAcc: "86.5% test accuracy · English",
    eyebrow: "AI-Powered Career Platform",
    h1: `Find internships that fit the <span class="grad">candidate's profile</span>, not just keywords.`,
    sub: "Upload or paste a resume. Our semantic AI matches it across 24 domains, finds skill gaps, and generates a personalised career roadmap — for candidates and recruiters alike.",
    heroCta: "Analyse a Resume", heroAnalytics: "Recruiter Analytics Hub",
    badge1: "No data stored", badge2: "Instant results", badge3: "Gemini AI coaching",
    /* stats */
    stat1: "Domains covered", stat2: "Classification accuracy", stat3: "Internship listings", stat4: "Semantic embeddings",
    /* features */
    featEyebrow: "Platform Features",
    featTitle: "Everything you need to evaluate the right candidate",
    f1t: "Semantic Matching", f1d: "Goes beyond keywords — understands the meaning of a candidate's skills using sentence-transformer embeddings and FAISS vector search.",
    f2t: "AI Career Coach", f2d: "Powered by Gemini AI — generates a personalised 4–6 week skill roadmap, resume rewording tips, and specific project ideas to close gaps.",
    f3t: "Skill Analytics", f3d: "See exactly which skills the candidate already has, which are related but worded differently, and which ones are missing — in one visual dashboard.",
    f4t: "Voice Input", f4d: "Candidates can speak their resume out loud in English. Built-in speech recognition transcribes it instantly.",
    f5t: "Privacy First", f5d: "Resumes are processed in-memory and never stored. Personal data like emails and phone numbers are auto-redacted before AI processing.",
    f6t: "Multilingual UI", f6d: "Full Hindi and English interface support. Switch languages instantly — all results, labels, and AI summaries adapt in real time.",
    /* how it works */
    howEyebrow: "Simple Process", howTitle: "How InternMatch works", howCta: "Start Analysing Now →",
    s1t: "Upload the resume", s1d: "Paste text, upload a PDF/TXT file, or use voice input. All formats are supported.",
    s2t: "AI analyses the match", s2d: "MiniLM embeds the candidate's skills and searches across internship postings using FAISS for semantic similarity.",
    s3t: "Get the analytics + coaching", s3d: 'See matched, related, and missing skills. Click "Get AI Coaching" for a personalised roadmap from Gemini.',
    /* app */
    tabPaste: "Paste text", tabUpload: "Upload file", sample: "Load sample",
    ph: "Paste the full resume here. First line = job title, then Summary, Experience, Skills...",
    mic: "Speak resume", micOn: "Listening... click to stop", micNo: "Voice input needs Chrome or Edge",
    hint: 'Tip: say the job title first, then "Summary", "Experience", and finally "Skills" followed by the skills.',
    chars: "characters",
    dropTitle: "Drop the resume here", dropSub: "PDF or TXT · or click to browse",
    results: "Results", top3: "Top 3", top5: "Top 5", analyze: "Analyse Resume",
    xlateTitle: "What we understood (English version of the resume)",
    sTitle: "Detected title", sSkills: "Skills detected", sCat: "Predicted domain", notDetected: "Not detected",
    domProb: "Domain probabilities", confidence: "match score", skillCov: "Skill coverage",
    have: "Candidate has", related: "Related (different wording)", build: "Skills to build", none: "None",
    listenSum: "Listen summary", listenCoach: "Listen coaching", stop: "Stop",
    getCoach: "Get AI Coaching", coachTitle: "AI Career Coach", coachSub: "Gemini · grounded on candidate's match data",
    why: "Why the candidate fits", road: "Upskilling roadmap", tips: "Resume rewording tips", week: "Week",
    rd: { "Strong fit": "Strong fit", "Good, minor gaps": "Good, minor gaps", "Needs upskilling": "Needs upskilling" },
    tShort: "Paste a longer resume (at least 60 characters).", tNoFile: "Choose a resume file first.",
    tNet: "Could not reach the backend. Is the FastAPI server running?",
    tMic: "Microphone is blocked. Allow it from the lock icon in the address bar.", tNoMic: "No microphone found.",
    tNoTts: "Voice output is not supported in this browser.",
    tNoVoice: "No English voice found on this device.",
    sp: (i, m, cat, have, miss, cov, rd) =>
      `Match number ${i + 1}. ${m.title}, in ${cat}. The candidate's skill coverage is ${cov} percent. ${rd}. ` +
      (have.length ? `The candidate already has ${listJoin(have)}. ` : "") + (miss.length ? `Skills to build are ${listJoin(miss)}.` : ""),
    fileKb: "KB · click to change",
    /* footer */
    footerTagline: "AI-powered internship matching for students across India.",
    fcProduct: "Product", fcMatch: "Match Resume", fcAnalytics: "Recruiter Analytics", fcFeatures: "Features", fcHow: "How it Works",
    fcTech: "Technology",
    fcLegal: "Legal", fcPrivacy: "Privacy Policy", fcTerms: "Terms of Use", fcCookies: "Cookie Policy", fcContact: "Contact Us",
    copyright: "© 2026 InternMatch. All rights reserved.", madeIn: "Made with ❤️ in India 🇮🇳",
  },
  hi: {
    /* nav */
    navHome: "होम", navMatch: "रिज़्यूमे मैच करें", navAnalytics: "रिक्रूटर एनालिटिक्स", navHow: "यह कैसे काम करता है", navFeatures: "फ़ीचर", navCta: "शुरू करें →",
    back: "होम पर वापस जाएँ",
    /* landing */
    pillAcc: "86.5% सटीकता · अंग्रेज़ी रिज़्यूमे पर",
    eyebrow: "AI-संचालित करियर प्लेटफ़ॉर्म",
    h1: `ऐसी इंटर्नशिप खोजें जो <span class="grad">उम्मीदवार की प्रोफ़ाइल</span> से मेल खाए, सिर्फ़ कीवर्ड से नहीं।`,
    sub: "रिज़्यूमे अपलोड करें या पेस्ट करें। हमारा सिमेंटिक AI इसे 24 क्षेत्रों में मैच करता है और व्यक्तिगत करियर रोडमैप देता है — उम्मीदवार और रिक्रूटर दोनों के लिए।",
    heroCta: "रिज़्यूमे का विश्लेषण करें", heroAnalytics: "रिक्रूटर एनालिटिक्स हब",
    badge1: "डेटा स्टोर नहीं होता", badge2: "तुरंत परिणाम", badge3: "Gemini AI कोचिंग",
    /* stats */
    stat1: "क्षेत्र शामिल हैं", stat2: "वर्गीकरण सटीकता", stat3: "इंटर्नशिप लिस्टिंग", stat4: "सिमेंटिक एम्बेडिंग",
    /* features */
    featEyebrow: "प्लेटफ़ॉर्म फ़ीचर",
    featTitle: "सही उम्मीदवार का मूल्यांकन करने के लिए ज़रूरी सब कुछ",
    f1t: "सिमेंटिक मैचिंग", f1d: "सिर्फ़ कीवर्ड से आगे — sentence-transformer और FAISS वेक्टर सर्च से उम्मीदवार की स्किल्स का असली अर्थ समझता है।",
    f2t: "AI करियर कोच", f2d: "Gemini AI द्वारा — 4–6 सप्ताह का व्यक्तिगत स्किल रोडमैप, रिज़्यूमे में शब्द बदलने के सुझाव और प्रोजेक्ट आइडिया पाएँ।",
    f3t: "स्किल एनालिटिक्स", f3d: "देखें कि उम्मीदवार के पास कौन-सी स्किल्स हैं, कौन-सी मिलती-जुलती हैं, और कौन-सी नहीं हैं — एक विज़ुअल डैशबोर्ड में।",
    f4t: "वॉइस इनपुट", f4d: "उम्मीदवार अंग्रेज़ी में रिज़्यूमे बोल सकते हैं। बिल्ट-इन स्पीच रिकॉग्निशन तुरंत ट्रांसक्राइब करता है।",
    f5t: "प्राइवेसी सबसे पहले", f5d: "रिज़्यूमे मेमोरी में प्रोसेस होता है और कभी स्टोर नहीं होता। AI को भेजने से पहले ईमेल-फ़ोन नंबर हट जाते हैं।",
    f6t: "बहुभाषी UI", f6d: "हिंदी और अंग्रेज़ी इंटरफ़ेस। भाषा तुरंत बदलें — सभी परिणाम, लेबल और AI सारांश रियल टाइम में अपडेट होते हैं।",
    /* how it works */
    howEyebrow: "सरल प्रक्रिया", howTitle: "InternMatch कैसे काम करता है", howCta: "अभी विश्लेषण शुरू करें →",
    s1t: "रिज़्यूमे अपलोड करें", s1d: "टेक्स्ट पेस्ट करें, PDF/TXT फ़ाइल अपलोड करें, या वॉइस इनपुट से बोलें।",
    s2t: "AI मैच का विश्लेषण करता है", s2d: "MiniLM उम्मीदवार की स्किल्स एम्बेड करता है और FAISS से सिमेंटिक समानता खोजता है।",
    s3t: "एनालिटिक्स + कोचिंग पाएँ", s3d: '"AI कोचिंग पाएँ" पर क्लिक करें और Gemini से व्यक्तिगत रोडमैप लें।',
    /* app */
    tabPaste: "टेक्स्ट पेस्ट करें", tabUpload: "फ़ाइल अपलोड करें", sample: "नमूना लोड करें",
    ph: "पूरा रिज़्यूमे यहाँ पेस्ट करें। पहली पंक्ति = जॉब टाइटल, फिर सारांश, अनुभव, स्किल्स...",
    mic: "रिज़्यूमे बोलें", micOn: "सुन रहे हैं... रोकने के लिए क्लिक करें", micNo: "वॉइस इनपुट के लिए Chrome या Edge चाहिए",
    hint: "सुझाव: पहले जॉब टाइटल बोलें, फिर \"सारांश\", \"अनुभव\" और अंत में \"स्किल्स\" बोलकर स्किल्स बताएँ।",
    chars: "अक्षर",
    dropTitle: "रिज़्यूमे यहाँ छोड़ें", dropSub: "PDF या TXT · या क्लिक करके चुनें",
    results: "परिणाम", top3: "शीर्ष 3", top5: "शीर्ष 5", analyze: "रिज़्यूमे का विश्लेषण करें",
    xlateTitle: "हमने क्या समझा (रिज़्यूमे का अंग्रेज़ी रूप)",
    sTitle: "पहचाना गया टाइटल", sSkills: "पहचानी गई स्किल्स", sCat: "अनुमानित क्षेत्र", notDetected: "पहचाना नहीं गया",
    domProb: "क्षेत्र की संभावना", confidence: "मैच स्कोर", skillCov: "स्किल कवरेज",
    have: "उम्मीदवार के पास", related: "मिलती-जुलती (अलग शब्दों में)", build: "सीखने वाली स्किल्स", none: "कोई नहीं",
    listenSum: "सारांश सुनें", listenCoach: "कोचिंग सुनें", stop: "रोकें",
    getCoach: "AI कोचिंग पाएँ", coachTitle: "AI करियर कोच", coachSub: "Gemini · उम्मीदवार के मैच डेटा पर आधारित",
    why: "उम्मीदवार क्यों फ़िट है", road: "अपस्किलिंग रोडमैप", tips: "रिज़्यूमे में शब्द बदलने के सुझाव", week: "सप्ताह",
    rd: { "Strong fit": "बेहतरीन फ़िट", "Good, minor gaps": "अच्छा, थोड़ी कमी", "Needs upskilling": "स्किल्स बढ़ाने की ज़रूरत" },
    tShort: "थोड़ा लंबा रिज़्यूमे पेस्ट करें (कम से कम 60 अक्षर)।", tNoFile: "पहले रिज़्यूमे फ़ाइल चुनें।",
    tNet: "बैकएंड से कनेक्ट नहीं हो पाया। क्या FastAPI सर्वर चल रहा है?",
    tMic: "माइक्रोफ़ोन ब्लॉक है। एड्रेस बार के लॉक आइकन से अनुमति दें।", tNoMic: "माइक्रोफ़ोन नहीं मिला।",
    tNoTts: "इस ब्राउज़र में वॉइस आउटपुट उपलब्ध नहीं है।",
    tNoVoice: "इस डिवाइस पर हिंदी वॉइस नहीं मिली। Microsoft Edge में कोशिश करें।",
    sp: (i, m, cat, have, miss, cov, rd) =>
      `मैच नंबर ${i + 1}। ${m.title}, क्षेत्र ${cat}। उम्मीदवार का स्किल कवरेज ${cov} प्रतिशत है। ${rd}। ` +
      (have.length ? `उम्मीदवार के पास पहले से ${listJoin(have)} हैं। ` : "") + (miss.length ? `सीखने वाली स्किल्स हैं ${listJoin(miss)}।` : ""),
    fileKb: "KB · बदलने के लिए क्लिक करें",
    /* footer */
    footerTagline: "भारत के छात्रों के लिए AI-संचालित इंटर्नशिप मैचिंग।",
    fcProduct: "उत्पाद", fcMatch: "रिज़्यूमे मैच करें", fcAnalytics: "रिक्रूटर एनालिटिक्स", fcFeatures: "फ़ीचर", fcHow: "यह कैसे काम करता है",
    fcTech: "तकनीक",
    fcLegal: "कानूनी", fcPrivacy: "गोपनीयता नीति", fcTerms: "उपयोग की शर्तें", fcCookies: "कुकी नीति", fcContact: "संपर्क करें",
    copyright: "© 2026 InternMatch. सर्वाधिकार सुरक्षित।", madeIn: "❤️ के साथ भारत में बनाया गया 🇮🇳",
  },
};

const t = (key) => I18N[lang][key];
const TTS_LANG = { en: "en-IN", hi: "hi-IN" };

/* =====================================================
   SAMPLE RESUMES
   ===================================================== */
const SAMPLE = {
  en: `NETWORK ADMINISTRATOR

Summary
Network administrator with 6+ years of experience managing enterprise LAN/WAN infrastructure, Windows servers and help desk support.

Highlights
Network security, troubleshooting, system administration

Experience
Network Administrator   Jan 2018 to Current
Company Name - City, State
Configured and maintained Cisco routers and switches, firewalls and VPN tunnels for 400 users.
Administered Active Directory, Windows Server 2012/2016 and VMware virtual environments.
Led disaster recovery planning, backup monitoring and antivirus rollout across all sites.
Provided tier 2 help desk support and documented network issues in ticketing system.

Education
Bachelor of Science, Computer Information Systems

Skills
Cisco, networking, Windows Server, Active Directory, VMware, firewall, VPN, TCP/IP, DNS, DHCP, troubleshooting, help desk support, system administration, disaster recovery, antivirus, Linux`,
  hi: `नेटवर्क एडमिनिस्ट्रेटर

सारांश
6 वर्षों से अधिक अनुभव वाला नेटवर्क एडमिनिस्ट्रेटर, जो एंटरप्राइज़ LAN/WAN, विंडोज़ सर्वर और हेल्प डेस्क सपोर्ट संभालता है।

अनुभव
नेटवर्क एडमिनिस्ट्रेटर, जनवरी 2018 से अब तक
सिस्को राउटर, स्विच, फ़ायरवॉल और VPN को 400 उपयोगकर्ताओं के लिए कॉन्फ़िगर और मेंटेन किया।
एक्टिव डायरेक्टरी, विंडोज़ सर्वर 2016 और VMware वर्चुअल एनवायरनमेंट का प्रबंधन किया।

शिक्षा
बी.एससी., कंप्यूटर इन्फ़ॉर्मेशन सिस्टम्स

स्किल्स
सिस्को, नेटवर्किंग, विंडोज़ सर्वर, एक्टिव डायरेक्टरी, VMware, फ़ायरवॉल, VPN, TCP/IP, DNS, DHCP, ट्रबलशूटिंग, हेल्प डेस्क सपोर्ट, सिस्टम एडमिनिस्ट्रेशन, डिज़ास्टर रिकवरी, एंटीवायरस, लिनक्स`,
};

/* =====================================================
   HELPERS
   ===================================================== */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const catName = (c) => lang === "hi" ? (CAT_HI[c] || c) : c.toLowerCase().replace(/-/g, " ");
const fmt = (c) => esc(catName(c));
const pct = (x) => Math.round(x * 100);
const weekLabel = (w) => String(w).replace(/^week\s*/i, t("week") + " ");

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 4500);
}
const setLoading = (on) => $("#analyze").classList.toggle("loading", on);

/* =====================================================
   TABS / INPUTS
   ===================================================== */
$$(".tab").forEach((b) => (b.onclick = () => {
  mode = b.dataset.mode;
  $$(".tab").forEach((x) => x.classList.toggle("active", x === b));
  $$(".pane").forEach((p) => p.classList.toggle("show", p.id === "pane-" + mode));
}));
$$("#kSeg button").forEach((b) => (b.onclick = () => {
  k = +b.dataset.k;
  $$("#kSeg button").forEach((x) => x.classList.toggle("on", x === b));
}));
$$("#langSeg button").forEach((b) => (b.onclick = () => setLang(b.dataset.l)));

$("#resume").addEventListener("input", (e) => ($("#charCount").textContent = e.target.value.length));
const hamburger = $("#hamburger");
if (hamburger) {
  hamburger.onclick = () => $("#navLinks").classList.toggle("open");
}
const sampleBtn = $("#sampleBtn");
if (sampleBtn) {
  sampleBtn.onclick = () => {
    $$(".tab")[0].click();
    $("#resume").value = SAMPLE[lang];
    $("#charCount").textContent = SAMPLE[lang].length;
  };
}

const drop = $("#drop"), fileInput = $("#fileInput");
fileInput.onchange = () => setFile(fileInput.files[0]);
["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => setFile(e.dataTransfer.files[0]));
function setFile(f) { if (f) { file = f; refreshDrop(); } }
function refreshDrop() {
  if (file) {
    drop.classList.add("has");
    $("#dropTitle").textContent = file.name;
    $("#dropSub").textContent = (file.size / 1024).toFixed(1) + " " + t("fileKb");
  } else {
    $("#dropTitle").textContent = t("dropTitle");
    $("#dropSub").textContent = t("dropSub");
  }
}

/* =====================================================
   LANGUAGE TOGGLE
   ===================================================== */
function setLang(l) {
  lang = l;
  try { localStorage.setItem("lang", l); } catch (_) {}
  applyLang();
}
function applyLang() {
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((e) => (e.textContent = t(e.dataset.i18n)));
  $$("[data-i18n-html]").forEach((e) => (e.innerHTML = t(e.dataset.i18nHtml)));
  $$("[data-i18n-ph]").forEach((e) => (e.placeholder = t(e.dataset.i18nPh)));
  $$("#langSeg button").forEach((b) => b.classList.toggle("on", b.dataset.l === lang));
  $("#voiceLang").value = TTS_LANG[lang];
  setMic(listening);
  refreshDrop();
  stopSpeak();
  if (lastData) {
    Object.keys(lastCoach).forEach((x) => delete lastCoach[x]);
    render(lastData, false);
  }
}

/* =====================================================
   DOMAIN SELECTOR LOGIC
   ===================================================== */
const DOMAIN_HINTS = {
  any: {
    title: "✦ (Any) Domain Mode Enabled",
    desc: "The AI engine will evaluate your resume across all 24 domains and highlight all career fields you are compatible with, ranking them by compatibility percentage.",
    isAny: true
  },
  // Popular Tech Specializations
  aiml: {
    title: "🤖 Target Domain: AI & Machine Learning",
    desc: "Prioritizes AI & Machine Learning internships, tests neural networks, PyTorch, computer vision, and NLP alignment, and diagnoses domain gaps.",
    isAny: false
  },
  "data-science": {
    title: "📊 Target Domain: Data Science & Big Data",
    desc: "Prioritizes Data Science roles, analyzing your statistical modeling, SQL, Python, pandas, and data visualization proficiency.",
    isAny: false
  },
  fullstack: {
    title: "🌐 Target Domain: Web & Full Stack Development",
    desc: "Focuses on React, Node.js, modern web architecture, frontend and backend development roles.",
    isAny: false
  },
  "cloud-devops": {
    title: "☁️ Target Domain: Cloud Computing & DevOps",
    desc: "Focuses on AWS/Azure, Docker, Kubernetes, CI/CD, and Linux cloud infrastructure roles.",
    isAny: false
  },
  cybersecurity: {
    title: "🛡️ Target Domain: Cybersecurity & InfoSec",
    desc: "Focuses on network defense, vulnerability assessment, ethical hacking, and information security roles.",
    isAny: false
  },
  // 24 Model Dataset Categories
  "information-technology": {
    title: "💻 Target Domain: Information Technology & Systems",
    desc: "Focuses on IT engineering, system administration, active directory, Cisco routing, Linux, and database administration.",
    isAny: false
  },
  engineering: {
    title: "⚙️ Target Domain: Core Engineering & Robotics",
    desc: "Focuses on MATLAB, AutoCAD, CATIA, SolidWorks, embedded systems, IoT, robotics, and mechanical/electrical tracks.",
    isAny: false
  },
  automobile: {
    title: "🚗 Target Domain: Automobile & Automotive Engineering",
    desc: "Focuses on vehicle diagnostics, powertrain, chassis engineering, automotive CAD modeling, and manufacturing systems.",
    isAny: false
  },
  aviation: {
    title: "✈️ Target Domain: Aviation & Aerospace",
    desc: "Focuses on aircraft maintenance, avionics, aerospace engineering, flight operations, and FAA safety compliance.",
    isAny: false
  },
  construction: {
    title: "🏗️ Target Domain: Construction & Civil Engineering",
    desc: "Focuses on construction management, building codes, AutoCAD, site supervision, structural design, and cost estimation.",
    isAny: false
  },
  "business-development": {
    title: "💼 Target Domain: Business Development & Strategy",
    desc: "Focuses on corporate growth, B2B sales, lead generation, CRM pipelines, and strategic partnership management.",
    isAny: false
  },
  "business-dev": {
    title: "💼 Target Domain: Business Development & Strategy",
    desc: "Focuses on corporate growth, B2B sales, lead generation, CRM pipelines, and strategic partnership management.",
    isAny: false
  },
  finance: {
    title: "📈 Target Domain: Finance & Investments",
    desc: "Focuses on financial modeling, FP&A, valuation, financial audits, investment analysis, Excel, and forecasting.",
    isAny: false
  },
  banking: {
    title: "🏦 Target Domain: Banking & Financial Services",
    desc: "Focuses on commercial lending, credit risk assessment, mortgage loans, retail banking, and regulatory compliance.",
    isAny: false
  },
  accountant: {
    title: "📑 Target Domain: Accounting & Auditing",
    desc: "Focuses on general ledger, accounts payable/receivable, month-end closing, tax preparation, reconciliation, and QuickBooks/NetSuite.",
    isAny: false
  },
  consultant: {
    title: "👔 Target Domain: Management & Strategy Consulting",
    desc: "Focuses on management advisory, business process re-engineering, strategy formulations, stakeholder communications, and analytics.",
    isAny: false
  },
  sales: {
    title: "🤝 Target Domain: Sales & Account Management",
    desc: "Focuses on consultative selling, pipeline velocity, retail merchandising, client negotiations, and relationship management.",
    isAny: false
  },
  hr: {
    title: "👥 Target Domain: Human Resources & Talent",
    desc: "Focuses on talent acquisition, onboarding, HRIS tools, employee relations, labor policies, and performance management.",
    isAny: false
  },
  advocate: {
    title: "⚖️ Target Domain: Legal & Advocate Services",
    desc: "Focuses on legal research, advocacy, case management, statutory compliance, contract drafting, and regulatory law.",
    isAny: false
  },
  "public-relations": {
    title: "📢 Target Domain: Public Relations & Communications",
    desc: "Focuses on corporate press releases, crisis communications, media relations, journalism, brand storytelling, and speechwriting.",
    isAny: false
  },
  "digital-media": {
    title: "📱 Target Domain: Digital Marketing & Media",
    desc: "Focuses on SEO, Google Analytics, social media platforms, content strategy, SEM, and performance marketing.",
    isAny: false
  },
  healthcare: {
    title: "🏥 Target Domain: Healthcare & Medical Services",
    desc: "Focuses on patient care, clinical documentation, medical records, HIPAA compliance, healthcare administration, and triage.",
    isAny: false
  },
  teacher: {
    title: "📚 Target Domain: Education, Teaching & Academics",
    desc: "Focuses on lesson planning, curriculum development, instructional design, classroom pedagogy, and student assessment.",
    isAny: false
  },
  chef: {
    title: "👨‍🍳 Target Domain: Culinary Arts & Chef Management",
    desc: "Focuses on culinary techniques, kitchen operations, food safety standards, menu engineering, recipe development, and cost control.",
    isAny: false
  },
  fitness: {
    title: "🏋️ Target Domain: Fitness, Sports & Wellness",
    desc: "Focuses on personal training, exercise physiology, fitness assessments, CPR/First Aid, wellness coaching, and rehabilitation.",
    isAny: false
  },
  agriculture: {
    title: "🌾 Target Domain: Agriculture & Agritech",
    desc: "Focuses on agronomy, crop management, soil science, agribusiness, irrigation planning, farm research, and pest control.",
    isAny: false
  },
  apparel: {
    title: "👗 Target Domain: Fashion, Apparel & Merchandising",
    desc: "Focuses on garment construction, fashion merchandising, apparel design, PLM, trend forecasting, and retail inventory management.",
    isAny: false
  },
  designer: {
    title: "🎨 Target Domain: Design, UI/UX & Creative Arts",
    desc: "Focuses on Figma, UI/UX, product design, wireframing, user research, design systems, 3D modeling, and visual communication.",
    isAny: false
  },
  "ui-ux": {
    title: "🎨 Target Domain: UI/UX & Product Design",
    desc: "Focuses on Figma, UI/UX, product design, wireframing, user research, design systems, and interaction design.",
    isAny: false
  },
  arts: {
    title: "🎭 Target Domain: Creative Arts & Entertainment",
    desc: "Focuses on fine arts, creative writing, illustration, visual storytelling, art direction, and multimedia content creation.",
    isAny: false
  },
  bpo: {
    title: "🎧 Target Domain: BPO & Customer Operations",
    desc: "Focuses on customer support operations, technical troubleshooting, vendor management, voice/non-voice ticketing, and SLA delivery.",
    isAny: false
  },
  bro: {
    title: "🎧 Target Domain: BPO & Customer Operations",
    desc: "Focuses on customer support operations, technical troubleshooting, vendor management, voice/non-voice ticketing, and SLA delivery.",
    isAny: false
  }
};

const domSelectEl = $("#domainSelect");
const helperBoxEl = $("#domainHelperBox");
const helperTitleEl = $("#helperBoxTitle");
const helperDescEl = $("#helperBoxDesc");

if (domSelectEl) {
  domSelectEl.addEventListener("change", (e) => {
    const val = e.target.value;
    const info = DOMAIN_HINTS[val] || DOMAIN_HINTS.any;
    if (helperTitleEl) helperTitleEl.textContent = info.title;
    if (helperDescEl) helperDescEl.textContent = info.desc;
    if (helperBoxEl) helperBoxEl.classList.toggle("active-any", info.isAny);
  });
}

/* =====================================================
   MAIN CALL
   ===================================================== */
$("#analyze").onclick = async () => {
  if (listening && rec) { listening = false; rec.stop(); }
  stopSpeak();
  const fd = new FormData();
  if (mode === "paste") {
    const txt = $("#resume").value.trim();
    if (txt.length < 60) return toast(t("tShort"));
    fd.append("text", txt);
  } else {
    if (!file) return toast(t("tNoFile"));
    fd.append("file", file);
  }
  fd.append("k", k);

  const domSel = $("#domainSelect");
  const selectedDomain = domSel ? domSel.value : "any";
  fd.append("domain", selectedDomain);

  setLoading(true);
  try {
    const r = await fetch(API + "/api/match", { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Server error");
    render(data, true);
  } catch (e) {
    toast(e.message === "Failed to fetch" ? t("tNet") : e.message);
  } finally {
    setLoading(false);
  }
};

/* =====================================================
   RENDER
   ===================================================== */
function chips(list, cls, delayBase, fn) {
  if (!list.length) return `<span class="empty">${t("none")}</span>`;
  return list.map((x, i) => `<span class="chip ${cls}" style="animation-delay:${delayBase + i * 40}ms">${fn(x)}</span>`).join("");
}

/* SVG donut chart — r=38, cx=cy=44, so circumference ≈ 238.76 */
function donut(pct, color) {
  const R = 38, C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;
  return `<svg class="donut-svg" viewBox="0 0 88 88" width="88" height="88">
    <circle cx="44" cy="44" r="${R}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="9"/>
    <circle cx="44" cy="44" r="${R}" fill="none" stroke="${color}" stroke-width="9"
      stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}"
      stroke-dashoffset="${(C / 4).toFixed(2)}"
      stroke-linecap="round" class="donut-arc"/>
    <text x="44" y="47" text-anchor="middle" dominant-baseline="middle"
      font-family="Space Grotesk,Inter,sans-serif" font-size="16" font-weight="700" fill="#ecedf6">${pct}%</text>
  </svg>`;
}

function skillBar(label, count, total, cls) {
  const w = total > 0 ? Math.round((count / total) * 100) : 0;
  return `<div class="an-bar-row">
    <span class="an-bar-label">${label}</span>
    <div class="an-bar-track"><div class="an-bar-fill ${cls}" style="width:${w}%"></div></div>
    <span class="an-bar-val">${count}</span>
  </div>`;
}

function render(d, scroll = true) {
  lastData = d;
  $("#results").hidden = false;

  /* ---- target domain spotlight banner ---- */
  const tdSpotlight = $("#targetDomainSpotlight");
  if (tdSpotlight) {
    if (d.chosen_domain) {
      tdSpotlight.hidden = false;
      tdSpotlight.innerHTML = `
        <div class="td-spotlight-left">
          <div class="td-spotlight-icon">${d.chosen_domain.icon || "🎯"}</div>
          <div class="td-spotlight-text">
            <h4>Target Domain Applied: ${esc(d.chosen_domain.name)}</h4>
            <p>Targeted for <strong>${esc(d.chosen_domain.name)}</strong> · ${esc(lang === 'hi' ? d.chosen_domain.status_hi : d.chosen_domain.status)} (${d.chosen_domain.matched_count} matching skills detected)</p>
          </div>
        </div>
        <div class="td-spotlight-right">
          <span class="badge ${d.chosen_domain.badge_type}">${esc(lang === 'hi' ? d.chosen_domain.status_hi : d.chosen_domain.status)}</span>
          <span class="td-fit-number">${d.chosen_domain.score}%</span>
        </div>
      `;
    } else {
      tdSpotlight.hidden = true;
    }
  }

  /* ---- cross-domain compatibility diagnostic ---- */
  const crossCompatCard = $("#crossCompatCard");
  if (crossCompatCard && d.domain_compatibility) {
    crossCompatCard.hidden = false;

    const compCount = (d.compatible_domains || []).length;
    const countBadge = $("#compatCountText");
    if (countBadge) {
      countBadge.textContent = lang === "hi" 
        ? `${compCount} अनुकूल डोमेन मिले`
        : `${compCount} Compatible Domains Found`;
    }

    const titleEl = $("#compatSectionTitle");
    const descEl = $("#compatSectionDesc");
    if (d.chosen_domain) {
      if (titleEl) titleEl.textContent = lang === "hi" ? "अतिरिक्त अनुकूल डोमेन विश्लेषण" : "Cross-Domain Compatibility Diagnostic";
      if (descEl) descEl.textContent = lang === "hi"
        ? `आपके द्वारा चुने गए ${d.chosen_domain.name} के अलावा, आपकी स्किल्स इन डोमेन्स के साथ भी मेल खाती हैं:`
        : `Along with your chosen ${d.chosen_domain.name} track, here are other domains your skill profile is compatible with:`;
    } else {
      if (titleEl) titleEl.textContent = lang === "hi" ? "क्रॉस-डोमेन अनुकूलता विश्लेषण (All Domains)" : "Cross-Domain Compatibility Diagnostic (Any Domain Mode)";
      if (descEl) descEl.textContent = lang === "hi"
        ? "AI इंजन ने सभी डोमेन्स का विश्लेषण किया है। यहाँ वे डोमेन्स दिखाए गए हैं जिनके साथ आपका रिज़्यूमे अनुकूल है:"
        : "Our semantic AI analyzed your skills across all domains. Here are the domains your resume is most compatible with:";
    }

    // Top compatible domains or top 4
    const topDomains = (d.compatible_domains && d.compatible_domains.length) 
      ? d.compatible_domains 
      : d.domain_compatibility.slice(0, 4);

    const renderDomainCard = (c) => `
      <div class="compat-item-card ${c.is_compatible ? 'is-top-compat' : ''} ${d.chosen_domain && d.chosen_domain.id === c.id ? 'is-chosen' : ''}">
        <div class="compat-card-top">
          <span class="compat-domain-name"><span class="compat-domain-icon">${c.icon}</span> ${esc(c.name)}</span>
          <span class="compat-score-val ${c.score >= 75 ? 'high' : c.score >= 50 ? 'moderate' : ''}">${c.score}%</span>
        </div>
        <div class="compat-bar-track">
          <div class="compat-bar-fill ${c.score >= 75 ? 'fill-high' : c.score >= 50 ? 'fill-mid' : 'fill-low'}" style="width:${c.score}%"></div>
        </div>
        <div class="compat-status-row">
          <span class="compat-status-pill ${c.badge_type}">${esc(lang === 'hi' ? c.status_hi : c.status)}</span>
          <small style="color:var(--mut)">${c.matched_count} ${lang === 'hi' ? 'स्किल्स मेल खाई' : 'skills overlap'}</small>
        </div>
        ${c.matched_skills && c.matched_skills.length ? `
          <div class="compat-skills-hint">
            <span style="opacity:0.75">${lang === 'hi' ? 'मैच स्किल्स:' : 'Matching skills:'}</span>
            ${c.matched_skills.map(s => `<span class="compat-skill-chip">${esc(s)}</span>`).join('')}
          </div>` : ''}
      </div>
    `;

    const spotlightGrid = $("#compatSpotlightGrid");
    if (spotlightGrid) {
      spotlightGrid.innerHTML = topDomains.map(renderDomainCard).join("");
    }

    const allGrid = $("#allDomainsGrid");
    if (allGrid) {
      allGrid.innerHTML = d.domain_compatibility.map(renderDomainCard).join("");
    }

    // Toggle button for all domains
    const toggleBtn = $("#toggleAllDomainsBtn");
    const allCollapsible = $("#allDomainsCollapsible");
    const toggleArrow = $("#toggleAllArrow");
    if (toggleBtn && allCollapsible) {
      toggleBtn.onclick = () => {
        const isOpen = allCollapsible.classList.toggle("open");
        if (toggleArrow) toggleArrow.textContent = isOpen ? "▲" : "▼";
        toggleBtn.querySelector("span").textContent = isOpen 
          ? (lang === 'hi' ? "सभी डोमेन छुपाएँ" : "Hide All Domains Overview")
          : (lang === 'hi' ? "सभी 12 डोमेन का विवरण देखें" : "Show All 12 Domains Overview");
      };
    }
  }

  /* ---- translated text box ---- */
  const xl = $("#xlate");
  if (d.english_text) { xl.hidden = false; $("#xlateText").textContent = d.english_text; }
  else xl.hidden = true;

  /* ---- header scorecard ---- */
  $("#sTitle").textContent = d.parsed.title || t("notDetected");
  $("#sSkills").textContent = d.parsed.n_skills;
  $("#sCat").textContent = catName(d.top_categories[0].category);

  /* ---- domain probability bars ---- */
  $("#catBars").innerHTML = d.top_categories.map((c) => `
    <div class="bar">
      <div class="bar-top"><span>${fmt(c.category)}</span><b>${(c.prob * 100).toFixed(1)}%</b></div>
      <div class="track"><div class="fill" data-w="${Math.max(c.prob * 100, 1.5)}"></div></div>
    </div>`).join("");

  /* ---- lacking skills report aggregation ---- */
  const missingCount = {};
  const relatedList = [];
  (d.matches || []).forEach((m) => {
    (m.to_build || []).forEach((s) => {
      missingCount[s] = (missingCount[s] || 0) + 1;
    });
    (m.related || []).forEach((r) => {
      relatedList.push(r);
    });
  });

  const missingSorted = Object.entries(missingCount).sort((a, b) => b[1] - a[1]);
  const totalLacking = missingSorted.length;
  const bridgeableCount = relatedList.length;
  const estWeeks = Math.max(2, Math.min(8, Math.ceil(totalLacking * 0.75)));

  const gapEl = $("#gapReportBody");
  if (gapEl) {
    if (totalLacking === 0) {
      gapEl.innerHTML = `<div class="gap-advice-box"><span>🎉 Excellent fit! No critical skill gaps identified across top matched roles.</span></div>`;
    } else {
      const chipsHtml = missingSorted.map(([skill, count]) => {
        const isHigh = count >= 2 || count === (d.matches || []).length;
        const cls = isHigh ? "high-priority" : "moderate";
        const tag = isHigh ? (lang === "hi" ? "अति महत्वपूर्ण" : "High Priority") : (lang === "hi" ? "सुझावित" : "Recommended");
        return `<span class="gap-chip ${cls}">${esc(skill)} <span class="gap-chip-tag">${tag} (${count} matches)</span></span>`;
      }).join("");

      const relHtml = relatedList.slice(0, 5).map(r =>
        `<span class="gap-chip related-bridge">${esc(r.required)} <span class="gap-chip-tag">≈ ${esc(r.found)}</span></span>`
      ).join("");

      gapEl.innerHTML = `
        <div class="gap-summary-stats">
          <div class="gap-stat-pill">
            <span class="gap-stat-num" style="color:var(--bad)">${totalLacking}</span>
            <span class="gap-stat-label">${lang === "hi" ? "कमी वाली स्किल्स" : "Missing Skills Identified"}</span>
          </div>
          <div class="gap-stat-pill">
            <span class="gap-stat-num" style="color:var(--warn)">${bridgeableCount}</span>
            <span class="gap-stat-label">${lang === "hi" ? "मिलती-जुलती स्किल्स" : "Bridgeable Wordings"}</span>
          </div>
          <div class="gap-stat-pill">
            <span class="gap-stat-num" style="color:var(--b)">${estWeeks} ${lang === "hi" ? "सप्ताह" : "Weeks"}</span>
            <span class="gap-stat-label">${lang === "hi" ? "अनुमानित तैयारी समय" : "Est. Timeline to Bridge"}</span>
          </div>
        </div>
        <div class="gap-skills-grid">
          ${chipsHtml}
          ${relHtml}
        </div>
        <div class="gap-advice-box">
          <span>💡 <strong>${lang === "hi" ? "सुझाव:" : "Recommendation:"}</strong> ${lang === "hi"
            ? "हाई प्रायोरिटी स्किल्स पर पहले ध्यान दें। अपने प्रोजेक्ट्स में इन्हें शामिल करके रिज़्यूमे तुरंत अपडेट करें।"
            : "Focus on High Priority skills first to unlock the top 80%+ match tier. Add targeted mini-projects or certifications to your resume."}</span>
        </div>
      `;
    }
  }

  // Setup download gap report button
  const downloadBtn = $("#downloadGapReportBtn");
  if (downloadBtn) {
    downloadBtn.onclick = () => downloadGapReport(d, missingSorted, relatedList, estWeeks);
  }

  /* ---- match cards ---- */
  const cls = { "Strong fit": "ok", "Good, minor gaps": "warn", "Needs upskilling": "bad" };
  const rdColor = { ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)" };

  $("#matches").innerHTML = d.matches.map((m, i) => {
    const rc = cls[m.readiness] || "warn";
    const rdText = t("rd")[m.readiness] || m.readiness;
    const covPct = pct(m.coverage);
    const confPct = pct(m.confidence);
    const totalSkills = m.matched.length + m.related.length + m.to_build.length;

    return `
    <article class="card match ${i === 0 ? "best" : ""}" style="animation-delay:${i * 130}ms">

      <!-- ===== CARD HEADER ===== -->
      <div class="m-head">
        <div class="rank">${i + 1}</div>
        <div class="m-title">
          <h4>${esc(m.title)}</h4>
          <span class="tag">${fmt(m.category)}</span>
        </div>
        <span class="badge ${rc} badge-rd">${esc(rdText)}</span>
      </div>

      <!-- ===== ANALYTICS ROW ===== -->
      <div class="an-row">

        <!-- Donut: coverage -->
        <div class="an-donut-cell">
          ${donut(covPct, rdColor[rc])}
          <div class="an-donut-label">${t("skillCov")}</div>
        </div>

        <!-- Donut: match score -->
        <div class="an-donut-cell">
          ${donut(confPct, confPct >= 60 ? "var(--ok)" : confPct >= 30 ? "var(--warn)" : "var(--bad)")}
          <div class="an-donut-label">${t("confidence")}</div>
        </div>

        <!-- Skill breakdown bars -->
        <div class="an-bars-cell">
          <div class="an-bars-title">${lang === "hi" ? "स्किल विश्लेषण" : "Skill breakdown"}</div>
          ${skillBar(t("have"),    m.matched.length,  totalSkills, "fill-ok")}
          ${skillBar(t("related"), m.related.length,  totalSkills, "fill-warn")}
          ${skillBar(t("build"),   m.to_build.length, totalSkills, "fill-bad")}
        </div>

      </div>

      <!-- ===== SKILL CHIPS ===== -->
      <div class="group"><h5><span class="dot" style="background:var(--ok)"></span>${t("have")}</h5>
        <div class="chips">${chips(m.matched, "have", 300 + i * 130, (s) => esc(s))}</div></div>
      <div class="group"><h5><span class="dot" style="background:var(--warn)"></span>${t("related")}</h5>
        <div class="chips">${chips(m.related, "rel", 400 + i * 130, (r) => `${esc(r.required)} <em>≈ ${esc(r.found)}</em>`)}</div></div>
      <div class="group"><h5><span class="dot" style="background:var(--bad)"></span>${t("build")}</h5>
        <div class="chips">${chips(m.to_build, "miss", 500 + i * 130, (s) => esc(s))}</div></div>

      <button class="listen-btn" data-i="${i}" data-label="${esc(t("listenSum"))}"><span class="ico">▶</span><span class="lbl">${t("listenSum")}</span></button>
      <button class="coach-btn" data-i="${i}"><span class="spark">✦</span> ${t("getCoach")}<span class="spinner"></span></button>
      <div class="coach" id="coach-${i}"></div>
    </article>`;
  }).join("");

  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$(".fill").forEach((f) => (f.style.width = f.dataset.w + "%"));
    $$(".donut-arc").forEach((arc) => arc.style.opacity = "1");
  }));

  if (scroll) $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =====================================================
   AI COACH
   ===================================================== */
const SKELETON = `<div class="sk"></div><div class="sk s2"></div><div class="sk s3"></div>`;

$("#matches").addEventListener("click", async (e) => {
  const btn = e.target.closest(".coach-btn");
  if (!btn || btn.classList.contains("loading")) return;
  const i = +btn.dataset.i, box = $("#coach-" + i);
  btn.classList.add("loading");
  box.classList.add("open");
  box.innerHTML = SKELETON;
  try {
    const r = await fetch(API + "/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: lastData.parsed, match: lastData.matches[i], lang }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || "Coach error");
    lastCoach[i] = data;
    box.innerHTML = renderCoach(data, i);
    btn.style.display = "none";
  } catch (err) {
    box.innerHTML = `<p class="coach-err">${esc(err.message)}</p>`;
  } finally {
    btn.classList.remove("loading");
  }
});

function renderCoach(c, i) {
  const why = (c.why_fit || []).map((x) => `<li>${esc(x)}</li>`).join("");
  const road = (c.roadmap || []).map((r, n) => `
    <div class="step" style="animation-delay:${n * 90}ms">
      <div class="step-dot"></div>
      <div class="step-body">
        <div class="step-top"><span class="wk">${esc(weekLabel(r.week))}</span><span class="sk-name">${esc(r.skill)}</span></div>
        <p><b>${lang === "hi" ? "लक्ष्य" : "Goal"}:</b> ${esc(r.goal)}</p>
        <p><b>${lang === "hi" ? "क्या करें" : "Action"}:</b> ${esc(r.action)}</p>
      </div>
    </div>`).join("");
  const tips = (c.resume_tips || []).map((x) =>
    `<div class="tip"><span class="chip rel" style="opacity:1;animation:none">${esc(x.skill)}</span><p>${esc(x.tip)}</p></div>`).join("");
  /* Gap score = % of roadmap items that are missing (not just related) */
  const m = lastData && lastData.matches[i];
  const gapCount = m ? m.to_build.length : 0;
  const totalSkills = m ? m.matched.length + m.related.length + m.to_build.length : 1;
  const readinessScore = m ? Math.round(((m.matched.length + m.related.length * 0.5) / Math.max(totalSkills, 1)) * 100) : 0;
  return `
    <div class="coach-head"><span class="spark">✦</span> ${t("coachTitle")} <small>${t("coachSub")}</small></div>
    <!-- Recruiter scorecard -->
    <div class="recruiter-card">
      <div class="rc-metric">
        <span class="rc-val" style="color:var(--ok)">${readinessScore}%</span>
        <span class="rc-label">${lang === "hi" ? "तैयारी स्कोर" : "Readiness Score"}</span>
      </div>
      <div class="rc-divider"></div>
      <div class="rc-metric">
        <span class="rc-val" style="color:var(--bad)">${gapCount}</span>
        <span class="rc-label">${lang === "hi" ? "स्किल गैप" : "Skill Gaps"}</span>
      </div>
      <div class="rc-divider"></div>
      <div class="rc-metric">
        <span class="rc-val" style="color:var(--warn)">${road ? (c.roadmap || []).length : 0}</span>
        <span class="rc-label">${lang === "hi" ? "रोडमैप सप्ताह" : "Roadmap Weeks"}</span>
      </div>
    </div>
    <button class="listen-btn listen-coach" data-i="${i}" data-label="${esc(t("listenCoach"))}"><span class="ico">▶</span><span class="lbl">${t("listenCoach")}</span></button>
    <p class="coach-sum">${esc(c.summary || "")}</p>
    ${why ? `<h6>${t("why")}</h6><ul class="why">${why}</ul>` : ""}
    ${road ? `<h6>${t("road")}</h6><div class="timeline">${road}</div>` : ""}
    ${tips ? `<h6>${t("tips")}</h6><div class="tips">${tips}</div>` : ""}`;
}

/* =====================================================
   VOICE INPUT (speech to text)
   ===================================================== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const ta = $("#resume"), micBtn = $("#micBtn");

function setMic(on) {
  micBtn.classList.toggle("on", on);
  $("#micLabel").textContent = !SR ? t("micNo") : on ? t("micOn") : t("mic");
}

if (!SR) {
  micBtn.disabled = true;
} else {
  rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  let baseText = "", finalText = "";

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += txt.trim() + " ";
      else interim += txt;
    }
    ta.value = baseText + finalText + interim;
    $("#charCount").textContent = ta.value.length;
  };
  rec.onend = () => { if (listening) { try { rec.start(); } catch (_) {} } else setMic(false); };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") { listening = false; setMic(false); toast(t("tMic")); }
    else if (e.error === "audio-capture") { listening = false; setMic(false); toast(t("tNoMic")); }
  };
  micBtn.onclick = () => {
    if (listening) { listening = false; rec.stop(); return; }
    baseText = ta.value.trim() ? ta.value.trim() + "\n" : "";
    finalText = "";
    rec.lang = $("#voiceLang").value;
    listening = true;
    try { rec.start(); setMic(true); } catch (_) {}
  };
}

/* =====================================================
   VOICE OUTPUT (text to speech)
   ===================================================== */
const synth = window.speechSynthesis;
let voices = [], speakingBtn = null, token = 0;
function loadVoices() { voices = synth ? synth.getVoices() : []; }
if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }
const pickVoice = (l) => voices.find((v) => v.lang.replace("_", "-") === l) || voices.find((v) => v.lang.startsWith(l.slice(0, 2))) || null;

function resetBtn() {
  if (!speakingBtn) return;
  speakingBtn.classList.remove("playing");
  speakingBtn.querySelector(".ico").textContent = "▶";
  speakingBtn.querySelector(".lbl").textContent = speakingBtn.dataset.label;
  speakingBtn = null;
}
function stopSpeak() { token++; if (synth) synth.cancel(); resetBtn(); }

function speak(text, btn, l) {
  if (!synth) return toast(t("tNoTts"));
  const same = speakingBtn === btn;
  stopSpeak();
  if (same) return;
  const v = pickVoice(l);
  if (!v && l.startsWith("hi")) return toast(t("tNoVoice"));
  const my = ++token;
  speakingBtn = btn;
  btn.classList.add("playing");
  btn.querySelector(".ico").textContent = "■";
  btn.querySelector(".lbl").textContent = t("stop");
  const parts = (text.match(/[^.!?।\n]+[.!?।]?/g) || [text]).map((s) => s.trim()).filter(Boolean);
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    if (v) u.voice = v;
    u.lang = v ? v.lang : l;
    if (i === parts.length - 1) u.onend = () => { if (my === token) resetBtn(); };
    u.onerror = () => { if (my === token) resetBtn(); };
    synth.speak(u);
  });
}

function matchSpeech(m, i) {
  return t("sp")(i, m, catName(m.category), m.matched.slice(0, 5), m.to_build.slice(0, 5),
                 pct(m.coverage), t("rd")[m.readiness] || m.readiness);
}
function coachSpeech(c) {
  let s = (c.summary || "") + " ";
  if ((c.why_fit || []).length) s += t("why") + ". " + c.why_fit.join(". ") + ". ";
  (c.roadmap || []).forEach((r) => { s += `${weekLabel(r.week)}: ${r.skill}. ${r.goal}. ${r.action}. `; });
  return s;
}

$("#matches").addEventListener("click", (e) => {
  const b = e.target.closest(".listen-btn");
  if (!b) return;
  const i = +b.dataset.i;
  if (b.classList.contains("listen-coach")) {
    const c = lastCoach[i];
    speak(coachSpeech(c), b, TTS_LANG[c.lang || lang]);
  } else speak(matchSpeech(lastData.matches[i], i), b, TTS_LANG[lang]);
});

function downloadGapReport(d, missingSorted, relatedList, estWeeks) {
  const candidateTitle = d.parsed.title || "Applicant";
  const domain = d.top_categories[0]?.category || "General";
  const dateStr = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

  let report = `=======================================================\n`;
  report += `INTERNMATCH — APPLICANT SKILL GAP & READINESS REPORT\n`;
  report += `=======================================================\n`;
  report += `Date: ${dateStr}\n`;
  report += `Candidate Profile: ${candidateTitle}\n`;
  report += `Predicted Target Domain: ${domain}\n`;
  report += `Detected Skills Count: ${d.parsed.n_skills}\n`;
  report += `Estimated Upskilling Time: ${estWeeks} Weeks\n\n`;

  report += `-------------------------------------------------------\n`;
  report += `1. TOP MATCHED ROLES & READINESS SCORES\n`;
  report += `-------------------------------------------------------\n`;
  (d.matches || []).forEach((m, i) => {
    report += `${i + 1}. ${m.title} (${m.category})\n`;
    report += `   - Match Readiness: ${m.readiness}\n`;
    report += `   - Skill Coverage: ${Math.round(m.coverage * 100)}%\n`;
    report += `   - Matched Skills: ${m.matched.join(", ") || "None"}\n`;
    report += `   - Missing Skills: ${m.to_build.join(", ") || "None"}\n\n`;
  });

  report += `-------------------------------------------------------\n`;
  report += `2. LACKING SKILLS BREAKDOWN (PRIORITIZED FOR HIRING)\n`;
  report += `-------------------------------------------------------\n`;
  if (missingSorted.length === 0) {
    report += `No critical missing skills! Profile demonstrates strong alignment.\n\n`;
  } else {
    missingSorted.forEach(([skill, count], idx) => {
      const priority = count >= 2 ? "HIGH PRIORITY" : "RECOMMENDED";
      report += `[${priority}] ${idx + 1}. ${skill} (Required across ${count} target roles)\n`;
    });
    report += `\n`;
  }

  if (relatedList.length > 0) {
    report += `-------------------------------------------------------\n`;
    report += `3. RESUME REWORDING OPPORTUNITIES (RELATED SKILLS)\n`;
    report += `-------------------------------------------------------\n`;
    relatedList.forEach(r => {
      report += `• Posting asks for: "${r.required}" -> Your resume has: "${r.found}"\n`;
      report += `  Tip: Mention "${r.required}" explicitly in bullet points.\n`;
    });
    report += `\n`;
  }

  report += `-------------------------------------------------------\n`;
  report += `4. STRATEGIC CAREER ROADMAP ADVICE\n`;
  report += `-------------------------------------------------------\n`;
  report += `• Focus 70% of learning effort on the High Priority skills identified above.\n`;
  report += `• Build 1 capstone project that combines your existing matched skills with\n`;
  report += `  at least two missing skills to demonstrate applied competency.\n`;
  report += `• Re-evaluate your resume once updated to verify match percentage growth.\n\n`;
  report += `Generated by InternMatch AI Engine · Empowering Student Careers across India\n`;

  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `InternMatch_Skill_Gap_Report_${candidateTitle.replace(/\s+/g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast(lang === "hi" ? "✓ स्किल गैप रिपोर्ट सफलतापूर्वक डाउनलोड हो गई!" : "✓ Lacking Skills Report downloaded successfully!");
}

window.addEventListener("beforeunload", () => synth && synth.cancel());

/* =====================================================
   INIT
   ===================================================== */
showSection("landing");
applyLang();
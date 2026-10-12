import re
import joblib
import faiss
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from pathlib import Path
from transformers import AutoTokenizer, AutoModel
from sentence_transformers import SentenceTransformer

ART = Path(__file__).parent / "artifacts"
MODEL = "sentence-transformers/all-MiniLM-L12-v2"
MAXLEN = 512
SEM_THR = 0.60      # "related skill" threshold (0.5 to 0.7 try kar sakte ho)
RW = 1.0            # category-probability rerank weight
device = "cuda" if torch.cuda.is_available() else "cpu"

# noisy mined skills jo report mein nahi dikhane
JUNK = {"avid", "artist", "edi", "subject matter expert", "posters", "ads",
        "office", "delivery", "clients", "organizational"}


# ---------- helpers (notebook se same) ----------
def norm(t):
    return re.sub(r"\s+", " ", str(t)).strip()


def toks(text):
    return [w.rstrip(".-") for w in re.findall(r"[a-z0-9][a-z0-9+#.\-]*", text.lower())]


def skey(s):
    return " ".join(toks(s))


def skill_list(s):
    out = []
    for x in re.split(r",|;|\||•", s):
        k = skey(x)
        if 2 <= len(k) <= 35 and len(k.split()) <= 4 and not k.isdigit():
            out.append(k)
    return list(dict.fromkeys(out))


def ngrams(text, nmax=4):
    tk, s = toks(text), set()
    for n in range(1, nmax + 1):
        for i in range(len(tk) - n + 1):
            s.add(" ".join(tk[i:i + n]))
    return s


def parse_resume(raw):
    raw = str(raw)
    lines = [l.strip() for l in raw.strip().split("\n") if l.strip()]
    title = norm(lines[0])[:80] if lines else ""
    t = norm(raw)
    i = t.rfind(" Skills ")
    skills = t[i + 8:][:900] if i != -1 else ""
    m = re.search(r"\bSummary (.*?)(?= (?:Highlights|Accomplishments|Experience|Education|Skills) )", t)
    summary = m.group(1)[:700] if m else ""
    j = t.find(" Experience ")
    exp = t[j + 12:] if j != -1 else t
    if i != -1 and j != -1 and i > j:
        exp = t[j + 12:i]
    return dict(title=title, skills=skills, summary=summary, exp=exp[:4000])


def build_text(r, use_title=True):
    parts = []
    if use_title and r["title"]:
        parts.append(f"Title: {r['title']}.")
    if r["skills"]:
        parts.append(f"Skills: {r['skills']}.")
    if r["summary"]:
        parts.append(f"Summary: {r['summary']}.")
    parts.append(f"Experience: {r['exp']}")
    return " ".join(parts)


def parse_list(s):
    # postings.csv mein skills "[np.str_('x'), ...]" ya "['x', ...]" dono format mein ho sakte hain
    if isinstance(s, list):
        return s
    return re.findall(r"'([^']+)'", str(s))


# ---------- model ----------
class Matcher(nn.Module):
    def __init__(self, name, n_cls, scale=30.0):
        super().__init__()
        self.enc = AutoModel.from_pretrained(name)
        self.W = nn.Parameter(torch.randn(n_cls, self.enc.config.hidden_size) * 0.02)
        self.scale = scale

    def forward(self, ids, mask):
        h = self.enc(input_ids=ids, attention_mask=mask).last_hidden_state
        m = mask.unsqueeze(-1).to(h.dtype)
        e = F.normalize(((h * m).sum(1) / m.sum(1).clamp(min=1e-9)).float(), dim=-1)
        return self.scale * e @ F.normalize(self.W, dim=-1).T, e


# ---------- student & industry domain taxonomy (all 24 dataset categories + tech specializations) ----------
DOMAINS = [
    # --- Popular Tech Specialization Tracks ---
    {
        "id": "aiml",
        "alias_ids": ["ai-ml"],
        "name": "AI & Machine Learning",
        "short": "AIML",
        "icon": "🤖",
        "categories": ["INFORMATION-TECHNOLOGY", "ENGINEERING"],
        "skills": ["python", "machine learning", "deep learning", "pytorch", "tensorflow", "nlp", "computer vision", "neural networks", "scikit-learn", "data science", "keras", "pandas", "numpy", "transformers", "llm", "opencv"],
        "postings_title": "AI & Machine Learning Intern"
    },
    {
        "id": "data-science",
        "alias_ids": ["data-eng", "analytics"],
        "name": "Data Science & Big Data",
        "short": "Data Science",
        "icon": "📊",
        "categories": ["INFORMATION-TECHNOLOGY", "FINANCE"],
        "skills": ["python", "r", "sql", "pandas", "numpy", "data analysis", "statistics", "data visualization", "tableau", "power bi", "machine learning", "data mining", "excel", "spark", "business intelligence"],
        "postings_title": "Data Science & Analytics Intern"
    },
    {
        "id": "fullstack",
        "alias_ids": ["web-dev", "frontend", "backend"],
        "name": "Web & Full Stack Development",
        "short": "Full Stack",
        "icon": "🌐",
        "categories": ["INFORMATION-TECHNOLOGY", "DESIGNER"],
        "skills": ["javascript", "typescript", "react", "node.js", "html", "css", "express", "mongodb", "next.js", "frontend", "backend", "rest api", "git", "tailwind", "sql"],
        "postings_title": "Full Stack Web Developer Intern"
    },
    {
        "id": "cloud-devops",
        "alias_ids": ["devops", "cloud"],
        "name": "Cloud Computing & DevOps",
        "short": "Cloud / DevOps",
        "icon": "☁️",
        "categories": ["INFORMATION-TECHNOLOGY", "ENGINEERING"],
        "skills": ["aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "linux", "terraform", "ansible", "cloud computing", "git", "bash", "jenkins"],
        "postings_title": "Cloud & DevOps Infrastructure Intern"
    },
    {
        "id": "cybersecurity",
        "alias_ids": ["infosec", "security"],
        "name": "Cybersecurity & InfoSec",
        "short": "Cybersecurity",
        "icon": "🛡️",
        "categories": ["INFORMATION-TECHNOLOGY"],
        "skills": ["cybersecurity", "network security", "penetration testing", "ethical hacking", "cryptography", "firewalls", "siem", "vulnerability assessment", "linux", "wireshark", "information security"],
        "postings_title": "Cybersecurity & InfoSec Intern"
    },

    # --- Core Model Categories (24 Categories) ---
    {
        "id": "information-technology",
        "alias_ids": ["it", "software-it"],
        "name": "Information Technology & Systems",
        "short": "IT Systems",
        "icon": "💻",
        "categories": ["INFORMATION-TECHNOLOGY"],
        "skills": ["networking", "windows server", "active directory", "cisco routers", "vmware", "system administration", "linux", "troubleshooting", "sql", "python", "technical support", "help desk support", "cisco certified network associate", "microsoft sql server"],
        "postings_title": "Information Technology Intern"
    },
    {
        "id": "engineering",
        "alias_ids": ["core-eng", "robotics"],
        "name": "Core Engineering & Robotics",
        "short": "Core Eng",
        "icon": "⚙️",
        "categories": ["ENGINEERING"],
        "skills": ["matlab", "autocad", "catia", "solidworks", "c++", "embedded systems", "iot", "robotics", "plc", "circuits", "electrical", "mechanical", "statistical process control", "ansys"],
        "postings_title": "Engineering Intern"
    },
    {
        "id": "automobile",
        "alias_ids": ["auto", "automotive"],
        "name": "Automobile & Automotive Engineering",
        "short": "Automobile",
        "icon": "🚗",
        "categories": ["AUTOMOBILE"],
        "skills": ["mechanical", "automobile", "powertrain", "chassis", "vehicle diagnostics", "cad", "catia", "solidworks", "manufacturing", "automotive design", "purchasing", "maintenance"],
        "postings_title": "Automobile Engineering Intern"
    },
    {
        "id": "aviation",
        "alias_ids": ["aerospace"],
        "name": "Aviation & Aerospace",
        "short": "Aviation",
        "icon": "✈️",
        "categories": ["AVIATION"],
        "skills": ["general aviation", "aircraft maintenance", "avionics", "aerospace", "aviation maintenance", "sheet metal", "technical manuals", "flight operations", "safety compliance", "inspections"],
        "postings_title": "Aviation Intern"
    },
    {
        "id": "construction",
        "alias_ids": ["civil"],
        "name": "Construction & Civil Engineering",
        "short": "Construction",
        "icon": "🏗️",
        "categories": ["CONSTRUCTION"],
        "skills": ["construction management", "building codes", "autocad", "contract administration", "site supervision", "renovations", "structural design", "cost estimation", "safety inspection", "energy management"],
        "postings_title": "Construction Intern"
    },
    {
        "id": "business-development",
        "alias_ids": ["business-dev", "bd"],
        "name": "Business Development & Strategy",
        "short": "Business Dev",
        "icon": "💼",
        "categories": ["BUSINESS-DEVELOPMENT"],
        "skills": ["business development", "technical sales", "telemarketing", "cold calling", "direct sales", "inside sales", "online marketing", "b2b", "lead generation", "crm", "client relationship", "negotiation", "presentations"],
        "postings_title": "Business Development Intern"
    },
    {
        "id": "finance",
        "alias_ids": ["fintech", "investments"],
        "name": "Finance & Investments",
        "short": "Finance",
        "icon": "📈",
        "categories": ["FINANCE"],
        "skills": ["financial planning and analysis", "financial modeling", "financial audits", "oracle financials", "financial operations", "essbase", "valuation", "excel", "account reconciliation", "budgeting", "fp&a"],
        "postings_title": "Finance Intern"
    },
    {
        "id": "banking",
        "alias_ids": ["bank"],
        "name": "Banking & Financial Services",
        "short": "Banking",
        "icon": "🏦",
        "categories": ["BANKING"],
        "skills": ["commercial lending", "credit risk", "mortgage loans", "retail banking", "risk analysis", "fixed income", "lending", "kyc", "compliance", "loan processing", "calculus"],
        "postings_title": "Banking Intern"
    },
    {
        "id": "accountant",
        "alias_ids": ["accounting", "audit"],
        "name": "Accounting & Auditing",
        "short": "Accountant",
        "icon": "📑",
        "categories": ["ACCOUNTANT"],
        "skills": ["general ledger accounting", "accounts payable and receivable", "reconciliations", "tax preparation", "netsuite", "gl", "job costing", "month end closing", "peachtree", "financial statements", "quickbooks"],
        "postings_title": "Accountant Intern"
    },
    {
        "id": "consultant",
        "alias_ids": ["consulting", "strategy"],
        "name": "Management & Strategy Consulting",
        "short": "Consulting",
        "icon": "👔",
        "categories": ["CONSULTANT"],
        "skills": ["management consulting", "business strategy", "process development", "client advisory", "stakeholder management", "project management", "problem solving", "presentations", "legal compliance"],
        "postings_title": "Consulting Intern"
    },
    {
        "id": "sales",
        "alias_ids": ["sales-rep"],
        "name": "Sales & Account Management",
        "short": "Sales",
        "icon": "🤝",
        "categories": ["SALES"],
        "skills": ["sales", "customer service experience", "store merchandising", "pipeline management", "negotiation", "account management", "lead conversion", "market trends", "client relationships", "retail sales"],
        "postings_title": "Sales Intern"
    },
    {
        "id": "hr",
        "alias_ids": ["human-resources", "talent"],
        "name": "Human Resources & Talent Acquisition",
        "short": "HR",
        "icon": "👥",
        "categories": ["HR"],
        "skills": ["recruitment", "talent acquisition", "onboarding", "hris", "employee relations", "hr policies", "screening", "employee handbooks", "organization development", "job analysis", "benefits administration", "performance appraisal"],
        "postings_title": "HR Intern"
    },
    {
        "id": "advocate",
        "alias_ids": ["legal", "law"],
        "name": "Legal & Advocate Services",
        "short": "Advocate",
        "icon": "⚖️",
        "categories": ["ADVOCATE"],
        "skills": ["legal research", "advocacy", "case management", "statutory compliance", "contracts", "legal documentation", "regulatory compliance", "client counseling", "assist patients", "mental health"],
        "postings_title": "Advocate Legal Intern"
    },
    {
        "id": "public-relations",
        "alias_ids": ["pr", "communications"],
        "name": "Public Relations & Corporate Communications",
        "short": "Public Relations",
        "icon": "📢",
        "categories": ["PUBLIC-RELATIONS"],
        "skills": ["press releases", "crisis communications", "media relations", "copywriting", "journalism", "publicity", "press kits", "branding", "corporate communications", "speeches", "media pitching"],
        "postings_title": "Public Relations Intern"
    },
    {
        "id": "digital-media",
        "alias_ids": ["marketing", "digital-marketing"],
        "name": "Digital Marketing & Media",
        "short": "Digital Media",
        "icon": "📱",
        "categories": ["DIGITAL-MEDIA"],
        "skills": ["search engine optimization", "seo", "google analytics", "social media platforms", "content creation", "digital marketing", "sem", "ecommerce", "campaign management", "copywriting", "editorial"],
        "postings_title": "Digital Media Intern"
    },
    {
        "id": "healthcare",
        "alias_ids": ["health", "medical"],
        "name": "Healthcare & Medical Services",
        "short": "Healthcare",
        "icon": "🏥",
        "categories": ["HEALTHCARE"],
        "skills": ["patient care", "medical records", "healthcare", "hipaa", "meditech", "icd-10", "infection control", "clinical documentation", "acute care", "health information technology", "medicare"],
        "postings_title": "Healthcare Intern"
    },
    {
        "id": "teacher",
        "alias_ids": ["education", "teaching"],
        "name": "Education, Teaching & Academics",
        "short": "Education",
        "icon": "📚",
        "categories": ["TEACHER"],
        "skills": ["lesson planning", "curriculum development", "teaching", "classroom management", "pedagogy", "instructional design", "student assessment", "educational technology", "educator", "math"],
        "postings_title": "Teacher Education Intern"
    },
    {
        "id": "chef",
        "alias_ids": ["culinary", "cook"],
        "name": "Culinary Arts & Chef Management",
        "short": "Chef / Culinary",
        "icon": "👨‍🍳",
        "categories": ["CHEF"],
        "skills": ["cooking", "restaurant operations", "food safety", "recipe development", "kitchen management", "cost control", "menu planning", "sanitation", "culinary arts", "costing"],
        "postings_title": "Culinary Chef Intern"
    },
    {
        "id": "fitness",
        "alias_ids": ["wellness", "sports"],
        "name": "Fitness, Sports & Wellness",
        "short": "Fitness",
        "icon": "🏋️",
        "categories": ["FITNESS"],
        "skills": ["personal training", "rehabilitation", "cpr certified", "first aid", "fitness assessment", "exercise physiology", "wellness coaching", "strength training", "nutrition", "relationship building"],
        "postings_title": "Fitness & Wellness Intern"
    },
    {
        "id": "agriculture",
        "alias_ids": ["agritech", "farming"],
        "name": "Agriculture & Agritech",
        "short": "Agriculture",
        "icon": "🌾",
        "categories": ["AGRICULTURE"],
        "skills": ["agronomy", "crop management", "soil science", "agribusiness", "farming", "agricultural research", "irrigation", "pest management", "risk management", "spss", "goal setting"],
        "postings_title": "Agriculture Intern"
    },
    {
        "id": "apparel",
        "alias_ids": ["fashion", "textiles"],
        "name": "Fashion, Apparel & Merchandising",
        "short": "Apparel / Fashion",
        "icon": "👗",
        "categories": ["APPAREL"],
        "skills": ["fashion", "merchandising", "apparel design", "plm", "garment construction", "retail inventory", "trend forecasting", "textiles", "store manager", "loss prevention"],
        "postings_title": "Apparel & Fashion Intern"
    },
    {
        "id": "designer",
        "alias_ids": ["ui-ux", "graphic-design"],
        "name": "Design, UI/UX & Creative Arts",
        "short": "Design / UIUX",
        "icon": "🎨",
        "categories": ["DESIGNER"],
        "skills": ["figma", "ui/ux", "graphic design", "3d modeling", "sketching", "prototyping", "maya", "adobe photoshop", "illustrator", "wireframing", "visual design", "design system", "user research"],
        "postings_title": "Design Intern"
    },
    {
        "id": "arts",
        "alias_ids": ["creative-arts", "fine-arts"],
        "name": "Creative Arts & Entertainment",
        "short": "Arts",
        "icon": "🎭",
        "categories": ["ARTS"],
        "skills": ["creative writing", "fine arts", "painting", "illustration", "visual storytelling", "short stories", "art direction", "workshops", "digital illustration", "fundraising"],
        "postings_title": "Creative Arts Intern"
    },
    {
        "id": "bpo",
        "alias_ids": ["bro", "call-center", "customer-support"],
        "name": "BPO & Customer Operations",
        "short": "BPO Operations",
        "icon": "🎧",
        "categories": ["BPO"],
        "skills": ["customer support", "vendor management", "process improvement", "technical support", "crm", "voice support", "troubleshooting", "communication skills", "telecalling", "sla management", "problem solving"],
        "postings_title": "BPO Operations Intern"
    }
]


class Engine:
    def __init__(self):
        aux = joblib.load(ART / "_aux.joblib")
        self.classes = list(aux["classes"])
        self.vocab = set(aux["vocab"])
        self.cat_skill_w = aux["cat_skill_w"]

        posts = pd.read_csv(ART / "postings.csv")
        posts["skills"] = posts["skills"].apply(parse_list)
        posts["skills"] = posts["skills"].apply(
            lambda L: [s for s in L if s not in JUNK and len(s) >= 3])
        self.posts = posts
        self.post_y = np.array([self.classes.index(c) for c in posts["category"]])
        self.index = faiss.read_index(str(ART / "postings.faiss"))

        self.tok = AutoTokenizer.from_pretrained(MODEL)
        self.model = Matcher(MODEL, len(self.classes))
        self.model.load_state_dict(torch.load(ART / "best.pt", map_location="cpu"))
        self.model.to(device).eval()

        self.base = SentenceTransformer(MODEL, device=device)   # skill-gap ke liye
        self.base.max_seq_length = 256

    # resume -> (category probabilities, embedding)
    @torch.no_grad()
    def _encode(self, item):
        enc = self.tok(build_text(item, True), truncation=True, max_length=MAXLEN,
                       return_tensors="pt").to(device)
        lg, e = self.model(enc["input_ids"], enc["attention_mask"])
        return lg.softmax(-1)[0].cpu().numpy(), e[0].cpu().numpy()

    def _gap(self, have_set, have_list, have_emb, post):
        req = list(post["skills"])
        matched = [s for s in req if s in have_set]
        rest = [s for s in req if s not in have_set]
        related, missing = [], []
        if rest and len(have_list):
            rq = self.base.encode(rest, normalize_embeddings=True, show_progress_bar=False)
            sim = rq @ have_emb.T
            for s, row in zip(rest, sim):
                j = int(row.argmax())
                if row[j] >= SEM_THR:
                    related.append(dict(required=s, found=have_list[j], sim=round(float(row[j]), 2)))
                else:
                    missing.append(s)
        else:
            missing = rest
        w = self.cat_skill_w.get(post["category"], {})
        missing = sorted(missing, key=lambda s: -w.get(s, 0))   # important skills pehle
        cov = (len(matched) + 0.5 * len(related)) / max(len(req), 1)
        readiness = "Strong fit" if cov >= .7 else "Good, minor gaps" if cov >= .4 else "Needs upskilling"
        return dict(coverage=round(cov, 3), readiness=readiness,
                    matched=matched, related=related, to_build=missing)

    def _eval_domain_compatibility(self, raw, have_set, probs):
        raw_lower = raw.lower()
        results = []

        for d in DOMAINS:
            # 1. Semantic category probability
            cat_probs = [probs[self.classes.index(c)] for c in d["categories"] if c in self.classes]
            sem_val = max(cat_probs) if cat_probs else 0.05

            # 2. Skill overlap
            matched_skills = []
            for s in d["skills"]:
                if s in have_set or s in raw_lower or any(s in h for h in have_set):
                    matched_skills.append(s)

            missing_skills = [s for s in d["skills"] if s not in matched_skills]
            n_match = len(matched_skills)
            n_req = len(d["skills"])

            # Skill coverage component
            cov = n_match / max(n_req * 0.35, 2.5)
            cov_clamped = min(cov, 1.0)

            # Combined score (0 - 100)
            score = int(round((0.35 * min(sem_val * 4.0, 1.0) + 0.65 * cov_clamped) * 100))
            if n_match >= 4:
                score = max(score, 78)
            elif n_match >= 2:
                score = max(score, 62)
            elif n_match == 1:
                score = max(score, 45)
            score = min(98, max(12, score))

            is_compatible = score >= 55 or (n_match >= 3 and score >= 45)

            if score >= 75:
                status = "Highly Compatible"
                status_hi = "अत्यधिक अनुकूल"
                badge_type = "ok"
            elif score >= 55:
                status = "Compatible"
                status_hi = "अनुकूल"
                badge_type = "ok"
            elif score >= 38:
                status = "Emerging Fit"
                status_hi = "संभावित फ़िट"
                badge_type = "warn"
            else:
                status = "Needs Upskilling"
                status_hi = "कौशल वृद्धि आवश्यक"
                badge_type = "bad"

            results.append(dict(
                id=d["id"],
                name=d["name"],
                short=d["short"],
                icon=d["icon"],
                score=score,
                is_compatible=is_compatible,
                status=status,
                status_hi=status_hi,
                badge_type=badge_type,
                matched_count=n_match,
                matched_skills=matched_skills[:6],
                missing_skills=missing_skills[:6],
                categories=d["categories"]
            ))

        # Sort so highest compatibility appears first
        results.sort(key=lambda x: -x["score"])
        return results

    def match(self, raw, k=3, domain="any"):
        item = parse_resume(raw)
        probs, e = self._encode(item)

        S, I = self.index.search(e[None].astype("float32"), len(self.posts))
        S, I = S[0], I[0]
        final = S + RW * probs[self.post_y[I]]       # FAISS similarity + category rerank
        order = np.argsort(-final)

        have_set = set(skill_list(item["skills"])) | (ngrams(raw) & self.vocab)
        have_list = sorted(have_set)[:300]
        have_emb = (self.base.encode(have_list, normalize_embeddings=True, show_progress_bar=False)
                    if have_list else np.zeros((0, 384)))

        # Evaluate cross-domain compatibility across all tracks
        domain_compatibility = self._eval_domain_compatibility(raw, have_set, probs)

        # Check if user specified a target domain
        chosen_domain_meta = None
        target_domain_id = (domain or "any").strip().lower().replace("_", "-")
        if target_domain_id and target_domain_id not in ("any", "all"):
            # First try resolving via domain taxonomy
            resolved = self.resolve_domain(target_domain_id)
            if resolved:
                for d in domain_compatibility:
                    if d["id"] == resolved["id"]:
                        chosen_domain_meta = d
                        break

            # If not in compatibility list, check directly
            if not chosen_domain_meta:
                for d in domain_compatibility:
                    if (d["id"] == target_domain_id or 
                        d["short"].lower() == target_domain_id or
                        any(c.lower() == target_domain_id or c.lower().replace("-", "") == target_domain_id.replace("-", "") for c in d["categories"])):
                        chosen_domain_meta = d
                        break

        seen, matches = set(), []
        
        # If target domain chosen, boost/filter posts matching that domain's categories first
        target_cats = set(chosen_domain_meta["categories"]) if chosen_domain_meta else set()

        # Phase 1: If target domain specified, pull best posts from target categories
        if target_cats:
            for o in order:
                pid = int(I[o])
                post = self.posts.iloc[pid]
                if post["category"] in target_cats and post["category"] not in seen:
                    seen.add(post["category"])
                    g = self._gap(have_set, have_list, have_emb, post)
                    
                    # Adapt title to reflect the applicant's chosen target domain
                    adapted_title = chosen_domain_meta["name"] + " Intern"
                    matches.append(dict(
                        pid=pid, title=adapted_title, category=str(post["category"]),
                        confidence=round(max(float(probs[self.post_y[pid]]), chosen_domain_meta["score"] / 100.0), 4),
                        similarity=round(float(S[o]), 3), **g))
                    if len(matches) == k:
                        break

        # Phase 2: Fill remaining slots with top overall matches
        for o in order:
            if len(matches) >= k:
                break
            pid = int(I[o])
            post = self.posts.iloc[pid]
            if post["category"] in seen:
                continue
            seen.add(post["category"])
            g = self._gap(have_set, have_list, have_emb, post)
            matches.append(dict(
                pid=pid, title=str(post["title"]), category=str(post["category"]),
                confidence=round(float(probs[self.post_y[pid]]), 4),
                similarity=round(float(S[o]), 3), **g))

        top = np.argsort(-probs)[:6]
        compatible_domains = [d for d in domain_compatibility if d["is_compatible"]]

        return dict(
            parsed=dict(title=item["title"], n_skills=len(have_set),
                        summary=item["summary"][:500],
                        skills=have_list[:40],
                        exp_snippet=item["exp"][:700]),
            top_categories=[dict(category=self.classes[i], prob=round(float(probs[i]), 4)) for i in top],
            domain_compatibility=domain_compatibility,
            compatible_domains=compatible_domains,
            chosen_domain=chosen_domain_meta,
            target_domain_requested=domain,
            matches=matches)

    def get_all_domains(self):
        return DOMAINS

    def resolve_domain(self, domain_key: str):
        if not domain_key:
            return None
        key = str(domain_key).strip().lower().replace("_", "-")
        if key in ("any", "all", ""):
            return None

        # Priority 1: Exact ID or alias ID match
        for d in DOMAINS:
            if d["id"].lower() == key or key in [a.lower() for a in d.get("alias_ids", [])]:
                return d

        # Priority 2: Exact single category match (core model category domain)
        for d in DOMAINS:
            cats_lower = [c.lower() for c in d["categories"]]
            if len(d["categories"]) == 1 and (key in cats_lower or key.replace("-", "") in [c.replace("-", "") for c in cats_lower]):
                return d

        # Priority 3: Name or short title match
        for d in DOMAINS:
            if d["short"].lower() == key or d["name"].lower() == key:
                return d

        # Priority 4: Category membership in any track (e.g. tech tracks)
        for d in DOMAINS:
            if any(c.lower() == key or c.lower().replace("-", "") == key.replace("-", "") for c in d["categories"]):
                return d

        return None

    def screen_candidate(self, raw: str, target_role: str, filename: str = "Resume") -> dict:
        raw = str(raw or "").strip()
        if not raw:
            return None

        item = parse_resume(raw)
        probs, e = self._encode(item)

        # Candidate name inference
        lines = [l.strip() for l in raw.split("\n") if l.strip()]
        candidate_name = ""
        for line in lines[:5]:
            clean_l = re.sub(r"[#*_~]", "", line).strip()
            lower_l = clean_l.lower()
            if any(lower_l.startswith(x) for x in ["resume", "curriculum", "cv", "bio", "profile", "contact", "email", "phone"]):
                continue
            if 2 <= len(clean_l.split()) <= 4 and len(clean_l) <= 50 and not any(ch.isdigit() for ch in clean_l):
                candidate_name = clean_l
                break
        if not candidate_name:
            if item["title"] and not any(ch.isdigit() for ch in item["title"]) and len(item["title"].split()) <= 4:
                candidate_name = item["title"]
            else:
                stem = Path(filename).stem.replace("_", " ").replace("-", " ")
                stem = re.sub(r"(?i)\bresume\b|\bcv\b|\bprofile\b", "", stem).strip()
                candidate_name = stem.title() if stem else "Candidate"

        have_set = set(skill_list(item["skills"])) | (ngrams(raw) & self.vocab)
        have_list = sorted(have_set)[:100]

        top_idxs = np.argsort(-probs)[:4]
        predicted_cat = self.classes[top_idxs[0]]
        predicted_prob = float(probs[top_idxs[0]])
        top_categories = [{"category": self.classes[i], "prob": round(float(probs[i]), 4)} for i in top_idxs]

        # Resolve target role to model category
        target_clean = (target_role or "INFORMATION-TECHNOLOGY").strip().lower().replace("_", "-")
        if target_clean in ("bro", "call-center", "telecalling"):
            target_clean = "bpo"

        matched_dom = self.resolve_domain(target_clean)
        if matched_dom:
            target_cat = matched_dom["categories"][0]
            target_display_name = matched_dom["name"]
            target_icon = matched_dom["icon"]
            domain_skills = list(matched_dom["skills"])
        else:
            upper_target = target_clean.upper()
            if upper_target in self.classes:
                target_cat = upper_target
                target_display_name = upper_target.replace("-", " ").title()
                target_icon = "💼"
                domain_skills = list(self.cat_skill_w.get(target_cat, {}).keys())[:15]
            else:
                target_cat = "INFORMATION-TECHNOLOGY"
                target_display_name = "Information Technology & Systems"
                target_icon = "💻"
                domain_skills = list(self.cat_skill_w.get(target_cat, {}).keys())[:15]

        target_cat_idx = self.classes.index(target_cat)
        cat_prob = float(probs[target_cat_idx])

        # Required skills for target role
        w = self.cat_skill_w.get(target_cat, {})
        top_w_skills = list(w.keys())[:15]
        req_skills = list(dict.fromkeys(domain_skills + top_w_skills))[:20]

        raw_lower = raw.lower()
        matched_skills = []
        for s in req_skills:
            if s in have_set or s in raw_lower or any(s in h for h in have_set):
                matched_skills.append(s)

        missing_skills = [s for s in req_skills if s not in matched_skills]
        n_match = len(matched_skills)

        # Vector similarity against target postings
        target_pids = np.where(self.post_y == target_cat_idx)[0]
        sim_score = 0.5
        if len(target_pids) > 0:
            try:
                post_embs = np.array([self.index.reconstruct(int(pid)) for pid in target_pids])
                sims = (post_embs @ e) / (np.linalg.norm(post_embs, axis=1) * np.linalg.norm(e) + 1e-9)
                sim_score = float(np.max(sims))
            except Exception:
                sim_score = 0.5

        cov = n_match / max(len(req_skills) * 0.35, 2.5)
        cov_clamped = min(cov, 1.0)

        sem_norm = min(cat_prob * 3.5, 1.0)
        raw_score = (0.35 * sem_norm + 0.45 * cov_clamped + 0.20 * max(0.0, sim_score)) * 100

        score = int(round(raw_score))
        if predicted_cat == target_cat:
            score = max(score, int(round(cat_prob * 80 + 20)))
            if n_match >= 3:
                score = max(score, 78)
            elif n_match >= 1:
                score = max(score, 65)
        else:
            if n_match >= 4:
                score = max(score, 72)
            elif n_match >= 2:
                score = max(score, 55)
            elif cat_prob < 0.05 and n_match == 0:
                score = min(score, 32)

        score = min(98, max(12, score))

        if score >= 75:
            status = "Highly Suitable"
            status_hi = "अत्यधिक उपयुक्त"
            badge = "ok"
            rec = f"Direct Shortlist: Exceptional match for {target_display_name} with strong skills in {', '.join(matched_skills[:3]) or 'core prerequisites'}."
        elif score >= 55:
            status = "Suitable"
            status_hi = "उपयुक्त"
            badge = "good"
            rec = f"Qualified Candidate: Meets core prerequisites for {target_display_name}; schedule technical screening."
        elif score >= 40:
            status = "Moderate Fit"
            status_hi = "मध्यम अनुकूल"
            badge = "warn"
            rec = f"Conditional Fit: Has transferable competencies, but requires upskilling in {', '.join(missing_skills[:2]) or 'target tools'}."
        else:
            status = "Not Suitable"
            status_hi = "उपयुक्त नहीं"
            badge = "bad"
            rec = f"Unsuitable for {target_display_name}: Profile strongly leans toward {predicted_cat.replace('-', ' ').title()} ({round(predicted_prob*100)}%)."

        return {
            "candidate_name": candidate_name,
            "filename": filename,
            "title": item["title"] or candidate_name,
            "target_role": target_cat,
            "target_display_name": target_display_name,
            "target_icon": target_icon,
            "suitability_score": score,
            "status": status,
            "status_hi": status_hi,
            "badge": badge,
            "is_suitable": score >= 55,
            "predicted_category": predicted_cat,
            "predicted_prob": round(predicted_prob, 4),
            "target_prob": round(cat_prob, 4),
            "matched_count": n_match,
            "matched_skills": matched_skills[:8],
            "missing_skills": missing_skills[:8],
            "candidate_skills": have_list[:25],
            "summary": (item["summary"] or item["exp"][:250]).strip(),
            "recommendation": rec,
            "top_categories": top_categories
        }
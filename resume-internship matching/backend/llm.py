import hashlib
import json
import os
import re
import time

from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(dotenv_path=Path(__file__).parent / ".env")
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
FALLBACK_MODELS = [MODEL, "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"]
_client = None
_cache = {}          # same resume dobara aaye to Gemini call nahi hoga

# ---------------- prompts ----------------
SYSTEM = """You are an internship career coach inside a resume-matching tool.
You receive FACTS computed by a retrieval system: a student's profile and an internship with
matched / related / missing skills. Rules:
- Use ONLY the facts given. Never invent experience, employers, certificates, or numbers.
- roadmap skills must come ONLY from the 'missing' or 'related' lists.
- Order the roadmap by the given order of missing skills (most important first).
- Be specific, practical, encouraging, concise.
- Return ONLY valid JSON in the exact schema requested."""

LANG_RULE = {
    "en": "Write all text in simple English.",
    "hi": ("Write ALL human-readable text (summary, why_fit, goal, action, tip) in simple Hindi "
           "(Devanagari script). Tool and technology names (Python, SQL, Excel...) stay in English. "
           "Keep the JSON keys, every 'skill' value (exactly as given in the facts, in English), "
           "and the 'week' value in the form 'Week N' unchanged."),
}

SCHEMA = """{
  "summary": "2 sentences: how well the student fits and the single biggest next step",
  "why_fit": ["3 short bullets, each tied to a matched skill or the profile"],
  "roadmap": [{"week": "Week 1", "skill": "one skill from missing/related", "goal": "what to be able to do",
               "action": "one concrete thing: a mini project, course topic, or practice task"}],
  "resume_tips": [{"skill": "a related skill", "tip": "how to reword it on the resume to match the posting wording"}]
}
Roadmap: 4 to 6 items. resume_tips: one per related skill (empty list if none)."""

TRANSLATE_RULES = """You convert a resume (Hindi or English, possibly messy or scanned) into clean English text
for an NLP pipeline. Rules:
- Translate faithfully. Do NOT add, remove or invent any information.
- Output plain text only. No markdown, no commentary.
- Line 1: the candidate's job title in English (if missing, infer it from the most recent role).
- Then keep these section headers in English, each on its own line, in this order, with Skills LAST:
  Summary, Highlights, Experience, Education, Skills (skip a section if the resume has none).
- Skills: one comma-separated line of standard English skill terms (e.g. "Microsoft Excel, customer service, Python").
- Keep tool, software and company names in English. Keep dates and numbers.
- Do NOT output the person's name, phone, email or address."""

COMMON = {"the", "and", "of", "to", "in", "for", "with", "a", "on", "as", "at", "by", "is", "an",
          "or", "from", "that", "this", "was", "were", "are", "be", "all", "using", "including"}


# ---------------- client + helpers ----------------
def client():
    global _client
    if _client is None:
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            raise RuntimeError("GEMINI_API_KEY .env file mein nahi mila.")
        _client = genai.Client(api_key=key)
    return _client


def _generate_with_retry(model: str, contents, config, max_retries: int = 3):
    """Gemini call with exponential backoff and fallback models for 404/503/overload errors."""
    candidate_models = []
    for m in [model] + FALLBACK_MODELS:
        if m and m not in candidate_models:
            candidate_models.append(m)

    last_exc = None
    for m in candidate_models:
        delay = 1.5
        for attempt in range(max_retries + 1):
            try:
                return client().models.generate_content(
                    model=m, contents=contents, config=config)
            except Exception as e:
                last_exc = e
                msg = str(e)
                if "404" in msg or "NOT_FOUND" in msg or "no longer available" in msg:
                    break
                is_overload = (
                    "503" in msg or "UNAVAILABLE" in msg
                    or "high demand" in msg.lower()
                    or "RESOURCE_EXHAUSTED" in msg
                    or "429" in msg
                )
                if is_overload and attempt < max_retries:
                    time.sleep(delay)
                    delay *= 1.8
                    continue
                break
    if last_exc:
        raise last_exc


def redact(t: str) -> str:
    t = re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "[email]", t or "")
    t = re.sub(r"(\+?\d[\d\s().-]{8,}\d)", "[phone]", t)
    t = re.sub(r"https?://\S+|www\.\S+", "[link]", t)
    return t


def devanagari_ratio(t: str) -> float:
    dev = sum(1 for c in t if "\u0900" <= c <= "\u097F")
    lat = sum(1 for c in t if c.isascii() and c.isalpha())
    return dev / max(dev + lat, 1)


def looks_english(t: str) -> bool:
    """PDF se nikla text sahi English hai ya garbage (Kruti Dev etc.)?"""
    words = re.findall(r"[a-z]+", t.lower())
    if len(words) < 50:
        return False
    return sum(w in COMMON for w in words) / len(words) >= 0.05


def _h(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def translate_text(text: str) -> str:
    key = _h(text.encode("utf-8", "ignore"))
    if key in _cache:
        return _cache[key]
    resp = _generate_with_retry(
        model=MODEL, contents=redact(text),
        config=types.GenerateContentConfig(system_instruction=TRANSLATE_RULES, temperature=0.1))
    out = (resp.text or "").strip()
    _cache[key] = out
    return out


def pdf_to_english(data: bytes) -> str:
    key = _h(data)
    if key in _cache:
        return _cache[key]
    resp = _generate_with_retry(
        model=MODEL,
        contents=[types.Part.from_bytes(data=data, mime_type="application/pdf"),
                  "Read this resume PDF (Hindi or English, may be scanned) and output it as English text "
                  "following the rules."],
        config=types.GenerateContentConfig(system_instruction=TRANSLATE_RULES, temperature=0.1))
    out = redact((resp.text or "").strip())
    _cache[key] = out
    return out


# ---------------- coach ----------------
def build_prompt(profile: dict, match: dict) -> str:
    related = [f"{r['required']} (resume has: {r['found']})" for r in match.get("related", [])]
    return f"""STUDENT PROFILE
Title: {redact(profile.get('title', ''))}
Summary: {redact(profile.get('summary', ''))}
Skills found: {', '.join(profile.get('skills', [])[:40])}
Experience snippet: {redact(profile.get('exp_snippet', ''))}

INTERNSHIP
Role: {match['title']}  | Domain: {match['category']}
Skill coverage: {round(match['coverage'] * 100)}%  | Readiness: {match['readiness']}
Matched skills: {', '.join(match.get('matched', [])) or 'none'}
Related skills (same meaning, different wording): {'; '.join(related) or 'none'}
Missing skills (most important first): {', '.join(match.get('to_build', [])) or 'none'}

Return JSON in this schema:
{SCHEMA}"""


def _parse(txt: str) -> dict:
    txt = re.sub(r"^```(?:json)?|```$", "", txt.strip(), flags=re.M).strip()
    return json.loads(txt)


def coach(profile: dict, match: dict, lang: str = "en") -> dict:
    lang = lang if lang in LANG_RULE else "en"
    resp = _generate_with_retry(
        model=MODEL,
        contents=build_prompt(profile, match),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM + "\n" + LANG_RULE[lang],
            response_mime_type="application/json",
            temperature=0.4,
        ),
    )
    data = _parse(resp.text)

    # grounding check: roadmap sirf missing/related skills ka (skill field hamesha English)
    allowed = {s.lower() for s in match.get("to_build", [])} | \
              {r["required"].lower() for r in match.get("related", [])}
    road = data.get("roadmap", [])
    data["roadmap"] = [r for r in road if str(r.get("skill", "")).lower() in allowed] or road
    data["grounded"] = len(data["roadmap"]) == len(road)
    data.setdefault("why_fit", [])
    data.setdefault("resume_tips", [])
    data["lang"] = lang
    return data
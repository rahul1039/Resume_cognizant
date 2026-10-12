import io
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pypdf import PdfReader

import llm
from engine import Engine

app = FastAPI(title="Resume-Internship Matcher")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

engine = Engine()   # startup pe ek baar model load hota hai


def gemini_error(e: Exception) -> HTTPException:
    msg = str(e)
    if isinstance(e, RuntimeError):
        return HTTPException(500, msg)
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
        return HTTPException(429, "Gemini rate limit hit ho gaya. 30 sec baad try karo.")
    return HTTPException(502, f"AI error: {msg[:200]}")


def resolve_input(text: str, file: Optional[UploadFile]):
    """Returns (english_text, source) ; source = en | hi | pdf-ai"""
    if file is not None:
        data = file.file.read()
        if (file.filename or "").lower().endswith(".pdf"):
            try:
                raw = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
            except Exception:
                raw = ""
            # saaf English text mila to seedha use karo; warna (Hindi / scanned / garbage) Gemini padhega
            if len(raw.strip()) >= 200 and llm.devanagari_ratio(raw) < 0.05 and llm.looks_english(raw):
                return raw, "en"
            return llm.pdf_to_english(data), "pdf-ai"
        raw = data.decode("utf-8", errors="ignore")
    else:
        raw = text

    if llm.devanagari_ratio(raw) >= 0.10:
        return llm.translate_text(raw), "hi"
    return raw, "en"


@app.get("/api/health")
def health():
    return {"status": "ok", "postings": len(engine.posts), "classes": len(engine.classes)}


@app.post("/api/match")
def match(text: str = Form(""), file: Optional[UploadFile] = File(None), k: int = Form(3), domain: str = Form("any")):
    try:
        english, source = resolve_input(text, file)
    except HTTPException:
        raise
    except Exception as e:
        raise gemini_error(e)

    if len(english.strip()) < 80:
        raise HTTPException(400, "Resume text bahut chhota hai ya file se text nahi nikla.")

    result = engine.match(english, k=max(1, min(int(k), 5)), domain=domain)
    result["source"] = source
    result["english_text"] = english if source != "en" else None
    return result


@app.get("/api/categories")
def get_categories():
    cats = []
    all_doms = engine.get_all_domains()
    for c in engine.classes:
        dom = next((d for d in all_doms if c in d["categories"]), None)
        cats.append({
            "id": c.lower(),
            "category": c,
            "name": dom["name"] if dom else c.replace("-", " ").title(),
            "icon": dom["icon"] if dom else "💼",
            "skills": dom["skills"][:8] if dom else list(engine.cat_skill_w.get(c, {}).keys())[:8]
        })
    return {"categories": cats, "domains": all_doms}


def extract_file_text(file: UploadFile) -> str:
    data = file.file.read()
    filename = (file.filename or "").lower()
    if filename.endswith(".pdf"):
        try:
            raw = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
        except Exception:
            raw = ""
        if len(raw.strip()) >= 50:
            return raw
        try:
            return llm.pdf_to_english(data)
        except Exception:
            return ""
    return data.decode("utf-8", errors="ignore")


@app.post("/api/recruiter/screen")
def screen_resumes(
    files: Optional[List[UploadFile]] = File(None),
    texts: str = Form(""),
    target_role: str = Form("INFORMATION-TECHNOLOGY"),
    cutoff: int = Form(55)
):
    candidates = []

    # 1. Process uploaded resume files
    if files:
        for f in files:
            if not f or not f.filename:
                continue
            try:
                raw_text = extract_file_text(f)
                if len(raw_text.strip()) >= 40:
                    cand = engine.screen_candidate(raw_text.strip(), target_role, filename=f.filename)
                    if cand:
                        candidates.append(cand)
            except Exception as e:
                print(f"Error screening file {f.filename}: {e}")

    # 2. Process pasted resume text (supports multiple separated by delimiter)
    if texts and texts.strip():
        import re
        chunks = re.split(r"(?:\r?\n\s*){2,}(?:---|===|\*\*\*|### Candidate[^\r\n]*)(?:\r?\n\s*)*", texts.strip())
        for idx, chunk in enumerate(chunks):
            if len(chunk.strip()) >= 40:
                fn = f"Candidate_{idx+1}"
                cand = engine.screen_candidate(chunk.strip(), target_role, filename=fn)
                if cand:
                    candidates.append(cand)

    if not candidates:
        raise HTTPException(400, "No valid resume text could be extracted. Please upload readable PDF/TXT files or paste resume text.")

    # Sort candidates by suitability score in descending order
    candidates.sort(key=lambda x: -x["suitability_score"])

    total = len(candidates)
    suitable = sum(1 for c in candidates if c["suitability_score"] >= cutoff)
    highly_suitable = sum(1 for c in candidates if c["suitability_score"] >= 75)
    avg_score = round(sum(c["suitability_score"] for c in candidates) / total, 1) if total else 0.0
    yield_rate = round((suitable / total) * 100, 1) if total else 0.0

    # Resolve target role display info
    matched_dom = engine.resolve_domain(target_role)
    target_display = matched_dom["name"] if matched_dom else target_role.replace("-", " ").title()
    target_icon = matched_dom["icon"] if matched_dom else "💼"

    summary = {
        "target_role": target_role,
        "target_display_name": target_display,
        "target_icon": target_icon,
        "cutoff": cutoff,
        "total_screened": total,
        "suitable_count": suitable,
        "highly_suitable_count": highly_suitable,
        "yield_rate": yield_rate,
        "avg_score": avg_score
    }

    return {"summary": summary, "candidates": candidates}


class CoachReq(BaseModel):
    profile: Dict[str, Any]
    match: Dict[str, Any]
    lang: str = "en"


@app.post("/api/coach")
def coach(req: CoachReq):
    try:
        return llm.coach(req.profile, req.match, req.lang)
    except Exception as e:
        raise gemini_error(e)


# frontend ko same server se serve karo (hamesha end mein)
FRONT = Path(__file__).parent.parent / "frontend"
app.mount("/", StaticFiles(directory=FRONT, html=True), name="frontend")
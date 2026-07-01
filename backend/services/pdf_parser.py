"""
Extract requirements from a freeform PDF.
Strategy:
  1. Extract all text via pdfplumber
  2. Split into sentences
  3. Filter sentences that look like requirements
  4. Classify each with the ML model
"""
import re
from pathlib import Path


def extract_text(pdf_path: str) -> str:
    import pdfplumber
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
    return text


def _split_sentences(text: str) -> list:
    text = re.sub(r"\n+", " ", text)
    text = re.sub(r"\s+", " ", text)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if len(s.strip()) > 20]


_REQ_PATTERNS = [
    re.compile(r"\b(shall|must|should|will|needs? to|required to|is able to|allows?|enables?)\b", re.I),
    re.compile(r"^\s*\d+[\.\)]\s+", re.M),
    re.compile(r"^\s*[A-Z]{1,3}[-\d]+[\.\)]\s+", re.M),
    re.compile(r"\b(the system|the application|the user|the admin|users?)\b.{5,}", re.I),
]

def _looks_like_requirement(sentence: str) -> bool:
    return any(p.search(sentence) for p in _REQ_PATTERNS)


def extract_requirements(pdf_path: str) -> list:
    """
    Returns list of dicts: {text, type, fine_class, confidence}
    """
    from ml.inference import classify_requirement

    raw_text  = extract_text(pdf_path)
    sentences = _split_sentences(raw_text)

    results = []
    seen = set()
    for sent in sentences:
        if not _looks_like_requirement(sent):
            continue
        # deduplicate near-identical sentences
        key = re.sub(r"\s+", " ", sent.lower())[:80]
        if key in seen:
            continue
        seen.add(key)

        clf = classify_requirement(sent)
        results.append({
            "text":        sent,
            "type":        clf["type"],
            "fine_class":  clf["fine_class"],
            "confidence":  clf["confidence"],
            "status":      "missing",
        })

    return results

"""
Unified ML inference interface for all 3 TraceIQ models.
Loaded once on startup, used across all API routes.
"""
import os, pickle
from pathlib import Path

BASE = Path(__file__).parent / "models"

_req_clf   = None
_linker    = None
_pipeline  = None


def _load_req_clf():
    global _req_clf
    if _req_clf is None:
        p = BASE / "req_classifier.pkl"
        if p.exists():
            with open(p, "rb") as f:
                _req_clf = pickle.load(f)
    return _req_clf

def _load_linker():
    global _linker
    if _linker is None:
        p = BASE / "semantic_linker"
        if p.exists():
            from sentence_transformers import SentenceTransformer
            _linker = SentenceTransformer(str(p))
    return _linker

def _load_pipeline():
    global _pipeline
    if _pipeline is None:
        p = BASE / "pipeline_predictor.pkl"
        if p.exists():
            with open(p, "rb") as f:
                _pipeline = pickle.load(f)
    return _pipeline


def classify_requirement(text: str) -> dict:
    """Returns type (F/NF) and fine-grained class."""
    m = _load_req_clf()
    if m is None:
        return {"type": "F", "fine_class": "F", "confidence": 0.5}
    binary = m["binary"].predict([text])[0]
    fine   = m["fine"].predict([text])[0]
    proba  = m["binary"].predict_proba([text])[0].max()
    return {"type": "F" if binary == "functional" else "NF",
            "fine_class": fine, "confidence": round(float(proba), 3)}


def semantic_similarity(req_text: str, code_texts: list) -> list:
    """Cosine similarity between requirement and each code text."""
    model = _load_linker()
    if model is None or not code_texts:
        return _keyword_overlap(req_text, code_texts)
    import torch
    try:
        embs  = model.encode([req_text] + code_texts, convert_to_tensor=True, show_progress_bar=False)
        req_e = embs[0]
        cod_e = embs[1:]
        sims  = torch.nn.functional.cosine_similarity(req_e.unsqueeze(0), cod_e)
        return sims.cpu().numpy().tolist()
    except Exception:
        return _keyword_overlap(req_text, code_texts)


def _keyword_overlap(req: str, codes: list) -> list:
    rw = set(req.lower().split())
    return [len(rw & set(c.lower().replace("_"," ").split())) / max(len(rw), 1) for c in codes]


def predict_pipeline(commit: dict) -> dict:
    """
    Predict if a pipeline will pass or fail given commit metadata.
    commit keys: files_changed, lines_changed, hour_of_day, day_of_week,
                 has_test_files, has_risky_files, has_fix_keyword, is_weekend, message_length
    """
    m = _load_pipeline()
    if m is None:
        return {"status": "pass", "fail_probability": 0.2}

    feats = m["features"]
    X = [[commit.get(f, 0) for f in feats]]
    label = m["model"].predict(X)[0]
    proba = m["model"].predict_proba(X)[0]
    fail_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])
    return {
        "status": "fail" if label == 1 else "pass",
        "fail_probability": round(fail_prob, 3),
    }


def model_status() -> dict:
    return {
        "req_classifier":       (BASE / "req_classifier.pkl").exists(),
        "semantic_linker":      (BASE / "semantic_linker").exists(),
        "pipeline_predictor":   (BASE / "pipeline_predictor.pkl").exists(),
    }

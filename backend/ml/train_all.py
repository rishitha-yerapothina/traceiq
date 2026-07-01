"""
Train all 3 TraceIQ ML models:
  1. Requirement Classifier  (TF-IDF + LogisticRegression)
  2. Semantic Linker         (sentence-transformers fine-tune)
  3. Pipeline Failure Predictor (RandomForest + GradientBoosting)

Run from backend/:  python ml/train_all.py
"""
import os, sys, json, pickle
import numpy as np
from pathlib import Path

BASE    = Path(__file__).parent
DS      = BASE / "datasets"
MODELS  = BASE / "models"
MODELS.mkdir(exist_ok=True)


# ══════════════════════════════════════════════════════════════════════════════
# MODEL 1 — Requirement Classifier
# Task: given a requirement sentence, classify it as
#       Functional (F) or Non-Functional (SE/PE/US/A/MT/SC/...)
# ══════════════════════════════════════════════════════════════════════════════
def train_req_classifier():
    import csv
    from sklearn.pipeline import Pipeline
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_score
    from sklearn.preprocessing import LabelEncoder

    print("\n" + "="*55)
    print("MODEL 1: Requirement Classifier")
    print("="*55)

    # load dataset
    rows = []
    with open(DS / "promise_nfr.csv", newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append((r["RequirementText"].strip(), r["Class"].strip()))

    texts  = [r[0] for r in rows]
    labels = [r[1] for r in rows]

    # encode labels: F=functional, everything else=non-functional
    binary_labels = ["functional" if l == "F" else "non-functional" for l in labels]

    print(f"  Dataset: {len(texts)} requirements")
    print(f"  functional={binary_labels.count('functional')}  non-functional={binary_labels.count('non-functional')}")

    clf = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000, sublinear_tf=True)),
        ("lr",    LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced")),
    ])

    cv = cross_val_score(clf, texts, binary_labels, cv=5, scoring="f1_weighted")
    print(f"  5-fold CV F1: {cv.mean():.3f} +/- {cv.std():.3f}")

    clf.fit(texts, binary_labels)

    # also train fine-grained classifier (F / SE / PE / US / A / MT / SC / ...)
    clf_fine = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000, sublinear_tf=True)),
        ("lr",    LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced")),
    ])
    clf_fine.fit(texts, labels)

    out = MODELS / "req_classifier.pkl"
    with open(out, "wb") as f:
        pickle.dump({"binary": clf, "fine": clf_fine,
                     "classes": list(set(labels)),
                     "cv_f1": float(cv.mean())}, f)
    print(f"  Saved -> {out.name}  (CV F1={cv.mean():.3f})")


# ══════════════════════════════════════════════════════════════════════════════
# MODEL 2 — Semantic Linker
# Task: given requirement text + code function name, compute similarity score
#       so we can rank code functions by relevance to each requirement
# ══════════════════════════════════════════════════════════════════════════════
def train_semantic_linker():
    from sentence_transformers import SentenceTransformer, InputExample, losses
    from torch.utils.data import DataLoader

    print("\n" + "="*55)
    print("MODEL 2: Semantic Linker (sentence-transformers)")
    print("="*55)

    pairs = json.loads((DS / "semantic_pairs.json").read_text())
    print(f"  Dataset: {len(pairs)} requirement->code pairs")

    examples = [InputExample(texts=[p["requirement"], p["function"]], label=1.0)
                for p in pairs]

    print("  Loading base model: all-MiniLM-L6-v2 ...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    loader = DataLoader(examples, shuffle=True, batch_size=8)
    loss   = losses.MultipleNegativesRankingLoss(model)

    out = str(MODELS / "semantic_linker")
    print("  Fine-tuning for 5 epochs ...")
    model.fit(
        train_objectives=[(loader, loss)],
        epochs=5,
        warmup_steps=5,
        output_path=out,
        show_progress_bar=True,
        save_best_model=True,
    )
    print(f"  Saved -> models/semantic_linker/")


# ══════════════════════════════════════════════════════════════════════════════
# MODEL 3 — Pipeline Failure Predictor
# Task: given commit metadata, predict if the pipeline will Pass or Fail
# Features: files_changed, lines_changed, hour_of_day, day_of_week,
#           has_test_files, has_risky_files, has_fix_keyword,
#           is_weekend, message_length
# ══════════════════════════════════════════════════════════════════════════════
def train_pipeline_predictor():
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.metrics import classification_report

    print("\n" + "="*55)
    print("MODEL 3: Pipeline Failure Predictor")
    print("="*55)

    records = json.loads((DS / "pipeline_builds.json").read_text())
    FEATURES = ["files_changed","lines_changed","hour_of_day","day_of_week",
                "has_test_files","has_risky_files","has_fix_keyword",
                "is_weekend","message_length"]

    X = np.array([[r[f] for f in FEATURES] for r in records], dtype=float)
    y = np.array([r["failed"] for r in records], dtype=int)

    print(f"  Dataset: {len(records)} builds  (failed={y.sum()}, passed={len(y)-y.sum()})")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)

    rf = Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    RandomForestClassifier(n_estimators=200, max_depth=8,
                                          class_weight="balanced", random_state=42, n_jobs=-1)),
    ])
    gb = Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    GradientBoostingClassifier(n_estimators=150, max_depth=4,
                                               learning_rate=0.1, random_state=42)),
    ])

    rf.fit(X_train, y_train)
    gb.fit(X_train, y_train)

    rf_acc = rf.score(X_test, y_test)
    gb_acc = gb.score(X_test, y_test)
    print(f"  RandomForest  accuracy: {rf_acc:.3f}")
    print(f"  GradientBoost accuracy: {gb_acc:.3f}")

    best = rf if rf_acc >= gb_acc else gb
    best_name = "RandomForest" if best is rf else "GradientBoosting"

    print(f"\n  Best: {best_name}")
    print(classification_report(y_test, best.predict(X_test),
                                 target_names=["pass","fail"], zero_division=0))

    cv = cross_val_score(best, X, y, cv=5, scoring="f1_weighted")
    print(f"  5-fold CV F1: {cv.mean():.3f} +/- {cv.std():.3f}")

    # feature importance
    fi = rf.named_steps["clf"].feature_importances_
    print("\n  Feature importances:")
    for name, imp in sorted(zip(FEATURES, fi), key=lambda x: -x[1]):
        print(f"    {name:25s} {imp:.3f}")

    out = MODELS / "pipeline_predictor.pkl"
    with open(out, "wb") as f:
        pickle.dump({
            "model": best,
            "best_name": best_name,
            "features": FEATURES,
            "rf_acc": rf_acc,
            "gb_acc": gb_acc,
            "cv_f1": float(cv.mean()),
        }, f)
    print(f"\n  Saved -> {out.name}")


# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    os.chdir(Path(__file__).parent.parent)
    train_req_classifier()
    train_semantic_linker()
    train_pipeline_predictor()
    print("\n" + "="*55)
    print("All 3 models trained and saved to ml/models/")
    print("="*55)

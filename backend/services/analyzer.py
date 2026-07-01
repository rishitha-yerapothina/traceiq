"""
Core analysis pipeline:
  1. Extract requirements from PDF
  2. Fetch repo file tree from GitHub
  3. Match requirements to code using Semantic Linker ML model
  4. Fetch commit history + predict pipeline pass/fail
  5. Store everything in SQLite
"""
import uuid, re
from sqlalchemy.orm import Session
from sqlalchemy import text


def _file_to_functions(filepaths: list) -> list:
    """
    Derive function-like names from file paths for semantic matching.
    e.g. src/pages/LoginPage.jsx -> ['LoginPage', 'login page']
    """
    fns = []
    for fp in filepaths:
        name = fp.replace("\\", "/").split("/")[-1]
        for ext in [".jsx", ".tsx", ".js", ".ts", ".py", ".java", ".go"]:
            name = name.replace(ext, "")
        # camelCase / PascalCase -> words
        words = re.sub(r"([A-Z])", r" \1", name).strip().lower()
        fns.append({"function_name": name, "nl_summary": words, "file_path": fp})
    return fns


def run_analysis(db: Session, project_id: str, repo_url: str, pdf_path: str):
    from services.pdf_parser import extract_requirements
    from services.github import get_commits, get_commit_detail, get_repo_tree
    from ml.inference import semantic_similarity, predict_pipeline

    # ── 1. Extract requirements ───────────────────────────────────────────────
    reqs = extract_requirements(pdf_path)

    # clear old data for this project
    for tbl in ["pipeline_stages", "commits", "requirements"]:
        db.execute(text(f"DELETE FROM {tbl} WHERE project_id=:pid"), {"pid": project_id})
    db.commit()

    req_rows = []
    for r in reqs:
        rid = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO requirements (id, project_id, text, type, status, confidence)
            VALUES (:id, :pid, :text, :type, 'missing', :conf)
        """), {"id": rid, "pid": project_id, "text": r["text"],
               "type": r["type"], "conf": r["confidence"]})
        req_rows.append({"id": rid, **r})
    db.commit()

    # ── 2. Fetch repo file tree ───────────────────────────────────────────────
    file_paths = get_repo_tree(repo_url)
    code_files = [f for f in file_paths
                  if any(f.endswith(e) for e in [".py",".js",".jsx",".ts",".tsx",".java",".go",".cs"])]
    code_fns   = _file_to_functions(code_files)

    # ── 3. Match requirements → code ──────────────────────────────────────────
    if code_fns and req_rows:
        code_texts = [c["nl_summary"] for c in code_fns]
        for req in req_rows:
            scores = semantic_similarity(req["text"], code_texts)
            best_i = max(range(len(scores)), key=lambda i: scores[i])
            best_s = scores[best_i]
            best_c = code_fns[best_i]

            status = "implemented" if best_s >= 0.25 else "missing"
            db.execute(text("""
                UPDATE requirements
                SET status=:st, confidence=:conf,
                    linked_function=:fn, linked_file=:fp
                WHERE id=:id
            """), {"st": status, "conf": round(float(best_s), 3),
                   "fn": best_c["function_name"], "fp": best_c["file_path"],
                   "id": req["id"]})
        db.commit()

    # ── 4. Fetch commits + predict pipeline ───────────────────────────────────
    commits = get_commits(repo_url, max_pages=3)

    FIX_KW   = {"fix","bug","hotfix","error","revert","broken","crash","issue","wip"}
    TEST_EXT = {".test.",".spec.","test_","_test","spec_"}
    RISKY    = {"env","secret","credential","password","token","key","config"}

    for c in commits:
        detail = get_commit_detail(repo_url, c["sha"])
        files  = detail.get("filenames", [])

        hour = 12
        if c.get("date"):
            try: hour = int(c["date"][11:13])
            except: pass

        import datetime
        day = 0
        if c.get("date"):
            try:
                dt  = datetime.datetime.fromisoformat(c["date"].replace("Z", "+00:00"))
                day = dt.weekday()
            except: pass

        msg_lower = c["message"].lower()
        commit_meta = {
            "files_changed":   detail["files_changed"],
            "lines_changed":   detail["lines_added"] + detail["lines_deleted"],
            "hour_of_day":     hour,
            "day_of_week":     day,
            "has_test_files":  int(any(t in f.lower() for f in files for t in TEST_EXT)),
            "has_risky_files": int(any(r in f.lower() for f in files for r in RISKY)),
            "has_fix_keyword": int(any(k in msg_lower for k in FIX_KW)),
            "is_weekend":      int(day >= 5),
            "message_length":  len(c["message"].split()),
        }
        pred = predict_pipeline(commit_meta)

        cid = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO commits
            (id, project_id, sha, message, author, commit_date,
             files_changed, lines_added, lines_deleted, pipeline_status, fail_probability)
            VALUES (:id,:pid,:sha,:msg,:auth,:date,:fc,:la,:ld,:ps,:fp)
        """), {"id": cid, "pid": project_id, "sha": c["sha"],
               "msg": c["message"], "auth": c["author"], "date": c.get("date",""),
               "fc": detail["files_changed"],
               "la": detail["lines_added"], "ld": detail["lines_deleted"],
               "ps": pred["status"], "fp": pred["fail_probability"]})

        # simulate pipeline stages
        stages = ["Source", "Build", "Test", "Deploy", "Verify"]
        failed_at = None
        if pred["status"] == "fail":
            import random; random.seed(int(pred["fail_probability"] * 100))
            failed_at = random.randint(1, len(stages) - 1)

        import random
        durations = {
            "Source": random.uniform(5, 20),
            "Build":  random.uniform(30, 180),
            "Test":   random.uniform(40, 200),
            "Deploy": random.uniform(20, 90),
            "Verify": random.uniform(10, 40),
        }
        for i, stage in enumerate(stages):
            if failed_at is not None and i > failed_at:
                s_status = "pending"
                dur = 0
            elif failed_at is not None and i == failed_at:
                s_status = "fail"
                dur = durations[stage]
            else:
                s_status = "pass"
                dur = durations[stage]

            db.execute(text("""
                INSERT INTO pipeline_stages
                (id, commit_id, project_id, stage_name, status, duration_s, stage_order)
                VALUES (:id,:cid,:pid,:sn,:st,:dur,:ord)
            """), {"id": str(uuid.uuid4()), "cid": cid, "pid": project_id,
                   "sn": stage, "st": s_status, "dur": round(dur, 1), "ord": i})
        db.commit()

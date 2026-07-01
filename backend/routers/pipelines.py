from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])

STAGES = ["Source", "Build", "Test", "Deploy", "Verify"]


@router.get("/{project_id}")
def list_pipelines(project_id: str, db: Session = Depends(get_db)):
    commits = db.execute(text("""
        SELECT id, sha, message, author, commit_date, pipeline_status, fail_probability
        FROM commits WHERE project_id=:pid ORDER BY commit_date DESC
    """), {"pid": project_id}).fetchall()

    result = []
    for c in commits:
        cid = c[0]
        stages = db.execute(text("""
            SELECT stage_name, status, duration_s, stage_order
            FROM pipeline_stages WHERE commit_id=:cid ORDER BY stage_order
        """), {"cid": cid}).fetchall()

        result.append({
            "id":           cid,
            "sha":          c[1],
            "message":      c[2],
            "author":       c[3],
            "date":         c[4],
            "status":       c[5],
            "fail_probability": c[6],
            "stages": [{"name": s[0], "status": s[1],
                        "duration_s": s[2], "order": s[3]} for s in stages],
        })
    return result


@router.get("/{project_id}/stats")
def pipeline_stats(project_id: str, db: Session = Depends(get_db)):
    total = db.execute(text(
        "SELECT COUNT(*) FROM commits WHERE project_id=:pid"
    ), {"pid": project_id}).scalar() or 0

    passed = db.execute(text(
        "SELECT COUNT(*) FROM commits WHERE project_id=:pid AND pipeline_status='pass'"
    ), {"pid": project_id}).scalar() or 0

    failed = total - passed

    avg_fail_prob = db.execute(text(
        "SELECT AVG(fail_probability) FROM commits WHERE project_id=:pid"
    ), {"pid": project_id}).scalar() or 0

    stage_failures = db.execute(text("""
        SELECT stage_name, COUNT(*) as cnt
        FROM pipeline_stages
        WHERE project_id=:pid AND status='fail'
        GROUP BY stage_name ORDER BY cnt DESC
    """), {"pid": project_id}).fetchall()

    return {
        "total":            total,
        "passed":           passed,
        "failed":           failed,
        "pass_rate":        round(passed / max(total, 1) * 100, 1),
        "avg_fail_prob":    round(float(avg_fail_prob), 3),
        "stage_failures":   [{"stage": r[0], "count": r[1]} for r in stage_failures],
    }

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

router = APIRouter(prefix="/api/commits", tags=["commits"])


@router.get("/{project_id}")
def list_commits(project_id: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, sha, message, author, commit_date,
               files_changed, lines_added, lines_deleted,
               pipeline_status, fail_probability
        FROM commits WHERE project_id=:pid ORDER BY commit_date DESC
    """), {"pid": project_id}).fetchall()

    return [{"id": r[0], "sha": r[1], "message": r[2], "author": r[3],
             "date": r[4], "files_changed": r[5], "lines_added": r[6],
             "lines_deleted": r[7], "pipeline_status": r[8],
             "fail_probability": r[9]} for r in rows]


@router.get("/{project_id}/stats")
def commit_stats(project_id: str, db: Session = Depends(get_db)):
    total = db.execute(text(
        "SELECT COUNT(*) FROM commits WHERE project_id=:pid"
    ), {"pid": project_id}).scalar() or 0

    by_author = db.execute(text("""
        SELECT author, COUNT(*) as cnt
        FROM commits WHERE project_id=:pid
        GROUP BY author ORDER BY cnt DESC LIMIT 10
    """), {"pid": project_id}).fetchall()

    by_week = db.execute(text("""
        SELECT substr(commit_date, 1, 10) as day, COUNT(*) as cnt
        FROM commits WHERE project_id=:pid
        GROUP BY day ORDER BY day DESC LIMIT 30
    """), {"pid": project_id}).fetchall()

    return {
        "total": total,
        "by_author": [{"author": r[0], "count": r[1]} for r in by_author],
        "by_day":    [{"date": r[0], "count": r[1]} for r in by_week],
    }

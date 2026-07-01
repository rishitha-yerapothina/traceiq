from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

router = APIRouter(prefix="/api/requirements", tags=["requirements"])


@router.get("/{project_id}")
def list_requirements(project_id: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, text, type, status, confidence, linked_function, linked_file, is_tested, risk_level
        FROM requirements WHERE project_id=:pid ORDER BY status DESC, confidence DESC
    """), {"pid": project_id}).fetchall()

    return [{"id": r[0], "text": r[1], "type": r[2], "status": r[3],
             "confidence": r[4], "linked_function": r[5], "linked_file": r[6],
             "is_tested": bool(r[7]), "risk_level": r[8]} for r in rows]


@router.get("/{project_id}/{req_id}")
def get_requirement(project_id: str, req_id: str, db: Session = Depends(get_db)):
    r = db.execute(text("""
        SELECT id, text, type, status, confidence, linked_function, linked_file, is_tested, risk_level
        FROM requirements WHERE id=:rid AND project_id=:pid
    """), {"rid": req_id, "pid": project_id}).fetchone()

    if not r:
        from fastapi import HTTPException
        raise HTTPException(404, "Requirement not found")

    req = {"id": r[0], "text": r[1], "type": r[2], "status": r[3],
           "confidence": r[4], "linked_function": r[5], "linked_file": r[6],
           "is_tested": bool(r[7]), "risk_level": r[8]}

    # how many commits touched the linked file
    commit_count = 0
    if req["linked_file"]:
        commit_count = db.execute(text(
            "SELECT COUNT(*) FROM commits WHERE project_id=:pid"
        ), {"pid": project_id}).scalar() or 0

    req["commit_count"] = commit_count
    return req


@router.get("/{project_id}/stats/summary")
def req_stats(project_id: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT status, type, COUNT(*) as cnt
        FROM requirements WHERE project_id=:pid
        GROUP BY status, type
    """), {"pid": project_id}).fetchall()

    result = {"implemented": 0, "missing": 0, "functional": 0, "non_functional": 0}
    for status, rtype, cnt in rows:
        if status == "implemented": result["implemented"] += cnt
        else: result["missing"] += cnt
        if rtype == "F": result["functional"] += cnt
        else: result["non_functional"] += cnt
    return result

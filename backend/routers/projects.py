import uuid, os, shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/")
async def create_project(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    repo_url: str = Form(...),
    pdf: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    project_id = str(uuid.uuid4())
    pdf_path   = os.path.join(UPLOAD_DIR, f"{project_id}.pdf")

    with open(pdf_path, "wb") as f:
        shutil.copyfileobj(pdf.file, f)

    db.execute(text(
        "INSERT INTO projects (id, name, repo_url) VALUES (:id, :name, :url)"
    ), {"id": project_id, "name": name, "url": repo_url})
    db.commit()

    # run analysis in background so API returns immediately
    background_tasks.add_task(_run_analysis, project_id, repo_url, pdf_path)

    return {"project_id": project_id, "name": name, "status": "analyzing"}


def _run_analysis(project_id: str, repo_url: str, pdf_path: str):
    from database import SessionLocal
    from services.analyzer import run_analysis
    db = SessionLocal()
    try:
        run_analysis(db, project_id, repo_url, pdf_path)
    except Exception as e:
        print(f"[analysis error] {e}")
    finally:
        db.close()


@router.post("/{project_id}/analyze")
async def reanalyze_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    row = db.execute(text(
        "SELECT repo_url FROM projects WHERE id=:id"
    ), {"id": project_id}).fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(404, "Project not found")

    pdf_path = os.path.join(UPLOAD_DIR, f"{project_id}.pdf")
    if not os.path.exists(pdf_path):
        from fastapi import HTTPException
        raise HTTPException(400, "Original PDF not found — cannot re-analyze")

    # clear old data
    db.execute(text("DELETE FROM requirements WHERE project_id=:pid"), {"pid": project_id})
    db.execute(text("DELETE FROM commits WHERE project_id=:pid"), {"pid": project_id})
    db.execute(text("DELETE FROM pipeline_stages WHERE project_id=:pid"), {"pid": project_id})
    db.commit()

    background_tasks.add_task(_run_analysis, project_id, row[0], pdf_path)
    return {"status": "reanalyzing"}


@router.get("/")
def list_projects(db: Session = Depends(get_db)):
    rows = db.execute(text(
        "SELECT id, name, repo_url, created_at FROM projects ORDER BY created_at DESC"
    )).fetchall()
    return [{"id": r[0], "name": r[1], "repo_url": r[2], "created_at": r[3]} for r in rows]


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    r = db.execute(text(
        "SELECT id, name, repo_url, created_at FROM projects WHERE id=:id"
    ), {"id": project_id}).fetchone()
    if not r:
        from fastapi import HTTPException
        raise HTTPException(404, "Project not found")
    return {"id": r[0], "name": r[1], "repo_url": r[2], "created_at": r[3]}


@router.get("/{project_id}/summary")
def get_summary(project_id: str, db: Session = Depends(get_db)):
    total_reqs = db.execute(text(
        "SELECT COUNT(*) FROM requirements WHERE project_id=:pid"
    ), {"pid": project_id}).scalar() or 0

    impl = db.execute(text(
        "SELECT COUNT(*) FROM requirements WHERE project_id=:pid AND status='implemented'"
    ), {"pid": project_id}).scalar() or 0

    total_commits = db.execute(text(
        "SELECT COUNT(*) FROM commits WHERE project_id=:pid"
    ), {"pid": project_id}).scalar() or 0

    failed_pipelines = db.execute(text(
        "SELECT COUNT(*) FROM commits WHERE project_id=:pid AND pipeline_status='fail'"
    ), {"pid": project_id}).scalar() or 0

    impl_pct = round(impl / max(total_reqs, 1) * 100, 1)
    pipeline_pass_rate = round((total_commits - failed_pipelines) / max(total_commits, 1) * 100, 1)

    health = round((impl_pct * 0.6 + pipeline_pass_rate * 0.4), 1)

    return {
        "total_requirements":  total_reqs,
        "implemented":         impl,
        "missing":             total_reqs - impl,
        "impl_pct":            impl_pct,
        "total_commits":       total_commits,
        "failed_pipelines":    failed_pipelines,
        "pipeline_pass_rate":  pipeline_pass_rate,
        "health_score":        health,
    }

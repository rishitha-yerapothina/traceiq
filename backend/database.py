import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./traceiq.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    repo_url    TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requirements (
    id               TEXT PRIMARY KEY,
    project_id       TEXT NOT NULL,
    text             TEXT NOT NULL,
    type             TEXT DEFAULT 'F',
    status           TEXT DEFAULT 'missing',
    confidence       REAL DEFAULT 0.0,
    linked_function  TEXT,
    linked_file      TEXT,
    is_tested        INTEGER DEFAULT 0,
    risk_level       TEXT DEFAULT 'LOW'
);

CREATE TABLE IF NOT EXISTS commits (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL,
    sha            TEXT NOT NULL,
    message        TEXT,
    author         TEXT,
    commit_date    TEXT,
    files_changed  INTEGER DEFAULT 0,
    lines_added    INTEGER DEFAULT 0,
    lines_deleted  INTEGER DEFAULT 0,
    pipeline_status TEXT DEFAULT 'pass',
    fail_probability REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id          TEXT PRIMARY KEY,
    commit_id   TEXT NOT NULL,
    project_id  TEXT NOT NULL,
    stage_name  TEXT NOT NULL,
    status      TEXT DEFAULT 'pass',
    duration_s  REAL DEFAULT 0.0,
    stage_order INTEGER DEFAULT 0
);
"""

def init_db():
    with engine.connect() as conn:
        for stmt in SCHEMA.strip().split(";"):
            s = stmt.strip()
            if s:
                conn.execute(text(s))
        conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

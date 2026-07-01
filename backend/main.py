from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import projects, requirements, commits, pipelines
from ml.inference import model_status

app = FastAPI(title="TraceIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(requirements.router)
app.include_router(commits.router)
app.include_router(pipelines.router)


@app.on_event("startup")
def startup():
    init_db()
    status = model_status()
    print("\n[TraceIQ] ML Models:")
    for name, loaded in status.items():
        print(f"  {'OK' if loaded else '--'}  {name}")
    print()


@app.get("/")
def root():
    return {"app": "TraceIQ", "version": "1.0.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok", "models": model_status()}

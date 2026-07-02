# TraceIQ

**Requirement traceability and pipeline intelligence for software projects.**

TraceIQ takes your requirements PDF and GitHub repository, then uses ML to automatically link every requirement to the code that implements it, predict whether each commit's CI pipeline will pass or fail, and surface everything in a clean analytics dashboard.

---

## What it does

| Feature | Description |
|---|---|
| **Requirement Extraction** | NLP model reads your PDF and pulls out every functional and non-functional requirement |
| **Semantic Linking** | Sentence-transformer model matches each requirement to the most relevant file in your repo |
| **Pipeline Prediction** | Trained classifier analyzes commit metadata and predicts pass/fail probability |
| **Dashboard** | Live view of implementation coverage, pipeline health, and commit risk |

---

## Tech Stack

**Backend** — Python 3.10+, FastAPI, SQLite, scikit-learn, XGBoost, sentence-transformers, pdfplumber, httpx

**Frontend** — React 18, Vite, Tailwind CSS, React Router, Recharts, Lucide

---

## Project Structure

```
traceiq/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── database.py           # SQLite setup
│   ├── routers/              # API routes (projects, requirements, commits, pipelines)
│   ├── services/
│   │   ├── analyzer.py       # Core analysis pipeline
│   │   ├── github.py         # GitHub REST API helpers
│   │   └── pdf_parser.py     # PDF text extraction + requirement filtering
│   └── ml/
│       ├── inference.py      # Model inference (classifier, semantic linker, pipeline predictor)
│       ├── train_all.py      # Training script for all models
│       └── models/           # Trained model files
└── frontend/
    ├── src/
    │   ├── pages/            # Dashboard, Import, Requirements, Commits, Pipelines
    │   ├── components/       # Sidebar, MetricCard, StatusBadge, Skeleton
    │   └── api.js            # Axios API client
    └── vite.config.js
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git

### 1. Clone the repo

```bash
git clone https://github.com/rishitha-yerapothina/traceiq.git
cd traceiq
```

### 2. Start the backend

```bash
cd backend
pip install fastapi uvicorn sqlalchemy pdfplumber httpx scikit-learn xgboost sentence-transformers pypdf
python main.py
```

Backend runs at `http://localhost:8000`

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Usage

1. Open `http://localhost:5173` in your browser
2. Click **Import** in the sidebar
3. Enter a project name, paste your GitHub repo URL, and upload your requirements PDF
4. Click **Start Analysis** — TraceIQ clones the repo, extracts requirements, and runs all ML models in the background
5. Navigate to **Requirements**, **Commits**, and **Pipelines** to explore the results

> **Note:** For public repos no token is needed. For private repos or to avoid GitHub rate limits, set the `GITHUB_TOKEN` environment variable before starting the backend.

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects/` | List all projects |
| `POST` | `/api/projects/` | Create project + trigger analysis (multipart: name, repo_url, pdf) |
| `POST` | `/api/projects/{id}/analyze` | Re-run analysis on existing project |
| `GET` | `/api/projects/{id}/summary` | Health score, impl %, pipeline pass rate |
| `GET` | `/api/requirements/{id}` | All requirements with links and status |
| `GET` | `/api/commits/{id}` | Commit list with pipeline predictions |
| `GET` | `/api/pipelines/{id}` | Pipeline stage breakdown per commit |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | *(none)* | GitHub personal access token for private repos / higher rate limits |

---

## License

MIT

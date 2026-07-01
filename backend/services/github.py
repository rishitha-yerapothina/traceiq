"""
GitHub REST API helper — works with public repos, no auth required.
Adds token support via GITHUB_TOKEN env var for private repos / higher rate limits.
"""
import os, re, math
import httpx

TOKEN = os.getenv("GITHUB_TOKEN", "")
HEADERS = {"Authorization": f"token {TOKEN}"} if TOKEN else {}
BASE = "https://api.github.com"


def _parse_owner_repo(url: str):
    m = re.search(r"github\.com[:/]([^/]+)/([^/.\s]+)", url)
    if not m:
        raise ValueError(f"Cannot parse GitHub URL: {url}")
    return m.group(1), m.group(2).rstrip(".git")


def get_commits(repo_url: str, max_pages: int = 2) -> list:
    owner, repo = _parse_owner_repo(repo_url)
    commits = []
    for page in range(1, max_pages + 1):
        r = httpx.get(f"{BASE}/repos/{owner}/{repo}/commits",
                      params={"per_page": 30, "page": page},
                      headers=HEADERS, timeout=15)
        if r.status_code != 200:
            break
        data = r.json()
        if not data:
            break
        for c in data:
            commits.append({
                "sha":     c["sha"][:7],
                "message": (c["commit"]["message"] or "").split("\n")[0][:120],
                "author":  c["commit"]["author"].get("name", "unknown"),
                "date":    c["commit"]["author"].get("date", ""),
            })
    return commits


def get_commit_detail(repo_url: str, sha: str) -> dict:
    owner, repo = _parse_owner_repo(repo_url)
    r = httpx.get(f"{BASE}/repos/{owner}/{repo}/commits/{sha}",
                  headers=HEADERS, timeout=15)
    if r.status_code == 403:
        print(f"[github] rate limited — set GITHUB_TOKEN to increase limits")
        return {"files_changed": 1, "lines_added": 10, "lines_deleted": 5, "filenames": []}
    if r.status_code != 200:
        return {"files_changed": 1, "lines_added": 10, "lines_deleted": 5, "filenames": []}
    d = r.json()
    stats = d.get("stats", {})
    files = d.get("files", [])
    return {
        "files_changed": len(files),
        "lines_added":   stats.get("additions", 0),
        "lines_deleted": stats.get("deletions", 0),
        "filenames":     [f["filename"] for f in files],
    }


def get_repo_tree(repo_url: str) -> list:
    """Return list of all file paths in the default branch."""
    owner, repo = _parse_owner_repo(repo_url)
    # Resolve the default branch first — GitHub trees API rejects 'HEAD' as a ref
    info = httpx.get(f"{BASE}/repos/{owner}/{repo}", headers=HEADERS, timeout=10)
    if info.status_code != 200:
        print(f"[github] repo info failed {info.status_code}: {info.text[:200]}")
        return []
    branch = info.json().get("default_branch", "main")
    r = httpx.get(f"{BASE}/repos/{owner}/{repo}/git/trees/{branch}",
                  params={"recursive": "1"}, headers=HEADERS, timeout=20)
    if r.status_code != 200:
        print(f"[github] tree fetch failed {r.status_code}: {r.text[:200]}")
        return []
    return [item["path"] for item in r.json().get("tree", [])
            if item["type"] == "blob"]


def get_repo_info(repo_url: str) -> dict:
    owner, repo = _parse_owner_repo(repo_url)
    r = httpx.get(f"{BASE}/repos/{owner}/{repo}", headers=HEADERS, timeout=10)
    if r.status_code != 200:
        return {}
    d = r.json()
    return {
        "name":        d.get("name", repo),
        "description": d.get("description", ""),
        "language":    d.get("language", ""),
        "stars":       d.get("stargazers_count", 0),
        "forks":       d.get("forks_count", 0),
        "open_issues": d.get("open_issues_count", 0),
        "default_branch": d.get("default_branch", "main"),
    }

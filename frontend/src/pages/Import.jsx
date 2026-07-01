import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Link, FileText, ArrowRight, CheckCircle } from "lucide-react";
import { createProject } from "../api";

export default function Import({ onProjectCreated }) {
  const [name, setName]       = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [pdf, setPdf]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !repoUrl || !pdf) { setError("Fill in all fields."); return; }
    setError(""); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("repo_url", repoUrl);
      fd.append("pdf", pdf);
      const res = await createProject(fd);
      onProjectCreated({ id: res.data.project_id, name, repo_url: repoUrl });
      setDone(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <CheckCircle size={52} className="text-emerald-500" />
      <div className="text-2xl font-bold text-gray-900">Analysis started!</div>
      <div className="text-gray-500 text-sm">Redirecting to dashboard…</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Import Project</h1>
        <p className="text-gray-500 text-sm mt-2">
          Upload your requirements PDF and connect your GitHub repo. TraceIQ will analyze everything using ML.
        </p>
      </div>

      {/* steps */}
      <div className="flex items-center gap-2 mb-8">
        {["Upload PDF", "Connect Repo", "Analyze"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">{i + 1}</div>
              <span className="text-sm text-gray-600 font-medium">{s}</span>
            </div>
            {i < 2 && <div className="w-8 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* project name */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Project Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. StyleNest E-Commerce"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition"
          />
        </div>

        {/* github url */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            <span className="flex items-center gap-2"><Link size={13} /> GitHub Repository URL</span>
          </label>
          <input
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repo"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition"
          />
          <p className="text-xs text-indigo-500 mt-2 font-medium">
            Public repos only. For private repos set <span className="font-bold">GITHUB_TOKEN</span> env variable.
          </p>
        </div>

        {/* pdf upload */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            <span className="flex items-center gap-2"><FileText size={13} /> Requirements PDF</span>
          </label>
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition">
            <input type="file" accept=".pdf" className="hidden"
              onChange={e => setPdf(e.target.files[0])} />
            {pdf ? (
              <div className="flex items-center gap-2.5 text-emerald-600">
                <CheckCircle size={20} />
                <span className="text-sm font-semibold">{pdf.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Upload size={26} />
                <span className="text-sm font-medium text-gray-500">Drop your PDF here or click to browse</span>
                <span className="text-xs text-gray-400">Freeform text, numbered lists — any format works</span>
              </div>
            )}
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition text-sm shadow-sm"
        >
          {loading ? "Analyzing…" : <><span>Start Analysis</span><ArrowRight size={16} /></>}
        </button>
      </form>

      {/* what happens next */}
      <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">What happens next</div>
        <div className="space-y-4">
          {[
            ["🤖", "Requirement Extractor", "NLP model reads your PDF and pulls out every requirement automatically"],
            ["🔗", "Semantic Linker",        "ML model matches each requirement to the best matching function in your repo"],
            ["⚠️", "Pipeline Predictor",     "ML model analyzes every commit and predicts if its pipeline would pass or fail"],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-lg mt-0.5">{icon}</span>
              <div>
                <div className="text-sm font-semibold text-gray-800">{title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

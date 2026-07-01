import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar      from "./components/Sidebar";
import Dashboard    from "./pages/Dashboard";
import Import       from "./pages/Import";
import Requirements from "./pages/Requirements";
import Pipelines    from "./pages/Pipelines";
import Commits      from "./pages/Commits";
import { getProjects } from "./api";

export default function App() {
  const [project, setProject] = useState(() => {
    try { return JSON.parse(localStorage.getItem("traceiq_project")); } catch { return null; }
  });

  useEffect(() => {
    if (!project) {
      getProjects().then(r => {
        if (r.data.length > 0) {
          const p = r.data[0];
          setProject(p);
          localStorage.setItem("traceiq_project", JSON.stringify(p));
        }
      }).catch(() => {});
    }
  }, []);

  function handleProjectCreated(p) {
    setProject(p);
    localStorage.setItem("traceiq_project", JSON.stringify(p));
  }

  function handleProjectSwitch(p) {
    setProject(p);
    localStorage.setItem("traceiq_project", JSON.stringify(p));
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-[#f0f2f7]">
        <Sidebar project={project} onProjectSwitch={handleProjectSwitch} />
        <main className="ml-56 flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/"             element={<Dashboard    project={project} />} />
            <Route path="/import"       element={<Import       onProjectCreated={handleProjectCreated} />} />
            <Route path="/requirements" element={<Requirements project={project} />} />
            <Route path="/pipelines"    element={<Pipelines    project={project} />} />
            <Route path="/commits"      element={<Commits      project={project} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

export const getProjects      = ()     => api.get("/api/projects/");
export const getProject       = (id)   => api.get(`/api/projects/${id}`);
export const getSummary       = (id)   => api.get(`/api/projects/${id}/summary`);
export const getRequirements  = (id)   => api.get(`/api/requirements/${id}`);
export const getRequirement   = (pid, rid) => api.get(`/api/requirements/${pid}/${rid}`);
export const getCommits       = (id)   => api.get(`/api/commits/${id}`);
export const getCommitStats   = (id)   => api.get(`/api/commits/${id}/stats`);
export const getPipelines     = (id)   => api.get(`/api/pipelines/${id}`);
export const getPipelineStats = (id)   => api.get(`/api/pipelines/${id}/stats`);
export const getHealth        = ()     => api.get("/health");

export const createProject = (formData) =>
  api.post("/api/projects/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const reanalyze = (id) => api.post(`/api/projects/${id}/analyze`, {});

export default api;

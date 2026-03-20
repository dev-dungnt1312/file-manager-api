const state = {
  apiBaseUrl: localStorage.getItem('fm.apiBaseUrl') || `${location.origin}/file-manager/api`,
  apiToken: localStorage.getItem('fm.apiToken') || 'change-me',
  projects: [],
  project: null,
  currentPath: '',
};

const $ = (id) => document.getElementById(id);
const logs = $('logs');

function log(message, data) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}` + (data ? `\n${JSON.stringify(data, null, 2)}` : '');
  logs.textContent = `${line}\n\n${logs.textContent}`;
}

function saveConfig() {
  state.apiBaseUrl = $('apiBaseUrl').value.trim().replace(/\/$/, '');
  state.apiToken = $('apiToken').value.trim();
  localStorage.setItem('fm.apiBaseUrl', state.apiBaseUrl);
  localStorage.setItem('fm.apiToken', state.apiToken);
  log('Saved config');
}

async function api(path, options = {}) {
  const res = await fetch(`${state.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'x-api-token': state.apiToken,
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });
  if (res.headers.get('content-type')?.includes('application/json')) {
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.error?.message || `HTTP ${res.status}`);
    return json;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

function renderProjects() {
  $('projectList').innerHTML = state.projects.map((project) => `
    <div class="project-item ${state.project?.id === project.id ? 'active' : ''}" data-id="${project.id}">
      <strong>${project.name}</strong><br />
      <span class="code-chip">${project.driver}</span>
      <span class="muted">${project.code}</span>
    </div>
  `).join('');

  document.querySelectorAll('.project-item').forEach((el) => {
    el.addEventListener('click', async () => {
      state.project = state.projects.find((p) => p.id === el.dataset.id);
      state.currentPath = '';
      $('currentPath').value = '';
      renderProjects();
      renderProjectHeader();
      await loadFiles();
    });
  });
}

function renderProjectHeader() {
  $('projectTitle').textContent = state.project ? state.project.name : 'No project selected';
  $('projectMeta').textContent = state.project ? `${state.project.code} • ${state.project.driver}` : '';
}

function formatSize(value) {
  if (value == null) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function parentPath(path) {
  if (!path) return '';
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

async function loadProjects() {
  saveConfig();
  const data = await api('/projects');
  state.projects = data.data;
  if (!state.project && state.projects[0]) state.project = state.projects[0];
  renderProjects();
  renderProjectHeader();
  if (state.project) await loadFiles();
  log('Loaded projects', { count: state.projects.length });
}

async function loadFiles(path = state.currentPath) {
  if (!state.project) return;
  state.currentPath = path || '';
  $('currentPath').value = state.currentPath;
  const data = await api(`/projects/${state.project.id}/files?path=${encodeURIComponent(state.currentPath)}`);
  $('fileTableBody').innerHTML = data.data.map((item) => `
    <tr>
      <td>${item.type === 'directory' ? '📁' : '📄'} ${item.name}</td>
      <td>${item.type}</td>
      <td>${formatSize(item.size)}</td>
      <td>${item.lastModified || '-'}</td>
      <td>
        ${item.type === 'directory' ? `<button class="secondary open-btn" data-path="${item.path}">Open</button>` : `<a href="${state.apiBaseUrl}/projects/${state.project.id}/files/content?path=${encodeURIComponent(item.path)}" target="_blank">View</a>`}
        <button class="secondary fill-delete-btn" data-path="${item.path}">Delete</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.open-btn').forEach((btn) => btn.addEventListener('click', () => loadFiles(btn.dataset.path)));
  document.querySelectorAll('.fill-delete-btn').forEach((btn) => btn.addEventListener('click', () => $('deletePath').value = btn.dataset.path));
  log('Loaded files', { path: state.currentPath, count: data.data.length });
}

async function createFolder() {
  await api(`/projects/${state.project.id}/files/mkdir`, { method: 'POST', body: JSON.stringify({ path: $('mkdirPath').value.trim() }) });
  $('mkdirPath').value = '';
  await loadFiles(state.currentPath);
}

async function uploadFile() {
  const file = $('uploadFile').files[0];
  if (!file) throw new Error('Select a file first');
  const form = new FormData();
  form.append('path', $('uploadPath').value.trim() || file.name);
  form.append('file', file);
  await api(`/projects/${state.project.id}/files/upload`, { method: 'POST', body: form, headers: {} });
  $('uploadFile').value = '';
  $('uploadPath').value = '';
  await loadFiles(state.currentPath);
}

async function moveFile() {
  await api(`/projects/${state.project.id}/files/move`, { method: 'POST', body: JSON.stringify({ from: $('moveFrom').value.trim(), to: $('moveTo').value.trim() }) });
  await loadFiles(state.currentPath);
}

async function copyFile() {
  await api(`/projects/${state.project.id}/files/copy`, { method: 'POST', body: JSON.stringify({ from: $('copyFrom').value.trim(), to: $('copyTo').value.trim() }) });
  await loadFiles(state.currentPath);
}

async function deleteFile() {
  await api(`/projects/${state.project.id}/files?path=${encodeURIComponent($('deletePath').value.trim())}`, { method: 'DELETE' });
  $('deletePath').value = '';
  await loadFiles(state.currentPath);
}

function bind() {
  $('apiBaseUrl').value = state.apiBaseUrl;
  $('apiToken').value = state.apiToken;
  $('saveConfigBtn').onclick = saveConfig;
  $('loadProjectsBtn').onclick = () => loadProjects().catch((e) => log(`Error: ${e.message}`));
  $('refreshBtn').onclick = () => loadFiles().catch((e) => log(`Error: ${e.message}`));
  $('openPathBtn').onclick = () => loadFiles($('currentPath').value.trim()).catch((e) => log(`Error: ${e.message}`));
  $('upBtn').onclick = () => loadFiles(parentPath(state.currentPath)).catch((e) => log(`Error: ${e.message}`));
  $('mkdirBtn').onclick = () => createFolder().catch((e) => log(`Error: ${e.message}`));
  $('uploadBtn').onclick = () => uploadFile().catch((e) => log(`Error: ${e.message}`));
  $('moveBtn').onclick = () => moveFile().catch((e) => log(`Error: ${e.message}`));
  $('copyBtn').onclick = () => copyFile().catch((e) => log(`Error: ${e.message}`));
  $('deleteBtn').onclick = () => deleteFile().catch((e) => log(`Error: ${e.message}`));
}

bind();
loadProjects().catch((e) => log(`Startup error: ${e.message}`));

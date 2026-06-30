// ── State ─────────────────────────────────────────────────────
let consultores = [];
let atividades = [];

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  bindTabs();
  bindFiltros();
  bindForms();
  carregarConsultores().then(carregarAtividades);
});

function setDefaultDate() {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('filtroData').value = hoje;
  document.getElementById('atividadeData').value = hoje;
}

// ── Tabs ──────────────────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'consultores') renderConsultores();
    });
  });
}

// ── Filtros ───────────────────────────────────────────────────
function bindFiltros() {
  ['filtroData', 'filtroConsultor', 'filtroStatus'].forEach(id => {
    document.getElementById(id).addEventListener('change', aplicarFiltros);
  });
}

function aplicarFiltros() {
  const data = document.getElementById('filtroData').value;
  const consultorId = document.getElementById('filtroConsultor').value;
  const status = document.getElementById('filtroStatus').value;

  let lista = [...atividades];
  if (data) lista = lista.filter(a => a.data === data);
  if (consultorId) lista = lista.filter(a => a.consultorId === consultorId);
  if (status) lista = lista.filter(a => a.status === status);

  renderAtividades(lista);
}

// ── Carregar dados ────────────────────────────────────────────
async function carregarConsultores() {
  const res = await fetch('/api/consultores');
  consultores = await res.json();
  popularSelectConsultores();
}

function popularSelectConsultores() {
  const selects = [
    document.getElementById('filtroConsultor'),
    document.getElementById('atividadeConsultor')
  ];
  selects.forEach(sel => {
    const val = sel.value;
    const firstOpt = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(firstOpt.cloneNode(true));
    consultores.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sel.appendChild(opt);
    });
    sel.value = val;
  });
}

async function carregarAtividades() {
  const res = await fetch('/api/atividades');
  const data = await res.json();
  atividades = data.atividades;
  if (data.rolledOver) {
    document.getElementById('rolloverBanner').classList.remove('hidden');
  }
  aplicarFiltros();
}

// ── Render Atividades ─────────────────────────────────────────
function renderAtividades(lista) {
  const container = document.getElementById('listaAtividades');

  if (lista.length === 0) {
    container.innerHTML = `<div class="empty-state"><span>📭</span>Nenhuma atividade encontrada.</div>`;
    return;
  }

  // Sort: pendentes primeiro, depois por prioridade alta → normal → baixa
  const ordem = { alta: 0, normal: 1, baixa: 2 };
  lista.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pendente' ? -1 : 1;
    return (ordem[a.prioridade] ?? 1) - (ordem[b.prioridade] ?? 1);
  });

  container.innerHTML = lista.map(a => {
    const rolada = a.dataOriginal ? `<span class="badge badge-rolada">↩ Rolada de ${formatDate(a.dataOriginal)}</span> ` : '';
    const descHtml = a.descricao ? `<p class="card-desc">${esc(a.descricao)}</p>` : '';
    const acaoPrincipal = a.status === 'pendente'
      ? `<button class="btn-icon concluir" onclick="concluirAtividade('${a.id}')">✓ Concluir</button>`
      : `<button class="btn-icon reabrir" onclick="reabrirAtividade('${a.id}')">↩ Reabrir</button>`;
    return `
      <div class="card ${a.status} prioridade-${a.prioridade}">
        <div class="card-header">
          <span class="card-titulo">${esc(a.titulo)}</span>
          <span class="badge badge-${a.prioridade}">${a.prioridade}</span>
        </div>
        ${descHtml}
        <div class="card-meta">
          <span>📅 ${formatDate(a.data)}</span>
          <span>👤 ${esc(a.consultorNome)}</span>
          <span>${rolada}<span class="badge badge-${a.status}">${a.status}</span></span>
        </div>
        <div class="card-actions">
          ${acaoPrincipal}
          <button class="btn-icon" onclick="editarAtividade('${a.id}')">✏️ Editar</button>
          <button class="btn-icon excluir" onclick="excluirAtividade('${a.id}')">🗑</button>
        </div>
      </div>`;
  }).join('');
}

// ── Render Consultores ────────────────────────────────────────
function renderConsultores() {
  const tbody = document.getElementById('tBodyConsultores');
  if (consultores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#888;padding:32px">Nenhum consultor cadastrado.</td></tr>`;
    return;
  }
  tbody.innerHTML = consultores.map(c => `
    <tr>
      <td>${esc(c.nome)}</td>
      <td>${esc(c.email)}</td>
      <td>${esc(c.telefone)}</td>
      <td>
        <div class="td-actions">
          <button class="btn-icon" onclick="editarConsultor('${c.id}')">✏️ Editar</button>
          <button class="btn-icon excluir" onclick="excluirConsultor('${c.id}')">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

// ── Ações Atividades ──────────────────────────────────────────
async function concluirAtividade(id) {
  await fetch(`/api/atividades/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'concluida' }) });
  await carregarAtividades();
}

async function reabrirAtividade(id) {
  await fetch(`/api/atividades/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'pendente' }) });
  await carregarAtividades();
}

async function excluirAtividade(id) {
  if (!confirm('Excluir esta atividade?')) return;
  await fetch(`/api/atividades/${id}`, { method: 'DELETE' });
  await carregarAtividades();
}

function editarAtividade(id) {
  const a = atividades.find(x => x.id === id);
  if (!a) return;
  document.getElementById('atividadeId').value = a.id;
  document.getElementById('atividadeTitulo').value = a.titulo;
  document.getElementById('atividadeDescricao').value = a.descricao;
  document.getElementById('atividadeData').value = a.data;
  document.getElementById('atividadePrioridade').value = a.prioridade;
  document.getElementById('atividadeConsultor').value = a.consultorId || '';
  document.getElementById('modalAtividadeTitulo').textContent = 'Editar Atividade';
  abrirModal('modalAtividade');
}

// ── Ações Consultores ─────────────────────────────────────────
async function excluirConsultor(id) {
  if (!confirm('Excluir este consultor?')) return;
  await fetch(`/api/consultores/${id}`, { method: 'DELETE' });
  await carregarConsultores();
  renderConsultores();
}

function editarConsultor(id) {
  const c = consultores.find(x => x.id === id);
  if (!c) return;
  document.getElementById('consultorId').value = c.id;
  document.getElementById('consultorNome').value = c.nome;
  document.getElementById('consultorEmail').value = c.email;
  document.getElementById('consultorTelefone').value = c.telefone;
  document.getElementById('modalConsultorTitulo').textContent = 'Editar Consultor';
  abrirModal('modalConsultor');
}

// ── Forms ─────────────────────────────────────────────────────
function bindForms() {
  document.getElementById('formAtividade').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('atividadeId').value;
    const payload = {
      titulo: document.getElementById('atividadeTitulo').value,
      descricao: document.getElementById('atividadeDescricao').value,
      data: document.getElementById('atividadeData').value,
      prioridade: document.getElementById('atividadePrioridade').value,
      consultorId: document.getElementById('atividadeConsultor').value || null
    };
    if (id) {
      await fetch(`/api/atividades/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/atividades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    fecharModalAtividade();
    await carregarAtividades();
  });

  document.getElementById('formConsultor').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('consultorId').value;
    const payload = {
      nome: document.getElementById('consultorNome').value,
      email: document.getElementById('consultorEmail').value,
      telefone: document.getElementById('consultorTelefone').value
    };
    if (id) {
      await fetch(`/api/consultores/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/consultores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    fecharModalConsultor();
    await carregarConsultores();
    renderConsultores();
  });
}

// ── Modais ─────────────────────────────────────────────────────
function abrirModalAtividade() {
  document.getElementById('formAtividade').reset();
  document.getElementById('atividadeId').value = '';
  setDefaultDate();
  document.getElementById('modalAtividadeTitulo').textContent = 'Nova Atividade';
  abrirModal('modalAtividade');
}

function fecharModalAtividade() { fecharModal('modalAtividade'); }

function abrirModalConsultor() {
  document.getElementById('formConsultor').reset();
  document.getElementById('consultorId').value = '';
  document.getElementById('modalConsultorTitulo').textContent = 'Novo Consultor';
  abrirModal('modalConsultor');
}

function fecharModalConsultor() { fecharModal('modalConsultor'); }

function abrirModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

function fecharModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
}

function fecharTodosModais() {
  ['modalAtividade', 'modalConsultor'].forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById('overlay').classList.add('hidden');
}

function fecharBanner() {
  document.getElementById('rolloverBanner').classList.add('hidden');
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

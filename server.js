const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { consultores: [], atividades: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// Rollover: move pending activities from past days to today
function rolloverPendentes(db) {
  const todayStr = today();
  let changed = false;
  db.atividades.forEach(a => {
    if (a.status === 'pendente' && a.data < todayStr) {
      a.dataOriginal = a.dataOriginal || a.data;
      a.data = todayStr;
      changed = true;
    }
  });
  if (changed) writeDB(db);
  return changed;
}

// ── Consultores ──────────────────────────────────────────────

app.get('/api/consultores', (req, res) => {
  const db = readDB();
  res.json(db.consultores);
});

app.post('/api/consultores', (req, res) => {
  const { nome, email, telefone } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  const db = readDB();
  const consultor = { id: Date.now().toString(), nome, email: email || '', telefone: telefone || '' };
  db.consultores.push(consultor);
  writeDB(db);
  res.status(201).json(consultor);
});

app.put('/api/consultores/:id', (req, res) => {
  const db = readDB();
  const idx = db.consultores.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Não encontrado' });
  db.consultores[idx] = { ...db.consultores[idx], ...req.body };
  writeDB(db);
  res.json(db.consultores[idx]);
});

app.delete('/api/consultores/:id', (req, res) => {
  const db = readDB();
  db.consultores = db.consultores.filter(c => c.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// ── Atividades ───────────────────────────────────────────────

app.get('/api/atividades', (req, res) => {
  const db = readDB();
  const rolledOver = rolloverPendentes(db);
  const { data, consultorId } = req.query;
  let list = db.atividades;
  if (data) list = list.filter(a => a.data === data);
  if (consultorId) list = list.filter(a => a.consultorId === consultorId);
  // Enrich with consultant name
  const enriched = list.map(a => {
    const c = db.consultores.find(c => c.id === a.consultorId);
    return { ...a, consultorNome: c ? c.nome : '—' };
  });
  res.json({ atividades: enriched, rolledOver });
});

app.post('/api/atividades', (req, res) => {
  const { titulo, descricao, consultorId, data, prioridade } = req.body;
  if (!titulo) return res.status(400).json({ error: 'Título obrigatório' });
  const db = readDB();
  const atividade = {
    id: Date.now().toString(),
    titulo,
    descricao: descricao || '',
    consultorId: consultorId || null,
    data: data || today(),
    prioridade: prioridade || 'normal',
    status: 'pendente',
    dataOriginal: null,
    criadoEm: new Date().toISOString()
  };
  db.atividades.push(atividade);
  writeDB(db);
  res.status(201).json(atividade);
});

app.put('/api/atividades/:id', (req, res) => {
  const db = readDB();
  const idx = db.atividades.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Não encontrada' });
  db.atividades[idx] = { ...db.atividades[idx], ...req.body };
  writeDB(db);
  res.json(db.atividades[idx]);
});

app.delete('/api/atividades/:id', (req, res) => {
  const db = readDB();
  db.atividades = db.atividades.filter(a => a.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\n✅ Controle de Atividades rodando em http://localhost:${PORT}\n`);
});

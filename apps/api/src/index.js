import express from 'express';
import cors from 'cors';
import { pool, initSchema } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/items', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, name, created_at FROM items ORDER BY id DESC');
  res.json(rows);
});

app.post('/api/items', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }
  const { rows } = await pool.query(
    'INSERT INTO items (name) VALUES ($1) RETURNING id, name, created_at',
    [name]
  );
  res.status(201).json(rows[0]);
});

app.delete('/api/items/:id', async (req, res) => {
  await pool.query('DELETE FROM items WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

const port = process.env.PORT || 3000;

async function start() {
  await initSchema();
  app.listen(port, () => console.log(`api listening on ${port}`));
}

start().catch((err) => {
  console.error('failed to start api', err);
  process.exit(1);
});

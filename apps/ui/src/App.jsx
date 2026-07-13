import { useEffect, useState } from 'react';

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  async function loadItems() {
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error(`failed to load items: ${res.status}`);
      setItems(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function addItem(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName('');
      loadItems();
    } else {
      setError(`failed to add item: ${res.status}`);
    }
  }

  async function removeItem(id) {
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    loadItems();
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '2rem auto' }}>
      <h1>Practise 3-Tier App</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={addItem}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="new item" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} <button onClick={() => removeItem(item.id)}>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

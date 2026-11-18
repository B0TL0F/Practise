import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';

const currency = amount => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
}).format(Number(amount ?? 0));

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || detail.message || `${url} returned HTTP ${response.status}`);
  }
  return response.json();
}

function App() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ transactionCount: 0, totalSimulated: 0 });
  const [status, setStatus] = useState('Checking services...');
  const [online, setOnline] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    const responses = await Promise.allSettled([
      api('/api/accounts'),
      api('/api/transactions'),
      api('/api/transactions/summary')
    ]);
    const healthy = responses.every(r => r.status === 'fulfilled');
    setOnline(healthy);
    setStatus(healthy ? 'All services responding' : 'One or more APIs unavailable');
    if (responses[0].status === 'fulfilled') {
      setAccounts(responses[0].value);
      setAccountId(old => old || responses[0].value[0]?.id || '');
    }
    if (responses[1].status === 'fulfilled') setTransactions(responses[1].value);
    if (responses[2].status === 'fulfilled') setSummary(responses[2].value);
    if (!healthy) {
      setError(true);
      setNotice('A service did not respond. Check Docker Compose or Kubernetes Pod logs.');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function submitPayment(event) {
    event.preventDefault();
    if (!accountId || !recipient.trim() || Number(amount) <= 0) return;
    setSaving(true);
    setNotice('Saving simulated payment...');
    setError(false);
    try {
      await api('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ accountId, recipient: recipient.trim(), amount: Number(amount) })
      });
      setRecipient('');
      setAmount('');
      await refresh();
      setNotice('Simulated payment recorded in PostgreSQL. No money was transferred.');
    } catch (e) {
      setError(true);
      setNotice(`Unable to record payment: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const demoBalance = accounts.reduce((total, item) => total + Number(item.demoBalance || 0), 0);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">L</span><span><b>LedgerLab</b><small>DEVOPS SIMULATOR</small></span></div>
        <div className="side-label">WORKSPACE</div>
        <a href="#overview" className="nav-link active"><span>◈</span> Overview</a>
        <a href="#payments" className="nav-link"><span>↗</span> New payment</a>
        <a href="#activity" className="nav-link"><span>☷</span> Transactions</a>
        <div className="sidebar-bottom">
          <div className="server-status"><span className={`dot ${online ? 'good' : 'bad'}`}></span><span>{status}</span></div>
          <div className="fineprint">Interview lab · simulated transactions only</div>
        </div>
      </aside>
      <main className="main" id="overview">
        <header className="topbar">
          <div><span className="breadcrumb">Workspace</span><span className="slash">/</span><span className="breadcrumb-current">Overview</span></div>
          <div className="right-header"><span className="demo-pill">● DEMO ENVIRONMENT</span><div className="avatar">DV</div></div>
        </header>
        <section className="hero">
          <div><p className="eyebrow">BANKING OPERATIONS</p><h1>Payment operations, <em>simplified.</em></h1><p>Three Spring Boot microservices, one React interface, and a complete DevOps deployment pipeline.</p></div>
          <span className="hero-icon">↗</span>
        </section>
        <div className="notice"><span>ⓘ</span> Fictional banking lab. No real money moves; balances and payments are simulated.</div>
        <section className="stats">
          <article className="stat"><div className="stat-label">Demo account balances <span>↗</span></div><strong>{accounts.length ? currency(demoBalance) : '—'}</strong><small>Static demonstration balances</small></article>
          <article className="stat"><div className="stat-label">Payments recorded <span>◉</span></div><strong>{online ? summary.transactionCount : '—'}</strong><small>Persisted in PostgreSQL</small></article>
          <article className="stat"><div className="stat-label">Simulated payment volume <span>▤</span></div><strong>{online ? currency(summary.totalSimulated) : '—'}</strong><small>Across the last 100 records</small></article>
        </section>
        <section className="content-grid">
          <article className="panel form-panel" id="payments">
            <div className="panel-head"><div><p className="eyebrow">OPERATIONS</p><h2>Create demo payment</h2></div><span className="pill">Sandbox only</span></div>
            <p className="muted">The browser calls Payments API, which validates Accounts API, then writes to PostgreSQL.</p>
            <form onSubmit={submitPayment}>
              <label htmlFor="accountId">Source account</label>
              <select id="accountId" value={accountId} onChange={e=>setAccountId(e.target.value)} required>
                {!accounts.length && <option value="">Loading demo accounts...</option>}
                {accounts.map(account => <option key={account.id} value={account.id}>{account.label} ({account.numberMasked})</option>)}
              </select>
              <label htmlFor="recipient">Recipient</label>
              <input id="recipient" value={recipient} onChange={e=>setRecipient(e.target.value)} maxLength={80} required placeholder="e.g. Demo Coffee Store" autoComplete="off" />
              <label htmlFor="amount">Amount (INR)</label>
              <div className="money-input"><span>₹</span><input id="amount" value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0.01" max="100000" step="0.01" placeholder="0.00" required /></div>
              <button id="sendBtn" type="submit" disabled={saving || !accounts.length}>{saving ? 'Recording...' : 'Simulate payment →'}</button>
            </form>
            <div id="toast" className={notice ? (error ? 'error' : 'success') : ''} role="status" aria-live="polite">{notice}</div>
          </article>
          <article className="panel accounts-panel">
            <div className="panel-head"><div><p className="eyebrow">ACCOUNTS MICROSERVICE</p><h2>Demo accounts</h2></div><span className="icon-circle">▦</span></div>
            <div className="accounts-list">
              {!accounts.length ? <div className="loading">Fetching accounts...</div> : accounts.map((account, index) => (
                <div className="account-item" key={account.id}>
                  <div className={`account-icon ${index===1?'alt':index===2?'last':''}`}>▤</div>
                  <div className="account-meta"><b>{account.label}</b><small>{account.numberMasked}</small></div>
                  <div className="account-amount">{currency(account.demoBalance)}</div>
                </div>
              ))}
            </div>
            <div className="info-box"><span className="info-icon">◆</span><div><b>Microservice communication</b><p>Payments service verifies the selected account using Accounts API before recording a simulated payment.</p></div></div>
          </article>
        </section>
        <section className="panel history" id="activity">
          <div className="panel-head"><div><p className="eyebrow">TRANSACTIONS MICROSERVICE</p><h2>Recent activity</h2></div><button className="refresh" type="button" onClick={refresh}>↻ Refresh</button></div>
          <div className="table-scroller"><table><thead><tr><th>RECIPIENT</th><th>ACCOUNT</th><th>DATE / TIME</th><th>STATUS</th><th className="right">AMOUNT</th></tr></thead>
            <tbody>
              {!transactions.length ? <tr><td colSpan={5} className="empty">No payments to show.</td></tr> : transactions.slice(0,8).map(tx => (
                <tr key={tx.id}>
                  <td className="tx-name">{tx.recipient}</td>
                  <td>{tx.accountId}</td>
                  <td className="tx-date">{new Date(tx.createdAt).toLocaleString('en-IN')}</td>
                  <td><span className="tx-status">{tx.status}</span></td>
                  <td className="right">{currency(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
        <footer>LEDGERLAB v2.0 <span>•</span> React <span>•</span> Spring Boot APIs <span>•</span> PostgreSQL <span>•</span> Simulated data only</footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

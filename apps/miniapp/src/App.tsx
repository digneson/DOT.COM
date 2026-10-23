import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

const tabs = [
  { id: 'Home', icon: '⌂' },
  { id: 'Tasks', icon: '▤' },
  { id: 'Friends', icon: '♧' },
  { id: 'Wallet', icon: '◈' },
  { id: 'Profile', icon: '◎' },
];

const API = (import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:3000' : '')).replace(/\/$/, '');

type User = {
  telegramId: string;
  username: string | null;
  displayName: string;
  createdAt?: string;
};

type Account = {
  user: User;
  balance: number | string;
};

function App() {
  const [tab, setTab] = useState('Home');
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | string>(0);
  const [authState, setAuthState] = useState('loading');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const telegram = window.Telegram?.WebApp;
      telegram?.ready();
      telegram?.expand();

      if (!telegram?.initData) {
        setAuthState('outside');
        return;
      }

      if (!API) {
        setAuthState('configuration');
        return;
      }

      try {
        const login = await fetch(`${API}/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: telegram.initData }),
        });

        if (!login.ok) throw new Error('Telegram login failed. Please reopen DOT.COM.');

        const auth = await login.json() as {
          token: string;
          user: User;
        };

        const response = await fetch(`${API}/account`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });

        if (!response.ok) throw new Error('Could not load your account. Please try again.');

        const account = await response.json() as Account;

        if (!cancelled) {
          setUser(account.user ?? auth.user);
          setBalance(account.balance ?? 0);
          setAuthState('authenticated');
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : 'Connection failed.');
          setAuthState('error');
        }
      }
    }

    void connect();
    return () => { cancelled = true; };
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }

  const displayBalance = Number(balance).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });

  const displayName = user?.displayName || 'DOT.COM Miner';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">D<span>.</span></div>
          <div><strong>DOT<span className="blue">.COM</span></strong><small>THE FUTURE IS YOURS</small></div>
        </div>
        <button className="avatar" onClick={() => setTab('Profile')}>
          {(user?.displayName || 'D').charAt(0).toUpperCase()}
        </button>
      </header>

      <main>
        <section className="welcome">
          <div>
            <span className="eyebrow">YOUR DIGITAL JOURNEY</span>
            <h1>Mine the <span>future.</span></h1>
            <p>Every cycle brings you one step closer.</p>
          </div>
          <div className="online">
            <i />
            {authState === 'authenticated' ? 'CONNECTED' :
             authState === 'loading' ? 'CONNECTING' :
             authState === 'outside' ? 'OPEN IN TELEGRAM' : 'NOT CONNECTED'}
          </div>
        </section>

        {authState === 'loading' && (
          <section className="page-card">
            <h2>Connecting your account…</h2>
            <p className="muted">Verifying your Telegram identity securely.</p>
          </section>
        )}

        {authState === 'outside' && (
          <section className="page-card">
            <span className="eyebrow">TELEGRAM MINI APP</span>
            <h2>Open DOT.COM in Telegram</h2>
            <p className="muted">Open this app from its official Telegram bot to authenticate your account and view your real DOT balance.</p>
          </section>
        )}

        {authState === 'configuration' && (
          <section className="page-card">
            <h2>API not configured</h2>
            <p className="muted">The production API address must be configured before account login can work.</p>
          </section>
        )}

        {authState === 'error' && (
          <section className="page-card">
            <h2>Connection unsuccessful</h2>
            <p className="muted">{notice || 'Your account could not be loaded.'}</p>
            <button className="primary-btn" onClick={() => window.location.reload()}>Try again</button>
          </section>
        )}

        {authState === 'authenticated' && <>
          {tab === 'Home' && <>
            <section className="balance-card">
              <div className="card-glow" />
              <div className="balance-top"><span>YOUR DOT BALANCE</span><span className="coin-mini">D</span></div>
              <div className="balance-number">{displayBalance} <span>DOT</span></div>
              <div className="balance-note">Your recorded points balance</div>
              <div className="balance-bottom"><span>◈ &nbsp; Points ledger</span><span>Connected account</span></div>
            </section>

            <section className="mining-card">
              <div className="section-heading">
                <div><span className="eyebrow">DAILY MINING</span><h2>Your mining session</h2></div>
                <span className="status">○ NOT ACTIVE</span>
              </div>
              <div className="mining-visual">
                <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                <div className="dot-core">D<span>.</span></div>
              </div>
              <div className="timer-label">12-HOUR MINING CYCLE</div>
              <div className="timer">--:--:--</div>
              <div className="timer-sub">Secure mining and ad verification are not enabled yet.</div>
              <button className="primary-btn" disabled onClick={() => showNotice('Mining is not enabled yet.')}>Mining coming soon</button>
              <p className="demo-warning">No points are generated by this screen. Mining will activate after secure ad verification is integrated.</p>
            </section>

            <section className="stats-grid">
              <div className="stat-card"><span className="stat-icon">ϟ</span><span className="stat-label">MINING RATE</span><strong>—</strong><small>Not configured</small></div>
              <div className="stat-card"><span className="stat-icon purple">♜</span><span className="stat-label">YOUR RANK</span><strong>Unassigned</strong><small>Levels coming soon</small></div>
            </section>

            <section className="section-block">
              <div className="section-heading"><div><span className="eyebrow">GROW YOUR DOTS</span><h2>Earn more</h2></div><button className="text-btn" onClick={() => setTab('Tasks')}>View all ↗</button></div>
              <div className="task-row" onClick={() => showNotice('Rewarded ads are not connected yet.')}>
                <div className="task-icon">▶</div><div className="task-copy"><strong>Watch & earn</strong><small>Rewarded ads · Coming soon</small></div><span className="task-arrow">›</span>
              </div>
              <div className="task-row" onClick={() => setTab('Friends')}>
                <div className="task-icon purple">♧</div><div className="task-copy"><strong>Invite your friends</strong><small>Referral rewards · Coming soon</small></div><span className="task-arrow">›</span>
              </div>
            </section>
          </>}

          {tab === 'Tasks' && <section className="page-card"><span className="eyebrow">YOUR OPPORTUNITIES</span><h2>Tasks & rewards</h2><p className="muted">Verified tasks and advertising rewards will appear here when integrated.</p>{[['▶','Watch a rewarded ad'],['✓','Daily check-in'],['↗','Explore DOT.COM']].map(([icon,title])=><div className="task-row" key={title} onClick={() => showNotice('This task is not active yet.')}><div className="task-icon">{icon}</div><div className="task-copy"><strong>{title}</strong><small>Coming soon</small></div><span className="coming">SOON</span></div>)}</section>}

          {tab === 'Friends' && <section className="page-card"><span className="eyebrow">GROW TOGETHER</span><h2>Your community</h2><div className="empty-icon">♧</div><h3>Invite your people</h3><p className="muted">Your personal referral link and verified referral rewards are not available yet.</p><button className="primary-btn" onClick={() => showNotice('Referral links are coming soon.')}>Invite friends · Coming soon</button></section>}

          {tab === 'Wallet' && <section className="page-card"><span className="eyebrow">YOUR ASSETS</span><h2>DOT wallet</h2><div className="wallet-symbol">D<span>.</span></div><h3>Connect your future</h3><p className="muted">TON Connect and withdrawals will be added after the points ledger and token infrastructure are ready.</p><button className="primary-btn" onClick={() => showNotice('Wallet connection is not available yet.')}>Connect wallet · Coming soon</button><p className="demo-warning">Never share your seed phrase or private keys.</p></section>}

          {tab === 'Profile' && <section className="page-card"><span className="eyebrow">YOUR ACCOUNT</span><h2>Miner profile</h2><div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div><h3>{displayName}</h3><p className="muted">{user?.username ? `@${user.username}` : 'Telegram account verified'}</p><div className="profile-line"><span>Telegram ID</span><strong>{user?.telegramId}</strong></div><div className="profile-line"><span>Points balance</span><strong>{displayBalance} DOT</strong></div><div className="profile-line"><span>Current rank</span><strong>Not assigned</strong></div><div className="profile-line"><span>Network</span><strong>TON · Planned</strong></div></section>}
        </>}

        {notice && authState === 'authenticated' && <div className="toast">{notice}</div>}
        <div className="bottom-space" />
      </main>

      <nav className="bottom-nav">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'nav-item selected' : 'nav-item'} onClick={() => setTab(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.id}</span></button>)}</nav>
    </div>
  );
}

export default App;

import './style.css';
import Chart from 'chart.js/auto';

/* ── Config ── */
const DEFAULT_API = 'http://localhost:8080';
const REFRESH_MS = 2000;
let API_URL = localStorage.getItem('hyperbot_api') || DEFAULT_API;
let connected = false;

/* ── Helpers ── */
const $ = id => document.getElementById(id);
const pc = v => v > 0 ? 'pos' : v < 0 ? 'neg' : 'neu';
const usd = v => { v = parseFloat(v) || 0; return (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(4); };
const ft = ts => {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};
const fmtUp = s => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* ── Render HTML ── */
document.querySelector('#app').innerHTML = `
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="logo">⚡ HyperBot</div>
      <span id="modeBadge" class="badge badge-conn">CONNECTING</span>
    </div>
    <div class="header-right">
      <span id="uptime">—</span>
      <span id="lastUp">—</span>
      <div class="dot" id="dot" style="background:var(--red)"></div>
    </div>
  </div>

  <div class="wrap">
    <!-- API Config -->
    <div class="api-bar">
      <label>API:</label>
      <input type="text" id="apiInput" value="${API_URL}" placeholder="http://localhost:8080">
      <button id="apiBtn">Connect</button>
      <span id="apiStatus" class="api-status api-err">disconnected</span>
    </div>

    <!-- Circuit Breaker -->
    <div id="cbBanner" class="cb-banner">🚨 CIRCUIT BREAKER ACTIVE — Trading paused due to high volatility</div>

    <!-- Safe Stats -->
    <div class="stats">
      <div class="sc"><div class="sc-label">Balance</div><div class="sc-val" id="bal">$0.00</div><div class="sc-sub" id="margin">—</div></div>
      <div class="sc"><div class="sc-label">Safe P&L</div><div class="sc-val" id="pnl">$0.00</div><div class="sc-sub" id="dpnl">—</div></div>
      <div class="sc"><div class="sc-label">Win Rate</div><div class="sc-val" id="wr">—</div><div class="sc-sub" id="wl">0W / 0L</div></div>
      <div class="sc"><div class="sc-label">Positions</div><div class="sc-val" id="posN">0</div><div class="sc-sub" id="exp">—</div></div>
      <div class="sc"><div class="sc-label">Scalps</div><div class="sc-val" id="scalps">0</div><div class="sc-sub" id="cyc">Cycle #0</div></div>
      <div class="sc"><div class="sc-label">Daily Loss</div><div class="sc-val" id="dloss">$0.00</div><div class="sc-sub" id="dlim">—</div></div>
    </div>

    <!-- Degen Stats -->
    <div class="degen-row" id="degenRow" style="display:none">
      <div class="degen-card" id="degenCard1">
        <div class="sc-label">🎰 Degen Budget</div>
        <div class="sc-val" id="dgBudget">$1.00</div>
        <div class="sc-sub" id="dgStarted">started: $1.00</div>
      </div>
      <div class="degen-card">
        <div class="sc-label">🎰 Degen P&L</div>
        <div class="sc-val" id="dgPnl">$0.00</div>
        <div class="sc-sub" id="dgLev">50x leverage</div>
      </div>
      <div class="degen-card">
        <div class="sc-label">🎰 Degen WR</div>
        <div class="sc-val" id="dgWr">—</div>
        <div class="sc-sub" id="dgWL">0W / 0L</div>
      </div>
      <div class="degen-card">
        <div class="sc-label">🎰 Status</div>
        <div class="sc-val" id="dgStatus">Waiting</div>
        <div class="sc-sub" id="dgInfo">—</div>
      </div>
    </div>

    <!-- Charts + Indicators -->
    <div class="charts-row">
      <div class="chart-box">
        <div class="chart-title">
          <span>BTC Price + VWAP + Bollinger</span>
          <span id="btcPrice" style="color:var(--text);font-family:'JetBrains Mono',monospace;font-size:.85rem">—</span>
        </div>
        <div class="chart-wrap tall"><canvas id="priceChart"></canvas></div>
      </div>
      <div class="chart-box">
        <div class="chart-title"><span>Live Indicators</span></div>
        <div class="ind-grid">
          <div class="ind-card">
            <div class="ind-label">BTC RSI (7)</div>
            <div class="ind-val" id="btcRsi">—</div>
            <div class="ind-bar"><div class="ind-fill" id="rsiFill" style="width:50%;background:var(--dim)"></div></div>
          </div>
          <div class="ind-card">
            <div class="ind-label">BTC VWAP Dev</div>
            <div class="ind-val" id="vwapDev">—</div>
            <div class="ind-bar"><div class="ind-fill" id="vwapFill" style="width:50%;background:var(--dim)"></div></div>
          </div>
          <div class="ind-card">
            <div class="ind-label">ETH RSI (7)</div>
            <div class="ind-val" id="ethRsi">—</div>
            <div class="ind-bar"><div class="ind-fill" id="ethRsiFill" style="width:50%;background:var(--dim)"></div></div>
          </div>
          <div class="ind-card">
            <div class="ind-label">ETH VWAP Dev</div>
            <div class="ind-val" id="ethVwap">—</div>
            <div class="ind-bar"><div class="ind-fill" id="ethVwapFill" style="width:50%;background:var(--dim)"></div></div>
          </div>
        </div>
        <div class="chart-title" style="margin-top:12px"><span>Equity Curve</span></div>
        <div class="chart-wrap short"><canvas id="eqChart"></canvas></div>
      </div>
    </div>

    <!-- Bottom Tables -->
    <div class="bottom">
      <div class="tbl-box">
        <div class="tbl-hdr"><span>Active Positions</span><span id="posBdg" class="tag">0</span></div>
        <div class="tbl-scroll">
          <table><thead><tr><th>Coin</th><th>Side</th><th>Lev</th><th>Entry</th><th>Now</th><th>P&L</th><th>TP/SL</th></tr></thead>
          <tbody id="posBody"><tr><td colspan="7" class="empty">No open positions</td></tr></tbody></table>
        </div>
      </div>
      <div class="tbl-box">
        <div class="tbl-hdr"><span>Trade Log</span></div>
        <div class="tbl-scroll">
          <table><thead><tr><th>Time</th><th>Coin</th><th>Dir</th><th>P&L</th><th>Held</th><th>Type</th></tr></thead>
          <tbody id="logBody"><tr><td colspan="6" class="empty">No completed trades</td></tr></tbody></table>
        </div>
      </div>
      <div class="tbl-box">
        <div class="tbl-hdr"><span>Strategy Breakdown</span></div>
        <div class="tbl-scroll">
          <table><thead><tr><th>Strategy</th><th>Wins</th><th>Losses</th><th>WR%</th><th>P&L</th></tr></thead>
          <tbody id="stratBody"><tr><td colspan="5" class="empty">No data yet</td></tr></tbody></table>
        </div>
      </div>
    </div>
  </div>
`;

/* ── Charts ── */
const chartFont = { family: "'JetBrains Mono', monospace" };

const priceChart = new Chart($('priceChart'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Price', data: [], borderColor: '#3b82f6', borderWidth: 1.8, pointRadius: 0, tension: 0.3, fill: false, order: 1 },
      { label: 'VWAP', data: [], borderColor: '#f59e0b', borderWidth: 1.5, borderDash: [5, 3], pointRadius: 0, tension: 0.3, fill: false, order: 2 },
      { label: 'BB Upper', data: [], borderColor: 'rgba(139,92,246,0.35)', borderWidth: 1, pointRadius: 0, tension: 0.3, fill: false, order: 3 },
      { label: 'BB Lower', data: [], borderColor: 'rgba(139,92,246,0.35)', borderWidth: 1, pointRadius: 0, tension: 0.3, fill: '-1', backgroundColor: 'rgba(139,92,246,0.05)', order: 4 }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: true, position: 'top', labels: { color: '#64748b', font: { size: 10, ...chartFont }, boxWidth: 12, padding: 10 } } },
    scales: {
      x: { display: false },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10, ...chartFont }, callback: v => '$' + v.toLocaleString() } }
    }
  }
});

const eqChart = new Chart($('eqChart'), {
  type: 'line',
  data: { labels: [], datasets: [{ label: 'P&L', data: [], borderColor: '#10b981', borderWidth: 1.5, pointRadius: 2, pointBackgroundColor: '#10b981', tension: 0.3, fill: true, backgroundColor: 'rgba(16,185,129,0.1)' }] },
  options: {
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 9, ...chartFont }, callback: v => '$' + v.toFixed(3) } }
    }
  }
});

/* ── API Connect ── */
$('apiBtn').addEventListener('click', () => {
  API_URL = $('apiInput').value.replace(/\/+$/, '');
  localStorage.setItem('hyperbot_api', API_URL);
  refresh();
});

$('apiInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('apiBtn').click();
});

/* ── Refresh Loop ── */
async function refresh() {
  try {
    const res = await fetch(API_URL + '/api/summary', { signal: AbortSignal.timeout(3000) });
    const d = await res.json();
    if (d.error) throw new Error(d.error);

    connected = true;
    $('apiStatus').className = 'api-status api-ok';
    $('apiStatus').textContent = 'connected';
    $('dot').style.background = 'var(--green)';

    const s = d.summary || {}, st = d.status || {}, ch = d.chart || {};
    const perf = s.performance || {}, acc = s.account || {};

    // Mode badge
    const b = $('modeBadge');
    if (st.live_trading) { b.className = 'badge badge-live'; b.textContent = 'LIVE'; }
    else { b.className = 'badge badge-dry'; b.textContent = 'DRY RUN'; }

    // Stats
    $('bal').textContent = '$' + (acc.value || 0).toFixed(2);
    $('margin').textContent = 'Margin: ' + (acc.margin_ratio || 0).toFixed(1) + '%';

    const tp = st.total_pnl || 0;
    $('pnl').textContent = (tp >= 0 ? '+$' : '-$') + Math.abs(tp).toFixed(4);
    $('pnl').className = 'sc-val ' + pc(tp);
    $('dpnl').textContent = 'Daily loss: $' + (st.daily_loss_usd || 0).toFixed(4);

    const wr = perf.win_rate;
    $('wr').textContent = wr != null ? wr.toFixed(1) + '%' : '—';
    const tc = perf.total_closed || 0;
    const wins = tc > 0 ? Math.round(wr / 100 * tc) : 0;
    $('wl').textContent = wins + 'W / ' + (tc - wins) + 'L';

    $('posN').textContent = st.open_positions || 0;
    $('exp').textContent = '$' + (st.total_exposure_usd || 0).toFixed(2) + ' / $' + (st.max_exposure_usd || 20);
    $('scalps').textContent = st.total_scalps || 0;
    $('cyc').textContent = 'Cycle #' + (st.cycles || 0);
    $('dloss').textContent = '$' + (st.daily_loss_usd || 0).toFixed(4);
    $('dloss').className = 'sc-val ' + ((st.daily_loss_usd || 0) > 0 ? 'neg' : 'neu');
    $('dlim').textContent = 'Limit: $' + (st.daily_drawdown_limit_usd || 5).toFixed(2);
    $('uptime').textContent = fmtUp(st.uptime_seconds || 0);

    // Circuit breaker
    st.circuit_breaker ? $('cbBanner').classList.add('active') : $('cbBanner').classList.remove('active');

    // ── Degen Stats ──
    const dg = st.degen || {};
    if (dg.enabled) {
      $('degenRow').style.display = 'grid';
      $('dgBudget').textContent = dg.blown ? '💀 BLOWN' : '$' + dg.budget.toFixed(4);
      $('dgBudget').className = 'sc-val ' + (dg.blown ? 'neg' : dg.budget >= dg.initial_budget ? 'pos' : 'neg');
      $('dgStarted').textContent = 'started: $' + (dg.initial_budget || 1).toFixed(2);
      if (dg.blown) $('degenCard1').classList.add('degen-blown');
      else $('degenCard1').classList.remove('degen-blown');

      const dp = dg.pnl || 0;
      $('dgPnl').textContent = usd(dp);
      $('dgPnl').className = 'sc-val ' + pc(dp);
      $('dgLev').textContent = (dg.leverage || 50) + 'x leverage';

      const dtotal = (dg.wins || 0) + (dg.losses || 0);
      const dwr = dtotal > 0 ? (dg.wins / dtotal * 100) : 0;
      $('dgWr').textContent = dtotal > 0 ? dwr.toFixed(0) + '%' : '—';
      $('dgWL').textContent = (dg.wins || 0) + 'W / ' + (dg.losses || 0) + 'L';

      $('dgStatus').textContent = dg.blown ? '💀 Blown' : dg.active ? '🔥 In Trade' : '⏳ Waiting';
      $('dgStatus').className = 'sc-val ' + (dg.blown ? 'neg' : dg.active ? 'pos' : 'neu');
      $('dgInfo').textContent = dg.blown ? 'Experiment over' :
        dg.budget >= dg.initial_budget * 2 ? '🎉 DOUBLED!' :
        `${((dg.budget / (dg.initial_budget * 2)) * 100).toFixed(0)}% to double`;
    }

    // ── Price Chart ──
    const ph = ch.price_history || {};
    const btcH = ph.BTC || [];
    if (btcH.length > 2) {
      const labels = btcH.map(p => ft(p.t));
      priceChart.data.labels = labels;
      priceChart.data.datasets[0].data = btcH.map(p => p.price);
      priceChart.data.datasets[1].data = btcH.map(p => p.vwap);
      priceChart.data.datasets[2].data = btcH.map(p => p.bb_upper);
      priceChart.data.datasets[3].data = btcH.map(p => p.bb_lower);
      priceChart.update('none');
      $('btcPrice').textContent = '$' + btcH[btcH.length - 1].price.toLocaleString();
    }

    // ── Equity Curve ──
    const eq = ch.equity_curve || [];
    if (eq.length > 0) {
      eqChart.data.labels = eq.map(e => ft(e.t));
      eqChart.data.datasets[0].data = eq.map(e => e.cumulative);
      const last = eq[eq.length - 1].cumulative;
      eqChart.data.datasets[0].borderColor = last >= 0 ? '#10b981' : '#ef4444';
      eqChart.data.datasets[0].backgroundColor = last >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
      eqChart.data.datasets[0].pointBackgroundColor = last >= 0 ? '#10b981' : '#ef4444';
      eqChart.update('none');
    }

    // ── Indicators ──
    const ind = ch.indicators || {};
    if (ind.BTC) {
      const rsi = ind.BTC.rsi;
      $('btcRsi').textContent = rsi.toFixed(1);
      $('btcRsi').className = 'ind-val ' + (rsi < 30 ? 'pos' : rsi > 70 ? 'neg' : '');
      $('rsiFill').style.width = rsi + '%';
      $('rsiFill').style.background = rsi < 30 ? 'var(--green)' : rsi > 70 ? 'var(--red)' : 'var(--blue)';

      const vd = ind.BTC.vwap_deviation;
      $('vwapDev').textContent = (vd >= 0 ? '+' : '') + vd.toFixed(3) + '%';
      $('vwapDev').className = 'ind-val ' + (vd < -0.08 ? 'pos' : vd > 0.08 ? 'neg' : '');
      $('vwapFill').style.width = Math.min(Math.abs(vd) * 400 + 10, 100) + '%';
      $('vwapFill').style.background = Math.abs(vd) > 0.1 ? 'var(--amber)' : 'var(--dim)';
    }
    if (ind.ETH) {
      const rsi = ind.ETH.rsi;
      $('ethRsi').textContent = rsi.toFixed(1);
      $('ethRsi').className = 'ind-val ' + (rsi < 30 ? 'pos' : rsi > 70 ? 'neg' : '');
      $('ethRsiFill').style.width = rsi + '%';
      $('ethRsiFill').style.background = rsi < 30 ? 'var(--green)' : rsi > 70 ? 'var(--red)' : 'var(--blue)';

      const vd = ind.ETH.vwap_deviation;
      $('ethVwap').textContent = (vd >= 0 ? '+' : '') + vd.toFixed(3) + '%';
      $('ethVwapFill').style.width = Math.min(Math.abs(vd) * 400 + 10, 100) + '%';
      $('ethVwapFill').style.background = Math.abs(vd) > 0.1 ? 'var(--amber)' : 'var(--dim)';
    }

    // ── Active Positions ──
    const pos = s.positions || [];
    $('posBdg').textContent = pos.length;
    $('posBody').innerHTML = pos.length === 0
      ? '<tr><td colspan="7" class="empty">No open positions</td></tr>'
      : pos.map(p => {
          const isDegen = p.coin.startsWith('🎰');
          return `<tr>
            <td><b>${p.coin}</b></td>
            <td class="${p.side === 'LONG' ? 'long' : 'short'}">${p.side}</td>
            <td>${isDegen ? '<span class="tag tag-degen">' + p.leverage + 'x</span>' : p.leverage + 'x'}</td>
            <td>$${p.entry_price.toLocaleString()}</td>
            <td>$${p.current_price.toLocaleString()}</td>
            <td class="${pc(p.unrealized_pnl)}">${usd(p.unrealized_pnl)}</td>
            <td style="font-size:0.58rem;line-height:1.3">TP $${p.take_profit.toFixed(2)}<br>SL $${p.stop_loss.toFixed(2)}</td>
          </tr>`;
        }).join('');

    // ── Trade Log ──
    const tl = (ch.trade_log || []).slice().reverse();
    $('logBody').innerHTML = tl.length === 0
      ? '<tr><td colspan="6" class="empty">No completed trades</td></tr>'
      : tl.slice(0, 25).map(t => {
          const isDegen = (t.profile === 'degen' || (t.strategy && t.strategy.startsWith('degen_')));
          return `<tr>
            <td>${ft(t.t)}</td>
            <td><b>${isDegen ? '🎰' : ''}${t.coin}</b></td>
            <td class="${t.dir === 'LONG' ? 'long' : 'short'}">${t.dir}</td>
            <td class="${pc(t.pnl)}">${usd(t.pnl)}</td>
            <td>${t.held_seconds}s</td>
            <td><span class="tag ${t.pnl > 0 ? 'tag-win' : 'tag-loss'}">${t.reason}</span></td>
          </tr>`;
        }).join('');

    // ── Strategy Breakdown ──
    const ss = ch.strategy_stats || {};
    const sKeys = Object.keys(ss);
    $('stratBody').innerHTML = sKeys.length === 0
      ? '<tr><td colspan="5" class="empty">No data yet</td></tr>'
      : sKeys.map(k => {
          const v = ss[k];
          const total = v.wins + v.losses;
          const swr = total > 0 ? (v.wins / total * 100) : 0;
          const isDegen = k.startsWith('degen_');
          return `<tr>
            <td><span class="tag ${isDegen ? 'tag-degen' : ''}">${k.replace(/_/g, ' ')}</span></td>
            <td class="pos">${v.wins}</td>
            <td class="neg">${v.losses}</td>
            <td>${swr.toFixed(0)}%</td>
            <td class="${pc(v.pnl)}">${usd(v.pnl)}</td>
          </tr>`;
        }).join('');

    // Timestamp
    $('lastUp').textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  } catch (e) {
    connected = false;
    $('apiStatus').className = 'api-status api-err';
    $('apiStatus').textContent = 'disconnected';
    $('dot').style.background = 'var(--red)';
    $('modeBadge').className = 'badge badge-conn';
    $('modeBadge').textContent = 'OFFLINE';
    console.warn('Refresh error:', e.message);
  }
}

refresh();
setInterval(refresh, REFRESH_MS);

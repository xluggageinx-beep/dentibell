// ============================================================
// PANEL — Airport departure board style call queue display
// ============================================================

function useClock() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function pad(n) { return String(n).padStart(2, '0'); }

function PanelTab() {
  const state = useStore();
  const clock = useClock();
  const T = window.DentiBellTime;

  const hh = pad(clock.getHours());
  const mm = pad(clock.getMinutes());
  const ss = pad(clock.getSeconds());
  const dateStr = clock.getFullYear() + '.' + pad(clock.getMonth() + 1) + '.' + pad(clock.getDate())
    + ' · ' + ['SUN','MON','TUE','WED','THU','FRI','SAT'][clock.getDay()];

  // Build unified rows: active items first, then waiting queue
  const rows = [];
  state.active.forEach(a => {
    rows.push({
      key: a.id,
      status: 'active',
      chair: a.chair,
      patient: a.patient,
      patientEn: a.patientEn,
      cc: a.cc,
      ccTag: a.ccTag,
      elapsed: Date.now() - a.acceptedAt,
    });
  });
  state.queue.forEach(q => {
    rows.push({
      key: q.id,
      status: 'waiting',
      chair: q.chair,
      patient: q.patient,
      patientEn: q.patientEn,
      cc: q.cc,
      ccTag: q.ccTag,
      elapsed: Date.now() - q.calledAt,
    });
  });

  return (
    <div className="tab-panel">
      <div className="board">
        {/* Header */}
        <div className="board-head">
          <div className="board-head-l">
            <div className="board-title">DentiBell · Call Queue</div>
            <div className="board-sub">의국 모니터 · Live</div>
          </div>
          <div>
            <div className="board-clock mono tnum">{hh}:{mm}<span style={{opacity:0.5}}>:{ss}</span></div>
            <div className="board-clock-date">{dateStr}</div>
          </div>
          <div className="board-head-r">
            <div className="stat-block">
              <div className="stat">
                <div className="stat-n wait mono tnum">{pad(state.queue.length)}</div>
                <div className="stat-l">Waiting</div>
              </div>
              <div className="stat">
                <div className="stat-n active-c mono tnum">{pad(state.active.length)}</div>
                <div className="stat-l">In Progress</div>
              </div>
            </div>
          </div>
        </div>

        {/* Columns */}
        <div className="board-cols">
          <div>Status</div>
          <div>Chair</div>
          <div>Patient</div>
          <div className="col-cc">Chief Complaint</div>
          <div style={{textAlign:'right'}}>Time</div>
        </div>

        {/* Rows */}
        <div className="board-rows">
          {rows.length === 0 && (
            <div className="board-empty">— No calls · 콜벨 대기 중 —</div>
          )}
          {rows.map((r, i) => {
            // Waiting index within the waiting group only
            const waitingIdx = r.status === 'waiting'
              ? rows.slice(0, i + 1).filter(x => x.status === 'waiting').length
              : null;
            const bucket = r.status === 'waiting' ? T.bucket(r.elapsed) : '';
            return (
              <div
                className={'board-row ' + (r.status === 'active' ? 'is-active' : '')}
                key={r.key}
              >
                <div className="br-status">
                  {r.status === 'active' ? (
                    <div className="badge-live en">
                      <span className="dot"></span>LIVE
                    </div>
                  ) : (
                    <div className="badge-wait mono">Q · {pad(waitingIdx)}</div>
                  )}
                </div>
                <div className="br-chair en">
                  <small>Chair</small>
                  <span className="ch-num mono">{pad(r.chair)}</span>
                </div>
                <div className="br-patient">
                  <small className="en">{r.patientEn}</small>
                  {r.patient}
                </div>
                <div className="br-cc">
                  <span className="tag en">{r.ccTag}</span>
                  {r.cc.replace(r.ccTag, '').replace(/^\s+/, '')}
                </div>
                <div className={'br-wait mono tnum ' + (r.status === 'active' ? 'active-t' : bucket)}>
                  {T.fmt(r.elapsed)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <div className="foot">
        <div>Terminal · Ward Monitor v1.0</div>
        <div>Data source · Dentweb Sync</div>
      </div>
    </div>
  );
}

window.PanelTab = PanelTab;

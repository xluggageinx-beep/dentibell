// ============================================================
// CALLBELL — Amazon Dash-style minimal pucks, one per chair
// Click to call · click again to withdraw
// ============================================================

function padCB(n) { return String(n).padStart(2, '0'); }

function Bell({ chair, occupied, patient, called, onPress }) {
  const [pressed, setPressed] = React.useState(false);
  const [ripples, setRipples] = React.useState([]);

  function handle() {
    if (!occupied) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 200);
    const id = Date.now() + Math.random();
    setRipples(r => [...r, id]);
    setTimeout(() => setRipples(r => r.filter(x => x !== id)), 900);
    onPress && onPress();
  }

  const stateLabel = !occupied
    ? 'IDLE · 대기 없음'
    : called
      ? 'CALLED · 재클릭 시 철회'
      : patient;

  return (
    <div className="bell-unit">
      <div
        className={'bell ' + (pressed ? 'pressed' : '') + (called ? ' on' : '')}
        onClick={handle}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handle()}
        style={{ opacity: occupied ? 1 : 0.55, cursor: occupied ? 'pointer' : 'not-allowed' }}
      >
        <div className="bell-outer"></div>
        <div className="bell-top">
          <div className="bell-mark">DentiBell</div>
        </div>
        <div className="bell-ring"></div>
        {ripples.map(id => <div key={id} className="ripple"></div>)}
      </div>
      <div className="bell-label">
        <div className="n en">Chair {padCB(chair)}</div>
        <div className={'p ' + (called ? 'is-on' : '')}>{stateLabel}</div>
      </div>
    </div>
  );
}

function Toast({ msg, sub, kind }) {
  return (
    <div className={'toast ' + (kind || '')}>
      <span className="mono">→ {sub}</span>
      <span>{msg}</span>
    </div>
  );
}

function CallbellTab() {
  const state = useStore();
  const T = window.DentiBellTime;
  const [toasts, setToasts] = React.useState([]);

  function pushToast(t) {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { ...t, id }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2600);
  }

  function handleBell(chair) {
    const r = window.DentiBellStore.toggleCallFromChair(chair);
    if (r.action === 'called') {
      pushToast({
        kind: 'call',
        msg: `${r.item.patient} · ${r.item.cc}`,
        sub: `CALL · CHAIR ${padCB(chair)}`,
      });
    } else if (r.action === 'withdrawn') {
      pushToast({
        kind: 'withdraw',
        msg: `${r.item.patient} · 호출 철회됨`,
        sub: `WITHDRAW · CHAIR ${padCB(chair)}`,
      });
    } else if (r.action === 'ended') {
      pushToast({
        kind: 'end',
        msg: `${r.item.patient} · 진료 종료됨`,
        sub: `END · CHAIR ${padCB(chair)}`,
      });
    }
  }

  // Combine active + queue for mirror display, active first
  const mirrorRows = [
    ...state.active.map(a => ({
      key: a.id, chair: a.chair, patient: a.patient, ccTag: a.ccTag,
      status: 'active', elapsed: Date.now() - a.acceptedAt,
    })),
    ...state.queue.map(q => ({
      key: q.id, chair: q.chair, patient: q.patient, ccTag: q.ccTag,
      status: 'waiting', elapsed: Date.now() - q.calledAt,
    })),
  ];

  return (
    <div className="tab-panel">
      <div className="bell-stage">
        {/* Left — chairs with bells */}
        <div className="bell-desk">
          <div className="bell-desk-head">
            <div className="t">
              <small>Chair-side Devices</small>
              체어별 콜벨 유닛
            </div>
            <div className="m">CLICK · CALL &nbsp; · &nbsp; CLICK AGAIN · WITHDRAW</div>
          </div>
          <div className="bell-grid">
            {state.chairs.map(c => (
              <Bell
                key={c.chair}
                chair={c.chair}
                occupied={c.occupied}
                patient={c.patient}
                called={c.called}
                onPress={() => handleBell(c.chair)}
              />
            ))}
          </div>
        </div>

        {/* Right — mini board mirror only (specs removed) */}
        <div className="bell-side">
          <div className="bell-spec">
            <div className="bell-spec-h">
              <span>Sync · Queue Mirror</span>
              <span className="dot"></span>
            </div>
            <div className="mini-q">
              {mirrorRows.length === 0 && (
                <div className="empty">— No calls · 콜벨을 눌러보세요 —</div>
              )}
              {mirrorRows.map(r => (
                <div className={'mini-q-row ' + (r.status === 'active' ? 'is-active' : '')} key={r.key}>
                  <div className="q mono">
                    {r.status === 'active'
                      ? <span className="live-dot" title="In Progress"></span>
                      : '·'}
                  </div>
                  <div className="b">
                    <div className="top">Chair {padCB(r.chair)} · {r.ccTag}</div>
                    <div className="name">{r.patient}</div>
                  </div>
                  <div className={'t mono tnum ' + (r.status === 'active' ? 'act' : '')}>
                    {T.fmt(r.elapsed)}
                  </div>
                </div>
              ))}
            </div>
            <div className="sync-foot">
              <div className="dot-sm"></div>
              <span>Live sync to Ward Panel &amp; Watch · {'< 150ms'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map(t => <Toast key={t.id} msg={t.msg} sub={t.sub} kind={t.kind} />)}
      </div>
    </div>
  );
}

window.CallbellTab = CallbellTab;

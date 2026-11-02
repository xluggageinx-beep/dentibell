// ============================================================
// WATCH — Apple Watch Series 10 mockup, button-controlled
// Views: queue (default) · cc · active
// ============================================================

function pad2(n) { return String(n).padStart(2, '0'); }

function WatchTab() {
  const state = useStore();
  const T = window.DentiBellTime;
  const watchRef = React.useRef(null);

  // view: 'queue' | 'cc' | 'active'
  const [view, setView] = React.useState('queue');
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [ringing, setRinging] = React.useState(false);
  const [pressedSide, setPressedSide] = React.useState(false);
  const [rotCrown, setRotCrown] = React.useState(false);
  const [pressedDir, setPressedDir] = React.useState(null); // for visual feedback on nav buttons

  // Track new calls → buzz
  const prevQueueLen = React.useRef(state.queue.length);
  React.useEffect(() => {
    if (state.queue.length > prevQueueLen.current) {
      setRinging(true);
      setTimeout(() => setRinging(false), 1000);
    }
    prevQueueLen.current = state.queue.length;
    if (selectedIdx >= state.queue.length) {
      setSelectedIdx(Math.max(0, state.queue.length - 1));
    }
  }, [state.queue.length]);

  // Auto-close orphan views
  React.useEffect(() => {
    if (view === 'cc' && state.queue.length === 0) setView('queue');
  }, [view, state.queue.length]);

  const active = state.active[0] || null;
  const selected = state.queue[selectedIdx] || null;

  // Determine which nav directions are enabled per view
  function navAvailable(dir) {
    if (view === 'queue') {
      if (dir === 'right') return state.queue.length > 0;   // → CC
      if (dir === 'up')    return !!active;                  // ↑ In Progress
      return false;
    }
    if (view === 'cc') {
      return dir === 'left';                                 // ← back to queue
    }
    if (view === 'active') {
      if (dir === 'down') return true;                       // ↓ back to queue
      if (dir === 'left') return true;                       // ← end
      return false;
    }
    return false;
  }

  // Label for each nav button per current view (kept short for on-watch tap)
  function navLabel(dir) {
    if (view === 'queue') {
      if (dir === 'right') return 'C.C.';
      if (dir === 'up')    return 'ACTIVE';
    }
    if (view === 'cc' && dir === 'left') return 'BACK';
    if (view === 'active') {
      if (dir === 'down') return 'BACK';
      if (dir === 'left') return 'END';
    }
    return '';
  }

  function handleNav(dir) {
    if (!navAvailable(dir)) return;
    setPressedDir(dir);
    setTimeout(() => setPressedDir(null), 180);

    if (view === 'queue') {
      if (dir === 'right') setView('cc');
      else if (dir === 'up') setView('active');
    } else if (view === 'cc') {
      if (dir === 'left') setView('queue');
    } else if (view === 'active') {
      if (dir === 'down') setView('queue');
      else if (dir === 'left') {
        window.DentiBellStore.endTreatment(active?.id);
        setView('queue');
      }
    }
  }

  // Crown rotation — drag on crown handle
  const crownRef = React.useRef(null);
  React.useEffect(() => {
    const el = crownRef.current;
    if (!el) return;
    let dragging = false;
    let lastY = 0;
    let accumY = 0;
    function down(e) {
      dragging = true;
      lastY = (e.touches ? e.touches[0].clientY : e.clientY);
      if (e.cancelable) e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      accumY += (y - lastY);
      lastY = y;
      if (Math.abs(accumY) > 22) {
        if (view === 'queue' && state.queue.length > 0) {
          setSelectedIdx(prev => {
            const dir = accumY > 0 ? 1 : -1;
            return (prev + dir + state.queue.length) % state.queue.length;
          });
          setRotCrown(true);
          setTimeout(() => setRotCrown(false), 300);
        }
        accumY = 0;
      }
    }
    function up() { dragging = false; }
    el.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', up);
    return () => {
      el.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', up);
    };
  }, [view, state.queue.length]);

  // Wheel on watch → crown
  React.useEffect(() => {
    function onWheel(e) {
      if (!watchRef.current) return;
      const rect = watchRef.current.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right + 40 &&
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        if (view === 'queue' && state.queue.length > 0) {
          e.preventDefault();
          setSelectedIdx(prev => {
            const dir = e.deltaY > 0 ? 1 : -1;
            return (prev + dir + state.queue.length) % state.queue.length;
          });
          setRotCrown(true);
          setTimeout(() => setRotCrown(false), 300);
        }
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [view, state.queue.length]);

  // Side button — accept or end
  function handleSidePress() {
    setPressedSide(true);
    setTimeout(() => setPressedSide(false), 200);
    if (view === 'queue') {
      if (state.queue.length > 0) {
        const target = selected || state.queue[0];
        window.DentiBellStore.acceptCall(target.id);
        setSelectedIdx(0);
        setView('active');
      }
    } else if (view === 'cc' && selected) {
      window.DentiBellStore.acceptCall(selected.id);
      setSelectedIdx(0);
      setView('active');
    } else if (view === 'active' && active) {
      window.DentiBellStore.endTreatment(active.id);
      setView('queue');
    }
  }

  // Clock
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());

  const sideBtnAction = (() => {
    if (view === 'queue' && state.queue.length > 0) return '호출 수락';
    if (view === 'cc') return '호출 수락';
    if (view === 'active') return '진료 종료';
    return '대기 없음';
  })();

  // ==== Nav button component (on the watch) ====
  function NavBtn({ dir }) {
    const enabled = navAvailable(dir);
    const label = navLabel(dir);
    const isPressed = pressedDir === dir;
    const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : dir === 'left' ? '←' : '→';
    return (
      <button
        className={'nav-btn nav-' + dir + (enabled ? '' : ' disabled') + (isPressed ? ' pressed' : '')}
        onClick={() => handleNav(dir)}
        disabled={!enabled}
        aria-label={label || dir}
      >
        <span className="arrow">{arrow}</span>
        {label && <span className="lbl">{label}</span>}
      </button>
    );
  }

  return (
    <div className="tab-panel">
      <div className="watch-stage">
        {/* Left column — Screen nav */}
        <div className="watch-hint left">
          <div className="hint-group-title">SCREEN · 4방향 버튼</div>
          <div className="hint-block hw">
            <div className="hw-badge">
              <span className="dot"></span>
              <span>Nav Buttons</span>
            </div>
            <div className="k">화면 상하좌우</div>
            <div className="v">
              워치 화면 가장자리의 <strong>4방향 버튼</strong>으로 조작합니다.
              <br/><span className="sub">현재 뷰에서 사용 가능한 방향만 활성화</span>
            </div>
          </div>
          <div className="hint-block hw">
            <div className="hw-badge">
              <span className="dot"></span>
              <span>Directions</span>
            </div>
            <div className="k">방향별 기능</div>
            <div className="v">
              <div className="dir-row"><span className="dir-key mono">→</span> C.C. 상세</div>
              <div className="dir-row"><span className="dir-key mono">↑</span> 진행 중 화면</div>
              <div className="dir-row"><span className="dir-key mono">←</span> 뒤로 / 진료 종료</div>
              <div className="dir-row"><span className="dir-key mono">↓</span> 대기열로 복귀</div>
            </div>
          </div>
        </div>

        {/* Watch */}
        <div className="watch-wrap">
          <div className={'watch ' + (ringing ? 'ring buzz' : '')} ref={watchRef}>
            <div className="watch-body">
              {/* Digital Crown */}
              <div className={'crown ' + (rotCrown ? 'rot' : '')} ref={crownRef} title="Digital Crown"></div>
              {/* Side Button */}
              <div
                className={'side-btn ' + (pressedSide ? 'pressed' : '')}
                onClick={handleSidePress}
                title="Side Button"
              ></div>

              {/* Screen */}
              <div className="watch-screen">
                {/* 4-way nav buttons at edges */}
                <NavBtn dir="up" />
                <NavBtn dir="down" />
                <NavBtn dir="left" />
                <NavBtn dir="right" />

                {/* Screen content */}
                {view === 'queue' && (
                  <div className="ws-view">
                    <div className="ws-status">
                      <span>● Dr. Han</span>
                      <span className="r mono">{hh}:{mm}</span>
                    </div>
                    <div className="ws-queue">
                      <div className="ws-title">
                        <span>Call Queue</span>
                        <span className="count mono">{pad2(state.queue.length)}</span>
                      </div>
                      {state.queue.length === 0 && (
                        <div className="ws-clear">
                          <div className="ic">✓</div>
                          <div className="msg">All Clear</div>
                          <div className="sub">대기 중인 호출 없음</div>
                        </div>
                      )}
                      {state.queue.map((q, i) => {
                        const wait = Date.now() - q.calledAt;
                        return (
                          <div
                            key={q.id}
                            className={'ws-item ' + (i === selectedIdx ? 'sel' : '')}
                            onClick={() => setSelectedIdx(i)}
                          >
                            <div className="q mono">{pad2(i+1)}</div>
                            <div className="body">
                              <div className="top">Chair {pad2(q.chair)}</div>
                              <div className="name">{q.patient}</div>
                            </div>
                            <div className={'t mono tnum ' + T.bucket(wait)}>{T.fmt(wait)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {view === 'cc' && selected && (
                  <div className="ws-view">
                    <div className="ws-status">
                      <span style={{color:'#D4A574'}}>C.C. Preview</span>
                      <span className="r mono">{hh}:{mm}</span>
                    </div>
                    <div className="ws-cc">
                      <div className="lbl">Patient</div>
                      <div className="chair en">Chair {pad2(selected.chair)}</div>
                      <div className="name">{selected.patient}</div>
                      <div className="cc-tag mono">{selected.ccTag}</div>
                      <div className="cc-body">{selected.cc}</div>
                      <div className="wait">
                        <span style={{color:'#6B7280', letterSpacing:'0.1em'}}>WAIT · </span>
                        <span className="n mono tnum">{T.fmt(Date.now() - selected.calledAt)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {view === 'active' && (
                  <div className="ws-view">
                    <div className="ws-status">
                      <span style={{color:'#4A9B6E'}}>● Live</span>
                      <span className="r mono">{hh}:{mm}</span>
                    </div>
                    {active ? (
                      <div className="ws-active">
                        <div className="badge en">In Progress</div>
                        <div className="chair">CHAIR {pad2(active.chair)}</div>
                        <div className="name">{active.patient}</div>
                        <div className="t-lbl">Elapsed</div>
                        <div className="t mono tnum">{T.fmt(Date.now() - active.acceptedAt)}</div>
                      </div>
                    ) : (
                      <div className="ws-empty">
                        <div className="ic">✓</div>
                        <div className="msg">No Active Session</div>
                        <div className="sub">진료 중인 체어가 없습니다</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column — Hardware */}
        <div className="watch-hint right">
          <div className="hint-group-title">HARDWARE · 물리 버튼</div>
          <div className="hint-block hw">
            <div className="hw-badge">
              <span className="dot"></span>
              <span>Digital Crown</span>
            </div>
            <div className="k">회전 조작</div>
            <div className="v">
              대기열 항목 선택 이동
              <br/><span className="sub">위·아래 드래그 · 마우스 휠</span>
            </div>
          </div>
          <div className="hint-block hw">
            <div className="hw-badge action">
              <span className="dot"></span>
              <span>Side Button</span>
            </div>
            <div className="k">누름</div>
            <div className="v">
              <strong>{sideBtnAction}</strong>
              <br/><span className="sub">선택 없이 누르면 대기열 1번 자동 수락</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="watch-bottom">
        <div className="kv">
          <div className="k">Current View</div>
          <div className="v">
            {view === 'queue' && '대기열 · Queue'}
            {view === 'cc' && 'C.C. 확인 · Detail'}
            {view === 'active' && '진행 중 · In Progress'}
          </div>
        </div>
        <div className="div"></div>
        <div className="kv">
          <div className="k">Selected</div>
          <div className="v">{selected ? `${selected.chairLabel} · ${selected.patient}` : '—'}</div>
        </div>
        <div className="div"></div>
        <div className="kv">
          <div className="k">Active</div>
          <div className="v">{active ? `${active.chairLabel} · ${active.patient}` : '—'}</div>
        </div>
      </div>
    </div>
  );
}

window.WatchTab = WatchTab;

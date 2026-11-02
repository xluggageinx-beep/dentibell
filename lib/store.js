// Shared reactive store — connects panel / watch / callbell tabs.
// Simple pub-sub, no framework required for the store itself.

(function () {
  const listeners = new Set();

  // No hardcoded seed calls — everything starts empty and is driven by bell presses.
  function initialState() {
    return {
      // Waiting queue (calls that haven't been accepted yet)
      queue: [],
      // In-progress (accepted, being treated)
      active: [],
      // Chairs available to press call bell on — some occupied, some not
      chairs: [
        { chair: 1, occupied: true,  patient: '강예린', patientEn: 'Kang Y.R.',   cc: '#37 냉감각 확인',   ccTag: '#37',  called: false },
        { chair: 2, occupied: true,  patient: '박준호', patientEn: 'Park J.H.',   cc: '마취 요청',          ccTag: 'ANES', called: false },
        { chair: 3, occupied: true,  patient: '김지현', patientEn: 'Kim J.H.',    cc: '#26 통증 Check',    ccTag: '#26',  called: false },
        { chair: 4, occupied: true,  patient: '정하윤', patientEn: 'Jung H.Y.',   cc: 'Scaling F/U 확인',  ccTag: 'SCAL', called: false },
        { chair: 5, occupied: true,  patient: '최민서', patientEn: 'Choi M.S.',   cc: '#36 Endo Check',    ccTag: '#36',  called: false },
        { chair: 6, occupied: true,  patient: '한도현', patientEn: 'Han D.H.',    cc: '#14 CR 인상 Check', ccTag: '#14',  called: false },
        { chair: 7, occupied: true,  patient: '이서연', patientEn: 'Lee S.Y.',    cc: '보철물 Check',      ccTag: 'PROS', called: false },
        { chair: 8, occupied: true,  patient: '오세림', patientEn: 'Oh S.R.',     cc: '#46 발치 필요 여부',ccTag: '#46',  called: false },
        { chair: 9, occupied: false, patient: null,    patientEn: null,          cc: null,                 ccTag: null,   called: false },
      ],
      nextId: 10,
    };
  }

  let state = initialState();

  function notify() { listeners.forEach(fn => fn(state)); }

  const store = {
    getState() { return state; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // Bell press: if not called yet → add to queue; if already called → withdraw
    toggleCallFromChair(chair) {
      const chairData = state.chairs.find(c => c.chair === chair);
      if (!chairData || !chairData.occupied) return { action: 'ignored' };

      // Withdraw path — chair is currently called (either in queue or already active)
      if (chairData.called) {
        // Remove from queue if still waiting
        const qi = state.queue.findIndex(q => q.chair === chair);
        if (qi >= 0) {
          const [item] = state.queue.splice(qi, 1);
          chairData.called = false;
          notify();
          return { action: 'withdrawn', item };
        }
        // Or end if currently active
        const ai = state.active.findIndex(a => a.chair === chair);
        if (ai >= 0) {
          const [item] = state.active.splice(ai, 1);
          chairData.called = false;
          notify();
          return { action: 'ended', item };
        }
        // Fallback: just clear flag
        chairData.called = false;
        notify();
        return { action: 'cleared' };
      }

      // New call path
      chairData.called = true;
      const id = 'c' + (state.nextId++);
      const item = {
        id,
        chair: chairData.chair,
        chairLabel: 'Chair ' + String(chairData.chair).padStart(2, '0'),
        patient: chairData.patient,
        patientEn: chairData.patientEn,
        cc: chairData.cc,
        ccTag: chairData.ccTag,
        calledAt: Date.now(),
      };
      state.queue.push(item);
      notify();
      return { action: 'called', item };
    },

    // Kept for backward compat
    callFromChair(chair) {
      const r = this.toggleCallFromChair(chair);
      return r.action === 'called' ? r.item : null;
    },

    // Doctor accepts a call from watch — moves queue → active
    acceptCall(id) {
      const idx = id != null
        ? state.queue.findIndex(q => q.id === id)
        : 0;
      if (idx < 0 || !state.queue[idx]) return null;
      const [item] = state.queue.splice(idx, 1);
      const activeItem = { ...item, acceptedAt: Date.now() };
      state.active.push(activeItem);
      // Keep chair.called = true (still active)
      notify();
      return activeItem;
    },

    // Doctor ends treatment — removes from active
    endTreatment(id) {
      const idx = id != null
        ? state.active.findIndex(a => a.id === id)
        : 0;
      if (idx < 0) return null;
      const [item] = state.active.splice(idx, 1);
      // Reset chair called flag
      const ch = state.chairs.find(c => c.chair === item.chair);
      if (ch) ch.called = false;
      notify();
      return item;
    },

    // Reset everything — clears all calls & active, resets chair.called
    reset() {
      state = initialState();
      notify();
    },
  };

  window.DentiBellStore = store;

  // Ticker — trigger re-render every 1s for live timers
  setInterval(notify, 1000);
})();

// Time helpers used across tabs
window.DentiBellTime = {
  fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  },
  bucket(ms) {
    const s = Math.floor(ms / 1000);
    if (s >= 240) return 'late';
    if (s >= 120) return 'mid';
    return '';
  },
};

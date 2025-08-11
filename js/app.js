// app.js — fixes + Chart.js live graph + remember-me + advanced interactions

/* ---------- Utilities ---------- */
function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }
function formatFileSize(bytes){ if (!bytes && bytes!==0) return '-'; if (bytes===0) return '0 Bytes'; const k=1024; const sizes=['Bytes','KB','MB','GB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i]; }
function formatDuration(seconds){ if (!seconds && seconds!==0) return '-'; const h=Math.floor(seconds/3600); const m=Math.floor((seconds%3600)/60); const s=Math.floor(seconds%60); if(h>0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; return `${m}:${String(s).padStart(2,'0')}`; }
window.formatFileSize = formatFileSize;
window.formatDuration = formatDuration;

/* ---------- State ---------- */
let liveChart = null;
let liveData = { labels: [], values: [] };

/* ---------- Chart.js live chart ---------- */
function initLiveChart() {
  const ctx = document.getElementById('liveChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const ctx2 = ctx.getContext('2d');

  const gradient = ctx2.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(255,107,61,0.35)');
  gradient.addColorStop(1, 'rgba(34,197,94,0.03)');

  const cfg = {
    type: 'line',
    data: {
      labels: liveData.labels,
      datasets: [{
        label: 'Uploads / min',
        data: liveData.values,
        fill: true,
        backgroundColor: gradient,
        borderColor: 'rgba(255,107,61,0.95)',
        tension: 0.32,
        pointRadius: 2
      }]
    },
    options: {
      animation: { duration: 600, easing: 'easeOutCubic' },
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { display: true, grid: { display: false } },
        y: { display: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' } }
      },
      maintainAspectRatio: false
    }
  };

  liveChart = new Chart(ctx2, cfg);
}

function pushLivePoint(value) {
  const maxPoints = 24;
  const t = new Date().toLocaleTimeString().replace(/:\d+ /, ' ');
  liveData.labels.push(t);
  liveData.values.push(value);
  if (liveData.labels.length > maxPoints) { liveData.labels.shift(); liveData.values.shift(); }
  if (liveChart) {
    liveChart.data.labels = liveData.labels;
    liveChart.data.datasets[0].data = liveData.values;
    liveChart.update();
  }
}
window.pushLivePoint = pushLivePoint;

/* ---------- UI wiring ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const navButtons = document.querySelectorAll('.nav-btn');
  const loginModalEl = document.getElementById('loginModal');
  const logoutTop = document.getElementById('logoutTop');
  const logoutSmall = document.getElementById('logoutSmall');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const notifyBtn = document.getElementById('notifyBtn');
  const topNotifyBtn = document.getElementById('topNotifyBtn');
  const addAccountBtn = document.getElementById('addAccountBtn');
  const submitAccountBtn = document.getElementById('submitAccountBtn');
  const refreshUploadsBtn = document.getElementById('refreshUploadsBtn');
  const newUploadBtn = document.getElementById('newUploadBtn');

  // entrance animations
  requestAnimationFrame(()=> {
    sidebar.classList.add('sidebar-show');
    document.querySelectorAll('.glass-card').forEach((c,i)=> { c.style.opacity = 0; setTimeout(()=> c.classList.add('fade-in-up'), 100 + i*80); });
  });

  // sidebar mobile toggle
  if (sidebarToggle) sidebarToggle.addEventListener('click', ()=> sidebar.classList.toggle('open'));
  document.addEventListener('click', (e)=> {
    if (window.innerWidth <= 1000 && sidebar.classList.contains('open')) {
      const path = e.composedPath();
      if (!path.includes(sidebar) && !path.includes(sidebarToggle)) sidebar.classList.remove('open');
    }
  });

  // nav switching
  navButtons.forEach(btn => {
    btn.addEventListener('mouseenter', ()=> { btn.style.transform='translateX(4px)'; btn.style.transition='transform .22s'; });
    btn.addEventListener('mouseleave', ()=> btn.style.transform='');
    btn.addEventListener('click', ()=> {
      navButtons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-target');
      if (!target) return;
      document.querySelectorAll('.content-card').forEach(p => p.style.display = 'none');
      const pane = document.querySelector(target);
      if (pane) { pane.style.display='block'; pane.classList.remove('fade-in-up'); void pane.offsetWidth; pane.classList.add('fade-in-up'); }
      if (window.innerWidth <= 1000) sidebar.classList.remove('open');
    });
  });

  // hook buttons (ensure functions exist)
  if (logoutTop) logoutTop.addEventListener('click', logout);
  if (logoutSmall) logoutSmall.addEventListener('click', logout);

  // Search
  function performSearch() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    // if uploadsManager has search, call it
    if (window.uploadsManager && typeof window.uploadsManager.search === 'function') {
      return window.uploadsManager.search(q);
    }
    // fallback: filter table rows
    const rows = document.querySelectorAll('#uploadsTableBody tr');
    rows.forEach(r => {
      const text = r.textContent?.toLowerCase() || '';
      if (!q || text.includes(q)) r.style.display = '';
      else r.style.display = 'none';
    });
  }
  if (searchBtn) searchBtn.addEventListener('click', performSearch);
  if (searchInput) { searchInput.addEventListener('keydown', (e)=> { if (e.key==='Enter') performSearch(); }); }

  // Notifications
  function showNotifications() {
    // simple toast
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-bg-dark border-0';
    toast.style.position = 'fixed'; toast.style.right = '20px'; toast.style.top = '20px'; toast.style.zIndex = 2000;
    toast.innerHTML = `<div class="d-flex"><div class="toast-body">No new notifications</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    document.body.appendChild(toast);
    const t = new bootstrap.Toast(toast, { delay: 3000 }); t.show();
    toast.addEventListener('hidden.bs.toast', ()=> toast.remove());
  }
  if (notifyBtn) notifyBtn.addEventListener('click', showNotifications);
  if (topNotifyBtn) topNotifyBtn.addEventListener('click', showNotifications);

  // Add account
  if (addAccountBtn) addAccountBtn.addEventListener('click', ()=> {
    const modal = new bootstrap.Modal(document.getElementById('accountModal')); modal.show();
  });
  if (submitAccountBtn) submitAccountBtn.addEventListener('click', async ()=> {
    // gather inputs
    const name = document.getElementById('channelName')?.value;
    const email = document.getElementById('channelEmail')?.value;
    const pass = document.getElementById('channelPassword')?.value;
    try {
      if (window.api && typeof api.addAccount === 'function') {
        await api.addAccount({name,email,pass});
      } else {
        console.warn('api.addAccount not implemented — simulating add');
      }
      const modalEl = document.getElementById('accountModal');
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
      if (window.accountsManager && typeof window.accountsManager.loadAccounts === 'function') window.accountsManager.loadAccounts();
    } catch (err) { alert('Add account failed: ' + (err?.message || err)); }
  });

  // Refresh uploads
  if (refreshUploadsBtn) refreshUploadsBtn.addEventListener('click', ()=> { if (window.uploadsManager && typeof window.uploadsManager.loadUploadTasks === 'function') window.uploadsManager.loadUploadTasks(); });

  // quick buttons in right widget
  document.getElementById('openUploadsQuick')?.addEventListener('click', ()=> document.querySelector('[data-target="#uploads"]')?.click());
  document.getElementById('openAccountsQuick')?.addEventListener('click', ()=> document.querySelector('[data-target="#accounts"]')?.click());

  // initialize live chart
  initLiveChart();

  // Hook websockets or api for live data
  if (window.wsManager) {
    wsManager.on('stats', (payload)=> { // expect payload.value
      if (typeof payload?.value === 'number') pushLivePoint(payload.value);
    });
    wsManager.on('upload_progress', (d)=> {
      if (window.uploadsManager && typeof window.uploadsManager.updateUploadProgress === 'function') window.uploadsManager.updateUploadProgress(d.task_id, d.progress, d.status);
    });
  } else if (window.api && typeof api.getStats === 'function') {
    // poll every 5s
    setInterval(async ()=> {
      try {
        const stats = await api.getStats();
        if (stats && typeof stats.recent === 'number') pushLivePoint(stats.recent);
      } catch (e) { console.warn('getStats failed', e); }
    }, 5000);
  } else {
    // demo simulated data
    setInterval(()=> pushLivePoint(Math.floor(Math.random()*30)+1), 3000);
  }

  // Default pane show
  document.querySelectorAll('.content-card').forEach(p=>p.style.display='none');
  document.querySelector('#uploads')?.style && (document.querySelector('#uploads').style.display='block');

  // Modal focus behavior
  document.querySelectorAll('.modal').forEach(modalEl => {
    modalEl.addEventListener('shown.bs.modal', ()=> {
      const first = modalEl.querySelector('input, textarea, select, button'); first?.focus();
      modalEl.querySelector('.modal-content')?.classList.add('fade-in-up');
    });
  });

  /* ---------- Auth flow: do not reveal main until validated ---------- */
  async function validateTokenAndInit() {
    const token = localStorage.getItem('token');
    if (!token) return showLoginModal();

    if (window.api && typeof api.whoami === 'function') {
      try {
        const user = await api.whoami();
        if (!user) return showLoginModal();
        // load managers
        if (window.uploadsManager && typeof window.uploadsManager.loadUploadTasks === 'function') window.uploadsManager.loadUploadTasks();
        if (window.accountsManager && typeof window.accountsManager.loadAccounts === 'function') window.accountsManager.loadAccounts();
        if (window.logsManager && typeof window.logsManager.loadLogs === 'function') window.logsManager.loadLogs();
        // success — keep main visible (was already visible in DOM)
        return;
      } catch (err) { console.warn('whoami error', err); return showLoginModal(); }
    } else {
      // no whoami -> require interactive login
      return showLoginModal();
    }
  }

  function showLoginModal() {
    const modal = new bootstrap.Modal(loginModalEl, { backdrop:'static', keyboard:false });
    modal.show();
    loginModalEl.querySelector('.modal-content')?.classList.add('fade-in-up');
    // prefill username if remembered
    const savedUser = localStorage.getItem('remember_user');
    if (savedUser) document.getElementById('username') && (document.getElementById('username').value = savedUser);
  }

  // run validation
  await validateTokenAndInit();

}); // DOMContentLoaded

/* ---------- Login/Register logic with fixes + remember me ---------- */
document.addEventListener('DOMContentLoaded', function(){
  const loginModalElement = document.getElementById('loginModal');
  if (!loginModalElement) return;

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const uEl = document.getElementById('username'), pEl = document.getElementById('password'), rm = document.getElementById('rememberMe');
      const username = uEl ? uEl.value.trim() : '';
      const password = pEl ? pEl.value : '';
      if (!username || !password) { alert('Fill username and password'); return; }
      try {
        if (window.api && typeof api.login === 'function') {
          await api.login(username, password);
        } else {
          // simulation for dev
          console.warn('api.login not implemented — simulating login');
          localStorage.setItem('token','demo-token');
        }
        // remember me
        if (rm && rm.checked) { localStorage.setItem('remember_user', username); }
        else { localStorage.removeItem('remember_user'); }
        // hide modal
        const modalInstance = bootstrap.Modal.getInstance(loginModalElement);
        if (modalInstance) modalInstance.hide();
        // load data
        if (window.uploadsManager && typeof window.uploadsManager.loadUploadTasks === 'function') window.uploadsManager.loadUploadTasks();
        if (window.accountsManager && typeof window.accountsManager.loadAccounts === 'function') window.accountsManager.loadAccounts();
        if (window.logsManager && typeof window.logsManager.loadLogs === 'function') window.logsManager.loadLogs();
        // nice stagger
        await wait(80);
        if (typeof window.animateCardsStagger === 'function') window.animateCardsStagger();
      } catch (err) {
        console.error('Login failed', err);
        alert('Login failed: ' + (err?.message || err));
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const regUsername = document.getElementById('regUsername')?.value;
      const regEmail = document.getElementById('regEmail')?.value;
      const regPassword = document.getElementById('regPassword')?.value;
      try {
        if (window.api && typeof api.register === 'function') {
          await api.register(regUsername, regEmail, regPassword);
        } else {
          console.warn('api.register not implemented — simulating register');
          localStorage.setItem('token','demo-token');
        }
        const modalInstance = bootstrap.Modal.getInstance(loginModalElement);
        if (modalInstance) modalInstance.hide();
        if (window.uploadsManager && typeof window.uploadsManager.loadUploadTasks === 'function') window.uploadsManager.loadUploadTasks();
        await wait(80);
        if (typeof window.animateCardsStagger === 'function') window.animateCardsStagger();
      } catch (err) { console.error('Registration failed', err); alert('Registration failed: ' + (err?.message || err)); }
    });
  }

  // showRegister / showLogin with null-checks
  window.showRegister = function(){
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (!loginForm || !registerForm) return;
    loginForm.classList.add('fade-out-up');
    setTimeout(()=>{ loginForm.style.display='none'; registerForm.style.display='block'; registerForm.classList.add('fade-in-up'); }, 280);
  };
  window.showLogin = function(){
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (!loginForm || !registerForm) return;
    registerForm.classList.add('fade-out-up');
    setTimeout(()=>{ registerForm.style.display='none'; loginForm.style.display='block'; loginForm.classList.add('fade-in-up'); }, 280);
  };

  // close modal animation
  document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
    btn.addEventListener('click', (e)=> {
      const modal = btn.closest('.modal');
      if (!modal) return;
      modal.classList.add('fade-out-up');
      setTimeout(()=>{ const instance = bootstrap.Modal.getInstance(modal); if (instance) instance.hide(); modal.classList.remove('fade-out-up'); }, 380);
    });
  });
});

/* ---------- Logout ---------- */
function logout(){
  try { if (window.api && typeof api.logout === 'function') api.logout(); } catch(e){ console.warn('api.logout error', e); }
  localStorage.removeItem('token');
  // show login modal
  const loginModalEl = document.getElementById('loginModal');
  if (loginModalEl) { const m = new bootstrap.Modal(loginModalEl, {backdrop:'static', keyboard:false}); m.show(); loginModalEl.querySelector('.modal-content')?.classList.add('fade-in-up'); }
  else location.reload();
}

/* ---------- misc helpers ---------- */
window.refreshUploads = function(){ if (window.uploadsManager && typeof window.uploadsManager.loadUploadTasks === 'function') window.uploadsManager.loadUploadTasks(); };
window.clearLogs = function(){ if (window.logsManager && typeof window.logsManager.clearLogs === 'function') return window.logsManager.clearLogs(); const c = document.getElementById('logContainer'); if (c) c.innerHTML=''; };

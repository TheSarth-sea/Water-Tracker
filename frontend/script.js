const API_URL = window.location.origin;
let currentUser = null;
let waterEntries = [];
let charts = {};

// Hide loading screen
setTimeout(() => {
    const ls = document.getElementById('loadingScreen');
    if (ls) { ls.style.opacity = '0'; setTimeout(() => { if(ls) ls.style.display = 'none'; }, 500); }
}, 1500);

// Check auth
const token = localStorage.getItem('token');
if (!token && window.location.pathname.includes('dashboard.html')) {
    window.location.href = '/';
}

// Initialize dashboard
if (window.location.pathname.includes('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', initDashboard);
}

async function initDashboard() {
    await loadUserData();
    await loadWaterEntries();
    setupEventListeners();
    setupPreview();
    initGoalSettings();
    initNotificationSettings();
    initTheme();
    updateDate();
}

function updateDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
}

async function loadUserData() {
    try {
        const res = await fetch(`${API_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById('userName').innerText = currentUser.name;
            document.getElementById('dailyGoal').innerText = `${currentUser.dailyLimit * 1000} ml`;
            document.getElementById('goalAmount').innerText = `${currentUser.dailyLimit * 1000} ml`;
            document.getElementById('dailyGoalInput').value = currentUser.dailyLimit * 1000;
            document.getElementById('dailyGoalSlider').value = currentUser.dailyLimit * 1000;
            document.getElementById('goalValueDisplay').innerText = currentUser.dailyLimit * 1000;
        } else { logout(); }
    } catch (err) { console.error(err); }
}

async function loadWaterEntries() {
    try {
        const res = await fetch(`${API_URL}/api/water`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) { waterEntries = data.entries || []; updateDashboard(); refreshAnalytics(); }
    } catch (err) { console.error(err); }
}

function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = waterEntries.filter(e => e.date.split('T')[0] === today).reduce((s, e) => s + e.amount, 0);
    const goalMl = currentUser?.dailyLimit * 1000 || 2000;
    const percent = Math.min(100, (todayTotal / (currentUser?.dailyLimit || 2)) * 100);
    
    document.getElementById('todayTotal').innerText = `${(todayTotal * 1000).toFixed(0)} ml`;
    document.getElementById('progressPercent').innerText = `${Math.floor(percent)}%`;
    document.getElementById('currentAmount').innerText = `${(todayTotal * 1000).toFixed(0)} ml`;
    document.getElementById('progressFill').style.width = `${percent}%`;
    
    updateRecentEntries();
    updatePieChart(today);
    updateWeeklyChart();
}

function updateRecentEntries() {
    const list = document.getElementById('entriesList');
    if (!list) return;
    const recent = [...waterEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    if (recent.length === 0) { list.innerHTML = '<div class="empty-state"><i class="fas fa-tint"></i><p>No entries yet. Add your first water entry!</p></div>'; return; }
    list.innerHTML = recent.map(e => `<div class="entry-item"><div><div class="entry-amount">${(e.amount * 1000).toFixed(0)} ml</div><div class="entry-time">${new Date(e.date).toLocaleString()}</div></div><button class="delete-btn" onclick="deleteWaterEntry(\'${e._id}\')"><i class="fas fa-trash"></i></button></div>`).join('');
}

function updatePieChart(today) {
    const ctx = document.getElementById('pieChart')?.getContext('2d');
    if (!ctx) return;
    const todayEntries = waterEntries.filter(e => e.date.split('T')[0] === today);
    const purposes = {};
    todayEntries.forEach(e => { purposes[e.notes || 'Drinking'] = (purposes[e.notes || 'Drinking'] || 0) + e.amount; });
    if (charts.pieChart) charts.pieChart.destroy();
    charts.pieChart = new Chart(ctx, { type: 'pie', data: { labels: Object.keys(purposes) || ['No Data'], datasets: [{ data: Object.values(purposes) || [1], backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444'] }] }, options: { responsive: true } });
}

function updateWeeklyChart() {
    const ctx = document.getElementById('lineChart')?.getContext('2d');
    if (!ctx) return;
    const data = [], labels = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        const daily = waterEntries.filter(e => e.date.split('T')[0] === d.toISOString().split('T')[0]).reduce((s, e) => s + e.amount, 0);
        data.push(daily * 1000);
    }
    if (charts.lineChart) charts.lineChart.destroy();
    charts.lineChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: 'ml', data, borderColor: '#0ea5e9', tension: 0.4, fill: true }] }, options: { responsive: true } });
}

async function addWaterEntry(amount = null) {
    let waterAmount = amount || parseInt(document.getElementById('amountSlider')?.value || 500) / 1000;
    const purpose = document.getElementById('purposeSelect')?.options[document.getElementById('purposeSelect').selectedIndex]?.text || 'Drinking';
    let date = new Date();
    const timeVal = document.getElementById('timeInput')?.value;
    if (timeVal) { const [h, m] = timeVal.split(':'); date.setHours(parseInt(h), parseInt(m)); }
    try {
        const res = await fetch(`${API_URL}/api/water`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ amount: waterAmount, date: date.toISOString(), notes: purpose }) });
        if (res.ok) { showNotification('Entry added!', 'success'); await loadWaterEntries(); switchPage('dashboard'); }
        else showNotification('Failed', 'error');
    } catch (err) { showNotification('Network error', 'error'); }
}

async function deleteWaterEntry(id) {
    if (!confirm('Delete this entry?')) return;
    try {
        const res = await fetch(`${API_URL}/api/water/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showNotification('Deleted!', 'success'); await loadWaterEntries(); }
    } catch (err) { showNotification('Error', 'error'); }
}

async function saveDailyGoal() {
    const newMl = parseInt(document.getElementById('dailyGoalInput').value);
    if (!newMl || newMl < 500 || newMl > 5000) { showNotification('Enter 500-5000 ml', 'error'); return; }
    const btn = document.getElementById('saveGoalBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/api/auth/limit`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ dailyLimit: newMl / 1000 }) });
        if (res.ok) { currentUser.dailyLimit = newMl / 1000; showNotification(`Goal updated to ${newMl} ml!`, 'success'); updateDashboard(); }
        else showNotification('Failed', 'error');
    } catch (err) { showNotification('Network error', 'error'); }
    finally { btn.innerHTML = orig; btn.disabled = false; }
}

function adjustGoal(inc) {
    const input = document.getElementById('dailyGoalInput');
    let val = parseInt(input.value) + inc;
    val = Math.min(5000, Math.max(500, val));
    input.value = val;
    document.getElementById('dailyGoalSlider').value = val;
    document.getElementById('goalValueDisplay').innerText = val;
}

function initGoalSettings() {
    const slider = document.getElementById('dailyGoalSlider');
    const input = document.getElementById('dailyGoalInput');
    const display = document.getElementById('goalValueDisplay');
    if (slider) slider.addEventListener('input', () => { input.value = slider.value; display.innerText = slider.value; });
    if (input) input.addEventListener('input', () => { let v = parseInt(input.value) || 2000; v = Math.min(5000, Math.max(500, v)); slider.value = v; display.innerText = v; });
}

function initNotificationSettings() {
    const toggle = document.getElementById('notificationsToggle');
    const container = document.getElementById('reminderTimeContainer');
    if (toggle) {
        toggle.checked = localStorage.getItem('notificationsEnabled') === 'true';
        if (container) container.style.display = toggle.checked ? 'block' : 'none';
        toggle.addEventListener('change', () => {
            localStorage.setItem('notificationsEnabled', toggle.checked);
            if (container) container.style.display = toggle.checked ? 'block' : 'none';
            showNotification(toggle.checked ? 'Reminders enabled' : 'Reminders disabled', 'success');
        });
    }
}

function testNotification() { showNotification('🔔 Test notification works!', 'success'); }

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    document.querySelectorAll('.theme-option').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.theme-option[data-theme="${theme}"]`)?.classList.add('active');
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function initTheme() { setTheme(localStorage.getItem('theme') || 'light'); }

function exportData() {
    if (!waterEntries.length) { showNotification('No data', 'error'); return; }
    let csv = 'Date,Amount (ml),Notes\n';
    waterEntries.forEach(e => { csv += `${new Date(e.date).toLocaleDateString()},${(e.amount * 1000).toFixed(0)},${e.notes || ''}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `aquatrack_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(a.href);
    showNotification('Exported!', 'success');
}

async function clearAllData() {
    if (!confirm('⚠️ Delete ALL data? This cannot be undone!')) return;
    for (const entry of waterEntries) {
        await fetch(`${API_URL}/api/water/${entry._id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    }
    await loadWaterEntries();
    showNotification('All data cleared', 'success');
}

function refreshAnalytics() {
    const totalMl = waterEntries.reduce((s, e) => s + e.amount, 0) * 1000;
    const avgDaily = totalMl / 7;
    document.getElementById('avgDaily').innerText = `${Math.round(avgDaily)} ml`;
    document.getElementById('totalTracked').innerText = `${(totalMl / 1000).toFixed(1)} L`;
    const goalDays = waterEntries.filter(e => e.amount >= (currentUser?.dailyLimit || 2)).length;
    document.getElementById('goalDays').innerText = goalDays;
    document.getElementById('waterSaved').innerText = `${(waterEntries.reduce((s, e) => s + Math.max(0, (currentUser?.dailyLimit || 2) - e.amount), 0)).toFixed(1)} L`;
}

function setCurrentTime() {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const timeInput = document.getElementById('timeInput');
    if (timeInput) timeInput.value = time;
    document.getElementById('previewTime').innerText = time;
}

function setupPreview() {
    const slider = document.getElementById('amountSlider');
    if (slider) slider.addEventListener('input', () => { document.getElementById('amountDisplay').innerText = `${slider.value} ml`; document.getElementById('previewAmount').innerText = `${slider.value} ml`; });
    const purpose = document.getElementById('purposeSelect');
    if (purpose) purpose.addEventListener('change', () => { document.getElementById('previewPurpose').innerText = purpose.options[purpose.selectedIndex].text; });
    document.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => { const amt = btn.getAttribute('data-amount'); if (slider) slider.value = amt; document.getElementById('amountDisplay').innerText = `${amt} ml`; document.getElementById('previewAmount').innerText = `${amt} ml`; }));
}

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-btn[data-page="${pageId}"]`)?.classList.add('active');
    if (pageId === 'analytics') refreshAnalytics();
}

function showNotification(msg, type = 'info') {
    const area = document.getElementById('notificationArea');
    if (!area) return;
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${msg}</span>`;
    area.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function logout() {
    if (confirm('Logout?')) { localStorage.clear(); window.location.href = '/'; }
}

function setupEventListeners() {
    document.querySelectorAll('.quick-btn').forEach(btn => btn.addEventListener('click', () => addWaterEntry(parseInt(btn.getAttribute('data-amount')) / 1000)));
    document.getElementById('floatingAddBtn')?.addEventListener('click', () => switchPage('add-water'));
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('addWaterBtn')?.addEventListener('click', () => addWaterEntry());
    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchPage(btn.getAttribute('data-page'))));
    document.getElementById('themeToggle')?.addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
}

window.addWaterEntry = addWaterEntry;
window.deleteWaterEntry = deleteWaterEntry;
window.saveDailyGoal = saveDailyGoal;
window.adjustGoal = adjustGoal;
window.testNotification = testNotification;
window.setTheme = setTheme;
window.exportData = exportData;
window.clearAllData = clearAllData;
window.setCurrentTime = setCurrentTime;
window.logout = logout;
window.switchPage = switchPage;
window.refreshAnalytics = refreshAnalytics;

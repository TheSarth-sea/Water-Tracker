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

// ===== COMPLETE ANALYTICS FUNCTION =====
async function refreshAnalytics() {
    const period = parseInt(document.getElementById('periodSelect')?.value || 7);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - period);
    
    // Filter entries for the selected period
    const filteredEntries = waterEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate;
    });
    
    // Calculate statistics
    const totalMl = filteredEntries.reduce((sum, e) => sum + e.amount, 0) * 1000;
    const avgDaily = totalMl / period;
    const goalDays = filteredEntries.filter(e => e.amount >= (currentUser?.dailyLimit || 2)).length;
    const waterSaved = filteredEntries.reduce((sum, e) => sum + Math.max(0, (currentUser?.dailyLimit || 2) - e.amount), 0) * 1000;
    
    // Update stats display
    document.getElementById('avgDaily').innerHTML = `${Math.round(avgDaily).toLocaleString()} ml`;
    document.getElementById('totalTracked').innerHTML = `${(totalMl / 1000).toFixed(1)} L`;
    document.getElementById('goalDays').innerHTML = goalDays;
    document.getElementById('waterSaved').innerHTML = `${(waterSaved / 1000).toFixed(1)} L`;
    
    // Prepare data for trend chart
    const dailyData = [];
    const labels = [];
    for (let i = period - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayTotal = filteredEntries
            .filter(e => e.date.split('T')[0] === dateStr)
            .reduce((sum, e) => sum + e.amount, 0) * 1000;
        
        dailyData.push(dayTotal);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
    
    // Create or update trend chart
    const trendCtx = document.getElementById('analyticsChart')?.getContext('2d');
    if (trendCtx) {
        if (charts.analyticsChart) charts.analyticsChart.destroy();
        charts.analyticsChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Water Consumption',
                    data: dailyData,
                    borderColor: '#0a84ff',
                    backgroundColor: 'rgba(10, 132, 255, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#0a84ff',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.raw.toFixed(0)} ml`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            callback: function(value) {
                                return value + ' ml';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Water (ml)',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }
    
    // Prepare data for distribution chart
    const purposes = {};
    filteredEntries.forEach(entry => {
        const purpose = entry.notes || 'Drinking';
        purposes[purpose] = (purposes[purpose] || 0) + entry.amount * 1000;
    });
    
    const purposeLabels = Object.keys(purposes);
    const purposeData = Object.values(purposes);
    
    // Find top purpose
    let topPurpose = 'No data';
    if (purposeLabels.length > 0) {
        const maxIndex = purposeData.indexOf(Math.max(...purposeData));
        topPurpose = purposeLabels[maxIndex];
    }
    document.getElementById('topPurpose').innerHTML = topPurpose;
    
    // Create or update distribution chart
    const distCtx = document.getElementById('distributionChart')?.getContext('2d');
    if (distCtx) {
        if (charts.distributionChart) charts.distributionChart.destroy();
        charts.distributionChart = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: purposeLabels.length ? purposeLabels : ['No Data'],
                datasets: [{
                    data: purposeData.length ? purposeData : [1],
                    backgroundColor: ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#5e5ce6', '#bf5af2'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: { size: 12 },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw.toFixed(0)} ml (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
    
    // Update weekly breakdown
    updateWeeklyBreakdown(filteredEntries, period);
    
    // Update trend insight
    const trendInsight = document.getElementById('trendInsight');
    if (trendInsight) {
        const lastWeekAvg = dailyData.slice(-7).reduce((a, b) => a + b, 0) / 7;
        const previousWeekAvg = dailyData.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
        if (lastWeekAvg > previousWeekAvg) {
            trendInsight.innerHTML = `📈 Your water consumption has increased by ${((lastWeekAvg - previousWeekAvg) / previousWeekAvg * 100).toFixed(1)}% compared to last week`;
        } else if (lastWeekAvg < previousWeekAvg) {
            trendInsight.innerHTML = `📉 Great job! Your water consumption has decreased by ${((previousWeekAvg - lastWeekAvg) / previousWeekAvg * 100).toFixed(1)}% compared to last week`;
        } else {
            trendInsight.innerHTML = `📊 Your water consumption is consistent with last week. Keep it up!`;
        }
    }
}

// ===== WEEKLY BREAKDOWN FUNCTION =====
function updateWeeklyBreakdown(entries, period) {
    const breakdownBody = document.querySelector('.breakdown-body');
    if (!breakdownBody) return;
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyData = {};
    days.forEach(day => weeklyData[day] = 0);
    
    entries.forEach(entry => {
        const dayName = days[new Date(entry.date).getDay()];
        weeklyData[dayName] += entry.amount * 1000;
    });
    
    const goalMl = (currentUser?.dailyLimit || 2) * 1000;
    
    const breakdownHtml = days.map(day => {
        const amount = weeklyData[day];
        const percentage = Math.min(100, (amount / goalMl) * 100);
        return `
            <div class="breakdown-item">
                <div class="breakdown-day">${day}</div>
                <div class="breakdown-amount">${amount.toFixed(0)} ml</div>
                <div class="breakdown-progress">
                    <div class="progress-bar-small">
                        <div class="progress-fill-small" style="width: ${percentage}%"></div>
                    </div>
                    <div class="progress-percent">${percentage.toFixed(0)}%</div>
                </div>
            </div>
        `;
    }).join('');
    
    breakdownBody.innerHTML = breakdownHtml;
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

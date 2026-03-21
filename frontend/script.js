// ===== API Configuration =====
const API_URL = window.location.origin;
let currentUser = null;
let waterEntries = [];
let charts = {};

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token && window.location.pathname.includes('dashboard.html')) {
        initDashboard();
    } else if (token && !window.location.pathname.includes('dashboard.html')) {
        window.location.href = '/dashboard.html';
    } else if (!token && window.location.pathname.includes('dashboard.html')) {
        window.location.href = '/';
    } else {
        initAuth();
    }
    
    // Set current date
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        dateElement.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-page');
            switchPage(page);
        });
    });
    
    // Floating add button
    const floatingBtn = document.getElementById('floatingAddBtn');
    if (floatingBtn) {
        floatingBtn.addEventListener('click', () => switchPage('add-water'));
    }
});

// ===== Auth Functions =====
function initAuth() {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.style.opacity = '0';
        setTimeout(() => {
            if (loadingScreen) loadingScreen.style.display = 'none';
        }, 500);
    }, 1000);
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showNotification('Login successful!', 'success');
            window.location.href = '/dashboard.html';
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

async function handleSignup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (!name || !email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showNotification('Account created successfully!', 'success');
            window.location.href = '/dashboard.html';
        } else {
            showNotification(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('authTitle').textContent = 'Welcome Back';
    document.getElementById('authSubtitle').textContent = 'Track your water consumption journey';
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('authTitle').textContent = 'Create Account';
    document.getElementById('authSubtitle').textContent = 'Start tracking your water usage today';
}

// ===== Dashboard Functions =====
async function initDashboard() {
    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.style.opacity = '0';
        setTimeout(() => {
            if (loadingScreen) loadingScreen.style.display = 'none';
        }, 500);
    }, 500);
    
    // Load user data
    await loadUserData();
    await loadWaterEntries();
    setupEventListeners();
    setupPreview();
}

async function loadUserData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            document.getElementById('userName').textContent = currentUser.name;
            document.getElementById('dailyGoal').textContent = `${currentUser.dailyLimit * 1000} ml`;
            document.getElementById('goalAmount').textContent = `${currentUser.dailyLimit * 1000} ml`;
            document.getElementById('dailyGoalInput').value = currentUser.dailyLimit * 1000;
        } else {
            handleLogout();
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

async function loadWaterEntries() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/water`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (response.ok) {
            waterEntries = data.entries;
            updateDashboard();
        }
    } catch (error) {
        console.error('Error loading entries:', error);
    }
}

function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = waterEntries.filter(e => e.date.split('T')[0] === today);
    const todayTotal = todayEntries.reduce((sum, e) => sum + e.amount, 0);
    const dailyGoalMl = currentUser.dailyLimit * 1000;
    
    // Update stats
    document.getElementById('todayTotal').textContent = `${(todayTotal * 1000).toFixed(0)} ml`;
    document.getElementById('progressPercent').textContent = `${Math.min(100, Math.floor((todayTotal / currentUser.dailyLimit) * 100))}%`;
    document.getElementById('currentAmount').textContent = `${(todayTotal * 1000).toFixed(0)} ml`;
    
    // Update progress bar
    const progressPercent = Math.min(100, (todayTotal / currentUser.dailyLimit) * 100);
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
    
    // Update quick actions
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.onclick = () => addWaterEntry(parseInt(btn.getAttribute('data-amount')) / 1000);
    });
    
    // Update recent entries
    updateRecentEntries();
    
    // Update charts
    updatePieChart(todayEntries);
    updateWeeklyChart();
}

function updateRecentEntries() {
    const entriesList = document.getElementById('entriesList');
    const recentEntries = [...waterEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    
    if (recentEntries.length === 0) {
        entriesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tint"></i>
                <p>No entries yet. Add your first water entry!</p>
            </div>
        `;
        return;
    }
    
    entriesList.innerHTML = recentEntries.map(entry => `
        <div class="entry-item">
            <div class="entry-info">
                <div class="entry-amount">${(entry.amount * 1000).toFixed(0)} ml</div>
                <div class="entry-purpose">${entry.notes || 'Water intake'}</div>
                <div class="entry-time">${new Date(entry.date).toLocaleString()}</div>
            </div>
            <div class="entry-actions">
                <button class="delete-btn" onclick="deleteWaterEntry('${entry._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updatePieChart(todayEntries) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    const purposes = {};
    todayEntries.forEach(entry => {
        const purpose = entry.notes || 'Drinking';
        purposes[purpose] = (purposes[purpose] || 0) + entry.amount;
    });
    
    if (charts.pieChart) charts.pieChart.destroy();
    charts.pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(purposes),
            datasets: [{
                data: Object.values(purposes),
                backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function updateWeeklyChart() {
    const ctx = document.getElementById('lineChart').getContext('2d');
    const last7Days = [];
    const labels = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        const dateStr = date.toISOString().split('T')[0];
        const dailyTotal = waterEntries
            .filter(e => e.date.split('T')[0] === dateStr)
            .reduce((sum, e) => sum + e.amount, 0);
        last7Days.push(dailyTotal * 1000);
    }
    
    if (charts.lineChart) charts.lineChart.destroy();
    charts.lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Water Consumption (ml)',
                data: last7Days,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

// ===== Add Water Functions =====
function setupPreview() {
    const slider = document.getElementById('amountSlider');
    const display = document.getElementById('amountDisplay');
    const previewAmount = document.getElementById('previewAmount');
    const purposeSelect = document.getElementById('purposeSelect');
    const previewPurpose = document.getElementById('previewPurpose');
    const timeInput = document.getElementById('timeInput');
    const previewTime = document.getElementById('previewTime');
    
    if (slider) {
        slider.addEventListener('input', () => {
            const value = slider.value;
            display.textContent = `${value} ml`;
            previewAmount.textContent = `${value} ml`;
        });
    }
    
    if (purposeSelect) {
        purposeSelect.addEventListener('change', () => {
            previewPurpose.textContent = purposeSelect.options[purposeSelect.selectedIndex].text;
        });
    }
    
    if (timeInput) {
        timeInput.addEventListener('change', () => {
            previewTime.textContent = timeInput.value || 'Now';
        });
    }
    
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.getAttribute('data-amount');
            if (slider) slider.value = amount;
            if (display) display.textContent = `${amount} ml`;
            if (previewAmount) previewAmount.textContent = `${amount} ml`;
        });
    });
}

function setCurrentTime() {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const timeInput = document.getElementById('timeInput');
    if (timeInput) timeInput.value = timeString;
    document.getElementById('previewTime').textContent = timeString;
}

async function addWaterEntry(amount = null) {
    let waterAmount = amount;
    if (!waterAmount) {
        waterAmount = parseInt(document.getElementById('amountSlider')?.value || 500) / 1000;
    }
    
    const notes = document.getElementById('purposeSelect')?.options[document.getElementById('purposeSelect').selectedIndex]?.text || 'Drinking';
    const timeInput = document.getElementById('timeInput')?.value;
    
    let date = new Date();
    if (timeInput) {
        const [hours, minutes] = timeInput.split(':');
        date.setHours(parseInt(hours), parseInt(minutes));
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/water`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                amount: waterAmount, 
                date: date.toISOString(),
                notes: notes
            })
        });
        
        if (response.ok) {
            showNotification('Water entry added successfully!', 'success');
            await loadWaterEntries();
            switchPage('dashboard');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to add entry', 'error');
        }
    } catch (error) {
        showNotification('Network error', 'error');
    }
}

async function deleteWaterEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/water/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showNotification('Entry deleted successfully!', 'success');
            await loadWaterEntries();
        } else {
            showNotification('Failed to delete entry', 'error');
        }
    } catch (error) {
        showNotification('Network error', 'error');
    }
}

// ===== Analytics Functions =====
async function refreshAnalytics() {
    const period = parseInt(document.getElementById('periodSelect')?.value || 7);
    const filteredEntries = waterEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        const daysAgo = (new Date() - entryDate) / (1000 * 60 * 60 * 24);
        return daysAgo <= period;
    });
    
    const totalMl = filteredEntries.reduce((sum, e) => sum + e.amount, 0) * 1000;
    const avgDaily = totalMl / period;
    const goalDays = filteredEntries.filter(e => e.amount >= currentUser.dailyLimit).length;
    const waterSaved = filteredEntries.reduce((sum, e) => sum + Math.max(0, currentUser.dailyLimit - e.amount), 0) * 1000;
    
    document.getElementById('avgDaily').textContent = `${Math.round(avgDaily)} ml`;
    document.getElementById('totalTracked').textContent = `${(totalMl / 1000).toFixed(1)} L`;
    document.getElementById('goalDays').textContent = goalDays;
    document.getElementById('waterSaved').textContent = `${(waterSaved / 1000).toFixed(1)} L`;
    
    // Update analytics chart
    const ctx = document.getElementById('analyticsChart')?.getContext('2d');
    if (ctx) {
        const dailyData = Array(period).fill(0);
        filteredEntries.forEach(entry => {
            const daysAgo = Math.floor((new Date() - new Date(entry.date)) / (1000 * 60 * 60 * 24));
            if (daysAgo < period) {
                dailyData[period - 1 - daysAgo] += entry.amount * 1000;
            }
        });
        
        if (charts.analyticsChart) charts.analyticsChart.destroy();
        charts.analyticsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: period }, (_, i) => `Day ${i + 1}`),
                datasets: [{
                    label: 'Daily Consumption (ml)',
                    data: dailyData,
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: true }
        });
    }
}

// ===== Settings Functions =====
async function saveDailyGoal() {
    const newGoalMl = parseInt(document.getElementById('dailyGoalInput')?.value);
    if (!newGoalMl || newGoalMl < 500 || newGoalMl > 10000) {
        showNotification('Please enter a valid goal between 500 and 10000 ml', 'error');
        return;
    }
    
    const newGoalL = newGoalMl / 1000;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/auth/limit`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ dailyLimit: newGoalL })
        });
        
        if (response.ok) {
            currentUser.dailyLimit = newGoalL;
            showNotification('Daily goal updated successfully!', 'success');
            updateDashboard();
        } else {
            showNotification('Failed to update goal', 'error');
        }
    } catch (error) {
        showNotification('Network error', 'error');
    }
}

function exportData() {
    const csv = ['Date,Amount (ml),Notes'];
    waterEntries.forEach(entry => {
        csv.push(`${new Date(entry.date).toLocaleDateString()},${entry.amount * 1000},${entry.notes || ''}`);
    });
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquatrack_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully!', 'success');
}

async function clearAllData() {
    if (!confirm('⚠️ WARNING: This will delete ALL your water tracking data. This action cannot be undone. Are you sure?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const entries = [...waterEntries];
        for (const entry of entries) {
            await fetch(`${API_URL}/api/water/${entry._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
        await loadWaterEntries();
        showNotification('All data cleared successfully!', 'success');
    } catch (error) {
        showNotification('Error clearing data', 'error');
    }
}

// ===== Utility Functions =====
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageId) {
            btn.classList.add('active');
        }
    });
    
    if (pageId === 'analytics') {
        refreshAnalytics();
    }
}

function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notificationArea');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notificationArea.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function handleLogout() {
    localStorage.clear();
    showNotification('Logged out successfully', 'success');
    window.location.href = '/';
}

function setupEventListeners() {
    document.getElementById('periodSelect')?.addEventListener('change', refreshAnalytics);
    document.getElementById('notificationsToggle')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            const reminderTime = document.getElementById('reminderTime').value;
            localStorage.setItem('reminderTime', reminderTime);
            showNotification(`Daily reminders set for ${reminderTime}`, 'success');
        } else {
            localStorage.removeItem('reminderTime');
            showNotification('Reminders disabled', 'info');
        }
    });
    
    const savedReminderTime = localStorage.getItem('reminderTime');
    if (savedReminderTime) {
        document.getElementById('reminderTime').value = savedReminderTime;
        document.getElementById('notificationsToggle').checked = true;
    }
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

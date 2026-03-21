// ===== CONFIGURATION =====
const API_URL = window.location.origin;
let currentUser = null;
let waterEntries = [];
let charts = {};

// ===== EMERGENCY LOADING SCREEN FIX =====
console.log('🚀 AquaTrack starting...');

// Force hide loading screen after page loads
window.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded');
    
    // Check if we're on dashboard or index page
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const hasToken = localStorage.getItem('token');
    
    console.log('Is Dashboard:', isDashboard);
    console.log('Has Token:', !!hasToken);
    
    // Handle loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(function() {
            loadingScreen.style.opacity = '0';
            setTimeout(function() {
                loadingScreen.style.display = 'none';
                console.log('✅ Loading screen hidden');
            }, 500);
        }, 1500);
    }
    
    // Redirect logic
    if (isDashboard && !hasToken) {
        console.log('No token, redirecting to login');
        window.location.href = '/';
    } else if (!isDashboard && hasToken) {
        console.log('Has token, checking validity...');
        checkTokenValidity();
    }
});

async function checkTokenValidity() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            console.log('Token valid, staying on page');
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                window.location.href = '/dashboard.html';
            } else {
                initDashboard();
            }
        } else {
            console.log('Token invalid, clearing and redirecting');
            localStorage.clear();
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Token check error:', error);
        // Don't redirect on network error, let user try
        if (window.location.pathname.includes('dashboard.html')) {
            showNotification('Connection error. Please check your internet.', 'error');
        }
    }
}

// ===== DASHBOARD INITIALIZATION =====
async function initDashboard() {
    console.log('📊 Initializing dashboard...');
    
    try {
        await loadUserData();
        await loadWaterEntries();
        setupEventListeners();
        setupPreview();
        initGoalSettings();
        initNotificationSettings();
        initTheme();
        
        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        showNotification('Error loading dashboard. Please refresh the page.', 'error');
    }
}

// ===== LOAD USER DATA =====
async function loadUserData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found');
            return;
        }
        
        console.log('Loading user data...');
        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            console.log('User loaded:', currentUser.name);
            
            // Update UI elements if they exist
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = currentUser.name;
            
            const dailyGoalEl = document.getElementById('dailyGoal');
            if (dailyGoalEl) dailyGoalEl.textContent = `${currentUser.dailyLimit * 1000} ml`;
            
            const goalAmountEl = document.getElementById('goalAmount');
            if (goalAmountEl) goalAmountEl.textContent = `${currentUser.dailyLimit * 1000} ml`;
            
            const dailyGoalInput = document.getElementById('dailyGoalInput');
            if (dailyGoalInput) dailyGoalInput.value = currentUser.dailyLimit * 1000;
            
        } else {
            console.error('Failed to load user:', response.status);
            localStorage.clear();
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showNotification('Failed to load user data', 'error');
    }
}

// ===== LOAD WATER ENTRIES =====
async function loadWaterEntries() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        console.log('Loading water entries...');
        const response = await fetch(`${API_URL}/api/water`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (response.ok) {
            waterEntries = data.entries || [];
            console.log(`Loaded ${waterEntries.length} entries`);
            updateDashboard();
        } else {
            console.error('Failed to load entries:', data);
        }
    } catch (error) {
        console.error('Error loading entries:', error);
        waterEntries = [];
    }
}

// ===== UPDATE DASHBOARD =====
function updateDashboard() {
    console.log('Updating dashboard...');
    
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = waterEntries.filter(e => e.date.split('T')[0] === today);
    const todayTotal = todayEntries.reduce((sum, e) => sum + e.amount, 0);
    const dailyGoalMl = currentUser ? currentUser.dailyLimit * 1000 : 2000;
    
    // Update stats if elements exist
    const todayTotalEl = document.getElementById('todayTotal');
    if (todayTotalEl) todayTotalEl.textContent = `${(todayTotal * 1000).toFixed(0)} ml`;
    
    const progressPercentEl = document.getElementById('progressPercent');
    if (progressPercentEl) {
        const percent = Math.min(100, Math.floor((todayTotal / (currentUser?.dailyLimit || 2) * 100)));
        progressPercentEl.textContent = `${percent}%`;
    }
    
    const currentAmountEl = document.getElementById('currentAmount');
    if (currentAmountEl) currentAmountEl.textContent = `${(todayTotal * 1000).toFixed(0)} ml`;
    
    // Update progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const percent = Math.min(100, (todayTotal / (currentUser?.dailyLimit || 2)) * 100);
        progressFill.style.width = `${percent}%`;
    }
    
    // Update recent entries
    updateRecentEntries();
    
    // Update charts
    if (typeof updatePieChart === 'function') updatePieChart(todayEntries);
    if (typeof updateWeeklyChart === 'function') updateWeeklyChart();
}

// ===== UPDATE RECENT ENTRIES =====
function updateRecentEntries() {
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) return;
    
    const recentEntries = [...waterEntries]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    
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

// ===== GOAL SETTINGS FUNCTIONS =====
function initGoalSettings() {
    const goalSlider = document.getElementById('dailyGoalSlider');
    const goalInput = document.getElementById('dailyGoalInput');
    const goalDisplay = document.getElementById('goalValueDisplay');
    
    if (goalSlider && currentUser) {
        const currentGoalMl = currentUser.dailyLimit * 1000;
        goalSlider.value = currentGoalMl;
        if (goalInput) goalInput.value = currentGoalMl;
        if (goalDisplay) goalDisplay.textContent = currentGoalMl;
        
        if (goalSlider) {
            goalSlider.addEventListener('input', function() {
                const value = parseInt(this.value);
                if (goalInput) goalInput.value = value;
                if (goalDisplay) goalDisplay.textContent = value;
            });
        }
        
        if (goalInput) {
            goalInput.addEventListener('input', function() {
                let value = parseInt(this.value);
                if (isNaN(value)) value = 2000;
                value = Math.min(5000, Math.max(500, value));
                if (goalSlider) goalSlider.value = value;
                if (goalDisplay) goalDisplay.textContent = value;
            });
        }
    }
}

function adjustGoal(increment) {
    const goalInput = document.getElementById('dailyGoalInput');
    if (goalInput) {
        let newValue = parseInt(goalInput.value) + increment;
        newValue = Math.min(5000, Math.max(500, newValue));
        goalInput.value = newValue;
        
        const goalSlider = document.getElementById('dailyGoalSlider');
        const goalDisplay = document.getElementById('goalValueDisplay');
        if (goalSlider) goalSlider.value = newValue;
        if (goalDisplay) goalDisplay.textContent = newValue;
    }
}

async function saveDailyGoal() {
    const goalInput = document.getElementById('dailyGoalInput');
    const newGoalMl = parseInt(goalInput?.value);
    
    if (!newGoalMl || newGoalMl < 500 || newGoalMl > 5000) {
        showNotification('Please enter a valid goal between 500 and 5000 ml', 'error');
        return;
    }
    
    const newGoalL = newGoalMl / 1000;
    
    const saveBtn = document.getElementById('saveGoalBtn');
    if (saveBtn) {
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
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
            
            const data = await response.json();
            
            if (response.ok) {
                currentUser.dailyLimit = newGoalL;
                showNotification(`Daily goal updated to ${newGoalMl} ml!`, 'success');
                
                const dailyGoalEl = document.getElementById('dailyGoal');
                if (dailyGoalEl) dailyGoalEl.textContent = `${newGoalMl} ml`;
                
                const goalAmountEl = document.getElementById('goalAmount');
                if (goalAmountEl) goalAmountEl.textContent = `${newGoalMl} ml`;
                
                updateDashboard();
            } else {
                showNotification(data.message || 'Failed to update goal', 'error');
            }
        } catch (error) {
            console.error('Error saving goal:', error);
            showNotification('Network error. Please try again.', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

// ===== NOTIFICATION FUNCTIONS =====
function initNotificationSettings() {
    const notificationToggle = document.getElementById('notificationsToggle');
    const reminderContainer = document.getElementById('reminderTimeContainer');
    const reminderTime = document.getElementById('reminderTime');
    
    if (notificationToggle) {
        const savedNotifications = localStorage.getItem('notificationsEnabled') === 'true';
        notificationToggle.checked = savedNotifications;
        
        if (reminderContainer) {
            reminderContainer.style.display = savedNotifications ? 'block' : 'none';
        }
        
        const savedReminderTime = localStorage.getItem('reminderTime');
        if (savedReminderTime && reminderTime) {
            reminderTime.value = savedReminderTime;
        } else if (reminderTime) {
            reminderTime.value = '09:00';
        }
        
        notificationToggle.addEventListener('change', function() {
            const enabled = this.checked;
            localStorage.setItem('notificationsEnabled', enabled);
            if (reminderContainer) {
                reminderContainer.style.display = enabled ? 'block' : 'none';
            }
            if (enabled && reminderTime) {
                showNotification(`Daily reminders enabled for ${reminderTime.value}`, 'success');
            } else {
                showNotification('Reminders disabled', 'info');
            }
        });
        
        if (reminderTime) {
            reminderTime.addEventListener('change', function() {
                if (notificationToggle.checked) {
                    localStorage.setItem('reminderTime', this.value);
                    showNotification(`Reminder time updated to ${this.value}`, 'success');
                }
            });
        }
    }
}

function testNotification() {
    showNotification('🔔 This is a test notification! Your reminders are working.', 'success');
}

// ===== THEME FUNCTIONS =====
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === theme) {
            btn.classList.add('active');
        }
    });
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// ===== WATER ENTRY FUNCTIONS =====
function setupPreview() {
    const slider = document.getElementById('amountSlider');
    const display = document.getElementById('amountDisplay');
    const previewAmount = document.getElementById('previewAmount');
    const purposeSelect = document.getElementById('purposeSelect');
    const previewPurpose = document.getElementById('previewPurpose');
    
    if (slider) {
        slider.addEventListener('input', () => {
            const value = slider.value;
            if (display) display.textContent = `${value} ml`;
            if (previewAmount) previewAmount.textContent = `${value} ml`;
        });
    }
    
    if (purposeSelect && previewPurpose) {
        purposeSelect.addEventListener('change', () => {
            previewPurpose.textContent = purposeSelect.options[purposeSelect.selectedIndex]?.text || 'Drinking';
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
    const previewTime = document.getElementById('previewTime');
    if (previewTime) previewTime.textContent = timeString;
}

async function addWaterEntry(amount = null) {
    let waterAmount = amount;
    if (!waterAmount) {
        const slider = document.getElementById('amountSlider');
        if (slider) {
            waterAmount = parseInt(slider.value) / 1000;
        } else {
            waterAmount = 0.5;
        }
    }
    
    const purposeSelect = document.getElementById('purposeSelect');
    const notes = purposeSelect?.options[purposeSelect.selectedIndex]?.text || 'Drinking';
    const timeInput = document.getElementById('timeInput');
    
    let date = new Date();
    if (timeInput && timeInput.value) {
        const [hours, minutes] = timeInput.value.split(':');
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
        console.error('Error adding entry:', error);
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
        console.error('Error deleting entry:', error);
        showNotification('Network error', 'error');
    }
}

// ===== UTILITY FUNCTIONS =====
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageId) {
            btn.classList.add('active');
        }
    });
    
    if (pageId === 'analytics' && typeof refreshAnalytics === 'function') {
        refreshAnalytics();
    }
}

function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notificationArea');
    if (!notificationArea) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notificationArea.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loading');
    if (loadingOverlay) {
        loadingOverlay.classList.toggle('hidden', !show);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        showNotification('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    }
}

function exportData() {
    if (!waterEntries || waterEntries.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    
    const csvRows = [['Date', 'Amount (ml)', 'Notes']];
    waterEntries.forEach(entry => {
        csvRows.push([
            new Date(entry.date).toLocaleDateString(),
            (entry.amount * 1000).toFixed(0),
            entry.notes || 'Water intake'
        ]);
    });
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquatrack_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification(`Exported ${waterEntries.length} entries!`, 'success');
}

async function clearAllData() {
    if (!confirm('⚠️ WARNING: This will delete ALL your water tracking data. This action cannot be undone. Are you sure?')) {
        return;
    }
    
    showLoading(true);
    try {
        const token = localStorage.getItem('token');
        const entries = [...waterEntries];
        let deleted = 0;
        
        for (const entry of entries) {
            const response = await fetch(`${API_URL}/api/water/${entry._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) deleted++;
        }
        
        await loadWaterEntries();
        showNotification(`Deleted ${deleted} entries!`, 'success');
    } catch (error) {
        console.error('Error clearing data:', error);
        showNotification('Error clearing data', 'error');
    } finally {
        showLoading(false);
    }
}

function refreshAnalytics() {
    // Simple analytics refresh
    if (waterEntries && waterEntries.length > 0) {
        const totalMl = waterEntries.reduce((sum, e) => sum + e.amount, 0) * 1000;
        const avgDaily = totalMl / 7;
        
        const avgDailyEl = document.getElementById('avgDaily');
        if (avgDailyEl) avgDailyEl.textContent = `${Math.round(avgDaily)} ml`;
        
        const totalTrackedEl = document.getElementById('totalTracked');
        if (totalTrackedEl) totalTrackedEl.textContent = `${(totalMl / 1000).toFixed(1)} L`;
    }
}

function updatePieChart(todayEntries) {
    const ctx = document.getElementById('pieChart')?.getContext('2d');
    if (!ctx) return;
    
    const purposes = {};
    todayEntries.forEach(entry => {
        const purpose = entry.notes || 'Drinking';
        purposes[purpose] = (purposes[purpose] || 0) + entry.amount;
    });
    
    if (charts.pieChart) charts.pieChart.destroy();
    charts.pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(purposes) || ['No Data'],
            datasets: [{
                data: Object.values(purposes) || [1],
                backgroundColor: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function updateWeeklyChart() {
    const ctx = document.getElementById('lineChart')?.getContext('2d');
    if (!ctx) return;
    
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

function setupEventListeners() {
    // Quick add buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseInt(btn.getAttribute('data-amount'));
            if (amount) addWaterEntry(amount / 1000);
        });
    });
    
    // Floating add button
    const floatingBtn = document.getElementById('floatingAddBtn');
    if (floatingBtn) {
        floatingBtn.addEventListener('click', () => switchPage('add-water'));
    }
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-page');
            if (page) switchPage(page);
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Add water button
    const addWaterBtn = document.querySelector('.btn-add-water');
    if (addWaterBtn) {
        addWaterBtn.addEventListener('click', () => addWaterEntry());
    }
}

// Make functions globally available
window.addWaterEntry = addWaterEntry;
window.deleteWaterEntry = deleteWaterEntry;
window.saveDailyGoal = saveDailyGoal;
window.adjustGoal = adjustGoal;
window.testNotification = testNotification;
window.setTheme = setTheme;
window.exportData = exportData;
window.clearAllData = clearAllData;
window.setCurrentTime = setCurrentTime;
window.handleLogout = handleLogout;
window.switchPage = switchPage;

console.log('✅ All functions registered');

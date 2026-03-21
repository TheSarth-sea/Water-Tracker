const API_URL = 'http://localhost:5000/api';
let currentUser = null;
let waterEntries = [];

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'index.html';
}

// Load user data
async function loadUserData() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      currentUser = await response.json();
      document.getElementById('userName').textContent = currentUser.name;
      document.getElementById('dailyLimitDisplay').textContent = `${currentUser.dailyLimit} L`;
      loadBadges(currentUser.badges);
    } else {
      logout();
    }
  } catch (error) {
    console.error('Error loading user:', error);
  }
}

// Load water entries
async function loadWaterEntries() {
  try {
    showLoading(true);
    const response = await fetch(`${API_URL}/water`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    if (response.ok) {
      waterEntries = data.entries;
      updateDashboard();
    }
  } catch (error) {
    console.error('Error loading entries:', error);
  } finally {
    showLoading(false);
  }
}

// Add water entry
async function addWaterEntry(amount, date) {
  try {
    showLoading(true);
    const response = await fetch(`${API_URL}/water`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount, date })
    });
    
    if (response.ok) {
      await loadWaterEntries();
      showToast('Water entry added successfully!', 'success');
    } else {
      const error = await response.json();
      showToast(error.message, 'error');
    }
  } catch (error) {
    showToast('Error adding entry', 'error');
  } finally {
    showLoading(false);
  }
}

// Delete water entry
async function deleteWaterEntry(id) {
  if (!confirm('Are you sure you want to delete this entry?')) return;
  
  try {
    showLoading(true);
    const response = await fetch(`${API_URL}/water/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      await loadWaterEntries();
      showToast('Entry deleted successfully!', 'success');
    }
  } catch (error) {
    showToast('Error deleting entry', 'error');
  } finally {
    showLoading(false);
  }
}

// Update dashboard
async function updateDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = waterEntries.filter(entry => entry.date.split('T')[0] === today);
  const todayTotal = todayEntries.reduce((sum, entry) => sum + entry.amount, 0);
  
  document.getElementById('todayTotal').textContent = `${todayTotal.toFixed(1)} L`;
  
  const progressPercent = Math.min(100, (todayTotal / currentUser.dailyLimit) * 100);
  document.getElementById('progressBar').style.width = `${progressPercent}%`;
  
  if (todayTotal > currentUser.dailyLimit) {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.innerHTML = '<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded"><i class="fas fa-exclamation-triangle mr-2"></i>You have exceeded your daily water limit!</div>';
    alertDiv.classList.remove('hidden');
  } else {
    document.getElementById('alertMessage').classList.add('hidden');
  }
  
  // Calculate weekly average
  const last7Days = getLast7DaysData();
  const weeklyAvg = last7Days.reduce((sum, val) => sum + val, 0) / 7;
  document.getElementById('weeklyAvg').textContent = `${weeklyAvg.toFixed(1)} L`;
  
  // Calculate total saved (based on recommended limit)
  const totalWater = waterEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const recommended = currentUser.dailyLimit * waterEntries.length;
  const saved = Math.max(0, recommended - totalWater);
  document.getElementById('totalSaved').textContent = `${saved.toFixed(1)} L`;
  
  // Update history table
  updateHistoryTable();
  
  // Load insights
  await loadInsights();
  
  // Refresh charts
  if (window.updateCharts) {
    window.updateCharts(waterEntries);
  }
}

// Get last 7 days data
function getLast7DaysData() {
  const data = Array(7).fill(0);
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTotal = waterEntries
      .filter(entry => entry.date.split('T')[0] === dateStr)
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    data[6 - i] = dayTotal;
  }
  
  return data;
}

// Update history table
function updateHistoryTable() {
  const tbody = document.getElementById('historyTable');
  const sortedEntries = [...waterEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  tbody.innerHTML = sortedEntries.slice(0, 10).map(entry => `
    <tr class="border-b border-gray-200">
      <td class="py-3">${new Date(entry.date).toLocaleDateString()}</td>
      <td class="py-3">${entry.amount.toFixed(1)} L</td>
      <td class="py-3">${entry.notes || '-'}</td>
      <td class="py-3">
        <button onclick="deleteWaterEntry('${entry._id}')" class="text-red-500 hover:text-red-700 transition">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Load insights
async function loadInsights() {
  try {
    const response = await fetch(`${API_URL}/analytics/insights`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    if (response.ok) {
      let insightText = '';
      if (data.exceeded) {
        insightText = `⚠️ You've exceeded your daily limit by ${(data.todayTotal - data.dailyLimit).toFixed(1)}L. ${data.tip}`;
      } else {
        insightText = `💪 Great job! You're ${data.remaining.toFixed(1)}L under your daily goal. ${data.tip}`;
      }
      document.getElementById('insightText').textContent = insightText;
    }
  } catch (error) {
    console.error('Error loading insights:', error);
  }
}

// Load badges
function loadBadges(badges) {
  const container = document.getElementById('badgesContainer');
  const badgeMap = {
    'HydrationHero': { icon: 'fa-tint', color: 'blue', name: 'Hydration Hero' },
    'WeekWarrior': { icon: 'fa-calendar-week', color: 'green', name: 'Week Warrior' },
    'WaterSaver': { icon: 'fa-leaf', color: 'emerald', name: 'Water Saver' },
    'ConsistencyKing': { icon: 'fa-crown', color: 'yellow', name: 'Consistency King' }
  };
  
  if (!badges || badges.length === 0) {
    container.innerHTML = '<p class="text-gray-500">Complete challenges to earn badges! 🏆</p>';
    return;
  }
  
  container.innerHTML = badges.map(badge => {
    const info = badgeMap[badge] || { icon: 'fa-award', color: 'gray', name: badge };
    return `
      <div class="bg-gradient-to-r from-${info.color}-100 to-${info.color}-200 rounded-xl px-4 py-2 flex items-center space-x-2">
        <i class="fas ${info.icon} text-${info.color}-600"></i>
        <span class="text-sm font-medium text-gray-700">${info.name}</span>
      </div>
    `;
  }).join('');
}

// Export CSV
async function exportCSV() {
  const csvRows = [
    ['Date', 'Amount (L)', 'Notes']
  ];
  
  waterEntries.forEach(entry => {
    csvRows.push([
      new Date(entry.date).toLocaleDateString(),
      entry.amount,
      entry.notes || ''
    ]);
  });
  
  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `water_data_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  showToast('CSV exported successfully!', 'success');
}

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up`;
  
  if (type === 'success') {
    toast.className += ' bg-green-500 text-white';
    toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
  } else if (type === 'error') {
    toast.className += ' bg-red-500 text-white';
    toast.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
  } else {
    toast.className += ' bg-blue-500 text-white';
    toast.innerHTML = `<i class="fas fa-info-circle mr-2"></i>${message}`;
  }
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Loading overlay
function showLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Dark mode toggle
function initDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    darkModeToggle.innerHTML = '<i class="fas fa-sun text-yellow-500"></i>';
  }
  
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun text-yellow-500"></i>' : '<i class="fas fa-moon text-gray-700"></i>';
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  await loadWaterEntries();
  
  document.getElementById('addWaterBtn').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('waterAmount').value);
    const date = document.getElementById('waterDate').value || new Date().toISOString().split('T')[0];
    
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    
    addWaterEntry(amount, date);
    document.getElementById('waterAmount').value = '';
  });
  
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  
  initDarkMode();
});

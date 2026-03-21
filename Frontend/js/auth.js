const API_URL = 'http://localhost:5000/api';

let currentForm = 'login';

function toggleAuth() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  
  if (currentForm === 'login') {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    currentForm = 'signup';
  } else {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    currentForm = 'login';
  }
}

// Login Handler
document.getElementById('login-form-element').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('Network error. Please try again.');
  }
});

// Signup Handler
document.getElementById('signup-form-element').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } else {
      showError(data.message);
    }
  } catch (error) {
    showError('Network error. Please try again.');
  }
});

function showError(message) {
  const container = document.getElementById('auth-container');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
  
  const existingError = container.querySelector('.bg-red-100');
  if (existingError) existingError.remove();
  
  container.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

// Check if already logged in
const token = localStorage.getItem('token');
if (token && window.location.pathname.includes('dashboard.html')) {
  window.location.href = 'dashboard.html';
}

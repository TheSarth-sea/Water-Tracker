// ===== AUTHENTICATION SYSTEM =====
const API_URL = window.location.origin;

// Check if already logged in
const token = localStorage.getItem('token');
if (token && window.location.pathname.includes('index.html')) {
    // Verify token is still valid
    fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(response => {
        if (response.ok) {
            window.location.href = '/dashboard.html';
        } else {
            localStorage.clear();
        }
    }).catch(() => {
        localStorage.clear();
    });
}

// Hide loading screen after page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1000);
});

// ===== LOGIN FUNCTION =====
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Validation
    if (!email || !password) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (!email.includes('@')) {
        showAuthError('Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;
    
    try {
        console.log('Attempting login for:', email);
        
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log('Login response:', response.status, data);
        
        if (response.ok && data.success) {
            // Store authentication data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showAuthSuccess('Login successful! Redirecting...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showAuthError(data.message || 'Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthError('Network error. Please check your connection and try again.');
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// ===== SIGNUP FUNCTION =====
async function handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    // Validation
    if (!name || !email || !password) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (name.length < 2) {
        showAuthError('Please enter your full name');
        return;
    }
    
    if (!email.includes('@')) {
        showAuthError('Please enter a valid email address');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long');
        return;
    }
    
    // Show loading state
    const signupBtn = document.getElementById('signupBtn');
    const originalText = signupBtn.innerHTML;
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    signupBtn.disabled = true;
    
    try {
        console.log('Attempting signup for:', email);
        
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        console.log('Signup response:', response.status, data);
        
        if (response.ok && data.success) {
            // Store authentication data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showAuthSuccess('Account created successfully! Redirecting...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            showAuthError(data.message || 'Signup failed. Please try again.');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAuthError('Network error. Please check your connection and try again.');
    } finally {
        signupBtn.innerHTML = originalText;
        signupBtn.disabled = false;
    }
}

// ===== UI FUNCTIONS =====
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('authTitle').textContent = 'Welcome Back';
    document.getElementById('authSubtitle').textContent = 'Track your water consumption journey';
    // Clear any error messages
    clearAuthError();
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('authTitle').textContent = 'Create Account';
    document.getElementById('authSubtitle').textContent = 'Start tracking your water usage today';
    // Clear any error messages
    clearAuthError();
}

function showAuthError(message) {
    // Remove any existing error messages
    clearAuthError();
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Insert at the top of the active form
    const activeForm = document.querySelector('.auth-form:not([style*="display: none"])');
    if (activeForm) {
        activeForm.insertBefore(errorDiv, activeForm.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

function showAuthSuccess(message) {
    // Remove any existing messages
    clearAuthError();
    
    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'auth-success';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    // Insert at the top of the active form
    const activeForm = document.querySelector('.auth-form:not([style*="display: none"])');
    if (activeForm) {
        activeForm.insertBefore(successDiv, activeForm.firstChild);
    }
}

function clearAuthError() {
    const existingErrors = document.querySelectorAll('.auth-error, .auth-success');
    existingErrors.forEach(error => error.remove());
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    // Signup button
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.addEventListener('click', handleSignup);
    }
    
    // Show signup form button
    const showSignupBtn = document.getElementById('showSignupBtn');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', showSignup);
    }
    
    // Show login form button
    const showLoginBtn = document.getElementById('showLoginBtn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', showLogin);
    }
    
    // Handle Enter key press
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    const signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSignup();
            }
        });
    }
});

// Add these styles to your CSS
const style = document.createElement('style');
style.textContent = `
    .auth-error {
        background: rgba(239, 68, 68, 0.2);
        border-left: 4px solid #ef4444;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #ef4444;
        font-size: 0.9rem;
        animation: slideIn 0.3s ease-out;
    }
    
    .auth-success {
        background: rgba(16, 185, 129, 0.2);
        border-left: 4px solid #10b981;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #10b981;
        font-size: 0.9rem;
        animation: slideIn 0.3s ease-out;
    }
    
    .btn-primary:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
    
    .link-btn {
        background: none;
        border: none;
        color: var(--primary);
        cursor: pointer;
        font-weight: 600;
        margin-left: 0.25rem;
        transition: var(--transition);
    }
    
    .link-btn:hover {
        color: var(--primary-dark);
        text-decoration: underline;
    }
`;
document.head.appendChild(style);

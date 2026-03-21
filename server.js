const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// Debug - Check if frontend folder exists
const frontendPath = path.join(__dirname, 'frontend');
console.log('🔍 Checking frontend folder at:', frontendPath);
console.log('📁 Frontend folder exists:', fs.existsSync(frontendPath));

if (fs.existsSync(frontendPath)) {
  console.log('📄 Files in frontend:', fs.readdirSync(frontendPath));
} else {
  console.log('❌ frontend folder not found! Creating it...');
  fs.mkdirSync(frontendPath, { recursive: true });
  console.log('✅ Created frontend folder');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend folder
app.use(express.static(frontendPath));

// API Routes
const authRoutes = require('./routes/auth');
const waterRoutes = require('./routes/water');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/auth', authRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route - serve index.html
app.get('/', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found. Please ensure frontend/index.html exists.');
  }
});

// Dashboard route
app.get('/dashboard.html', (req, res) => {
  const dashboardPath = path.join(frontendPath, 'dashboard.html');
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.status(404).send('dashboard.html not found');
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: err.message });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, dailyLimit: user.dailyLimit }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, dailyLimit: user.dailyLimit }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      dailyLimit: req.user.dailyLimit,
      badges: req.user.badges || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
// Add this to ensure consistent response format
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dailyLimit: user.dailyLimit,
        badges: user.badges || []
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }
    
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dailyLimit: user.dailyLimit,
        badges: user.badges || []
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
});
// In routes/auth.js - Update limit endpoint
router.put('/limit', protect, async (req, res) => {
    try {
        const { dailyLimit } = req.body;
        
        if (!dailyLimit || dailyLimit < 0.5 || dailyLimit > 10) {
            return res.status(400).json({ 
                success: false,
                message: 'Limit must be between 0.5 and 10 liters' 
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { dailyLimit },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Daily limit updated successfully',
            dailyLimit: user.dailyLimit
        });
    } catch (error) {
        console.error('Update limit error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error. Please try again.' 
        });
    }
});

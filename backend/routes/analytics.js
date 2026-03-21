const express = require('express');
const WaterEntry = require('../models/WaterEntry');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get daily analytics
// @route   GET /api/analytics/daily
router.get('/daily', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const entries = await WaterEntry.find({
      user: req.user.id,
      date: { $gte: today, $lt: tomorrow },
    });
    
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    
    res.json({
      success: true,
      total,
      entries,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get weekly analytics
// @route   GET /api/analytics/weekly
router.get('/weekly', protect, async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    const entries = await WaterEntry.find({
      user: req.user.id,
      date: { $gte: startOfWeek, $lt: endOfWeek },
    }).sort({ date: 1 });
    
    const dailyData = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dailyData[date.toDateString()] = 0;
    }
    
    entries.forEach(entry => {
      const dateStr = entry.date.toDateString();
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr] += entry.amount;
      }
    });
    
    const labels = Object.keys(dailyData);
    const values = Object.values(dailyData);
    
    res.json({
      success: true,
      labels,
      values,
      entries,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get monthly analytics
// @route   GET /api/analytics/monthly
router.get('/monthly', protect, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const entries = await WaterEntry.find({
      user: req.user.id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: 1 });
    
    const daysInMonth = endOfMonth.getDate();
    const dailyTotals = Array(daysInMonth).fill(0);
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    entries.forEach(entry => {
      const day = entry.date.getDate() - 1;
      dailyTotals[day] += entry.amount;
    });
    
    const totalMonth = dailyTotals.reduce((sum, val) => sum + val, 0);
    const averageDaily = totalMonth / daysInMonth;
    
    res.json({
      success: true,
      labels,
      values: dailyTotals,
      totalMonth,
      averageDaily,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get insights and tips
// @route   GET /api/analytics/insights
router.get('/insights', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEntries = await WaterEntry.find({
      user: req.user.id,
      date: { $gte: today },
    });
    
    const todayTotal = todayEntries.reduce((sum, e) => sum + e.amount, 0);
    const exceeded = todayTotal > user.dailyLimit;
    
    const tips = [
      "🚿 Take shorter showers (5 minutes saves up to 20L)",
      "💧 Fix leaky faucets immediately",
      "🌱 Water plants in the morning or evening",
      "🧺 Run full loads in washing machine",
      "🚰 Use a water-efficient dishwasher",
      "💦 Collect rainwater for gardening",
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    
    res.json({
      success: true,
      todayTotal,
      dailyLimit: user.dailyLimit,
      exceeded,
      tip: randomTip,
      remaining: Math.max(0, user.dailyLimit - todayTotal),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

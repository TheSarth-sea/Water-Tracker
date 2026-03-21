const express = require('express');
const WaterEntry = require('../models/WaterEntry');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

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
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

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

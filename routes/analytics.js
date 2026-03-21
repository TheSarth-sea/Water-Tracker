const express = require('express');
const WaterEntry = require('../models/WaterEntry');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/insights', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEntries = await WaterEntry.find({ user: req.user.id, date: { $gte: today } });
    const todayTotal = todayEntries.reduce((sum, e) => sum + e.amount, 0);
    const exceeded = todayTotal > user.dailyLimit;
    const tips = ["🚿 Take shorter showers", "💧 Fix leaky faucets", "🌱 Water plants in morning", "🧺 Run full loads"];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    res.json({ success: true, todayTotal, dailyLimit: user.dailyLimit, exceeded, tip: randomTip, remaining: Math.max(0, user.dailyLimit - todayTotal) });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

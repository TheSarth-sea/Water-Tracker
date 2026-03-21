const express = require('express');
const WaterEntry = require('../models/WaterEntry');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Add water entry
// @route   POST /api/water
router.post('/', protect, async (req, res) => {
  try {
    const { amount, date, notes } = req.body;
    
    const entry = await WaterEntry.create({
      user: req.user.id,
      amount,
      date: date || new Date(),
      notes,
    });

    // Check for achievements
    await checkAchievements(req.user.id);

    res.status(201).json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all water entries for a user
// @route   GET /api/water
router.get('/', protect, async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    let query = { user: req.user.id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const entries = await WaterEntry.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      entries,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update water entry
// @route   PUT /api/water/:id
router.put('/:id', protect, async (req, res) => {
  try {
    let entry = await WaterEntry.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    
    // Make sure user owns entry
    if (entry.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    entry = await WaterEntry.findByIdAndUpdate(
      req.params.id,
      { amount: req.body.amount, notes: req.body.notes },
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete water entry
// @route   DELETE /api/water/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const entry = await WaterEntry.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    
    if (entry.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    await entry.deleteOne();
    
    res.json({
      success: true,
      message: 'Entry removed',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to check and award badges
async function checkAchievements(userId) {
  const user = await User.findById(userId);
  const entries = await WaterEntry.find({ user: userId });
  
  const totalWater = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const uniqueDays = new Set(entries.map(e => e.date.toDateString())).size;
  
  const newBadges = [...user.badges];
  
  if (totalWater >= 100 && !newBadges.includes('WaterSaver')) {
    newBadges.push('WaterSaver');
  }
  
  if (uniqueDays >= 7 && !newBadges.includes('WeekWarrior')) {
    newBadges.push('WeekWarrior');
  }
  
  if (totalWater >= 50 && !newBadges.includes('HydrationHero')) {
    newBadges.push('HydrationHero');
  }
  
  if (uniqueDays >= 30 && !newBadges.includes('ConsistencyKing')) {
    newBadges.push('ConsistencyKing');
  }
  
  if (newBadges.length > user.badges.length) {
    await User.findByIdAndUpdate(userId, { badges: newBadges });
  }
}

module.exports = router;

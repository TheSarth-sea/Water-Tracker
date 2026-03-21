const express = require('express');
const WaterEntry = require('../models/WaterEntry');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    const { amount, date, notes } = req.body;
    const entry = await WaterEntry.create({ user: req.user.id, amount, date: date || new Date(), notes });
    res.status(201).json({ success: true, entry });
  } catch (error) {
    console.error('Add water error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const entries = await WaterEntry.find({ user: req.user.id }).sort({ date: -1 });
    res.json({ success: true, entries });
  } catch (error) {
    console.error('Get water error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const entry = await WaterEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (entry.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });
    await entry.deleteOne();
    res.json({ success: true, message: 'Entry removed' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

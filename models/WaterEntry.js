const mongoose = require('mongoose');

const WaterEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please add water amount'],
    min: [0.1, 'Amount must be at least 0.1 liters'],
    max: [10, 'Amount cannot exceed 10 liters per entry'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot be more than 200 characters'],
  },
});

module.exports = mongoose.model('WaterEntry', WaterEntrySchema);

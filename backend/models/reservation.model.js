const mongoose = require('mongoose');

const reservationItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const reservationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [reservationItemSchema],
  // TTL anchor; document will auto-delete when this time passes
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

// TTL index: delete when expiresAt <= now; 0 means delete immediately at expiresAt
reservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Reservation', reservationSchema);
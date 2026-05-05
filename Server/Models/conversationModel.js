const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: { validator: (v) => v.length === 2, message: 'A conversation must have exactly 2 participants' },
    },
    // Sorted "<idA>_<idB>" key — uniquely identifies one conversation per pair.
    // sparse: true so old documents without this field are not checked.
    pairKey: { type: String, default: null },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    lastMessageAt: { type: Date, default: null },
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

// Unique per pair — sparse so legacy docs without pairKey are excluded.
conversationSchema.index({ pairKey: 1 }, { unique: true, sparse: true });
// Query-performance index (participants list sorted by activity).
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
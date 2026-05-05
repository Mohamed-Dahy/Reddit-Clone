const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema(
  {
    community:   { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    invitedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',      required: true },
    invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User',      required: true },
    status:      { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

// One invite record per user per community (upserted on re-invite)
inviteSchema.index({ community: 1, invitedUser: 1 }, { unique: true });
inviteSchema.index({ invitedUser: 1, status: 1 });

module.exports = mongoose.model('CommunityInvite', inviteSchema);

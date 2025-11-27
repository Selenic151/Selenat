const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    }, 
    type: {
        type: String,
        enum: ['group', 'private'],
        default: 'group'
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }], 
    Admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    avartar: {
        type: String,
        default: 'default-room.png'
    }
}, { timestamps: true });
module.exports = mongoose.model("Room", UserSchema);
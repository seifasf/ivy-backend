const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true, 
        match: /^\S+@\S+\.\S+$/ 
    },
    phone: {
        type: String,
        required: true 
    },
    comment: {
        type: String,
        required: true
    },
    status : {
       type : String,
       enum: ['Pending', 'Active'],
       default : "Pending",
    }
}, { timestamps: true });

module.exports = mongoose.model('Business', BusinessSchema);

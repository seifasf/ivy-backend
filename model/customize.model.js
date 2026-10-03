const mongoose = require('mongoose');

const customizeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        type: [String],
        required: true
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
       enum: ['Pending', 'Active'], //  enum for validation
       default : "Pending",
    }
}, { timestamps: true }); 

module.exports = mongoose.model('customize', customizeSchema);

const {model, Schema} = require('mongoose');

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,            // creates a unique index
        lowercase: true,
        trim: true,
        match: [
            /^\S+@\S+\.\S+$/,
            'Please use a valid email address',
        ],
        },
    age: {
        type: Number,
        min: [0, 'Age must be >= 0'],
        },
    city: {
        type: String,
        trim: true,
        default: 'Portmore',     // example default
        },
    },
  { timestamps: true }         // adds createdAt/updatedAt
);





module.exports = model('User', userSchema);
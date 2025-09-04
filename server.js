const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/user');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, 'config', '.env') });

const app = express();

app.use(express.json());

// Health check and DB availability guard
const isDatabaseConnected = () => mongoose.connection.readyState === 1; // 1 = connected

app.get('/health', (req, res) => {
    res.status(200).json({
        server: 'ok',
        database: isDatabaseConnected() ? 'connected' : 'disconnected',
    });
});

// Require DB connection for API routes that use MongoDB
app.use('/api', (req, res, next) => {
    if (!isDatabaseConnected()) {
        return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }
    next();
});

// Connect to MongoDB   
const { PORT=3000 } = process.env;
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoUri || typeof mongoUri !== 'string' || mongoUri.trim().length === 0) {
    console.error('✗ MongoDB connection error: missing MONGO_URI (or MONGODB_URI).');
    process.exit(1);
}

const connectWithRetry = () => {
    mongoose
        .connect(mongoUri)
        .then(() => console.log('✓ Connected to MongoDB'))
        .catch((err) => {
            console.error('✗ MongoDB connection error:', err.message, '\n↻ Retrying in 5s...');
            setTimeout(connectWithRetry, 5000);
        });
};

connectWithRetry();

// GET: RETURN ALL USERS
app.get('/api/users', async (req, res, next) => {
    try {
        const users = await User.find(); // fetch all docs
        res.status(200).json(users);
    } catch (err) {
        next(err);
    }
});

// POST: ADD A NEW USER TO THE DATABASE
app.post('/api/users', async (req, res, next) => {
    try {
        // req.body should contain { name, email, age?, city? }
        const created = await User.create(req.body);
        res.status(201).json(created);
    } catch (err) {
        next(err);
    }
});

// PUT: EDIT A USER BY ID
app.put('/api/users/:id', async (req, res, next) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,     
            req.body,          
            { new: true }      
        );
        
            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }
        
            res.json(updatedUser);
            } catch (error) {
            res.status(500).json({ message: error.message });
    }
});

// DELETE: REMOVE A USER BY ID
app.delete('/api/users/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const deleted = await User.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({ message: 'User deleted', id: deleted._id });
    } catch (err) {
        next(err);
    }
});

// middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
        message: 'Validation error',
        details: err.errors,
        });
    }

    // Bad ObjectId
    if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    // Duplicate key error (e.g., unique email)
    if (err.code === 11000) {
        return res.status(409).json({ message: 'Duplicate key', keyValue: err.keyValue });
    }

    res.status(500).json({ message: 'Server error' });
});

// 6) Start the server
app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
});

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AdminModel = require('../models/adminModel');

exports.register = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existingAdmin = await AdminModel.findByEmail(email);
        if (existingAdmin) {
            return res.status(400).json({ error: 'Admin already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await AdminModel.create(email, hashedPassword);

        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const admin = await AdminModel.findByEmail(email);
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        res.json({ message: 'Login successful', token });
    } catch (error) {
        next(error);
    }
};

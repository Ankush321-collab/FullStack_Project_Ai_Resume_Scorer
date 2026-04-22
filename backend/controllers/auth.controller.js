"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var _index = require('../models/index');
var _bcryptjs = require('bcryptjs'); var _bcryptjs2 = _interopRequireDefault(_bcryptjs);
var _jsonwebtoken = require('jsonwebtoken'); var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key";

 const me = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const user = await _index.User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const resumes = await _index.Resume.find({ userId: user._id });
    
    res.json({
      ...user.toObject(),
      id: user._id,
      resumes: resumes.map((r) => ({ 
        ...r.toObject(), 
        id: r._id.toString(), 
        skills: [], 
        matchResults: [], 
        createdAt: (r.createdAt || new Date()).toISOString() 
      })),
      createdAt: (user.createdAt || new Date()).toISOString(),
    });
  } catch (error) {
    console.error("Auth Me Error:", error);
    res.status(500).json({ error: error.message });
  }
}; exports.me = me;

 const signUp = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const existingUser = await _index.User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await _bcryptjs2.default.hash(password, 10);
    const user = await _index.User.create({
      email,
      name,
      password: hashedPassword
    });

    const token = _jsonwebtoken2.default.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        resumes: [],
        createdAt: (user.createdAt || new Date()).toISOString(),
      },
    });
  } catch (error) {
    console.error("Sign-up Error:", error);
    res.status(500).json({ error: error.message });
  }
}; exports.signUp = signUp;

 const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const user = await _index.User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await _bcryptjs2.default.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = _jsonwebtoken2.default.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        resumes: [],
        createdAt: (user.createdAt || new Date()).toISOString(),
      },
    });
  } catch (error) {
    console.error("Sign-in Error:", error);
    res.status(500).json({ error: error.message });
  }
}; exports.signIn = signIn;

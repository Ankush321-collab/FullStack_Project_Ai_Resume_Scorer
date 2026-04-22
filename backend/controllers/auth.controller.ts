import { Request, Response } from "express";
import { User, Resume } from "../models/index";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key";

export const me = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const resumes = await Resume.find({ userId: user._id });
    
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
  } catch (error: any) {
    console.error("Auth Me Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const signUp = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      name,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
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
  } catch (error: any) {
    console.error("Sign-up Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
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
  } catch (error: any) {
    console.error("Sign-in Error:", error);
    res.status(500).json({ error: error.message });
  }
};

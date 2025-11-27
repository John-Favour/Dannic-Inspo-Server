import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import followModel from "../models/follow.model.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateToken } from "../utils/generateToken.js";

export const registerUser = async (req, res) => {
  const { username, displayName, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(409).json({ message: "Email Already Registered" });
  }

  const tokenCode = generateToken();
  const expiry = new Date(Date.now() + 3600000); // 1 hour from now
  console.log("codsss", tokenCode);

  const newHashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    displayName,
    email,
    hashedPassword: newHashedPassword,
    emailToken: tokenCode,
    emailTokenExpires: expiry,
  });

  await sendEmail(
    email,
    "Verify your email",
    ` <p>Your verification code is <b>${tokenCode}</b>. It expires in an hour</p>`
  );

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
//   res.cookie("token", token, {
//   httpOnly: true,
//   secure: false,
//   sameSite: "lax",
//   maxAge: 30 * 24 * 60 * 60 * 1000,
// });


  const { hashedPassword, ...detailsWithoutPassword } = user.toObject();

  res.status(200).json(detailsWithoutPassword);
};

// verify email controls
export const verifyEmail = async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ message: "Email and token are required" });
  }

  const user = await User.findOne({ email });
  console.log(user, "This user");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  console.log("user given token", req.body.token);
  console.log("user stored token", user.emailToken);
  if (user.emailToken != req.body.token) {
    return res.status(400).json({ message: "Invalid verification code" });
  }
  if (!user || new Date(user.emailTokenExpires) < new Date()) {
    return res.status(400).json({ message: " Expired token" });
  }

  user.isVerified = true;
  user.emailToken = undefined;
  user.emailTokenExpires = undefined;
  await user.save();

  res.status(200).json({ message: "Email verified successfully" });
};

export const getUser = async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username });
  const { hashedPassword, ...detailsWithoutPassword } = user.toObject();

  const followCount = await followModel.countDocuments({ following: user._id });
  const followingCount = await followModel.countDocuments({
    follow: user._id,
  });

  const token = req.cookies.token;
  if (!token) {
    res.status(200).json({
      ...detailsWithoutPassword,
      followCount,
      followingCount,
      isFollowing: false,
    });
  } else {
    jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
      if (!err) {
        const isFound = await followModel.exists({
          follow: payload.userId,
          following: user._id,
        });
        res.status(200).json({
          ...detailsWithoutPassword,
          followCount,
          followingCount,
          isFollowing: isFound ? true : false,
        });
      }
    });
  }
};

// login controls
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "All Fields are required" });
  }
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Email not registered" });
  }
  if (!user.isVerified) {
    return res
      .status(403)
      .json({ message: "Please verify your email to login." });
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.hashedPassword);
  if (!isPasswordCorrect) {
    return res.status(401).json({ message: "Incorrect password" });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
// res.cookie("token", token, {
//   httpOnly: true,
//   secure: false,           // allow over HTTP for local dev
//   // sameSite: "None",        // allow cross-origin cookies
//   maxAge: 30 * 24 * 60 * 60 * 1000,
// });


  const { hashedPassword, ...detailsWithoutPassword } = user.toObject();

  res.status(201).json(detailsWithoutPassword);
  console.log(token);
};

// logout controls
export const logoutUser = async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logout Successful" });
};

export const followUser = async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username });
  const isFollowing = await followModel.exists({
    follow: req.userId,
    following: user._id,
  });

  if (isFollowing) {
    await followModel.deleteOne({
      follow: req.userId,
      following: user._id,
    });
  } else {
    await followModel.create({
      follow: req.userId,
      following: user._id,
    });
  }
  res.status(200).json({ message: "Successful" });
};

// export const about = async (req, res) => {
//   res.status(200).json({ message: "This is the about endpoint of the User API." });
// } 
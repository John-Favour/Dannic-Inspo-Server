import express from "express";
import { getUser , registerUser,loginUser,logoutUser,followUser,verifyEmail} from "../controllers/user.controller.js";
import User from "../models/user.model.js";
import bcrypt from "bcrypt"
import verifyToken from "../middlewares/verifyToken.js";


const router = express.Router();
router.get("/:username",getUser)
// router.get("/about",about)
router.post("/auth/register",registerUser)
router.post("/auth/login",loginUser)
router.post("/auth/logout",logoutUser)
router.post("/verify-email",verifyEmail)
router.post("/follow/:username",verifyToken,followUser)


export default router


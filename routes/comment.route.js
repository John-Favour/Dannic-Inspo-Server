import express from "express";
import { getcomments,addComments } from "../controllers/comment.controller.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = express.Router();

router.get("/:postId",getcomments)
router.post("/",verifyToken,addComments)


export default router
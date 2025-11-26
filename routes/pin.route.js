import express from "express";
import {
  getPins,
  getPin,
  createPin,
  interactionCheck,
  interact,
  getSavedPins,
  deletePIn,
} from "../controllers/pin.controller.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = express.Router();
router.get("/", getPins);
router.get("/:id", getPin);
router.post("/", verifyToken, createPin);
router.get("/interaction-check/:id", interactionCheck);
router.post("/interact/:id", verifyToken, interact);
router.delete("/delete/:id", verifyToken, deletePIn);
router.get("/saved/:userId",verifyToken, getSavedPins);


export default router;

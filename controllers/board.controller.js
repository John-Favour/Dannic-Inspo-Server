import mongoose from "mongoose";
import Board from "../models/board.model.js";
import Pin from "../models/pin.model.js";

export const getUserBoards = async (req, res) => {
  const { userId } = req.params;

  // Optional but recommended: Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const boards = await Board.find({ user: userId });

    const boardsWithPinDetails = await Promise.all(
      boards.map(async (board) => {
        const pinCount = await Pin.countDocuments({ board: board._id });
        const firstPin = await Pin.findOne({ board: board._id });

        return {
          ...board.toObject(),
          pinCount,
          firstPin,
        };
        // console.log(boards);
        
      })
    );

    res.status(200).json(boardsWithPinDetails);
  } catch (error) {
    console.error("Error fetching user boards:", error.message);
    res.status(500).json({ message: "Server error while fetching boards" });
  }
};

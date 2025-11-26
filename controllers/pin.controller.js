import Pin from "../models/pin.model.js";
import User from "../models/user.model.js";
import Like from "../models/like.model.js";
import Save from "../models/save.model.js";
import Board from "../models/board.model.js";
import sharp from "sharp";
import Imagekit from "imagekit";
import jwt from "jsonwebtoken";

export const getPins = async (req, res) => {
  const pageNumber = Number(req.query.cursor) || 0;
  const search = req.query.search;
  const userId = req.query.userId;
  const boardId = req.query.boardId;
  const LIMIT = 21;

  const pins = await Pin.find(
    search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { tags: { $in: [search] } },
          ],
        }
      : userId
      ? { user: userId }
      : boardId
      ? { board: boardId }
      : {}
  )
    .limit(LIMIT)
    .skip(pageNumber * LIMIT);

  const hasNextPage = pins.length === LIMIT;

  // await new Promise((resolve) => setTimeout(resolve, 3000));

  res
    .status(200)
    .json({ pins, nextCursor: hasNextPage ? pageNumber + 1 : null });
};

export const getPin = async (req, res) => {
  const { id } = req.params;
  const pin = await Pin.findById(id).populate(
    "user",
    "username img displayName"
  );

  // console.log(pin);
  res.status(200).json(pin);
};


export const createPin = async (req, res) => {
  try {
    const {
      title,
      description,
      link,
      board,
      tags,
      textOptions,
      canvasOptions,
      newBoard,
    } = req.body;

    const media = req.files?.media;

    // ✅ Validate required fields
    if (!title || !description || !media) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const parsedTextOptions = JSON.parse(textOptions || "{}");
    const parsedCanvasOptions = JSON.parse(canvasOptions || "{}");

    const metadata = await sharp(media.data).metadata();

    const originalOrientation =
      metadata.width < metadata.height ? "portrait" : "landscape";
    const originalAspectRatio = metadata.width / metadata.height;

    const MAX_WIDTH = 1080;
    const MAX_HEIGHT = 1920;

    let clientAspectRatio, width, height;

    if (parsedCanvasOptions.size !== "original") {
      const [wRatio, hRatio] = parsedCanvasOptions.size.split(":").map(Number);
      clientAspectRatio = wRatio / hRatio;

      if (originalAspectRatio > clientAspectRatio) {
        width = Math.min(metadata.width, MAX_WIDTH);
        height = Math.round(width / clientAspectRatio);
      } else {
        height = Math.min(metadata.height, MAX_HEIGHT);
        width = Math.round(height * clientAspectRatio);
      }
    } else {
      width = metadata.width;
      height = metadata.height;
      clientAspectRatio = originalAspectRatio;
    }

    const imagekit = new Imagekit({
      publicKey: process.env.IK_PUBLIC_KEY,
      privateKey: process.env.IK_PRIVATE_KEY,
      urlEndpoint: process.env.IK_URL_ENDPOINT,
    });

    const textLeftPosition = Math.round((parsedTextOptions.left * width) / 375);
    const textTopPosition = Math.round(
      (parsedTextOptions.top * height) / parsedCanvasOptions.height
    );

    let croppingStrategy = "";

    if (parsedCanvasOptions.size !== "original") {
      if (originalAspectRatio > clientAspectRatio) {
        croppingStrategy = ",cm-pad_resize";
      }
    } else {
      if (
        originalOrientation === "landscape" &&
        parsedCanvasOptions.orientation === "portrait"
      ) {
        croppingStrategy = ",cm-pad_resize";
      }
    }

    const transformationString = `w-${width},h-${height}${croppingStrategy},bg-${parsedCanvasOptions.backgroundColor?.substring(
      1
    )}${
      parsedTextOptions.text
        ? `,l-text,i-${parsedTextOptions.text},fs-${
            parsedTextOptions.fontSize * 2.1
          },lx-${textLeftPosition},ly-${textTopPosition},co-${parsedTextOptions.color?.substring(
            1
          )},l-end`
        : ""
    }`;

    const uploadResponse = await imagekit.upload({
      file: media.data,
      fileName: media.name,
      folder: "PinsStore",
      transformation: { pre: transformationString },
      transformationPosition: "query",
    });
   

    // ✅ Handle new board creation if needed
    let newBoardId;
    if (newBoard) {
      const createdBoard = await Board.create({
        title: newBoard,
        user: req.userId,
      });
      newBoardId = createdBoard._id;
    }

    const newPin = await Pin.create({
      user: req.userId,
      title,
      description,
      link: link || null,
      board: newBoardId || board || null,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      media: uploadResponse.url,
      width: uploadResponse.width,
      height: uploadResponse.height,
    });

    return res.status(201).json(newPin);
  } catch (err) {
    console.error("Pin creation failed:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};



export const interactionCheck = async (req, res) => {
  const { id } = req.params;
  const token = req.cookies.token;

  const likeCount = await Like.countDocuments({ pin: id });

  if (!token) {
    return res.status(200).json({ likeCount, isLiked: false, isSaved: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      return res
        .status(200)
        .json({ likeCount, isLiked: false, isSaved: false });
    }

    const userId = payload.userId;

    const isLiked = await Like.findOne({
      user: userId,
      pin: id,
    });
    const isSaved = await Save.findOne({
      user: userId,
      pin: id,
    });

    return res.status(200).json({
      likeCount,
      isLiked: isLiked ? true : false,
      isSaved: isSaved ? true : false,
    });
  });
};

export const interact = async (req, res) => {
  const { id } = req.params;

  const { type } = req.body;

  if (type === "like") {
    const isLiked = await Like.findOne({
      pin: id,
      user: req.userId,
    });

    if (isLiked) {
      await Like.deleteOne({
        pin: id,
        user: req.userId,
      });
    } else {
      await Like.create({
        pin: id,
        user: req.userId,
      });
    }
  } else {
    const isSaved = await Save.findOne({
      pin: id,
      user: req.userId,
    });

    if (isSaved) {
      await Save.deleteOne({
        pin: id,
        user: req.userId,
      });
    } else {
      await Save.create({
        pin: id,
        user: req.userId,
      });
    }
  }

  return res.status(200).json({ message: "Successful" });
};

export const getSavedPins = async (req, res) => {
  const { userId } = req.params;

  const saves = await Save.find({ user: userId }).populate("pin");

  const savedPins = saves.map((save) => save.pin); // Extract just the pins

  res.status(200).json(savedPins);
};



export const deletePIn = async (req, res) => {
  
  const pin = await Pin.findById(req.params.id);
  if (!pin) return res.status(404).json({ message: "Pin not found" });

  if (pin.user.toString() !== req.userId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  await pin.deleteOne();
  res.json({ message: "Pin deleted" });
};

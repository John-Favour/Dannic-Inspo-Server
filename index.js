import express from "express";
// route imports
import userRouter from "./routes/user.route.js";
import pinRouter from "./routes/pin.route.js";
import commentRouter from "./routes/comment.route.js";
import boardRouter from "./routes/board.route.js";
// import DATABASE
import connectDB from "./utils/connectDB.js";
// Import cors
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";

import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(fileUpload());
app.use(cookieParser());
app.use(express.json());

// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "http://127.0.0.1:5173",
//       "http://192.168.118.213:5173"
//     ],
//     credentials: true,
//   })
// );


app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use("/users", userRouter);
app.use("/pins", pinRouter);
app.use("/comments", commentRouter);
app.use("/boards", boardRouter);

app.use((error, req, res, next) => {
  res.status(error.status || 500);

  res.json({
    message: error.message || "Something went wrong!",
    status: error.status,
    stack: error.stack,
  });
});

// app.listen(3000, () => {
//   connectDB();
//   console.log("Server is running on ");
// });
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  connectDB();
  console.log("Server is running on ");
});

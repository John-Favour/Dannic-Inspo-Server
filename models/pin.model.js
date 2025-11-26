import { Schema } from "mongoose";
import mongoose from "mongoose";


const pinSchema = new Schema({
    media:{
        type: String,
        required: true,
    },
    width:{
        type: Number,
        required: true,
    },
    height:{
        type: Number,
        required: true,
    },
    tags:{
        type: [String],
    },
    title:{
        type: String,
        required: true,
    },
    board:{
        type: Schema.Types.ObjectId,
        ref:"Board"
    },
    user:{
        type: Schema.Types.ObjectId,
        ref:"User",
        required: true
    },
    description:{
        type: String,
        required: true,
    },
},{timestamps: true}
);

export default mongoose.model("Pin",pinSchema);
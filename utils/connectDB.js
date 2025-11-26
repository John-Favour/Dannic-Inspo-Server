import mongoose from "mongoose";
    // "dev": "node --watch --env-file=.env index.js"

const connectDB = async ()=>{
    try {
    await mongoose.connect(process.env.MONGO_URL, {
    });
        console.log("✅ MongoDB Atlas connected");

        
    } catch (error) {
        console.log("ATLAS CONNECTION ERROR", error);
        
    }
}

// W99l3wdBNZX51MP
export default connectDB;
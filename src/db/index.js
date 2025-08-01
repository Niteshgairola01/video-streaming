import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.DATABASE_URI}/${DB_NAME}`);
        console.log(`\n DB connected ! ! ! DB HOST: ${connectionInstance.connection.host}`);
    } catch (err) {
        console.log("Error connecting DB ! ! !", err);
        process.exit(1);
    };
};

export default connectDB;
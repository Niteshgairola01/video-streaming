import dotenv from 'dotenv';
import connectDB from "./db/index.js";
import app from './app.js';

dotenv.config({
    path: "./env"
});

const port = process.env.PORT || 8000;

connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Sever is running at port : ${port}`);
    });

    app.on("error", (err) => {
        console.log("Error", err);
    });
}).catch(err => {
    console.log("Error connecting DB ! ! !", err);

})
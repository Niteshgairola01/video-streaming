import { asyncHandler } from "../utils/asyncHandler.js";

export const registerUser = asyncHandler(async (req, res) => {
    res.status(500).json({
        message: "chai aur code"
    })
});
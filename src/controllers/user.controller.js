import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const registerUser = asyncHandler(async (req, res) => {

    // get user details
    // validation - not empty
    // check if user already exists: username, email
    // check of images, check for avatat
    // upload them to cloudinary
    // create user object: create entry in DB
    // remove password and refresh token fields form response
    // check of user creation
    // return res


    // 1. get user details
    const { username, email, fullName, password } = req.body;

    // 2. validate required fileds
    if ([username, email, fullName, password].some(field => !field || field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    };

    // 3. check if user exists already
    const userExistsAlready = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (userExistsAlready) {
        throw new ApiError(409, "username or email already exists")
    };

    // 4. Check for avatar and cover image
    const avatarLocalPath = req.files?.avatar[0].path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    };

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    };

    // 5. Upload images to clodinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    };


    // 6. Create user entry in DB
    const user = await User.create({
        username,
        email,
        fullName,
        avatar: avatar?.url,
        coverImage: coverImage?.url || "",
        password
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registring the user");
    };
    
    return res.status(202).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
}); 
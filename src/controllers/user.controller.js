import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Someting went wrong while generating access and refresh token");
    };
};

const registerUser = asyncHandler(async (req, res) => {

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


const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // check email
    // find the user
    // check for password
    // generate access and refres token
    // send cookie

    const { email, password } = req.body;
    if (!(email && password)) {
        throw new ApiError(400, "email and password required");
    };

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "No user with the email found")
    };

    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(409, "Invalid password credential")
    };

    // generate access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // send cookies
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken
        }))
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.body.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", options)
        .cookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

export {
    registerUser,
    loginUser,
    logoutUser
};
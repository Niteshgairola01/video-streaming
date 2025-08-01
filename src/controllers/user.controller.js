import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    };

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        };

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        };

        const options = {
            httpOnly: true,
            secure: true
        };

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    };
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    };

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old passowrd does not match");
    };

    if (!newPassword || !confirmPassword) {
        throw new ApiError(400, "New password and Confirm passowrd are required");
    };

    if (newPassword !== confirmPassword) {
        throw new ApiError(400, "New password does not match to confirm password");
    };

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password updated Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(404, "User not found");
    };

    return res.status(200).json(new ApiResponse(200, req.user, "Current User"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName && !email) {
        throw new ApiError(400, "Please provide full name or password");
    };

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName, email
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "User updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const localPath = req.file?.path;
    if (!localPath) {
        throw new ApiError(400, "Avatar file is required");
    };

    const uploadedFile = await uploadOnCloudinary(localPath);
    if (!uploadedFile?.url) {
        throw new ApiError(400, "Unable to upload file");
    };

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: uploadedFile?.url
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const localPath = req.file?.path;
    if (!localPath) {
        throw new ApiError(400, "Cover image not found");
    };

    const coverImage = await uploadOnCloudinary(localPath);
    if (!coverImage) {
        throw new ApiError(400, "Unable to update the cover image");
    };

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage?.url
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(404, "User not found");
    };

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist");
    };

    return res.status(200).json(new ApiResponse(200, channel[0], "User channel fetched successfully"));
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
};
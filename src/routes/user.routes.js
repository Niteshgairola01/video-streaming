
import express from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route('/register').post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser
);

router.route('/login').post(loginUser);

// Secure Routes
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/refreshAccessToken').post(refreshAccessToken);
router.route('/changeCurrentPassword').put(verifyJWT, changeCurrentPassword);
router.route('/getCurrentUser').get(verifyJWT, getCurrentUser);
router.route('/updateAccountDetails').put(verifyJWT, updateAccountDetails);
router.route('/updateUserAvatar').put(
    verifyJWT,
    upload.single('avatar'),
    updateUserAvatar
);

router.route('/updateUserCoverImage').put(
    verifyJWT,
    upload.single('coverImage'),
    updateUserCoverImage
);

router.route('/getUserChannelProfile/:username').get(verifyJWT, getUserChannelProfile);

export default router;

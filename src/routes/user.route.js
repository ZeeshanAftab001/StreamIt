import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser,updateUserPassword,getCurrentUser,updateUser,updateAvatar, updateCoverImage,getUserChannelProfile,getWatchHistory,getUserVideos} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const route=Router()

route.route("/register").post(
    upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]),
    registerUser)
route.route("/login").post(loginUser)
route.route("/logout").post(verifyJWT,logoutUser)
route.route("/refresh").post(refreshAccessToken)
route.route("/change-password").post(verifyJWT,updateUserPassword)
route.route("/current-user").post(verifyJWT,getCurrentUser)
route.route("/update-user").patch(verifyJWT,updateUser)
route.route("/update-avatar").patch(upload.single("avatar"),verifyJWT,updateAvatar)
route.route("/update-cover").patch(upload.single("coverImage"),verifyJWT,updateCoverImage)
route.route("/channel/:username").get(verifyJWT,getUserChannelProfile)
route.route("/history").get(verifyJWT,getWatchHistory)
route.route("/user-videos").get(verifyJWT,getUserVideos)


export default route
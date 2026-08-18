import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser,updateUserPassword,getCurrentUser,updateUser,updateAvatar } from "../controllers/user.controller.js";
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
route.route("/update-user").post(verifyJWT,updateUser)
route.route("/update-avatar").post(upload.single("avatar"),verifyJWT,updateAvatar)


export default route
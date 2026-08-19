import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"
import { updateVideoMetaData, uploadVideo } from "../controllers/video.controller.js";

const route=Router()


route.route("/upload-video").post(verifyJWT,
    upload.fields([{ name: 'videoFile', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }])
    ,uploadVideo)

route.route("/update-video/:videoId").patch(verifyJWT,updateVideoMetaData)



export default route
import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"
import { updateVideoMetaData, uploadVideo ,updateVideoFile, getAllVideos} from "../controllers/video.controller.js";

const route=Router()


route.route("/upload-video").post(verifyJWT,
    upload.fields([{ name: 'videoFile', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }])
    ,uploadVideo)

route.route("/update-video-metadata/:videoId").patch(verifyJWT,updateVideoMetaData)
route.route("/update-videofile/:videoId").patch(verifyJWT,upload.single("videoFile"),updateVideoFile)

route.route("/videos").get(getAllVideos)



export default route
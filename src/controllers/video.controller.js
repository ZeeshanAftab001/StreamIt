import { APIError } from "../utils/apiError.js";
import {APIResponse} from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {Video} from "../models/video.model.js"
import mongoose from "mongoose";
import { User } from "../models/user.model.js";


const uploadVideo=asyncHandler(async (req,res)=>{

    const {title,description} = req.body

    if([title,description].some((item)=> item.trim() === "")){
        throw new APIError(404,"title and description are required.")
    }
    const videoLocalURL = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalURL = req.files?.thumbnail?.[0]?.path; 

    if(!videoLocalURL || !thumbnailLocalURL ){
        throw new APIError(404,"Please upload a video and a thumbnail.")
    }
    const uploadedVideo=await uploadOnCloudinary(videoLocalURL)
    const uploadedThumbnail=await uploadOnCloudinary(thumbnailLocalURL)

    if(!uploadedVideo){
        throw new APIError("Something went wrong during video upload.")
    }
    const video=await Video.create(
        {
            title : title,
            description : description,
            videoFile : uploadedVideo?.url || " ",
            thumbnail : uploadedThumbnail?.url || " ",
            owner : req.user._id,
            duration : uploadedVideo.duration,
        }
    )

    if(!video){
        throw new APIError(500,"Internal Server Error.")
    }

    res
    .status(201)
    .json(new APIResponse(201,"Video Uploaded Successfully.",video))
})

const updateVideoMetaData=asyncHandler(async (req,res)=>{
    const {videoId}=req.params
    const {title,description}=req.body
    if([title,description].some((item)=> item.trim() === "")){
        throw new APIError(404,"title and description are required.")
    }

    const updatedVideo =await Video.findByIdAndUpdate(videoId,{
        title : title,
        description : description
    })

    if(!updatedVideo ){
        throw new APIError(500,"Something went wrong while updating video.")
    }

    res
    .status(200)
    .json(new APIResponse(200,"Video Updated Successfully.",updatedVideo))
})

export {
    uploadVideo,
    updateVideoMetaData,
    
    
}
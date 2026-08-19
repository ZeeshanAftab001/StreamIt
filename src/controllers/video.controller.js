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

    const video=await Video.findById(videoId)

    if(!video){
        throw new APIError(404,"video not found.")
    }
    if (video.owner.toString() !== req.user._id.toString()) {
            throw new APIError(403, "You are not authorized to update this video.");
    }

    video.title=title
    video.description=description
    video.save({validateBeforeSave : false})

    res
    .status(200)
    .json(new APIResponse(200,"Video Updated Successfully.",updatedVideo))
})

const updateVideoFile = asyncHandler(async (req,res)=>{
    
    const {videoId}=req.params
    if(videoId=== ""){
        throw new APIError(404,"Invalid Video Id.");
    }

    const videoFileLocalPath=req.file?.path

    if(!videoFileLocalPath){
        throw new APIError(404,"Please Enter a Video File.")
    }

    try {
        const uploadedVideo=await uploadOnCloudinary(videoFileLocalPath)
        if(!uploadedVideo){
            throw new APIError(501,"Something went wrong during uploading video.")
        }

        const video=await Video.findById(videoId)
        if(!video){
            throw new APIError(404,"video not found.")
        }

        if (video.owner.toString() !== req.user._id.toString()) {
            throw new APIError(403, "You are not authorized to update this video.");
        }

        video.videoFile=uploadedVideo?.url || " "
        video.duration=uploadedVideo?.duration || 0

        await video.save({validateBeforeSave : false})

        res
        .status(200)
        .json(new APIResponse(200,"Video File Updated Successfuly.",video))
 
    } catch (error) {
        throw new APIError(501,error?.message || "something went wrong")
    }
})

const getAllVideos = asyncHandler(async (req,res)=>{
    const videos=await Video.find()
    if(!videos){
        throw new APIError(404,"Videos not found")
    }
    res
    .status(200)
    .json(new APIResponse(200,"Videos Found.",videos))

})

export {
    uploadVideo,
    updateVideoMetaData,
    updateVideoFile,
    getAllVideos
}
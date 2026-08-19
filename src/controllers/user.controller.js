import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/apiError.js"
import {APIResponse} from "../utils/apiResponse.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";


const generateAccessAndResfreshToken = async (userId) =>{

    try {
        const user=await User.findById(userId)
        if(!user){
            throw new APIError("No user found for this userId")
        }
        const accessToken=await user.generateAccessToken()
        const refreshToken=await user.generateRefreshToken()
    
        if(!refreshToken){
            throw new APIError("Their was an error generating tokens.")
        }
        user.refreshToken=refreshToken
        await user.save({ validateBeforeSave: false }); // very important statement
    
    
        return {accessToken,refreshToken}

    } catch (error) {
        throw new APIError(501,message=error?.message || "Something went wrong.")
    }
}

const registerUser = asyncHandler( async (req,res) =>{
    const {username,fullName,email,password}=req.body
    
    if ([username, fullName, email, password].some((field) => field === undefined || field === null || field.trim() === "")) {
    throw new APIError(401, "All fields are required.");
    }

    const existedUser=await User.findOne({
        $or : [{username},{email}]
    })

    if(existedUser){
        throw new APIError(409,"email or username already exists!")
    }
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;   

    if(!avatarLocalPath){
        throw new APIError(404,"Avatar Image not found")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new APIError(404,"Avatar Image not found")
    }

    const user=await User.create({
            username : username.toLowerCase(),
            fullName : fullName,
            email : email,
            password :password,
            avatar : avatar.url,
            coverImage : coverImage?.url || ""
        }
    )

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new APIError(401,"Something went wrong during creation of User!")
    }

    res.status(200).json(
        new APIResponse(201,"User created sucessfully!",createdUser)
    )
})

const loginUser = asyncHandler(async (req,res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Request body is empty'
        });
    }
    const {username,email,password}=req.body
    if(!username && !email){
        throw new APIError(401,"username or email is missing!")
    }
    const user=await User.findOne({
        $or : [{username},{email}]
    })
    if(!user){
        throw new APIError(404,"User not found in the database!")
    }
    const userFound=await user.isPasswordCorrect(password)

    if(!userFound){
        throw new APIError(404,"Incorrect Credentials.")
    }
    
    const {accessToken,refreshToken}=await generateAccessAndResfreshToken(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")


    const options = {
        httpOnly: true,
        secure: true,
    };

    res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new APIResponse(200, "User logged in successfully!", {
                user: loggedInUser,
                accessToken,
                refreshToken
            })
        );
    
})

const logoutUser = asyncHandler(async (req,res) => {

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
        $set : { refreshToken : undefined }},
        { new : true }
    )
    const options = {
        httpOnly: true,
        secure: true,
    };

    res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new APIResponse(200,"User Loggedout.",{}))
})

const refreshAccessToken = asyncHandler(async (req,res) => {
    const incommingRefreshToken=req.cookies?.refreshToken || req.body?.refreshToken
    if(!incommingRefreshToken){
        throw new APIError(401,"unauthorized access.")
    }
    try {
        const decodedToken=await jwt.verify(incommingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        if(!decodedToken){
            throw new APIError(401,"Invalid Refresh Token.")  
        }
        const user=await User.findById(decodedToken._id)
    
        if(!user){
            throw new APIError(401,"Invalid Refresh Token")
        }
    
        const {accessToken,refreshToken}=await generateAccessAndResfreshToken(user._id)
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new APIResponse(201,"Tokens Refresh Successfully.",{"accessToken" : accessToken ,
            "refreshToken" : refreshToken
        }))
    } catch (error) {
        throw new APIError(401,error?.message || "Unauthorized Request.")
    }

})

const updateUserPassword = asyncHandler(async (req,res) => {
    const {oldPassword,newPassword}=req.body
    if(!oldPassword || !newPassword){
        throw new APIError(401,"New or Old Password is missing.")
    }
    const user=await User.findById(req?.user._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new APIError(401,"Incorrect Password.")
    }
    user.password=newPassword
    await user.save({validateBeforeSave : false})

    res
    .status(200)
    .json(new APIResponse(200,"Password Updated Successfully."))
})

const getCurrentUser = asyncHandler(async(req,res) => {
    if(!req.user){
        throw new APIError(400,"Unauthorized Request.")
    }
    res
    .status(200)
    .json(new APIResponse(200,"",req?.user))
})

const updateUser = asyncHandler(async (req,res)=>{
    const {email,fullName}=req.body
    if(!email || !fullName){
        throw new APIError(401,"email or fullName is missing.")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                email : email,
                fullName : fullName
            }
        },
        { new : true }
    ).select("-password")

    res
    .status(200)
    .json(new APIResponse(200,"User Updated Successfully.",user))
})

const updateAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new APIError(401,"please upload the file.")
    }
    
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new APIError(500,"Something went wrong while uploading the file.")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar?.url || " "
            }
        },
        { new : true }
    ).select("-password -refreshToken")
    if(!user){
        throw APIError(401,"Unauthorized Request")
    }

    res
    .status(200)
    .json(new APIResponse(200,"Avatar Updated Successfully.",user))
})

const updateCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalPath=req.file?.path
   try {
     if(!coverImageLocalPath){
         throw new APIError(401,"please upload the file.")
     }
     
     const coverImage=await uploadOnCloudinary(coverImageLocalPath)
     if(!coverImage){
         throw new APIError(500,"Something went wrong while uploading the file.")
     }
     const user=await User.findByIdAndUpdate(
         req.user?._id,
         {
             $set : {
                 coverImage : coverImage?.url || " "
             }
         },
         { new : true }
     ).select("-password -refreshToken")
     if(!user){
         throw APIError(401,"Unauthorized Request")
     }
 
     res
     .status(200)
     .json(new APIResponse(200,"Cover Image Updated Successfully.",user))

   } catch (error) {
        res.json(APIError(401,error?.message))
   }
})

const getUserChannelProfile = asyncHandler(async (req,res)=>{
    const {username}=req.params
    if(!username.trim()){
        throw new APIError(401,"Username Required.")
    }

    const channel =await User.aggregate([
        {
          $match : {username : username?.toLowerCase()}
        },
        {
            $lookup : { // how many subscribers does user have -> calculated using "channel" as user is also a channel
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                subscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : { // whether current user has subscribed to this channel
                    $cond : {
                        if : {$in : [req.user._id,"$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                username  : 1,
                email  : 1,
                avatar  : 1,
                coverImage  : 1,
                isSubscribed  : 1,
                subscribedToCount  : 1,
                subscribersCount  : 1,
            }
        }
    ])

    if(!channel?.length){
        throw new APIError(404,"Channel Not Found.")
    }

    res
    .status(201)
    .json(new APIResponse(201,"Channel details found.",channel[0]))
})

const getWatchHistory = asyncHandler(async (req,res)=>{
    if(!req.user){
        throw new APIError(401,"UnAuthorized Request")
    }
    const user=await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "_id",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        username : 1,
                                        email : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    if(!user){
        throw new APIError(404,"No watch history found.")
    }
    res
    .status(200)
    .json(new APIResponse(200,"",user[0].watchHistory))

})

const getUserVideos=asyncHandler(async (req,res)=>{
    const videos=await User.aggregate([
        {   
            $match : {_id : new mongoose.Types.ObjectId(req.user._id)}
        },
        {
           $lookup : {
                from : "videos",
                localField : "_id",
                foreignField : "owner",
                as : "userVideos",
                pipeline : [
                   {
                       $project: {
                            _id: 1,
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1
                        } 
                   }
                ]
           } 
        },
        {
            $project: {
                userVideos : 1
            }
        }
    ])

    if (!videos || videos.length === 0) {
        throw new APIError(404, "Videos not found");
    }

    res
    .status(200)
    .json(new APIResponse(200,"Videos Found.",videos[0].userVideos))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateUserPassword,
    getCurrentUser,
    updateUser,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    getUserVideos
    }
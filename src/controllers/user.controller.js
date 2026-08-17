import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/apiError.js"
import {APIResponse} from "../utils/apiResponse.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

export {registerUser}
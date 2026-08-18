import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/apiError.js"
import {APIResponse} from "../utils/apiResponse.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";


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


export {registerUser,
        loginUser,
        logoutUser}
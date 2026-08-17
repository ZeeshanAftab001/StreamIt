import mongoose from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"


const useSchema=new mongoose.Schema({

    username : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        index : true
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
    },
    fullName : {
        type : String,
        required : true,
        lowercase : true,
        trim : true,
    },
    avatar : {
        type : String, // Cloudinary Url
        required : true,
    },
    coverImage : {
        type : String, // Cloudinary Url
    },
    password : {
        type : String, // Cloudinary Url
        required : [true,"Password is required!"]
    },
    refreshToken :{
        type:String
    },
    watchHistory : [{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Video"
    }]

},{timestamps : true})

useSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next()

    this.password=await bcrypt.hash(this.password,10)
    next()
})

useSchema.method.isPasswordCorrect=async function (password) {
    return await bcrypt.compare(password,this.password)
}

useSchema.method.generateAccessToken=async function(){
    return await jwt.sign(
        {
            _id : this._id,
            username : this.username,
            fullName : this.fullName,
            email : this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY,
            algorithm : "HS256"
        }
    )
}

useSchema.method.generateRefreshToken=async function(){
    return await jwt.sign(
        {
            _id : this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY,
            algorithm : "HS256"
        }
    )
}

export const User=mongoose.model("User",useSchema)
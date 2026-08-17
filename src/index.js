import dotenv from "dotenv"
import connectDB from "./db/index.js"
import app from "./app.js"


dotenv.config({
    path : "./env",
    quiet: true
})

connectDB()
.then(()=>{
    console.log("DB Connected Successfully!")
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is listening on Port ${process.env.PORT}`)
        })
    })
.catch((error)=>{
    console.log("DB Connection Error : ",error)
})


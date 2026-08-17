import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const route=Router()

route.route("/register").get(registerUser)


export default route
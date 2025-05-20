import jwt from "jsonwebtoken";
import {db} from "../libs/db.js"
import { ApiError } from "../libs/apiError.js"

export const authMiddleware = async (req , res , next)=>{
    try {
        const token = req.cookies.jwt;

        if(!token){
            throw new ApiError(401,"Unauthorized - No token provided")
        }

        let decoded;

        try {
            decoded = jwt.verify(token , process.env.JWT_SECRET);
        } catch (error) {
            throw new ApiError(401,"Unauthorized - Invalid token")
        }

        const user = await db.user.findUnique({
            where:{
                id:decoded.id
            },
            select:{
                id:true,
                image:true,
                name:true,
                email:true,
                role:true
            }
        });


        if(!user){
            throw new ApiError(404,"User not found")
        }

        req.user = user;
        next();

    } catch (error) {
        throw new ApiError(500,"Error authenticating user:", error)
    }
}


export const checkAdmin  = async(req , res , next)=>{
    try {
        const userId = req.user.id;
        
        const user = await db.user.findUnique({
            where:{
                id:userId
            },
            select:{
                role:true
            }
        })

        if(!user || user.role !== "ADMIN"){
            throw new ApiError(403,"Access denied - Admins only")
        }

        next();
    } catch (error) {
        throw new ApiError(500,"Error checking admin role",error)
    }
}
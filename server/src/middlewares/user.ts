import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"
import { User } from "../entities/User";

export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.token;
        console.log("token", token)
        if (!token) return next();

        const { username }: any = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOneBy({ username });
        console.log("user", user)

        if (!user) throw new Error("Unauthenticated");

        res.locals.user = user;
        next();

    } catch (error) {
        console.log(error);
        res.status(400).json({ error: "Somegthing went wrong"})
    }
}

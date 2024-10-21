import { Request, Response, Router } from "express";

const register = async (req: Request, res: Response) => {
    const {email, username, password} = req.body;
    console.log('eamil', email);
}

const router = Router();
router.post("/register", register);

export default router;
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken"
import { User } from "../entities/User";
import userMiddleware from "../middlewares/user"
import authMiddleware from "../middlewares/auth"
import { isEmpty } from "class-validator";
import { AppDataSource } from "../data-source";
import Sub from "../entities/Sub"
import Post from "../entities/Post"

const getSub = async (req: Request, res: Response) => {
    const name = req.params.name;
    try {
        const sub = await Sub.findOneByOrFail({ name });

        res.json(sub);
    } catch (error) {
        res.status(404).json({ error: "커뮤니티를 찾을 수 없습니다."});
    }
}

const createSub = async (req: Request, res: Response, next) => {
    const {name, title, descrtiption} = req.body;

    try {
        let errors: any = {};
        if (isEmpty(name)) errors.name = "이름은 비워둘 수 없습니다."
        if (isEmpty(title)) errors.title = "주제는 비워둘 수 없습니다."

        const sub = await AppDataSource.getRepository(Sub)
            .createQueryBuilder("sub")
            .where("lower(sub.name) = :name", {name: name.toLowerCase()})
            .getOne();

        if (sub) errors.name = "서브가 이미 존재합니다.";

        if (Object.keys(errors). length > 0) {
            throw errors;
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({error: "문제가 발생 했습니다."})
    }

    try {
        const user: User = res.locals.user;
        const sub = new Sub();
        sub.name = name;
        sub.descrtiption = descrtiption;
        sub.title = title;
        sub.user = user;

        await sub.save();
        res.json(sub)
    } catch (error) {
        console.log(error)
        res.status(500).json({error: "문제가 발생 했습니다."})
    }
}

const topSubs = async (_: Request, res: Response) => {
    try {
        const imageUrlExp = `COALESCE(s."imageUrn", 'https://www.gravatar.com/avatar?d=mp&f=y')`
        const subs = await AppDataSource
        .createQueryBuilder()
        .select(
            `s.title, s.name, ${imageUrlExp} as "imageUrl", count(p.id) as "postCount"`
        )
        .from(Sub, "s")
        .leftJoin(Post, "p", `s.name = p."subName"`)
        .groupBy('s.title, s.name, "imageUrl"')
        .limit(5)
        .execute();
        res.json(subs);
    } catch (error) {
        console.log(error);
        console.log("is here?")
        res.status(500).json({ error: "Something went wrong"})
    }
}

const router = Router();

router.get("/:name", userMiddleware, getSub);
router.post("/", userMiddleware, authMiddleware, createSub);
router.get("/sub/topSubs", topSubs);

export default router;
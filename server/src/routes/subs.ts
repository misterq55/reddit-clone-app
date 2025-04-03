import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken"
import { User } from "../entities/User";
import userMiddleware from "../middlewares/user"
import authMiddleware from "../middlewares/auth"
import { isEmpty } from "class-validator";
import { AppDataSource } from "../data-source";
import Sub from "../entities/Sub"
import Post from "../entities/Post"
import { NextFunction } from "express-serve-static-core";
import multer, { FileFilterCallback } from "multer";
import { makeId } from "../utils/helpers";
import path from "node:path";
import { unlinkSync } from "node:fs";

const getSub = async (req: Request, res: Response) => {
    const name = req.params.name;
    try {
        const sub = await Sub.findOneByOrFail({ name });

        // 포스트를 생성한 후에 해당 sub에 속하는 포스트 정보들을 넣어주기
        const posts = await Post.find({
            where: { subName: sub.name},
            order: { createAt: "DESC"},
            relations: ["comments", "votes"]
        })

        sub.posts = posts;

        if (res.locals.user) {
            sub.posts.forEach((p) => p.setUserVote(res.locals.user));
        }

        console.log("sub", sub);

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
        const imageUrlExp = `COALESCE('${process.env.APP_URL}/images/' || s."imageUrn", 'https://www.gravatar.com/avatar?d=mp&f=y')`
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

const ownSub = async (req: Request, res: Response, next: NextFunction) => {
    const user:User = res.locals.user;
    try {
        const sub = await Sub.findOneOrFail({where: { name: req.params.name } });
        
        if (sub.username !== user.username) {
            res.status(403).json({ error: "이 커뮤니티를 소유하고 있지 않습니다."});
        }

        res.locals.sub = sub;
        next();
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "문제가 발생했습니다."})
    }
}

const upload = multer({
    storage: multer.diskStorage({
        destination: "public/images",
        filename: (_, file, callback) => {
            const name = makeId(10);
            callback(null, name + path.extname(file.originalname));
        },   
    }),
    fileFilter: (_, file: any, callback: FileFilterCallback) => {
        if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
            callback(null, true);
        } else {
            callback(new Error("이미지가 아닙니다."))
        }
    }
})

const uploadSubImage = async (req: Request, res: Response) => {
    const sub: Sub = res.locals.sub;
    try {
        const type = req.body.type;
        if (type !== "image" && type !== "banner") {
            if (!req.file?.path) {
                res.status(400).json({ error: "유효하지 않은 파일"})
            }

            unlinkSync(req.file.path);
            res.status(400).json({ error: "잘못된 유형" });
        }

        let oldImageUrn:string = "";

        if (type === "image") {
            oldImageUrn = sub.imageUrn || "";
            sub.imageUrn = req.file?.filename || "";
        } else if (type === "banner") {
            oldImageUrn = sub.bannerUrn || "";
            sub.bannerUrn = req.file?.filename || "";
        }
        await sub.save();

        if (oldImageUrn !== "") {
            const fullFileName = path.resolve(
                process.cwd(),
                "public",
                "images",
                oldImageUrn
            );
            unlinkSync(fullFileName);
        }

        res.json(sub);
    } catch (error) {
        console.log(error);
    }
}

const router = Router();

router.get("/:name", userMiddleware, getSub);
router.post("/", userMiddleware, authMiddleware, createSub);
router.get("/sub/topSubs", topSubs);
router.post("/:name/upload", userMiddleware, authMiddleware, ownSub, upload.single("file"), uploadSubImage)
export default router;
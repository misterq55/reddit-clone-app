import { Request, Response, Router } from "express";
import userMiddleware from "../middlewares/user"
import authMiddleware from "../middlewares/auth"
import Sub from "../entities/Sub";
import Post from "../entities/Post";
import Comment from "../entities/Comment";

const getPosts = async (req: Request, res: Response) => {
    const currentPage: number = (req.query.page || 0) as number;
    const perPage: number = (req.query.count || 8) as number;

    try {
        const posts = await Post.find({
            order: {createdAt: "DESC"},
            relations: ["sub", "votes", "comments"],
            skip: currentPage * perPage,
            take: perPage
        })

        if (res.locals.user) {
            posts.forEach(p => p.setUserVote(res.locals.user));
        }

        res.json(posts);
    } catch (error) {
        console.log(error);
        res.status(500).json({error: "문제가 발생했습니다."})
    }
} 

const getPost = async (req: Request, res: Response) => {
    const { identifier, slug } = req.params;
    
    try {
        const post = await Post.findOneOrFail({
            where: {identifier, slug},
            relations: ["sub", "votes"]
        })

        if (res.locals.user) {
            post.setUserVote(res.locals.user);
        }
        console.log(post)
        res.send(post);
    } catch (error) {
        console.log(error);
        res.status(404).json({ error: "게시물을 찾을 수 없습니다" })
    }
}

const createPost = async (req: Request, res: Response) => {
    const {title, body, sub} = req.body;
    if (title.trim() === "") {
        res.status(400).json({title: "제목은 비워둘 수 없습니다."})
    }

    const user = res.locals.user;

    try {
        const subRecord = await Sub.findOneByOrFail({ name: sub });
        const post = new Post();
        post.title = title;
        post.body = body;
        post.user = user;
        post.sub = subRecord;

        await post.save();

        res.json(post);
    } catch (error) {
        res.status(500).json({ error: "문제가 발생했습니다." })
    }
}

const getPostComments = async (req: Request, res: Response) => {
    const { identifier, slug } = req.params;

    try {
        const post = await Post.findOneByOrFail({identifier, slug});
        const comments = await Comment.find({
            where: { postId: post.id },
            order: { createdAt: "DESC" },
            relations: ["votes"]
        });

        if (res.locals.user) {
            comments.forEach((c) => c.setUserVote(res.locals.user));
        }
        
        res.json(comments)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "문제가 발생했습니다."})
    }
}

const createPostComment = async (req: Request, res: Response) => {
    const { identifier, slug } = req.params;
    const body = req.body.body;

    try {
        const post = await Post.findOneByOrFail({ identifier, slug });
        const comment = new Comment();
        comment.body = body;
        comment.user = res.locals.user;
        comment.post = post;

        if (res.locals.user) {
            post.setUserVote(res.locals.user)
        }

        await comment.save();
        res.json(comment)
    } catch (error) {
        console.log(error)
        res.status(404).json({ error: "게시물을 찾을 수 없습니다."})
    }
};

const router = Router();
router.get("/:identifier/:slug", userMiddleware, getPost)
router.post("/", userMiddleware, authMiddleware, createPost);
router.get("/", userMiddleware, getPosts);
router.get("/:identifier/:slug/comments", userMiddleware, getPostComments)
router.post("/:identifier/:slug/comments", userMiddleware, createPostComment)

export default router;
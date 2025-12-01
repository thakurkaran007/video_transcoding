import { Router } from "express";
import { getUser, protect, signIn } from "../controllers/auth.js";

const userRouter = Router();

userRouter.post('/signin', signIn);
userRouter.use(protect);
userRouter.post('/getUser', getUser);


export default userRouter;
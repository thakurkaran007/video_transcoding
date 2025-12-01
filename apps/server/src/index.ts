import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRouter from './routers/user.router.js';
import videoRouter from './routers/video.router.js';
import serverless from 'serverless-http';

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.status(200).send('Server is running');
})


app.use('/api/v1/users', userRouter);
app.use('/api/v1/videos', videoRouter);


// app.all("/*", (req, res) => {
//     res.status(404).send(`Cant find ${req.originalUrl} on this server!`);
// })

export const handler = serverless(app);
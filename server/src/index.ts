import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/test', (req: Request, res: Response) => {
    res.json({ message: `request=${ req.originalUrl }`, 'timestamp': new Date() });
});

app.listen(port, () => {
    console.log(`Server running on port=${ port }`)
});

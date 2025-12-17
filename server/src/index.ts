import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// re-create __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

app.get(/.*/, (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${ PORT }`);
});

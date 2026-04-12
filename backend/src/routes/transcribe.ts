import { Router } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const router = Router();
const upload = multer({ dest: '/tmp/beats-audio/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/v1/transcribe
router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Audio file required' } });
  }

  try {
    const fileStream = fs.createReadStream(req.file.path);
    const ext = req.file.originalname?.split('.').pop() || 'm4a';
    const fileName = `audio.${ext}`;

    const transcription = await openai.audio.transcriptions.create({
      file: new File([fs.readFileSync(req.file.path)], fileName, { type: req.file.mimetype }),
      model: 'whisper-1',
      language: 'en',
    });

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        transcript: transcription.text,
        durationSeconds: req.body.durationSeconds ? parseFloat(req.body.durationSeconds) : null,
      },
    });
  } catch (error: any) {
    // Clean up temp file on error
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Transcription error:', error);
    res.status(500).json({ success: false, error: { code: 'TRANSCRIPTION_FAILED', message: error.message } });
  }
});

export default router;

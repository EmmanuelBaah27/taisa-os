import { Router } from 'express';
import { z } from 'zod';
import { startSession, sendMessage, getMessages } from '../services/claude/chatAgent';

const router = Router();

function requireUserId(req: any, res: any): string | null {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });
    return null;
  }
  return userId;
}

// POST /api/v1/chat/session/start
const StartSessionSchema = z.object({
  entryId: z.string().optional().nullable(),
});

router.post('/session/start', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = StartSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
  }

  try {
    const sessionId = await startSession({ userId, entryId: parsed.data.entryId ?? null });
    res.status(201).json({ success: true, data: { sessionId } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'SESSION_CREATE_FAILED', message: error.message } });
  }
});

// POST /api/v1/chat/message
const SendMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(4000),
});

router.post('/message', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = SendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
  }

  try {
    const reply = await sendMessage(parsed.data.sessionId, userId, parsed.data.message);
    res.json({ success: true, data: { reply } });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    console.error('Chat message error:', error);
    res.status(500).json({ success: false, error: { code: 'CHAT_FAILED', message: error.message } });
  }
});

// GET /api/v1/chat/session/:sessionId/messages
router.get('/session/:sessionId/messages', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const messages = await getMessages(req.params.sessionId, userId);
    res.json({ success: true, data: { messages } });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;

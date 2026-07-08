import type { FastifyInstance } from 'fastify';
import { uploadAudio, getTranscriptions } from '../controllers/transcript.controller.js';

export default async function transcriptionRoutes(fastify: FastifyInstance) {
  fastify.post('/api/transcribe', uploadAudio);
  fastify.get('/api/transcriptions', getTranscriptions);
}

import type { FastifyRequest, FastifyReply } from 'fastify';
import { processAudio } from '../services/transcript.service.js';
import { prisma } from '../db/client.js';

export const uploadAudio = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No audio file uploaded' });

    // Extract the buffer and process it
    const audioBuffer = await data.toBuffer();
    const result = await processAudio(audioBuffer);
    
    return reply.send(result);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to process audio' });
  }
};

export const getTranscriptions = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const transcriptions = await prisma.transcription.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return reply.send(transcriptions);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch transcriptions' });
  }
};

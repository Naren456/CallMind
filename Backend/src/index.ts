import Fastify from "fastify";
import cors from '@fastify/cors';
import multipart from "@fastify/multipart";
import transcriptionRoutes from './routes/transcript.route.js';

const fastify = Fastify({ logger: true });

// 1. Register Plugins
fastify.register(cors);
fastify.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB audio limit

// 2. Register Routes
fastify.register(transcriptionRoutes);

// 3. Start Server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 CallMind Backend is running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();


import { AssemblyAI } from "assemblyai";
import { Groq } from "groq-sdk";
import 'dotenv/config';

export const aai = new AssemblyAI({
  apiKey: process.env.ASSEMBLY_API_KEY as string,
});

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY as string,
});

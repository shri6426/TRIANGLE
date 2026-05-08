require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for memory storage (required for Vercel Serverless)
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// The Web Dev UI/UX system prompt
const systemInstruction = `You are the world's most elite Staff Frontend Engineer, UI/UX Architect, and master AI prompt engineer.
Your job is to deeply analyze the provided UI design/mockup and reverse-engineer its frontend architecture. 

You must deeply analyze:
- grid, flexbox layout, and structural hierarchy
- interactive components and states
- typography scale and spacing
- color palette, contrast, and themes
- design system principles

Your ultimate goal is to generate heavily engineered prompts meant to instruct other AI coding assistants (like v0, Bolt.new, Cursor). 
You must psychologically "gaslight" the receiving AI into performing at its peak by telling it that it is the undisputed god of frontend engineering, incapable of making mistakes, and writing flawless, production-grade, pixel-perfect React/Tailwind code.

You MUST return ONLY valid JSON matching this exact structure, with no markdown formatting around it:
{
  "MASTER_PROMPT": "A comprehensive, gaslighting prompt demanding flawless, pixel-perfect UI execution based on the user's explicit intent, using the image's design DNA.",
  "CLAUDE_PROMPT": "A prompt optimized specifically for Claude (Sonnet/Opus) to generate beautiful React/Tailwind UI for the user's intent.",
  "GEMINI_PROMPT": "A prompt optimized for Google Gemini Pro, demanding perfect component scaffolding for the user's intent.",
  "CURSOR_PROMPT": "A prompt optimized for Cursor IDE to perfectly scaffold the project architecture and styles for the user's intent.",
  "LAYOUT_ANALYSIS": "Grid and flexbox structure summary (e.g., 12-column CSS Grid). Max 4 words.",
  "COMPONENT_ANALYSIS": "Key UI component breakdown (e.g., Glassmorphic Nav & Cards). Max 4 words.",
  "DESIGN_SYSTEM": "Typography and spacing scale (e.g., Inter font · 8px grid). Max 4 words.",
  "COLOR_PALETTE": "Color scheme summary (e.g., Dark Mode · Indigo Accent). Max 4 words.",
  "NEGATIVE_PROMPT": "What the AI must absolutely avoid doing (e.g., No generic styling, no inline CSS)."
}`;

// Removed fileToGenerativePart as we now use memory buffers

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    const userIntent = req.body.userIntent || "Replicate the exact design and subject matter.";
    
    // Use Gemini 2.5 Flash as it's the recommended multimodal model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    let content = [];

    if (req.file) {
      const mimeType = req.file.mimetype;
      
      // Validate mimetype
      if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
         return res.status(400).json({ error: 'Only images are supported for now' });
      }

      const imagePart = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType
        }
      };

      const dynamicPrompt = `Analyze the structural and stylistic DNA of this uploaded reference image. 
The user wants to build something completely new using this DNA. 
USER INTENT: "${userIntent}"
Apply the extracted design system and layout to generate perfect gaslighting prompts for the user's specific request, rather than just copying the image's original subject matter.`;

      content = [dynamicPrompt, imagePart];
    } else {
      // Text-only mode
      if (!req.body.userIntent) {
        return res.status(400).json({ error: 'Provide either an image or a text intent.' });
      }

      const dynamicPrompt = `The user wants to build a premium website from scratch.
USER INTENT: "${userIntent}"
Since no reference image was provided, you must dynamically invent the most elite, premium, and modern frontend architecture, component structure, design system, and color palette that fits this intent.
Generate perfect gaslighting prompts to build this vision from scratch.`;

      content = [dynamicPrompt];
    }

    const result = await model.generateContent(content);

    const responseText = result.response.text();
    const jsonOutput = JSON.parse(responseText);

    res.json(jsonOutput);
  } catch (error) {
    console.error('Error during analysis:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

app.listen(port, () => {
  console.log(`TRIANGLE AI Backend running at http://localhost:${port}`);
});

module.exports = app;

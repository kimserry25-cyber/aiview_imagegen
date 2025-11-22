import { GoogleGenAI } from "@google/genai";
import { AspectRatioValue } from "../types";

interface GenerateImageProps {
  apiKey: string;
  imageBase64: string;
  mimeType: string;
  prompt: string;
  aspectRatio: AspectRatioValue;
  view?: string;
  angle?: string;
  expression?: string;
}

// Helper to map user requested ratio to API supported ratio
const getApiAspectRatio = (ratio: AspectRatioValue): '1:1' | '3:4' | '4:3' | '9:16' | '16:9' => {
  switch (ratio) {
    case '1:1': return '1:1';
    case '3:4': return '3:4';
    case '4:3': return '4:3';
    case '9:16': return '9:16';
    case '16:9': return '16:9';
    case '2:3': return '3:4'; 
    case '3:2': return '4:3'; 
    case '21:9': return '16:9'; 
    case '1:2': return '9:16'; 
    case '2:1': return '16:9'; 
    default: return '1:1';
  }
};

// Helper function to wait (sleep)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateImageVariation = async ({
  apiKey,
  imageBase64,
  mimeType,
  prompt,
  aspectRatio,
  view,
  angle,
  expression
}: GenerateImageProps): Promise<string> => {
  
  // Retry configuration
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      if (!apiKey) {
        throw new Error("API Key is missing");
      }

      // Initialize client with the provided API key
      const ai = new GoogleGenAI({ apiKey: apiKey });

      const changes = [];
      if (view) changes.push(`Camera View: ${view}`);
      if (angle) changes.push(`Camera Angle/Shot: ${angle}`);
      if (expression) changes.push(`Facial Expression: ${expression}`);
      
      if (['2:3', '3:2', '21:9', '1:2', '2:1'].includes(aspectRatio)) {
          changes.push(`Composition Aspect Ratio: ${aspectRatio}`);
      }

      const userInstruction = prompt ? `User Custom Instruction: ${prompt}` : '';

      // Prompt engineering focused on "Editing/Modification" FROM ORIGINAL
      const fullPrompt = `
      Act as a professional photo editor and retoucher. 
      
      Reference Image: Provided below (This is the ONLY source material).
      Task: Re-generate this EXACT image but apply the specific modifications listed below.
      
      CRITICAL INSTRUCTION: 
      - You must ALWAYS start from the provided reference image. 
      - Do NOT use any previous generated state or context. 
      - Treat this as a fresh modification of the original file.
      
      STRICT CONSTRAINTS:
      1. PRESERVE IDENTITY: The main subject must remain recognizable as the SAME individual from the original source image.
      2. PRESERVE OUTFIT: Keep the subject's clothing and accessories consistent with the original source.
      3. PRESERVE ATMOSPHERE: Maintain the original lighting and color grading unless explicitly asked to change.
      
      REQUIRED MODIFICATIONS:
      ${changes.length > 0 ? changes.join('\n') : 'No specific structural changes. Enhance fidelity and details.'}
      
      ${userInstruction}
      
      Output: A high-quality photorealistic image.
      `;
      
      const apiAspectRatio = getApiAspectRatio(aspectRatio);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: fullPrompt,
            },
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType,
              },
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: apiAspectRatio,
          },
        },
      });

      // Check for safety blocking or other finish reasons
      const candidate = response.candidates?.[0];
      if (!candidate) {
          // This might be a transient API issue, treat as retriable
          throw new Error("NO_CANDIDATES"); 
      }
      
      if (candidate.finishReason !== 'STOP') {
          // Safety blocks are NOT retriable. They will fail every time with the same prompt.
          throw new Error(`Generation stopped. Reason: ${candidate.finishReason}. This often happens if the image triggers safety filters.`);
      }

      // Extract image from response safely using optional chaining
      const parts = candidate.content?.parts;
      if (parts && parts.length > 0) {
        for (const part of parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
      
      throw new Error("Generation successful, but no image data was found in the response.");

    } catch (error: any) {
      const errorMessage = error.message || JSON.stringify(error);
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Quota') || errorMessage.includes('RESOURCE_EXHAUSTED');
      const isServerOverload = errorMessage.includes('503') || errorMessage.includes('Overloaded') || errorMessage === "NO_CANDIDATES";

      if ((isRateLimit || isServerOverload) && attempt < MAX_RETRIES) {
        attempt++;
        const delay = 2000 * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s
        console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await wait(delay);
        continue; // Retry the loop
      }
      
      // If we ran out of retries or it's a non-retriable error (like Safety, 403), throw it
      console.error("Error generating image after retries:", error);
      throw error; 
    }
  }
  
  throw new Error("Maximum retries exceeded.");
};
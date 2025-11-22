
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

// Helper function to resize and compress image
// Drastically reduced to 512px / 0.5 quality to ensure Free Tier compliance
const resizeImage = async (base64Str: string, maxWidth = 512): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Handle potential missing prefixes or existing prefixes
    if (base64Str.startsWith('data:image')) {
        img.src = base64Str;
    } else {
        img.src = `data:image/jpeg;base64,${base64Str}`;
    }

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Export as JPEG with 0.5 quality for MAXIMUM token savings
      const newDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      const newBase64 = newDataUrl.split(',')[1];
      
      resolve({
        base64: newBase64,
        mimeType: 'image/jpeg'
      });
    };
    
    img.onerror = (err) => reject(err);
  });
};

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
  const MAX_RETRIES = 2; // Reduced retries for Quota errors
  let attempt = 0;

  // Optimize image before sending
  // Force optimization to prevent 429 errors
  let optimizedImage;
  try {
     optimizedImage = await resizeImage(imageBase64); // Defaults to 512px
  } catch (e) {
     console.warn("Image optimization failed, falling back to original (High Risk of 429)", e);
     optimizedImage = { base64: imageBase64, mimeType: mimeType };
  }

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
      Act as a professional photo editor. 
      
      Reference Image: Provided below.
      Task: Re-generate this image applying these modifications:
      
      ${changes.length > 0 ? changes.join('\n') : 'Enhance details.'}
      
      ${userInstruction}
      
      STRICT RULES:
      - Keep the main subject identity and clothing from the reference.
      - Output photorealistic quality.
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
                data: optimizedImage.base64,
                mimeType: optimizedImage.mimeType,
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
          throw new Error("NO_CANDIDATES"); 
      }
      
      if (candidate.finishReason !== 'STOP') {
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
      // Check specifically for Quota errors
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Quota') || errorMessage.includes('RESOURCE_EXHAUSTED');
      const isServerOverload = errorMessage.includes('503') || errorMessage.includes('Overloaded') || errorMessage === "NO_CANDIDATES";

      // Only retry if it's NOT a strict token quota issue (sometimes 429 is just rate limit, sometimes it's hard daily limit)
      // But for user experience, we try a few times with backoff
      if ((isRateLimit || isServerOverload) && attempt < MAX_RETRIES) {
        attempt++;
        // Longer wait time for rate limits
        const delay = 3000 * Math.pow(2, attempt - 1); // 3s, 6s
        console.log(`Attempt ${attempt} failed (${isRateLimit ? 'Rate Limit' : 'Server Error'}). Retrying in ${delay}ms...`);
        await wait(delay);
        continue; 
      }
      
      console.error("Error generating image:", error);
      throw error; 
    }
  }
  
  throw new Error("Maximum retries exceeded.");
};

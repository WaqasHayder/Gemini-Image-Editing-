/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates a virtual try-on image using generative AI.
 * @param originalImage The image of the person.
 * @param hotspot The {x, y} coordinates on the person to focus the edit.
 * @param editDetails An object containing either a text prompt or a garment image file.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateVirtualTryOnImage = async (
    originalImage: File,
    hotspot: { x: number, y: number },
    editDetails: { prompt: string } | { garmentImage: File }
): Promise<string> => {
    console.log('Starting virtual try-on at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const parts: ( { inlineData: { mimeType: string; data: string; } } | { text: string } )[] = [originalImagePart];
    let prompt: string;

    if ('prompt' in editDetails) {
        // Text-based try-on
        prompt = `You are an expert fashion AI. Your task is to change the clothing on the person in the main image based on the user's request.
User Request: "${editDetails.prompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic, paying attention to fit, wrinkles, and lighting, and blend seamlessly with the person.
- The rest of the image (person's body, background) must remain identical to the original.

Output: Return ONLY the final edited image. Do not return text.`;
        parts.push({ text: prompt });

    } else {
        // Image-based try-on
        const garmentImagePart = await fileToPart(editDetails.garmentImage);
        prompt = `You are an expert fashion AI. Your task is to realistically place the clothing item from the second image (the garment) onto the person in the first image (the model).
Edit Location: Focus the edit on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}) on the model image.

Editing Guidelines:
- The garment must be realistically draped on the person, accounting for their pose, body shape, and the existing lighting in the model's photo.
- The rest of the model image (person's body, background) must remain identical to the original.

Output: Return ONLY the final edited image. Do not return text.`;
        // Order matters: model image first, then garment image, then instructions.
        parts.push(garmentImagePart);
        parts.push({ text: prompt });
    }

    console.log('Sending images and try-on prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
    });
    console.log('Received response from model for try-on.', response);

    return handleApiResponse(response, 'try-on');
};

/**
 * Generates a stylized image based on a reference image and an optional text prompt.
 * @param targetImage The image to apply the style to (e.g., a 3D render).
 * @param referenceImage The image providing the style inspiration.
 * @param textPrompt Optional text instructions to guide the styling.
 * @param seed An optional seed for consistent, deterministic outputs.
 * @returns A promise that resolves to the data URL of the stylized image.
 */
export const generateStyledImage = async (
    targetImage: File,
    referenceImage: File,
    textPrompt: string,
    seed: number | null,
): Promise<string> => {
    console.log(`Starting style transfer generation... Seed: ${seed || 'None'}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const targetImagePart = await fileToPart(targetImage);
    const referenceImagePart = await fileToPart(referenceImage);

    const prompt = `You are a master digital artist specializing in photorealistic re-texturing and re-lighting of existing scenes. You will be given two images: a Target Image and a Style Reference Image.

**ABSOLUTE RULE #1: DO NOT CHANGE THE TARGET IMAGE'S STRUCTURE.**
- The geometry, layout, perspective, and all objects in the Target Image are IMMUTABLE.
- You are FORBIDDEN from adding, deleting, moving, resizing, or altering the shape of ANY element from the Target Image.
- You are FORBIDDEN from importing or blending ANY structural elements or objects from the Style Reference Image.
- The final output image MUST have the exact same structure as the Target Image. A pixel-perfect overlay of the line art of both images should match perfectly. Any structural change is a complete failure.

**YOUR TASK:**
Your ONLY task is to "repaint" the surfaces within the Target Image. You will use the Style Reference Image as your inspiration for textures, materials, colors, and lighting.

**HOW TO APPLY THE STYLE:**
1.  **Analyze the Target Image:** Identify its distinct surfaces (e.g., floor, walls, sofa upholstery, table top).
2.  **Analyze the Style Reference Image:** Identify its aesthetic palette (e.g., dark wood texture, concrete material, warm ambient lighting, brass metal accents).
3.  **Apply to Target Surfaces:** Apply the identified aesthetics from the Style Reference onto the corresponding surfaces of the Target Image, while respecting the original perspective and form. For example, if the reference image has a marble wall, apply a photorealistic marble texture to the wall in the target image.

**USER'S INSTRUCTIONS (OVERRIDE):** "${textPrompt || 'No additional instructions.'}"
- If the user provides text instructions (e.g., 'make the sofa leather'), these take priority over the Style Reference Image for that specific element. All other elements should still derive their style from the reference.

**FINAL OUTPUT REQUIREMENTS:**
- The output MUST be a photorealistic image.
- Pay extreme attention to realistic lighting, shadows, and reflections based on the new materials.
- The output MUST be ONLY the fully rendered image. No text.`;

    const textPart = { text: prompt };
    const parts = [targetImagePart, referenceImagePart, textPart];
    
    const config: { seed?: number } = {};
    if (seed) {
        config.seed = seed;
    }

    console.log('Sending images and style prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config,
    });
    console.log('Received response from model for style transfer.', response);

    return handleApiResponse(response, 'design style');
};
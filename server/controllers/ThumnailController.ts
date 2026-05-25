import { Request, Response } from 'express';
import Thumbnail from '../models/Thumbnail.js';

import {
    GenerateContentConfig,
    HarmCategory,
    HarmBlockThreshold
} from '@google/genai';

import ai from '../configs/ai.js';
import { v2 as cloudinary } from 'cloudinary';

const stylePrompts = {
    'Bold & Graphic':
        'eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition, professional style',

    'Tech/Futuristic':
        'futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere',

    'Minimalist':
        'minimalist thumbnail, clean layout, simple shapes, limited color palette, plenty of negative space, modern flat design, clear focal point',

    'Photorealistic':
        'photorealistic thumbnail, ultra-realistic lighting, natural skin tones, candid moment, DSLR-style photography, lifestyle realism, shallow depth of field',

    'Illustrated':
        'illustrated thumbnail, custom digital illustration, stylized characters, bold outlines, vibrant colors, creative cartoon or vector art style',
};

const colorSchemeDescriptions = {
    vibrant:
        'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',

    sunset:
        'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',

    forest:
        'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',

    neon:
        'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',

    purple:
        'purple-dominant color palette, magenta and violet tones, modern and stylish mood',

    monochrome:
        'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',

    ocean:
        'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',

    pastel:
        'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
};

const fallbackPalettes = {
    vibrant: ['#ff006e', '#00f5d4', '#ffd166'],
    sunset: ['#ff7a18', '#ff006e', '#7b2cbf'],
    forest: ['#0b3d2e', '#2dd4bf', '#bef264'],
    neon: ['#111827', '#00f5ff', '#ff00a8'],
    purple: ['#240046', '#9d4edd', '#f72585'],
    monochrome: ['#050505', '#f8fafc', '#94a3b8'],
    ocean: ['#001f3f', '#00b4d8', '#90e0ef'],
    pastel: ['#ffafcc', '#bde0fe', '#ffc8dd'],
};

const escapeXml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const splitTitle = (title: string) => {
    const words = title.trim().split(/\s+/);
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
        const next = line ? `${line} ${word}` : word;

        if (next.length > 17 && line) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }

    if (line) lines.push(line);

    return lines.slice(0, 3);
};

const buildFallbackSvg = ({
    title,
    userPrompt,
    style,
    colorScheme,
    aspectRatio
}: {
    title: string;
    userPrompt?: string;
    style: string;
    colorScheme: keyof typeof fallbackPalettes;
    aspectRatio: string;
}) => {
    const [bg, accent, highlight] =
        fallbackPalettes[colorScheme] || fallbackPalettes.vibrant;

    const width = aspectRatio === '9:16' ? 1080 : aspectRatio === '1:1' ? 1080 : 1280;
    const height = aspectRatio === '9:16' ? 1920 : aspectRatio === '1:1' ? 1080 : 720;
    const titleLines = splitTitle(title);
    const titleFont = titleLines.length > 2 ? 104 : 122;
    const safePrompt = userPrompt?.trim()
        ? escapeXml(userPrompt.trim()).slice(0, 80)
        : 'AI generated thumbnail';

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<rect width="${width}" height="${height}" fill="${bg}"/>`,
        `<rect x="0" y="0" width="${width}" height="${height}" fill="#050505" opacity="0.52"/>`,
        `<rect x="${width * 0.05}" y="${height * 0.08}" width="${width * 0.9}" height="${height * 0.84}" rx="44" fill="#111111" opacity="0.78"/>`,
        `<rect x="${width * 0.05}" y="${height * 0.08}" width="${width * 0.9}" height="${height * 0.12}" rx="44" fill="${accent}"/>`,
        `<rect x="${width * 0.66}" y="${height * 0.08}" width="${width * 0.29}" height="${height * 0.84}" rx="44" fill="${highlight}" opacity="0.86"/>`,
        `<text x="${width * 0.08}" y="${height * 0.16}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(32, width * 0.038)}" font-weight="800">THUMBLIFY</text>`,
        ...titleLines.map((line, index) =>
            `<text x="${width * 0.09}" y="${height * 0.38 + index * titleFont * 1.05}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${titleFont}" font-weight="900">${escapeXml(line).toUpperCase()}</text>`
        ),
        `<rect x="${width * 0.09}" y="${height * 0.69}" width="${Math.min(width * 0.56, 700)}" height="${height * 0.1}" rx="26" fill="${highlight}"/>`,
        `<text x="${width * 0.12}" y="${height * 0.758}" fill="#111111" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(34, width * 0.038)}" font-weight="900">${escapeXml(style).toUpperCase()}</text>`,
        `<text x="${width * 0.08}" y="${height * 0.88}" fill="#e5e7eb" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(28, width * 0.032)}" font-weight="700">${safePrompt}</text>`,
        `</svg>`
    ].join('');
};

const uploadBase64Image = async (
    buffer: Buffer,
    mimeType: string
) => {
    const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;

    return cloudinary.uploader.upload(dataUri, {
        resource_type: 'image'
    });
};

const uploadFallbackThumbnail = async ({
    title,
    userPrompt,
    style,
    colorScheme,
    aspectRatio
}: {
    title: string;
    userPrompt?: string;
    style: string;
    colorScheme: keyof typeof fallbackPalettes;
    aspectRatio: string;
}) => {
    const svg = buildFallbackSvg({
        title,
        userPrompt,
        style,
        colorScheme,
        aspectRatio
    });

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

export const generateThumbnail = async (
    req: Request,
    res: Response
) => {
    let thumbnail: any = null;

    try {

        const { userId } = req.session as any;

        const {
            title,
            prompt: user_prompt,
            style,
            aspect_ratio,
            color_scheme,
            text_overlay
        } = req.body;

        thumbnail = await Thumbnail.create({
            userId,
            title,
            prompt_used: user_prompt,
            user_prompt,
            style,
            aspect_ratio,
            color_scheme,
            text_overlay,
            isGenerating: true
        });

        const model = 'gemini-3-pro-image-preview';

        const generationConfig: GenerateContentConfig = {
            maxOutputTokens: 32768,
            temperature: 1,
            topP: 0.95,

            responseModalities: ['IMAGE'],

            imageConfig: {
                aspectRatio: aspect_ratio || '16:9',
                imageSize: '1K'
            },

            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.OFF
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.OFF
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.OFF
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.OFF
                }
            ]
        };

        let prompt = `Create a ${stylePrompts[
            style as keyof typeof stylePrompts
        ]} for: "${title}"`;

        if (color_scheme) {
            prompt += ` Use a ${colorSchemeDescriptions[
                color_scheme as keyof typeof colorSchemeDescriptions
            ]
                } color scheme.`;
        }

        if (user_prompt) {
            prompt += ` Additional details: ${user_prompt}.`;
        }

        if (text_overlay) {
            const overlayText =
                typeof text_overlay === 'string'
                    ? text_overlay
                    : title;

            prompt += ` Add bold readable text overlay saying: "${overlayText}".`;
        }

        prompt += ` The thumbnail should be ${aspect_ratio || '16:9'
            }, visually stunning, and designed to maximize click-through rate. Make it bold, professional, and impossible to ignore.`;

        // Generate image
        const response: any = await ai.models.generateContent({
            model,
            contents: [prompt],
            config: generationConfig
        });

        // Validate response
        if (!response?.candidates?.[0]?.content?.parts) {
            throw new Error('Unexpected response from Gemini');
        }

        const parts = response.candidates[0].content.parts;

        let finalBuffer: Buffer | null = null;

        for (const part of parts) {
            if (part.inlineData) {
                finalBuffer = Buffer.from(
                    part.inlineData.data,
                    'base64'
                );
            }
        }

        if (!finalBuffer) {
            throw new Error('No image generated');
        }

        const uploadResult = await uploadBase64Image(
            finalBuffer,
            'image/png'
        );

        // Save thumbnail
        thumbnail.image_url = uploadResult.secure_url;
        thumbnail.isGenerating = false;

        await thumbnail.save();

        return res.json({
            message: 'Thumbnail Generated',
            thumbnail
        });

    } catch (error: any) {

        console.log(error);

        const rawMessage =
            error?.message || 'Something went wrong';

        const isGeminiQuotaError =
            rawMessage.includes('generate_content_free_tier') ||
            rawMessage.includes('RESOURCE_EXHAUSTED') ||
            rawMessage.includes('quota');

        const message = isGeminiQuotaError
            ? 'Gemini image generation quota is exhausted or not enabled for this API key. Enable billing or use an API key/project with image-generation quota.'
            : rawMessage;

        if (thumbnail && isGeminiQuotaError) {
            try {
                const fallbackImageUrl = await uploadFallbackThumbnail({
                    title: thumbnail.title,
                    userPrompt: thumbnail.user_prompt,
                    style: thumbnail.style,
                    colorScheme: thumbnail.color_scheme || 'vibrant',
                    aspectRatio: thumbnail.aspect_ratio || '16:9'
                });

                thumbnail.image_url = fallbackImageUrl;
                thumbnail.isGenerating = false;
                thumbnail.generation_error = '';
                await thumbnail.save();

                return res.json({
                    message: 'Thumbnail generated with free fallback mode',
                    thumbnail
                });
            } catch (fallbackError: any) {
                console.error('Fallback thumbnail failed:', fallbackError);
            }
        }

        if (thumbnail) {
            thumbnail.isGenerating = false;
            thumbnail.generation_error = message;
            await thumbnail.save();
        }

        return res.status(500).json({
            message
        });
    }
};

// Controllers For Thumbnail Deletion
export const deleteThumbnail = async (
    req: Request,
    res: Response
) => {

    try {

        const { id } = req.params;
        const { userId } = req.session as any;

        await Thumbnail.findOneAndDelete({
            _id: id,
            userId
        });

        res.json({
            message: 'Thumbnail deleted successfully'
        });

    } catch (error: any) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });
    }
};

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const EXTRACTION_PROMPT = `You are an expert at reading handwritten surgical operation notes. You are helping an ENT (otolaryngology) surgeon extract structured data from their handwritten operation notes for entry into the Royal College of Surgeons eLogbook.

Carefully examine this image of a handwritten operation note and extract the following fields. If a field is not visible or legible, leave it as an empty string. Provide a confidence score (0.0 to 1.0) for each field.

Return ONLY valid JSON in this exact format:
{
  "fields": {
    "date": "dd-mm-yyyy format",
    "hospital": "hospital name",
    "patientDob": "dd-mm-yyyy format",
    "patientSex": "Male or Female",
    "procedure": "procedure name(s)",
    "cepod": "Scheduled, Urgent, or Emergency",
    "asaGrade": "1, 2, 3, 4, or 5",
    "supervision": "Performed, Supervised - trainer scrubbed, Supervised - trainer unscrubbed, Assisting, or Training juniors",
    "consultant": "consultant name",
    "side": "Left, Right, Bilateral, or N/A",
    "anaesthetic": "GA, LA, or Sedation",
    "startTime": "HH:MM 24hr format",
    "duration": "number of minutes",
    "complications": "Yes or No"
  },
  "confidence": {
    "date": 0.0,
    "hospital": 0.0,
    "patientDob": 0.0,
    "patientSex": 0.0,
    "procedure": 0.0,
    "cepod": 0.0,
    "asaGrade": 0.0,
    "supervision": 0.0,
    "consultant": 0.0,
    "side": 0.0,
    "anaesthetic": 0.0,
    "startTime": 0.0,
    "duration": 0.0,
    "complications": 0.0
  }
}

Important:
- For procedure names, use standard ENT procedure terminology
- Dates should be in dd-mm-yyyy format
- If you can partially read a field, provide your best guess and a lower confidence score
- If a field is completely absent from the note, use empty string and 0.0 confidence`;

async function extractFieldsFromImage(imageBase64) {
  // Strip the data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const mediaType = imageBase64.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          },
          {
            type: 'text',
            text: EXTRACTION_PROMPT
          }
        ]
      }
    ]
  });

  // Parse the response
  const text = response.content[0]?.text || '';

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse extraction response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.fields) {
    throw new Error('Invalid extraction response format');
  }

  return parsed;
}

module.exports = { extractFieldsFromImage };

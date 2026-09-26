import Groq from 'groq-sdk'
import { env } from '@api/env'

const groq = env.GROQ_API_KEY ? new Groq({ apiKey: env.GROQ_API_KEY, timeout: 30_000 }) : null

/**
 * Transcribes speech and translates it into `targetLanguage` (the app's current locale)
 * when the speaker used a different language, so voice input always lands in the UI's language.
 */
export async function transcribeAudio(file: File, targetLanguage?: string): Promise<string> {
  if (!groq) throw new Error('GROQ_NOT_CONFIGURED')

  // Groq's translation endpoint always outputs English regardless of spoken language —
  // exactly what we need when the locale is English, in a single call.
  if (targetLanguage === 'en') {
    const translation = await groq.audio.translations.create({ file, model: 'whisper-large-v3' })
    return translation.text
  }

  const transcription = (await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    response_format: 'verbose_json',
  })) as { text: string; language?: string }

  if (!targetLanguage || transcription.language?.toLowerCase() === LANGUAGE_NAMES[targetLanguage]) {
    return transcription.text
  }

  const translated = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `Translate the user's message to ${LANGUAGE_NAMES[targetLanguage] ?? targetLanguage}. Reply with only the translation, nothing else.`,
      },
      { role: 'user', content: transcription.text },
    ],
  })
  return translated.choices[0]?.message?.content?.trim() || transcription.text
}

const LANGUAGE_NAMES: Record<string, string> = { en: 'english', th: 'thai' }

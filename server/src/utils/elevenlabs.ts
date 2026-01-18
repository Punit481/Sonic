import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function transcribe(blob: Blob) {
  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  const transcription = await elevenlabs.speechToText.convert({
    file: blob,
    modelId: "scribe_v1", // Model to use, for now only "scribe_v1" is supported.
    tagAudioEvents: true, // Tag audio events like laughter, applause, etc.
    languageCode: "eng", // Language of the audio file. If set to null, the model will detect the language automatically.
    diarize: true, // Whether to annotate who is speaking
  });
  return transcription;
}

export default transcribe;

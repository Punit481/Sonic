package com.sonic.voice;

import com.sonic.common.AiErrors;
import java.time.LocalDate;
import org.springframework.ai.audio.transcription.AudioTranscriptionPrompt;
import org.springframework.ai.audio.transcription.TranscriptionModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/**
 * Speech goes through Whisper, then a chat model turns the text into a {@link ParsedVoiceLog}.
 * Both run on Groq's OpenAI-compatible API (see application.yml).
 */
@Component
class AiVoiceParser implements VoiceParser {

    private final ChatClient chat;
    private final TranscriptionModel transcription;
    private final Resource prompt;

    AiVoiceParser(
            ChatClient.Builder chat,
            TranscriptionModel transcription,
            @Value("classpath:prompts/voice-log.st") Resource prompt) {
        this.chat = chat.build();
        this.transcription = transcription;
        this.prompt = prompt;
    }

    @Override
    public ParsedVoiceLog parseText(String transcript, LocalDate today) {
        try {
            return chat.prompt()
                    .user(user -> user.text(prompt)
                            .param("today", today.toString())
                            .param("input", transcript))
                    .call()
                    .entity(ParsedVoiceLog.class);
        } catch (RuntimeException ex) {
            throw AiErrors.translate("Voice log parsing", ex, "Could not process the voice log right now. Please try again.");
        }
    }

    @Override
    public String transcribe(Resource audio) {
        try {
            return transcription.call(new AudioTranscriptionPrompt(audio)).getResult().getOutput();
        } catch (RuntimeException ex) {
            throw AiErrors.translate("Transcription", ex, "Could not transcribe the recording right now. Please try again.");
        }
    }
}

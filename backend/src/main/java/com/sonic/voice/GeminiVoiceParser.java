package com.sonic.voice;

import com.sonic.common.AiRetry;
import com.sonic.common.ApiException;
import java.time.LocalDate;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeType;

/**
 * Gemini handles both inputs: typed or browser-transcribed text, and raw audio, which it
 * transcribes and parses in the same call.
 */
@Component
class GeminiVoiceParser implements VoiceParser {

    private static final Logger log = LoggerFactory.getLogger(GeminiVoiceParser.class);

    private final ChatClient chat;
    private final Resource prompt;

    GeminiVoiceParser(ChatClient.Builder chat, @Value("classpath:prompts/voice-log.st") Resource prompt) {
        this.chat = chat.build();
        this.prompt = prompt;
    }

    @Override
    public ParsedVoiceLog parseText(String transcript, LocalDate today) {
        return call(user -> user.text(prompt)
                .param("today", today.toString())
                .param("input", "Input: \"" + transcript + "\""));
    }

    @Override
    public ParsedVoiceLog parseAudio(Resource audio, MimeType mimeType, LocalDate today) {
        return call(user -> user.text(prompt)
                .param("today", today.toString())
                .param("input", "The input is the attached audio recording. Also return its verbatim transcript.")
                .media(mimeType, audio));
    }

    private ParsedVoiceLog call(Consumer<ChatClient.PromptUserSpec> user) {
        try {
            return AiRetry.call("Gemini voice parsing", () -> chat.prompt()
                    .user(user)
                    .call()
                    .entity(ParsedVoiceLog.class, spec -> spec.useProviderStructuredOutput()));
        } catch (RuntimeException ex) {
            log.warn("Gemini voice parsing failed", ex);
            throw ApiException.aiUnavailable("Could not process the voice log right now. Please try again.");
        }
    }
}

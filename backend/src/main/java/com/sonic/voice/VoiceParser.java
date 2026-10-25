package com.sonic.voice;

import java.time.LocalDate;
import org.springframework.core.io.Resource;
import org.springframework.util.MimeType;

/** Turns what the user said into structured data. Tests replace this with a stub. */
public interface VoiceParser {

    ParsedVoiceLog parseText(String transcript, LocalDate today);

    ParsedVoiceLog parseAudio(Resource audio, MimeType mimeType, LocalDate today);
}

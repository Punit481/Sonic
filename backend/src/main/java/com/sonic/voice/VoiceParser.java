package com.sonic.voice;

import java.time.LocalDate;
import org.springframework.core.io.Resource;

/** Turns what the user said into structured data. Tests replace this with a stub. */
public interface VoiceParser {

    ParsedVoiceLog parseText(String transcript, LocalDate today);

    /** Speech to text. The resource's filename extension tells the service the audio format. */
    String transcribe(Resource audio);
}

package com.sonic.voice;

import java.time.LocalDate;
import java.util.List;
import org.springframework.core.io.Resource;

/** Turns what the user said into structured data. Tests replace this with a stub. */
public interface VoiceParser {

    /**
     * What the parser should know about the user: today's date in their time zone, the unit they
     * mean when they don't say one ("kg" or "lb"), and exercise names they've used before.
     */
    record Context(LocalDate today, String weightUnit, List<String> knownExercises) {}

    ParsedVoiceLog parseText(String transcript, Context context);

    /** Speech to text. The resource's filename extension tells the service the audio format. */
    String transcribe(Resource audio);
}

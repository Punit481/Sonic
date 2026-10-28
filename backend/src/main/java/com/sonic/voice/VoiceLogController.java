package com.sonic.voice;

import com.sonic.common.ApiException;
import com.sonic.security.CurrentUser;
import com.sonic.voice.VoiceLogService.VoiceDraft;
import com.sonic.voice.VoiceLogService.VoiceLogResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/voice-logs")
class VoiceLogController {

    private final VoiceLogService voiceLogs;

    VoiceLogController(VoiceLogService voiceLogs) {
        this.voiceLogs = voiceLogs;
    }

    /** {@code timeZone} is an IANA zone such as "Asia/Kolkata", used to resolve "yesterday". */
    record TextVoiceLog(@NotBlank @Size(max = 5000) String transcript, String timeZone) {}

    /** Parses and saves in one step. The app uses {@code /parse} + {@code /confirm} instead, to show a review. */
    @PostMapping
    ResponseEntity<VoiceLogResult> fromText(
            @AuthenticationPrincipal CurrentUser user, @Valid @RequestBody TextVoiceLog request) {
        return ResponseEntity.status(201)
                .body(voiceLogs.logText(user.id(), request.transcript().strip(), zone(request.timeZone())));
    }

    /** What the AI understood from the text, for the user to review. Nothing is saved. */
    @PostMapping("/parse")
    VoiceDraft parseText(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody TextVoiceLog request) {
        return voiceLogs.parseText(user.id(), request.transcript().strip(), zone(request.timeZone()));
    }

    /**
     * The recording is transcribed by Whisper, then parsed and saved like a text log. The
     * frontend uses the {@code /audio/parse} variant when the browser has no working speech
     * recognition (Safari, Firefox, Brave).
     */
    @PostMapping(path = "/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<VoiceLogResult> fromAudio(
            @AuthenticationPrincipal CurrentUser user,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String timeZone) {
        return ResponseEntity.status(201)
                .body(voiceLogs.logAudio(user.id(), audio(file), zone(timeZone)));
    }

    /** The recording transcribed and parsed, for the user to review. Nothing is saved. */
    @PostMapping(path = "/audio/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    VoiceDraft parseAudio(
            @AuthenticationPrincipal CurrentUser user,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String timeZone) {
        return voiceLogs.parseAudio(user.id(), audio(file), zone(timeZone));
    }

    /** Saves a reviewed draft, possibly edited by the user, and reports any personal records. */
    @PostMapping("/confirm")
    ResponseEntity<VoiceLogResult> confirm(
            @AuthenticationPrincipal CurrentUser user, @Valid @RequestBody VoiceDraft draft) {
        return ResponseEntity.status(201).body(voiceLogs.confirm(user.id(), draft));
    }

    private static Resource audio(MultipartFile file) {
        String contentType = file.getContentType();
        if (file.isEmpty() || contentType == null || !contentType.startsWith("audio/")) {
            throw ApiException.badRequest("Upload a non-empty audio file.");
        }
        return file.getResource();
    }

    private static ZoneId zone(String timeZone) {
        if (timeZone == null || timeZone.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(timeZone);
        } catch (DateTimeException ex) {
            throw ApiException.badRequest("Unknown time zone: " + timeZone);
        }
    }
}

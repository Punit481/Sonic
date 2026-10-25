package com.sonic.voice;

import com.sonic.common.ApiException;
import com.sonic.security.CurrentUser;
import com.sonic.voice.VoiceLogService.VoiceLogResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.MimeType;
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

    @PostMapping
    ResponseEntity<VoiceLogResult> fromText(
            @AuthenticationPrincipal CurrentUser user, @Valid @RequestBody TextVoiceLog request) {
        return ResponseEntity.status(201)
                .body(voiceLogs.logText(user.id(), request.transcript().strip(), zone(request.timeZone())));
    }

    /**
     * The recording goes straight to Gemini, which transcribes and parses it in one call. The
     * frontend uses this when the browser has no working speech recognition (Safari, Firefox, Brave).
     */
    @PostMapping(path = "/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<VoiceLogResult> fromAudio(
            @AuthenticationPrincipal CurrentUser user,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String timeZone) {
        String contentType = file.getContentType();
        if (file.isEmpty() || contentType == null || !contentType.startsWith("audio/")) {
            throw ApiException.badRequest("Upload a non-empty audio file.");
        }
        // Drop parameters such as ";codecs=opus" that Gemini doesn't accept.
        MimeType mimeType = MimeType.valueOf(contentType);
        mimeType = new MimeType(mimeType.getType(), mimeType.getSubtype());
        return ResponseEntity.status(201)
                .body(voiceLogs.logAudio(user.id(), file.getResource(), mimeType, zone(timeZone)));
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

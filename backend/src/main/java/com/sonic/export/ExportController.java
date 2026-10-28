package com.sonic.export;

import com.sonic.common.ApiException;
import com.sonic.security.CurrentUser;
import com.sonic.user.UserRepository;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Everything the user logged, as CSV files they can open in a spreadsheet. Weights are in the
 * user's unit (the column header says which), dates in their time zone.
 */
@RestController
@RequestMapping("/api/v1/export")
class ExportController {

    private static final MediaType CSV = new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8);

    private final ExportRepository exports;
    private final UserRepository users;

    ExportController(ExportRepository exports, UserRepository users) {
        this.exports = exports;
        this.users = users;
    }

    /** One row per set. */
    @GetMapping("/workouts.csv")
    ResponseEntity<String> workouts(@AuthenticationPrincipal CurrentUser user, @RequestParam(required = false) String timeZone) {
        return csv("sonic-workouts", exports.workoutsCsv(user.id(), zone(timeZone), weightUnit(user)));
    }

    @GetMapping("/body-metrics.csv")
    ResponseEntity<String> bodyMetrics(@AuthenticationPrincipal CurrentUser user, @RequestParam(required = false) String timeZone) {
        return csv("sonic-body-metrics", exports.bodyMetricsCsv(user.id(), zone(timeZone), weightUnit(user)));
    }

    private String weightUnit(CurrentUser user) {
        return users.findById(user.id()).map(u -> u.weightUnit()).orElse("kg");
    }

    private static ResponseEntity<String> csv(String name, String body) {
        String filename = name + "-" + LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_LOCAL_DATE) + ".csv";
        return ResponseEntity.ok()
                .contentType(CSV)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(body);
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

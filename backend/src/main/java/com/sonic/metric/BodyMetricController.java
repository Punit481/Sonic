package com.sonic.metric;

import com.sonic.common.PageRequest;
import com.sonic.common.PageResponse;
import com.sonic.security.CurrentUser;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/body-metrics")
class BodyMetricController {

    private final BodyMetricService metrics;

    BodyMetricController(BodyMetricService metrics) {
        this.metrics = metrics;
    }

    @PostMapping
    ResponseEntity<BodyMetric> create(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody NewBodyMetric metric) {
        BodyMetric created = metrics.create(user.id(), metric);
        return ResponseEntity.created(URI.create("/api/v1/body-metrics/" + created.id())).body(created);
    }

    @GetMapping
    PageResponse<BodyMetric> list(
            @AuthenticationPrincipal CurrentUser user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size) {
        return metrics.list(user.id(), new PageRequest(page, size));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal CurrentUser user, @PathVariable UUID id) {
        return metrics.delete(user.id(), id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}

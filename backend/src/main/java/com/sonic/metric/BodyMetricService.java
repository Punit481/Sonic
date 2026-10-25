package com.sonic.metric;

import com.sonic.common.PageRequest;
import com.sonic.common.PageResponse;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BodyMetricService {

    private final BodyMetricRepository metrics;
    private final Clock clock;

    BodyMetricService(BodyMetricRepository metrics, Clock clock) {
        this.metrics = metrics;
        this.clock = clock;
    }

    @Transactional
    public BodyMetric create(UUID userId, NewBodyMetric metric) {
        return metrics.insert(userId, metric, metric.date() != null ? metric.date() : clock.instant());
    }

    @Transactional(readOnly = true)
    public PageResponse<BodyMetric> list(UUID userId, PageRequest page) {
        return PageResponse.of(metrics.findPage(userId, page), page, metrics.countByUser(userId));
    }

    @Transactional
    public boolean delete(UUID userId, UUID id) {
        return metrics.delete(userId, id);
    }
}

package com.sonic.insight;

import com.sonic.insight.InsightService.InsightStatus;
import com.sonic.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/insights")
class InsightController {

    private final InsightService insights;

    InsightController(InsightService insights) {
        this.insights = insights;
    }

    @GetMapping("/latest")
    InsightStatus latest(@AuthenticationPrincipal CurrentUser user) {
        return insights.status(user.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    InsightStatus generate(@AuthenticationPrincipal CurrentUser user) {
        return insights.generate(user.id());
    }
}

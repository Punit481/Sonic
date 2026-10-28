package com.sonic.insight;

import java.util.List;

/** The numbers the insights prompt is built from, computed in SQL by {@link TrainingSummaryRepository}. */
public record TrainingSummary(
        int lookbackDays,
        int trainingPeriodDays,
        int totalSessions,
        double sessionsPerWeek,
        double totalVolumeKg,
        double cardioHours,
        int strengthCount,
        int cardioCount,
        int mobilityCount,
        List<TopExercise> topExercises,
        int lastTwoWeeks,
        int previousTwoWeeks,
        String weightChange,
        String bodyFatChange,
        String muscleMassChange,
        List<String> goals) {

    public record TopExercise(String name, int sessions, String category) {}

    /** The user's active goals, one line each, so the coach can speak to them. */
    TrainingSummary withGoals(List<String> goals) {
        return new TrainingSummary(lookbackDays, trainingPeriodDays, totalSessions, sessionsPerWeek, totalVolumeKg,
                cardioHours, strengthCount, cardioCount, mobilityCount, topExercises, lastTwoWeeks, previousTwoWeeks,
                weightChange, bodyFatChange, muscleMassChange, goals);
    }
}

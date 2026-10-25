package com.sonic.insight;

/** Writes coaching feedback from a training summary. Tests replace this with a stub. */
public interface InsightGenerator {

    Insight.Content generate(TrainingSummary summary);
}

package com.sonic.workout;

import java.util.Locale;
import java.util.Map;

/**
 * One spelling per exercise, so "bench", "bench press" and "Bench Press" are the same exercise in
 * charts and records. Common aliases map to a canonical name; anything else is title-cased the way
 * Postgres's {@code initcap} does it, which the V2 migration used on older rows. V3 applied these
 * aliases to rows saved before names were canonicalised; keep the two lists in step.
 */
public final class ExerciseNames {

    private static final Map<String, String> ALIASES = Map.ofEntries(
            Map.entry("bench", "Bench Press"),
            Map.entry("bench press", "Bench Press"),
            Map.entry("flat bench", "Bench Press"),
            Map.entry("flat bench press", "Bench Press"),
            Map.entry("barbell bench press", "Bench Press"),
            Map.entry("incline bench", "Incline Bench Press"),
            Map.entry("squat", "Squat"),
            Map.entry("squats", "Squat"),
            Map.entry("back squat", "Squat"),
            Map.entry("back squats", "Squat"),
            Map.entry("barbell squat", "Squat"),
            Map.entry("deadlift", "Deadlift"),
            Map.entry("deadlifts", "Deadlift"),
            Map.entry("conventional deadlift", "Deadlift"),
            Map.entry("rdl", "Romanian Deadlift"),
            Map.entry("rdls", "Romanian Deadlift"),
            Map.entry("romanian deadlifts", "Romanian Deadlift"),
            Map.entry("ohp", "Overhead Press"),
            Map.entry("overhead press", "Overhead Press"),
            Map.entry("military press", "Overhead Press"),
            Map.entry("shoulder press", "Overhead Press"),
            Map.entry("pull up", "Pull Up"),
            Map.entry("pull ups", "Pull Up"),
            Map.entry("pull-up", "Pull Up"),
            Map.entry("pull-ups", "Pull Up"),
            Map.entry("pullup", "Pull Up"),
            Map.entry("pullups", "Pull Up"),
            Map.entry("chin up", "Chin Up"),
            Map.entry("chin ups", "Chin Up"),
            Map.entry("chin-ups", "Chin Up"),
            Map.entry("chinups", "Chin Up"),
            Map.entry("push up", "Push Up"),
            Map.entry("push ups", "Push Up"),
            Map.entry("push-up", "Push Up"),
            Map.entry("push-ups", "Push Up"),
            Map.entry("pushups", "Push Up"),
            Map.entry("dips", "Dip"),
            Map.entry("row", "Barbell Row"),
            Map.entry("barbell rows", "Barbell Row"),
            Map.entry("bent over row", "Barbell Row"),
            Map.entry("bent over rows", "Barbell Row"),
            Map.entry("curls", "Bicep Curl"),
            Map.entry("bicep curls", "Bicep Curl"),
            Map.entry("biceps curl", "Bicep Curl"),
            Map.entry("lunges", "Lunge"),
            Map.entry("run", "Running"),
            Map.entry("ran", "Running"),
            Map.entry("jog", "Running"),
            Map.entry("jogging", "Running"),
            Map.entry("treadmill", "Running"),
            Map.entry("bike", "Cycling"),
            Map.entry("biking", "Cycling"),
            Map.entry("stationary bike", "Cycling"),
            Map.entry("rower", "Rowing"),
            Map.entry("rowing machine", "Rowing"),
            Map.entry("erg", "Rowing"),
            Map.entry("stretch", "Stretching"));

    private ExerciseNames() {}

    public static String canonical(String name) {
        String collapsed = name.strip().replaceAll("\\s+", " ");
        String alias = ALIASES.get(collapsed.toLowerCase(Locale.ROOT));
        return alias != null ? alias : initcap(collapsed);
    }

    /** Postgres initcap: upper-case the first letter of each alphanumeric run, lower-case the rest. */
    static String initcap(String value) {
        StringBuilder out = new StringBuilder(value.length());
        boolean startOfWord = true;
        for (char c : value.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                out.append(startOfWord ? Character.toUpperCase(c) : Character.toLowerCase(c));
                startOfWord = false;
            } else {
                out.append(c);
                startOfWord = true;
            }
        }
        return out.toString();
    }
}

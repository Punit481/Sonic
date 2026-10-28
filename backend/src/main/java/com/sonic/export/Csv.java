package com.sonic.export;

import java.util.Arrays;
import java.util.stream.Collectors;

/** RFC 4180 CSV, safe to open in a spreadsheet. */
final class Csv {

    private final StringBuilder out = new StringBuilder();

    Csv(String... header) {
        row((Object[]) header);
    }

    void row(Object... cells) {
        out.append(Arrays.stream(cells).map(Csv::cell).collect(Collectors.joining(","))).append("\r\n");
    }

    static String cell(Object value) {
        if (value == null) {
            return "";
        }
        String text = value.toString();
        // Spreadsheets run text starting with these as a formula; notes and names are user text.
        if (value instanceof String && !text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0) {
            text = "'" + text;
        }
        if (text.contains(",") || text.contains("\"") || text.contains("\n") || text.contains("\r")) {
            text = "\"" + text.replace("\"", "\"\"") + "\"";
        }
        return text;
    }

    @Override
    public String toString() {
        return out.toString();
    }
}

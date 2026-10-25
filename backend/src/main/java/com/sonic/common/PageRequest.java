package com.sonic.common;

/** 1-based page number and a page size capped at {@link #MAX_SIZE}. */
public record PageRequest(int page, int size) {

    public static final int MAX_SIZE = 100;

    public PageRequest {
        page = Math.max(page, 1);
        size = Math.clamp(size, 1, MAX_SIZE);
    }

    public int offset() {
        return (page - 1) * size;
    }
}

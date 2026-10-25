package com.sonic.common;

import java.util.List;

public record PageResponse<T>(List<T> items, int page, int size, long total, int totalPages) {

    public static <T> PageResponse<T> of(List<T> items, PageRequest request, long total) {
        int totalPages = (int) Math.ceil((double) total / request.size());
        return new PageResponse<>(items, request.page(), request.size(), total, totalPages);
    }
}

package com.bandsync.payload;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

/**
 * High-priority warning that lets every player see an upcoming modulation cue.
 */
public record KeyChangeEvent(
    @JsonProperty("isModulating") boolean isModulating,
    @NotBlank String targetKey,
    @NotBlank String notice
) {
}

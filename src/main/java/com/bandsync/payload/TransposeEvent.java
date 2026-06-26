package com.bandsync.payload;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/**
 * Broadcast after the host transposes so clients can render precomputed chords immediately.
 */
public record TransposeEvent(
    @NotBlank String newKey,
    int semitoneOffset,
    List<String> chords
) {
    public TransposeEvent {
        chords = chords == null ? List.of() : List.copyOf(chords);
    }
}

package com.bandsync.payload;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/**
 * Immutable read model for current song state when an API or UI needs a full snapshot.
 */
public record SongData(
    @NotBlank String songTitle,
    @NotBlank String artist,
    @NotBlank String originalKey,
    @NotBlank String currentKey,
    @NotBlank String currentSection,
    List<String> chords
) {
    public SongData {
        chords = chords == null ? List.of() : List.copyOf(chords);
    }
}

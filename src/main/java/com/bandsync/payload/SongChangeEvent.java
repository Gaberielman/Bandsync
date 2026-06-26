package com.bandsync.payload;

import jakarta.validation.constraints.NotBlank;

/**
 * Host-driven song or section selection update broadcast to the band.
 */
public record SongChangeEvent(
    @NotBlank String songTitle,
    @NotBlank String artist,
    @NotBlank String originalKey,
    @NotBlank String currentSection
) {
}

package com.bandsync.payload;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/**
 * Envelope sent over STOMP so the frontend can switch on a stable message type
 * without Jackson polymorphic deserialization overhead.
 */
public record BandMessage(
    @NotNull MessageType type,
    @NotBlank String roomId,
    @NotNull UserRole senderRole,
    @Valid SongChangeEvent songChange,
    @Valid TransposeEvent transpose,
    @Valid KeyChangeEvent keyChange,
    Instant sentAt
) {
}

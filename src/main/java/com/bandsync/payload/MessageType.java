package com.bandsync.payload;

/**
 * Client-visible event discriminator used by the STOMP message envelope.
 */
public enum MessageType {
    SONG_CHANGE,
    TRANSPOSE,
    KEY_CHANGE
}

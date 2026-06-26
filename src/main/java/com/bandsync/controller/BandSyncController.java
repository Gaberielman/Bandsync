package com.bandsync.controller;

import com.bandsync.payload.BandMessage;
import com.bandsync.payload.MessageType;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

@Controller
@Validated
public class BandSyncController {

    private final SimpMessagingTemplate messagingTemplate;

    public BandSyncController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Accepts host/client actions for a room and relays valid messages to every
     * musician subscribed to /topic/room/{roomId}.
     */
    @MessageMapping("/room/{roomId}/action")
    public void roomAction(@DestinationVariable String roomId, @Valid BandMessage message) {
        BandMessage outbound = switch (message.type()) {
            case SONG_CHANGE -> requireSongChange(message);
            case TRANSPOSE -> requireTranspose(message);
            case KEY_CHANGE -> requireKeyChange(message);
        };

        messagingTemplate.convertAndSend("/topic/room/" + roomId, outbound);
    }

    private static BandMessage requireSongChange(BandMessage message) {
        if (message.songChange() == null) {
            throw new IllegalArgumentException(MessageType.SONG_CHANGE + " requires songChange payload.");
        }
        return message;
    }

    private static BandMessage requireTranspose(BandMessage message) {
        if (message.transpose() == null) {
            throw new IllegalArgumentException(MessageType.TRANSPOSE + " requires transpose payload.");
        }
        return message;
    }

    private static BandMessage requireKeyChange(BandMessage message) {
        if (message.keyChange() == null) {
            throw new IllegalArgumentException(MessageType.KEY_CHANGE + " requires keyChange payload.");
        }
        return message;
    }
}

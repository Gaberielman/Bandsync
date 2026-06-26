package com.bandsync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BandSyncApplication {

    /**
     * Starts the BandSync STOMP backend on port 8080.
     */
    public static void main(String[] args) {
        SpringApplication.run(BandSyncApplication.class, args);
    }
}

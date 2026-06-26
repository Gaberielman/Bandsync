package com.bandsync.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/")
    public String index() {
        return "forward:/index.html";
    }

    @GetMapping("/host")
    public String host() {
        return "forward:/host.html";
    }

    @GetMapping("/member")
    public String member() {
        return "forward:/member.html";
    }

    @GetMapping("/room")
    public String room() {
        return "forward:/member.html";
    }
}

package com.nagarseva;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NagarSevaApplication {

    public static void main(String[] args) {
        SpringApplication.run(NagarSevaApplication.class, args);
    }

}

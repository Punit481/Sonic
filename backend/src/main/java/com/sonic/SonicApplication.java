package com.sonic;

import com.sonic.config.SonicProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(SonicProperties.class)
public class SonicApplication {

    public static void main(String[] args) {
        SpringApplication.run(SonicApplication.class, args);
    }
}

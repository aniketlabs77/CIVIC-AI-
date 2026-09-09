package com.nagarseva.config;

public class PhotoSizeLimitExceededException extends RuntimeException {
    public PhotoSizeLimitExceededException(String message) {
        super(message);
    }
}

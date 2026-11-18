package dev.interview.payments;

import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class PaymentPolicy {
    private static final BigDecimal MAX_DEMO_PAYMENT = new BigDecimal("100000.00");
    private PaymentPolicy() {}

    public static void validate(BigDecimal amount) {
        if (amount == null || amount.compareTo(new BigDecimal("0.01")) < 0
                || amount.compareTo(MAX_DEMO_PAYMENT) > 0 || amount.scale() > 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Demo payment must be between INR 0.01 and INR 100,000.00 with at most 2 decimals");
        }
    }
}

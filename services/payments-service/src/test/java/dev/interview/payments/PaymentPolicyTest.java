package dev.interview.payments;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class PaymentPolicyTest {
    @Test void validAmountAccepted() {
        assertDoesNotThrow(() -> PaymentPolicy.validate(new BigDecimal("125.50")));
    }
    @Test void negativeAmountRejected() {
        assertThrows(ResponseStatusException.class,
            () -> PaymentPolicy.validate(new BigDecimal("-1.00")));
    }
    @Test void oversizedAmountRejected() {
        assertThrows(ResponseStatusException.class,
            () -> PaymentPolicy.validate(new BigDecimal("100000.01")));
    }
}

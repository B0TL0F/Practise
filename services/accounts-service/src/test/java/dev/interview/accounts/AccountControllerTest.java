package dev.interview.accounts;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class AccountControllerTest {
    @Test void demoAccountsExist() {
        var controller = new AccountController();
        assertEquals(3, controller.list().size());
        assertEquals("INR", controller.get("ACC-1001").currency());
    }
    @Test void unknownAccountRejected() {
        assertThrows(ResponseStatusException.class, () -> new AccountController().get("NOPE"));
    }
}

package dev.interview.accounts;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    public record Account(String id, String label, String numberMasked, String currency, BigDecimal demoBalance) {}

    private final List<Account> accounts = List.of(
        new Account("ACC-1001", "Primary account", "•••• 1742", "INR", new BigDecimal("125000.00")),
        new Account("ACC-1002", "Savings account", "•••• 6809", "INR", new BigDecimal("47250.00")),
        new Account("ACC-1003", "Travel account", "•••• 9321", "INR", new BigDecimal("18900.00"))
    );

    @GetMapping
    public List<Account> list() { return accounts; }

    @GetMapping("/{id}")
    public Account get(@PathVariable String id) {
        return accounts.stream().filter(a -> a.id().equals(id)).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown demo account"));
    }
}

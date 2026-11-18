package dev.interview.payments;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    public record PaymentRequest(@NotBlank String accountId,
                                 @NotBlank @Size(max=80) String recipient,
                                 @NotNull BigDecimal amount) {}
    public record Payment(UUID id, String accountId, String recipient,
                          BigDecimal amount, String status, OffsetDateTime createdAt) {}

    private final JdbcTemplate db;
    private final RestClient accountsClient;

    PaymentController(JdbcTemplate db,
                      @Value("${services.accounts.url:http://accounts-service:8080}") String accountsUrl) {
        this.db = db;
        this.accountsClient = RestClient.builder().baseUrl(accountsUrl).build();
    }

    @GetMapping
    public List<Payment> list() {
        return db.query("SELECT id, account_id, recipient, amount, status, created_at FROM payments ORDER BY created_at DESC LIMIT 100",
            (rs, rowNum) -> new Payment(
                rs.getObject("id", UUID.class), rs.getString("account_id"),
                rs.getString("recipient"), rs.getBigDecimal("amount"), rs.getString("status"),
                rs.getObject("created_at", OffsetDateTime.class)));
    }

    @PostMapping
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
    public Payment create(@Valid @RequestBody PaymentRequest request) {
        PaymentPolicy.validate(request.amount());
        try {
            accountsClient.get().uri("/api/accounts/{id}", request.accountId()).retrieve().toBodilessEntity();
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown demo account");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Account service returned an error");
        } catch (org.springframework.web.client.ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Account service is unavailable");
        }
        var id = UUID.randomUUID();
        db.update("INSERT INTO payments(id, account_id, recipient, amount, status, created_at) VALUES (?,?,?,?,?,NOW())",
                id, request.accountId(), request.recipient().trim(), request.amount(), "SIMULATED");
        return db.queryForObject(
            "SELECT id, account_id, recipient, amount, status, created_at FROM payments WHERE id = ?",
            (rs, rowNum) -> new Payment(
                rs.getObject("id", UUID.class), rs.getString("account_id"),
                rs.getString("recipient"), rs.getBigDecimal("amount"), rs.getString("status"),
                rs.getObject("created_at", OffsetDateTime.class)), id);
    }
}

package dev.interview.transactions;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    public record Transaction(UUID id, String accountId, String recipient, BigDecimal amount,
                              String status, OffsetDateTime createdAt) {}
    public record Summary(int transactionCount, BigDecimal totalSimulated, String currency) {}

    private final RestClient paymentsClient;

    TransactionController(@Value("${services.payments.url:http://payments-service:8080}") String paymentsUrl) {
        paymentsClient = RestClient.builder().baseUrl(paymentsUrl).build();
    }

    private List<Transaction> fetch() {
        try {
            Transaction[] response = paymentsClient.get().uri("/api/payments")
                .retrieve().body(Transaction[].class);
            return response == null ? List.of() : Arrays.asList(response);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Payments service is unavailable", ex);
        }
    }

    @GetMapping
    public List<Transaction> list() { return fetch(); }

    @GetMapping("/summary")
    public Summary summary() {
        List<Transaction> transactions = fetch();
        BigDecimal total = transactions.stream().map(Transaction::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Summary(transactions.size(), total, "INR");
    }
}

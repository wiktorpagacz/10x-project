Jasne, oto zaktualizowany schemat bazy danych uwzględniający tabelę `users` zarządzaną przez Supabase.

### 1. Lista tabel z ich kolumnami, typami danych i ograniczeniami

#### Tabela `auth.users`
Przechowuje dane uwierzytelniające użytkowników. **Tabela ta jest tworzona i zarządzana automatycznie przez usługę Supabase Auth.**

| Nazwa kolumny | Typ danych | Ograniczenia/Uwagi |
| :--- | :--- | :--- |
| **encrypted_password**| `VARCHAR(255)`| Zahaszowane hasło użytkownika. |
| **created_at** | `TIMESTAMPTZ`| Znacznik czasu utworzenia konta. `NOT NULL`, domyślnie `NOW()`. |
| **confirmed_at** | `TIMESTAMPTZ`| Znacznik czasu ostatniej aktualizacji danych użytkownika. |

---

#### Tabela `flashcards`
Przechowuje wszystkie fiszki użytkowników.

| Nazwa kolumny | Typ danych | Ograniczenia/Uwagi |
| :--- | :--- | :--- |
| **id** | `BIGSERIAL` | **Klucz główny**, autoinkrementacja. |
| **user_id** | `UUID` | **Klucz obcy** do `auth.users(id)`, `NOT NULL`, `ON DELETE CASCADE`. |
| **generation_id** | `BIGINT` | **Klucz obcy** do `generations(id)`, `NULL`-owalny, `ON DELETE SET NULL`. |
| **front** | `VARCHAR(200)`| `NOT NULL`. |
| **back** | `VARCHAR(500)`| `NOT NULL`. |
| **source** | `VARCHAR(15)`| `NOT NULL`, ograniczenie `CHECK` (wartości: 'ai-full', 'ai-edited', 'manual'). |
| **created_at** | `TIMESTAMPTZ`| `NOT NULL`, domyślnie `NOW()`. |
| **updated_at** | `TIMESTAMPTZ`| `NOT NULL`, domyślnie `NOW()`. Aktualizowane automatycznie przez trigger. |
| **fts_vector** | `TSVECTOR` | Kolumna generowana automatycznie do wyszukiwania pełnotekstowego. |

---

#### Tabela `generations`
Loguje każdą sesję generowania fiszek przez AI.

| Nazwa kolumny | Typ danych | Ograniczenia/Uwagi |
| :--- | :--- | :--- |
| **id** | `BIGSERIAL` | **Klucz główny**, autoinkrementacja. |
| **user_id** | `UUID` | **Klucz obcy** do `auth.users(id)`, `NOT NULL`, `ON DELETE CASCADE`. |
| **model** | `VARCHAR(50)`| `NOT NULL`. |
| **generated_count** | `INTEGER` | `NOT NULL`, domyślnie `0`. |
| **accepted_unedited_count** | `INTEGER` | `NOT NULL`, domyślnie `0`. |
| **accepted_edited_count** | `INTEGER` | `NOT NULL`, domyślnie `0`. |
| **source_text_hash** | `TEXT` | `NOT NULL`, przechowuje hash SHA-256 tekstu źródłowego. |
| **source_text_length** | `INTEGER` | `NOT NULL`, ograniczenie `CHECK` (`source_text_length` BETWEEN 1000 AND 10000). |
| **generation_duration** | `INTEGER`| `NOT NULL`, domyślnie `NOW()`. |
| **created_at** | `TIMESTAMPTZ`| `NOT NULL`, domyślnie `NOW()`. |
| **accepted_at** | `TIMESTAMPTZ`| `NULL`-owalny. Uzupełniany po zakończeniu recenzji. |

---

#### Tabela `generation_error_logs`
Rejestruje błędy, które wystąpiły podczas generowania fiszek.

| Nazwa kolumny | Typ danych | Ograniczenia/Uwagi |
| :--- | :--- | :--- |
| **id** | `BIGSERIAL` | **Klucz główny**, autoinkrementacja. |
| **user_id** | `UUID` | **Klucz obcy** do `auth.users(id)`, `NOT NULL`, `ON DELETE CASCADE`. |
| **model** | `VARCHAR(50)`| `NOT NULL`. |
| **source_text_hash**| `VARCHAR` | `NOT NULL`. |
| **source_text_length**| `INTEGER` | `NOT NULL`, ograniczenie `CHECK` (`source_text_length` BETWEEN 1000 AND 10000). |
| **error_code** | `VARCHAR(100)`| `NOT NULL`. |
| **error_message**| `TEXT` | `NOT NULL`. |
| **created_at** | `TIMESTAMPTZ`| `NOT NULL`, domyślnie `NOW()`. |

---

#### Widok `user_flashcard_count`
Zoptymalizowany widok do szybkiego sprawdzania liczby fiszek posiadanych przez każdego użytkownika.

| Nazwa kolumny | Typ danych | Opis |
| :--- | :--- | :--- |
| **user_id** | `UUID` | Identyfikator użytkownika. |
| **flashcard_count**| `BIGINT` | Całkowita liczba fiszek posiadanych przez użytkownika. |

### 2. Relacje między tabelami

-   **`auth.users` ↔ `flashcards`**: Relacja **jeden-do-wielu**. Jeden użytkownik może mieć wiele fiszek.
-   **`auth.users` ↔ `generations`**: Relacja **jeden-do-wielu**. Jeden użytkownik może mieć wiele sesji generowania.
-   **`auth.users` ↔ `generation_error_logs`**: Relacja **jeden-do-wielu**. Jeden użytkownik może mieć wiele logów błędów.
-   **`generations` ↔ `flashcards`**: Relacja **jeden-do-wielu**. Jedna sesja generowania może stworzyć wiele fiszek. Klucz obcy `flashcards(generation_id)` jest opcjonalny.

### 3. Indeksy

-   **Indeksy B-Tree** (dla optymalizacji złączeń i filtrowania):
    -   Na kolumnie `user_id` w tabeli `flashcards`.
    -   Na kolumnie `generation_id` w tabeli `flashcards`.
    -   Na kolumnie `user_id` w tabeli `generations`.
    -   Na kolumnie `user_id` w tabeli `generation_error_logs`.
-   **Indeks GIN** (dla wydajnego wyszukiwania pełnotekstowego):
    -   Na kolumnie `fts_vector` w tabeli `flashcards`.

### 4. Zasady PostgreSQL (Row-Level Security)

Dla tabel `flashcards`, `generations` i `generation_error_logs` włączone jest zabezpieczenie na poziomie wiersza (RLS). Zdefiniowane polityki zapewniają, że użytkownicy mogą wykonywać wszystkie operacje (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) wyłącznie na swoich własnych danych, gdzie identyfikator zalogowanego użytkownika (`auth.uid()`) jest zgodny z wartością w kolumnie `user_id`.

### 5. Wszelkie dodatkowe uwagi lub wyjaśnienia dotyczące decyzji projektowych

1.  **Zarządzanie Użytkownikami**: Tabela `auth.users` jest w całości zarządzana przez usługę **Supabase Auth**. Wszystkie relacje w aplikacji opierają się na kluczu `id` z tej tabeli.
2.  **Integralność Danych**: Użycie `ON DELETE CASCADE` na kluczach obcych `user_id` gwarantuje, że usunięcie konta użytkownika spowoduje automatyczne usunięcie wszystkich powiązanych z nim danych, co zapobiega osieroceniu rekordów.
3.  **Aktualizacja Znaczników Czasu**: Kolumna `updated_at` w tabeli `flashcards` jest zarządzana przez niestandardową funkcję i trigger w bazie danych, co zapewnia automatyczną aktualizację przy każdej modyfikacji rekordu.
4.  **Odpowiedzialność Logiki Aplikacji**: Aktualizacja liczników (`generated_count`, `accepted_unedited_count`, `accepted_edited_count`) oraz pola `accepted_at` w tabeli `generations` leży po stronie logiki biznesowej aplikacji i powinna być realizowana transakcyjnie.
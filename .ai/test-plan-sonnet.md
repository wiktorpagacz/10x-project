# Plan Testów - Aplikacja do Generowania Fiszek z Wykorzystaniem AI

## 1. Wprowadzenie i Cele Testowania

### 1.1 Cel dokumentu
Niniejszy dokument definiuje kompleksową strategię testowania aplikacji do generowania fiszek edukacyjnych z użyciem sztucznej inteligencji. Celem testów jest zapewnienie wysokiej jakości, bezpieczeństwa i niezawodności systemu przed wdrożeniem produkcyjnym.

### 1.2 Cele testowania
- **Weryfikacja funkcjonalności**: Potwierdzenie, że wszystkie funkcje działają zgodnie z wymaganiami
- **Zapewnienie jakości kodu**: Wykrycie błędów logicznych, problemów z obsługą wyjątków i edge cases
- **Bezpieczeństwo**: Walidacja mechanizmów autoryzacji, autentykacji i ochrony danych użytkownika
- **Wydajność**: Potwierdzenie, że system obsługuje zakładane obciążenie i spełnia wymagania czasowe
- **Kompatybilność**: Sprawdzenie poprawności działania w różnych środowiskach i przeglądarkach
- **Doświadczenie użytkownika**: Walidacja responsywności, dostępności (a11y) i intuicyjności interfejsu

### 1.3 Zakres projektu
Aplikacja webowa do generowania fiszek edukacyjnych z tekstu źródłowego z wykorzystaniem modeli AI. System umożliwia:
- Rejestrację i autentykację użytkowników
- Generowanie fiszek z tekstu (1000-10000 znaków) przy użyciu API OpenRouter
- Zarządzanie kolekcją fiszek (CRUD operations)
- System powtórek oparty na algorytmie spaced repetition
- Pełnotekstowe wyszukiwanie w fiszkach

## 2. Zakres Testów

### 2.1 Funkcjonalności objęte testami

#### 2.1.1 Moduł Autentykacji i Autoryzacji
- Rejestracja nowych użytkowników
- Logowanie użytkowników (email + hasło)
- Wylogowanie użytkowników
- Odzyskiwanie hasła
- Weryfikacja sesji użytkownika
- Row-Level Security (RLS) w bazie danych

#### 2.1.2 Moduł Generowania Fiszek
- Walidacja długości tekstu źródłowego (1000-10000 znaków)
- Integracja z OpenRouter API
- Hashowanie tekstu źródłowego (SHA-256) do deduplikacji
- Obsługa błędów API (timeout, rate limiting, błędy modelu)
- Mechanizm retry z exponential backoff
- Zapisywanie logów błędów generacji
- Tryb mock dla rozwoju i testowania

#### 2.1.3 Moduł Zarządzania Fiszkami
- Tworzenie fiszek (pojedynczo i wsadowo)
- Pobieranie listy fiszek z paginacją
- Pobieranie szczegółów pojedynczej fiszki
- Aktualizacja fiszek
- Usuwanie fiszek
- Pełnotekstowe wyszukiwanie (FTS)
- Śledzenie źródła fiszki (manual, ai-full, ai-edited)

#### 2.1.4 Moduł Systemu Powtórek
- Pobieranie fiszek do powtórki (spaced repetition)
- Algorytm ustalania kolejnej daty powtórki
- Losowanie kolejności prezentacji fiszek
- Śledzenie postępów w nauce

### 2.2 Funkcjonalności wyłączone z testów
- Hosting i deployment infrastructure (DigitalOcean)
- Konfiguracja CI/CD pipeline (GitHub Actions) - testowany oddzielnie
- Wewnętrzne mechanizmy Supabase Auth (zakładamy poprawność działania jako managed service)

### 2.3 Kryteria wejścia
- Kompletny kod źródłowy dostępny w repozytorium
- Działające środowisko deweloperskie
- Dostęp do instancji Supabase (lokalna lub dev)
- Klucz API OpenRouter (lub włączony tryb mock)
- Dokumentacja techniczna i diagramy architektury
- Zdefiniowane wymagania funkcjonalne i niefunkcjonalne

### 2.4 Kryteria wyjścia
- 100% pokrycia testami jednostkowymi dla serwisów i funkcji utility
- 90% pokrycia testami integracyjnymi dla endpointów API
- Wszystkie testy end-to-end dla critical path przeprowadzone i przeszły pomyślnie
- Zero błędów krytycznych (blocker/critical)
- Maksymalnie 5 błędów o średnim priorytecie
- Wszystkie błędy dokumentowane w systemie zgłaszania
- Testy wydajnościowe potwierdzone z wynikami w granicach SLA
- Testy bezpieczeństwa przeprowadzone bez wykrytych luk krytycznych

## 3. Typy Testów do Przeprowadzenia

### 3.1 Testy Jednostkowe (Unit Tests)

#### 3.1.1 Zakres
Testy izolowanych funkcji, klas i komponentów bez zależności zewnętrznych.

#### 3.1.2 Priorytety
- **Priorytet 1 (Krytyczny)**:
  - Funkcje serwisowe w `src/lib/services/`:
    - `flashcard.service.ts` - getFlashcards, createFlashcard, batchCreateFlashcards
    - `generation.service.ts` - generateFlashcardsFromText, obsługa błędów
    - `review.service.ts` - getFlashcardsDueForReview, algorytm shuffling
    - `openrouter.service.ts` - komunikacja z API, parsowanie odpowiedzi
  - Funkcje utility:
    - `crypto.ts` - sha256 hashing
    - `utils.ts` - funkcje pomocnicze (cn, formatDate, etc.)
  - Hooki React w `src/components/*/hooks/`:
    - `useGenerationViewState.ts` - state machine generacji
    - `useLoginForm.ts`, `useRegisterForm.ts` - walidacja formularzy
    - `useCharacterCounter.ts` - logika liczenia znaków

- **Priorytet 2 (Wysoki)**:
  - Komponenty UI bez side effects:
    - `ProgressBar.tsx`, `CharacterCounter.tsx`
    - Komponenty shadcn/ui (jeśli zmodyfikowane)
  - Walidacja Zod schemas w endpointach API

#### 3.1.3 Techniki testowania
- **Mocking**: Mock zewnętrznych zależności (Supabase client, fetch API)
- **Stubbing**: Stub odpowiedzi z API
- **Spy functions**: Śledzenie wywołań funkcji
- **Parametrized tests**: Testy z wieloma zestawami danych wejściowych
- **Edge cases**: Puste stringi, wartości null/undefined, wartości graniczne

#### 3.1.4 Przykładowe scenariusze testowe

**TS-UNIT-001: Walidacja długości tekstu w generateFlashcardsFromText**
- **Kroki**:
  1. Wywołaj funkcję z tekstem < 1000 znaków
  2. Wywołaj funkcję z tekstem = 1000 znaków
  3. Wywołaj funkcję z tekstem = 10000 znaków
  4. Wywołaj funkcję z tekstem > 10000 znaków
- **Oczekiwany rezultat**:
  - Przypadek 1: Rzuć błąd walidacji
  - Przypadek 2, 3: Sukces
  - Przypadek 4: Rzuć błąd walidacji

**TS-UNIT-002: SHA-256 hashing jest deterministyczny**
- **Kroki**:
  1. Wywołaj sha256() z tym samym tekstem 100 razy
- **Oczekiwany rezultat**: Wszystkie hashe są identyczne

**TS-UNIT-003: getFlashcards - paginacja**
- **Kroki**:
  1. Mock 50 fiszek w bazie
  2. Pobierz stronę 1, pageSize=20
  3. Pobierz stronę 2, pageSize=20
  4. Pobierz stronę 3, pageSize=20
- **Oczekiwany rezultat**:
  - Strona 1: 20 fiszek, totalPages=3
  - Strona 2: 20 fiszek, totalPages=3
  - Strona 3: 10 fiszek, totalPages=3

**TS-UNIT-004: useGenerationViewState - state machine**
- **Kroki**:
  1. Stan początkowy: 'idle'
  2. Wywołaj startGeneration()
  3. Wywołaj completeGeneration()
  4. Wywołaj startGeneration() ponownie
  5. Wywołaj setGenerationError()
  6. Wywołaj retryGeneration()
- **Oczekiwany rezultat**:
  - Krok 1: status='idle'
  - Krok 2: status='generating'
  - Krok 3: status='reviewing'
  - Krok 4: Błąd (nie można generować podczas reviewing)
  - Krok 5: status='error'
  - Krok 6: status='generating', retryCount=1

**TS-UNIT-005: Fisher-Yates shuffle nie zmienia długości ani elementów**
- **Kroki**:
  1. Stwórz tablicę 100 unikalnych elementów
  2. Wywołaj shuffleArray()
  3. Porównaj długości i zawartość (set)
- **Oczekiwany rezultat**:
  - Długość niezmieniona
  - Wszystkie elementy obecne (zbiór przed == zbiór po)
  - Kolejność różna (z prawdopodobieństwem ~100%)

### 3.2 Testy Integracyjne (Integration Tests)

#### 3.2.1 Zakres
Testy integracji między komponentami, szczególnie API endpoints z serwisami i bazą danych.

#### 3.2.2 Priorytety
- **Priorytet 1 (Krytyczny)**:
  - Endpointy autentykacji:
    - POST /api/auth/login
    - POST /api/auth/register
    - POST /api/auth/logout
  - Endpointy generacji:
    - POST /api/generations (z mockiem OpenRouter)
  - Endpointy fiszek:
    - GET /api/flashcards (z paginacją i wyszukiwaniem)
    - POST /api/flashcards
    - POST /api/flashcards/batch
    - GET /api/flashcards/[id]
    - PUT /api/flashcards/[id]
    - DELETE /api/flashcards/[id]
  - Endpointy powtórek:
    - GET /api/reviews

- **Priorytet 2 (Wysoki)**:
  - Middleware (autentykacja, rate limiting)
  - Integracja z Supabase (operacje CRUD)
  - Full-text search w PostgreSQL

#### 3.2.3 Techniki testowania
- **Test database**: Osobna instancja bazy danych dla testów
- **Database seeding**: Przygotowanie danych testowych
- **Transaction rollback**: Rollback po każdym teście dla izolacji
- **API testing**: Symulacja requestów HTTP
- **Mock external services**: Mock OpenRouter API

#### 3.2.4 Przykładowe scenariusze testowe

**TS-INT-001: POST /api/auth/register - pomyślna rejestracja**
- **Warunki wstępne**: Baza danych pusta
- **Kroki**:
  1. Wyślij POST /api/auth/register z poprawnym email i hasłem (min 6 znaków)
  2. Sprawdź response status
  3. Sprawdź bazę danych Supabase Auth
- **Oczekiwany rezultat**:
  - Status 200
  - Zwrócony user object z id i email
  - Użytkownik utworzony w auth.users

**TS-INT-002: POST /api/auth/register - duplikat email**
- **Warunki wstępne**: Użytkownik test@example.com istnieje
- **Kroki**:
  1. Wyślij POST /api/auth/register z email test@example.com
- **Oczekiwany rezultat**:
  - Status 400
  - Kod błędu: USER_ALREADY_EXISTS

**TS-INT-003: POST /api/auth/login - poprawne dane**
- **Warunki wstępne**: Użytkownik test@example.com z hasłem "password123" istnieje
- **Kroki**:
  1. Wyślij POST /api/auth/login z poprawnymi danymi
  2. Sprawdź response
  3. Sprawdź cookies/session
- **Oczekiwany rezultat**:
  - Status 200
  - Zwrócony user object
  - Session cookie ustawiony

**TS-INT-004: POST /api/auth/login - niepoprawne hasło**
- **Warunki wstępne**: Użytkownik test@example.com istnieje
- **Kroki**:
  1. Wyślij POST /api/auth/login z niepoprawnym hasłem
- **Oczekiwany rezultat**:
  - Status 401
  - Komunikat: "Invalid credentials"

**TS-INT-005: POST /api/generations - generacja z mockiem**
- **Warunki wstępne**:
  - Użytkownik zalogowany
  - OpenRouter API zmockowany (zwraca 5 fiszek)
- **Kroki**:
  1. Wyślij POST /api/generations z tekstem 2000 znaków
  2. Sprawdź response
  3. Sprawdź bazę danych (tabela generations i flashcards)
- **Oczekiwany rezultat**:
  - Status 200
  - generation_id i suggested_flashcards w response
  - Rekord w generations z source_text_hash
  - 5 sugerowanych fiszek w response

**TS-INT-006: POST /api/generations - rate limiting**
- **Warunki wstępne**: Użytkownik zalogowany
- **Kroki**:
  1. Wyślij 5 requestów POST /api/generations w ciągu 30 sekund
  2. Wyślij 6. request
- **Oczekiwany rezultat**:
  - Requesty 1-5: Status 200
  - Request 6: Status 429 (Too Many Requests)
  - Komunikat: "Maximum 5 requests per minute allowed"

**TS-INT-007: GET /api/flashcards - paginacja i wyszukiwanie**
- **Warunki wstępne**:
  - Użytkownik zalogowany
  - 50 fiszek w bazie (25 o tematyce "historia", 25 o tematyce "biologia")
- **Kroki**:
  1. GET /api/flashcards?page=1&pageSize=20
  2. GET /api/flashcards?page=2&pageSize=20
  3. GET /api/flashcards?search=historia&page=1&pageSize=20
- **Oczekiwany rezultat**:
  - Request 1: 20 fiszek, totalPages=3
  - Request 2: 20 fiszek, totalPages=3
  - Request 3: ~25 fiszek (wszystkie z "historia" w tekście), poprawny totalPages

**TS-INT-008: POST /api/flashcards/batch - zapis wsadowy**
- **Warunki wstępne**:
  - Użytkownik zalogowany
  - Generation ID=123 istnieje
- **Kroki**:
  1. Wyślij POST /api/flashcards/batch z 10 fiszkami
  2. Sprawdź response
  3. Sprawdź bazę danych
- **Oczekiwany rezultat**:
  - Status 200
  - created_count=10 w response
  - 10 nowych fiszek w tabeli flashcards z generation_id=123
  - Poprawne wartości source (ai-full lub ai-edited)

**TS-INT-009: GET /api/reviews - fiszki do powtórki**
- **Warunki wstępne**:
  - Użytkownik zalogowany
  - 20 fiszek w bazie
  - 10 fiszek ma next_review_date <= dziś
  - 10 fiszek ma next_review_date > dziś
- **Kroki**:
  1. Wyślij GET /api/reviews
  2. Sprawdź response
- **Oczekiwany rezultat**:
  - Status 200
  - Zwrócone 10 fiszek (tylko te do powtórki)
  - Kolejność losowa (sprawdzić 2 wywołania)

**TS-INT-010: Middleware - ochrona nieautoryzowanych requestów**
- **Warunki wstępne**: Użytkownik niezalogowany
- **Kroki**:
  1. Wyślij GET /api/flashcards bez session cookie
  2. Wyślij POST /api/generations bez session cookie
- **Oczekiwany rezultat**:
  - Status 401 dla obu requestów
  - Komunikat: "Unauthorized"

**TS-INT-011: RLS - izolacja danych użytkowników**
- **Warunki wstępne**:
  - User A zalogowany, posiada 10 fiszek
  - User B zalogowany, posiada 15 fiszek
- **Kroki**:
  1. Jako User A: GET /api/flashcards
  2. Jako User B: GET /api/flashcards
  3. Jako User A: próba GET /api/flashcards/[id_fiszki_userB]
- **Oczekiwany rezultat**:
  - Request 1: 10 fiszek User A
  - Request 2: 15 fiszek User B
  - Request 3: Status 404 lub 403

### 3.3 Testy End-to-End (E2E Tests)

#### 3.3.1 Zakres
Testy pełnych scenariuszy użytkownika od UI do bazy danych.

#### 3.3.2 Narzędzia
- **Playwright** lub **Cypress** - automatyzacja przeglądarki
- **Real database** - testy na środowisku zbliżonym do produkcji

#### 3.3.3 Priorytety
- **Priorytet 1 (Krytyczny)**:
  - Critical User Journey: Rejestracja → Logowanie → Generacja fiszek → Zapis fiszek → Powtórka
  - Happy path dla wszystkich głównych funkcji

- **Priorytet 2 (Wysoki)**:
  - Error handling w UI
  - Navigation i routing
  - Responsywność na urządzeniach mobilnych

#### 3.3.4 Przykładowe scenariusze testowe

**TS-E2E-001: Pełny flow użytkownika (Critical Path)**
- **Kroki**:
  1. Otwórz /register
  2. Zarejestruj nowego użytkownika
  3. Zostań przekierowany do /login
  4. Zaloguj się
  5. Zostań przekierowany do / (dashboard)
  6. Wklej tekst 2000 znaków
  7. Kliknij "Generate Flashcards"
  8. Poczekaj na generację (sprawdź progress bar)
  9. Zobacz listę sugerowanych fiszek
  10. Edytuj 2 fiszki
  11. Zaznacz 8 fiszek do zapisu
  12. Kliknij "Save Selected"
  13. Zobacz potwierdzenie sukcesu
  14. Przejdź do listy fiszek
  15. Zweryfikuj 8 zapisanych fiszek (2 ai-edited, 6 ai-full)
- **Oczekiwany rezultat**: Wszystkie kroki wykonane bez błędów

**TS-E2E-002: Generacja fiszek - obsługa błędu API**
- **Warunki wstępne**: Użytkownik zalogowany
- **Kroki**:
  1. Symuluj błąd OpenRouter API (mock lub wyłącz API key)
  2. Wklej tekst i kliknij Generate
  3. Obserwuj UI
- **Oczekiwany rezultat**:
  - Toast notification z błędem
  - Przycisk "Retry" widoczny
  - Po kliknięciu Retry - ponowna próba generacji

**TS-E2E-003: Wyszukiwanie fiszek**
- **Warunki wstępne**:
  - Użytkownik zalogowany
  - 50 fiszek w bazie danych
- **Kroki**:
  1. Przejdź do listy fiszek
  2. Wpisz "JavaScript" w pole wyszukiwania
  3. Naciśnij Enter
  4. Obserwuj wyniki
- **Oczekiwany rezultat**:
  - Lista filtruje się do fiszek zawierających "JavaScript"
  - Pagination aktualizuje się poprawnie
  - URL zawiera query parameter ?search=JavaScript

**TS-E2E-004: Responsywność na urządzeniach mobilnych**
- **Kroki**:
  1. Otwórz aplikację na viewport 375x667 (iPhone)
  2. Przejdź przez główne ekrany:
     - Login
     - Dashboard
     - Generation view
     - Flashcard list
  3. Sprawdź czytelność i dostępność elementów
- **Oczekiwany rezultat**:
  - Wszystkie elementy czytelne
  - Brak poziomego scrollowania
  - Przyciski dostępne (nie zasłonięte)
  - Navigation działa poprawnie

**TS-E2E-005: Navigation blocking podczas reviewing**
- **Warunki wstępne**: Użytkownik w stanie "reviewing" (po generacji)
- **Kroki**:
  1. Próbuj opuścić stronę (kliknij Back, Close tab)
  2. Obserwuj dialog
  3. Anuluj dialog
  4. Zapisz fiszki
  5. Próbuj opuścić stronę ponownie
- **Oczekiwany rezultat**:
  - Krok 2: Dialog potwierdzenia "You have unsaved changes"
  - Krok 3: Pozostajesz na stronie
  - Krok 5: Brak dialogu, swobodna nawigacja

### 3.4 Testy Wydajnościowe (Performance Tests)

#### 3.4.1 Zakres
Weryfikacja czasów odpowiedzi i zachowania pod obciążeniem.

#### 3.4.2 Narzędzia
- **Apache JMeter** lub **k6** - load testing
- **Lighthouse** - wydajność frontendu
- **Chrome DevTools Performance tab** - analiza renderowania

#### 3.4.3 Metryki docelowe
- **Time to First Byte (TTFB)**: < 200ms (dla API endpoints)
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **API Response Time**:
  - GET endpoints: < 100ms (95th percentile)
  - POST endpoints (bez AI): < 200ms (95th percentile)
  - POST /api/generations (z AI): < 10s (95th percentile)

#### 3.4.4 Przykładowe scenariusze testowe

**TS-PERF-001: Load test - GET /api/flashcards**
- **Konfiguracja**:
  - 100 concurrent users
  - Duration: 5 minut
  - Think time: 2-5 sekund
- **Kroki**:
  1. Każdy user loguje się
  2. Wykonuje GET /api/flashcards z losową paginacją
  3. Powtarza kroki 2-3
- **Oczekiwany rezultat**:
  - 95th percentile response time < 100ms
  - Error rate < 1%
  - Database connection pool nie wyczerpany

**TS-PERF-002: Stress test - POST /api/generations**
- **Konfiguracja**:
  - 50 concurrent users
  - Duration: 3 minuty
  - Ramp-up: 30 sekund
- **Kroki**:
  1. Każdy user wykonuje POST /api/generations
  2. Monitoruj rate limiting (5 req/min per user)
- **Oczekiwany rezultat**:
  - 95th percentile response time < 10s
  - Rate limiting działa (6. request zwraca 429)
  - OpenRouter API nie przeciążone
  - Brak memory leaks

**TS-PERF-003: Frontend Performance - Generation View**
- **Narzędzie**: Lighthouse
- **Kroki**:
  1. Załaduj /generate
  2. Uruchom Lighthouse audit
- **Oczekiwany rezultat**:
  - Performance score > 90
  - FCP < 1.8s
  - LCP < 2.5s
  - TTI < 3.5s
  - CLS < 0.1

**TS-PERF-004: Database query optimization - Full-text search**
- **Warunki wstępne**: 10,000 fiszek w bazie
- **Kroki**:
  1. Wykonaj GET /api/flashcards?search=common_word
  2. Zmierz czas odpowiedzi
  3. Sprawdź query plan w PostgreSQL (EXPLAIN ANALYZE)
- **Oczekiwany rezultat**:
  - Response time < 150ms
  - GIN index na fts_vector wykorzystany
  - Brak sequential scan

**TS-PERF-005: Memory leak test - długotrwała sesja**
- **Konfiguracja**: Single user, 60 minut sesji
- **Kroki**:
  1. User wykonuje mix operacji (generacja, CRUD fiszek)
  2. Monitoruj memory usage w przeglądarce (Chrome DevTools)
- **Oczekiwany rezultat**:
  - Brak nieograniczonego wzrostu memory
  - Memory usage stabilizuje się < 150MB

### 3.5 Testy Bezpieczeństwa (Security Tests)

#### 3.5.1 Zakres
Weryfikacja mechanizmów bezpieczeństwa i ochrony przed typowymi atakami.

#### 3.5.2 Narzędzia
- **OWASP ZAP** - automatyczne skanowanie podatności
- **Manual penetration testing** - testy manualne
- **Burp Suite Community** - analiza requestów

#### 3.5.3 Przykładowe scenariusze testowe

**TS-SEC-001: SQL Injection w wyszukiwaniu**
- **Kroki**:
  1. Wyślij GET /api/flashcards?search=' OR '1'='1
  2. Wyślij GET /api/flashcards?search='; DROP TABLE flashcards; --
- **Oczekiwany rezultat**:
  - Brak wykonania SQL injection
  - Parametry prawidłowo escapowane przez Supabase client
  - Status 200 lub 400 (walidacja)

**TS-SEC-002: XSS w treści fiszek**
- **Kroki**:
  1. Stwórz fiszkę z front: `<script>alert('XSS')</script>`
  2. Wyświetl fiszkę w UI
  3. Sprawdź DevTools Console
- **Oczekiwany rezultat**:
  - Script nie wykonany
  - React automatycznie escapuje HTML
  - Treść wyświetlona jako plain text

**TS-SEC-003: CSRF - unauthorized actions**
- **Kroki**:
  1. User A zalogowany
  2. Z innej domeny wyślij POST /api/flashcards z credentials User A
- **Oczekiwany rezultat**:
  - Request odrzucony (CORS policy lub CSRF token)
  - Status 403 lub 401

**TS-SEC-004: Authorization bypass - dostęp do cudzych fiszek**
- **Warunki wstępne**:
  - User A zalogowany
  - User B posiada fiszkę ID=999
- **Kroki**:
  1. Jako User A: wyślij GET /api/flashcards/999
  2. Jako User A: wyślij PUT /api/flashcards/999
  3. Jako User A: wyślij DELETE /api/flashcards/999
- **Oczekiwany rezultat**:
  - Wszystkie requesty zwracają 403 lub 404
  - Dane User B niezmienione

**TS-SEC-005: Rate limiting bypass**
- **Kroki**:
  1. Wyślij 6 requestów POST /api/generations w ciągu minuty
  2. Zmień User-Agent i wyślij kolejne 6 requestów
  3. Zmień IP (proxy) i wyślij kolejne 6 requestów
- **Oczekiwany rezultat**:
  - Request 6 w kroku 1: Status 429
  - Kroki 2-3: Rate limiting nadal działa (bazuje na user_id, nie IP/UA)

**TS-SEC-006: Sensitive data exposure w API responses**
- **Kroki**:
  1. Wyślij GET /api/flashcards
  2. Sprawdź response JSON
  3. Wyślij GET /api/reviews
  4. Sprawdź response JSON
- **Oczekiwany rezultat**:
  - Brak pól: user_id, password hash, fts_vector, internal IDs
  - Tylko publiczne DTO fields (zgodnie z typami w src/types.ts)

**TS-SEC-007: Password strength validation**
- **Kroki**:
  1. Próbuj zarejestrować się z hasłem "123"
  2. Próbuj zarejestrować się z hasłem "password"
  3. Próbuj zarejestrować się z hasłem "P@ssw0rd!"
- **Oczekiwany rezultat**:
  - Krok 1: Błąd (za krótkie, min 6 znaków)
  - Krok 2: Sukces (jeśli >= 6 znaków) lub zalecenie silniejszego hasła
  - Krok 3: Sukces

**TS-SEC-008: Session fixation i hijacking**
- **Kroki**:
  1. User A loguje się, otrzymuje session cookie
  2. User B próbuje użyć session cookie User A
  3. User A wylogowuje się
  4. User B próbuje użyć starego cookie User A
- **Oczekiwany rezultat**:
  - Krok 2: Zależne od implementacji Supabase (prawdopodobnie odrzucone)
  - Krok 4: Session nieważna, Status 401

### 3.6 Testy Dostępności (Accessibility Tests)

#### 3.6.1 Zakres
Weryfikacja zgodności z WCAG 2.1 Level AA.

#### 3.6.2 Narzędzia
- **axe DevTools** - automatyczne wykrywanie problemów a11y
- **NVDA/JAWS** - screen reader testing
- **Lighthouse Accessibility audit**
- **Manual keyboard navigation testing**

#### 3.6.3 Przykładowe scenariusze testowe

**TS-A11Y-001: Keyboard navigation - pełna funkcjonalność**
- **Kroki**:
  1. Bez myszy, nawiguj przez całą aplikację używając Tab/Shift+Tab
  2. Użyj Enter/Space do aktywacji przycisków
  3. Użyj Escape do zamykania dialogów
  4. Użyj strzałek w listach fiszek
- **Oczekiwany rezultat**:
  - Wszystkie interaktywne elementy osiągalne
  - Focus indicator widoczny
  - Focus trap w modalach/dialogach
  - Logiczna kolejność tabulacji

**TS-A11Y-002: Screen reader - formularz logowania**
- **Narzędzie**: NVDA (Windows) lub VoiceOver (macOS)
- **Kroki**:
  1. Otwórz /login
  2. Użyj screen readera do nawigacji
  3. Wypełnij formularz
  4. Wyślij formularz
  5. Posłuchaj komunikatów błędów (jeśli są)
- **Oczekiwany rezultat**:
  - Label'e pól formularza odczytane poprawnie
  - Komunikaty błędów połączone z polami (aria-describedby)
  - Status submission odczytany (toast lub live region)

**TS-A11Y-003: Color contrast - wszystkie teksty**
- **Narzędzie**: Lighthouse + manual inspection
- **Kroki**:
  1. Sprawdź contrast ratio dla wszystkich tekstów (body, headings, buttons)
  2. Sprawdź contrast w dark mode (jeśli istnieje)
- **Oczekiwany rezultat**:
  - Normal text: ≥ 4.5:1
  - Large text (≥18pt): ≥ 3:1
  - UI components: ≥ 3:1

**TS-A11Y-004: ARIA attributes - correctness**
- **Narzędzie**: axe DevTools
- **Kroki**:
  1. Skanuj wszystkie strony aplikacji
  2. Sprawdź raporty błędów
- **Oczekiwany rezultat**:
  - Brak critical/serious issues w axe
  - ARIA roles poprawnie użyte
  - aria-label/aria-labelledby obecne gdzie potrzebne
  - aria-live regions dla dynamicznych aktualizacji

**TS-A11Y-005: Focus management - modal dialog**
- **Kroki**:
  1. Otwórz modal FlashcardModal
  2. Sprawdź, czy focus przeskoczył do modala
  3. Próbuj Tab poza modal
  4. Zamknij modal (Escape lub przycisk)
  5. Sprawdź, gdzie wrócił focus
- **Oczekiwany rezultat**:
  - Focus automatycznie w modalu przy otwarciu
  - Focus trap - Tab nie wychodzi poza modal
  - Po zamknięciu focus wraca do triggera (przycisku, który otworzył modal)

### 3.7 Testy Kompatybilności (Compatibility Tests)

#### 3.7.1 Zakres
Weryfikacja działania w różnych przeglądarkach, OS i urządzeniach.

#### 3.7.2 Testowane środowiska
- **Desktop**:
  - Chrome (latest, latest-1)
  - Firefox (latest, latest-1)
  - Safari (latest, macOS)
  - Edge (latest, Windows)
- **Mobile**:
  - Chrome Mobile (Android)
  - Safari Mobile (iOS latest, latest-1)
  - Samsung Internet (Android)
- **Rozdzielczości**:
  - Desktop: 1920x1080, 1366x768
  - Tablet: 768x1024
  - Mobile: 375x667, 414x896

#### 3.7.3 Przykładowe scenariusze testowe

**TS-COMP-001: Cross-browser - critical path**
- **Kroki**:
  1. Powtórz TS-E2E-001 (Critical Path) na każdej przeglądarce z listy
- **Oczekiwany rezultat**:
  - Identyczna funkcjonalność we wszystkich przeglądarkach
  - Brak błędów JavaScript w console

**TS-COMP-002: Responsive - mobile viewport**
- **Urządzenie**: iPhone 12 (390x844), Android Galaxy S21 (360x800)
- **Kroki**:
  1. Otwórz aplikację
  2. Sprawdź layout głównych ekranów
  3. Przetestuj dotyk vs klawiatura mobilna
- **Oczekiwany rezultat**:
  - Layout nie zepsuje się
  - Przyciski duże enough (min 44x44px tap target)
  - Brak poziomego scrollowania

**TS-COMP-003: Safari-specific issues**
- **Przeglądarka**: Safari 17+ (macOS, iOS)
- **Kroki**:
  1. Test fetch API w endpointach
  2. Test date formatting
  3. Test CSS Grid/Flexbox layouts
  4. Test Tailwind classes
- **Oczekiwany rezultat**:
  - Wszystkie features działają (Safari czasem ma opóźnienia w adopcji nowych API)

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

*(Szczegółowe scenariusze zostały już opisane w sekcji 3 - Typy Testów)*

**Podsumowanie priorytetów kluczowych funkcjonalności**:

### 4.1 Funkcjonalności Krytyczne (Priorytet 1)
1. Rejestracja i logowanie użytkowników
2. Generacja fiszek z AI (POST /api/generations)
3. Zapis wsadowy fiszek (POST /api/flashcards/batch)
4. Pobieranie listy fiszek z paginacją (GET /api/flashcards)
5. System powtórek (GET /api/reviews)
6. Rate limiting middleware
7. Row-Level Security (RLS) w Supabase

### 4.2 Funkcjonalności Wysokiego Priorytetu (Priorytet 2)
1. CRUD pojedynczych fiszek (POST/PUT/DELETE /api/flashcards/:id)
2. Pełnotekstowe wyszukiwanie (GET /api/flashcards?search=...)
3. Obsługa błędów generacji (retry z exponential backoff)
4. Navigation blocking podczas reviewing
5. Character counter w UI
6. Toast notifications

### 4.3 Funkcjonalności Średniego Priorytetu (Priorytet 3)
1. Odzyskiwanie hasła
2. InfoBox expand/collapse
3. Progress bar podczas generacji
4. Confirm dialog przy opuszczaniu strony
5. Mock mode dla development

## 5. Środowisko Testowe

### 5.1 Środowiska

#### 5.1.1 Lokalne (Development)
- **Cel**: Testy jednostkowe i integracyjne podczas development
- **Konfiguracja**:
  - Node.js 20+
  - npm/pnpm
  - Supabase CLI z lokalną instancją (supabase start)
  - Mock OpenRouter API (tryb mock)
- **Dane**: Seeded database z przykładowymi danymi

#### 5.1.2 Staging/Test
- **Cel**: Testy E2E, wydajnościowe, bezpieczeństwa
- **Konfiguracja**:
  - Środowisko zbliżone do produkcji
  - Supabase hosted instance (dedykowana dla testów)
  - OpenRouter API z limitowanym kluczem (lub mock)
- **Dane**: Realistyczne dane testowe, odizolowane od produkcji

#### 5.1.3 Produkcja (Limited Testing)
- **Cel**: Smoke tests po deployment
- **Konfiguracja**: Środowisko produkcyjne
- **Dane**: Prawdziwe dane (tylko odczyt, bez modyfikacji)
- **Scope**: Tylko krytyczne smoke tests (health checks, basic login)

### 5.2 Dane Testowe

#### 5.2.1 Użytkownicy testowi
- **test-user-1@example.com** / "P@ssw0rd1" - użytkownik z 100 fiszkami
- **test-user-2@example.com** / "P@ssw0rd2" - użytkownik z 0 fiszkami (nowy)
- **test-admin@example.com** / "AdminP@ss" - admin (jeśli role w przyszłości)

#### 5.2.2 Fiszki testowe
- 100 fiszek o różnej tematyce (historia, biologia, programowanie)
- Różne długości tekstu (krótkie, średnie, długie)
- Różne źródła (manual, ai-full, ai-edited)
- Różne daty created_at (do testowania sortowania)

#### 5.2.3 Dane spaced repetition
- Fiszki z różnymi next_review_date:
  - 30 fiszek: wczoraj (overdue)
  - 20 fiszek: dziś
  - 50 fiszek: przyszłość

### 5.3 Konfiguracja testowa

#### 5.3.1 Zmienne środowiskowe (.env.test)
```bash
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
OPENROUTER_API_KEY=sk-test-mock-key
MOCK_MODE=true
NODE_ENV=test
```

#### 5.3.2 Database migrations
- Automatyczne uruchamianie migracji przed testami
- Rollback po każdym teście dla izolacji
- Seeding danych testowych via skrypty SQL

## 6. Narzędzia do Testowania

### 6.1 Testy Jednostkowe
- **Framework**: Vitest (fast, ESM-native, kompatybilny z Vite/Astro)
- **Mocking**: vitest/vi + @vitest/spy
- **Coverage**: c8 / v8 (wbudowane w Vitest)
- **React testing**: @testing-library/react + @testing-library/jest-dom

### 6.2 Testy Integracyjne
- **API Testing**: Supertest + Node Test Runner
- **Database**: PostgreSQL (local Supabase instance)
- **Mocking**: MSW (Mock Service Worker) dla OpenRouter API

### 6.3 Testy E2E
- **Framework**: Playwright (szybki, multi-browser, great debugging)
- **Alternative**: Cypress (jeśli zespół preferuje)
- **Visual Regression**: Percy lub Playwright screenshots

### 6.4 Testy Wydajnościowe
- **Load Testing**: k6 (scripting w JavaScript, cloud results)
- **Frontend Performance**: Lighthouse CI (automated)
- **Monitoring**: Chrome DevTools Performance/Memory profiler

### 6.5 Testy Bezpieczeństwa
- **SAST**: ESLint security plugins, semgrep
- **DAST**: OWASP ZAP (automated scan)
- **Dependency Scanning**: npm audit, Snyk

### 6.6 Testy Dostępności
- **Automated**: axe-core + @axe-core/playwright
- **Manual**: NVDA (Windows), VoiceOver (macOS)
- **Audit**: Lighthouse Accessibility score

### 6.7 CI/CD Integration
- **Pipeline**: GitHub Actions
- **Stages**:
  1. Lint (ESLint, Prettier check)
  2. Unit tests (Vitest)
  3. Integration tests (Supertest)
  4. E2E tests (Playwright)
  5. Build (Astro build)
  6. Security scan (npm audit)
- **Reports**: Test results w GitHub Actions summary
- **Coverage**: Upload do Codecov lub Coveralls

## 7. Harmonogram Testów

### 7.1 Faza 1: Przygotowanie (Tydzień 1)
- **Dzień 1-2**: Setup środowiska testowego (lokalne, staging)
- **Dzień 3-4**: Instalacja narzędzi testowych (Vitest, Playwright, k6)
- **Dzień 5**: Przygotowanie danych testowych (seeding scripts)
- **Dzień 6-7**: Napisanie test utils i helper functions

### 7.2 Faza 2: Testy Jednostkowe (Tydzień 2-3)
- **Tydzień 2**: Testy serwisów (`src/lib/services/`)
  - Priorytet: flashcard.service, generation.service, review.service
- **Tydzień 3**: Testy hooków i utility functions
  - Priorytet: useGenerationViewState, crypto.ts, utils.ts

### 7.3 Faza 3: Testy Integracyjne (Tydzień 3-4)
- **Tydzień 3 (kontynuacja)**: Endpointy autentykacji
  - POST /api/auth/register, /api/auth/login, /api/auth/logout
- **Tydzień 4**: Endpointy flashcards i generations
  - GET/POST /api/flashcards, POST /api/flashcards/batch
  - POST /api/generations
- **Tydzień 4 (koniec)**: Middleware i RLS

### 7.4 Faza 4: Testy E2E (Tydzień 5)
- **Dzień 1-2**: Critical path (TS-E2E-001)
- **Dzień 3-4**: Error handling scenarios
- **Dzień 5**: Responsywność i navigation

### 7.5 Faza 5: Testy Niefunkcjonalne (Tydzień 6)
- **Dzień 1-2**: Performance testing (load, stress tests)
- **Dzień 3**: Security testing (OWASP ZAP, manual pentesting)
- **Dzień 4**: Accessibility testing (axe, screen readers)
- **Dzień 5**: Compatibility testing (cross-browser)

### 7.6 Faza 6: Regression i Bug Fixing (Tydzień 7)
- **Dzień 1-3**: Fixing found issues
- **Dzień 4-5**: Regression testing (re-run failed tests)
- **Dzień 6-7**: Final smoke tests, dokumentacja wyników

### 7.7 Ongoing: Maintenance
- **Post-release**: Automated tests w CI/CD przy każdym PR/commit
- **Weekly**: Przegląd code coverage i test failures
- **Monthly**: Audit bezpieczeństwa i dependency updates

## 8. Kryteria Akceptacji Testów

### 8.1 Kryteria funkcjonalne

#### 8.1.1 Testy jednostkowe
- ✅ **Minimum 80% code coverage** (functions, branches)
- ✅ **100% coverage dla serwisów krytycznych** (generation.service, flashcard.service)
- ✅ **Wszystkie testy przechodzą** (0 failures, 0 skipped)
- ✅ **Test execution time < 2 minuty** (dla szybkiego feedback loop)

#### 8.1.2 Testy integracyjne
- ✅ **90% coverage dla API endpoints** (wszystkie krytyczne endpointy pokryte)
- ✅ **Wszystkie scenariusze happy path i error handling** przetestowane
- ✅ **RLS policies zweryfikowane** (izolacja danych użytkowników)
- ✅ **Rate limiting działa** poprawnie

#### 8.1.3 Testy E2E
- ✅ **Critical user journey (TS-E2E-001) przechodzi** w 100%
- ✅ **Wszystkie main features** funkcjonalne w UI
- ✅ **Error handling w UI** działa (toasts, dialogs)
- ✅ **Responsywność** na mobile i desktop potwierdzona

### 8.2 Kryteria niefunkcjonalne

#### 8.2.1 Wydajność
- ✅ **API response times** w granicach SLA (sekcja 3.4.3)
- ✅ **Frontend performance**: Lighthouse score > 90
- ✅ **Load test**: system obsługuje 100 concurrent users bez degradacji
- ✅ **Memory**: Brak memory leaks podczas długotrwałych sesji

#### 8.2.2 Bezpieczeństwo
- ✅ **Zero critical/high vulnerabilities** w OWASP ZAP scan
- ✅ **Autoryzacja i autentykacja** działają poprawnie (wszystkie scenariusze TS-SEC)
- ✅ **Sensitive data** nie jest eksponowane w API responses
- ✅ **HTTPS enforced** (w produkcji)
- ✅ **npm audit**: zero vulnerabilities (lub wszystkie zmitigowane)

#### 8.2.3 Dostępność
- ✅ **axe-core**: zero critical/serious issues
- ✅ **Lighthouse Accessibility**: score > 90
- ✅ **Keyboard navigation**: pełna funkcjonalność (TS-A11Y-001)
- ✅ **Screen reader**: main features dostępne (TS-A11Y-002)
- ✅ **Color contrast**: spełnia WCAG 2.1 AA

#### 8.2.4 Kompatybilność
- ✅ **Critical path działa** we wszystkich przeglądarkach z listy (sekcja 3.7.2)
- ✅ **Responsive design**: działa na wszystkich rozdzielczościach (desktop, tablet, mobile)
- ✅ **No JavaScript errors** w console na żadnej przeglądarce

### 8.3 Kryteria dotyczące błędów

#### 8.3.1 Severity classification
- **Blocker**: System całkowicie nieużywalny (np. nie można się zalogować)
- **Critical**: Główna funkcjonalność nie działa (np. generacja fiszek failuje zawsze)
- **Major**: Ważna funkcjonalność ma problemy (np. wyszukiwanie nie działa)
- **Minor**: Drobne problemy UX (np. toast nie znika automatycznie)
- **Trivial**: Kosmetyczne (np. typo w tekście)

#### 8.3.2 Acceptable bug counts (exit criteria)
- ✅ **Blocker**: 0
- ✅ **Critical**: 0
- ✅ **Major**: ≤ 3 (z planem fix w kolejnym sprincie)
- ✅ **Minor**: ≤ 10 (mogą być odroczone)
- ✅ **Trivial**: bez limitu (mogą być w backlogu)

### 8.4 Dokumentacja
- ✅ **Wszystkie failed tests** mają zgłoszenia bug (w GitHub Issues)
- ✅ **Test execution report** przygotowany (summary, statistics)
- ✅ **Known issues** udokumentowane (workarounds jeśli istnieją)
- ✅ **Test coverage report** wygenerowany i zarchiwizowany

## 9. Role i Odpowiedzialności w Procesie Testowania

### 9.1 QA Engineer / Test Engineer (Główny tester)
**Odpowiedzialności**:
- Tworzenie i utrzymanie test cases i test scenarios
- Wykonywanie testów manualnych (E2E, exploratory)
- Konfiguracja i maintenance środowisk testowych
- Raportowanie bugów i tracking ich statusu
- Przegląd i aktualizacja planu testów
- Koordynacja testów akceptacyjnych z Product Ownerem

**Deliverables**:
- Test case documentation
- Test execution reports
- Bug reports (GitHub Issues)
- Test data scripts

### 9.2 Developer / Software Engineer
**Odpowiedzialności**:
- Pisanie testów jednostkowych dla własnego kodu
- Pisanie testów integracyjnych dla API endpoints
- Fixing bugów znalezionych przez QA
- Code review z perspektywy testability
- Maintenance test automation scripts (Vitest, Playwright)
- Zapewnienie > 80% code coverage

**Deliverables**:
- Unit tests (Vitest)
- Integration tests (Supertest)
- Bug fixes
- Code coverage reports

### 9.3 DevOps Engineer
**Odpowiedzialności**:
- Setup i maintenance CI/CD pipeline z testami
- Konfiguracja staging environment
- Automated deployment po przejściu testów
- Monitoring performance metrics w produkcji
- Setup narzędzi testowych (k6, OWASP ZAP w pipeline)

**Deliverables**:
- CI/CD pipeline configuration (GitHub Actions)
- Environment setup scripts
- Performance monitoring dashboards

### 9.4 Product Owner / Project Manager
**Odpowiedzialności**:
- Zatwierdzanie planu testów i kryteriów akceptacji
- Priorytetyzacja bugów do fix
- Podejmowanie decyzji go/no-go dla release
- Akceptacja user acceptance tests (UAT)
- Zarządzanie ryzykiem i scope

**Deliverables**:
- Approved test plan
- Bug prioritization decisions
- UAT sign-off
- Release decision documentation

### 9.5 Security Specialist (opcjonalnie, może być external)
**Odpowiedzialności**:
- Przeprowadzenie penetration testing
- Przegląd security test results (OWASP ZAP)
- Audyt bezpieczeństwa kodu (SAST)
- Rekomendacje zabezpieczeń

**Deliverables**:
- Penetration testing report
- Security recommendations
- Threat model analysis

### 9.6 UX/UI Designer
**Odpowiedzialności**:
- Weryfikacja accessibility w UI
- Przegląd responsywności na różnych urządzeniach
- Validacja zgodności implementacji z designem
- Testy użyteczności (usability testing)

**Deliverables**:
- Accessibility audit results
- Usability test findings
- Design-implementation gap analysis

## 10. Procedury Raportowania Błędów

### 10.1 Narzędzie do zarządzania błędami
**GitHub Issues** (zintegrowane z repo projektu)

### 10.2 Szablon zgłoszenia błędu (Bug Report Template)

```markdown
## 🐛 Bug Report

### Tytuł
[Krótki, opisowy tytuł błędu]

### Severity
- [ ] Blocker
- [ ] Critical
- [ ] Major
- [ ] Minor
- [ ] Trivial

### Środowisko
- **OS**: [np. macOS 13.4, Windows 11]
- **Przeglądarka**: [np. Chrome 120, Safari 17]
- **URL**: [np. https://app.example.com/generate]
- **User**: [np. test-user-1@example.com]

### Opis problemu
[Jasny i zwięzły opis tego, co jest nie tak]

### Kroki do reprodukcji
1. Otwórz stronę X
2. Kliknij przycisk Y
3. Wprowadź wartość Z
4. Obserwuj błąd

### Oczekiwane zachowanie
[Co powinno się stać]

### Rzeczywiste zachowanie
[Co faktycznie się dzieje]

### Screenshoty / Logi
[Załącz screenshoty lub logi z konsoli]

```javascript
// Console errors (jeśli są)
TypeError: Cannot read property 'id' of undefined
  at GenerationView.tsx:142
```

### Dodatkowe informacje
- Test Case ID: [np. TS-E2E-003]
- First occurrence: [data/czas]
- Reproducibility: [Always / Sometimes / Rarely]
- Related Issues: [linki do powiązanych issues]

### Proponowane rozwiązanie (opcjonalne)
[Jeśli masz pomysł na fix]
```

### 10.3 Workflow zgłoszenia błędu

#### 10.3.1 Nowe zgłoszenie
1. **QA/Tester** tworzy issue w GitHub z użyciem template
2. Przypisuje label: `bug`, severity label (np. `severity:critical`)
3. Dodaje do odpowiedniego Milestone (jeśli dotyczy konkretnego release)
4. Opcjonalnie: przypisuje do developera (jeśli wiadomo, kto jest owner)

#### 10.3.2 Triage (Priorytetyzacja)
1. **Product Owner + Tech Lead** przeglądają nowe bugi (codziennie lub 2x/tydzień)
2. Walidują severity
3. Przypisują priorytet (P0, P1, P2, P3)
4. Decydują o assignment (developer) i target sprint

#### 10.3.3 In Progress
1. **Developer** zmienia status na "In Progress" (Project board)
2. Pracuje nad fixem, dodaje unit test reprodukujący bug
3. Tworzy Pull Request z referencją do issue (#123)
4. PR review przez code review + QA preview

#### 10.3.4 Verification
1. **QA** testuje fix w środowisku staging (po merge PR)
2. Jeśli OK: zmienia status na "Verified", zamyka issue
3. Jeśli NOK: reopens issue z komentarzem, wraca do In Progress

#### 10.3.5 Closed
1. Bug zweryfikowany i naprawiony
2. Issue zamknięty (automatically przy merge PR lub manual)
3. Włączony do regression test suite (jeśli applicable)

### 10.4 Poziomy priorytetów

#### P0 (Blocker) - Fix immediately
- System całkowicie nieużywalny
- Bezpieczeństwo: critical vulnerability
- **SLA**: Fix w ciągu 24h, hotfix deployment

#### P1 (Critical) - Fix in current sprint
- Główna funkcjonalność broken
- Dotyczy dużej liczby użytkowników
- **SLA**: Fix w ciągu 3-5 dni roboczych

#### P2 (Major) - Fix in next sprint
- Ważna funkcjonalność ma problemy
- Workaround istnieje
- **SLA**: Fix w ciągu 2 tygodni

#### P3 (Minor/Trivial) - Backlog
- Kosmetyczne lub edge case
- Niski wpływ na użytkowników
- **SLA**: Fix "when possible", może być odłożone

### 10.5 Metryki i raportowanie

#### 10.5.1 Tygodniowy raport dla zespołu
- Liczba nowych bugów (breakdown by severity)
- Liczba zamkniętych bugów
- Liczba bugów in progress
- Top 5 najstarszych otwartych bugów (potential bottlenecks)
- Bug fix velocity (ile bugów zamykamy per sprint)

#### 10.5.2 Miesięczny raport dla managementu
- Trend bugów w czasie (czy rośnie/maleje)
- Bug severity distribution (pie chart)
- Areas with most bugs (np. generation module vs auth module)
- Time to resolve (średni czas życia buga)
- Quality metrics (% testów przechodzących, code coverage trend)

### 10.6 Eskalacja

**Krok 1**: Bug reported przez QA → assigned to Developer
**Krok 2**: Jeśli nie rozwiązany w SLA → eskalacja do Tech Lead
**Krok 3**: Jeśli blocker/critical i wymaga więcej zasobów → eskalacja do Product Owner / Project Manager
**Krok 4**: Jeśli dotyczy bezpieczeństwa (critical vulnerability) → natychmiastowa eskalacja + powiadomienie Security Specialist

---

## 11. Załączniki

### 11.1 Checklist pre-deployment (Go/No-Go)

**Pre-Production Deployment Checklist**:

- [ ] Wszystkie critical/blocker bugs zamknięte
- [ ] Code coverage > 80% (unit tests)
- [ ] Wszystkie E2E tests przechodzą (critical path)
- [ ] Performance tests w granicach SLA
- [ ] Security scan (OWASP ZAP) - zero critical issues
- [ ] Accessibility audit (axe) - zero critical/serious issues
- [ ] Compatibility testing - wszystkie target browsers OK
- [ ] Database migrations przetestowane (staging)
- [ ] Rollback plan przygotowany
- [ ] Monitoring i alerting skonfigurowane
- [ ] Documentation zaktualizowana (README, API docs)
- [ ] Stakeholders poinformowani o deployment window

### 11.2 Slownik terminów

- **SUT (System Under Test)**: Testowany system, aplikacja do generowania fiszek
- **Supabase**: Backend-as-a-Service (BaaS), zarządza DB i auth
- **OpenRouter**: Usługa proxy do API AI models
- **RLS (Row-Level Security)**: Mechanizm bezpieczeństwa w PostgreSQL izolujący dane użytkowników
- **FTS (Full-Text Search)**: Pełnotekstowe wyszukiwanie w PostgreSQL
- **GIN Index**: Generalized Inverted Index, typ indeksu dla FTS
- **Spaced Repetition**: Algorytm powtórek oparty na krzywej zapominania
- **Mock Mode**: Tryb symulacji API (bez rzeczywistych wywołań do OpenRouter)
- **Exponential Backoff**: Strategia retry z wykładniczo rosnącym opóźnieniem

### 11.3 Linki do dokumentacji technicznej

- **Astro Docs**: https://docs.astro.build/
- **React Docs**: https://react.dev/
- **Supabase Docs**: https://supabase.com/docs
- **OpenRouter API**: https://openrouter.ai/docs
- **Vitest**: https://vitest.dev/
- **Playwright**: https://playwright.dev/
- **OWASP Testing Guide**: https://owasp.org/www-project-web-security-testing-guide/
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/

---

## Podsumowanie

Niniejszy plan testów zapewnia kompleksowe pokrycie wszystkich aspektów aplikacji do generowania fiszek z AI. Szczególny nacisk położono na:

1. **Bezpieczeństwo** - RLS, autoryzacja, rate limiting, ochrona przed typowymi atakami
2. **Niezawodność** - obsługa błędów, retry mechanisms, validacja danych
3. **Wydajność** - szybkie API responses, optymalizacja FTS, load testing
4. **Dostępność** - keyboard navigation, screen reader support, WCAG 2.1 AA
5. **Jakość kodu** - wysoki code coverage (>80%), testy jednostkowe i integracyjne

Kluczem do sukcesu jest **systematyczne wykonywanie testów** zgodnie z harmonogramem, **szybkie raportowanie i fixing bugów**, oraz **continuous monitoring** w produkcji. CI/CD pipeline z automatycznymi testami zapewni, że każda zmiana w kodzie jest walidowana przed merge'em.

Plan ten powinien być **living document** - aktualizowany wraz z rozwojem projektu i pojawianiem się nowych wymagań.

---

**Data utworzenia**: 25 stycznia 2026  
**Wersja**: 1.0  
**Autor**: GitHub Copilot (AI QA Engineer)  
**Status**: Draft - Do zatwierdzenia przez Product Owner i Tech Lead

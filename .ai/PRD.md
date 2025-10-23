# Dokument wymagań produktu (PRD) - 10xCards
## 1. Przegląd produktu
10xCards to aplikacja internetowa (web-app) zaprojektowana w celu usprawnienia procesu nauki poprzez automatyzację tworzenia fiszek edukacyjnych. Aplikacja wykorzystuje sztuczną inteligencję do generowania wysokiej jakości fiszek z tekstu dostarczonego przez użytkownika, co znacznie skraca czas potrzebny na ich przygotowanie. Głównym celem produktu jest usunięcie bariery czasowej związanej z manualnym tworzeniem fiszek i zachęcenie szerszego grona odbiorców do korzystania z efektywnej metody nauki, jaką jest spaced repetition. W ramach MVP, produkt skupia się na kluczowych funkcjonalnościach, takich jak generowanie fiszek przez AI, zarządzanie nimi oraz integracja z gotowym algorytmem powtórek.

## 2. Problem użytkownika
Manualne tworzenie wysokiej jakości fiszek edukacyjnych jest procesem czasochłonnym i żmudnym. Uczniowie, studenci i osoby uczące się samodzielnie często rezygnują z tej formy nauki, mimo jej udowodnionej skuteczności. Problem ten zniechęca do regularnego stosowania metodyki spaced repetition, która opiera się na systematycznym powtarzaniu materiału za pomocą fiszek. Istnieje potrzeba narzędzia, które zautomatyzuje i przyspieszy ten proces, pozwalając użytkownikom skupić się na nauce, a nie na tworzeniu materiałów.

## 3. Wymagania funkcjonalne
- 3.1. Zarządzanie kontem użytkownika: Prosty system oparty na loginie i haśle. Obejmuje rejestrację, logowanie i możliwość zmiany hasła.
- 3.2. Generowanie fiszek przez AI: Użytkownik może wkleić tekst (od 1 000 do 10 000 znaków), z którego system automatycznie wygeneruje zestaw fiszek w formacie przód-tył.
- 3.3. Proces recenzji i kuracji fiszek: Po wygenerowaniu, użytkownik otrzymuje listę sugerowanych fiszek. Każdą z nich może indywidualnie zaakceptować, edytować lub odrzucić.
- 3.4. Ręczne tworzenie fiszek: Użytkownik ma możliwość manualnego dodawania pojedynczych fiszek za pomocą prostego formularza (przód/tył).
- 3.5. Zarządzanie kolekcją fiszek: Centralny widok aplikacji okno do wpisania tekstu do wygenerowania fiszek. Użytkownik może je przeglądać, edytować, usuwać oraz wyszukiwać w ramach widoku listy "Moje fiszki".
- 3.6. Integracja z systemem powtórek: Zaakceptowane fiszki są zintegrowane z gotowym algorytmem spaced repetition, który zarządza harmonogramem powtórek.
- 3.7. Logowanie zdarzeń systemowych: System rejestruje kluczowe akcje (generowanie, akceptacja, odrzucenie fiszek) w celu pomiaru wskaźników sukcesu i przyszłej analizy.
- 3.8. Bezpieczeństwo: Wdrożone zostaną podstawowe mechanizmy bezpieczeństwa, w tym autentykacja, autoryzacja, walidacja danych wejściowych i Row-Level Security (RLS) w bazie danych, aby zapewnić izolację danych użytkowników.

## 4. Granice produktu
### 4.1. Funkcjonalności wchodzące w zakres MVP:
- Aplikacja dostępna wyłącznie w wersji internetowej (web).
- Generowanie fiszek na podstawie tekstu wklejonego do pola tekstowego.
- Proste fiszki tekstowe (przód-tył), bez obsługi formatowania, obrazów czy audio.
- Podstawowy system kont użytkowników (login/hasło).
- Integracja z zewnętrznym, gotowym algorytmem powtórek (biblioteka open-source).
- Ręczne tworzenie, edycja i usuwanie fiszek.
- Zaawansowane wyszukiwanie fiszek po slowach kluczowych.

### 4.2. Funkcjonalności nie wchodzące w zakres MVP:
- Rozwój własnego, zaawansowanego algorytmu powtórek (w stylu SuperMemo, Anki).
- Import plików w formatach takich jak PDF, DOCX, itp.
- Funkcje społecznościowe, takie jak współdzielenie zestawów fiszek między użytkownikami.
- Integracje z zewnętrznymi platformami edukacyjnymi (np. Moodle, Coursera).
- Dedykowane aplikacje mobilne (iOS, Android).
- Logowanie za pośrednictwem zewnętrznych dostawców (np. Google, Facebook).
- Zaawansowane typy fiszek (np. "uzupełnij lukę", wielokrotny wybór).

## 5. Historyjki użytkowników
### Zarządzanie Kontem
---
- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji przy użyciu e-maila i hasła, aby móc zapisywać swoje fiszki.
- Kryteria akceptacji:
  - 1. Formularz rejestracji zawiera pola na e-mail i hasło (z powtórzeniem).
  - 2. Walidacja po stronie klienta i serwera sprawdza, czy e-mail nie jest już zajęty i czy hasła się zgadzają.
  - 3. Po pomyślnej rejestracji jestem automatycznie zalogowany i przekierowany do głównego panelu aplikacji.
  - 4. W przypadku błędu (np. zajęty e-mail) wyświetlany jest czytelny komunikat.

---
- ID: US-002
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby uzyskać dostęp do moich fiszek.
- Kryteria akceptacji:
  - 1. Formularz logowania zawiera pola na login i hasło.
  - 2. Po poprawnym wprowadzeniu danych jestem przekierowany do panelu z moimi fiszkami.
  - 3. W przypadku podania błędnych danych wyświetlany jest komunikat "Nieprawidłowy login lub hasło".
  - 4. Sesja użytkownika jest utrzymywana po zamknięciu i ponownym otwarciu przeglądarki.

---
- ID: US-003
- Tytuł: Zmiana hasła
- Opis: Jako zalogowany użytkownik, chcę mieć możliwość zmiany swojego hasła, aby zabezpieczyć swoje konto.
- Kryteria akceptacji:
  - 1. W ustawieniach konta znajduje się opcja zmiany hasła.
  - 2. Formularz wymaga podania starego hasła, nowego hasła i jego powtórzenia.
  - 3. System waliduje poprawność starego hasła przed dokonaniem zmiany.
  - 4. Po pomyślnej zmianie hasła otrzymuję komunikat potwierdzający.

### Generowanie i Zarządzanie Fiszkami
---
- ID: US-004
- Tytuł: Generowanie fiszek z tekstu
- Opis: Jako użytkownik, chcę wkleić tekst do aplikacji i zainicjować proces generowania fiszek, aby zaoszczędzić czas.
- Kryteria akceptacji:
  - 1. Na stronie głównej znajduje się pole tekstowe (textarea) i przycisk "Generuj fiszki".
  - 2. Pole tekstowe ma limit od 1 000 do 10 000 znaków; przekroczenie go uniemożliwia wysłanie formularza i wyświetla komunikat.
  - 3. Próba generowania z pustego pola tekstowego jest blokowana i wyświetla odpowiedni komunikat.
  - 4. Po kliknięciu przycisku "Generuj" wyświetlany jest wskaźnik ładowania, a interfejs jest zablokowany do czasu otrzymania odpowiedzi.
  - 5. Po zakończeniu generowania wyświetlana jest lista wygenerowanych fiszek pod formularzem generowania.

---
- ID: US-005
- Tytuł: Recenzja wygenerowanych fiszek
- Opis: Jako użytkownik, chcę przejrzeć listę fiszek wygenerowanych przez AI, aby zdecydować, które z nich zapisać w mojej kolekcji.
- Kryteria akceptacji:
  - 1. Po wygenerowaniu widzę listę proponowanych fiszek (przód i tył) pod formularzem generowania.
  - 2. Przy każdej fiszce znajdują się trzy przyciski: "Akceptuj", "Edytuj", "Odrzuć".
  - 3. Kliknięcie "Odrzuć" usuwa fiszkę z listy recenzji.
  - 4. Kliknięcie "Edytuj" otwiera okno modalne z polami do edycji przodu i tyłu fiszki, które są wstępnie wypełnione jej treścią.
  - 5. Po zapisaniu zmian w modalu, fiszka na liście jest oznaczona jako zaakceptowana.
  - 6. Po zakończeniu recenzji, kliknięcie przycisku "Zapisz w kolekcji" dodaje wszystkie zaakceptowane fiszki do mojej bazy i przekierowuje mnie do listy wszystkich fiszek.
  - 7. Nie ma opcji "zaakceptuj wszystkie".

---
- ID: US-006
- Tytuł: Ręczne tworzenie fiszki
- Opis: Jako użytkownik, chcę móc ręcznie dodać pojedynczą fiszkę, gdy mam konkretne pojęcie do zapamiętania.
- Kryteria akceptacji:
  - 1. Na stronie z listą fiszek znajduje się przycisk "Dodaj fiszkę".
  - 2. Kliknięcie przycisku otwiera okno modalne z dwoma polami: "Przód" i "Tył".
  - 3. Oba pola są wymagane. Próba zapisu z pustymi polami wyświetla błąd walidacji.
  - 4. Po pomyślnym zapisie modal jest zamykany, a nowa fiszka pojawia się na górze mojej listy fiszek.

---
- ID: US-007
- Tytuł: Przeglądanie listy fiszek
- Opis: Jako użytkownik, chcę widzieć listę wszystkich moich zapisanych fiszek, abym mógł je przeglądać i zarządzać nimi.
- Kryteria akceptacji:
  - 1. Domyślny widok po zalogowaniu to okno generowania fiszek.
  - 2. Wybieram listę "Moje fiszki".
  - 3. Każda pozycja na liście pokazuje treść z przodu i tyłu fiszki oraz opcje "Edytuj" i "Usuń".

---
- ID: US-008
- Tytuł: "Pusty stan" dla nowych użytkowników
- Opis: Jako nowy użytkownik, który nie ma jeszcze żadnych fiszek, chcę zobaczyć zachętę do podjęcia pierwszej akcji.
- Kryteria akceptacji:
  - 1. Gdy lista fiszek jest pusta, przycisk "Moje fiszki" jest niedostępny.
  - 2. Domyślnym ekranem jest ekran generowania fiszek z mozliwoscia wklejenia tekstu i wygenerowania nowych fiszek.

---
- ID: US-009
- Tytuł: Wyszukiwanie fiszek
- Opis: Jako użytkownik, chcę móc szybko znaleźć konkretną fiszkę w mojej kolekcji.
- Kryteria akceptacji:
  - 1. Nad listą fiszek znajduje się pole wyszukiwania.
  - 2. Wpisywanie tekstu w pole dynamicznie filtruje listę fiszek w czasie rzeczywistym (lub po kliknięciu przycisku "Szukaj").
  - 3. Wyszukiwanie jest pełnotekstowe i przeszukuje zarówno przód, jak i tył każdej fiszki oraz słowa kluczowe.
  - 4. Wyszukiwanie działa poprawnie z paginacją, tzn. przeszukuje cały zbiór, a nie tylko bieżącą stronę.

---
- ID: US-010
- Tytuł: Edycja istniejącej fiszki
- Opis: Jako użytkownik, chcę móc edytować treść istniejącej fiszki, aby poprawić błędy lub zaktualizować informacje.
- Kryteria akceptacji:
  - 1. Kliknięcie przycisku "Edytuj" przy fiszce na liście otwiera to samo okno modalne, co przy tworzeniu ręcznym.
  - 2. Pola w modalu są wypełnione aktualną treścią przodu i tyłu fiszki.
  - 3. Po zapisaniu zmian, modal jest zamykany, a zaktualizowana treść fiszki jest widoczna na liście.

---
- ID: US-011
- Tytuł: Usuwanie fiszki
- Opis: Jako użytkownik, chcę móc usunąć fiszkę, której już nie potrzebuję.
- Kryteria akceptacji:
  - 1. Kliknięcie przycisku "Usuń" przy fiszce wyświetla okno modalne z prośbą o potwierdzenie.
  - 2. Potwierdzenie akcji trwale usuwa fiszkę z mojej kolekcji i odświeża listę.
  - 3. Anulowanie akcji zamyka okno modalne bez wprowadzania żadnych zmian.

### System Powtórek i Logowanie
---
- ID: US-012
- Tytuł: Rozpoczęcie sesji powtórkowej
- Opis: Jako użytkownik, chcę móc rozpocząć sesję nauki, podczas której aplikacja będzie mi prezentować fiszki zgodnie z algorytmem spaced repetition.
- Kryteria akceptacji:
  - 1. W interfejsie znajduje się przycisk "Rozpocznij naukę".
  - 2. Po jego kliknięciu system prezentuje mi fiszki, które zgodnie z harmonogramem algorytmu są przewidziane do powtórki na dany dzień.
  - 3. Widzę przód fiszki i mam opcję jej odkrycia.
  - 4. Po odkryciu tyłu fiszki mam możliwość oceny swojej odpowiedzi (np. "Wiedziałem", "Nie wiedziałem"), co jest przekazywane do algorytmu w celu ustalenia kolejnej daty powtórki.
  - 5. Następnie algorytm pokazuje kolejną fiszkę w ramach sesji powtórkowej.

---
- ID: US-013
- Tytuł: Logowanie zdarzeń na potrzeby metryk
- Opis: Jako właściciel produktu, chcę, aby system logował kluczowe zdarzenia związane z tworzeniem fiszek, abym mógł mierzyć kryteria sukcesu.
- Kryteria akceptacji:
  - 1. Każda sesja generowania fiszek przez AI tworzy unikalny log.
  - 2. W ramach logu zapisywana jest łączna liczba wygenerowanych fiszek.
  - 3. Akcje "Akceptuj", "Edytuj" i "Odrzuć" podczas recenzji są przypisywane do logu sesji generowania.
  - 4. Każda fiszka zapisana w bazie danych ma znacznik źródła pochodzenia ("AI" lub "ręczne").

## 6. Metryki sukcesu
- 6.1. Wskaźnik akceptacji fiszek AI:
  - Cel: 75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkownika (bezpośrednio lub po edycji).
  - Sposób pomiaru: Analiza logów systemowych. Metryka będzie obliczana jako stosunek liczby fiszek zaakceptowanych (lub zaakceptowanych po edycji) do całkowitej liczby fiszek wygenerowanych w danym okresie.

- 6.2. Wskaźnik adopcji generowania AI:
  - Cel: 75% wszystkich fiszek w systemie jest tworzonych z wykorzystaniem generatora AI.
  - Sposób pomiaru: Porównanie liczby fiszek zapisanych w bazie danych, które mają źródło "AI", do całkowitej liczby zapisanych fiszek (AI + ręczne).
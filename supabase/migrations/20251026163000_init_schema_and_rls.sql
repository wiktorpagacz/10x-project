/************************************************************************************************
*
* ## Migration: Initial Schema Setup
*
* ### Purpose:
* This migration establishes the core tables for the application, including `generations`,
* `flashcards`, and `generation_error_logs`. It sets up relationships, enables Row-Level
* Security (RLS) for data isolation, and creates necessary indexes and helper functions
* to support application functionality like full-text search and automatic timestamp updates.
*
* ### Affected Tables/Objects:
* - `public.generations` (new table)
* - `public.flashcards` (new table)
* - `public.generation_error_logs` (new table)
* - `public.user_flashcard_count` (new view)
* - Helper functions and triggers for `updated_at` and `fts_vector`.
* - Row-Level Security (RLS) policies for all new tables.
* - B-Tree and GIN indexes for performance optimization.
*
* ### Special Considerations:
* - The `auth.users` table is managed by Supabase Auth and is referenced via foreign keys.
* - `on delete cascade` is used on `user_id` foreign keys to ensure data integrity upon
*   user deletion.
* - The `generation_duration` column in the `generations` table is an integer and its value
*   is expected to be provided by the application logic (e.g., in milliseconds).
*
************************************************************************************************/

begin;

-- =============================================
-- Section 1: Helper Functions and Triggers
-- =============================================

--
-- Name: handle_updated_at(); Type: function;
-- Description: A trigger function to automatically set the updated_at column to the current timestamp.
--
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

--
-- Name: update_fts_vector(); Type: function;
-- Description: A trigger function to automatically generate the full-text search vector from the front and back of a flashcard.
--
create or replace function public.update_fts_vector()
returns trigger as $$
begin
  new.fts_vector = to_tsvector('english', new.front || ' ' || new.back);
  return new;
end;
$$ language plpgsql;


-- =============================================
-- Section 2: Table Creation
-- =============================================

--
-- Name: generations; Type: table;
-- Description: Logs each session of AI-powered flashcard generation.
--
create table public.generations (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    model varchar(50) not null,
    generated_count integer not null default 0,
    accepted_unedited_count integer not null default 0,
    accepted_edited_count integer not null default 0,
    source_text_hash text not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    generation_duration integer not null, -- Duration in ms, supplied by the application.
    created_at timestamptz not null default now(),
    accepted_at timestamptz null -- Populated when the user finishes their review.
);
comment on table public.generations is 'Logs each session of AI-powered flashcard generation.';
comment on column public.generations.generation_duration is 'Generation duration in milliseconds, supplied by the application logic.';

--
-- Name: flashcards; Type: table;
-- Description: Stores all user-created flashcards.
--
create table public.flashcards (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    generation_id bigint null references public.generations(id) on delete set null,
    front varchar(200) not null,
    back varchar(500) not null,
    source varchar(15) not null check (source in ('ai-full', 'ai-edited', 'manual')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    fts_vector tsvector
);
comment on table public.flashcards is 'Stores all user-created flashcards.';
comment on column public.flashcards.generation_id is 'Links the flashcard to the AI generation session that created it, if applicable.';

--
-- Name: generation_error_logs; Type: table;
-- Description: Records any errors that occur during the AI generation process.
--
create table public.generation_error_logs (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    model varchar(50) not null,
    source_text_hash varchar not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    error_code varchar(100) not null,
    error_message text not null,
    created_at timestamptz not null default now()
);
comment on table public.generation_error_logs is 'Records any errors that occur during the AI generation process.';

-- =============================================
-- Section 3: Enable Row-Level Security (RLS)
-- =============================================

-- Enable RLS for all user-data tables to ensure data privacy.
alter table public.generations enable row level security;
alter table public.flashcards enable row level security;
alter table public.generation_error_logs enable row level security;


-- =============================================
-- Section 4: Indexes
-- =============================================

-- B-Tree indexes for foreign keys and frequently filtered columns to optimize joins and lookups.
create index on public.generations (user_id);
create index on public.flashcards (user_id);
create index on public.flashcards (generation_id);
create index on public.generation_error_logs (user_id);

-- GIN index for efficient full-text search on flashcards.
create index flashcards_fts_vector_idx on public.flashcards using gin (fts_vector);


-- =============================================
-- Section 5: Triggers
-- =============================================

-- Trigger to automatically update the 'updated_at' timestamp on flashcard modification.
create trigger on_flashcard_update
  before update on public.flashcards
  for each row
  execute procedure public.handle_updated_at();

-- Trigger to automatically update the full-text search vector on flashcard creation or modification.
create trigger on_flashcard_search_update
  before insert or update on public.flashcards
  for each row
  execute procedure public.update_fts_vector();


-- =============================================
-- Section 6: Row-Level Security Policies
-- =============================================

--
-- Policies for `generations` table
-- Rationale: Users should only be able to manage and view their own generation sessions.
--
create policy "authenticated users can view their own generation sessions"
on public.generations for select
to authenticated
using (auth.uid() = user_id);

create policy "authenticated users can create generation sessions"
on public.generations for insert
to authenticated
with check (auth.uid() = user_id);

create policy "authenticated users can update their own generation sessions"
on public.generations for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "authenticated users can delete their own generation sessions"
on public.generations for delete
to authenticated
using (auth.uid() = user_id);


--
-- Policies for `flashcards` table
-- Rationale: Users should only be able to perform CRUD operations on their own flashcards.
--
create policy "authenticated users can view their own flashcards"
on public.flashcards for select
to authenticated
using (auth.uid() = user_id);

create policy "authenticated users can create flashcards"
on public.flashcards for insert
to authenticated
with check (auth.uid() = user_id);

create policy "authenticated users can update their own flashcards"
on public.flashcards for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "authenticated users can delete their own flashcards"
on public.flashcards for delete
to authenticated
using (auth.uid() = user_id);


--
-- Policies for `generation_error_logs` table
-- Rationale: Users should only be able to manage and view their own error logs.
--
create policy "authenticated users can view their own error logs"
on public.generation_error_logs for select
to authenticated
using (auth.uid() = user_id);

create policy "authenticated users can create error logs"
on public.generation_error_logs for insert
to authenticated
with check (auth.uid() = user_id);

create policy "authenticated users can update their own error logs"
on public.generation_error_logs for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "authenticated users can delete their own error logs"
on public.generation_error_logs for delete
to authenticated
using (auth.uid() = user_id);


-- =============================================
-- Section 7: Views
-- =============================================

--
-- Name: user_flashcard_count; Type: view;
-- Description: A simple view to efficiently query the total number of flashcards per user.
--
create view public.user_flashcard_count as
select
  user_id,
  count(*) as flashcard_count
from
  public.flashcards
group by
  user_id;

comment on view public.user_flashcard_count is 'Optimized view for quickly checking the number of flashcards owned by each user.';

commit;
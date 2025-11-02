/************************************************************************************************
*
* ## Migration: Disable Row-Level Security
*
* ### Purpose:
* This migration disables Row-Level Security (RLS) on the `generations`, `flashcards`,
* and `generation_error_logs` tables. Disabling RLS removes the previously defined
* access control policies, making all data in these tables publicly accessible via the
* API (subject to standard PostgreSQL role privileges).
*
* ### Affected Tables:
* - `public.generations`
* - `public.flashcards`
* - `public.generation_error_logs`
*
* ### Special Considerations:
* - **SECURITY WARNING:** This is a destructive action from a security standpoint.
*   Disabling RLS means that any user with SELECT permissions on these tables will be
*   able to view all rows, regardless of ownership. This should only be done if the
*   application's access control is handled entirely at another layer or if the data
*   is intended to be fully public.
* - This action does not drop the policies themselves, but it renders them inactive.
*   If RLS is re-enabled on these tables, the previously defined policies will become
*   active again.
*
************************************************************************************************/

begin;

--
-- Name: generations; Type: command;
-- Description: Disables Row-Level Security on the `generations` table. All defined policies for this table will no longer be enforced.
--
alter table public.generations disable row level security;

--
-- Name: flashcards; Type: command;
-- Description: Disables Row-Level Security on the `flashcards` table. All defined policies for this table will no longer be enforced.
--
alter table public.flashcards disable row level security;

--
-- Name: generation_error_logs; Type: command;
-- Description: Disables Row-Level Security on the `generation_error_logs` table. All defined policies for this table will no longer be enforced.
--
alter table public.generation_error_logs disable row level security;

commit;
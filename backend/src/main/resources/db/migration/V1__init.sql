-- Sonic schema. Replaces the six Prisma migrations from the Node server.

create table app_user (
    id          uuid        primary key default gen_random_uuid(),
    clerk_id    text        not null unique,
    email       text,
    name        text,
    is_premium  boolean     not null default false,
    created_at  timestamptz not null default now()
);

create table workout_session (
    id              uuid             primary key,
    user_id         uuid             not null references app_user (id) on delete cascade,
    performed_at    timestamptz      not null,
    duration_hours  double precision check (duration_hours >= 0),
    note            text,
    created_at      timestamptz      not null default now()
);

create index workout_session_user_date_idx on workout_session (user_id, performed_at desc);

create table exercise (
    id          uuid    primary key,
    session_id  uuid    not null references workout_session (id) on delete cascade,
    position    int     not null,
    name        text    not null,
    category    text    not null check (category in ('strength', 'cardio', 'mobility', 'custom')),
    is_custom   boolean not null default false,
    ai_tagged   boolean not null default false
);

create index exercise_session_idx on exercise (session_id, position);

create table exercise_set (
    id              uuid             primary key,
    exercise_id     uuid             not null references exercise (id) on delete cascade,
    position        int              not null,
    reps            int              check (reps >= 0),
    weight_kg       double precision check (weight_kg >= 0),
    distance_km     double precision check (distance_km >= 0),
    duration_hours  double precision check (duration_hours >= 0),
    intensity       text             check (intensity in ('easy', 'moderate', 'hard', 'max')),
    note            text
);

create index exercise_set_exercise_idx on exercise_set (exercise_id, position);

create table body_metric (
    id              uuid             primary key,
    user_id         uuid             not null references app_user (id) on delete cascade,
    measured_at     timestamptz      not null,
    weight_kg       double precision check (weight_kg > 0),
    body_fat_pct    double precision check (body_fat_pct between 0 and 100),
    muscle_mass_kg  double precision check (muscle_mass_kg > 0),
    created_at      timestamptz      not null default now(),
    check (weight_kg is not null or body_fat_pct is not null or muscle_mass_kg is not null)
);

create index body_metric_user_date_idx on body_metric (user_id, measured_at desc);

-- A transcript the user saved to finish later (was User."toProcess").
create table workout_draft (
    user_id     uuid        primary key references app_user (id) on delete cascade,
    text        text        not null,
    updated_at  timestamptz not null default now()
);

create table user_insight (
    id                      uuid        primary key,
    user_id                 uuid        not null references app_user (id) on delete cascade,
    content                 jsonb       not null,
    generated_at            timestamptz not null,
    can_regenerate_after    timestamptz not null
);

create index user_insight_user_date_idx on user_insight (user_id, generated_at desc);

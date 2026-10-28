-- Training goals. Targets and start values are stored in kg for weights, reps for rep goals and
-- sessions for weekly-workout goals; the app converts weights for display.
create table goal (
    id           uuid             primary key,
    user_id      uuid             not null references app_user (id) on delete cascade,
    type         text             not null check (type in ('lift_weight', 'exercise_reps', 'body_weight', 'weekly_workouts')),
    exercise     text,
    target       double precision not null check (target > 0),
    start_value  double precision,
    deadline     date,
    created_at   timestamptz      not null default now(),
    achieved_at  timestamptz,
    check ((type in ('lift_weight', 'exercise_reps')) = (exercise is not null))
);

create index goal_user_idx on goal (user_id, created_at);

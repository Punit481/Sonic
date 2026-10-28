-- Fills one user's account with 30 days of realistic training data, for local testing.
--
--   docker exec -i backend-postgres-1 psql -U sonic -d sonic -v email=you@example.com -v tz=Asia/Kolkata < dev/seed-demo-data.sql
--
-- tz is your time zone (default UTC), so workouts land on the right local day.
-- Re-running replaces the user's workouts and body metrics from the last 30 days.
-- The user must have signed in once, so their row exists.

set sonic.seed_email = :'email';
\if :{?tz}
set time zone :'tz';
\else
set time zone 'UTC';
\endif

do $$
declare
    v_user      uuid;
    v_session   uuid;
    v_exercise  uuid;
    v_day       date;
    v_week      int;
    v_pos       int;
    v_set       int;
    v_plan      text;
    v_ex        record;
    v_noise     double precision;
begin
    select id into v_user from app_user where email = current_setting('sonic.seed_email');
    if v_user is null then
        raise exception 'No user with email %. Sign in to the app once first.', current_setting('sonic.seed_email');
    end if;

    delete from workout_session where user_id = v_user and performed_at >= now() - interval '31 days';
    delete from body_metric     where user_id = v_user and measured_at  >= now() - interval '31 days';

    for d in reverse 30..1 loop
        v_day  := current_date - d;
        v_week := (30 - d) / 7;  -- 0..4, drives progressive overload

        -- Mon push, Tue cardio, Wed pull, Fri legs, Sat cardio + mobility; Thu and Sun rest.
        v_plan := case extract(isodow from v_day)::int
            when 1 then 'push' when 2 then 'cardio' when 3 then 'pull'
            when 5 then 'legs' when 6 then 'conditioning' end;
        continue when v_plan is null;

        v_session := gen_random_uuid();
        insert into workout_session (id, user_id, performed_at, duration_hours, note, created_at)
        values (v_session, v_user, v_day + time '18:30', case when v_plan in ('cardio', 'conditioning') then 0.75 else 1.25 end,
                case v_plan when 'legs' then 'Felt strong on squats' when 'cardio' then null else null end,
                v_day + time '19:45');

        v_pos := 0;
        for v_ex in
            select * from (values
                ('push', 'Bench Press',        'strength', 4, 8,  60.0, 2.5),
                ('push', 'Overhead Press',     'strength', 3, 8,  37.5, 1.25),
                ('push', 'Incline Dumbbell Press', 'strength', 3, 10, 22.0, 1.0),
                ('push', 'Tricep Pushdown',    'strength', 3, 12, 25.0, 1.25),
                ('pull', 'Deadlift',           'strength', 3, 5,  100.0, 5.0),
                ('pull', 'Pull Up',            'strength', 4, 8,  0.0,  0.0),
                ('pull', 'Barbell Row',        'strength', 3, 8,  55.0, 2.5),
                ('pull', 'Bicep Curl',         'strength', 3, 12, 12.0, 1.0),
                ('legs', 'Squat',              'strength', 4, 6,  80.0, 2.5),
                ('legs', 'Romanian Deadlift',  'strength', 3, 10, 60.0, 2.5),
                ('legs', 'Leg Press',          'strength', 3, 12, 120.0, 5.0),
                ('legs', 'Calf Raise',         'strength', 3, 15, 40.0, 2.5),
                ('cardio', 'Running',          'cardio',   1, 0,  0.0,  0.0),
                ('conditioning', 'Cycling',    'cardio',   1, 0,  0.0,  0.0),
                ('conditioning', 'Stretching', 'mobility', 1, 0,  0.0,  0.0)
            ) as t(plan, name, category, sets, reps, start_kg, step_kg)
            where t.plan = v_plan
        loop
            v_exercise := gen_random_uuid();
            insert into exercise (id, session_id, position, name, category, is_custom, ai_tagged)
            values (v_exercise, v_session, v_pos, v_ex.name, v_ex.category, false, true);
            v_pos := v_pos + 1;

            for v_set in 0..v_ex.sets - 1 loop
                if v_ex.category = 'strength' then
                    insert into exercise_set (id, exercise_id, position, reps, weight_kg, intensity)
                    values (gen_random_uuid(), v_exercise, v_set,
                            -- the last set of a lift drops a rep or two
                            greatest(v_ex.reps - case when v_set = v_ex.sets - 1 then (d % 3) else 0 end, 1),
                            nullif(v_ex.start_kg + v_ex.step_kg * v_week, 0),
                            case when v_set = v_ex.sets - 1 then 'hard' else 'moderate' end);
                elsif v_ex.name = 'Running' then
                    insert into exercise_set (id, exercise_id, position, distance_km, duration_hours, intensity)
                    values (gen_random_uuid(), v_exercise, 0, 4.5 + 0.4 * v_week, round((0.45 + 0.03 * v_week)::numeric, 2), 'moderate');
                elsif v_ex.name = 'Cycling' then
                    insert into exercise_set (id, exercise_id, position, distance_km, duration_hours, intensity)
                    values (gen_random_uuid(), v_exercise, 0, 14 + v_week, 0.5, 'hard');
                else
                    insert into exercise_set (id, exercise_id, position, duration_hours, intensity)
                    values (gen_random_uuid(), v_exercise, 0, 0.25, 'easy');
                end if;
            end loop;
        end loop;
    end loop;

    -- A morning weigh-in every third day: weight and body fat trend down, muscle holds.
    for d in reverse 30..1 by 3 loop
        v_noise := ((d * 37) % 7 - 3) * 0.1;  -- deterministic ±0.3 kg
        insert into body_metric (id, user_id, measured_at, weight_kg, body_fat_pct, muscle_mass_kg)
        values (gen_random_uuid(), v_user, current_date - d + time '07:30',
                round((79.4 - (30 - d) * 0.06 + v_noise)::numeric, 1),
                round((18.6 - (30 - d) * 0.04)::numeric, 1),
                case when d % 6 = 0 then round((35.2 + (30 - d) * 0.01)::numeric, 1) end);
    end loop;
end $$;

select
    (select count(*) from workout_session ws join app_user u on u.id = ws.user_id where u.email = current_setting('sonic.seed_email')) as workouts,
    (select count(*) from body_metric bm join app_user u on u.id = bm.user_id where u.email = current_setting('sonic.seed_email')) as body_metrics;

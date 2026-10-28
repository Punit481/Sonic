-- Rows saved before exercise names were canonicalised can use common aliases ("Run",
-- "Push-Ups"). Merge them into the names ExerciseNames now produces, so records and charts
-- see one exercise. Keep in step with ExerciseNames.ALIASES.
update exercise set name = case lower(name)
        when 'bench' then 'Bench Press'
        when 'flat bench' then 'Bench Press'
        when 'flat bench press' then 'Bench Press'
        when 'barbell bench press' then 'Bench Press'
        when 'squats' then 'Squat'
        when 'back squat' then 'Squat'
        when 'back squats' then 'Squat'
        when 'deadlifts' then 'Deadlift'
        when 'rdl' then 'Romanian Deadlift'
        when 'rdls' then 'Romanian Deadlift'
        when 'romanian deadlifts' then 'Romanian Deadlift'
        when 'ohp' then 'Overhead Press'
        when 'military press' then 'Overhead Press'
        when 'shoulder press' then 'Overhead Press'
        when 'pull ups' then 'Pull Up'
        when 'pull-up' then 'Pull Up'
        when 'pull-ups' then 'Pull Up'
        when 'pullup' then 'Pull Up'
        when 'pullups' then 'Pull Up'
        when 'chin ups' then 'Chin Up'
        when 'chin-ups' then 'Chin Up'
        when 'push ups' then 'Push Up'
        when 'push-up' then 'Push Up'
        when 'push-ups' then 'Push Up'
        when 'pushups' then 'Push Up'
        when 'dips' then 'Dip'
        when 'curls' then 'Bicep Curl'
        when 'bicep curls' then 'Bicep Curl'
        when 'lunges' then 'Lunge'
        when 'run' then 'Running'
        when 'jog' then 'Running'
        when 'jogging' then 'Running'
        when 'treadmill' then 'Running'
        when 'bike' then 'Cycling'
        when 'biking' then 'Cycling'
        when 'rower' then 'Rowing'
        when 'rowing machine' then 'Rowing'
        when 'stretch' then 'Stretching'
        else name end
where lower(name) in (
    'bench', 'flat bench', 'flat bench press', 'barbell bench press', 'squats', 'back squat', 'back squats',
    'deadlifts', 'rdl', 'rdls', 'romanian deadlifts', 'ohp', 'military press', 'shoulder press',
    'pull ups', 'pull-up', 'pull-ups', 'pullup', 'pullups', 'chin ups', 'chin-ups',
    'push ups', 'push-up', 'push-ups', 'pushups', 'dips', 'curls', 'bicep curls', 'lunges',
    'run', 'jog', 'jogging', 'treadmill', 'bike', 'biking', 'rower', 'rowing machine', 'stretch');

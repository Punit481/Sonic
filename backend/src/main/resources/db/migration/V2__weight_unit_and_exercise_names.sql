-- The unit the user thinks in. Data is always stored in kg; this only affects display and
-- what the AI assumes when a weight is said without a unit.
alter table app_user add column weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb'));

-- Exercise names are now stored in a canonical form ("Bench Press"). Bring older all-lowercase
-- names in line so charts and records don't split one exercise into two.
update exercise set name = initcap(name) where name = lower(name);

-- Records and exercise pages group by name, case-insensitively.
create index exercise_lower_name_idx on exercise (lower(name));

CREATE TABLE users (
  id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','trainer','learner')), password TEXT
) STRICT;
CREATE TABLE sessions_auth (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL
) STRICT;
CREATE TABLE resets (
  token TEXT PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL
) STRICT;
CREATE TABLE courses (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, hours INTEGER NOT NULL CHECK(hours > 0),
  price INTEGER NOT NULL CHECK(price >= 0), objectives TEXT NOT NULL DEFAULT '',
  threshold INTEGER NOT NULL DEFAULT 70 CHECK(threshold BETWEEN 1 AND 100)
) STRICT;
CREATE TABLE cohorts (
  id INTEGER PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL, trainer_id INTEGER NOT NULL REFERENCES users(id)
) STRICT;
CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY, cohort_id INTEGER NOT NULL REFERENCES cohorts(id),
  user_id INTEGER NOT NULL REFERENCES users(id), UNIQUE(cohort_id,user_id)
) STRICT;
CREATE TABLE modules (
  id INTEGER PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id), title TEXT NOT NULL
) STRICT;
CREATE TABLE assets (
  id INTEGER PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id),
  name TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL
) STRICT;
CREATE TABLE activities (
  id INTEGER PRIMARY KEY, module_id INTEGER NOT NULL REFERENCES modules(id),
  kind TEXT NOT NULL CHECK(kind IN ('lesson','position','prompt','exercise','quiz','final','review')),
  title TEXT NOT NULL, body TEXT NOT NULL, goal TEXT NOT NULL DEFAULT '', variables TEXT NOT NULL DEFAULT '',
  asset_id INTEGER REFERENCES assets(id), questions TEXT NOT NULL DEFAULT '[]'
) STRICT;
CREATE TABLE progress (
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(id), activity_id INTEGER NOT NULL REFERENCES activities(id),
  completed TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(enrollment_id,activity_id)
) STRICT;
CREATE TABLE attempts (
  id INTEGER PRIMARY KEY, enrollment_id INTEGER NOT NULL REFERENCES enrollments(id),
  activity_id INTEGER NOT NULL REFERENCES activities(id), answer TEXT NOT NULL DEFAULT '',
  filename TEXT, attachment BLOB, score INTEGER, passed INTEGER CHECK(passed IN (0,1)),
  feedback TEXT, reviewer_id INTEGER REFERENCES users(id), reviewed TEXT,
  created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE certificates (
  enrollment_id INTEGER PRIMARY KEY REFERENCES enrollments(id),
  issued TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, issued_by INTEGER NOT NULL REFERENCES users(id),
  learner_name TEXT NOT NULL, course_title TEXT NOT NULL, session_title TEXT NOT NULL
) STRICT;
CREATE TABLE quality (
  id INTEGER PRIMARY KEY, enrollment_id INTEGER NOT NULL REFERENCES enrollments(id),
  kind TEXT NOT NULL CHECK(kind IN ('satisfaction','reclamation')), message TEXT NOT NULL,
  response TEXT, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE audit (
  id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event TEXT NOT NULL, target TEXT NOT NULL, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
CREATE TABLE throttle (
  bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL
) STRICT;
CREATE INDEX enrollment_user ON enrollments(user_id);
CREATE INDEX attempt_enrollment ON attempts(enrollment_id, activity_id);
CREATE INDEX audit_user ON audit(user_id);

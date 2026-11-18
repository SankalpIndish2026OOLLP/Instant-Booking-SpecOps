# Spec Delta

## MODIFIED Requirements

### Requirement: RQ-OPS-003 Startup configuration validation
The server SHALL validate every environment variable it reads before opening any port or database file. Optional variables SHALL take their documented defaults. On any missing or invalid variable the server SHALL exit with a non-zero code and log each offending variable name and reason, never its value. Every variable SHALL be listed in `.env.example`.

#### Scenario: Valid configuration
- **GIVEN** all required variables are set to valid values and optional ones are unset
- **WHEN** the server starts
- **THEN** it applies the documented defaults for the optional variables
- **AND** it proceeds to run migrations and listen for requests

#### Scenario: Missing required variable
- **GIVEN** `DATABASE_PATH` is not set
- **WHEN** the server starts
- **THEN** the process exits with a non-zero code before listening on any port
- **AND** the log names `DATABASE_PATH` with the reason `required`

#### Scenario: Invalid value is not logged
- **GIVEN** `BODY_LIMIT_BYTES` is set to `abc` and `DATABASE_PATH` is set to `/data/secret-name.db`
- **WHEN** the server starts
- **THEN** the process exits with a non-zero code
- **AND** the log names `BODY_LIMIT_BYTES` but contains neither `abc` nor `secret-name`

#### Scenario: Example file is complete
- **GIVEN** the configuration schema and `.env.example`
- **WHEN** the configuration test suite runs
- **THEN** every variable in the schema appears in `.env.example`, and the suite fails if one is missing

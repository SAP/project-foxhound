# Steps Layer

Reusable actions & assertions that never throw—return `StepResult` instead.

## Common Steps

- `Navigate.To.Home()`, `Navigate.To.Settings()`, `Navigate.To.History()`, `Navigate.To.Url(url)`
- `Toggle.PrivateBrowsing(true|false)`
- `Verify.ElementsByGroup("groupId")`

## Utilities

- `NoOpStep`, `SleepStep`, `FailStep` for dry runs and demos

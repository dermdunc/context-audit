# Setup

This project follows the Hekton reproducible setup standard:

```text
documented -> scripted -> idempotent-ish -> logged -> reproducible on a blank machine
```

## Intended Flow

```bash
./scripts/check-prereqs.sh
./scripts/bootstrap-project.sh --dry-run
./scripts/bootstrap-project.sh
./scripts/verify-project.sh
```

## Project-Specific Steps

- TODO: document project-specific setup steps.
- TODO: document external tool install sources before automating them.


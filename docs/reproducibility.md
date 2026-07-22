# Reproducibility

This project should be rebuildable on a future blank Hekton machine using documented scripts.

## Blank-Machine Flow

```bash
./scripts/check-prereqs.sh
./scripts/bootstrap-project.sh --dry-run
./scripts/bootstrap-project.sh
./scripts/verify-project.sh
```

## Rules

- Script setup where practical.
- Document manual steps that are not scripted yet.
- Keep local-only files out of git.


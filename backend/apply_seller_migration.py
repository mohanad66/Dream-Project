#!/usr/bin/env python
"""
Cross-platform version of apply_seller_migration.sh — run with plain `python`,
no bash/WSL/Git Bash required. Works on Windows, macOS, Linux.

Run this from inside backend/ (the folder that contains manage.py):

    python apply_seller_migration.py path\to\0XXX_product_owner_to_seller.py

It will:
  1. Find the latest existing migration in api/migrations/
  2. Compute the next migration number
  3. Copy the owner->seller migration into place with the right filename
  4. Patch its `dependencies` to point at your real latest migration
  5. Show the migration plan, then ask before running it
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

APP_NAME = "api"  # change if your app label differs


def main():
    if len(sys.argv) != 2:
        print(f"Usage: python {Path(sys.argv[0]).name} <path-to-0XXX_product_owner_to_seller.py>")
        sys.exit(1)

    src_file = Path(sys.argv[1])
    if not src_file.exists():
        print(f"Source file not found: {src_file}")
        sys.exit(1)

    migrations_dir = Path(APP_NAME) / "migrations"
    if not migrations_dir.is_dir():
        print(f"Can't find {migrations_dir} — run this from the backend/ directory (next to manage.py).")
        sys.exit(1)

    # Find latest existing migration: highest-numbered NNNN_*.py file
    existing = sorted(
        p for p in migrations_dir.glob("[0-9]" * 4 + "_*.py")
    )
    if not existing:
        print(f"No numbered migrations found in {migrations_dir}.")
        sys.exit(1)

    latest = existing[-1]
    latest_name = latest.stem  # filename without .py
    latest_num = int(latest_name[:4])
    next_num = f"{latest_num + 1:04d}"
    dest = migrations_dir / f"{next_num}_product_owner_to_seller.py"

    print(f"Latest migration found: {latest_name}")
    print(f"Writing new migration:  {dest}")

    shutil.copy(src_file, dest)

    content = dest.read_text(encoding="utf-8")
    patched = content.replace(
        '("api", "REPLACE_WITH_LATEST_MIGRATION_NAME")',
        f'("{APP_NAME}", "{latest_name}")',
    )
    if patched == content:
        print("WARNING: could not find the dependency placeholder to patch — check the file manually.")
    dest.write_text(patched, encoding="utf-8")

    print(f'Patched dependency to: ("{APP_NAME}", "{latest_name}")')
    print()
    print("Showing the migration plan (dry run):")
    subprocess.run([sys.executable, "manage.py", "migrate", "--plan", APP_NAME])

    print()
    confirm = input("Apply this migration now? [y/N] ").strip().lower()
    if confirm == "y":
        subprocess.run([sys.executable, "manage.py", "migrate", APP_NAME])
    else:
        print(f"Skipped. Run 'python manage.py migrate {APP_NAME}' yourself when ready.")


if __name__ == "__main__":
    main()
# SIG UFLA Matrizes Scraper

Script: `scripts/scrape_sigufla.py`

Purpose: fetch course/matrix/discipline lists from https://sig.ufla.br/modulos/publico/matrizes_curriculares/ and export CSVs to `public/data/`.

Requirements:

```bash
pip install -r requirements.txt
```

Usage:

```bash
python scripts/scrape_sigufla.py --out public/data
```

Notes:
- The scraper is heuristic-based and relies on the current HTML structure of the site; small changes may be needed if the site updates.
- The script writes two CSV files: `cursos.csv` and `materias.csv`.
- `materias.csv` includes a `turmas` column that contains JSON (stringified) describing turmas and horarios.


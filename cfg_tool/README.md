# CFG Simplification Teaching Tool

A 2-page web application built with **Python (Flask)** that teaches Context-Free Grammar simplification step by step.

## Project Structure

```
cfg_tool/
├── app.py                  ← Flask backend (all CFG logic)
├── requirements.txt
├── templates/
│   ├── index.html          ← Page 1: Grammar input
│   └── result.html         ← Page 2: Step-by-step output
└── static/
    ├── css/
    │   └── style.css
    └── js/
        ├── main.js         ← Input page JS
        └── result.js       ← Result page JS
```

## Quick Setup

```bash
# 1. Navigate into the project folder
cd cfg_tool

# 2. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install Flask
pip install -r requirements.txt

# 4. Run the app
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

## Features

- **Page 1 (Input):** Text area with symbol buttons (ε, →, |), 4 built-in example grammars, cursor-position insertion, validation with clear error messages
- **Page 2 (Output):**
  - Live grammar state panel (updates after each step)
  - Step 1: Find nullable variables → derive new productions (red = removed symbol, green = new production)
  - Step 2: Find unit pairs → substitute non-unit rules (purple = unit pair, green = substituted rules)
  - Step 3a: Remove non-generating symbols; Step 3b: Remove unreachable symbols
  - Animated step navigation with progress dots

## Grammar Format

One production per line:

```
S → A B | a
A → ε | a
B → b | B C
C → A B
```

- Variables: uppercase letters (A, B, S…)
- Terminals: lowercase letters (a, b…) or strings
- Use `ε` or `lambda` or `epsilon` for the empty string
- Separate alternatives with `|`

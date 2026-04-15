"""
CFG Simplification Teaching Tool
Flask backend — handles grammar parsing and step-by-step transformation logic.
"""

from flask import Flask, render_template, request, jsonify, session
import json
import itertools

app = Flask(__name__)
app.secret_key = "cfg-teaching-tool-secret"


# ─────────────────────────────────────────────
#  Grammar Parser
# ─────────────────────────────────────────────

def parse_grammar(text):
    """
    Parse raw text input into a structured grammar dictionary.
    Returns: { 'start': 'S', 'productions': { 'S': [['A','B'], ['a']], ... } }
    """
    productions = {}
    start = None
    errors = []

    for i, line in enumerate(text.strip().splitlines(), 1):
        line = line.strip()
        if not line:
            continue

        # Support both → and ->
        if "→" in line:
            parts = line.split("→", 1)
        elif "->" in line:
            parts = line.split("->", 1)
        else:
            errors.append(f"Line {i}: Missing '→' in \"{line}\"")
            continue

        lhs = parts[0].strip()
        if not lhs.isupper() or not lhs.isalpha():
            errors.append(f"Line {i}: Left-hand side must be an uppercase variable (got \"{lhs}\")")
            continue

        if start is None:
            start = lhs

        rhs_raw = parts[1].strip()
        alternatives = [alt.strip() for alt in rhs_raw.split("|")]

        if lhs not in productions:
            productions[lhs] = []

        for alt in alternatives:
            if alt in ("ε", "lambda", "epsilon", ""):
                productions[lhs].append([])          # empty list = ε
            else:
                symbols = alt.split()
                productions[lhs].append(symbols)

    if errors:
        return None, errors
    if not start:
        return None, ["No productions found. Please enter at least one rule."]

    return {"start": start, "productions": productions}, []


# ─────────────────────────────────────────────
#  Step 1 — Remove Null (ε) Productions
# ─────────────────────────────────────────────

def find_nullable(productions):
    """Find all variables that can derive ε (directly or indirectly)."""
    nullable = set()

    # Direct: A → ε
    for var, rules in productions.items():
        if [] in rules:
            nullable.add(var)

    # Indirect: A → BC where B and C are both nullable
    changed = True
    while changed:
        changed = False
        for var, rules in productions.items():
            if var not in nullable:
                for rule in rules:
                    if rule and all(sym in nullable for sym in rule):
                        nullable.add(var)
                        changed = True
    return nullable


def get_combinations(symbols, nullable):
    """
    Generate all combinations of a production by omitting subsets of nullable symbols.
    For A B C where B is nullable → {[A,B,C], [A,C]}
    """
    nullable_positions = [i for i, s in enumerate(symbols) if s in nullable]
    results = set()
    for r in range(len(nullable_positions) + 1):
        for omit in itertools.combinations(nullable_positions, r):
            combo = tuple(s for i, s in enumerate(symbols) if i not in omit)
            results.add(combo)
    return [list(c) for c in results]


def remove_null_productions(grammar):
    """
    Step 1: Remove all ε-productions.
    Returns transformed grammar + detailed step log for teaching display.
    """
    prods = grammar["productions"]
    start = grammar["start"]
    nullable = find_nullable(prods)

    steps = []
    new_prods = {}

    for var in prods:
        new_rules = set()
        derivations = []

        for rule in prods[var]:
            combos = get_combinations(rule, nullable)
            for combo in combos:
                key = tuple(combo)
                if key not in new_rules:
                    new_rules.add(key)
                    if combo != rule:          # it's a new derived production
                        derivations.append({
                            "original": rule if rule else ["ε"],
                            "derived": combo if combo else ["ε"],
                            "omitted": [s for s in rule if s not in combo or (
                                rule.count(s) > combo.count(s))]
                        })

        # Keep ε for start symbol only if it was originally nullable
        rule_list = [list(r) for r in new_rules]
        if var != start:
            rule_list = [r for r in rule_list if r]     # remove ε from non-start

        new_prods[var] = rule_list
        if derivations:
            steps.append({"variable": var, "derivations": derivations})

    new_grammar = {"start": start, "productions": new_prods}
    return new_grammar, nullable, steps


# ─────────────────────────────────────────────
#  Step 2 — Remove Unit Productions
# ─────────────────────────────────────────────

def remove_unit_productions(grammar):
    """
    Step 2: Remove unit productions A → B.
    Returns transformed grammar + step log.
    """
    prods = grammar["productions"]
    start = grammar["start"]
    steps = []
    new_prods = {}

    for A in prods:
        # Find all variables reachable from A via unit productions
        reachable = {A}
        queue = [A]
        unit_chain = []

        while queue:
            curr = queue.pop(0)
            for rule in prods.get(curr, []):
                if len(rule) == 1 and rule[0].isupper() and rule[0].isalpha():
                    B = rule[0]
                    if B not in reachable:
                        reachable.add(B)
                        queue.append(B)
                        unit_chain.append({"from": curr, "to": B})

        # Collect all non-unit productions from reachable variables
        seen = set()
        final_rules = []
        for B in reachable:
            for rule in prods.get(B, []):
                if not (len(rule) == 1 and rule[0].isupper() and rule[0].isalpha()):
                    key = tuple(rule)
                    if key not in seen:
                        seen.add(key)
                        final_rules.append(list(rule))

        new_prods[A] = final_rules

        if unit_chain:
            steps.append({
                "variable": A,
                "unit_chain": unit_chain,
                "reachable": list(reachable),
                "added_rules": final_rules
            })

    new_grammar = {"start": start, "productions": new_prods}
    return new_grammar, steps


# ─────────────────────────────────────────────
#  Step 3 — Remove Useless Symbols
# ─────────────────────────────────────────────

def remove_useless_symbols(grammar):
    """
    Step 3a: Remove non-generating symbols.
    Step 3b: Remove unreachable symbols.
    Returns final grammar + step logs for both sub-steps.
    """
    prods = grammar["productions"]
    start = grammar["start"]

    # ── 3a: Generating symbols ──
    generating = set()
    for var, rules in prods.items():
        for rule in rules:
            if all(not (s.isupper() and s.isalpha()) for s in rule):
                generating.add(var)
                break

    changed = True
    while changed:
        changed = False
        for var, rules in prods.items():
            if var not in generating:
                for rule in rules:
                    if all(not (s.isupper() and s.isalpha()) or s in generating for s in rule):
                        generating.add(var)
                        changed = True
                        break

    non_generating = [v for v in prods if v not in generating]

    # Remove non-generating variables and any rules referencing them
    prods_after_gen = {}
    for var in generating:
        prods_after_gen[var] = [
            rule for rule in prods[var]
            if all(not (s.isupper() and s.isalpha()) or s in generating for s in rule)
        ]

    # ── 3b: Reachable symbols ──
    reachable = {start}
    queue = [start]
    while queue:
        curr = queue.pop(0)
        for rule in prods_after_gen.get(curr, []):
            for sym in rule:
                if sym.isupper() and sym.isalpha() and sym not in reachable:
                    reachable.add(sym)
                    queue.append(sym)

    non_reachable = [v for v in prods_after_gen if v not in reachable]

    # Final grammar: only reachable & generating variables
    final_prods = {v: prods_after_gen[v] for v in reachable if v in prods_after_gen}

    final_grammar = {"start": start, "productions": final_prods}
    return final_grammar, non_generating, non_reachable


# ─────────────────────────────────────────────
#  Helper: grammar → display string
# ─────────────────────────────────────────────

def grammar_to_display(grammar):
    """Convert grammar dict to ordered list of production strings."""
    prods = grammar["productions"]
    start = grammar["start"]
    order = [start] + [v for v in prods if v != start]
    lines = []
    for v in order:
        if v not in prods:
            continue
        rhs = " | ".join(
            " ".join(rule) if rule else "ε"
            for rule in prods[v]
        )
        lines.append(f"{v} → {rhs}")
    return lines


# ─────────────────────────────────────────────
#  Routes
# ─────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/validate", methods=["POST"])
def validate():
    data = request.get_json()
    raw = data.get("grammar", "")
    grammar, errors = parse_grammar(raw)
    if errors:
        return jsonify({"valid": False, "errors": errors})
    return jsonify({"valid": True})


@app.route("/simplify", methods=["POST"])
def simplify():
    """
    Accepts raw grammar text, runs all three simplification steps,
    returns structured JSON with step-by-step data for the frontend.
    """
    data = request.get_json()
    raw = data.get("grammar", "")

    grammar, errors = parse_grammar(raw)
    if errors:
        return jsonify({"success": False, "errors": errors})

    original_display = grammar_to_display(grammar)

    # Step 1
    g1, nullable, null_steps = remove_null_productions(grammar)
    g1_display = grammar_to_display(g1)

    # Step 2
    g2, unit_steps = remove_unit_productions(g1)
    g2_display = grammar_to_display(g2)

    # Step 3
    g3, non_gen, non_reach = remove_useless_symbols(g2)
    g3_display = grammar_to_display(g3)

    return jsonify({
        "success": True,
        "start": grammar["start"],
        "original": original_display,
        "step1": {
            "nullable": list(nullable),
            "steps": null_steps,
            "grammar": g1_display
        },
        "step2": {
            "steps": unit_steps,
            "grammar": g2_display
        },
        "step3": {
            "non_generating": non_gen,
            "non_reachable": non_reach,
            "grammar": g3_display
        }
    })


@app.route("/result")
def result():
    return render_template("result.html")


if __name__ == "__main__":
    app.run(debug=True)

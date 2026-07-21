#!/usr/bin/env python3
"""Tkinter desktop GUI wrapping all Profitable engine functions, plus a
Generate World tab for procedurally scaling up planets/materials/crafting
recipes (schematics) -- see engine/worldgen.py.

Stdlib-only (tkinter ships with Python) -- matches the project's existing
no-runtime-dependencies convention.

Run from source:
    python gui/app.py

Or (after `pip install -e .`):
    profitable-gui
"""
from __future__ import annotations

import random
import sqlite3
import sys
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.balance_harness import run_simulation  # noqa: E402
from engine.craft_engine import craft  # noqa: E402
from engine.market import list_batch  # noqa: E402
from engine.refine import refine  # noqa: E402
from engine.roll_batch import roll_batch  # noqa: E402
from engine.universe import load_universe, save_universe  # noqa: E402
from engine.worldgen import generate_world  # noqa: E402
from scripts.build_db import build_db  # noqa: E402

STATS = ("si", "cd", "el", "pu", "dn", "vo")
BAND_ORDER = ("Shoddy", "Standard", "Fine", "Masterwork")


# ---------------------------------------------------------------------
# small reusable widgets
# ---------------------------------------------------------------------

class Table(ttk.Frame):
    """A Treeview + vertical scrollbar with set_columns()/set_rows() helpers."""

    def __init__(self, parent):
        super().__init__(parent)
        self.tree = ttk.Treeview(self, show="headings")
        vsb = ttk.Scrollbar(self, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

    def set_columns(self, columns):
        self.tree["columns"] = columns
        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=130, anchor="w")

    def set_rows(self, rows):
        self.tree.delete(*self.tree.get_children())
        for row in rows:
            self.tree.insert("", "end", values=row)


def _combo_values(rows, code_key, name_key):
    return [f"{r[code_key]} — {r[name_key]}" for r in rows]


def _extract_code(value):
    return value.split(" — ")[0] if value else ""


class BaseTab(ttk.Frame):
    def __init__(self, parent, app):
        super().__init__(parent)
        self.app = app

    @property
    def conn(self):
        return self.app.conn

    def refresh(self):
        pass


# ---------------------------------------------------------------------
# main application
# ---------------------------------------------------------------------

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Profitable")
        self.geometry("1050x720")

        self.conn: sqlite3.Connection | None = None
        self.db_path: Path | None = None

        self._build_menu()

        self.status = tk.StringVar(value="No database loaded. File > Open Database or New Database.")
        ttk.Label(self, textvariable=self.status, anchor="w").pack(fill="x", side="bottom", padx=4, pady=2)

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True)

        self.tabs = {}
        self._add_tab("Planets", PlanetsTab)
        self._add_tab("Materials", MaterialsTab)
        self._add_tab("Batches", BatchesTab)
        self._add_tab("Schematics", SchematicsTab)
        self._add_tab("Craft", CraftTab)
        self._add_tab("Refining", RefiningTab)
        self._add_tab("Market", MarketTab)
        self._add_tab("Crafters", CraftersTab)
        self._add_tab("Simulate", SimulateTab)
        self._add_tab("Generate World", GenerateWorldTab)

        self._set_tabs_enabled(False)

    def _build_menu(self):
        menubar = tk.Menu(self)
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="Open Database...", command=self.open_db)
        file_menu.add_command(label="New Database...", command=self.new_db)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.destroy)
        menubar.add_cascade(label="File", menu=file_menu)
        self.config(menu=menubar)

    def _add_tab(self, title, cls):
        frame = cls(self.notebook, self)
        self.notebook.add(frame, text=title)
        self.tabs[title] = frame

    def _set_tabs_enabled(self, enabled):
        state = "normal" if enabled else "disabled"
        for i in range(len(self.notebook.tabs())):
            self.notebook.tab(i, state=state)

    def open_db(self):
        path = filedialog.askopenfilename(
            title="Open Profitable database",
            filetypes=[("SQLite database", "*.db"), ("All files", "*.*")],
        )
        if not path:
            return
        self._set_connection(Path(path))

    def new_db(self):
        path = filedialog.asksaveasfilename(
            title="Create new Profitable database",
            defaultextension=".db",
            filetypes=[("SQLite database", "*.db"), ("All files", "*.*")],
        )
        if not path:
            return
        try:
            build_db(Path(path))
        except Exception as exc:
            messagebox.showerror("Build failed", str(exc))
            return
        self._set_connection(Path(path))

    def _set_connection(self, path: Path):
        if self.conn is not None:
            self.conn.close()
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.db_path = path
        self.status.set(f"Database: {path}")
        self._set_tabs_enabled(True)
        self.refresh_all()

    def refresh_all(self):
        for tab in self.tabs.values():
            tab.refresh()


# ---------------------------------------------------------------------
# tabs
# ---------------------------------------------------------------------

class PlanetsTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)
        bar = ttk.Frame(self)
        bar.pack(fill="x", padx=4, pady=4)
        ttk.Button(bar, text="Refresh", command=self.refresh).pack(side="left")

        self.table = Table(self)
        self.table.pack(fill="both", expand=True, padx=4, pady=4)
        self.table.set_columns(["code", "name", "sector", "bias"])

    def refresh(self):
        if not self.conn:
            return
        rows = self.conn.execute("SELECT * FROM region_node ORDER BY code").fetchall()
        table_rows = []
        for r in rows:
            bias = " ".join(f"{s}={r[s + '_bias']:+d}" for s in STATS)
            table_rows.append((r["code"], r["name"], r["sector"] or "", bias))
        self.table.set_rows(table_rows)


class MaterialsTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)
        bar = ttk.Frame(self)
        bar.pack(fill="x", padx=4, pady=4)
        ttk.Button(bar, text="Refresh", command=self.refresh).pack(side="left")

        self.table = Table(self)
        self.table.pack(fill="both", expand=True, padx=4, pady=4)
        self.table.set_columns(["code", "name", "tier", "stage"])

    def refresh(self):
        if not self.conn:
            return
        rows = self.conn.execute("SELECT * FROM material_class ORDER BY tier, code").fetchall()
        self.table.set_rows([(r["code"], r["name"], r["tier"], r["stage"]) for r in rows])


class BatchesTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)

        form = ttk.LabelFrame(self, text="Roll a new batch")
        form.pack(fill="x", padx=4, pady=4)

        ttk.Label(form, text="Material:").grid(row=0, column=0, sticky="w", padx=2, pady=2)
        self.material_combo = ttk.Combobox(form, state="readonly", width=30)
        self.material_combo.grid(row=0, column=1, padx=2, pady=2)

        ttk.Label(form, text="Planet:").grid(row=0, column=2, sticky="w", padx=2, pady=2)
        self.planet_combo = ttk.Combobox(form, state="readonly", width=30)
        self.planet_combo.grid(row=0, column=3, padx=2, pady=2)

        ttk.Label(form, text="Count:").grid(row=1, column=0, sticky="w", padx=2, pady=2)
        self.count_entry = ttk.Entry(form, width=10)
        self.count_entry.insert(0, "1")
        self.count_entry.grid(row=1, column=1, sticky="w", padx=2, pady=2)

        ttk.Label(form, text="Seed (optional):").grid(row=1, column=2, sticky="w", padx=2, pady=2)
        self.seed_entry = ttk.Entry(form, width=10)
        self.seed_entry.grid(row=1, column=3, sticky="w", padx=2, pady=2)

        ttk.Button(form, text="Roll", command=self._on_roll).grid(row=2, column=0, columnspan=4, pady=4)

        bar = ttk.Frame(self)
        bar.pack(fill="x", padx=4, pady=4)
        ttk.Button(bar, text="Refresh table", command=self.refresh).pack(side="left")
        ttk.Label(bar, text="Filter planet:").pack(side="left", padx=(12, 2))
        self.filter_combo = ttk.Combobox(bar, state="readonly", width=25)
        self.filter_combo.pack(side="left")
        self.filter_combo.bind("<<ComboboxSelected>>", lambda e: self.refresh())
        ttk.Button(bar, text="Clear filter", command=self._clear_filter).pack(side="left", padx=4)

        self.table = Table(self)
        self.table.pack(fill="both", expand=True, padx=4, pady=4)
        self.table.set_columns(["code", "class", "planet", "stats"])

    def _clear_filter(self):
        self.filter_combo.set("")
        self.refresh()

    def refresh(self):
        if not self.conn:
            return
        materials = self.conn.execute("SELECT code, name FROM material_class ORDER BY code").fetchall()
        self.material_combo["values"] = _combo_values(materials, "code", "name")
        planets = self.conn.execute("SELECT code, name FROM region_node ORDER BY code").fetchall()
        planet_values = _combo_values(planets, "code", "name")
        self.planet_combo["values"] = planet_values
        self.filter_combo["values"] = [""] + planet_values

        query = (
            "SELECT material_batch.*, material_class.code AS class_code, "
            "region_node.code AS planet_code "
            "FROM material_batch "
            "JOIN material_class ON material_class.id = material_batch.material_class_id "
            "JOIN region_node ON region_node.id = material_batch.region_node_id"
        )
        params = []
        planet_filter = _extract_code(self.filter_combo.get())
        if planet_filter:
            query += " WHERE region_node.code = ?"
            params.append(planet_filter)
        query += " ORDER BY material_batch.rolled_at"

        rows = self.conn.execute(query, params).fetchall()
        table_rows = []
        for r in rows:
            stat_str = " ".join(f"{s}={r[s]}" for s in STATS)
            table_rows.append((r["code"], r["class_code"], r["planet_code"], stat_str))
        self.table.set_rows(table_rows)

    def _on_roll(self):
        material = _extract_code(self.material_combo.get())
        planet = _extract_code(self.planet_combo.get())
        if not material or not planet:
            messagebox.showwarning("Missing input", "Select a material and a planet.")
            return
        try:
            count = int(self.count_entry.get() or "1")
        except ValueError:
            messagebox.showerror("Invalid count", "Count must be an integer.")
            return
        seed_text = self.seed_entry.get().strip()
        seed = int(seed_text) if seed_text else None
        rng = random.Random(seed)

        universe_path = self.app.db_path.parent / "universe.json"
        universe = load_universe(universe_path)
        try:
            results = [roll_batch(self.conn, universe, material, planet, rng) for _ in range(count)]
            save_universe(universe, universe_path)
        except Exception as exc:
            messagebox.showerror("Roll failed", str(exc))
            return

        self.refresh()
        self.app.tabs["Planets"].refresh()
        codes = ", ".join(r["code"] for r in results)
        messagebox.showinfo("Rolled", f"Rolled {count} batch(es): {codes}")


class SchematicsTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)
        bar = ttk.Frame(self)
        bar.pack(fill="x", padx=4, pady=4)
        ttk.Button(bar, text="Refresh", command=self.refresh).pack(side="left")

        self.text = tk.Text(self, wrap="word")
        self.text.pack(fill="both", expand=True, padx=4, pady=4)
        self.text.configure(state="disabled")

    def refresh(self):
        if not self.conn:
            return
        schematics = self.conn.execute("SELECT * FROM schematic ORDER BY name").fetchall()
        lines = []
        for s in schematics:
            lines.append(f"{s['name']} (tier {s['tier_requirement']}, output: {s['output_name']})")
            slots = self.conn.execute(
                "SELECT * FROM ingredient_slot WHERE schematic_id = ?", (s["id"],)
            ).fetchall()
            for slot in slots:
                parts = []
                for stat in STATS:
                    value = slot[f"w_{stat}"]
                    if value:
                        parts.append(f"w_{stat}={value:.2f}")
                lines.append(f"    {slot['slot_name']} (weight {slot['slot_weight']:.2f}): {' '.join(parts)}")
            lines.append("")
        self.text.configure(state="normal")
        self.text.delete("1.0", "end")
        self.text.insert("1.0", "\n".join(lines))
        self.text.configure(state="disabled")


class CraftTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)

        form = ttk.LabelFrame(self, text="Craft an item")
        form.pack(fill="x", padx=4, pady=4)

        ttk.Label(form, text="Schematic:").grid(row=0, column=0, sticky="w", padx=2, pady=2)
        self.schematic_combo = ttk.Combobox(form, state="readonly", width=30)
        self.schematic_combo.grid(row=0, column=1, padx=2, pady=2)
        self.schematic_combo.bind("<<ComboboxSelected>>", lambda e: self._on_schematic_selected())

        ttk.Label(form, text="Crafter:").grid(row=0, column=2, sticky="w", padx=2, pady=2)
        self.crafter_combo = ttk.Combobox(form, state="readonly", width=20)
        self.crafter_combo.grid(row=0, column=3, padx=2, pady=2)

        ttk.Label(form, text="Seed (optional):").grid(row=1, column=0, sticky="w", padx=2, pady=2)
        self.seed_entry = ttk.Entry(form, width=10)
        self.seed_entry.grid(row=1, column=1, sticky="w", padx=2, pady=2)

        self.slots_frame = ttk.Frame(form)
        self.slots_frame.grid(row=2, column=0, columnspan=4, sticky="w", padx=2, pady=4)
        self.slot_combos = {}

        ttk.Button(form, text="Craft", command=self._on_craft).grid(row=3, column=0, columnspan=4, pady=4)

        self.result_text = tk.Text(self, height=10, wrap="word")
        self.result_text.pack(fill="both", expand=True, padx=4, pady=4)
        self.result_text.configure(state="disabled")

    def refresh(self):
        if not self.conn:
            return
        schematics = self.conn.execute("SELECT name FROM schematic ORDER BY name").fetchall()
        self.schematic_combo["values"] = [s["name"] for s in schematics]
        crafters = self.conn.execute("SELECT name FROM crafter ORDER BY name").fetchall()
        self.crafter_combo["values"] = [c["name"] for c in crafters]
        self._on_schematic_selected()

    def _batch_values(self):
        rows = self.conn.execute(
            "SELECT material_batch.code AS code, material_class.code AS class_code "
            "FROM material_batch JOIN material_class ON material_class.id = material_batch.material_class_id "
            "ORDER BY material_batch.code"
        ).fetchall()
        return [f"{r['code']} ({r['class_code']})" for r in rows]

    def _on_schematic_selected(self):
        for widget in self.slots_frame.winfo_children():
            widget.destroy()
        self.slot_combos = {}

        name = self.schematic_combo.get()
        if not name or not self.conn:
            return
        schematic = self.conn.execute("SELECT * FROM schematic WHERE name = ?", (name,)).fetchone()
        if schematic is None:
            return
        slots = self.conn.execute(
            "SELECT * FROM ingredient_slot WHERE schematic_id = ?", (schematic["id"],)
        ).fetchall()
        batch_values = self._batch_values()
        for i, slot in enumerate(slots):
            ttk.Label(self.slots_frame, text=f"{slot['slot_name']}:").grid(
                row=i, column=0, sticky="w", padx=2, pady=2
            )
            combo = ttk.Combobox(self.slots_frame, state="readonly", width=25, values=batch_values)
            combo.grid(row=i, column=1, sticky="w", padx=2, pady=2)
            self.slot_combos[slot["slot_name"]] = combo

    def _on_craft(self):
        schematic = self.schematic_combo.get()
        crafter = self.crafter_combo.get()
        if not schematic or not crafter:
            messagebox.showwarning("Missing input", "Select a schematic and a crafter.")
            return
        slot_assignments = {}
        for slot_name, combo in self.slot_combos.items():
            value = combo.get()
            if not value:
                messagebox.showwarning("Missing input", f"Assign a batch to slot {slot_name!r}.")
                return
            slot_assignments[slot_name] = value.split(" (")[0]

        seed_text = self.seed_entry.get().strip()
        seed = int(seed_text) if seed_text else None

        try:
            result = craft(self.conn, schematic, crafter, slot_assignments, random.Random(seed))
        except Exception as exc:
            messagebox.showerror("Craft failed", str(exc))
            return

        lines = []
        for r in result["slot_results"]:
            lines.append(f"Slot {r.slot_name!r} <- {r.batch_code}: SlotQuality = {r.slot_quality:.2f}")
        lines.append(f"IBQ: {result['ibq']:.1f}")
        lines.append(f"Experimentation roll: {result['exp_roll']:.2f}")
        lines.append(f"Final Item Quality: {result['final_quality']:.2f}  ({result['quality_band']})")

        self.result_text.configure(state="normal")
        self.result_text.delete("1.0", "end")
        self.result_text.insert("1.0", "\n".join(lines))
        self.result_text.configure(state="disabled")


class RefiningTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)

        form = ttk.LabelFrame(self, text="Execute a refining recipe")
        form.pack(fill="x", padx=4, pady=4)

        ttk.Label(form, text="Recipe:").grid(row=0, column=0, sticky="w", padx=2, pady=2)
        self.recipe_combo = ttk.Combobox(form, state="readonly", width=30)
        self.recipe_combo.grid(row=0, column=1, padx=2, pady=2)
        self.recipe_combo.bind("<<ComboboxSelected>>", lambda e: self._on_recipe_selected())

        ttk.Label(form, text="Input batches (ctrl/shift-click for multiple):").grid(
            row=1, column=0, columnspan=2, sticky="w", padx=2, pady=2
        )
        self.batch_listbox = tk.Listbox(form, selectmode=tk.MULTIPLE, height=6, width=40, exportselection=False)
        self.batch_listbox.grid(row=2, column=0, columnspan=2, sticky="w", padx=2, pady=2)

        ttk.Button(form, text="Refine", command=self._on_refine).grid(row=3, column=0, columnspan=2, pady=4)

        self.result_text = tk.Text(self, height=6, wrap="word")
        self.result_text.pack(fill="x", padx=4, pady=4)
        self.result_text.configure(state="disabled")

        self.table = Table(self)
        self.table.pack(fill="both", expand=True, padx=4, pady=4)
        self.table.set_columns(["recipe", "input", "output"])

    def refresh(self):
        if not self.conn:
            return
        recipes = self.conn.execute(
            "SELECT refining_recipe.*, ic.code AS input_code, oc.code AS output_code "
            "FROM refining_recipe "
            "JOIN material_class ic ON ic.id = refining_recipe.input_class_id "
            "JOIN material_class oc ON oc.id = refining_recipe.output_class_id "
            "ORDER BY refining_recipe.name"
        ).fetchall()
        self.recipe_combo["values"] = [r["name"] for r in recipes]
        self.table.set_rows([(r["name"], r["input_code"], r["output_code"]) for r in recipes])
        self._on_recipe_selected()

    def _on_recipe_selected(self):
        self.batch_listbox.delete(0, "end")
        name = self.recipe_combo.get()
        if not name or not self.conn:
            return
        recipe = self.conn.execute("SELECT * FROM refining_recipe WHERE name = ?", (name,)).fetchone()
        if recipe is None:
            return
        rows = self.conn.execute(
            "SELECT code FROM material_batch WHERE material_class_id = ? ORDER BY code",
            (recipe["input_class_id"],),
        ).fetchall()
        for r in rows:
            self.batch_listbox.insert("end", r["code"])

    def _on_refine(self):
        recipe = self.recipe_combo.get()
        selection = [self.batch_listbox.get(i) for i in self.batch_listbox.curselection()]
        if not recipe or not selection:
            messagebox.showwarning("Missing input", "Select a recipe and at least one input batch.")
            return
        try:
            result = refine(self.conn, recipe, selection)
        except Exception as exc:
            messagebox.showerror("Refine failed", str(exc))
            return

        stat_str = " ".join(f"{k}={v}" for k, v in result["stats"].items())
        self.result_text.configure(state="normal")
        self.result_text.delete("1.0", "end")
        self.result_text.insert(
            "1.0",
            f"Refined {result['code']} ({result['material_class']}) "
            f"from {result['input_batches']}: {stat_str}",
        )
        self.result_text.configure(state="disabled")
        self.app.tabs["Batches"].refresh()


class MarketTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)

        form = ttk.LabelFrame(self, text="Create a market listing")
        form.pack(fill="x", padx=4, pady=4)

        ttk.Label(form, text="Station:").grid(row=0, column=0, sticky="w", padx=2, pady=2)
        self.station_combo = ttk.Combobox(form, state="readonly", width=25)
        self.station_combo.grid(row=0, column=1, padx=2, pady=2)

        ttk.Label(form, text="Batch:").grid(row=0, column=2, sticky="w", padx=2, pady=2)
        self.batch_combo = ttk.Combobox(form, state="readonly", width=25)
        self.batch_combo.grid(row=0, column=3, padx=2, pady=2)

        ttk.Label(form, text="Price:").grid(row=1, column=0, sticky="w", padx=2, pady=2)
        self.price_entry = ttk.Entry(form, width=15)
        self.price_entry.grid(row=1, column=1, sticky="w", padx=2, pady=2)

        ttk.Button(form, text="Sell", command=self._on_sell).grid(row=2, column=0, columnspan=4, pady=4)

        self.table = Table(self)
        self.table.pack(fill="both", expand=True, padx=4, pady=4)
        self.table.set_columns(["id", "station", "batch", "price", "listed_at"])

    def refresh(self):
        if not self.conn:
            return
        stations = self.conn.execute("SELECT name FROM station ORDER BY name").fetchall()
        self.station_combo["values"] = [s["name"] for s in stations]
        batches = self.conn.execute("SELECT code FROM material_batch ORDER BY code").fetchall()
        self.batch_combo["values"] = [b["code"] for b in batches]

        rows = self.conn.execute(
            "SELECT market_listing.*, station.name AS station_name, material_batch.code AS batch_code "
            "FROM market_listing "
            "JOIN station ON station.id = market_listing.station_id "
            "JOIN material_batch ON material_batch.id = market_listing.batch_id "
            "ORDER BY market_listing.listed_at"
        ).fetchall()
        self.table.set_rows(
            [(r["id"], r["station_name"], r["batch_code"], r["price"], r["listed_at"]) for r in rows]
        )

    def _on_sell(self):
        station = self.station_combo.get()
        batch = self.batch_combo.get()
        price_text = self.price_entry.get().strip()
        if not station or not batch or not price_text:
            messagebox.showwarning("Missing input", "Select a station, a batch, and enter a price.")
            return
        try:
            price = float(price_text)
        except ValueError:
            messagebox.showerror("Invalid price", "Price must be a number.")
            return
        try:
            listing_id = list_batch(self.conn, station, batch, price)
        except Exception as exc:
            messagebox.showerror("Sell failed", str(exc))
            return
        self.refresh()
        messagebox.showinfo("Listed", f"Listed {batch} at {station!r} for {price}: listing_id={listing_id}")


class CraftersTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)
        bar = ttk.Frame(self)
        bar.pack(fill="x", padx=4, pady=4)
        ttk.Button(bar, text="Refresh", command=self.refresh).pack(side="left")

        self.table = Table(self)
        self.table.pack(fill="both", expand=True, padx=4, pady=4)
        self.table.set_columns(["name", "skill_factor"])

    def refresh(self):
        if not self.conn:
            return
        rows = self.conn.execute("SELECT * FROM crafter ORDER BY name").fetchall()
        self.table.set_rows([(r["name"], f"{r['skill_factor']:.2f}") for r in rows])


class SimulateTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)

        form = ttk.LabelFrame(self, text="Monte Carlo balance harness")
        form.pack(fill="x", padx=4, pady=4)

        ttk.Label(form, text="Material:").grid(row=0, column=0, sticky="w", padx=2, pady=2)
        self.material_combo = ttk.Combobox(form, state="readonly", width=25)
        self.material_combo.grid(row=0, column=1, padx=2, pady=2)

        ttk.Label(form, text="Planet:").grid(row=0, column=2, sticky="w", padx=2, pady=2)
        self.planet_combo = ttk.Combobox(form, state="readonly", width=25)
        self.planet_combo.grid(row=0, column=3, padx=2, pady=2)

        ttk.Label(form, text="Schematic:").grid(row=1, column=0, sticky="w", padx=2, pady=2)
        self.schematic_combo = ttk.Combobox(form, state="readonly", width=25)
        self.schematic_combo.grid(row=1, column=1, padx=2, pady=2)

        ttk.Label(form, text="Crafter:").grid(row=1, column=2, sticky="w", padx=2, pady=2)
        self.crafter_combo = ttk.Combobox(form, state="readonly", width=25)
        self.crafter_combo.grid(row=1, column=3, padx=2, pady=2)

        ttk.Label(form, text="N:").grid(row=2, column=0, sticky="w", padx=2, pady=2)
        self.n_entry = ttk.Entry(form, width=10)
        self.n_entry.insert(0, "1000")
        self.n_entry.grid(row=2, column=1, sticky="w", padx=2, pady=2)

        ttk.Label(form, text="Seed (optional):").grid(row=2, column=2, sticky="w", padx=2, pady=2)
        self.seed_entry = ttk.Entry(form, width=10)
        self.seed_entry.grid(row=2, column=3, sticky="w", padx=2, pady=2)

        ttk.Button(form, text="Run Simulation", command=self._on_simulate).grid(
            row=3, column=0, columnspan=4, pady=4
        )

        self.summary_var = tk.StringVar()
        ttk.Label(self, textvariable=self.summary_var).pack(fill="x", padx=4, pady=2)

        self.canvas = tk.Canvas(self, height=250, bg="white")
        self.canvas.pack(fill="both", expand=True, padx=4, pady=4)

    def refresh(self):
        if not self.conn:
            return
        materials = self.conn.execute("SELECT code FROM material_class ORDER BY code").fetchall()
        self.material_combo["values"] = [m["code"] for m in materials]
        planets = self.conn.execute("SELECT code FROM region_node ORDER BY code").fetchall()
        self.planet_combo["values"] = [p["code"] for p in planets]
        schematics = self.conn.execute("SELECT name FROM schematic ORDER BY name").fetchall()
        self.schematic_combo["values"] = [s["name"] for s in schematics]
        crafters = self.conn.execute("SELECT name FROM crafter ORDER BY name").fetchall()
        self.crafter_combo["values"] = [c["name"] for c in crafters]

    def _on_simulate(self):
        material = self.material_combo.get()
        planet = self.planet_combo.get()
        schematic = self.schematic_combo.get()
        crafter = self.crafter_combo.get()
        if not all([material, planet, schematic, crafter]):
            messagebox.showwarning("Missing input", "Select material, planet, schematic, and crafter.")
            return
        try:
            n = int(self.n_entry.get() or "1000")
        except ValueError:
            messagebox.showerror("Invalid N", "N must be an integer.")
            return
        seed_text = self.seed_entry.get().strip()
        seed = int(seed_text) if seed_text else None

        try:
            result = run_simulation(self.conn, material, planet, schematic, crafter, n, random.Random(seed))
        except Exception as exc:
            messagebox.showerror("Simulation failed", str(exc))
            return

        self.summary_var.set(
            f"n={result['n']}  mean={result['mean_quality']:.2f}  min={result['min_quality']:.2f}  "
            f"max={result['max_quality']:.2f}  stdev={result['stdev_quality']:.2f}"
        )
        self._draw_bands(result["band_counts"])

    def _draw_bands(self, band_counts):
        self.canvas.delete("all")
        self.canvas.update_idletasks()
        width = self.canvas.winfo_width() or 800
        height = self.canvas.winfo_height() or 250
        max_count = max(band_counts.values(), default=1) or 1
        n_bands = len(BAND_ORDER)
        slot_width = width // n_bands
        bar_width = int(slot_width * 0.6)
        for i, band in enumerate(BAND_ORDER):
            count = band_counts.get(band, 0)
            bar_height = int((count / max_count) * (height - 40))
            x0 = i * slot_width + (slot_width - bar_width) // 2
            y0 = height - 30 - bar_height
            x1 = x0 + bar_width
            y1 = height - 30
            self.canvas.create_rectangle(x0, y0, x1, y1, fill="#4a90d9")
            self.canvas.create_text((x0 + x1) // 2, y1 + 10, text=band)
            self.canvas.create_text((x0 + x1) // 2, y0 - 10, text=str(count))


class GenerateWorldTab(BaseTab):
    def __init__(self, parent, app):
        super().__init__(parent, app)

        form = ttk.LabelFrame(self, text="Generate a world (procedural planets / materials / crafting recipes)")
        form.pack(fill="x", padx=4, pady=4)

        ttk.Label(form, text="Number of planets:").grid(row=0, column=0, sticky="w", padx=2, pady=2)
        self.planets_entry = ttk.Entry(form, width=10)
        self.planets_entry.insert(0, "5")
        self.planets_entry.grid(row=0, column=1, sticky="w", padx=2, pady=2)

        ttk.Label(form, text="Number of materials:").grid(row=1, column=0, sticky="w", padx=2, pady=2)
        self.materials_entry = ttk.Entry(form, width=10)
        self.materials_entry.insert(0, "5")
        self.materials_entry.grid(row=1, column=1, sticky="w", padx=2, pady=2)

        ttk.Label(form, text="Number of crafting recipes:").grid(row=2, column=0, sticky="w", padx=2, pady=2)
        self.recipes_entry = ttk.Entry(form, width=10)
        self.recipes_entry.insert(0, "5")
        self.recipes_entry.grid(row=2, column=1, sticky="w", padx=2, pady=2)

        ttk.Label(form, text="Seed (optional):").grid(row=3, column=0, sticky="w", padx=2, pady=2)
        self.seed_entry = ttk.Entry(form, width=10)
        self.seed_entry.grid(row=3, column=1, sticky="w", padx=2, pady=2)

        ttk.Button(form, text="Generate", command=self._on_generate).grid(row=4, column=0, columnspan=2, pady=6)

        self.result_text = tk.Text(self, wrap="word")
        self.result_text.pack(fill="both", expand=True, padx=4, pady=4)
        self.result_text.configure(state="disabled")

    def _on_generate(self):
        try:
            n_planets = int(self.planets_entry.get() or "0")
            n_materials = int(self.materials_entry.get() or "0")
            n_recipes = int(self.recipes_entry.get() or "0")
        except ValueError:
            messagebox.showerror("Invalid input", "Planets/materials/recipes must be integers.")
            return
        if n_planets < 0 or n_materials < 0 or n_recipes < 0:
            messagebox.showerror("Invalid input", "Values must be >= 0.")
            return
        seed_text = self.seed_entry.get().strip()
        seed = int(seed_text) if seed_text else None

        try:
            result = generate_world(self.conn, n_planets, n_materials, n_recipes, random.Random(seed))
        except Exception as exc:
            messagebox.showerror("Generation failed", str(exc))
            return

        lines = [
            f"Generated {len(result['planets'])} planets, {len(result['materials'])} materials, "
            f"{len(result['schematics'])} crafting recipes.",
            "",
        ]
        if result["planets"]:
            lines.append("Planets: " + ", ".join(p["code"] for p in result["planets"]))
        if result["materials"]:
            lines.append("Materials: " + ", ".join(m["code"] for m in result["materials"]))
        if result["schematics"]:
            lines.append("Schematics: " + ", ".join(s["name"] for s in result["schematics"]))

        self.result_text.configure(state="normal")
        self.result_text.delete("1.0", "end")
        self.result_text.insert("1.0", "\n".join(lines))
        self.result_text.configure(state="disabled")

        self.app.refresh_all()


def main() -> None:
    App().mainloop()


if __name__ == "__main__":
    main()

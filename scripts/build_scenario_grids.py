"""Per-cell hourly rain and wind for the three hindcast scenarios (NASA GPM IMERG V07 rain, ECMWF ERA5-Land wind).

The existing scenario files hold ONE area-mean value per hour. This keeps the grid: the source data is ~11 km cells
(0.1 degree), so each Chennai cell gets its own hourly rain and wind. Hours are taken from the existing scenario file
so every step lines up with it. Output: public/data/scenarios/<name>_grid.json.

Cells are the 0.1 degree IMERG cells (edges at multiples of 0.1 degree) that contain at least one substation.
Wind is the ERA5-Land value averaged over the cell (ERA5-Land is ~9-11 km, so 2-4 of its pixels overlap a cell).
Wind direction is the meteorological one: the direction the wind blows FROM, degrees clockwise from north.

Usage:  python scripts/build_scenario_grids.py            (all three)
        python scripts/build_scenario_grids.py michaung2023
"""
import json, math, os, sys
import ee

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public", "data")
GEE_PROJECT = "namma-map-407ca"
CELL = 0.1
SCENARIOS = ["michaung2023", "floods2015", "monsoon2020"]
CHUNK_HOURS = 24

ee.Initialize(project=GEE_PROJECT)


def substation_cells():
    grid = json.load(open(os.path.join(DATA, "chennai_tneb_grid.json"), encoding="utf-8"))
    subs = grid["substations"] if isinstance(grid, dict) and "substations" in grid else grid
    cells = {}
    for s in subs:
        lat, lng = s.get("lat"), s.get("lng")
        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            continue
        r, c = math.floor(lat / CELL + 1e-9), math.floor(lng / CELL + 1e-9)
        cells[(r, c)] = cells.get((r, c), 0) + 1
    return cells


def build(name, cells):
    src = json.load(open(os.path.join(DATA, "scenarios", f"{name}.json"), encoding="utf-8"))
    steps = src["timesteps"]
    hours = [t["timestep_hour"] for t in steps]
    utcs = [t["utc"] for t in steps]

    keys = sorted(cells)
    feats = []
    for i, (r, c) in enumerate(keys):
        lat0, lng0 = round(r * CELL, 4), round(c * CELL, 4)
        feats.append(ee.Feature(ee.Geometry.Rectangle([lng0, lat0, lng0 + CELL, lat0 + CELL]), {"i": i}))
    fc = ee.FeatureCollection(feats)

    imerg = ee.ImageCollection("NASA/GPM_L3/IMERG_V07").select("precipitation")
    era = ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY").select(["u_component_of_wind_10m", "v_component_of_wind_10m"])

    n_cells, n_hours = len(keys), len(hours)
    rain = [[None] * n_hours for _ in range(n_cells)]
    us = [[None] * n_hours for _ in range(n_cells)]
    vs = [[None] * n_hours for _ in range(n_cells)]

    for start in range(0, n_hours, CHUNK_HOURS):
        idx = list(range(start, min(start + CHUNK_HOURS, n_hours)))
        t0 = ee.Date(utcs[idx[0]])

        def per_hour(k):
            k = ee.Number(k)
            a = t0.advance(k, "hour")
            r = imerg.filterDate(a, a.advance(1, "hour")).sum().multiply(0.5).rename("rain")
            w = era.filterDate(a, a.advance(1, "hour")).first().rename(["u", "v"])
            out = r.addBands(w).reduceRegions(fc, ee.Reducer.mean(), 11132)
            return out.map(lambda f: f.set("k", k))

        rows = ee.FeatureCollection(ee.List.sequence(0, len(idx) - 1).map(per_hour)).flatten().getInfo()["features"]
        for f in rows:
            p = f["properties"]
            j = idx[int(p["k"])]
            ci = int(p["i"])
            rain[ci][j] = p.get("rain")
            us[ci][j] = p.get("u")
            vs[ci][j] = p.get("v")
        print(f"  {name}: hours {idx[0]}..{idx[-1]} done", flush=True)

    missing = sum(1 for row in rain for v in row if v is None)
    speed, dir_from = [], []
    for ci in range(n_cells):
        sp, dr = [], []
        for j in range(n_hours):
            u, v = us[ci][j], vs[ci][j]
            if u is None or v is None:
                sp.append(None); dr.append(None)
            else:
                sp.append(round(math.hypot(u, v) * 3.6, 1))
                dr.append(int(round((270 - math.degrees(math.atan2(v, u))) % 360)) % 360)
        speed.append(sp); dir_from.append(dr)

    out = {
        "model": "HINDCAST",
        "scenario": name,
        "sources": "NASA GPM IMERG V07 (rain), ECMWF ERA5-Land (wind) via Google Earth Engine",
        "note": "Values are per 0.1 degree (about 11 km) cell, not street level. Wind blows FROM windFromDeg (clockwise from north). No surge.",
        "cellSizeDeg": CELL,
        "cells": [{"id": f"r{r}c{c}", "lat0": round(r * CELL, 4), "lng0": round(c * CELL, 4), "substations": cells[(r, c)]} for r, c in keys],
        "hours": hours,
        "rainMm": [[None if v is None else round(v, 2) for v in row] for row in rain],
        "windSpeedKmh": speed,
        "windFromDeg": dir_from,
    }
    path = os.path.join(DATA, "scenarios", f"{name}_grid.json")
    json.dump(out, open(path, "w"), separators=(",", ":"))
    print(f"{name}: {n_cells} cells x {n_hours} hours, {missing} missing rain values, {os.path.getsize(path) // 1024} KB -> {path}")


if __name__ == "__main__":
    names = sys.argv[1:] or SCENARIOS
    cells = substation_cells()
    print(f"{len(cells)} cells contain substations; substations per cell: {sorted(cells.values(), reverse=True)}")
    for n in names:
        build(n, cells)

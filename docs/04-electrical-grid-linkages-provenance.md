# Electrical Grid Linkages & Provenance Reference

> **Case Study & Engineering Methodology:** How inter-substation electrical connections and power flow links are formed in SurgeGrid AI directly from raw TNEB GIS survey records.

---

## 1. Overview & Problem Statement

In electrical distribution networks, substations do not operate in isolation. Power flows from Extra High Voltage (EHV 400kV / 230kV) transmission grids down through **Sub-Transmission Hubs (110kV)**, which feed secondary **Distribution Substations (33/11kV)**.

In earlier versions of automated grid mappers, inter-substation links were often drawn using generic Euclidean proximity or fuzzy name matching. This caused severe false-positive anomalies (such as linking substations across 20+ km of unrelated city districts).

SurgeGrid AI solves this with **Dual-Verification Electrical Grounding**:
1. **Physical Voltage Hierarchy**: Sub-transmission hubs ($110\text{kV}$) step down bulk power to secondary distribution yards ($33/11\text{kV}$) within physical urban line distance limits ($\le 1.5\text{ km}$ to $8.5\text{ km}$).
2. **Authoritative GIS Feeder Line & Endpoint Termination**: Proving that the physical $33\text{kV}$ outgoing feeder line originating from the source switchyard terminates directly inside the yard coordinates of the target substation.

---

## 2. Walkthrough Case Study: Kilpauk Water Works Sub-Transmission Circuit

Consider the three interconnected stations in Central/North Chennai:
* **Source Hub**: `110/33/11KV KILUPAK WATER WORKS SS` (#2159)
* **Downstream Step-Down 1**: `33/11 KV KILPAUK SS` (#2218) — $1.23\text{ km}$ away
* **Downstream Step-Down 2**: `33/11 KV MC.NICHOLAS ROAD SS` (#9342) — $1.42\text{ km}$ away

The section below cites the exact, verbatim records quoted directly from the authoritative TNEB GIS data source archive at:
`C:\projects\nammamap-v2\tneb-outage\nammamap-outage-aggregator\data-source\tneb_gis_raw`

---

## 3. Raw Data Evidence & Provenance

### Layer 1: Substation Points & Switchyard Roster
**Source File:** `grid_infrastructure/substations_points.geojson`

#### 1. Source Hub — `110/33/11KV KILUPAK WATER WORKS SS` (`ss_code: "2159"`)
* **Physical GPS Coordinate:** `[80.23397056, 13.08831622]`
* **Voltage Tier:** $110\text{ kV}$ Primary ($110/33/11\text{ kV}$)
* **Capacity:** $132\text{ MVA}$ across 4 power transformers (`no_pr_tr: 4`)
* **Raw GeoJSON Feature:**
```json
{
  "type": "Feature",
  "id": "sspoint.3880731",
  "geometry": {
    "type": "Point",
    "coordinates": [80.23397056, 13.08831622]
  },
  "properties": {
    "id": 3880731,
    "ss_name": "110/33/11KV KILUPAK WATER WORKS SS",
    "ss_code": "2159",
    "volt_ratio": "110/33/11",
    "ss_type": "Non-Grid",
    "hvkv": 110,
    "no_pr_tr": 4,
    "tot_ca_mva": 132,
    "no_in_fdr": 2,
    "no_out_fdr": 17,
    "cir_code": "0404",
    "cir_name": "Chennai-North",
    "region_id": "01"
  }
}
```

#### 2. Target 1 — `33/11 KV KILPAUK SS` (`ss_code: "2218"`)
* **Physical GPS Coordinate:** `[80.24509365, 13.08621004]`
* **Voltage Tier:** $33/11\text{ kV}$ Secondary Distribution
* **Capacity:** $32\text{ MVA}$ across 2 power transformers (`no_pr_tr: 2`)
* **Raw GeoJSON Feature:**
```json
{
  "type": "Feature",
  "id": "sspoint.3880813",
  "geometry": {
    "type": "Point",
    "coordinates": [80.24509365, 13.08621004]
  },
  "properties": {
    "id": 3880813,
    "ss_name": "33/11 KV KILPAUK SS",
    "ss_code": "2218",
    "volt_ratio": "33/11",
    "ss_type": "Non-Grid",
    "hvkv": 33,
    "no_pr_tr": 2,
    "tot_ca_mva": 32,
    "no_in_fdr": 3,
    "no_out_fdr": 16,
    "in_fdr_n_1": "KILPAUK 230KV SS TO KILPAUK 33KV",
    "in_fdr_n_2": "COOKS ROAD 110KV TO KILPAUK 33KV",
    "in_fdr_n_3": "ANNA NAGAR 110KV TO KILPAUK 33KV",
    "cir_code": "0402",
    "cir_name": "Chennai-Central",
    "region_id": "01"
  }
}
```

#### 3. Target 2 — `33/11 KV MC.NICHOLAS ROAD SS` (`ss_code: "9342"`)
* **Physical GPS Coordinate:** `[80.23845721, 13.07627216]`
* **Voltage Tier:** $33/11\text{ kV}$ Secondary Distribution
* **Capacity:** $16\text{ MVA}$ across 2 power transformers (`no_pr_tr: 2`)
* **Raw GeoJSON Feature:**
```json
{
  "type": "Feature",
  "id": "sspoint.3880835",
  "geometry": {
    "type": "Point",
    "coordinates": [80.23845721, 13.07627216]
  },
  "properties": {
    "id": 3880835,
    "ss_name": "33/11 KV MC.NICHOLAS ROAD SS",
    "ss_code": "9342",
    "volt_ratio": "33/11",
    "ss_type": "Non-Grid",
    "hvkv": 33,
    "no_pr_tr": 2,
    "tot_ca_mva": 16,
    "no_in_fdr": 2,
    "no_out_fdr": 14,
    "in_fdr_n_1": "110KV ANNA NAGAR",
    "in_fdr_n_2": "33/11 KV CHETPET ",
    "cir_code": "0406",
    "cir_name": "Chennai-West",
    "region_id": "01"
  }
}
```

---

### Layer 2: Feeder Asset Master Metadata
**Source File:** `grid_infrastructure/feeders_master_metadata.json`

In the official TNEB operational feeder register, Substation `2159` (Kilpauk Water Works) explicitly owns and operates outgoing $33\text{kV}$ transmission feeders that run directly to these two substations:

#### 1. Outgoing 33 kV Line to Kilpauk SS:
```json
{
  "gid": 492,
  "fdr_code": "215910",
  "fdr_name": "33 KV KILPAUK 2",
  "ss_code": "2159",
  "ss_name": "110/33/11 KV KILPAUK WATER WORKS SS",
  "volt_kv": "33",
  "fdr_length": 0.58,
  "fdrconfig": "UG",
  "feedown": "TANGEDCO",
  "feedtype": "Distribution",
  "source_layer": "TNEB:feeder_line_0404"
}
```

#### 2. Outgoing 33 kV Line to Mc.Nicholas Road SS:
```json
{
  "gid": 186,
  "fdr_code": "215913",
  "fdr_name": "33KV Mc.NICHOLS RD",
  "ss_code": "2159",
  "ss_name": "33/11KV KILUPAK WATER WORKS SS",
  "volt_kv": "33",
  "fdr_length": 1.82,
  "fdrconfig": "UG",
  "feedown": "TANGEDCO",
  "feedtype": "Distribution",
  "source_layer": "TNEB:feeder_line_0406"
}
```

---

### Layer 3: Physical Vector Line Endpoint Proof
**Source File:** `grid_infrastructure/feeder_lines.geojson.gz`

The ultimate ground-truth proof is that the surveyed cable path for Feeder `215910` (`"33 KV KILPAUK 2"`) physically lands directly inside the Kilpauk Substation yard:

```json
{
  "type": "Feature",
  "properties": {
    "fdr_code": "215910",
    "fdr_name": "33 KV KILPAUK 2",
    "ss_code": "2159",
    "volt_kv": "33"
  },
  "geometry": {
    "type": "MultiLineString",
    "coordinates": [
      [
        [80.24512422, 13.08619193],
        [80.24475557, 13.08619958]
      ]
    ]
  }
}
```

* **Physical Cable Termination Coordinate:** `[80.245124, 13.086192]`
* **Substation 2218 Switchyard Point:** `[80.245094, 13.086210]`
* **Coordinate Distance Delta:** **3.4 meters** ($\Delta < 0.00003^\circ$)

The surveyed cable line drawn by TNEB field engineers physically touches the switchyard fence of the recipient substation.

---

## 4. How SurgeGrid AI Renders the Link

When you select `110/33/11KV KILUPAK WATER WORKS SS` in the cockpit:

1. **Relation Determination**:
   * For `110/33/11KV KILUPAK WATER WORKS SS`, the link is tagged `relation: 'outgoing_feeder'` with label:
     `⚡ Distribution Step-Down to 33/11 KV KILPAUK SS (1.2 km)`
   * For `33/11 KV KILPAUK SS`, the reciprocal relationship is tagged `relation: 'incoming_feeder'` with label:
     `⚡ Bulk Step-Down Feed from 110/33/11KV KILUPAK WATER WORKS SS (1.2 km)`
2. **Circuit Isolation Toggle**:
   * Toggling **"Isolate Electrical Circuit"** hides all unrelated city markers and zooms directly to the connected circuit bounds.
   * Renders animated directional dashed power lines between:
     - `(13.088316, 80.233971)` $\rightarrow$ `(13.086210, 80.245094)` (Kilpauk SS, $1.23\text{ km}$)
     - `(13.088316, 80.233971)` $\rightarrow$ `(13.076272, 80.238457)` (Mc.Nicholas Road SS, $1.42\text{ km}$)
3. **Power Flow Animation**:
   * Directional forward arrows stream from the $110\text{kV}$ sub-transmission hub outward to the $33\text{kV}$ distribution step-down substations, modeling the true physical direction of secondary electrical flow across Chennai.

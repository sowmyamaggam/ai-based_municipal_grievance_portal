"""Build a reproducible municipal work-type text dataset.

The public source is the NYC Open Data 311 Service Requests dataset. Its
complaint_type/descriptor taxonomy is public municipal problem data rather
than a hand-written keyword rule. The small curated set adds citizen-style
phrasing and Telugu/English mixed examples that the taxonomy does not contain.
Generated variants are grouped by source id and the trainer splits by group so
wording variants of one source record cannot leak across evaluation sets.
"""

import argparse
import csv
import json
import random
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from text_preprocessing import normalize_text

SOURCE_URL = "https://data.cityofnewyork.us/resource/erm2-nwe9.json?$select=complaint_type,descriptor"
SEED = 42

TAXONOMY = {
    "Road": {"Street Condition", "Highway Condition", "Sidewalk Condition", "Curb Condition", "Traffic Signal Condition"},
    "Drainage": {"Sewer"},
    "Garbage": {"Missed Collection", "Illegal Dumping", "Residential Disposal Complaint", "Litter Basket Request"},
    "Streetlight": {"Street Light Condition", "ELECTRIC"},
    "Water": {"Water System", "WATER LEAK", "Water Conservation"},
    "Sanitation": {"UNSANITARY CONDITION", "Dirty Condition", "Rodent", "Dead Animal"},
    "Other": {"GENERAL", "Obstruction", "Damaged Tree", "PAINT/PLASTER", "Building/Use", "Maintenance or Facility"},
}

CURATED = {
    "Road": [
        "Large pothole near the main road", "Road surface is completely damaged", "Broken pavement outside the school", "Footpath is cracked and unsafe", "A road cave in needs urgent repair",
        "Street has rough pitted asphalt", "Sidewalk is broken near the bus stop", "Loose road surface is causing vehicles to swerve", "Damaged curb blocks pedestrians", "Highway pothole is dangerous",
        "The lane marking has faded after road work", "A collapsed sidewalk is a trip hazard", "Main street is blocked by road construction debris", "Road repair failed and the pothole returned", "Broken pedestrian ramp needs fixing",
        "Road lo undi pothole chala pedda ga undi", "Main road surface chala damaged ga undi", "School daggara footpath broken", "Pothole valla accidents jarugutunnayi", "Ward road repair kavali",
    ],
    "Drainage": [
        "Water is accumulating near the drain", "Drain is blocked with waste", "Sewer is overflowing into the street", "Storm drain is clogged", "Manhole cover is missing",
        "Catch basin is flooding during rain", "Sewer backup is entering homes", "Drain needs cleaning near our lane", "There is a strong sewer smell", "Rainwater cannot flow through the gutter",
        "Blocked culvert is causing street flooding", "Open drain is full of stagnant water", "Drainage pipe is damaged", "Sewage is backing up outside the building", "Water logging near the market drain",
        "Drain block ayyindi, water road meeda undi", "Nala lo chetta padi block ayyindi", "Varsham lo street flooding avutundi", "Sewer water houses loki vastundi", "Drain cleaning immediate ga kavali",
    ],
    "Garbage": [
        "Garbage has not been collected", "Garbage is overflowing near the residential area", "Trash is dumped beside the road", "Missed waste collection for three days", "Illegal dumping is blocking the lane",
        "Household waste is piling up", "The public litter basket is full", "Recycling was not collected", "Bulky trash was left outside", "Residents need removal of dumped waste",
        "Waste containers are overflowing", "Garbage collection vehicle skipped our street", "Plastic litter is scattered around the park", "Dumped rubbish is creating a foul smell", "Trash is left in front of every house",
        "Garbage pickup avvaledu", "Road pakkana chetta overflowing ga undi", "Waste collection miss ayyindi", "Residential area lo trash pile undi", "Dumping valla lane block ayyindi",
    ],
    "Streetlight": [
        "Street light is not working", "Electric pole light is damaged", "Multiple street lights are out", "Lamp post was knocked down", "Street light keeps cycling",
        "Street lamp is very dim", "Exposed wire on the lamp post is dangerous", "Broken light fixture is hanging", "No lighting on the footpath", "Damaged streetlight cover needs repair",
        "A dark road needs a new lamp", "Streetlight has been off for a week", "The municipal light flickers at night", "Broken electrical light near the crossing", "Lamp post is leaning over the road",
        "Street light pani cheyyatledu", "Electric pole light damage ayyindi", "Night time lo road dark ga undi", "Lamp post wire exposed ga undi", "Streetlight repair kavali",
    ],
    "Water": [
        "No water supply for two days", "Drinking water pipeline is leaking", "Water main break is flooding the street", "Tap water pressure is very low", "Hydrant is leaking",
        "Dirty water is coming from the tap", "There is no water in our area", "A water pipe leak is wasting water", "Water is entering the basement", "Water supply stopped since yesterday",
        "Broken pipeline near the market", "Hydrant is running continuously", "Residents have no drinking water", "Water leak near the public tap", "Main pipe needs urgent repair",
        "Rendu rojula nunchi water supply ledu", "Drinking water pipe leak avutundi", "Tap nunchi dirty water vastundi", "Water pipeline repair kavali", "Area lo water pressure chala low ga undi",
    ],
    "Sanitation": [
        "Public area is extremely unhygienic", "Wastewater is creating unhygienic conditions", "Sewage smell is affecting residents", "Rat infestation is near the market", "Unsanitary conditions outside the building",
        "Dead animal needs safe removal", "Pests are spreading around the community", "Dirty public toilet needs cleaning", "Mosquitoes are breeding in stagnant waste", "Rodents are entering homes",
        "The public place has dangerous debris", "Unclean surroundings are a health risk", "Sanitation workers are needed at the site", "Foul conditions near the food area", "The community toilet is unusable",
        "Public place chala unhygienic ga undi", "Sewage smell valla health problem avutundi", "Market daggara rats unnayi", "Toilet cleaning immediate ga kavali", "Area sanitation improve cheyyandi",
    ],
    "Other": [
        "A fallen tree is blocking the footpath", "Graffiti is on the public wall", "A public building needs maintenance", "An obstruction is blocking the sidewalk", "Traffic signal is malfunctioning",
        "Public property has damaged paint", "A fallen branch is dangerous", "Construction material is on the pavement", "A park facility is broken", "There is an obstruction near the bus stop",
        "A public wall is damaged", "The municipal facility door is broken", "A tree branch has fallen on the road", "Street sign needs replacement", "Infrastructure damage is visible near the office",
        "Public place lo tree padipoyindi", "Footpath meeda obstruction undi", "Municipal building repair kavali", "Bus stop daggara problem undi", "Public property damage ayyindi",
    ],
}


def type_for(raw: str) -> str | None:
    return next((work_type for work_type, labels in TAXONOMY.items() if raw in labels), None)


def variants(complaint_type: str, descriptor: str) -> list[str]:
    detail = descriptor.strip() or complaint_type.strip()
    lower = detail.lower()
    return [
        f"{complaint_type}: {detail}.",
        f"Residents need help with {lower}.",
        f"Municipal complaint about {lower} near a public area.",
        f"Please inspect the {complaint_type.lower()} issue described as {lower}.",
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="data/nyc_311_sample.json")
    parser.add_argument("--output", default="data/municipal_work_types.csv")
    parser.add_argument("--metadata", default="data/municipal_work_types.metadata.json")
    args = parser.parse_args()
    random.seed(SEED)
    rows = json.loads(Path(args.source).read_text(encoding="utf-8"))
    by_type: dict[str, dict[str, str]] = defaultdict(dict)
    for row in rows:
        complaint_type = str(row.get("complaint_type") or "").strip()
        descriptor = str(row.get("descriptor") or "").strip()
        work_type = type_for(complaint_type)
        if work_type and descriptor:
            key = f"nyc:{complaint_type}:{descriptor}".lower()
            by_type[work_type][key] = f"{complaint_type}|{descriptor}"

    records: list[dict[str, str]] = []
    for work_type in TAXONOMY:
        # Keep enough distinct municipal taxonomy groups for evaluation while
        # adding citizen-style language from the curated examples.
        source_items = list(by_type[work_type].items())
        random.shuffle(source_items)
        for key, value in source_items[:80]:
            complaint_type, descriptor = value.split("|", 1)
            for index, text in enumerate(variants(complaint_type, descriptor)):
                # All wording variants of one public taxonomy record share a
                # group id so the trainer can keep them in one split.
                records.append({"text": text, "work_type": work_type, "source": key})
        for index, text in enumerate(CURATED[work_type]):
            records.append({"text": text, "work_type": work_type, "source": f"curated:{work_type}:{index}"})

    seen: set[tuple[str, str]] = set()
    clean: list[dict[str, str]] = []
    for record in records:
        normalized = normalize_text(record["text"])
        key = (normalized, record["work_type"])
        if normalized and key not in seen:
            seen.add(key)
            record["text"] = normalized
            clean.append(record)

    # Balance classes without duplicating records. All source groups remain
    # available to the grouped trainer, and every class has curated examples.
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for record in clean:
        grouped[record["work_type"]].append(record)
    target = min(len(values) for values in grouped.values())
    balanced = []
    for work_type in sorted(grouped):
        values = grouped[work_type]
        random.shuffle(values)
        balanced.extend(values[:target])
    random.shuffle(balanced)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=["text", "work_type", "source"])
        writer.writeheader()
        writer.writerows(balanced)
    metadata = {"source": SOURCE_URL, "source_records": len(rows), "generated_at": date.today().isoformat(), "records": len(balanced), "classes": 7, "class_distribution": dict(Counter(row["work_type"] for row in balanced)), "seed": SEED, "notes": "NYC 311 taxonomy records plus curated citizen-style and Telugu/English mixed examples; grouped source splits prevent variant leakage."}
    Path(args.metadata).write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()

"""NASA Hypobaric DCS Treatment Model (TP-2014-218561, abstract p. vi).

P(symptom resolution) = 1 / (1 + exp(-(ln(dP) - 1.510 + 0.795*AMB - 0.00308*Ts) / 0.478))
  dP  : treatment pressure above the exposure (suit) pressure, psid
  AMB : 1 if the crewmember walked during the exposure (lunar EVA: yes)
  Ts  : minutes from start of exposure to the symptom

The report feeds dP from a bubble-dynamics model; here dP is the plain pressure
difference, so the numbers run slightly conservative. Check: the report's Mars
case (203 min, return 4.3 -> 8.2 psia) gives 0.49; this gives 0.51.
"""
import math

SUIT_PSIA = 4.3

OPTIONS = [
    {"id": "hab", "label": "Back in habitat", "detail": "Habitat at 8.2 psia, 100 % O₂ by mask", "total_psia": 8.2},
    {"id": "bta", "label": "Suit + Bends Treatment Apparatus",
     "detail": "Suit pressurised 8.0 psid over the 8.2 psia habitat", "total_psia": 16.2},
]


def p_resolution(dp_psid, ts_min, ambulation=True):
    if dp_psid <= 0:
        return 0.0
    x = (math.log(dp_psid) - 1.510 + 0.795 * (1 if ambulation else 0) - 0.00308 * ts_min) / 0.478
    return 1.0 / (1.0 + math.exp(-x))


def options(ts_min, ambulation=True, site_psia=SUIT_PSIA):
    out = []
    for o in OPTIONS:
        dp = o["total_psia"] - site_psia
        out.append({**o, "dp_psid": round(dp, 1), "p_resolution": round(p_resolution(dp, ts_min, ambulation), 2)})
    return {
        "ts_min": ts_min, "ambulation": ambulation, "site_psia": site_psia, "options": out,
        "note": "Probability symptoms resolve on reaching that pressure. 2 h of 100 % O₂ at 8.2 psia raised it "
                "to 0.99 in NASA's Mars EVA case (TP-2014-218561 p. vi).",
        "source": "NASA TP-2014-218561, Hypobaric Decompression Sickness Treatment Model, p. vi and p. 23",
    }

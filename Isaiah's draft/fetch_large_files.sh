#!/usr/bin/env bash
# Downloads the large files left out of the zip. Run from inside NASA_SAC_Hackathon.
# Downloads resume if interrupted; just run the script again.
set -e

# [NASA] Flight Crew Physiological Data for Crew State Monitoring (~2 GB), data.nasa.gov
D=07_nasa_open_data_portal/crew_state_physiology; mkdir -p "$D"
for n in 5 6 9 10 11 12 13 14 17 18 19 21 22 23 24 25 26; do
  curl -L --retry 5 -C - -o "$D/crew_$n.zip" "https://data.nasa.gov/docs/datasets/public/csm/$n.zip"
done

# [analog] 10,099 annotated Doppler VGE recordings (9.4 GB), Zenodo 10.5281/zenodo.16877955
mkdir -p 02_dcs/doppler_vge_10k_zenodo
curl -L --retry 5 -C - -o 02_dcs/doppler_vge_10k_zenodo/doppler_audio_full.7z \
  "https://zenodo.org/api/records/16877955/files/Full_Doppler_Measurements_Final.7z/content"

# [analog, optional] Full synthetic Doppler set (29 GB), Zenodo 7790168: run with --synthetic
if [ "$1" = "--synthetic" ]; then
  mkdir -p 02_dcs/doppler_synthetic_zenodo
  curl -L --retry 5 -C - -o 02_dcs/doppler_synthetic_zenodo/SyntheticDU_dataset.zip \
    "https://zenodo.org/api/records/7790168/files/SyntheticDU_dataset.zip/content"
fi

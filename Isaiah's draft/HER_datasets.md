# H.E.R [Hypoxia Emergency Responder]: datasets used

| Dataset (what's recorded) | Link |
|---|---|
| NASA: Flight crew physiological data for crew-state monitoring. ECG, respiration and skin response from 18 pilots at 256 Hz, labelled baseline / focused attention / divided attention / startle; processed to heart rate, HRV and breathing rate once a second. | https://data.nasa.gov/dataset/flight-crew-physiological-data-for-crew-state-monitoring |
| NASA: Risk of hypobaric hypoxia from the exploration atmosphere (evidence report, 2015). Hypoxia symptoms and how common they are, performance effects, countermeasures, and cabin/suit atmospheres (suit 4.3 psia, 100 % O₂). | https://ntrs.nasa.gov/citations/20150021491 |
| NASA: Hypobaric decompression sickness (DCS) treatment model (NASA/TP-2014-218561, Conkin et al.). Regression model from NASA altitude-chamber DCS cases (1983–2014): chance symptoms resolve at a given treatment pressure and O₂ level. | https://nasa.gov/wp-content/uploads/2023/03/conkin-dcs-case-description-research-tp218561-2014.pdf |
| NASA: Extra-vehicular activity (EVA), US and Russia. Every US and Russian spacewalk 1965–2013: crew, vehicle, date, duration and incident notes. | https://data.nasa.gov/dataset/extra-vehicular-activity-eva-us-and-russia |
| NASA: Hypoxia risk graph (Human Research Program). Causes, countermeasures and outcomes of hypoxia, with cause → effect links and strength of evidence. | https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/ |
| Analog (non-NASA): Harespod high-altitude respiration and SpO₂ dataset. SpO₂, heart rate, pulse and respiration from 15 adults in a hypobaric chamber taken from 1,500 m to over 4,000 m (1 Hz, plus 100 Hz waveforms), labelled by hypoxia severity. | Paper: https://www.nature.com/articles/s41597-024-03065-x · Data: https://springernature.figshare.com/collections/Respiration_and_SPO2_dataset_for_assessing_the_human_response_to_hypoxia_at_high_altitude/6623344 |

Notes: Harespod SpO₂ is scaled 0–1 per person; the app maps it onto 75–99 % for display, so it is simulated SpO₂, not measured astronaut SpO₂. The DCS link is a PDF hosted on nasa.gov, not an NTRS record.

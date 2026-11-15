Synthetic Post-Dive Doppler Ultrasound data
====================================================
Le DQ, Hoang A, Azarang A, Lance RM, Natoli M, Gatrell A, Blogg SL, Dayton PA, Tillmans F, Lindholm P, Moon RE, Papadopoulou V. 
An open-source framework for synthetic post-dive Doppler ultrasound audio generation

Reference Information
=====================
FIle name: README_Synthetic_PostDive_Doppler.txt
Authors: David Q Le

Dataset Attribution and Usage
-------------------------------
* Dataset Title: Data for the article "An open-source framework for synthetic post-dive Doppler ultrasound audio generation"
* Code can be found on Github at: https://github.com/dle4/Synthetic-Post-Dive-Ultrasound-Audio-Generator

Contact Information
-------------------------------
* Name: David Q Le PhD
* Affiliation: Joint Department of Biomedical Engineering, University of North-Carolina Chapel Hill & North Carolina State University
* ORCID ID:
* Email: dle4@email.unc.edu
* Alternate email: dqle95@gmail.com

Contact Information
-------------------------------
* Name: Virginie Papadopoulou PhD
* Affiliation: Joint Department of Biomedical Engineering, University of North-Carolina Chapel Hill & North Carolina State University
* ORCID ID:
* Email: papadopoulou@unc.edu
* Alternate email: virginiepapadopoulou@gmail.com

Methodological Information
===============================
This dataset consists of synthetic post-dive Doppler ultrasound audio files generated using an open-source framework as described in Le et al. 2023

The data is separated based on two grading schema that are used to analyze the data, Spencer (5 classes) or Kisman-Masurel (22 classes) which indicate the level of venous gas emboli present.

Furthermore, data either comes from Subclavian or Precordial baseline data, which exhibit substantially different background noises to each other. 

Finally, data was generated where due to the large amplitude of the cardiac sounds in precordial data, VGE are placed at locations between cardiac cycles where background noise is minimal (where human raters are more likely to hear VGE) or at any point within the cardiac cycle, which would be more realistic. 

In zipped folder SyntheticDU_dataset.zip exists all baseline and synthetic data proposed in this paper. 

The directory: (1_BaselineData) contains all baseline data that was used to generate the synthetic data is provided under Baseline_Doppler_Data folder. 
Human baseline data is saved as .wav audio files, whereas the lab-generated VGE audio is saved as a .mat and is preprocessed for use.

In the directory (2_SyntheticDU), 1000 synthetic Doppler ultrasound audio files are provided for each of the situations provided.The data is sorted based on the 1) source, 2) grading scheme, 3) method of generation. Additionally, the isolated VGE and cardiac data used to generate each synthetic Doppler audio is provided with the same name as the synthetic data but in separate folders.This allows for the user to compare the VGE only audio to the synthetic audio with both cardiac and VGE signals combined if desired.

Zipped folder 1_SyntheticDU_1sample.zip contains the same directory structure as 2_SyntheticDU however with only one audio file per folder rather than the 1000. This sub-dataset exists to allow for reasonable download speeds to view the data. The audio files are identical to the ones found in 2_SyntheticDU with the same names. 


Data and File overview
===============================

Naming Conventions (Baseline Data)
-------------------------------
Folders are titled based on the type of baseline data was collected

Baseline Acquisition source: Folders and files will be labeled with "PrecordialDopplerBaseline" or "SubclavianDopplerBaseline" to indicate the baseline human data acquisition method, through the precordium (precordial) or of the subclavian vein (subclavian). An additional directory for baseline bubble-only recordings is labeled "SimulatedBubblesBaseline"

Precordial Data:
	# Subject: For precordial data, subjects are indicated by "AVD###". 

	# Data segmentation: For precordial data, recordings were segmented to remove artifacts and talking. Each subjects recording segments are indicated by "segment#"

	# Data recording device: The data was recorded with either Pulse-wave or Continuous-wave Doppler systems indicated by "PW" and "CW" respectively. "All" indicates that both PW and CW are combined in a single recording. 

Subclavian Data:
	# Subject: for subclavian data, subjects are indicated by "J##-###".

	# Acquisition date: audio files are labeled with acquisition dates at beginning

	# Acquisition site: left or right subclavian vein measurement is indicated by "Left" or "Right"

Simulated Bubble data:
	# Acquisition date: Date of data acquisition

	# Flow-rate: Indicated by pump rotations per minute (RPM) between 150-250. "rand" indicates that the pump had a random pump flow changing every second

	# Flow direction: if no flow is denoted, the bubbles are moving towards the transducer. Otherwise, denoted as "away" or "perp" for perpendicular flow. 

	# Sample: Experimental samples indicated by ### value at end of recording. 


Naming Conventions (Synthetic Data)
-------------------------------
Synthetic data folders are titled based on the type of data that was generated using the proposed method. 

# Grading scale type: Folders will start with either "Spencer" or "KismanMasurel" indicating the audio files will be sorted based on either grading scale. 

# Baseline Acquisition source: Folders and files will be labeled with "precordial" or "subclavian" to indicate the baseline human data acquisition method, through precordium (precordial) or of the subclavian vein (subclavian)

# Processing Method: (Only applicable to Precordial data) describes if the synthetic Doppler data is generated with either "FullCardiacCycle" or "PartialCardiacCycle", which are methods to simulate differences in how humans graders may be unable to hear bubbles that occur during the louder sections of a cardiac cycle.

# Grade: Each file is indicated by the grade either as a single digit number (0-4) when using the Spencer system, or a triple-digit number (000-444) based on the Kisman-Masurel scale. 

# Multiple recordings: File names end with a number from 1-1000 corresponding to separately generated synthetic post-dive doppler recordings. 


File types
-------------------------------
Two main filetypes exist: 1) .wav files for all Doppler audio recordings 2) .mat file for isolated signals that are preprocessed for matlab usage.

Data Structure
===============================

The data available on Dryad contains two main directories, numbered based on the type of data it is: 
SyntheticDU_dataset.zip:
	1_BaselineData contains all subclavian and precordial human Doppler recordings that were acquired without the subject performing a dive as well as in vitro recordings of bubbles passing through a flow phantom. Furthermore, it contains a .mat file that contains the isolated individual bubbles in a cell format for processing.
	2_SyntheticDU contains procedurally generated Doppler ultrasound data using the baseline data provided in folder 1. 

SyntheticDU_examples.zip:
	1_SyntheticDU_1sample  contains 1 example of procedurally generated Doppler ultrasound data for every case of Spencer, Kisman-Masurel, precordial, subclavian, and processing method, following the identical directory structure as 2_SyntheticDU. This folder exists to 



1_BaselineData # All baseline audio files used to generate synthetic post-dive Doppler ultrasound data
 ┣ PrecordialData	# All precordial DU recordings 
 ┃ ┣ AVD001_segment1.wav	# Individual recording .wav files with indication of continuous vs pulsed wave DU recording
 ┃ ┣ ...
 ┃ ┗ AVD018_Continuous mode.wav
 ┣ SubclavianData	# All subclavian DU recordings 
 ┃ ┣ J01-000 			# subdirectory indicating subject ID
 ┃ ┃ ┣ 20200204152052_LEFT_G0.wav	# individual subclavian .wav files, with indicator for left or right subclavian veins
 ┃ ┃ ┗ 20200204152151_RIGHT_G0.wav
 ┣ SimulatedBubblesBaseline	# All bubble-only DU recordings 
 ┃ ┣ 07-14-21.150rpm.001.m4a		# individual bubble-only recordings from a flow phantom. Indicated by recording date, pump speed (rpm), relative direction flow to transducer (blank = towards xducer, away, and perp= perpendicular)
 ┃ ┣...
 ┗ ┗ 07-14-21.randRPMperp.005.m4a
 ┗ IsolatedSingleBubbles.mat	# All individually isolated bubbles obtained from "SimulatedBubblesBaseline" after processing and saved in matlab accessible format. 



2_SyntheticDU # All synthetic post-dive audio files
 ┣ 1_KismanMasurel_Precordial_FullCardiacCycle 		# All files generated using Kisman-Masurel grading scale, on precordial human baseline data, and with bubbles placed anywhere within the cardiac cycle
 ┃ ┣ DopplerSynthBubbles 					# all bubble files that are combined with identically named file in "DopplerSynthBubbles" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 000								# all audio files that correspond to grade 000
 ┃ ┃ ┃ ┗ KM_Precordial_FullCardiacCycle_000_1.wav				# bubble-only .wav audio file with grade 000
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grades between 000-444
 ┃ ┃ ┃ ┗ KM_Precordial_FullCardiacCycle_..._1.wav				# bubble-only .wav audio file with grade ...
 ┃ ┃ ┗ 444								# all audio files that correspond to grade 444
 ┃ ┃ ┃ ┗ KM_Precordial_FullCardiacCycle_444_1.wav				# bubble-only .wav audio file with grade 444
 ┃ ┣ DopplerSynthCardiac					# all cardiac audio files that are combined with identically named file in "DopplerSynthCardiac" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 000								# all audio files that correspond to grade 000
 ┃ ┃ ┃ ┗ KM_Precordial_FullCardiacCycle_000_1.wav				# cardiac-only .wav audio file with grade 000
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grades between 000-444
 ┃ ┃ ┃ ┗ KM_Precordial_FullCardiacCycle_..._1.wav				# cardiac-only .wav audio file with grade ...
 ┃ ┃ ┗ 444								# all audio files that correspond to grade 444
 ┃ ┃ ┃ ┗ KM_Precordial_FullCardiacCycle_444_1.wav				# cardiac-only .wav audio file with grade 444
 ┃ ┗ DopplerSynthCombined					# Final synthetic Doppler data that is generated by combining the same name file in directories "DopplerSynthCardiac" and "DopplerSynthBubbles" with linear mixing
 ┃ ┃ ┣ 000								# all audio files that correspond to grade 000
 ┃ ┃ ┃ ┗ KM_Precordial_FullCardiacCycle_000_1.wav				# final synthetic post-dive DU .wav audio file with grade 000
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grades between 000-444
 ┃ ┃ ┃ ┗ KM_Precordial_FullCardiacCycle_..._1.wav				# final synthetic post-dive DU .wav audio file with grade ...
 ┃ ┃ ┗ 444								# all audio files that correspond to grade 444
 ┃ ┃ ┃ ┗ KM_Precordial_FullCardiacCycle_444_1.wav				# final synthetic post-dive DU .wav audio file with grade 444
 ┣ 2_KismanMasurel_Precordial_PartialCardiacCycle # All files generated using Kisman-Masurel grading scale, on precordial human baseline data, and with bubbles placed only within the low amplitude regions of the cardiac cycle
 ┃ ┣ DopplerSynthBubbles 					# all bubble files that are combined with identically named file in "DopplerSynthBubbles" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 000								# all audio files that correspond to grade 000
 ┃ ┃ ┃ ┗ KM_Precordial_PartialCardiacCycle_000_1.wav				# bubble-only .wav audio file with grade 000
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grades between 000-444
 ┃ ┃ ┃ ┗ KM_Precordial_PartialCardiacCycle_..._1.wav				# bubble-only .wav audio file with grade ...
 ┃ ┃ ┗ 444								# all audio files that correspond to grade 444
 ┃ ┃ ┃ ┗ KM_Precordial_PartialCardiacCycle_444_1.wav				# bubble-only .wav audio file with grade 444
 ┃ ┣ DopplerSynthCardiac					# all cardiac audio files that are combined with identically named file in "DopplerSynthCardiac" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 000								# all audio files that correspond to grade 000
 ┃ ┃ ┃ ┗ KM_Precordial_PartialCardiacCycle_000_1.wav				# cardiac-only .wav audio file with grade 000
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grades between 000-444
 ┃ ┃ ┃ ┗ KM_Precordial_PartialCardiacCycle_..._1.wav				# cardiac-only .wav audio file with grade ...
 ┃ ┃ ┗ 444								# all audio files that correspond to grade 444
 ┃ ┃ ┃ ┗ KM_Precordial_PartialCardiacCycle_444_1.wav				# cardiac-only .wav audio file with grade 444
 ┃ ┗ DopplerSynthCombined					# Final synthetic Doppler data that is generated by combining the same name file in directories "DopplerSynthCardiac" and "DopplerSynthBubbles" with linear mixing
 ┃ ┃ ┣ 000								# all audio files that correspond to grade 000
 ┃ ┃ ┃ ┗ KM_Precordial_PartialCardiacCycle_000_1.wav				# final synthetic post-dive DU .wav audio file with grade 000
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grades between 000-444
 ┃ ┃ ┃ ┗ KM_Precordial_PartialCardiacCycle_..._1.wav				# final synthetic post-dive DU .wav audio file with grade ...
 ┃ ┃ ┗ 444								# all audio files that correspond to grade 444
 ┃ ┃ ┃ ┗ KM_Precordial_PartialCardiacCycle_444_1.wav				# final synthetic post-dive DU .wav audio file with grade 444
 ┣ 3_KismanMasurel_Subclavian_FullCardiacCycle # All files generated using Kisman-Masurel grading scale, on subclavian human baseline data, and with bubbles 
 ┃ ┣ DopplerSynthBubbles 					# all bubble files that are combined with identically named file in "DopplerSynthBubbles" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 000								# all audio files that correspond to grade 000
 ┃ ┃ ┃ ┗ KM_Subclavian_FullCardiacCycle_000_1.wav				# bubble-only .wav audio file with grade 000
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grades between 000-444
 ┃ ┃ ┃ ┗ KM_Subclavian_FullCardiacCycle_..._1.wav				# bubble-only .wav audio file with grade ...
 ┃ ┃ ┗ 444								# all audio files that correspond to grade 444
 ┃ ┃ ┃ ┗ KM_Subclavian_FullCardiacCycle_444_1.wav				# bubble-only .wav audio file with grade 444
 ┃ ┣ DopplerSynthCardiac					# all cardiac audio files that are combined with identically named file in "DopplerSynthCardiac" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 000								# all audio files that correspond to grade 000
 ┃ ┃ ┃ ┗ KM_Subclavian_FullCardiacCycle_000_1.wav				# cardiac-only .wav audio file with grade 000
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grades between 000-444
 ┃ ┃ ┃ ┗ KM_Subclavian_FullCardiacCycle_..._1.wav				# cardiac-only .wav audio file with grade ...
 ┃ ┃ ┗ 444								# all audio files that correspond to grade 444
 ┃ ┃ ┃ ┗ KM_Subclavian_FullCardiacCycle_444_1.wav				# cardiac-only .wav audio file with grade 444
 ┃ ┗ DopplerSynthCombined					# Final synthetic Doppler data that is generated by combining the same name file in directories "DopplerSynthCardiac" and "DopplerSynthBubbles" with linear mixing
 ┃ ┃ ┣ 000								# all audio files that correspond to grade 000
 ┃ ┃ ┃ ┗ KM_Subclavian_FullCardiacCycle_000_1.wav				# final synthetic post-dive DU .wav audio file with grade 000
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grades between 000-444
 ┃ ┃ ┃ ┗ KM_Subclavian_FullCardiacCycle_..._1.wav				# final synthetic post-dive DU .wav audio file with grade ...
 ┃ ┃ ┗ 444								# all audio files that correspond to grade 444
 ┃ ┃ ┃ ┗ KM_Subclavian_FullCardiacCycle_444_1.wav				# final synthetic post-dive DU .wav audio file with grade 444
 ┣ 4_Spencer_Precordial_FullCardiacCycle 	# All files generated using Spencer grading scale, on precordial human baseline data, and with bubbles placed anywhere within the cardiac cycle
 ┃ ┣ DopplerSynthBubbles 					# all bubble files that are combined with identically named file in "DopplerSynthBubbles" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 0								# all audio files that correspond to grade 0
 ┃ ┃ ┃ ┗ Spencer_Precordial_FullCardiacCycle_1_1.wav				# bubble-only .wav audio file with grade 0
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grade 1-3
 ┃ ┃ ┃ ┗ Spencer_Precordial_FullCardiacCycle_2_1.wav				# bubble-only .wav audio file with grade 1-3
 ┃ ┃ ┗ 4								# all audio files that correspond to grade 4
 ┃ ┃ ┃ ┗ Spencer_Precordial_FullCardiacCycle_5_1.wav				# bubble-only .wav audio file with grade 4
 ┃ ┣ DopplerSynthCardiac 					# all cardiac audio files that are combined with identically named file in "DopplerSynthCardiac" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 0								# all audio files that correspond to grade 0
 ┃ ┃ ┃ ┗ Spencer_Precordial_FullCardiacCycle_1_1.wav				# bubble-only .wav audio file with grade 0
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grade 1-3
 ┃ ┃ ┃ ┗ Spencer_Precordial_FullCardiacCycle_2_1.wav				# bubble-only .wav audio file with grade 1-3
 ┃ ┃ ┗ 4								# all audio files that correspond to grade 4
 ┃ ┃ ┃ ┗ Spencer_Precordial_FullCardiacCycle_5_1.wav				# bubble-only .wav audio file with grade 4
 ┃ ┗ DopplerSynthCombined					# Final synthetic Doppler data that is generated by combining the same name file in directories "DopplerSynthCardiac" and "DopplerSynthBubbles" with linear mixing
 ┃ ┃ ┣ 0								# all audio files that correspond to grade 0
 ┃ ┃ ┃ ┗ Spencer_Precordial_FullCardiacCycle_1_1.wav				# bubble-only .wav audio file with grade 0
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grade 1-3
 ┃ ┃ ┃ ┗ Spencer_Precordial_FullCardiacCycle_2_1.wav				# bubble-only .wav audio file with grade 1-3
 ┃ ┃ ┗ 4								# all audio files that correspond to grade 4
 ┃ ┃ ┃ ┗ Spencer_Precordial_FullCardiacCycle_5_1.wav				# bubble-only .wav audio file with grade 4
 ┣ 5_Spencer_Precordial_PartialCardiacCycle 	# All files generated using Spencer grading scale, on precordial human baseline data, and with bubbles placed only within the low amplitude regions of the cardiac cycle
 ┃ ┣ DopplerSynthBubbles 					# all bubble files that are combined with identically named file in "DopplerSynthBubbles" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 0								# all audio files that correspond to grade 0
 ┃ ┃ ┃ ┗ Spencer_Precordial_PartialCardiacCycle_1_1.wav				# bubble-only .wav audio file with grade 0
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grade 1-3
 ┃ ┃ ┃ ┗ Spencer_Precordial_PartialCardiacCycle_2_1.wav				# bubble-only .wav audio file with grade 1-3
 ┃ ┃ ┗ 4								# all audio files that correspond to grade 4
 ┃ ┃ ┃ ┗ Spencer_Precordial_PartialCardiacCycle_5_1.wav				# bubble-only .wav audio file with grade 4
 ┃ ┣ DopplerSynthCardiac 					# all cardiac audio files that are combined with identically named file in "DopplerSynthCardiac" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 0								# all audio files that correspond to grade 0
 ┃ ┃ ┃ ┗ Spencer_Precordial_PartialCardiacCycle_1_1.wav				# bubble-only .wav audio file with grade 0
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grade 1-3
 ┃ ┃ ┃ ┗ Spencer_Precordial_PartialCardiacCycle_2_1.wav				# bubble-only .wav audio file with grade 1-3
 ┃ ┃ ┗ 4								# all audio files that correspond to grade 4
 ┃ ┃ ┃ ┗ Spencer_Precordial_PartialCardiacCycle_5_1.wav				# bubble-only .wav audio file with grade 4
 ┃ ┗ DopplerSynthCombined					# Final synthetic Doppler data that is generated by combining the same name file in directories "DopplerSynthCardiac" and "DopplerSynthBubbles" with linear mixing
 ┃ ┃ ┣ 0								# all audio files that correspond to grade 0
 ┃ ┃ ┃ ┗ Spencer_Precordial_PartialCardiacCycle_1_1.wav				# bubble-only .wav audio file with grade 0
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grade 1-3
 ┃ ┃ ┃ ┗ Spencer_Precordial_PartialCardiacCycle_2_1.wav				# bubble-only .wav audio file with grade 1-3
 ┃ ┃ ┗ 4								# all audio files that correspond to grade 4
 ┃ ┃ ┃ ┗ Spencer_Precordial_PartialCardiacCycle_5_1.wav				# bubble-only .wav audio file with grade 4
 ┣ 6_Spencer_Subclavian_FullCardiacCycle 	# All files generated using Spencer grading scale, on Subclavian human baseline data, and with bubbles placed anywhere within the cardiac cycle
 ┃ ┣ DopplerSynthBubbles 					# all bubble files that are combined with identically named file in "DopplerSynthBubbles" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 0								# all audio files that correspond to grade 0
 ┃ ┃ ┃ ┗ Spencer_Subclavian_FullCardiacCycle_1_1.wav				# bubble-only .wav audio file with grade 0
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grade 1-3
 ┃ ┃ ┃ ┗ Spencer_Subclavian_FullCardiacCycle_2_1.wav				# bubble-only .wav audio file with grade 1-3
 ┃ ┃ ┗ 4								# all audio files that correspond to grade 4
 ┃ ┃ ┃ ┗ Spencer_Subclavian_FullCardiacCycle_5_1.wav				# bubble-only .wav audio file with grade 4
 ┃ ┣ DopplerSynthCardiac 					# all cardiac audio files that are combined with identically named file in "DopplerSynthCardiac" directory to create the final synthetic data file with same name in "DopplerSynthCombined" directory
 ┃ ┃ ┣ 0								# all audio files that correspond to grade 0
 ┃ ┃ ┃ ┗ Spencer_Subclavian_FullCardiacCycle_1_1.wav				# bubble-only .wav audio file with grade 0
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grade 1-3
 ┃ ┃ ┃ ┗ Spencer_Subclavian_FullCardiacCycle_2_1.wav				# bubble-only .wav audio file with grade 1-3
 ┃ ┃ ┗ 4								# all audio files that correspond to grade 4
 ┃ ┃ ┃ ┗ Spencer_Subclavian_FullCardiacCycle_5_1.wav				# bubble-only .wav audio file with grade 4
 ┃ ┗ DopplerSynthCombined					# Final synthetic Doppler data that is generated by combining the same name file in directories "DopplerSynthCardiac" and "DopplerSynthBubbles" with linear mixing
 ┃ ┃ ┣ 0								# all audio files that correspond to grade 0
 ┃ ┃ ┃ ┗ Spencer_Subclavian_FullCardiacCycle_1_1.wav				# bubble-only .wav audio file with grade 0
 ┃ ┃ ┣ ...								# all audio files that correspond to intermediate grade 1-3
 ┃ ┃ ┃ ┗ Spencer_Subclavian_FullCardiacCycle_2_1.wav				# bubble-only .wav audio file with grade 1-3
 ┃ ┃ ┗ 4								# all audio files that correspond to grade 4
 ┃ ┃ ┃ ┗ Spencer_Subclavian_FullCardiacCycle_5_1.wav				# bubble-only .wav audio file with grade 4
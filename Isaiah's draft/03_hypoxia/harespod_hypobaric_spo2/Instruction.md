# Instruction of the project

## Basic Infomation

Basic information of our dataset is as follow:

| Subjects         | 23       |
|------------------|----------|
| Male             | 10 (43%) |
| Female           | 13 (57%) |
| Low Quality      | 8 (34%)  |
| Early Stop       | 2 (9%)   |
| Total Time       | 20 Hours |
| Time per Subject | 50 Min   |

## Structure

The structure of our data repository is as follow:

├─Codes_Arch                # Codes for acquisition, processing, analysis and visualisation
│  ├─Berry_Related         # Codes modified of Berry Equipment to output data records
│  ├─Data_Preprocess       # Codes for preprocess
│  ├─Data_Visualization    # Codes for data visulization
│  └─Time_Related          # Codes for get current timestamp
├─Data_Cons                 # Continuously data of each subject
│  ├─217a
│  ├─218c
│  ├─...
├─Data_Disc                 # Splitted data of each subject
│  ├─217a
│  ├─218c
│  ├─...
└─Data_Incomp               # Incomplete data
    ├─113a
    ├─218a
    └─...

## Note

- As there is no license from BerryMed to make its source code public, only the code we modified is provided in the `Main/Code_Arch/Berry_Related/` folder.
- Data in `Data_Incomp` are incomplete, so not provided as the main part of this dataset. If you are interested in any part of those data, you can explore it yourself.

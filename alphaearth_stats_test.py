# %%
import polars as pl
import json
from pathlib import Path
from datetime import datetime
from itertools import combinations
import time

# %%    
# Load CSV
df = pl.read_csv('/Users/justi/Library/CloudStorage/GoogleDrive-justin.m.guthrie@gmail.com/.shortcut-targets-by-id/1_3G9ilbHd03vr6JkCJDHqAQoc7FFCBAy/Data/data_backup_felipe/AlphaEarth_experiments_full_data.csv')
print(f"Loaded {len(df)} rows")
# %%
# view distribution of countries
country_counts = df['country'].value_counts().sort('count', descending=True)

pl.Config.set_tbl_rows(-1)
print(country_counts)
# %%

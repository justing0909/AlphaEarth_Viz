#!/usr/bin/env python3
"""
AlphaEarth Statistics Computation
Processes ML experiment data and generates pre-computed statistics for the dashboard.
"""

import polars as pl
import json
from pathlib import Path
from datetime import datetime
from itertools import combinations
import time

def compute_statistics():
    """
    Load CSV with Polars and compute all necessary statistics.
    Outputs to data/statistics.json
    """
    
    print("=" * 70)
    print("ALPHAEARTH STATISTICS COMPUTATION")
    print("=" * 70)
    
    # Configuration
    csv_path = Path('/Users/justi/Library/CloudStorage/GoogleDrive-justin.m.guthrie@gmail.com/.shortcut-targets-by-id/1_3G9ilbHd03vr6JkCJDHqAQoc7FFCBAy/Data/data_backup_felipe/AlphaEarth_experiments_full_data.csv')
    output_path = Path('data/statistics.json')
    ROWS_TO_CLEAN = 3788
    KEEP_COLUMNS = [
        "date", "timestamp", "country", "min_lon", "min_lat", 
        "max_lon", "max_lat", "mean_lat", "mean_lon", "area", 
        "degrees_lon", "degrees_lat"
    ]
    
    print(f"\nLoading {csv_path}...")
    
    # Load CSV
    df = pl.read_csv(csv_path)
    print(f"Loaded {len(df)} rows")

    # Convert European decimals to floats
    print("\nConverting European decimals to floats...")
    float_columns = [
        'min_lon', 'min_lat', 'max_lon', 'max_lat', 'mean_lat', 'mean_lon', 
        'area', 'degrees_lon', 'degrees_lat', 'accuracy', 'roc_auc',
        'class_1_pre', 'class_1_recall', 'class_1_f1',
        'class_2_precision', 'class_2_recall', 'class_2_f1',
    ] + [f'acc_{i}e' for i in range(1, 31)] + \
        [f'auc_{i}e' for i in range(1, 31)] + \
        [f'prec_class1_{i}e' for i in range(1, 31)] + \
        [f'prec_class2_{i}e' for i in range(1, 31)] + \
        [f'rec_class1_{i}e' for i in range(1, 31)] + \
        [f'rec_class2_{i}e' for i in range(1, 31)] + \
        [f'f1_class1_{i}e' for i in range(1, 31)] + \
        [f'f1_class2_{i}e' for i in range(1, 31)]
    
    # Add importance columns
    float_columns.append('importance')
    for i in range(1, 70):
        float_columns.append(f'importance.{i}')
        float_columns.append(f'impA{i:02d}')
    
    df = df.with_columns([
        pl.col(col).str.replace(',', '.').cast(pl.Float64)
        for col in float_columns if col in df.columns
    ])
    
    print("Conversion complete")

    # 1. COUNTRY DISTRIBUTION
    print("\n=== 1. COUNTRY DISTRIBUTION ===")

    # IMPORTANT: Use the FULL dataset (df), not filtered_df!
    # We want ALL experiments by country, not just "All other classes"
    country_stats = (
        df
        .filter(
            pl.col('country').is_not_null() &
            pl.col('accuracy').is_not_null()
        )
        .group_by('country')
        .agg([
            pl.len().alias('experiment_count'),
            pl.col('accuracy').mean().alias('avg_accuracy'),
            pl.col('roc_auc').mean().alias('avg_roc_auc'),
            pl.col('accuracy').std().alias('std_accuracy'),
            pl.col('roc_auc').std().alias('std_roc_auc')
        ])
        .sort('experiment_count', descending=True)
    )

    print(f"Found {len(country_stats)} unique countries")
    print(country_stats)
    
    print(f"Found {len(country_stats)} unique countries")
    
    
    # Get original schema for casting
    original_dtypes = df.schema
    
    # Clean first 3788 rows
    print(f"\nCleaning first {ROWS_TO_CLEAN} rows...")
    df_to_clean = df.head(ROWS_TO_CLEAN)
    df_good = df.slice(ROWS_TO_CLEAN, len(df))
    
    columns_to_null = [col for col in df.columns if col not in KEEP_COLUMNS]
    
    # Create cleaned version with proper dtypes
    df_cleaned = df_to_clean.with_columns([
        pl.lit(None).cast(original_dtypes[col]).alias(col) 
        for col in columns_to_null
    ])
    
    # Concatenate
    df = pl.concat([df_cleaned, df_good])
    print(f"Final dataframe: {len(df)} rows")
    

    # Filter for "All other classes"
    print("\nFiltering for 'All other classes' experiments...")
    filtered_df = df.filter(
        (pl.col('name_class1') == 'All other classes') | 
        (pl.col('name_class2') == 'All other classes')
    )
    print(f"Filtered to {len(filtered_df)} rows")
    
    # Get embedding columns
    embedding_cols = [col for col in filtered_df.columns if col.startswith('embedding')]
    importance_cols = [col for col in filtered_df.columns if col.startswith('imp')]
    
    print("\n" + "=" * 70)
    print("COMPUTING STATISTICS FOR ALL DASHBOARD COMPONENTS")
    print("=" * 70)
    
    # 2. MODEL PERFORMANCE STATISTICS
    print("\n=== 2. MODEL PERFORMANCE ===")
    
    model_stats = (
        filtered_df
        .filter(
            (pl.col('accuracy').is_not_null()) &
            (pl.col('model').is_not_null())
        )
        .group_by('model')
        .agg([
            pl.col('accuracy').mean().alias('avg_accuracy'),
            pl.col('accuracy').min().alias('min_accuracy'),
            pl.col('accuracy').max().alias('max_accuracy'),
            pl.col('accuracy').std().alias('std_accuracy'),
            pl.col('roc_auc').mean().alias('avg_roc_auc'),
            pl.col('roc_auc').min().alias('min_roc_auc'),
            pl.col('roc_auc').max().alias('max_roc_auc'),
            pl.col('roc_auc').std().alias('std_roc_auc'),
            pl.len().alias('experiment_count')
        ])
        .sort('avg_accuracy', descending=True)
    )
    
    print(f"Found {len(model_stats)} unique models")
    
    
    # 3. RECENT EXPERIMENTS
    print("\n=== 3. RECENT EXPERIMENTS ===")
    
    recent_experiments = (
        filtered_df
        .sort('timestamp', descending=True)
        .head(100)
        .select([
            'timestamp', 'country', 'name_class1', 'name_class2', 'model',
            'accuracy', 'roc_auc', 'embedding', 'importance',
            'embedding.1', 'importance.1', 'embedding.2', 'importance.2'
        ])
    )
    
    print(f"Recent {len(recent_experiments)} experiments")
    
    # 4. EMBEDDING IMPORTANCE BY CLASS PAIRS
    print("\n=== 4. EMBEDDING IMPORTANCE BY CLASS PAIRS ===")
    
    embedding_data = []
    
    for idx, row in enumerate(filtered_df.iter_rows(named=True)):
        class_pair = f"{row['name_class1']} vs {row['name_class2']}"
        
        for emb_col, imp_col in zip(embedding_cols[:10], importance_cols[:10]):
            if row.get(emb_col) and row.get(imp_col):
                embedding_data.append({
                    'class_pair': class_pair,
                    'class1': row['name_class1'],
                    'class2': row['name_class2'],
                    'embedding': row[emb_col],
                    'importance': row[imp_col],
                    'country': row['country'],
                    'timestamp': row['timestamp']
                })
    
    embedding_importance_df = pl.DataFrame(embedding_data)
    
    embedding_by_class = (
        embedding_importance_df
        .group_by(['class_pair', 'embedding'])
        .agg([
            pl.col('importance').mean().alias('avg_importance'),
            pl.col('importance').max().alias('max_importance'),
            pl.len().alias('occurrences')
        ])
        .sort('avg_importance', descending=True)
    )
    
    print(f"Found {len(embedding_by_class)} unique embedding-class combinations")
    
    # 5. CLASS PAIR PERFORMANCE MATRIX
    print("\n=== 5. CLASS PAIR PERFORMANCE MATRIX ===")
    
    class_pair_performance = (
        filtered_df
        .group_by(['name_class1', 'name_class2'])
        .agg([
            pl.col('accuracy').mean().alias('avg_accuracy'),
            pl.col('accuracy').std().alias('std_accuracy'),
            pl.col('roc_auc').mean().alias('avg_roc_auc'),
            pl.col('class_1_pre').mean().alias('avg_class1_precision'),
            pl.col('class_1_recall').mean().alias('avg_class1_recall'),
            pl.col('class_1_f1').mean().alias('avg_class1_f1'),
            pl.col('class_2_precision').mean().alias('avg_class2_precision'),
            pl.col('class_2_recall').mean().alias('avg_class2_recall'),
            pl.col('class_2_f1').mean().alias('avg_class2_f1'),
            pl.len().alias('experiment_count')
        ])
        .sort('experiment_count', descending=True)
    )
    
    print(f"Found {len(class_pair_performance)} unique class pairs")
    
    # 6. CLASS DEMAND NETWORK
    print("\n=== 6. CLASS DEMAND (Co-occurrence counts) ===")
    
    class_cooccurrence = (
        filtered_df
        .group_by(['name_class1', 'name_class2'])
        .agg([
            pl.len().alias('count')
        ])
        .sort('count', descending=True)
    )
    
    print(f"Found {len(class_cooccurrence)} unique class pairings")
    
    # 7. EMBEDDING CO-OCCURRENCE (50% random sample)
    print("\n=== 7. EMBEDDING CO-OCCURRENCE (RANDOM SAMPLED) ===")
    
    sampled_for_cooccurrence = (
        filtered_df
        .with_columns([
            pl.int_range(0, pl.len()).over(['name_class1', 'name_class2']).alias('row_num')
        ])
        .with_columns([
            pl.col('row_num').hash(seed=42).alias('hash')
        ])
        .filter(
            pl.col('hash') % 2 == 0
        )
    )
    
    print(f"Sampled {len(sampled_for_cooccurrence)} experiments (random 50% per class pair)")
    
    embedding_pairs_list = []
    batch_size = 500
    total_rows = len(sampled_for_cooccurrence)
    TOP_N_EMBEDDINGS = 10
    
    start_time = time.time()
    last_print = start_time
    
    for i in range(0, total_rows, batch_size):
        batch = sampled_for_cooccurrence[i:i+batch_size]
        
        for row in batch.select(['name_class1', 'name_class2', *embedding_cols[:TOP_N_EMBEDDINGS]]).iter_rows(named=True):
            embeddings = [row[col] for col in embedding_cols[:TOP_N_EMBEDDINGS] if row.get(col)]
            
            if len(embeddings) >= 2:
                for emb1, emb2 in combinations(sorted(embeddings), 2):
                    embedding_pairs_list.append({
                        'embedding1': emb1,
                        'embedding2': emb2,
                        'class1': row['name_class1'],
                        'class2': row['name_class2']
                    })
        
        current_time = time.time()
        if current_time - last_print >= 2:
            progress = (i + batch_size) / total_rows * 100
            elapsed = current_time - start_time
            rate = (i + batch_size) / elapsed if elapsed > 0 else 0
            eta = (total_rows - i - batch_size) / rate if rate > 0 else 0
            
            print(f"Progress: {i + batch_size}/{total_rows} ({progress:.1f}%) | "
                  f"Rate: {rate:.0f} rows/sec | "
                  f"Pairs: {len(embedding_pairs_list):,} | "
                  f"ETA: {eta/60:.1f} min")
            last_print = current_time
    
    print(f"\nCompleted! Created {len(embedding_pairs_list):,} embedding pairs")
    print(f"Total time: {(time.time() - start_time)/60:.1f} minutes")
    
    embedding_pairs_df = pl.DataFrame(embedding_pairs_list)
    
    embedding_cooccurrence = (
        embedding_pairs_df
        .group_by(['embedding1', 'embedding2'])
        .agg([
            pl.len().alias('cooccurrence_count')
        ])
        .sort('cooccurrence_count', descending=True)
    )
    
    embedding_cooccurrence_by_class = (
        embedding_pairs_df
        .group_by(['embedding1', 'embedding2', 'class1', 'class2'])
        .agg([
            pl.len().alias('count')
        ])
        .sort('count', descending=True)
    )
    
    print(f"Found {len(embedding_cooccurrence)} unique embedding pairs")
    
    # 8. EMBEDDING IMPORTANCE RANKINGS BY CLASS PAIR
    print("\n=== 8. EMBEDDING IMPORTANCE RANKINGS BY CLASS PAIR ===")
    
    embedding_rankings = (
        embedding_by_class
        .sort(['embedding', 'avg_importance'], descending=[False, True])
        .with_columns([
            pl.col('avg_importance').rank('dense', descending=True).over('embedding').alias('rank')
        ])
    )
    
    print(f"Embedding rankings computed")
    
    # 9. GEOGRAPHIC BOUNDING BOXES
    print("\n=== 9. GEOGRAPHIC BOUNDING BOXES ===")
    
    geographic_experiments = (
        filtered_df
        .select([
            'timestamp', 'country', 'name_class1', 'name_class2', 'model',
            'accuracy', 'min_lon', 'min_lat', 'max_lon', 'max_lat',
            'mean_lon', 'mean_lat', 'area', 'degrees_lon', 'degrees_lat'
        ])
        .filter(
            pl.col('min_lon').is_not_null() &
            pl.col('min_lat').is_not_null() &
            pl.col('max_lon').is_not_null() &
            pl.col('max_lat').is_not_null()
        )
    )
    
    print(f"Found {len(geographic_experiments)} experiments with bounding boxes")
    
    # 10. SYNTHETIC DATA STATISTICS (Armenia)
    print("\n=== 10. SYNTHETIC DATA STATISTICS (ARMENIA) ===")
    
    synthetic_data = filtered_df.filter(pl.col('country') == 'Armenia')
    print(f"Found {len(synthetic_data)} synthetic experiments from Armenia")
    
    synthetic_class_stats = (
        synthetic_data
        .filter(
            (pl.col('name_class2') == 'All other classes') |
            (pl.col('name_class1') == 'All other classes')
        )
        .with_columns([
            pl.when(pl.col('name_class1') == 'All other classes')
              .then(pl.col('name_class2'))
              .otherwise(pl.col('name_class1'))
              .alias('class_name')
        ])
        .group_by('class_name')
        .agg([
            pl.col('accuracy').mean().alias('avg_accuracy'),
            pl.col('accuracy').std().alias('std_accuracy'),
            pl.col('class_1_f1').mean().alias('avg_f1'),
            pl.col('class_1_f1').std().alias('std_f1'),
            pl.col('class_1_recall').mean().alias('avg_recall'),
            pl.col('class_1_recall').std().alias('std_recall'),
            pl.col('class_1_pre').mean().alias('avg_precision'),
            pl.col('class_1_pre').std().alias('std_precision'),
            pl.len().alias('experiment_count')
        ])
        .sort('avg_accuracy', descending=True)
    )
    
    print(f"Statistics for {len(synthetic_class_stats)} classes in synthetic data")
    
    # 11. UNIFIED ML STATISTICS MATRIX
    print("\n=== 11. UNIFIED ML STATISTICS MATRIX (X vs All Other Classes) ===")
    
    all_other_comparisons = (
        filtered_df
        .filter(
            (pl.col('name_class2') == 'All other classes') |
            (pl.col('name_class1') == 'All other classes')
        )
        .with_columns([
            pl.when(pl.col('name_class1') == 'All other classes')
              .then(pl.col('name_class2'))
              .otherwise(pl.col('name_class1'))
              .alias('specific_class'),
            pl.when(pl.col('name_class1') == 'All other classes')
              .then(pl.col('class_2_f1'))
              .otherwise(pl.col('class_1_f1'))
              .alias('specific_class_f1'),
            pl.when(pl.col('name_class1') == 'All other classes')
              .then(pl.col('class_2_recall'))
              .otherwise(pl.col('class_1_recall'))
              .alias('specific_class_recall'),
            pl.when(pl.col('name_class1') == 'All other classes')
              .then(pl.col('class_2_precision'))
              .otherwise(pl.col('class_1_pre'))
              .alias('specific_class_precision')
        ])
    )
    
    unified_ml_matrix = (
        all_other_comparisons
        .group_by('specific_class')
        .agg([
            pl.col('accuracy').mean().alias('avg_accuracy'),
            pl.col('accuracy').std().alias('std_accuracy'),
            pl.col('accuracy').min().alias('min_accuracy'),
            pl.col('accuracy').max().alias('max_accuracy'),
            
            pl.col('specific_class_f1').mean().alias('avg_f1'),
            pl.col('specific_class_f1').std().alias('std_f1'),
            pl.col('specific_class_f1').min().alias('min_f1'),
            pl.col('specific_class_f1').max().alias('max_f1'),
            
            pl.col('specific_class_recall').mean().alias('avg_recall'),
            pl.col('specific_class_recall').std().alias('std_recall'),
            pl.col('specific_class_recall').min().alias('min_recall'),
            pl.col('specific_class_recall').max().alias('max_recall'),
            
            pl.col('specific_class_precision').mean().alias('avg_precision'),
            pl.col('specific_class_precision').std().alias('std_precision'),
            pl.col('specific_class_precision').min().alias('min_precision'),
            pl.col('specific_class_precision').max().alias('max_precision'),
            
            pl.col('roc_auc').mean().alias('avg_roc_auc'),
            pl.col('roc_auc').std().alias('std_roc_auc'),
            
            pl.len().alias('experiment_count')
        ])
        .sort('avg_accuracy', descending=True)
    )
    
    print(f"Unified matrix for {len(unified_ml_matrix)} classes")
    
    # 12. REGION OF INTEREST (ROI) STATISTICS
    print("\n=== 12. REGION OF INTEREST (ROI) STATISTICS ===")
    
    roi_stats = (
        filtered_df
        .filter(
            pl.col('min_lon').is_not_null() &
            pl.col('min_lat').is_not_null() &
            pl.col('max_lon').is_not_null() &
            pl.col('max_lat').is_not_null()
        )
        .with_columns([
            (pl.col('min_lon').cast(str) + ',' + 
             pl.col('min_lat').cast(str) + ',' + 
             pl.col('max_lon').cast(str) + ',' + 
             pl.col('max_lat').cast(str)).alias('roi_id'),
            
            ((pl.col('min_lon') + pl.col('max_lon')) / 2).alias('center_lon'),
            ((pl.col('min_lat') + pl.col('max_lat')) / 2).alias('center_lat')
        ])
        .group_by(['roi_id', 'min_lon', 'min_lat', 'max_lon', 'max_lat', 'center_lon', 'center_lat'])
        .agg([
            pl.col('country').first().alias('country'),
            pl.col('area').first().alias('area'),
            pl.col('degrees_lon').first().alias('degrees_lon'),
            pl.col('degrees_lat').first().alias('degrees_lat'),
            
            pl.col('accuracy').mean().alias('avg_accuracy'),
            pl.col('accuracy').std().alias('std_accuracy'),
            pl.col('accuracy').min().alias('min_accuracy'),
            pl.col('accuracy').max().alias('max_accuracy'),
            
            pl.col('class_1_f1').mean().alias('avg_f1'),
            pl.col('class_1_f1').std().alias('std_f1'),
            
            pl.col('class_1_recall').mean().alias('avg_recall'),
            pl.col('class_1_recall').std().alias('std_recall'),
            
            pl.col('class_1_pre').mean().alias('avg_precision'),
            pl.col('class_1_pre').std().alias('std_precision'),
            
            pl.col('roc_auc').mean().alias('avg_roc_auc'),
            
            pl.len().alias('experiment_count'),
            pl.col('name_class1').unique().alias('classes_tested')
        ])
        .sort('avg_accuracy', descending=True)
    )
    
    print(f"Found {len(roi_stats)} unique regions of interest")
    
    # 13. INTERPOLATED HEATMAP DATA
    print("\n=== 13. INTERPOLATED HEATMAP DATA ===")
    
    GRID_RESOLUTION = 1.0
    
    heatmap_grid = (
        filtered_df
        .filter(
            pl.col('mean_lon').is_not_null() &
            pl.col('mean_lat').is_not_null()
        )
        .with_columns([
            ((pl.col('mean_lon') / GRID_RESOLUTION).round() * GRID_RESOLUTION).alias('grid_lon'),
            ((pl.col('mean_lat') / GRID_RESOLUTION).round() * GRID_RESOLUTION).alias('grid_lat')
        ])
        .group_by(['grid_lon', 'grid_lat'])
        .agg([
            pl.col('accuracy').mean().alias('avg_accuracy'),
            pl.len().alias('sample_count'),
            pl.col('class_1_f1').mean().alias('avg_f1'),
            pl.col('class_1_recall').mean().alias('avg_recall'),
            pl.col('class_1_pre').mean().alias('avg_precision'),
            pl.col('roc_auc').mean().alias('avg_roc_auc'),
            
            pl.col('country').unique().alias('countries')
        ])
        .sort(['grid_lat', 'grid_lon'])
    )
    
    print(f"Created grid with {len(heatmap_grid)} cells at {GRID_RESOLUTION}-degree resolution")
    
    heatmap_by_metric = {
        'accuracy': heatmap_grid.select(['grid_lon', 'grid_lat', 'avg_accuracy', 'sample_count']).to_dicts(),
        'f1': heatmap_grid.select(['grid_lon', 'grid_lat', 'avg_f1', 'sample_count']).to_dicts(),
        'recall': heatmap_grid.select(['grid_lon', 'grid_lat', 'avg_recall', 'sample_count']).to_dicts(),
        'precision': heatmap_grid.select(['grid_lon', 'grid_lat', 'avg_precision', 'sample_count']).to_dicts()
    }
    
    print(f"Heatmap data prepared for {len(heatmap_by_metric)} metrics")
    
    # COMPILE ALL STATISTICS INTO FINAL JSON
    print("\n=== COMPILING FINAL STATISTICS ===")
    
    statistics = {
        'generated_at': datetime.now().isoformat(),
        'metadata': {
            'total_experiments': len(filtered_df),
            'total_rows_in_csv': len(df),
            'rows_cleaned': ROWS_TO_CLEAN,
            'date_range': {
                'earliest': str(filtered_df['timestamp'].min()),
                'latest': str(filtered_df['timestamp'].max())
            }
        },
        
        # For index.tsx
        'model_performance': model_stats.to_dicts(),
        'country_distribution': country_stats.to_dicts(),
        'recent_experiments': recent_experiments.to_dicts(),
        'embedding_importance_by_class': embedding_by_class.head(500).to_dicts(),
        
        # For conceptual.tsx
        'class_pair_performance': class_pair_performance.to_dicts(),
        'class_cooccurrence': class_cooccurrence.to_dicts(),
        'embedding_cooccurrence': embedding_cooccurrence.head(1000).to_dicts(),
        'embedding_cooccurrence_by_class': embedding_cooccurrence_by_class.head(1000).to_dicts(),
        'embedding_rankings_by_class': embedding_rankings.head(2000).to_dicts(),
        
        # NEW: Synthetic data analysis
        'synthetic_class_stats': synthetic_class_stats.to_dicts(),
        
        # NEW: Unified ML matrix for "X vs All other classes"
        'unified_ml_matrix': unified_ml_matrix.to_dicts(),
        
        # For geo.tsx
        'geographic_experiments': geographic_experiments.to_dicts(),
        
        # NEW: ROI statistics
        'roi_statistics': roi_stats.to_dicts(),
        
        # NEW: Heatmap data for interpolation
        'heatmap_grid': heatmap_grid.to_dicts(),
        'heatmap_by_metric': heatmap_by_metric,
        
        # Summary stats
        'summary': {
            'total_models': len(model_stats),
            'total_countries': len(country_stats),
            'total_class_pairs': len(class_pair_performance),
            'total_unique_embeddings': len(embedding_by_class.select('embedding').unique()),
            'experiments_with_bounding_boxes': len(geographic_experiments),
            'total_rois': len(roi_stats),
            'synthetic_experiments': len(synthetic_data),
            'heatmap_grid_cells': len(heatmap_grid)
        }
    }
    
    # Write to JSON
    output_path.parent.mkdir(exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(statistics, f, indent=2)
    
    print(f"\n[OK] Statistics written to {output_path}")
    print(f"File size: {output_path.stat().st_size / (1024*1024):.2f} MB")
    print("=" * 70)
    print("STATISTICS GENERATION COMPLETE!")
    print("=" * 70)

if __name__ == '__main__':
    try:
        compute_statistics()
    except Exception as e:
        print(f"\n ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
// lib/types.ts
export interface Statistics {
  generated_at: string
  metadata: {
    total_experiments: number
    total_rows_in_csv: number
    rows_cleaned: number
    date_range: {
      earliest: string
      latest: string
    }
  }
  model_performance: ModelPerformance[]
  country_distribution: CountryDistribution[]
  recent_experiments: RecentExperiment[]
  embedding_importance_by_class: EmbeddingImportance[]
  class_pair_performance: ClassPairPerformance[]
  class_cooccurrence: ClassCooccurrence[]
  embedding_cooccurrence: EmbeddingCooccurrence[]
  embedding_cooccurrence_by_class: EmbeddingCooccurrenceByClass[]
  embedding_rankings_by_class: EmbeddingRanking[]
  synthetic_class_stats: SyntheticClassStats[]
  unified_ml_matrix: UnifiedMLMatrix[]
  geographic_experiments: GeographicExperiment[]
  roi_statistics: ROIStatistics[]
  heatmap_grid: HeatmapGridPoint[]
  heatmap_by_metric: {
    accuracy: HeatmapPoint[]
    f1: HeatmapPoint[]
    recall: HeatmapPoint[]
    precision: HeatmapPoint[]
  }
  summary: {
    total_models: number
    total_countries: number
    total_class_pairs: number
    total_unique_embeddings: number
    experiments_with_bounding_boxes: number
    total_rois: number
    synthetic_experiments: number
    heatmap_grid_cells: number
  }
}

export interface ModelPerformance {
  model: string
  avg_accuracy: number
  min_accuracy: number
  max_accuracy: number
  std_accuracy: number
  avg_roc_auc: number
  min_roc_auc: number
  max_roc_auc: number
  std_roc_auc: number
  experiment_count: number
}

export interface CountryDistribution {
  country: string
  experiment_count: number
  avg_accuracy: number
  avg_roc_auc: number
  std_accuracy: number | null
  std_roc_auc: number | null
}

export interface RecentExperiment {
  timestamp: string
  country: string
  name_class1: string
  name_class2: string
  model: string
  accuracy: number
  roc_auc: number
  embedding: string
  importance: number
  'embedding.1': string
  'importance.1': number
  'embedding.2': string
  'importance.2': number
}

export interface EmbeddingImportance {
  class_pair: string
  embedding: string
  avg_importance: number
  max_importance: number
  occurrences: number
}

export interface ClassPairPerformance {
  name_class1: string
  name_class2: string
  avg_accuracy: number
  std_accuracy: number | null
  avg_roc_auc: number
  avg_class1_precision: number
  avg_class1_recall: number
  avg_class1_f1: number
  avg_class2_precision: number
  avg_class2_recall: number
  avg_class2_f1: number
  experiment_count: number
}

export interface ClassCooccurrence {
  name_class1: string
  name_class2: string
  count: number
}

export interface EmbeddingCooccurrence {
  embedding1: string
  embedding2: string
  cooccurrence_count: number
}

export interface EmbeddingCooccurrenceByClass {
  embedding1: string
  embedding2: string
  class1: string
  class2: string
  count: number
}

export interface EmbeddingRanking {
  class_pair: string
  embedding: string
  avg_importance: number
  max_importance: number
  occurrences: number
  rank: number
}

export interface SyntheticClassStats {
  class_name: string
  avg_accuracy: number
  std_accuracy: number | null
  avg_f1: number
  std_f1: number | null
  avg_recall: number
  std_recall: number | null
  avg_precision: number
  std_precision: number | null
  experiment_count: number
}

export interface UnifiedMLMatrix {
  specific_class: string
  avg_accuracy: number
  std_accuracy: number
  min_accuracy: number
  max_accuracy: number
  avg_f1: number
  std_f1: number
  min_f1: number
  max_f1: number
  avg_recall: number
  std_recall: number
  min_recall: number
  max_recall: number
  avg_precision: number
  std_precision: number
  min_precision: number
  max_precision: number
  avg_roc_auc: number
  std_roc_auc: number
  experiment_count: number
}

export interface GeographicExperiment {
  timestamp: string
  country: string
  name_class1: string
  name_class2: string
  model: string
  accuracy: number
  min_lon: number
  min_lat: number
  max_lon: number
  max_lat: number
  mean_lon: number
  mean_lat: number
  area: number
  degrees_lon: number
  degrees_lat: number
}

export interface ROIStatistics {
  roi_id: string
  min_lon: number
  min_lat: number
  max_lon: number
  max_lat: number
  center_lon: number
  center_lat: number
  country: string
  area: number
  degrees_lon: number
  degrees_lat: number
  avg_accuracy: number
  std_accuracy: number | null
  min_accuracy: number
  max_accuracy: number
  avg_f1: number
  std_f1: number | null
  avg_recall: number
  std_recall: number | null
  avg_precision: number
  std_precision: number | null
  avg_roc_auc: number
  experiment_count: number
  classes_tested: string[]
}

export interface HeatmapGridPoint {
  grid_lon: number
  grid_lat: number
  avg_accuracy: number
  sample_count: number
  avg_f1: number
  avg_recall: number
  avg_precision: number
  avg_roc_auc: number
  countries: string[]
}

export interface HeatmapPoint {
  grid_lon: number
  grid_lat: number
  avg_accuracy?: number
  avg_f1?: number
  avg_recall?: number
  avg_precision?: number
  sample_count: number
}
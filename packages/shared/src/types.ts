export type Paper = {
  arxiv_id: string;
  title: string;
  authors: string[];
  abstract: string;
  primary_category: string;
  categories: string[];
  published_at: string;
  tldr: string | null;
  pulse_score: number;
  is_active: boolean;
  created_at: string;
  figure_url: string | null;
  figure_checked_at: string | null;
};

export type PaperLinkSource = 'github' | 'hn' | 'paperswithcode';

export type PaperLink = {
  id: number;
  arxiv_id: string;
  source: PaperLinkSource;
  url: string;
  external_id: string;
  metadata: Record<string, unknown> | null;
  discovered_at: string;
};

export type MetricSource = 'github' | 'hn';
export type MetricName = 'stars' | 'hn_score' | 'hn_comments';

export type PaperMetric = {
  id: number;
  arxiv_id: string;
  source: MetricSource;
  metric: MetricName;
  value: number;
  recorded_at: string;
};

export type SubscriptionType = 'keyword' | 'author' | 'category';

export type UserSubscription = {
  id: number;
  user_id: string;
  sub_type: SubscriptionType;
  value: string;
  created_at: string;
};

export type UserStarredPaper = {
  user_id: string;
  arxiv_id: string;
  starred_at: string;
};

export type AlertType = 'star_surge' | 'new_hn_discussion' | 'new_match';

export type UserAlert = {
  id: number;
  user_id: string;
  arxiv_id: string;
  alert_type: AlertType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

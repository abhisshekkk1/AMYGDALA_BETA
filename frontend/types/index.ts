export interface User {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
  theme_preference: "dark" | "light";
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface FolderOut {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export type Folder = FolderOut;

export interface Document {
  id: number;
  title: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  page_count: number;
  processing_status: "pending" | "processing" | "completed" | "error";
  error_message?: string;
  summary?: string;
  folder_id?: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentPage {
  page_number: number;
  heading?: string;
  text: string;
}

export interface Citation {
  chunk_id?: number;
  document_id: number;
  document_title: string;
  page_number: number;
  heading?: string;
  excerpt: string;
  relevance_score?: number;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface ChatSession {
  id: number;
  title: string;
  selected_document_ids: number[];
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface TestQuestion {
  id: number;
  order_index: number;
  question_type: string;
  marks: number;
  question_text: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  source_citation?: { doc?: string; page?: number };
  user_answer?: string;
  is_correct?: boolean;
  marks_awarded?: number;
  is_marked_for_review: boolean;
}

export interface PracticeTest {
  id: number;
  title: string;
  subject?: string;
  difficulty: string;
  duration_minutes: number;
  total_marks: number;
  score_achieved?: number;
  percentage?: number;
  status: "draft" | "in_progress" | "completed";
  completed_at?: string;
  created_at: string;
  questions: TestQuestion[];
}

export interface Flashcard {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  source_page?: number;
  source_citation?: string;
  ease_factor: number;
  repetition: number;
  interval_days: number;
  next_review_due: string;
  last_reviewed_at?: string;
  last_rating?: number;
}

export interface FlashcardDeck {
  id: number;
  title: string;
  description?: string;
  document_id?: number;
  color: string;
  created_at: string;
  updated_at: string;
  cards: Flashcard[];
}

export interface MindMapNode {
  id: string;
  label: string;
  level: number;
  parentId?: string;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
}

export interface MindMap {
  id: number;
  document_id?: number;
  title: string;
  central_topic: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  created_at: string;
  updated_at: string;
}

export interface StudyNote {
  id: number;
  document_id?: number;
  note_type: "summary" | "revision" | "definitions" | "formulas" | "custom";
  title: string;
  content_markdown: string;
  created_at: string;
}

export interface DashboardAnalytics {
  summary: {
    documents_count: number;
    total_tests_taken: number;
    average_score: number;
    questions_attempted: number;
    mcq_accuracy: number;
    total_flashcards: number;
    cards_due_for_review: number;
    cards_mastered: number;
    total_study_minutes: number;
  };
  weekly_activity: { day: string; minutes: number }[];
  test_trend: { date: string; title: string; score: number }[];
  weak_topics: { topic: string; error_type: string; suggested_action: string }[];
}

export interface SmartRecommendation {
  type: string;
  priority: "high" | "medium" | "normal";
  title: string;
  description: string;
  action_link: string;
}

export interface AISettings {
  provider: string;
  has_api_key: boolean;
  model_name: string;
  base_url?: string;
  temperature: string;
  is_active: boolean;
}

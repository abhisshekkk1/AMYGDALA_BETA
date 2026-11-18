import {
  UserProfileUpdate,
  NoteGenerateRequest,
  CreateTestFromMCQsRequest,
  AISettings,
  PracticeTest,
  StudyNote,
  Document,
  DocumentPage,
  ChatSession,
  ChatMessage,
  FlashcardDeck,
  Flashcard,
  MindMap,
  DashboardAnalytics,
  SmartRecommendation,
  FolderOut,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("amygdala_token");
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorMessage = typeof errorJson.detail === "string" ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // use fallback message
      }
      throw new Error(errorMessage);
    }

    return res.json();
  }

  // Auth API
  async login(email: string, password: string) {
    return this.request<{ access_token: string; token_type: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, full_name?: string) {
    return this.request<{ access_token: string; token_type: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
  }

  async getMe() {
    return this.request<any>("/auth/me");
  }

  async updateMe(data: UserProfileUpdate) {
    return this.request<any>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Document API
  async getDocuments(folderId?: number): Promise<Document[]> {
    const url = folderId !== undefined ? `/documents?folder_id=${folderId}` : "/documents";
    return this.request<Document[]>(url);
  }

  async getDocument(id: number): Promise<Document> {
    return this.request<Document>(`/documents/${id}`);
  }

  async getDocumentPages(id: number): Promise<{ document_id: number; title: string; page_count: number; pages: DocumentPage[] }> {
    return this.request<{ document_id: number; title: string; page_count: number; pages: DocumentPage[] }>(`/documents/${id}/pages`);
  }

  async uploadDocument(file: File, folderId?: number): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folder_id", folderId.toString());

    return this.request<Document>("/documents/upload", {
      method: "POST",
      body: formData,
    });
  }

  async renameDocument(id: number, title: string): Promise<Document> {
    return this.request<Document>(`/documents/${id}/rename`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  }

  async deleteDocument(id: number): Promise<{ message: string; id: number }> {
    return this.request<{ message: string; id: number }>(`/documents/${id}`, {
      method: "DELETE",
    });
  }

  async getFolders(): Promise<FolderOut[]> {
    return this.request<FolderOut[]>("/documents/folders/list");
  }

  async createFolder(name: string, color?: string): Promise<FolderOut> {
    return this.request<FolderOut>("/documents/folders/create", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
  }

  // Assistant / Chat API
  async sendChatMessage(content: string, documentIds?: number[], sessionId?: number, tone?: string): Promise<ChatMessage> {
    return this.request<ChatMessage>("/assistant/chat", {
      method: "POST",
      body: JSON.stringify({
        content,
        document_ids: documentIds,
        session_id: sessionId,
        tone: tone || "academic",
      }),
    });
  }

  async getChatSessions(): Promise<ChatSession[]> {
    return this.request<ChatSession[]>("/assistant/sessions");
  }

  async deleteChatSession(sessionId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/assistant/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  // Exam Preparation API
  async generateMCQs(documentIds: number[], numQuestions: number = 5, difficulty: string = "medium", topic?: string): Promise<{ questions: any[] }> {
    return this.request<{ questions: any[] }>("/exam/generate-mcqs", {
      method: "POST",
      body: JSON.stringify({
        document_ids: documentIds,
        num_questions: numQuestions,
        difficulty,
        topic,
      }),
    });
  }

  async generateMarksQuestion(documentIds: number[], marks: number = 5, topic?: string): Promise<any> {
    return this.request<any>("/exam/generate-marks-question", {
      method: "POST",
      body: JSON.stringify({
        document_ids: documentIds,
        marks,
        topic,
      }),
    });
  }

  async generateQuestionPaper(documentIds: number[], title: string, subject: string, totalMarks: number = 50, durationMinutes: number = 60): Promise<any> {
    return this.request<any>("/exam/generate-paper", {
      method: "POST",
      body: JSON.stringify({
        document_ids: documentIds,
        title,
        subject,
        total_marks: totalMarks,
        duration_minutes: durationMinutes,
      }),
    });
  }

  async createPracticeTest(title: string, questions: any[], documentId?: number, durationMinutes: number = 20, difficulty: string = "medium"): Promise<PracticeTest> {
    return this.request<PracticeTest>("/exam/tests/create-from-mcqs", {
      method: "POST",
      body: JSON.stringify({
        title,
        questions,
        document_id: documentId,
        duration_minutes: durationMinutes,
        difficulty,
      } as CreateTestFromMCQsRequest),
    });
  }

  async getPracticeTests(): Promise<PracticeTest[]> {
    return this.request<PracticeTest[]>("/exam/tests");
  }

  async getPracticeTest(testId: number): Promise<PracticeTest> {
    return this.request<PracticeTest>(`/exam/tests/${testId}`);
  }

  async submitPracticeTest(testId: number, answers: Record<string | number, string>): Promise<PracticeTest> {
    // stringify keys for Pydantic v2 Dict[str, str] compatibility
    const formattedAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers)) {
      formattedAnswers[String(k)] = v;
    }
    return this.request<PracticeTest>(`/exam/tests/${testId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers: formattedAnswers }),
    });
  }

  // Flashcards API
  async getFlashcardDecks(): Promise<FlashcardDeck[]> {
    return this.request<FlashcardDeck[]>("/flashcards/decks");
  }

  async createFlashcardDeck(title: string, description?: string, documentId?: number, color?: string): Promise<FlashcardDeck> {
    return this.request<FlashcardDeck>("/flashcards/decks", {
      method: "POST",
      body: JSON.stringify({ title, description, document_id: documentId, color }),
    });
  }

  async getFlashcardDeck(deckId: number): Promise<FlashcardDeck> {
    return this.request<FlashcardDeck>(`/flashcards/decks/${deckId}`);
  }

  async deleteFlashcardDeck(deckId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/flashcards/decks/${deckId}`, {
      method: "DELETE",
    });
  }

  async addFlashcard(deckId: number, front: string, back: string, page?: number, citation?: string): Promise<Flashcard> {
    return this.request<Flashcard>(`/flashcards/decks/${deckId}/cards`, {
      method: "POST",
      body: JSON.stringify({ front, back, source_page: page, source_citation: citation }),
    });
  }

  async generateFlashcardsFromDoc(deckId: number, documentId: number, count: number = 6): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/flashcards/decks/${deckId}/generate-from-doc?document_id=${documentId}&count=${count}`, {
      method: "POST",
    });
  }

  async reviewFlashcard(cardId: number, rating: number): Promise<Flashcard> {
    return this.request<Flashcard>(`/flashcards/cards/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    });
  }

  async getDueFlashcards(): Promise<Flashcard[]> {
    return this.request<Flashcard[]>("/flashcards/due");
  }

  // Mind Maps API
  async generateMindMap(documentId: number, centralTopic?: string): Promise<MindMap> {
    return this.request<MindMap>("/mindmaps/generate", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId, central_topic: centralTopic }),
    });
  }

  async getMindMaps(): Promise<MindMap[]> {
    return this.request<MindMap[]>("/mindmaps");
  }

  async getMindMap(mindmapId: number): Promise<MindMap> {
    return this.request<MindMap>(`/mindmaps/${mindmapId}`);
  }

  // Notes API (Using typed NoteGenerateRequest and returning StudyNote)
  async generateNote(documentId: number, noteType: string = "summary", title?: string): Promise<StudyNote> {
    const payload: NoteGenerateRequest = {
      document_id: documentId,
      note_type: noteType as any,
      title,
    };
    return this.request<StudyNote>("/notes/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getNotes(noteType?: string): Promise<StudyNote[]> {
    const url = noteType ? `/notes?note_type=${noteType}` : "/notes";
    return this.request<StudyNote[]>(url);
  }

  async deleteNote(noteId: number): Promise<{ message: string; id: number }> {
    return this.request<{ message: string; id: number }>(`/notes/${noteId}`, {
      method: "DELETE",
    });
  }

  // Analytics API
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    return this.request<DashboardAnalytics>("/analytics/dashboard");
  }

  async getRecommendations(): Promise<SmartRecommendation[]> {
    return this.request<SmartRecommendation[]>("/analytics/recommendations");
  }

  // Settings API
  async getAISettings(): Promise<AISettings> {
    return this.request<AISettings>("/settings/ai");
  }

  async updateAISettings(data: { provider: string; api_key?: string; model_name?: string; base_url?: string; temperature?: number }): Promise<AISettings> {
    return this.request<AISettings>("/settings/ai", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();

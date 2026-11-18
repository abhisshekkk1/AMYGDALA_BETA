const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("mentora_token");
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

  async updateMe(data: { full_name?: string; theme_preference?: string }) {
    return this.request<any>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Document API
  async getDocuments(folderId?: number) {
    const url = folderId !== undefined ? `/documents?folder_id=${folderId}` : "/documents";
    return this.request<any[]>(url);
  }

  async getDocument(id: number) {
    return this.request<any>(`/documents/${id}`);
  }

  async getDocumentPages(id: number) {
    return this.request<any>(`/documents/${id}/pages`);
  }

  async uploadDocument(file: File, folderId?: number) {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folder_id", folderId.toString());

    return this.request<any>("/documents/upload", {
      method: "POST",
      body: formData,
    });
  }

  async renameDocument(id: number, title: string) {
    return this.request<any>(`/documents/${id}/rename`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  }

  async deleteDocument(id: number) {
    return this.request<any>(`/documents/${id}`, {
      method: "DELETE",
    });
  }

  async getFolders() {
    return this.request<any[]>("/documents/folders/list");
  }

  async createFolder(name: string, color?: string) {
    return this.request<any>("/documents/folders/create", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
  }

  // Assistant / Chat API
  async sendChatMessage(content: string, documentIds?: number[], sessionId?: number, tone?: string) {
    return this.request<any>("/assistant/chat", {
      method: "POST",
      body: JSON.stringify({
        content,
        document_ids: documentIds,
        session_id: sessionId,
        tone: tone || "academic",
      }),
    });
  }

  async getChatSessions() {
    return this.request<any[]>("/assistant/sessions");
  }

  async deleteChatSession(sessionId: number) {
    return this.request<any>(`/assistant/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  // Exam Preparation API
  async generateMCQs(documentIds: number[], numQuestions: number = 5, difficulty: string = "medium", topic?: string) {
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

  async generateMarksQuestion(documentIds: number[], marks: number = 5, topic?: string) {
    return this.request<any>("/exam/generate-marks-question", {
      method: "POST",
      body: JSON.stringify({
        document_ids: documentIds,
        marks,
        topic,
      }),
    });
  }

  async generateQuestionPaper(documentIds: number[], title: string, subject: string, totalMarks: number = 50, durationMinutes: number = 60) {
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

  async createPracticeTest(title: string, questions: any[], documentId?: number, durationMinutes: number = 20) {
    return this.request<any>("/exam/tests/create-from-mcqs", {
      method: "POST",
      body: JSON.stringify({
        title,
        questions,
        document_id: documentId,
        duration_minutes: durationMinutes,
      }),
    });
  }

  async getPracticeTests() {
    return this.request<any[]>("/exam/tests");
  }

  async getPracticeTest(testId: number) {
    return this.request<any>(`/exam/tests/${testId}`);
  }

  async submitPracticeTest(testId: number, answers: Record<number, string>) {
    return this.request<any>(`/exam/tests/${testId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  }

  // Flashcards API
  async getFlashcardDecks() {
    return this.request<any[]>("/flashcards/decks");
  }

  async createFlashcardDeck(title: string, description?: string, documentId?: number, color?: string) {
    return this.request<any>("/flashcards/decks", {
      method: "POST",
      body: JSON.stringify({ title, description, document_id: documentId, color }),
    });
  }

  async getFlashcardDeck(deckId: number) {
    return this.request<any>(`/flashcards/decks/${deckId}`);
  }

  async deleteFlashcardDeck(deckId: number) {
    return this.request<any>(`/flashcards/decks/${deckId}`, {
      method: "DELETE",
    });
  }

  async addFlashcard(deckId: number, front: string, back: string, page?: number, citation?: string) {
    return this.request<any>(`/flashcards/decks/${deckId}/cards`, {
      method: "POST",
      body: JSON.stringify({ front, back, source_page: page, source_citation: citation }),
    });
  }

  async generateFlashcardsFromDoc(deckId: number, documentId: number, count: number = 6) {
    return this.request<any>(`/flashcards/decks/${deckId}/generate-from-doc?document_id=${documentId}&count=${count}`, {
      method: "POST",
    });
  }

  async reviewFlashcard(cardId: number, rating: number) {
    return this.request<any>(`/flashcards/cards/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    });
  }

  async getDueFlashcards() {
    return this.request<any[]>("/flashcards/due");
  }

  // Mind Maps API
  async generateMindMap(documentId: number, centralTopic?: string) {
    return this.request<any>("/mindmaps/generate", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId, central_topic: centralTopic }),
    });
  }

  async getMindMaps() {
    return this.request<any[]>("/mindmaps");
  }

  async getMindMap(mindmapId: number) {
    return this.request<any>(`/mindmaps/${mindmapId}`);
  }

  // Notes API
  async generateNote(documentId: number, noteType: string, title?: string) {
    return this.request<any>("/notes/generate", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId, note_type: noteType, title }),
    });
  }

  async getNotes(noteType?: string) {
    const url = noteType ? `/notes?note_type=${noteType}` : "/notes";
    return this.request<any[]>(url);
  }

  async deleteNote(noteId: number) {
    return this.request<any>(`/notes/${noteId}`, {
      method: "DELETE",
    });
  }

  // Analytics API
  async getDashboardAnalytics() {
    return this.request<any>("/analytics/dashboard");
  }

  async getRecommendations() {
    return this.request<any[]>("/analytics/recommendations");
  }

  // Settings API
  async getAISettings() {
    return this.request<any>("/settings/ai");
  }

  async updateAISettings(data: { provider: string; api_key?: string; model_name?: string; base_url?: string; temperature?: string }) {
    return this.request<any>("/settings/ai", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();

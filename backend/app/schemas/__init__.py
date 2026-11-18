from app.schemas.auth import UserRegister, UserLogin, UserProfileUpdate, UserOut, Token
from app.schemas.document import FolderCreate, FolderOut, DocumentChunkOut, DocumentOut, DocumentRename
from app.schemas.chat import ChatMessageCreate, CitationItem, ChatMessageOut, ChatSessionOut
from app.schemas.exam import (
    MCQGenerateRequest, MarksQuestionRequest, PaperGenerateRequest,
    CreateTestFromMCQsRequest, SubmitTestRequest, TestQuestionOut, PracticeTestOut
)
from app.schemas.flashcard import FlashcardDeckCreate, FlashcardCreate, FlashcardReviewRequest, FlashcardOut, FlashcardDeckOut
from app.schemas.mindmap import MindMapGenerateRequest, MindMapOut
from app.schemas.note import NoteGenerateRequest, StudyNoteOut
from app.schemas.settings import AISettingsUpdate, AISettingsOut

__all__ = [
    "UserRegister", "UserLogin", "UserProfileUpdate", "UserOut", "Token",
    "FolderCreate", "FolderOut", "DocumentChunkOut", "DocumentOut", "DocumentRename",
    "ChatMessageCreate", "CitationItem", "ChatMessageOut", "ChatSessionOut",
    "MCQGenerateRequest", "MarksQuestionRequest", "PaperGenerateRequest",
    "CreateTestFromMCQsRequest", "SubmitTestRequest", "TestQuestionOut", "PracticeTestOut",
    "FlashcardDeckCreate", "FlashcardCreate", "FlashcardReviewRequest", "FlashcardOut", "FlashcardDeckOut",
    "MindMapGenerateRequest", "MindMapOut",
    "NoteGenerateRequest", "StudyNoteOut",
    "AISettingsUpdate", "AISettingsOut",
]

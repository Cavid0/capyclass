export interface AIAnalysisResult {
  summary: string;
  errors: AIError[];
  suggestions: AISuggestion[];
  status: "PASS" | "FAIL" | "PENDING";
}

export interface AIError {
  line?: number;
  message: string;
  severity: "error" | "warning";
}

export interface AISuggestion {
  message: string;
  type: "improvement" | "style" | "logic";
}

export interface ClassroomWithStats {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  teacherId: string;
  createdAt: Date;
  _count: {
    enrollments: number;
    workspaces: number;
  };
  passCount?: number;
  failCount?: number;
  pendingCount?: number;
}

export interface WorkspaceWithFeedback {
  id: string;
  code: string;
  language: string;
  status: "PENDING" | "PASS" | "FAIL";
  studentId: string;
  classroomId: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  feedbacks: {
    id: string;
    summary: string;
    errors: string;
    suggestions: string;
    status: "PENDING" | "PASS" | "FAIL";
    createdAt: Date;
  }[];
}

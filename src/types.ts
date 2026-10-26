export type Tab = "dashboard" | "thread-index" | "production" | "notes" | "archive";
export type ProductionStage = "danger" | "day3" | "day2" | "day1" | "returns";
export type NoteColor = "green" | "pink" | "blue" | "yellow";
export type SortKey = "name" | "pantone" | "thread";
export type SortDirection = "asc" | "desc";

export type ThreadColor = {
  id: string;
  name: string;
  pantone: string;
  thread: string;
  hex: string;
  comments: string;
};

export type ProductionJob = {
  id: string;
  jobNo: string;
  customer: string;
  job: string;
  dateStart: string;
  dateDue: string;
  stage: ProductionStage;
  tags: string[];
  comments: string;
  statusSince: number;
  archived: boolean;
  completedAt?: number;
};

export type Note = {
  id: string;
  title: string;
  text: string;
  color: NoteColor;
  createdAt: number;
  viewedAt: number;
};
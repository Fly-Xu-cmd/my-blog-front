export type Tag = {
  id: number;
  name: string;
};
export type TagPost = {
  postId: number;
  tag: Tag;
  tagId: number;
};
export type Category = {
  id: number;
  name: string;
};
export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  cover?: string;
  published: boolean;
  content: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  tags?: string[] | TagPost[]; // API often returns string[] after mapping, but DB returns TagPost[]
};
export type Dynamic = {
  id: number;
  content: string;
  excerpt?: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
};

export type NoteTag = {
  noteId: number;
  tag: Tag;
  tagId: number;
};

export type Note = {
  id: number;
  syncId: string;
  slug: string;
  title: string;
  content: string;
  hash?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  tags?: string[] | NoteTag[]; // API returns string[] for convenience, but db returns NoteTag[]
};

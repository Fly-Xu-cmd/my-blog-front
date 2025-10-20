export type Tag = {
  id: number;
  name: string;
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
  tags?: Tag[];
};

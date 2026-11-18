'use client';
import { useEffect, useState } from 'react';
import { Button, ConfigProvider, Input, Pagination, Popover, Segmented, Select } from 'antd';
import { Search, SlidersHorizontal } from 'lucide-react';
import {
  ArticleRow,
  NoteRow,
  DynamicEntry,
  FeaturedArticle,
  entryMonth,
  type Listing,
} from './ContentEntries';
export type { Summary, Listing } from './ContentEntries';
export default function PublicList({
  resource,
  initial,
  categories = [],
  tags = [],
  fixedTag,
  featured = false,
  heading,
  description,
}: {
  resource: 'post' | 'note' | 'dynamic';
  initial: Listing;
  categories?: string[];
  tags?: string[];
  fixedTag?: string;
  featured?: boolean;
  heading?: string;
  description?: string;
}) {
  const [state, setState] = useState(initial);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState(fixedTag ?? '');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(initial.current);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!query && !category && !kind && tag === (fixedTag ?? '') && page === initial.current) {
      setState(initial);
      setError('');
      setLoading(false);
      return;
    }
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        current: String(page),
        pageSize: String(initial.pageSize),
        q: query,
      });
      if (category) params.set('category', category);
      if (tag) params.set('tags', tag);
      if (kind) params.set('kind', kind);
      void fetch(
        '/api/' + { post: 'posts', note: 'notes', dynamic: 'dynamics' }[resource] + '?' + params,
        { signal: abort.signal },
      )
        .then(async (r) => {
          if (!r.ok) throw new Error('加载失败，请重试');
          return r.json();
        })
        .then((r) => {
          if (!abort.signal.aborted) setState(r);
        })
        .catch((e) => {
          if (!abort.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, category, tag, kind, page, resource, initial, fixedTag, retry]);
  const hasFilters = Boolean(query || category || kind || tag !== (fixedTag ?? ''));
  const lead = resource === 'post' && featured && !hasFilters && page === 1 ? state.data[0] : null;
  const rows = lead ? state.data.slice(1) : state.data;
  return (
    <ConfigProvider
      theme={{
        components: {
          Input: {
            colorBgContainer: 'transparent',
            hoverBg: 'transparent',
            activeBg: 'transparent',
            activeShadow: 'none',
          },
          Select: { selectorBg: 'transparent' },
          Segmented: { trackBg: 'transparent' },
          Pagination: { itemBg: 'transparent', itemActiveBg: 'transparent' },
        },
      }}
    >
      <div className="editorial-list" aria-busy={loading}>
        <div className="editorial-list-head">
          {heading && (
            <div className="editorial-page-heading">
              <h1>{heading}</h1>
              {description && <p>{description}</p>}
            </div>
          )}
          <div className="editorial-tools">
            <Input
              className="editorial-search"
              prefix={<Search size={17} aria-hidden="true" />}
              allowClear
              size="large"
              aria-label="搜索标题或正文"
              placeholder="搜索标题或正文"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              maxLength={200}
            />
            {(categories.length > 0 || (!fixedTag && tags.length > 0)) && (
              <Popover
                trigger="click"
                placement="bottomRight"
                destroyOnHidden
                content={
                  <div className="editorial-filter-panel">
                    {categories.length > 0 && (
                      <Select
                        aria-label="分类"
                        placeholder="全部分类"
                        value={category || undefined}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={categories.map((name) => ({ value: name, label: name }))}
                        onChange={(value) => {
                          setCategory(value ?? '');
                          setPage(1);
                        }}
                        className="editorial-select"
                      />
                    )}
                    {!fixedTag && tags.length > 0 && (
                      <Select
                        aria-label="标签"
                        placeholder="全部标签"
                        value={tag || undefined}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={tags.map((name) => ({ value: name, label: name }))}
                        onChange={(value) => {
                          setTag(value ?? '');
                          setPage(1);
                        }}
                        className="editorial-select"
                      />
                    )}
                  </div>
                }
              >
                <Button type="text" icon={<SlidersHorizontal size={16} aria-hidden="true" />}>
                  筛选
                </Button>
              </Popover>
            )}
          </div>
        </div>
        {resource === 'note' && (
          <div className="editorial-note-types">
            <Segmented
              aria-label="笔记类型"
              value={kind}
              options={[
                { value: '', label: '全部笔记' },
                { value: 'TECH', label: '技术笔记' },
                { value: 'ESSAY', label: '生活随笔' },
              ]}
              onChange={(value) => {
                setKind(value);
                setPage(1);
              }}
            />
          </div>
        )}
        <div className="editorial-list-status">
          <span role="status">{loading ? '加载中…' : state.total + ' 条内容'}</span>
          {hasFilters && (
            <Button
              type="link"
              onClick={() => {
                setQuery('');
                setCategory('');
                setTag(fixedTag ?? '');
                setKind('');
                setPage(1);
              }}
            >
              清除筛选
            </Button>
          )}
        </div>
        {error && (
          <div className="editorial-error" role="alert">
            <p>{error}</p>
            <Button type="link" onClick={() => setRetry((n) => n + 1)}>
              重新加载
            </Button>
          </div>
        )}
        {lead && (
          <>
            <FeaturedArticle item={lead} />
            {rows.length > 0 && (
              <div className="editorial-section-head">
                <h2>更多文章</h2>
                <span>按发布时间排列</span>
              </div>
            )}
          </>
        )}
        {resource === 'dynamic' ? (
          <div className="editorial-timeline">
            {rows.map((item, index) => (
              <div key={item.id}>
                {(index === 0 || entryMonth(rows[index - 1]) !== entryMonth(item)) && (
                  <h2 className="editorial-month">{entryMonth(item)}</h2>
                )}
                <DynamicEntry item={item} />
              </div>
            ))}
          </div>
        ) : (
          rows.map((item) =>
            resource === 'note' ? (
              <NoteRow key={item.id} item={item} />
            ) : (
              <ArticleRow key={item.id} item={item} />
            ),
          )
        )}
        {!state.data.length && !loading && <p className="editorial-empty">没有匹配的内容</p>}
        {state.pages > 1 && (
          <nav aria-label="分页" className="editorial-pagination">
            <Pagination
              current={page}
              pageSize={initial.pageSize}
              total={state.total}
              disabled={loading}
              onChange={setPage}
              simple={{ readOnly: true }}
              showSizeChanger={false}
              itemRender={(_, type, original) =>
                type === 'prev' || type === 'next' ? (
                  <span>
                    <Button
                      type="text"
                      tabIndex={type === 'next' && page === 1 ? 0 : -1}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.stopPropagation();
                      }}
                      disabled={loading || (type === 'prev' ? page <= 1 : page >= state.pages)}
                    >
                      {type === 'prev' ? '上一页' : '下一页'}
                    </Button>
                  </span>
                ) : (
                  original
                )
              }
            />
          </nav>
        )}
      </div>
    </ConfigProvider>
  );
}

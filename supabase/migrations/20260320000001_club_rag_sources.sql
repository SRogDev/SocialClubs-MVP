-- Club RAG sources and chunks
CREATE TABLE IF NOT EXISTS club_rag_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0),
  storage_path text NOT NULL,
  provider text NOT NULL DEFAULT 'pinecone',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_rag_sources_club_id ON club_rag_sources(club_id);
CREATE INDEX IF NOT EXISTS idx_club_rag_sources_status ON club_rag_sources(status);

CREATE TABLE IF NOT EXISTS club_rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES club_rag_sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding_provider text NOT NULL DEFAULT 'pinecone',
  embedding_ref text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_club_rag_chunks_club_id ON club_rag_chunks(club_id);
CREATE INDEX IF NOT EXISTS idx_club_rag_chunks_source_id ON club_rag_chunks(source_id);

ALTER TABLE club_rag_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_rag_chunks ENABLE ROW LEVEL SECURITY;

-- Members can read RAG sources/chunks from clubs they belong to
CREATE POLICY club_rag_sources_members_select ON club_rag_sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_clubs uc
      WHERE uc.club_id = club_rag_sources.club_id
      AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY club_rag_chunks_members_select ON club_rag_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_clubs uc
      WHERE uc.club_id = club_rag_chunks.club_id
      AND uc.user_id = auth.uid()
    )
  );

-- Club creators can insert/update/delete sources
CREATE POLICY club_rag_sources_creator_write ON club_rag_sources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clubs c
      WHERE c.id = club_rag_sources.club_id
      AND c.creator = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clubs c
      WHERE c.id = club_rag_sources.club_id
      AND c.creator = auth.uid()
    )
  );

CREATE POLICY club_rag_chunks_creator_write ON club_rag_chunks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clubs c
      WHERE c.id = club_rag_chunks.club_id
      AND c.creator = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clubs c
      WHERE c.id = club_rag_chunks.club_id
      AND c.creator = auth.uid()
    )
  );

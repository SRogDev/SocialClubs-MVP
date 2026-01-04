-- Add agent_skills table for club agents
CREATE TABLE IF NOT EXISTS agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES club_agents(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  action text NOT NULL,
  access_subscription_id uuid REFERENCES channels(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS for agent_skills
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

-- Policy: Club creators can manage their agent's skills
CREATE POLICY agent_skills_creator_policy ON agent_skills
  FOR ALL
  USING (
    agent_id IN (
      SELECT ca.id FROM club_agents ca
      JOIN clubs c ON ca.club_id = c.id
      WHERE c.creator = auth.uid()
    )
  );

-- Policy: Club members can view agent skills
CREATE POLICY agent_skills_members_policy ON agent_skills
  FOR SELECT
  USING (
    agent_id IN (
      SELECT ca.id FROM club_agents ca
      JOIN clubs c ON ca.club_id = c.id
      JOIN memberships m ON m.club_id = c.id
      WHERE m.user_id = auth.uid()
    )
  );

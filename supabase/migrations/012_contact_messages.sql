-- Contact Messages Table
-- Stores customer enquiries submitted through the contact form

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sender Information
  full_name text NOT NULL,
  email text NOT NULL,

  -- Message Details
  enquiry_type text NOT NULL CHECK (enquiry_type IN (
    'custom_3d_printing',
    'product_enquiry',
    'cad_design',
    'existing_order',
    'quotation_request',
    'other'
  )),
  subject text,
  message text NOT NULL,

  -- Status Tracking
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'archived')),
  admin_notes text,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,

  -- Optional User Association (if authenticated user submits)
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for efficient queries
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_email ON contact_messages(email);
CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id) WHERE user_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_messages_updated_at
  BEFORE UPDATE ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_messages_updated_at();

-- RLS Policies
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Public can insert their own messages
CREATE POLICY "Anyone can submit contact messages"
  ON contact_messages
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can view their own messages (if authenticated)
CREATE POLICY "Users can view their own contact messages"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admin can view all messages
CREATE POLICY "Admins can view all contact messages"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admin can update messages (status, notes, etc.)
CREATE POLICY "Admins can update contact messages"
  ON contact_messages
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin can delete messages (for spam/cleanup)
CREATE POLICY "Admins can delete contact messages"
  ON contact_messages
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Grant permissions
GRANT SELECT, INSERT ON contact_messages TO anon;
GRANT ALL ON contact_messages TO authenticated;

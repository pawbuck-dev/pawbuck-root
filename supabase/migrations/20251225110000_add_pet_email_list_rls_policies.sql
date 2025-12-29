-- RLS Policies for pet_email_list table
-- Users can only access their own email list entries

-- Policy for SELECT: Users can read their own email list entries
CREATE POLICY "Users can view their own email list"
ON public.pet_email_list
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy for INSERT: Users can insert their own email list entries
CREATE POLICY "Users can insert their own email list"
ON public.pet_email_list
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can update their own email list entries
CREATE POLICY "Users can update their own email list"
ON public.pet_email_list
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can delete their own email list entries
CREATE POLICY "Users can delete their own email list"
ON public.pet_email_list
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


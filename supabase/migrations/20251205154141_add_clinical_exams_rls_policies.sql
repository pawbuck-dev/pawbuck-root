-- RLS Policies for clinical_exams table
-- Users can only access their own clinical exam records

-- Policy for SELECT: Users can read their own clinical exams
CREATE POLICY "Users can view their own clinical exams"
ON public.clinical_exams
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy for INSERT: Users can insert their own clinical exams
CREATE POLICY "Users can insert their own clinical exams"
ON public.clinical_exams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can update their own clinical exams
CREATE POLICY "Users can update their own clinical exams"
ON public.clinical_exams
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can delete their own clinical exams
CREATE POLICY "Users can delete their own clinical exams"
ON public.clinical_exams
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

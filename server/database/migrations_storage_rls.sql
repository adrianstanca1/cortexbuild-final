-- Enable RLS on objects table if not already enabled (Often restricted, assuming enabled)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Allow users to upload files to their company's folder
-- Path structure: project-files/{companyId}/{projectId}/*
CREATE POLICY "Users can upload to their company folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT companyid 
    FROM public.memberships 
    WHERE userid = auth.uid()::text 
    AND status = 'ACTIVE'
  )
);

-- 2. Policy: Allow users to view files from their company's folder
CREATE POLICY "Users can view their company files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT companyid 
    FROM public.memberships 
    WHERE userid = auth.uid()::text 
    AND status = 'ACTIVE'
  )
);

-- 3. Policy: Allow users to update/delete files from their company's folder
CREATE POLICY "Users can update/delete their company files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT companyid 
    FROM public.memberships 
    WHERE userid = auth.uid()::text 
    AND status = 'ACTIVE'
  )
);

-- 4. Policy: Allow users to update their company files
CREATE POLICY "Users can update their company files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT companyid 
    FROM public.memberships 
    WHERE userid = auth.uid()::text 
    AND status = 'ACTIVE'
  )
);

-- Avatars Bucket Policy (Public Read, Authenticated Upload)
CREATE POLICY "Avatar Public Read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Avatar Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatar Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');
